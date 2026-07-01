/* ============================================================
   MODUŁ GRAFIK (motywy generowane w SVG)
   "Każdy slajd inny, ale spójny":
   - INNY  = inny motyw + inne ikony + inny seed (układ)
   - SPÓJNY = te same tokeny: kolor (currentColor=--accent), poświata,
             grubość linii, zestaw ikon, siatka. Zmiana koloru marki
             przemalowuje wszystkie motywy naraz.

   Motywy: flow (rzeka ikon) | chip (procesor + obwód) |
           orbit (węzeł + orbity) | grid (siatka-obwód) | cards (panele UI)
   ============================================================ */

const MOTIF_ICONS = ['gear', 'chat', 'doc', 'warn', 'data', 'check', 'mail', 'target'];

/* deterministyczny RNG z seeda (ten sam slajd = ten sam układ) */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const inner = svg => svg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');

/* jedna ikona-glif w układzie motywu (dziedziczy kolor akcentu) */
function glyph(key, x, y, size, rot, op) {
  const g = ICONS[key] || ICONS.gear;
  return `<g transform="translate(${x} ${y}) scale(${(size / 24).toFixed(3)}) rotate(${rot|0} 12 12)"
    opacity="${op.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round">${inner(g)}</g>`;
}
const dot = (x, y, r, op) => `<circle cx="${x|0}" cy="${y|0}" r="${r}" fill="currentColor" opacity="${op}"/>`;

/* ---- MOTYW: rzeka ikon (jak okładka / slajd CRM Vadyma) ------ */
function motifFlow(r, o) {
  let s = '';
  // 3 świecące strumienie od góry, rozchodzące się w dół
  const streams = [[330, 150], [300, 340], [270, 520]];
  streams.forEach(([x0, x1]) => {
    s += `<path d="M ${x0} 70 C ${x0 - 30} 430, ${x1 + 80} 820, ${x1} 1320"
      fill="none" stroke="currentColor" stroke-width="3" opacity="0.85"/>`;
  });
  // ikony rozsiane wzdłuż strumieni
  for (let i = 0; i < 15; i++) {
    const t = i / 15, y = 140 + t * 1080 + r() * 90;
    const x = 120 + r() * 380;
    s += glyph(o.icons[(i * 3) % o.icons.length], x, y, 26 + r() * 24, r() * 40 - 20, 0.45 + r() * 0.4);
  }
  for (let i = 0; i < 40; i++) s += dot(120 + r() * 420, 90 + r() * 1200, 1 + r() * 2.5, 0.3 + r() * 0.5);
  return s;
}

/* ---- MOTYW: procesor + obwód (jak "AI" chip Vadyma) --------- */
function motifChip(r, o) {
  const cx = 300, cy = 240, w = 150;
  let s = '';
  // linie obwodu w górę
  for (let i = 0; i < 9; i++) {
    const x = 90 + i * 47;
    s += `<path d="M ${x} 20 V ${90 + r() * 90}" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>`;
    s += dot(x, 20, 3, 0.7);
  }
  // chip
  s += `<rect x="${cx - w / 2}" y="${cy - w / 2}" width="${w}" height="${w}" rx="30"
    fill="rgba(0,0,0,0.35)" stroke="currentColor" stroke-width="4"/>
    <text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="var(--font-head)"
      font-weight="900" font-size="62" fill="currentColor">${o.label || 'AI'}</text>`;
  // strumienie w dół z ikonami
  s += motifFlow(r, o).replace(/M (\d+) 70/g, 'M 300 340');
  return s;
}

/* ---- MOTYW: węzeł + orbity (zaufanie / relacja) ------------- */
function motifOrbit(r, o) {
  const cx = 300, cy = 560;
  let s = `<circle cx="${cx}" cy="${cy}" r="260" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 10" opacity="0.5"/>
    <circle cx="${cx}" cy="${cy}" r="175" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 10" opacity="0.6"/>
    <circle cx="${cx}" cy="${cy}" r="78" fill="rgba(0,0,0,0.35)" stroke="currentColor" stroke-width="3.5"/>`;
  s += glyph(o.icons[0], cx - 34, cy - 34, 68, 0, 1);
  const ring = [[175, 6], [260, 6]];
  let k = 1;
  ring.forEach(([rad, n]) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.6;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      s += `<circle cx="${x|0}" cy="${y|0}" r="30" fill="rgba(0,0,0,0.4)" stroke="currentColor" stroke-width="2.5"/>`;
      s += glyph(o.icons[k % o.icons.length], x - 15, y - 15, 30, 0, 0.95); k++;
    }
  });
  return s;
}

/* ---- MOTYW: siatka-obwód (dane / system) ------------------- */
function motifGrid(r, o) {
  let s = '', cols = 7, rows = 12, x0 = 90, y0 = 120, dx = 70, dy = 95;
  const node = (c, row) => [x0 + c * dx, y0 + row * dy];
  // linie
  for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) {
    if (r() > 0.45 && c < cols - 1) { const [x1, y1] = node(c, row), [x2, y2] = node(c + 1, row);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="1.2" opacity="0.35"/>`; }
    if (r() > 0.55 && row < rows - 1) { const [x1, y1] = node(c, row), [x2, y2] = node(c, row + 1);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="1.2" opacity="0.35"/>`; }
  }
  for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) {
    const [x, y] = node(c, row); s += dot(x, y, 2.4, 0.5 + r() * 0.4);
  }
  // kilka podświetlonych węzłów z ikoną
  for (let i = 0; i < 5; i++) {
    const [x, y] = node(1 + (r() * (cols - 2) | 0), 1 + (r() * (rows - 2) | 0));
    s += `<circle cx="${x}" cy="${y}" r="34" fill="rgba(0,0,0,0.4)" stroke="currentColor" stroke-width="2.5"/>`;
    s += glyph(o.icons[i % o.icons.length], x - 16, y - 16, 32, 0, 1);
  }
  return s;
}

