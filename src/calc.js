/**
 * Motor de cálculo do Simulador da Reforma Tributária do Consumo (IBS/CBS).
 *
 * Módulo puro (sem DOM, sem dependências): recebe um objeto de entradas e
 * devolve números. Todas as alíquotas de entrada são informadas em
 * percentual (ex.: 12 = 12%) e convertidas internamente para fração.
 *
 * Base legal principal:
 *  - EC 132/2023 — ADCT arts. 125 a 130 (cronograma de transição);
 *  - LC 214/2025 — IBS, CBS e IS (reduções de alíquota, Simples, base de cálculo).
 * Detalhes e links em docs/fontes.md.
 */

/** Anos simulados. */
export const ANOS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

/** Alíquotas de teste fixadas no ADCT (em %). */
export const ALIQUOTAS_TESTE = Object.freeze({
  cbs2026: 0.9, // ADCT art. 125, caput
  ibs2026: 0.1, // ADCT art. 125, caput (alíquota estadual)
  ibs2027_2028: 0.1, // ADCT art. 127: 0,05% estadual + 0,05% municipal
  reducaoCbs2027_2028: 0.1, // ADCT art. 127, parágrafo único (pontos percentuais)
});

/**
 * Fração das alíquotas de ICMS/ISS mantida em cada ano (ADCT art. 128 e 129).
 * A fração do IBS "de referência" cobrada em 2029–2032 é o complemento
 * (1 − fração) — PREMISSA do simulador: a lei manda fixar as alíquotas de
 * referência para repor a perda de ICMS/ISS; a proporcionalidade exata só será
 * conhecida com as resoluções do Senado.
 */
export const FATOR_LEGADO = Object.freeze({
  2026: 1, 2027: 1, 2028: 1,
  2029: 0.9, 2030: 0.8, 2031: 0.7, 2032: 0.6,
  2033: 0,
});

/** Reduções de alíquota (LC 214/2025). `fator` multiplica a alíquota padrão. */
export const REDUCOES = Object.freeze({
  nenhuma: { fator: 1, rotulo: 'Alíquota padrão (sem redução)' },
  r30: { fator: 0.7, rotulo: 'Redução de 30% — profissões intelectuais regulamentadas (art. 127)' },
  r60: { fator: 0.4, rotulo: 'Redução de 60% — saúde, educação, alimentos etc. (art. 128 e seguintes)' },
  zero: { fator: 0, rotulo: 'Alíquota zero — ex.: Cesta Básica Nacional (art. 125)' },
});

export const REGIMES = Object.freeze({
  real: 'Lucro Real — PIS/Cofins não cumulativo (9,25%)',
  presumido: 'Lucro Presumido — PIS/Cofins cumulativo (3,65%)',
  simples: 'Simples Nacional (modelo simplificado)',
});

/** PIS/Cofins vigentes (Leis 10.637/2002, 10.833/2003 e 9.718/1998). */
export const PIS_COFINS = Object.freeze({ naoCumulativo: 9.25, cumulativo: 3.65 });

/** Estimativas públicas de alíquota de referência (em %). */
export const PRESETS_ALIQUOTAS = Object.freeze({
  cgibs2026: {
    rotulo: 'Resolução CGIBS nº 14/2026 (jul/2026) — 27,91%',
    cbs: 9.21, ibs: 18.7,
  },
  sert2024: {
    rotulo: 'Estimativa inicial SERT/MF (2024) — 26,5%',
    cbs: 8.8, ibs: 17.7,
  },
});

export const ENTRADAS_PADRAO = Object.freeze({
  regime: 'real',
  receitaBens: 4_000_000,
  receitaServicos: 1_000_000,
  compras: 2_200_000,
  folha: 900_000,
  icmsEfetivo: 12,
  issAliquota: 5,
  ipiEfetivo: 0,
  creditoPisCofinsAtualPct: 70,
  excluirIcmsBasePisCofins: true,
  reducao: 'nenhuma',
  cbsRef: PRESETS_ALIQUOTAS.cgibs2026.cbs,
  ibsRef: PRESETS_ALIQUOTAS.cgibs2026.ibs,
  creditoComprasPct: 100,
  manterCreditosAliquotaZero: true,
  ibsCbsNaBaseIcms: false,
  ipiZonaFranca: false,
  aliquotaDAS: 11,
  dasPisCofinsPct: 15.5,
  dasIcmsIssPct: 34,
  simplesOpcao: 'dentro',
});

