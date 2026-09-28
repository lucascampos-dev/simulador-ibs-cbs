// Camada de interface: lê o formulário, chama o motor (calc.js) e desenha resultados.
import {
  ENTRADAS_PADRAO, PRESETS_ALIQUOTAS, REDUCOES, REGIMES, simular, explicar, paraCSV, formatadores,
} from './calc.js';
import { desenharGrafico } from './chart.js';

const { fmtBRL, fmtPct } = formatadores;
const $ = (sel) => document.querySelector(sel);
const form = $('#form');
const CAMPOS_BOOL = ['excluirIcmsBasePisCofins', 'manterCreditosAliquotaZero', 'ibsCbsNaBaseIcms', 'ipiZonaFranca'];
const CAMPOS_TEXTO = ['regime', 'reducao', 'simplesOpcao'];
let ultimo = null;

function preencher(valores) {
  for (const [k, v] of Object.entries(valores)) {
    const el = form.elements.namedItem(k);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = Boolean(v);
    else el.value = v;
  }
  form.elements.preset.value = 'cgibs2026';
}

function lerEntradas() {
  const e = {};
  for (const k of Object.keys(ENTRADAS_PADRAO)) {
    const el = form.elements.namedItem(k);
    if (!el) continue;
    if (CAMPOS_BOOL.includes(k)) e[k] = el.checked;
    else if (CAMPOS_TEXTO.includes(k)) e[k] = el.value;
    else e[k] = el.value === '' ? 0 : Number(el.value);
  }
  return e;
}

function atualizarVisibilidade(regime) {
  const simples = regime === 'simples';
  document.querySelectorAll('.only-simples').forEach((el) => { el.hidden = !simples; });
  document.querySelectorAll('.not-simples').forEach((el) => { el.hidden = simples; });
  document.querySelectorAll('.only-real').forEach((el) => { el.hidden = regime !== 'real'; });
}

const delta = (v, invert = false, fmt = fmtBRL) => {
  if (Math.abs(v) < 0.5) return '<span>—</span>';
  const bom = invert ? v > 0 : v < 0;
  const cls = bom ? 'delta-down' : 'delta-up';
  const seta = v > 0 ? '▲' : '▼';
  return `<span class="${cls}">${seta} ${fmt(Math.abs(v))}</span>`;
};

function renderKPIs(r) {
  const f = r.anos[r.anos.length - 1];
  const vp = f.variacaoPreco;
  $('#kpis').innerHTML = `
    <div class="kpi">
      <p class="k-label">Carga atual (por ano)</p>
      <p class="k-value">${fmtBRL(r.atual.cargaLiquida)}</p>
      <p class="k-sub">${fmtPct(r.atual.aliquotaEfetiva)} do preço cobrado</p>
    </div>
    <div class="kpi accent">
      <p class="k-label">Carga em 2033 (modelo pleno)</p>
      <p class="k-value">${fmtBRL(f.cargaLiquida)}</p>
      <p class="k-sub">${fmtPct(f.aliquotaEfetiva)} do preço<span class="k-delta">${Math.abs(f.diferencaCarga) < 0.5 ? 'sem variação' : `${delta(f.diferencaCarga)} vs. hoje`}</span></p>
    </div>
    <div class="kpi">
      <p class="k-label">Preço p/ manter margem (2033)</p>
      <p class="k-value">${Math.abs(vp) < 0.0005 ? '0,0%' : `${vp > 0 ? '+' : '−'}${fmtPct(Math.abs(vp))}`}</p>
      <p class="k-sub">preço final ao cliente, com tributos</p>
    </div>
    <div class="kpi">
      <p class="k-label">Resultado c/ preço mantido (2033)</p>
      <p class="k-value">${Math.abs(f.variacaoResultado) < 0.5 ? 'R$ 0' : `${f.variacaoResultado > 0 ? '+' : '−'}${fmtBRL(Math.abs(f.variacaoResultado))}`}</p>
      <p class="k-sub">por ano, frente ao resultado atual</p>
    </div>`;
}

