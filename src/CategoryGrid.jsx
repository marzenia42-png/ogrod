import { useMemo } from 'react';
import { PLANT_CATEGORIES } from './data/plantCategories.js';
import { PLANTS } from './data/plants.js';

// v6.2 — finalna lista 8 kategorii (pos 0 = "all" virtual folder).
// Karty: gradient akcent + 60px emoji + 18px bold name + złoty badge licznika.

function pluralRoslin(n) {
  if (n === 0) return '0 roślin';
  if (n === 1) return '1 roślina';
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} rośliny`;
  return `${n} roślin`;
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return '155, 155, 155';
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

function realCatFor(p) {
  // Built-in PLANTS use categoryId; custom may use category. herbs has been remapped.
  const id = p.categoryId || p.category;
  if (!id) return 'other';
  if (id === 'herbs') return 'vegetables';
  if (id === 'vegetables-greenhouse') return 'vegetables';
  return id;
}

export default function CategoryGrid({ customPlants = [], removedSet, onPickCategory }) {
  const counts = useMemo(() => {
    const map = { all: 0 };
    for (const cat of PLANT_CATEGORIES) map[cat.id] = 0;

    PLANTS.forEach((p) => {
      if (removedSet && removedSet.has(p.key)) return;
      const c = realCatFor(p);
      if (map[c] !== undefined) map[c]++;
      map.all++;
    });
    customPlants.forEach((p) => {
      // Skip variety children — they're counted under their parent's category.
      if (p.is_variety || p.parent_plant_id) return;
      const c = realCatFor(p);
      if (map[c] !== undefined) map[c]++;
      else map.other++;
      map.all++;
    });
    return map;
  }, [customPlants, removedSet]);

  return (
    <section className="px-5 pb-8">
      <h2
        className="font-serif italic mb-4"
        style={{ fontSize: 22, color: 'var(--gold)', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
      >
        Twoje rośliny
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {PLANT_CATEGORIES.map((cat) => {
          const n = counts[cat.id] || 0;
          const rgb = hexToRgb(cat.accent);
          const isAll = cat.id === 'all';
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onPickCategory?.(cat.id)}
              className="relative rounded-2xl cursor-pointer overflow-hidden flex flex-col items-center justify-between"
              style={{
                minHeight: 160,
                padding: '14px 12px 16px',
                background: `linear-gradient(135deg, rgba(${rgb}, ${isAll ? 0.22 : 0.18}), rgba(${rgb}, 0.06))`,
                border: `${isAll ? '1.5px' : '1px'} solid rgba(${rgb}, ${isAll ? 0.55 : 0.30})`,
                boxShadow: `0 2px 12px rgba(0,0,0,0.12), 0 0 0 1px rgba(${rgb}, 0.05) inset`,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {n > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 26,
                    height: 24,
                    padding: '0 8px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                    color: '#1A1208',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {n}
                </span>
              )}
              <span
                aria-hidden="true"
                style={{
                  fontSize: 60,
                  lineHeight: 1,
                  opacity: n === 0 ? 0.55 : 1,
                  filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.18))',
                  flex: 1,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {cat.emoji}
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--cat-card-text, var(--text-primary))',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  letterSpacing: '0.1px',
                  marginTop: 2,
                }}
              >
                {cat.name}
              </span>
              <span
                style={{
                  marginTop: 2,
                  fontSize: 13,
                  color: 'var(--cat-card-muted, var(--text-muted))',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {pluralRoslin(n)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
