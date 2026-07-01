/* ============================================================
   SILNIK KARUZELI
   - buduje slajdy z obiektu treści
   - AUTO-DOPASOWANIE: skaluje nagłówek i tekst tak, by zmieściły
     się w swoim polu (mechanizm dopasowujący się do treści)
   - motywy per marka i per post
   - eksport PNG (html2canvas)
   ============================================================ */

const STAGE = document.getElementById('stage');
let DECK = null;          // aktualny obiekt treści
let CURRENT = 0;          // indeks widocznego slajdu

/* ---- pomocnicze -------------------------------------------- */
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function titleHTML(parts) {
  if (typeof parts === 'string') return parts;
  return (parts || []).map(p => p.hl ? `<span class="hl">${p.t}</span>` : `<span>${p.t}</span>`).join('');
}
function paragraphs(text) {
  // pusta linia => nowy akapit; pojedynczy \n => łamanie w akapicie
  return (text || '').split(/\n\s*\n/).map(block =>
    `<p>${block.replace(/\n/g, '<br>')}</p>`).join('');
}

/* ---- AUTO-FIT: dobiera font-size tak, by tekst zmieścił się w
   ZADANYM budżecie wysokości (px). Tekst się ZAWIJA, nie kurczy do
   jednej linii. Mieści się w rozmiarze projektowym → zostaje duży. */
function fitToBudget(node, min, budget) {
  if (!node || budget <= 0) return;
  const max = parseInt(getComputedStyle(node).fontSize);   // rozmiar docelowy z CSS
  node.style.overflow = 'hidden';
  // "mieści się" = wysokość w budżecie ORAZ żadne słowo nie wychodzi poza kolumnę
  const fits = () => node.scrollHeight <= budget && node.scrollWidth <= node.clientWidth + 1;
  node.style.fontSize = max + 'px';
  if (fits()) return;                                      // mieści się — zostaw duży
  let lo = min, hi = max, best = min;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    node.style.fontSize = mid + 'px';
    if (fits()) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  node.style.fontSize = best + 'px';
}

/* Ile miejsca w pionie dostaje nagłówek vs tekst (reszta na tekst) */
const HEAD_SHARE = { cover: 0.54, 'text-visual': 0.42, list: 0.48, cta: 0.44 };

function autofitSlide(sl) {
  const layout = sl.dataset.layout;
  const wrap = sl.querySelector('.s-body-wrap');
  const head = sl.querySelector('.headline');
  const text = sl.querySelector('.s-text');
  const avail = wrap.clientHeight;                         // deterministyczne (top/bottom absolutne)
  let reserved = 92;                                       // kreska-akcent + odstępy
  const kicker = wrap.querySelector('.s-kicker'); if (kicker) reserved += kicker.offsetHeight + 18;
  const cta = wrap.querySelector('.s-cta');       if (cta)    reserved += cta.offsetHeight + 40;
  const free = Math.max(120, avail - reserved);
  const headBudget = Math.round(free * (HEAD_SHARE[layout] || 0.45));
  const textBudget = free - headBudget;
  fitToBudget(head, 34, headBudget);
  fitToBudget(text, 20, textBudget);
}

/* ---- obszar wizualny (zdjęcie > motyw SVG > sama poświata) -- */
function buildVisual(s, idx) {
  const v = el('div', 's-visual');
  if (s.image) {                                  // 1) zdjęcie użytkownika / stock
    const photo = el('div', 'photo');
    photo.style.backgroundImage = `url("${s.image}")`;
    v.appendChild(photo);
    v.appendChild(el('div', 'fade'));
    v.appendChild(el('div', 'glow-frame'));
    const chipVal = s.chip || (DECK.meta && DECK.meta.chip);
    if (chipVal) v.appendChild(el('div', 'chip', chipVal));
  } else if (s.visual && s.visual.motif) {         // 2) grafika generowana (SVG)
    const cfg = Object.assign({ label: (DECK.meta && DECK.meta.chip) || 'AI' }, s.visual);
    const seed = (s.visual.seed != null) ? s.visual.seed : (idx + 1) * 97 + cfg.motif.length;
    v.innerHTML = renderMotif(cfg, seed);
  } else {                                         // 3) pusto — sama poświata
    v.classList.add('empty');
    v.appendChild(el('div', 'glow-frame'));
    const chipVal = s.chip || (DECK.meta && DECK.meta.chip);
    if (chipVal) v.appendChild(el('div', 'chip', chipVal));
  }
  return v;
}