const pct = (v) => Number(v) / 100;

/** Normaliza e valida as entradas; lança erro com mensagem em português. */
export function normalizarEntradas(bruto = {}) {
  const e = { ...ENTRADAS_PADRAO, ...bruto };
  const numericos = [
    'receitaBens', 'receitaServicos', 'compras', 'folha', 'icmsEfetivo', 'issAliquota',
    'ipiEfetivo', 'creditoPisCofinsAtualPct', 'cbsRef', 'ibsRef', 'creditoComprasPct',
    'aliquotaDAS', 'dasPisCofinsPct', 'dasIcmsIssPct',
  ];
  for (const k of numericos) {
    const v = Number(e[k]);
    if (!Number.isFinite(v)) throw new Error(`Valor inválido em "${k}".`);
    if (v < 0) throw new Error(`"${k}" não pode ser negativo.`);
    e[k] = v;
  }
  for (const k of ['icmsEfetivo', 'issAliquota', 'ipiEfetivo', 'creditoPisCofinsAtualPct',
    'creditoComprasPct', 'aliquotaDAS', 'dasPisCofinsPct', 'dasIcmsIssPct']) {
    if (e[k] > 100) throw new Error(`"${k}" deve estar entre 0 e 100%.`);
  }
  if (e.icmsEfetivo >= 100 || e.issAliquota >= 100) throw new Error('Alíquotas de ICMS/ISS devem ser menores que 100%.');
  if (e.cbsRef + e.ibsRef > 60) throw new Error('Alíquotas de referência somadas acima de 60% — verifique.');
  if (e.dasPisCofinsPct + e.dasIcmsIssPct > 100) throw new Error('As parcelas do DAS somam mais de 100%.');
  if (!REGIMES[e.regime]) throw new Error(`Regime desconhecido: ${e.regime}`);
  if (!REDUCOES[e.reducao]) throw new Error(`Redução desconhecida: ${e.reducao}`);
  if (!['dentro', 'fora'].includes(e.simplesOpcao)) throw new Error('Opção do Simples inválida.');
  if (e.receitaBens + e.receitaServicos <= 0) throw new Error('Informe alguma receita.');
  return e;
}

/**
 * Parâmetros do cronograma de transição para um ano.
 * Retorna alíquotas em % (antes de reduções setoriais).
 */
export function cronograma(ano, { cbsRef, ibsRef }) {
  if (!ANOS.includes(ano)) throw new Error(`Ano fora da transição: ${ano}`);
  const legado = FATOR_LEGADO[ano];
  if (ano === 2026) {
    return {
      ano, fase: 'Teste (CBS 0,9% / IBS 0,1%, compensáveis)', teste: true,
      cbs: ALIQUOTAS_TESTE.cbs2026, ibs: ALIQUOTAS_TESTE.ibs2026,
      pisCofins: true, ipi: true, legado,
    };
  }
  if (ano <= 2028) {
    return {
      ano, fase: 'CBS plena; PIS/Cofins extintos; IBS 0,1%', teste: false,
      cbs: Math.max(0, cbsRef - ALIQUOTAS_TESTE.reducaoCbs2027_2028),
      ibs: ALIQUOTAS_TESTE.ibs2027_2028,
      pisCofins: false, ipi: false, legado,
    };
  }
  if (ano <= 2032) {
    return {
      ano, fase: `ICMS/ISS a ${Math.round(legado * 100)}%; IBS a ${Math.round((1 - legado) * 100)}%`, teste: false,
      cbs: cbsRef, ibs: ibsRef * (1 - legado),
      pisCofins: false, ipi: false, legado,
    };
  }
  return {
    ano, fase: 'Modelo pleno (ICMS/ISS extintos)', teste: false,
    cbs: cbsRef, ibs: ibsRef, pisCofins: false, ipi: false, legado,
  };
}

