import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANOS, FATOR_LEGADO, REDUCOES, cronograma, sistemaAtual, simularAno, simular,
  normalizarEntradas, explicar, paraCSV, PRESETS_ALIQUOTAS,
} from '../src/calc.js';

const ref = { cbsRef: 9.21, ibsRef: 18.7 };
const perto = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

// Cenário "de laboratório" com números redondos para conferir à mão.
const base = {
  regime: 'real', receitaBens: 1000, receitaServicos: 0, compras: 400, folha: 100,
  icmsEfetivo: 10, issAliquota: 0, ipiEfetivo: 0, creditoPisCofinsAtualPct: 100,
  excluirIcmsBasePisCofins: true, reducao: 'nenhuma', cbsRef: 9, ibsRef: 18,
  creditoComprasPct: 100,
};

describe('cronograma de transição (EC 132/2023, ADCT arts. 125–129)', () => {
  test('2026: alíquotas-teste CBS 0,9% e IBS 0,1%, tributos atuais integrais', () => {
    const s = cronograma(2026, ref);
    assert.equal(s.cbs, 0.9);
    assert.equal(s.ibs, 0.1);
    assert.equal(s.teste, true);
    assert.equal(s.pisCofins, true);
    assert.equal(s.legado, 1);
  });

  test('2027 e 2028: CBS de referência − 0,1 p.p., IBS 0,1%, PIS/Cofins e IPI extintos/zerados', () => {
    for (const ano of [2027, 2028]) {
      const s = cronograma(ano, ref);
      perto(s.cbs, 9.11);
      assert.equal(s.ibs, 0.1);
      assert.equal(s.pisCofins, false);
      assert.equal(s.ipi, false);
      assert.equal(s.legado, 1);
    }
  });

  test('2029–2032: ICMS/ISS a 90/80/70/60% e IBS entrando na proporção complementar', () => {
    const esperado = { 2029: 0.9, 2030: 0.8, 2031: 0.7, 2032: 0.6 };
    for (const [ano, fator] of Object.entries(esperado)) {
      const s = cronograma(Number(ano), ref);
      perto(s.legado, fator);
      perto(s.ibs, 18.7 * (1 - fator));
      perto(s.cbs, 9.21);
    }
  });

  test('2033: ICMS/ISS extintos e IBS/CBS plenos', () => {
    const s = cronograma(2033, ref);
    assert.equal(s.legado, 0);
    assert.equal(s.cbs, 9.21);
    assert.equal(s.ibs, 18.7);
  });

  test('fatores de legado são decrescentes e cobrem 2026–2033', () => {
    assert.deepEqual(ANOS, [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]);
    const f = ANOS.map((a) => FATOR_LEGADO[a]);
    for (let i = 1; i < f.length; i += 1) assert.ok(f[i] <= f[i - 1]);
  });

  test('ano fora da transição gera erro', () => {
    assert.throws(() => cronograma(2025, ref));
    assert.throws(() => cronograma(2034, ref));
  });
});

describe('reduções de alíquota (LC 214/2025)', () => {
  test('fatores: padrão 1; 30% → 0,7; 60% → 0,4; zero → 0', () => {
    assert.equal(REDUCOES.nenhuma.fator, 1);
    assert.equal(REDUCOES.r30.fator, 0.7);
    assert.equal(REDUCOES.r60.fator, 0.4);
    assert.equal(REDUCOES.zero.fator, 0);
  });

  test('redução de 60% aplica 40% da alíquota sobre as vendas', () => {
    const cheio = simularAno(base, 2033);
    const r60 = simularAno({ ...base, reducao: 'r60' }, 2033);
    perto(r60.aliqCbs, 9 * 0.4);
    perto(r60.aliqIbs, 18 * 0.4);
    assert.ok(r60.cargaLiquida < cheio.cargaLiquida);
  });

  test('redução de 30% aplica 70% da alíquota', () => {
    const r30 = simularAno({ ...base, reducao: 'r30' }, 2033);
    perto(r30.aliqCbs + r30.aliqIbs, 27 * 0.7);
  });

  test('alíquota zero: sem débito; créditos mantidos geram saldo credor', () => {
    const z = simularAno({ ...base, reducao: 'zero' }, 2033);
    assert.equal(z.cbs + z.ibs, 0);
    assert.ok(z.cargaLiquida < 0);
    const semCredito = simularAno({ ...base, reducao: 'zero', manterCreditosAliquotaZero: false }, 2033);
    assert.equal(semCredito.credito, 0);
    perto(semCredito.cargaLiquida, 0);
  });
});

