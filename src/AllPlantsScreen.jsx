import { useEffect, useMemo, useState } from 'react';
import { REAL_CATEGORIES, CATEGORY_BY_ID, normalizeCategoryId } from './data/plantCategories.js';
import { PLANTS } from './data/plants.js';

const VIEW_KEY = 'garden-all-plants-view';
const VIEWS = [
  { id: 'category', icon: '🗂️', label: 'Kategoriami' },
  { id: 'alpha',    icon: '📋', label: 'Alfabetycznie' },
];

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return '155, 155, 155';
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

function buildPlantList({ customPlants, removedSet }) {
  // Wszystkie rośliny (built-in + custom top-level), zmapowane do nowej kategorii.
  const list = [];
  PLANTS.forEach((p) => {
    if (removedSet && removedSet.has(p.key)) return;
    list.push({
      id: p.key,
      name: p.name,
      variety: null,
      location: null,
      categoryId: normalizeCategoryId(p.categoryId),
      _builtin: true,
    });
  });
  customPlants.forEach((p) => {
    if (p.is_variety || p.parent_plant_id) return;
    list.push({
      id: p.id,
      name: p.name || p.id,
      variety: p.variety || p.variety_name || null,
      location: p.location || null,
      categoryId: normalizeCategoryId(p.categoryId || p.category),
      _builtin: false,
    });
  });
  return list;
}

export default function AllPlantsScreen({
  customPlants = [],
  removedSet,
  onBack,
  onOpenPlant,
}) {
  const [view, setView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) || 'category'; }
    catch { return 'category'; }
  });
  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ }
  }, [view]);

  const plants = useMemo(() => buildPlantList({ customPlants, removedSet }), [customPlants, removedSet]);

  const grouped = useMemo(() => {
    if (view === 'category') {
      const map = {};
      for (const cat of REAL_CATEGORIES) map[cat.id] = [];
      for (const p of plants) {
        if (map[p.categoryId]) map[p.categoryId].push(p);
        else map.other.push(p);
      }
      return REAL_CATEGORIES
        .map((cat) => ({ kind: 'category', cat, items: map[cat.id] }))
        .filter((g) => g.items.length > 0);
    }
    // Alphabetical
    const byLetter = {};
    for (const p of plants) {
      const ch = (p.name || '?').trim().charAt(0).toUpperCase();
      const letter = /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(ch) ? ch : '#';
      if (!byLetter[letter]) byLetter[letter] = [];
      byLetter[letter].push(p);
    }
    const letters = Object.keys(byLetter).sort((a, b) => a.localeCompare(b, 'pl'));
    return letters.map((letter) => ({
      kind: 'alpha',
      letter,
      items: byLetter[letter].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    }));
  }, [plants, view]);

  return (
    <div style={{ animation: 'screenEnter 0.2s ease' }}>
      <section className="px-5 pt-3 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="cursor-pointer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, padding: '7px 14px', borderRadius: 999,
            background: 'var(--surface-card)',
            border: '0.5px solid var(--border-medium)',
            color: 'var(--text-primary)', fontWeight: 500,
          }}
        >
          ← Wróć
        </button>
      </section>

      <section className="px-5 pb-3">
        <h2 className="font-serif italic" style={{ fontSize: 26, color: 'var(--gold)' }}>
          🌱 Wszystkie rośliny
          <span style={{ marginLeft: 10, fontSize: 14, color: 'var(--text-muted)', fontStyle: 'normal', fontVariantNumeric: 'tabular-nums' }}>
            · {plants.length}
          </span>
        </h2>
      </section>

      <section className="px-5 pb-3">
        <div className="flex gap-2">
          {VIEWS.map((v) => {
            const active = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className="cursor-pointer"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 999, fontSize: 14,
                  background: active ? 'linear-gradient(135deg, rgba(201,169,110,0.28), rgba(123,201,123,0.12))' : 'var(--surface-card-soft)',
                  border: active ? '1px solid var(--gold)' : '0.5px solid var(--border-soft)',
                  color: active ? 'var(--gold)' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {v.icon} {v.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-8">
        {plants.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--text-faint)', padding: '20px 0', textAlign: 'center' }}>
            Brak roślin. Dodaj pierwszą przyciskiem + na dole.
          </p>
        )}
        {grouped.map((group) => {
          const heading = group.kind === 'category'
            ? `${group.cat.emoji} ${group.cat.name}`
            : group.letter;
          return (
            <div key={group.kind === 'category' ? group.cat.id : group.letter} className="mb-5">
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-serif italic" style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>
                  {heading}
                </h3>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {group.items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {group.items.map((p) => {
                  const cat = CATEGORY_BY_ID[p.categoryId] || CATEGORY_BY_ID.other;
                  const accent = cat.accent;
                  const rgb = hexToRgb(accent);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onOpenPlant?.(p.id, p.variety ? `${p.name} · ${p.variety}` : p.name)}
                      className="cursor-pointer text-left"
                      style={{
                        padding: '16px',
                        borderRadius: 12,
                        background: `rgba(${rgb}, 0.15)`,
                        borderLeft: `3px solid ${accent}`,
                        borderTop: `0.5px solid rgba(${rgb}, 0.20)`,
                        borderRight: `0.5px solid rgba(${rgb}, 0.20)`,
                        borderBottom: `0.5px solid rgba(${rgb}, 0.20)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                          {p.name}
                        </p>
                        {p.variety && (
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{p.variety}</p>
                        )}
                        {view === 'alpha' && (
                          <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 3 }}>{cat.emoji} {cat.name}</p>
                        )}
                        {p.location && (
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>📍 {p.location}</p>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}>›</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
