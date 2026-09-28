// Gráfico de barras em SVG feito à mão (sem bibliotecas).
// Para cada ano: barra "Sistema atual" e barra empilhada "Reforma"
// (tributos antigos + IBS/CBS líquido de créditos).
import { formatadores } from './calc.js';

const { fmtBRL } = formatadores;
const NS = 'http://www.w3.org/2000/svg';

export function compacto(v) {
  const abs = Math.abs(v);
  const s = v < 0 ? '−' : '';
  if (abs >= 1e9) return `${s}${(abs / 1e9).toFixed(1).replace(/\.0$/, '').replace('.', ',')} bi`;
  if (abs >= 1e6) return `${s}${(abs / 1e6).toFixed(abs >= 1e7 ? 1 : 2).replace(/\.?0+$/, '').replace('.', ',')} mi`;
  if (abs >= 1e3) return `${s}${Math.round(abs / 1e3)} mil`;
  return `${s}${Math.round(abs)}`;
}

function passoBonito(max) {
  const bruto = max / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto || 1));
  const n = bruto / mag;
  const f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return f * mag;
}

function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

/** Retângulo com cantos superiores (ou inferiores) arredondados, ancorado na base. */
function barPath(x, y0, y1, w, r) {
  const top = Math.min(y0, y1);
  const h = Math.abs(y1 - y0);
  const rr = Math.min(r, h, w / 2);
  if (h < 0.5) return '';
  if (y1 <= y0) { // cresce para cima: arredonda o topo
    return `M${x},${y0}V${top + rr}Q${x},${top} ${x + rr},${top}H${x + w - rr}Q${x + w},${top} ${x + w},${top + rr}V${y0}Z`;
  }
  const bot = top + h; // cresce para baixo: arredonda a base
  return `M${x},${y0}V${bot - rr}Q${x},${bot} ${x + rr},${bot}H${x + w - rr}Q${x + w},${bot} ${x + w},${bot - rr}V${y0}Z`;
}