/** Sistema atual (regras de 2025), usado como linha de base constante. */
export function sistemaAtual(entradas) {
  const e = normalizarEntradas(entradas);
  const B = e.receitaBens;
  const S = e.receitaServicos;
  const G = B + S;
  const C = e.compras;
  const F = e.folha;

  if (e.regime === 'simples') {
    const das = pct(e.aliquotaDAS) * G;
    const resultado = G - das - C - F;
    return {
      regime: e.regime, receita: G, preco: G, precoBens: B, precoServicos: S,
      icms: 0, iss: 0, ipi: 0, pisCofins: 0, creditoPisCofins: 0, das,
      cargaLiquida: das, aliquotaEfetiva: das / G,
      valorLiquido: G - das, custoComprasLiquido: C, resultado,
    };
  }

  const icms = pct(e.icmsEfetivo) * B;
  const iss = pct(e.issAliquota) * S;
  const ipi = pct(e.ipiEfetivo) * B; // IPI "por fora": somado ao preço
  const naoCum = e.regime === 'real';
  const aliqPC = pct(naoCum ? PIS_COFINS.naoCumulativo : PIS_COFINS.cumulativo);
  const basePC = G - (e.excluirIcmsBasePisCofins ? icms : 0); // STF, Tema 69
  const pisCofins = aliqPC * basePC;
  const creditoPisCofins = naoCum ? pct(PIS_COFINS.naoCumulativo) * C * pct(e.creditoPisCofinsAtualPct) : 0;
  const cargaLiquida = icms + iss + ipi + pisCofins - creditoPisCofins;
  const preco = G + ipi;
  const valorLiquido = G - icms - iss - pisCofins;
  const custoComprasLiquido = C - creditoPisCofins;
  const resultado = valorLiquido - custoComprasLiquido - F;
  return {
    regime: e.regime, receita: G, preco, precoBens: B + ipi, precoServicos: S,
    icms, iss, ipi, pisCofins, creditoPisCofins, das: 0,
    cargaLiquida, aliquotaEfetiva: cargaLiquida / preco,
    valorLiquido, custoComprasLiquido, resultado,
  };
}

/**
 * Tributos de um segmento (bens ou serviços) a partir do valor líquido N
 * (receita sem tributos sobre consumo). Linear em N.
 */
function tributosSegmento(N, { t, aLegado, aIpi, ibsCbsNaBaseLegado }) {
  const ibsCbs = t * N; // base sem ICMS/ISS (LC 214, art. 12, § 2º)
  // ICMS/ISS "por dentro": base = N (+ IBS/CBS, se a premissa estiver ligada) + o próprio imposto
  const baseSemImposto = N + (ibsCbsNaBaseLegado ? ibsCbs : 0);
  const legado = aLegado >= 1 ? 0 : (aLegado * baseSemImposto) / (1 - aLegado);
  const ipi = aIpi * (N + legado);
  return { ibsCbs, legado, ipi, preco: N + legado + ipi + ibsCbs };
}

function creditoCompras(e, s) {
  const tCompras = pct(s.cbs + s.ibs) * pct(e.creditoComprasPct);
  const fator = REDUCOES[e.reducao].fator;
  if (fator === 0 && !e.manterCreditosAliquotaZero) return 0;
  // Preço bruto das compras mantido; IBS/CBS destacado "por fora" dentro dele.
  return (e.compras * tCompras) / (1 + tCompras);
}