function renderTabela(r) {
  const brl = (v) => fmtBRL(v).replace('R$ ', '');
  const d = (v, inv) => delta(v, inv, brl);
  const pct2 = (v) => `${v.toFixed(2).replace('.', ',')}%`;
  const linhas = r.anos.map((a) => `
    <tr>
      <th scope="row">${a.ano}<span class="fase-sub">${a.fase}</span></th>
      <td class="aliqs">${pct2(a.aliqCbs)}<br>${pct2(a.aliqIbs)}</td>
      <td>${brl(a.tributosAntigos)}</td>
      <td>${brl(a.ibsCbsLiquido)}</td>
      <td><strong>${brl(a.cargaLiquida)}</strong></td>
      <td>${d(a.diferencaCarga)}</td>
      <td>${fmtPct(a.aliquotaEfetiva)}</td>
      <td>${Math.abs(a.variacaoPreco) < 0.0005 ? '0,0%' : `${a.variacaoPreco > 0 ? '+' : '−'}${fmtPct(Math.abs(a.variacaoPreco))}`}</td>
      <td>${d(a.variacaoResultado, true)}</td>
    </tr>`).join('');
  $('#tabela').innerHTML = `
    <caption class="sr-only">Carga tributária por ano, sistema atual versus reforma</caption>
    <thead>
      <tr>
        <th scope="col">Ano / fase</th><th scope="col">CBS<br>IBS</th>
        <th scope="col">Tributos antigos (R$)</th><th scope="col">IBS/CBS líquido (R$)</th><th scope="col">Carga total (R$)</th>
        <th scope="col">vs. atual (R$)</th><th scope="col">Alíq. efetiva</th><th scope="col">Preço p/ manter margem</th>
        <th scope="col">Resultado c/ preço mantido (R$)</th>
      </tr>
    </thead>
    <tbody>
      <tr class="base-row">
        <th scope="row">Atual<span class="fase-sub">Regras de 2025</span></th><td>—</td>
        <td>${brl(r.atual.cargaLiquida)}</td><td>—</td><td><strong>${brl(r.atual.cargaLiquida)}</strong></td>
        <td>—</td><td>${fmtPct(r.atual.aliquotaEfetiva)}</td><td>—</td><td>${brl(r.atual.resultado)}</td>
      </tr>
      ${linhas}
    </tbody>`;
}

function renderPremissas(r) {
  const e = r.entradas;
  const itens = [
    ['Regime', REGIMES[e.regime]],
    ['Mercadorias', fmtBRL(e.receitaBens)], ['Serviços', fmtBRL(e.receitaServicos)],
    ['Compras com crédito', fmtBRL(e.compras)], ['Folha', fmtBRL(e.folha)],
    ...(e.regime === 'simples'
      ? [['DAS efetivo', `${e.aliquotaDAS}%`], ['IBS/CBS', e.simplesOpcao === 'dentro' ? 'dentro do DAS' : 'por fora']]
      : [['ICMS efetivo', `${e.icmsEfetivo}%`], ['ISS', `${e.issAliquota}%`], ['IPI', `${e.ipiEfetivo}%`]]),
    ['Tratamento das vendas', REDUCOES[e.reducao].rotulo],
    ['CBS / IBS de referência', `${e.cbsRef}% / ${e.ibsRef}%`],
  ];
  $('#premissas-print').innerHTML = `<h3>Premissas do cenário</h3><p class="small">${
    itens.map(([k, v]) => `<strong>${k}:</strong> ${v}`).join(' · ')}</p>`;
}

function calcular() {
  const erro = $('#erro');
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  const entradas = lerEntradas();
  atualizarVisibilidade(entradas.regime);
  try {
    const r = simular(entradas);
    ultimo = r;
    erro.hidden = true;
    renderKPIs(r);
    desenharGrafico($('#chart'), $('#tooltip'), r);
    renderTabela(r);
    $('#explicacao').innerHTML = explicar(r).map((p) => `<p>${p}</p>`).join('');
    $('#avisos').innerHTML = r.avisos.map((a) => `<li>${a}</li>`).join('');
    renderPremissas(r);
  } catch (err) {
    const campo = err.message.match(/"(\w+)"/);
    const el = campo ? form.elements.namedItem(campo[1]) : null;
    const rotulo = el?.labels?.[0]?.textContent.trim();
    erro.textContent = rotulo ? err.message.replace(`"${campo[1]}"`, `“${rotulo}”`) : err.message;
    erro.hidden = false;
    el?.setAttribute('aria-invalid', 'true');
  }
}

function baixarCSV() {
  if (!ultimo) return;
  const blob = new Blob([paraCSV(ultimo)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'simulacao-ibs-cbs-2026-2033.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

form.addEventListener('input', (ev) => {
  const id = ev.target.id;
  if (id === 'preset') {
    const p = PRESETS_ALIQUOTAS[ev.target.value];
    if (p) { form.elements.cbsRef.value = p.cbs; form.elements.ibsRef.value = p.ibs; }
  } else if (id === 'cbsRef' || id === 'ibsRef') {
    form.elements.preset.value = 'custom';
  }
  calcular();
});
form.addEventListener('submit', (ev) => ev.preventDefault());
$('#reset').addEventListener('click', () => { preencher(ENTRADAS_PADRAO); calcular(); });
$('#csv').addEventListener('click', baixarCSV);
$('#print').addEventListener('click', () => window.print());

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => ultimo && desenharGrafico($('#chart'), $('#tooltip'), ultimo), 120);
});

preencher(ENTRADAS_PADRAO);
calcular();