export function desenharGrafico(container, tooltip, resultado) {
  const { atual, anos } = resultado;
  const largura = Math.max(320, container.clientWidth || 720);
  const altura = largura < 520 ? 260 : 320;
  const m = { t: 22, r: 8, b: 30, l: largura < 520 ? 52 : 64 };
  const w = largura - m.l - m.r;
  const h = altura - m.t - m.b;

  const valores = anos.flatMap((a) => [
    atual.cargaLiquida,
    Math.max(0, a.tributosAntigos) + Math.max(0, a.ibsCbsLiquido),
    Math.min(0, a.ibsCbsLiquido) + Math.min(0, a.tributosAntigos),
  ]);
  const maxV = Math.max(1, ...valores);
  const minV = Math.min(0, ...valores);
  const passo = passoBonito(maxV - minV);
  const top = Math.ceil(maxV / passo) * passo;
  const bottom = Math.floor(minV / passo) * passo;
  const y = (v) => m.t + ((top - v) / (top - bottom)) * h;

  const svg = el('svg', { viewBox: `0 0 ${largura} ${altura}`, 'aria-hidden': 'true', focusable: 'false' });
  const gGrid = el('g', { class: 'grid' }, svg);
  const gAxis = el('g', { class: 'axis' }, svg);
  for (let v = bottom; v <= top + 1e-9; v += passo) {
    el('line', { x1: m.l, x2: largura - m.r, y1: y(v), y2: y(v) }, gGrid);
    const t = el('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end' }, gAxis);
    t.textContent = compacto(v);
  }

  const banda = w / anos.length;
  const barW = Math.min(30, (banda - 14) / 2);
  const gap = 2;
  const y0 = y(0);

  anos.forEach((a, i) => {
    const cx = m.l + banda * i + banda / 2;
    const xA = cx - barW - gap / 2;
    const xR = cx + gap / 2;
    el('path', { class: 'bar-atual', d: barPath(xA, y0, y(atual.cargaLiquida), barW, 4) }, svg);

    // Reforma empilhada: tributos antigos na base, IBS/CBS líquido por cima (ou abaixo de zero se negativo)
    const leg = Math.max(0, a.tributosAntigos);
    const novo = a.ibsCbsLiquido;
    const yLeg = y(leg);
    if (novo > 0) {
      const temNovo = y(leg) - y(leg + novo) > 0.5;
      // 2px de respiro entre segmentos empilhados
      el('path', { class: 'bar-legado', d: temNovo ? `M${xR},${y0}V${yLeg}H${xR + barW}V${y0}Z` : barPath(xR, y0, yLeg, barW, 4) }, svg);
      if (temNovo) el('path', { class: 'bar-novo', d: barPath(xR, yLeg - (leg > 0 ? gap : 0), y(leg + novo), barW, 4) }, svg);
    } else {
      el('path', { class: 'bar-legado', d: barPath(xR, y0, yLeg, barW, 4) }, svg);
      if (novo < 0) el('path', { class: 'bar-novo', d: barPath(xR, y0, y(novo), barW, 4) }, svg);
    }

    const total = a.cargaLiquida;
    const topo = Math.min(y(Math.max(leg + Math.max(0, novo), 0)), y(atual.cargaLiquida));
    const lbl = el('text', { class: 'lbl', x: cx, y: topo - 6, 'text-anchor': 'middle' }, svg);
    lbl.textContent = largura < 520 && i % 2 === 1 ? '' : compacto(total);

    const ano = el('text', { x: cx, y: altura - 8, 'text-anchor': 'middle' }, gAxis);
    ano.textContent = largura < 420 ? `’${String(a.ano).slice(2)}` : a.ano;

    const hit = el('rect', { class: 'hit', x: m.l + banda * i, y: m.t, width: banda, height: h, tabindex: '0', 'data-i': i }, svg);
    const mostrar = (ev) => {
      svg.querySelectorAll('.hit.on').forEach((n) => n.classList.remove('on'));
      hit.classList.add('on');
      tooltip.innerHTML = `
        <strong>${a.ano} — ${a.fase}</strong>
        <div class="row"><span><i class="sw sw-atual"></i>Sistema atual</span><span>${fmtBRL(atual.cargaLiquida)}</span></div>
        <div class="row"><span><i class="sw sw-legado"></i>Tributos antigos</span><span>${fmtBRL(a.tributosAntigos)}</span></div>
        <div class="row"><span><i class="sw sw-novo"></i>IBS/CBS líquido</span><span>${fmtBRL(a.ibsCbsLiquido)}</span></div>
        <div class="row"><span>Carga na reforma</span><span><b>${fmtBRL(total)}</b></span></div>`;
      tooltip.hidden = false;
      const box = hit.getBoundingClientRect();
      const tw = tooltip.offsetWidth;
      const px = ev && ev.clientX ? ev.clientX : box.left + box.width / 2;
      let left = px + 14;
      if (left + tw > window.innerWidth - 8) left = px - tw - 14;
      tooltip.style.left = `${Math.max(8, left)}px`;
      tooltip.style.top = `${Math.max(8, box.top + 8)}px`;
    };
    const esconder = () => { tooltip.hidden = true; hit.classList.remove('on'); };
    hit.addEventListener('mousemove', mostrar);
    hit.addEventListener('focus', mostrar);
    hit.addEventListener('mouseleave', esconder);
    hit.addEventListener('blur', esconder);
  });

  el('line', { class: 'baseline', x1: m.l, x2: largura - m.r, y1: y0, y2: y0 }, svg);
  container.replaceChildren(svg);
  const final = anos[anos.length - 1];
  container.setAttribute('aria-label',
    `Gráfico: carga atual de ${fmtBRL(atual.cargaLiquida)} por ano; na reforma, ${anos.map((a) => `${a.ano}: ${fmtBRL(a.cargaLiquida)}`).join('; ')}. Em 2033: ${fmtBRL(final.cargaLiquida)}. Detalhes na tabela abaixo.`);
}