describe('sistema atual', () => {
  test('Lucro Real: PIS/Cofins 9,25% sobre receita sem ICMS, com crédito sobre compras', () => {
    const a = sistemaAtual(base);
    perto(a.icms, 100);
    perto(a.pisCofins, 0.0925 * 900);
    perto(a.creditoPisCofins, 0.0925 * 400);
    perto(a.cargaLiquida, 100 + 83.25 - 37);
    perto(a.resultado, 1000 - 100 - 83.25 - (400 - 37) - 100);
  });

  test('Lucro Presumido: PIS/Cofins cumulativo 3,65% e sem créditos', () => {
    const a = sistemaAtual({ ...base, regime: 'presumido' });
    perto(a.pisCofins, 0.0365 * 900);
    assert.equal(a.creditoPisCofins, 0);
  });

  test('sem exclusão do ICMS a base de PIS/Cofins é a receita bruta', () => {
    const a = sistemaAtual({ ...base, excluirIcmsBasePisCofins: false });
    perto(a.pisCofins, 0.0925 * 1000);
  });

  test('IPI é somado ao preço ("por fora")', () => {
    const a = sistemaAtual({ ...base, ipiEfetivo: 5 });
    perto(a.ipi, 50);
    perto(a.preco, 1050);
  });
});

describe('simulação por ano — regime regular', () => {
  test('2026 é neutro: carga e preço iguais ao sistema atual', () => {
    const a = sistemaAtual(base);
    const y = simularAno(base, 2026);
    perto(y.cargaLiquida, a.cargaLiquida);
    perto(y.variacaoPreco, 0);
    perto(y.variacaoResultado, 0);
  });

  test('2027: sem PIS/Cofins e sem IPI (fora da ZFM), CBS a 8,9% e IBS 0,1%', () => {
    const y = simularAno({ ...base, ipiEfetivo: 5 }, 2027);
    assert.equal(y.pisCofins, 0);
    assert.equal(y.ipi, 0);
    perto(y.aliqCbs, 8.9);
    perto(y.aliqIbs, 0.1);
    assert.ok(y.icms > 0);
  });

  test('IPI mantido para produto da Zona Franca de Manaus', () => {
    const y = simularAno({ ...base, ipiEfetivo: 5, ipiZonaFranca: true }, 2030);
    assert.ok(y.ipi > 0);
  });

  test('2033: sem ICMS/ISS; débito = alíquota × valor líquido; crédito por fora sobre compras', () => {
    const a = sistemaAtual(base);
    const y = simularAno(base, 2033);
    assert.equal(y.icms, 0);
    const t = 0.27;
    const credito = (400 * t) / (1 + t);
    perto(y.credito, credito);
    const N = a.resultado + (400 - credito) + 100; // valor líquido que preserva o resultado
    perto(y.cbs + y.ibs, t * N);
    perto(y.preco, N * (1 + t));
    perto(y.cargaLiquida, t * N - credito);
  });

  test('cenário "manter margem": preço = valor líquido + tributos e resultado preservado', () => {
    for (const ano of ANOS.slice(1)) {
      const y = simularAno({ ...base, receitaServicos: 500, issAliquota: 5 }, ano);
      const a = sistemaAtual({ ...base, receitaServicos: 500, issAliquota: 5 });
      const N = y.preco - y.icms - y.iss - y.ipi - y.cbs - y.ibs;
      perto(N - (400 - y.credito) - 100, a.resultado, 1e-6);
    }
  });

  test('ICMS "por dentro" durante a transição usa alíquota proporcional (2030 = 80%)', () => {
    const y = simularAno(base, 2030);
    const N = y.preco - y.icms - y.cbs - y.ibs;
    perto(y.icms / (N + y.icms), 0.10 * 0.8);
  });

  test('premissa de IBS/CBS na base do ICMS aumenta o ICMS em 2029', () => {
    const sem = simularAno(base, 2029);
    const com = simularAno({ ...base, ibsCbsNaBaseIcms: true }, 2029);
    assert.ok(com.icms > sem.icms);
  });

  test('cenário "manter preço": consistência entre preço e resultado', () => {
    const a = sistemaAtual(base);
    const y = simularAno(base, 2033);
    // Com preço fixo, N = preço / 1,27; resultado = N − custo líquido − folha
    const N = a.preco / 1.27;
    perto(y.resultadoPrecoMantido, N - (400 - y.credito) - 100);
    // Se o preço para manter margem sobe, manter o preço reduz o resultado (e vice-versa)
    assert.equal(Math.sign(y.variacaoPreco), -Math.sign(y.variacaoResultado));
  });

  test('decomposição: tributos antigos + IBS/CBS líquido = carga líquida (todos os regimes e anos)', () => {
    for (const regime of ['real', 'presumido', 'simples']) {
      for (const simplesOpcao of ['dentro', 'fora']) {
        const r = simular({ ...base, regime, simplesOpcao, aliquotaDAS: 10 });
        for (const a of r.anos) perto(a.tributosAntigos + a.ibsCbsLiquido, a.cargaLiquida);
      }
    }
  });

  test('crédito efetivo sobre compras reduzido aumenta a carga', () => {
    const cheio = simularAno(base, 2033);
    const parcial = simularAno({ ...base, creditoComprasPct: 50 }, 2033);
    assert.ok(parcial.cargaLiquida > cheio.cargaLiquida);
  });
});

