import { useMemo } from 'react';
import { PLANT_CATEGORIES } from './data/plantCategories.js';
import { PLANTS } from './data/plants.js';

// v6.3 — zdjęcia WebP dla kategorii (dostarczone przez Dario w Drive).
import imgAll from './assets/categories/all.webp';
import imgFruitTrees from './assets/categories/fruit-trees.webp';
import imgFruitShrubs from './assets/categories/fruit-shrubs.webp';
import imgGardenTrees from './assets/categories/garden-trees.webp';
import imgVegetables from './assets/categories/vegetables.webp';
import imgOrnamental from './assets/categories/ornamental.webp';
import imgIndoor from './assets/categories/indoor.webp';
import imgOther from './assets/categories/other.webp';

const CATEGORY_IMAGE = {
  'all': imgAll,
  'fruit-trees': imgFruitTrees,
  'fruit-shrubs': imgFruitShrubs,
  'garden-trees': imgGardenTrees,
  'vegetables': imgVegetables,
  'ornamental': imgOrnamental,
  'indoor': imgIndoor,
  'other': imgOther,
};

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
          const img = CATEGORY_IMAGE[cat.id];
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onPickCategory?.(cat.id)}
              className="relative rounded-2xl cursor-pointer overflow-hidden flex flex-col justify-end"
              style={{
                minHeight: 170,
                padding: '14px 12px 14px',
                backgroundImage: img
                  ? `linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.10) 100%), url(${img})`
                  : `linear-gradient(135deg, rgba(${rgb}, 0.22), rgba(${rgb}, 0.06))`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: `${isAll ? '1.5px' : '1px'} solid rgba(${rgb}, ${isAll ? 0.65 : 0.40})`,
                boxShadow: `0 4px 14px rgba(0,0,0,0.22), 0 0 0 1px rgba(${rgb}, 0.10) inset`,
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
                    boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {n}
                </span>
              )}
              {/* Emoji top-left as small badge */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  fontSize: 26,
                  lineHeight: 1,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
                  opacity: n === 0 ? 0.7 : 1,
                }}
              >
                {cat.emoji}
              </span>
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textAlign: 'left',
                  lineHeight: 1.2,
                  letterSpacing: '0.1px',
                  textShadow: '0 1px 4px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.6)',
                }}
              >
                {cat.name}
              </span>
              <span
                style={{
                  marginTop: 3,
                  fontSize: 12.5,
                  color: '#E8C77E',
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  fontWeight: 600,
                  letterSpacing: '0.3px',
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