/** Simula um ano da transição. */
export function simularAno(entradas, ano, atual = sistemaAtual(entradas)) {
  const e = normalizarEntradas(entradas);
  const s = cronograma(ano, e);
  const k = REDUCOES[e.reducao].fator;
  const B = e.receitaBens;
  const S = e.receitaServicos;
  const G = B + S;
  const base = {
    ano, fase: s.fase, aliqCbs: s.cbs * k, aliqIbs: s.ibs * k, fatorLegado: s.legado,
  };

  // --- Anos sem mudança econômica ---------------------------------------
  const semMudanca = (nota) => ({
    ...base,
    pisCofins: atual.pisCofins, icms: atual.icms, iss: atual.iss, ipi: atual.ipi, das: atual.das,
    cbs: 0, ibs: 0, credito: atual.creditoPisCofins,
    ibsCbsLiquido: 0, tributosAntigos: atual.cargaLiquida,
    cargaLiquida: atual.cargaLiquida, aliquotaEfetiva: atual.aliquotaEfetiva,
    preco: atual.preco, variacaoPreco: 0,
    resultadoPrecoMantido: atual.resultado, variacaoResultado: 0,
    diferencaCarga: 0, nota,
  });

  if (e.regime === 'simples') {
    if (e.simplesOpcao === 'dentro' || ano === 2026) {
      return semMudanca(ano === 2026
        ? 'Optantes do Simples não se sujeitam às alíquotas-teste de 2026.'
        : 'IBS/CBS recolhidos dentro do DAS: carga mantida (simplificação); o cliente só aproveita crédito do valor pago no DAS.');
    }
    // Opção por recolher IBS/CBS pelo regime regular (LC 214, art. 41), a partir de 2027.
    const t = pct(s.cbs + s.ibs) * k;
    const d = pct(e.aliquotaDAS) * (1 - pct(e.dasPisCofinsPct) - pct(e.dasIcmsIssPct) + pct(e.dasIcmsIssPct) * s.legado);
    const credito = creditoCompras(e, s);
    const multiplicador = (1 + t) / (1 - d * (1 + t)); // preço = N × m
    const N = atual.resultado + (e.compras - credito) + e.folha;
    const preco = N * multiplicador;
    const das = d * preco;
    const ibsCbs = t * (N + das);
    const cargaLiquida = das + ibsCbs - credito;
    const Nmantido = atual.preco / multiplicador;
    const resultadoPrecoMantido = Nmantido - (e.compras - credito) - e.folha;
    const partCbs = s.cbs + s.ibs > 0 ? s.cbs / (s.cbs + s.ibs) : 0;
    return {
      ...base,
      pisCofins: 0, icms: 0, iss: 0, ipi: 0, das,
      cbs: ibsCbs * partCbs, ibs: ibsCbs * (1 - partCbs), credito,
      ibsCbsLiquido: ibsCbs - credito, tributosAntigos: das,
      cargaLiquida, aliquotaEfetiva: cargaLiquida / preco,
      preco, variacaoPreco: preco / atual.preco - 1,
      resultadoPrecoMantido, variacaoResultado: resultadoPrecoMantido - atual.resultado,
      diferencaCarga: cargaLiquida - atual.cargaLiquida,
      nota: 'Simples com IBS/CBS "por fora" (opção do art. 41 da LC 214/2025).',
    };
  }

  if (s.teste) {
    return semMudanca('CBS 0,9% e IBS 0,1% destacados em documento fiscal e compensados com PIS/Cofins (ou dispensados, cumpridas as obrigações acessórias).');
  }

  // --- Regime regular (Lucro Real / Presumido), 2027 em diante -------------
  const t = pct(s.cbs + s.ibs) * k;
  const aIcms = pct(e.icmsEfetivo) * s.legado;
  const aIss = pct(e.issAliquota) * s.legado;
  const aIpi = e.ipiZonaFranca ? pct(e.ipiEfetivo) : 0; // IPI zerado, exceto produtos com industrialização incentivada na ZFM
  const credito = creditoCompras(e, s);
  const custoCompras = e.compras - credito;

  const segBens = (N) => tributosSegmento(N, { t, aLegado: aIcms, aIpi, ibsCbsNaBaseLegado: e.ibsCbsNaBaseIcms });
  const segServ = (N) => tributosSegmento(N, { t, aLegado: aIss, aIpi: 0, ibsCbsNaBaseLegado: e.ibsCbsNaBaseIcms });

  // Cenário 1 — manter o resultado (margem em R$) do sistema atual.
  const N = atual.resultado + custoCompras + e.folha;
  const Nb = G > 0 ? N * (B / G) : 0;
  const Ns = N - Nb;
  const tb = segBens(Nb);
  const ts = segServ(Ns);
  const ibsCbs = tb.ibsCbs + ts.ibsCbs;
  const preco = tb.preco + ts.preco;
  const icms = tb.legado;
  const iss = ts.legado;
  const ipi = tb.ipi;
  const cargaLiquida = icms + iss + ipi + ibsCbs - credito;

  // Cenário 2 — manter o preço cobrado hoje (por segmento) e medir o efeito no resultado.
  const mb = segBens(1).preco; // tributos são lineares em N
  const ms = segServ(1).preco;
  const Nmantido = atual.precoBens / mb + atual.precoServicos / ms;
  const resultadoPrecoMantido = Nmantido - custoCompras - e.folha;

  const partCbs = s.cbs + s.ibs > 0 ? s.cbs / (s.cbs + s.ibs) : 0;
  return {
    ...base,
    pisCofins: 0, icms, iss, ipi, das: 0,
    cbs: ibsCbs * partCbs, ibs: ibsCbs * (1 - partCbs), credito,
    ibsCbsLiquido: ibsCbs - credito, tributosAntigos: icms + iss + ipi,
    cargaLiquida, aliquotaEfetiva: preco > 0 ? cargaLiquida / preco : 0,
    preco, variacaoPreco: preco / atual.preco - 1,
    resultadoPrecoMantido, variacaoResultado: resultadoPrecoMantido - atual.resultado,
    diferencaCarga: cargaLiquida - atual.cargaLiquida,
    nota: cargaLiquida < 0 ? 'Créditos superam débitos: saldo credor passível de ressarcimento.' : '',
  };
}