/* ---- budowa jednego slajdu --------------------------------- */
function buildSlide(s, idx) {
  const slide = el('div', 'slide');
  slide.dataset.layout = s.layout || 'text-visual';
  if (s.theme) slide.dataset.theme = s.theme;   // motyw per slajd (nadpisuje deck)

  // pasek górny: numer + licznik
  const top = el('div', 's-topbar');
  top.appendChild(el('div', 's-num', s.num || String(idx + 1).padStart(2, '0')));
  const total = (DECK.meta && DECK.meta.total) || DECK.slides.length;
  top.appendChild(el('div', 's-count', `${idx + 1}/${total}`));
  slide.appendChild(top);

  // strona wizualna (nie dla listy — tam są karty)
  if (s.layout !== 'list') slide.appendChild(buildVisual(s, idx));

  // kolumna tekstowa
  const wrap = el('div', 's-body-wrap');
  if (s.kicker) wrap.appendChild(el('div', 's-kicker', s.kicker));
  const head = el('div', 'headline', titleHTML(s.title));
  wrap.appendChild(head);
  wrap.appendChild(el('div', 'accent-bar'));
  const body = el('div', 's-text', paragraphs(s.text));
  wrap.appendChild(body);

  // CTA na slajdzie końcowym
  if (s.layout === 'cta' && s.cta) {
    const cta = el('div', 's-cta');
    cta.appendChild(el('div', 'bm', ICONS.bookmark));
    cta.appendChild(el('div', 'cta-txt', `<b>${s.cta.head}</b><span>${s.cta.sub || ''}</span>`));
    wrap.appendChild(cta);
  }
  slide.appendChild(wrap);

  // karty dla layoutu "list"
  if (s.layout === 'list' && s.cards) {
    const cards = el('div', 's-cards');
    s.cards.forEach(c => {
      const card = el('div', 'card');
      const ctop = el('div', 'c-top');
      ctop.appendChild(el('div', 'c-icon', ICONS[c.icon] || ICONS.check));
      ctop.appendChild(el('div', 'c-head', c.head || ''));
      card.appendChild(ctop);
      card.appendChild(el('div', 'c-desc', c.desc || ''));
      cards.appendChild(card);
    });
    slide.appendChild(cards);
  }
  return slide;
}

/* ---- render całej talii ------------------------------------ */
function render(deck) {
  DECK = deck;
  STAGE.innerHTML = '';
  // motyw + nadpisania zmiennych (per post)
  STAGE.dataset.theme = (deck.meta && deck.meta.theme) || 'vadym';
  const vars = deck.meta && deck.meta.vars;
  STAGE.removeAttribute('style');
  if (vars) for (const k in vars) STAGE.style.setProperty('--' + k, vars[k]);

  deck.slides.forEach((s, i) => STAGE.appendChild(buildSlide(s, i)));

  // auto-dopasowanie po wstawieniu do DOM (elementy mają realne wymiary)
  STAGE.querySelectorAll('.slide').forEach(autofitSlide);

  CURRENT = Math.min(CURRENT, deck.slides.length - 1);
  show(CURRENT);
  buildDots();
}

/* ---- nawigacja (jeden slajd naraz, skalowany do podglądu) --- */
function show(i) {
  CURRENT = (i + DECK.slides.length) % DECK.slides.length;
  const slides = STAGE.querySelectorAll('.slide');
  slides.forEach((s, k) => s.style.display = k === CURRENT ? 'block' : 'none');
  scaleToViewport();
  document.querySelectorAll('.dot').forEach((d, k) => d.classList.toggle('on', k === CURRENT));
  document.getElementById('pos').textContent = `${CURRENT + 1} / ${DECK.slides.length}`;
}
function scaleToViewport() {
  const vp = document.getElementById('viewport');
  const scale = vp.clientWidth / 1080;
  STAGE.style.transform = `scale(${scale})`;
  vp.style.height = (1350 * scale) + 'px';
}
function buildDots() {
  const box = document.getElementById('dots');
  box.innerHTML = '';
  DECK.slides.forEach((_, i) => {
    const d = el('span', 'dot' + (i === CURRENT ? ' on' : ''));
    d.onclick = () => show(i);
    box.appendChild(d);
  });
}