/* ---- MOTYW: panele UI (asystent / rozmowa) ----------------- */
function motifCards(r, o) {
  const card = (x, y, w, h, title) => {
    let c = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22"
      fill="rgba(0,0,0,0.4)" stroke="currentColor" stroke-width="2.5"/>`;
    c += glyph(o.icons[(r()*o.icons.length)|0], x + 26, y + 26, 34, 0, 1);
    c += `<rect x="${x + 74}" y="${y + 30}" width="${w * 0.5}" height="12" rx="6" fill="currentColor" opacity="0.85"/>`;
    for (let i = 0; i < 3; i++)
      c += `<rect x="${x + 28}" y="${y + 78 + i * 30}" width="${w - 56 - (i === 2 ? 90 : 0)}" height="10" rx="5" fill="currentColor" opacity="0.3"/>`;
    return c;
  };
  return card(70, 210, 470, 220, 1) + card(120, 500, 470, 220, 2) + card(70, 790, 470, 220, 3);
}

/* ---- MOTYW: hero 3D (szklane kafle z głębią — efekt "wow") --
   Faux-3D w SVG: bazowy kolor = currentColor (--accent), a objętość
   budują nakładki: połysk (biały gradient u góry) + cień (czarny na
   dole) + faza (jasny obrys) + miękki cień pod kaflem. Zmiana motywu
   marki przemalowuje całość (granat/zieleń/pomarańcz...).            */
function motifHero3d(r, o) {
  const seed = o.seed;
  const glyphW = (key, x, y, size) => {
    const g = ICONS[key] || ICONS.gear;
    return `<g transform="translate(${x} ${y}) scale(${(size/24).toFixed(3)})" fill="none"
      stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
      opacity="0.95">${inner(g)}</g>`;
  };
  const tile = (cx, cy, h, op, key, hero) => {
    const x = cx - h, y = cy - h, s = h * 2, rx = Math.max(14, s * 0.17);
    const face = `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${rx}"`;
    let t = `<ellipse cx="${cx}" cy="${(cy + h * 0.98)|0}" rx="${(h*1.05)|0}" ry="${(h*0.3)|0}"
        fill="#000" opacity="0.4" filter="url(#soft${seed})"/>`;
    t += `${face} fill="currentColor" opacity="${op}"/>`;
    t += `${face} fill="url(#gloss${seed})"/>`;
    t += `${face} fill="url(#shade${seed})"/>`;
    t += `<rect x="${x+2}" y="${y+2}" width="${s-4}" height="${s-4}" rx="${rx-2}"
        fill="none" stroke="#fff" stroke-width="${hero?3:2}" opacity="0.4"/>`;
    if (hero) t += `<text x="${cx}" y="${(cy + s*0.15)|0}" text-anchor="middle"
        font-family="var(--font-head)" font-weight="900" font-size="${(s*0.36)|0}"
        fill="#fff">${o.label || 'AI'}</text>`;
    else { const is = s * 0.5; t += glyphW(key, cx - is/2, cy - is/2, is); }
    return t;
  };
  let s = `<defs>
    <linearGradient id="gloss${seed}" x1="0" y1="0" x2="0.15" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.6"/>
      <stop offset="0.45" stop-color="#fff" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="shade${seed}" x1="0" y1="0.35" x2="0.2" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.5"/></linearGradient>
    <radialGradient id="floor${seed}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
      <stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient>
    <filter id="soft${seed}" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="9"/></filter></defs>`;
  s += `<ellipse cx="300" cy="720" rx="300" ry="140" fill="url(#floor${seed})"/>`;
  // dalekie kafle (mniejsze, przygaszone = głębia)
  [[130,300,34],[470,338,32],[110,560,30],[486,596,34],[300,210,29]]
    .forEach(([x,y,h],i) => s += tile(x, y, h, 0.5, o.icons[i % o.icons.length], false));
  // średni plan
  [[178,470,50],[432,500,52]].forEach(([x,y,h],i) => s += tile(x, y, h, 0.82, o.icons[(i+2)%o.icons.length], false));
  // bohater (środek)
  s += tile(300, 468, 118, 1, null, true);
  // bliskie kafle (na wierzchu)
  [[150,772,58],[452,788,56]].forEach(([x,y,h],i) => s += tile(x, y, h, 0.96, o.icons[(i+4)%o.icons.length], false));
  // iskry / bokeh
  for (let i = 0; i < 26; i++)
    s += `<circle cx="${(80+r()*440)|0}" cy="${(150+r()*780)|0}" r="${(1+r()*3).toFixed(1)}" fill="#fff" opacity="${(0.15+r()*0.5).toFixed(2)}"/>`;
  return s;
}

const MOTIFS = { flow: motifFlow, chip: motifChip, orbit: motifOrbit, grid: motifGrid, cards: motifCards, hero3d: motifHero3d };

/* Składa gotowe <svg> motywu (z poświatą). id filtra = seed (unikat). */
function renderMotif(cfg, seed) {
  const r = rng(seed);
  const icons = cfg.icons || MOTIF_ICONS;
  const fn = MOTIFS[cfg.motif] || motifChip;
  const body = fn(r, { icons, label: cfg.label, seed });
  const glow = cfg.motif === 'hero3d' ? '' : `filter="url(#glow${seed})"`;  // 3D ma własne cienie
  return `<svg class="motif" viewBox="0 0 600 1350" preserveAspectRatio="xMidYMid slice">
    <defs><filter id="glow${seed}" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="currentColor" flood-opacity="0.65"/></filter></defs>
    <g ${glow} color="inherit">${body}</g></svg>`;
}