/** Simulação completa 2026–2033. */
export function simular(entradas) {
  const e = normalizarEntradas(entradas);
  const atual = sistemaAtual(e);
  const anos = ANOS.map((ano) => simularAno(e, ano, atual));
  return { entradas: e, atual, anos, avisos: avisos(e) };
}

function avisos(e) {
  const lista = [];
  if (e.regime === 'simples') {
    lista.push('Modelo do Simples Nacional simplificado: usa alíquota efetiva do DAS e a participação estimada de PIS/Cofins e ICMS/ISS na partilha. Consulte o anexo e a faixa da sua empresa.');
    if (e.simplesOpcao === 'dentro') {
      lista.push('Permanecendo com IBS/CBS dentro do DAS, clientes contribuintes do regime regular só se creditam do valor efetivamente recolhido no Simples — avalie o impacto comercial em vendas B2B.');
    }
  }
  if (e.reducao === 'zero') lista.push('Alíquota zero: a manutenção de créditos sobre as compras é tratada como premissa editável.');
  if (e.reducao === 'r30') lista.push('A redução de 30% exige profissão regulamentada listada no art. 127 e, para sociedades, requisitos sobre os sócios.');
  if (e.cbsRef + e.ibsRef > 26.5) lista.push('A soma das alíquotas de referência supera o teto de 26,5% previsto na LC 214/2025, que obriga o Executivo a propor medidas de redução — o valor final ainda depende de resolução do Senado.');
  if (e.ipiEfetivo > 0 && !e.ipiZonaFranca) lista.push('IPI zerado a partir de 2027 (exceto produtos com industrialização incentivada na Zona Franca de Manaus).');
  return lista;
}

const fmtPct = (v, casas = 1) => `${v < 0 ? '−' : ''}${(Math.abs(v) * 100).toFixed(casas).replace('.', ',')}%`;
const fmtBRL = (v) => {
  const sinal = v < 0 ? '−' : '';
  const abs = Math.abs(v);
  const [int, dec] = abs.toFixed(0).split('.');
  return `${sinal}R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${dec ? `,${dec}` : ''}`;
};