/* ---- eksport PNG (html2canvas) ----------------------------- */
async function exportPNG(index) {
  const slides = STAGE.querySelectorAll('.slide');
  const target = slides[index];
  const prevT = STAGE.style.transform, prevD = target.style.display;
  STAGE.style.transform = 'none';
  target.style.display = 'block';
  const canvas = await html2canvas(target, { width: 1080, height: 1350, scale: 2, backgroundColor: null, useCORS: true });
  STAGE.style.transform = prevT;
  slides.forEach((s, k) => s.style.display = k === CURRENT ? 'block' : 'none');
  const a = document.createElement('a');
  a.download = `slajd-${String(index + 1).padStart(2, '0')}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}
async function exportAll() {
  for (let i = 0; i < DECK.slides.length; i++) { await exportPNG(i); await new Promise(r => setTimeout(r, 400)); }
}

/* ---- eksport HTML pojedynczego slajdu (do Adobe Express) ---- */
function exportHTML() {
  const css = [...document.querySelectorAll('link[rel=stylesheet]')].map(l =>
    `<link rel="stylesheet" href="${l.href}">`).join('\n');
  const slide = STAGE.querySelectorAll('.slide')[CURRENT].outerHTML;
  const doc = `<!doctype html><html><head><meta charset="utf-8">
<meta name="hz:canvas-width" content="1080"><meta name="hz:canvas-height" content="1350">
${css}</head><body data-theme="${STAGE.dataset.theme}" style="${STAGE.getAttribute('style')||''}">${slide}</body></html>`;
  const blob = new Blob([doc], { type: 'text/html' });
  const a = document.createElement('a');
  a.download = `slajd-${CURRENT + 1}.html`;
  a.href = URL.createObjectURL(blob);
  a.click();
}

/* ---- UI: edytor treści, motywy, kolor akcentu -------------- */
function loadEditorFromDeck(deck) {
  document.getElementById('editor').value = JSON.stringify(deck, null, 2);
}
function applyEditor() {
  try {
    const deck = JSON.parse(document.getElementById('editor').value);
    document.getElementById('err').textContent = '';
    render(deck);
  } catch (e) {
    document.getElementById('err').textContent = 'Błąd JSON: ' + e.message;
  }
}

window.addEventListener('resize', () => DECK && scaleToViewport());
window.addEventListener('DOMContentLoaded', () => {
  const q = new URLSearchParams(location.search);
  // starter: preset (domyślnie DB Meble; ?preset=vadym dla drugiego)
  const startKey = PRESETS[q.get('preset')] ? q.get('preset') : 'dbmeble';
  loadEditorFromDeck(PRESETS[startKey]);
  render(PRESETS[startKey]);
  if (q.has('full')) {                       // tryb podglądu 1:1 (do zrzutów)
    document.querySelector('.panel').style.display = 'none';
    document.querySelector('.app').style.gridTemplateColumns = '1fr';
    document.querySelector('.navbar').style.display = 'none';
    document.querySelector('.stage-wrap').style.padding = '0';
    const vp = document.getElementById('viewport');
    vp.style.width = '1080px'; vp.style.borderRadius = '0';
    show(parseInt(q.get('slide') || '0'));
    STAGE.style.transform = 'none'; vp.style.height = '1350px';   // 1:1, bez skalowania
  }

  document.getElementById('prev').onclick = () => show(CURRENT - 1);
  document.getElementById('next').onclick = () => show(CURRENT + 1);
  document.getElementById('apply').onclick = applyEditor;
  document.getElementById('pngOne').onclick = () => exportPNG(CURRENT);
  document.getElementById('pngAll').onclick = exportAll;
  document.getElementById('htmlOne').onclick = exportHTML;

  document.getElementById('preset').onchange = e => {
    const d = structuredClone(PRESETS[e.target.value]);
    loadEditorFromDeck(d); render(d);
  };
  document.getElementById('theme').onchange = e => {
    DECK.meta.theme = e.target.value; loadEditorFromDeck(DECK); render(DECK);
  };
  document.getElementById('accent').oninput = e => {
    DECK.meta.vars = DECK.meta.vars || {};
    DECK.meta.vars.accent = e.target.value;
    loadEditorFromDeck(DECK); render(DECK);
  };
});