describe('Simples Nacional (modelo simplificado)', () => {
  const simples = {
    regime: 'simples', receitaBens: 1000, receitaServicos: 0, compras: 400, folha: 100,
    aliquotaDAS: 10, dasPisCofinsPct: 15.5, dasIcmsIssPct: 34, reducao: 'nenhuma', cbsRef: 9, ibsRef: 18,
  };

  test('permanecendo no DAS a carga é constante em todos os anos', () => {
    const r = simular({ ...simples, simplesOpcao: 'dentro' });
    for (const y of r.anos) perto(y.cargaLiquida, 100);
  });

  test('2026 não aplica alíquotas-teste ao Simples', () => {
    const y = simularAno({ ...simples, simplesOpcao: 'fora' }, 2026);
    perto(y.cargaLiquida, 100);
  });

  test('opção por IBS/CBS "por fora" em 2033: DAS residual sem PIS/Cofins e ICMS/ISS', () => {
    const y = simularAno({ ...simples, simplesOpcao: 'fora' }, 2033);
    const d = 0.10 * (1 - 0.155 - 0.34);
    perto(y.das / y.preco, d);
    assert.ok(y.credito > 0);
    const a = sistemaAtual(simples);
    const N = y.preco - y.das - y.cbs - y.ibs;
    perto(N - (400 - y.credito) - 100, a.resultado);
  });
});

describe('validação, explicação e exportação', () => {
  test('rejeita valores negativos e receita zerada', () => {
    assert.throws(() => normalizarEntradas({ receitaBens: -1 }), /negativo/);
    assert.throws(() => normalizarEntradas({ receitaBens: 0, receitaServicos: 0 }), /receita/);
    assert.throws(() => normalizarEntradas({ icmsEfetivo: 120 }), /entre 0 e 100/);
  });

  test('presets de alíquota de referência somam as estimativas publicadas', () => {
    perto(PRESETS_ALIQUOTAS.cgibs2026.cbs + PRESETS_ALIQUOTAS.cgibs2026.ibs, 27.91);
    perto(PRESETS_ALIQUOTAS.sert2024.cbs + PRESETS_ALIQUOTAS.sert2024.ibs, 26.5);
  });

  test('explicação traz parágrafos em português', () => {
    const p = explicar(simular(base));
    assert.ok(p.length >= 4);
    assert.match(p.join(' '), /2033/);
  });

  test('CSV tem cabeçalho + 8 anos, separador ";" e BOM', () => {
    const csv = paraCSV(simular(base));
    assert.ok(csv.startsWith('﻿Ano;'));
    const linhas = csv.trim().split('\n');
    assert.equal(linhas.length, 9);
    assert.match(linhas[8], /^2033;/);
  });
});