/** Explicação em linguagem simples (lista de parágrafos). */
export function explicar(resultado) {
  const { atual, anos, entradas: e } = resultado;
  const final = anos[anos.length - 1];
  const a2027 = anos.find((a) => a.ano === 2027);
  const p = [];
  const regimeTxt = { real: 'no Lucro Real', presumido: 'no Lucro Presumido', simples: 'no Simples Nacional' }[e.regime];

  p.push(`Hoje, ${regimeTxt}, a empresa recolhe cerca de ${fmtBRL(atual.cargaLiquida)} por ano em tributos sobre o consumo, o equivalente a ${fmtPct(atual.aliquotaEfetiva)} do valor cobrado dos clientes.`);

  if (e.regime === 'simples' && e.simplesOpcao === 'dentro') {
    p.push('Permanecendo integralmente no Simples, o simulador mantém a carga do DAS ao longo da transição. O principal efeito da reforma, nesse caso, é comercial: clientes do regime regular aproveitam crédito menor ao comprar de você.');
    return p;
  }

  p.push('Em 2026 nada muda no bolso: CBS (0,9%) e IBS (0,1%) aparecem na nota fiscal apenas como teste e são compensados com PIS/Cofins ou dispensados para quem cumpre as obrigações acessórias.');

  if (a2027) {
    const dir = a2027.diferencaCarga >= 0 ? 'aumento' : 'redução';
    p.push(`Em 2027, PIS e Cofins deixam de existir e a CBS passa a ser cobrada (${fmtPct(a2027.aliqCbs / 100, 2)} no cenário simulado). Mantida a sua margem, isso representa ${dir} de ${fmtBRL(Math.abs(a2027.diferencaCarga))} na carga anual líquida.`);
  }

  const dirFinal = final.diferencaCarga >= 0 ? 'maior' : 'menor';
  p.push(`Em 2033, com ICMS e ISS extintos, a carga líquida estimada é de ${fmtBRL(final.cargaLiquida)} (${fmtPct(final.aliquotaEfetiva)} sobre o preço), ${fmtBRL(Math.abs(final.diferencaCarga))} ${dirFinal} que hoje.`);

  const vp = final.variacaoPreco;
  p.push(Math.abs(vp) < 0.0005
    ? 'Para manter o mesmo resultado em reais, o preço final ao cliente praticamente não precisa mudar.'
    : `Para manter o mesmo resultado em reais, o preço final ao cliente (já com tributos) precisaria ${vp > 0 ? 'subir' : 'cair'} cerca de ${fmtPct(Math.abs(vp))}. Se, ao contrário, o preço for mantido, o resultado anual ${final.variacaoResultado >= 0 ? 'aumentaria' : 'diminuiria'} em ${fmtBRL(Math.abs(final.variacaoResultado))}.`);

  if (final.credito > 0) {
    p.push(`Os créditos amplos sobre compras (${fmtBRL(final.credito)} em 2033) são o principal fator que reduz a carga: no novo modelo, praticamente tudo o que é adquirido para a atividade gera crédito. A folha de pagamento (${fmtBRL(e.folha)}) não gera crédito — empresas intensivas em mão de obra tendem a sentir mais a reforma.`);
  }
  if (e.reducao !== 'nenhuma') {
    p.push(`A redução setorial selecionada (${REDUCOES[e.reducao].rotulo}) multiplica as alíquotas de IBS/CBS sobre as vendas por ${String(REDUCOES[e.reducao].fator).replace('.', ',')}.`);
  }
  return p;
}

/** Exporta o resultado em CSV (separador ";" e vírgula decimal, compatível com Excel pt-BR). */
export function paraCSV(resultado) {
  const num = (v, casas = 2) => (Number.isFinite(v) ? v.toFixed(casas).replace('.', ',') : '');
  const cab = [
    'Ano', 'Fase', 'Aliq. CBS (%)', 'Aliq. IBS (%)', 'Fator ICMS/ISS', 'PIS/Cofins', 'ICMS', 'ISS', 'IPI', 'DAS',
    'CBS', 'IBS', 'Créditos', 'Carga líquida reforma', 'Carga líquida atual', 'Diferença',
    'Alíquota efetiva reforma (%)', 'Alíquota efetiva atual (%)', 'Preço p/ manter margem', 'Variação de preço (%)',
    'Resultado com preço mantido', 'Variação do resultado',
  ];
  const { atual } = resultado;
  const linhas = resultado.anos.map((a) => [
    a.ano, `"${a.fase.replace(/"/g, '""')}"`, num(a.aliqCbs, 3), num(a.aliqIbs, 3), num(a.fatorLegado, 2),
    num(a.pisCofins), num(a.icms), num(a.iss), num(a.ipi), num(a.das),
    num(a.cbs), num(a.ibs), num(a.credito), num(a.cargaLiquida), num(atual.cargaLiquida), num(a.diferencaCarga),
    num(a.aliquotaEfetiva * 100), num(atual.aliquotaEfetiva * 100), num(a.preco), num(a.variacaoPreco * 100),
    num(a.resultadoPrecoMantido), num(a.variacaoResultado),
  ].join(';'));
  return `﻿${cab.join(';')}\n${linhas.join('\n')}\n`;
}

export const formatadores = { fmtPct, fmtBRL };
