import { useMemo } from 'react';
import { PLANT_CATEGORIES } from './data/plantCategories.js';
import { PLANTS } from './data/plants.js';

import svgFruitTrees from './assets/categories/fruit-trees.svg';
import svgFruitShrubs from './assets/categories/fruit-shrubs.svg';
import svgVegetables from './assets/categories/vegetables.svg';
import svgVegetablesGreenhouse from './assets/categories/vegetables-greenhouse.svg';
import svgOrnamental from './assets/categories/ornamental.svg';
import svgHerbs from './assets/categories/herbs.svg';
import svgGardenTrees from './assets/categories/garden-trees.svg';
import svgIndoor from './assets/categories/indoor.svg';
import svgOther from './assets/categories/other.svg';

const CATEGORY_SVG = {
  'fruit-trees': svgFruitTrees,
  'fruit-shrubs': svgFruitShrubs,
  'vegetables': svgVegetables,
  'vegetables-greenhouse': svgVegetablesGreenhouse,
  'ornamental': svgOrnamental,
  'herbs': svgHerbs,
  'garden-trees': svgGardenTrees,
  'indoor': svgIndoor,
  'other': svgOther,
};

function pluralRoslin(n) {
  if (n === 0) return '0 roślin';
  if (n === 1) return '1 roślina';
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} rośliny`;
  return `${n} roślin`;
}

// Hex (#RRGGBB) → "r, g, b" string for rgba() usage.
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return '155, 155, 155';
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

export default function CategoryGrid({ customPlants = [], removedSet, onPickCategory }) {
  const counts = useMemo(() => {
    const map = {};
    for (const cat of PLANT_CATEGORIES) map[cat.id] = 0;
    PLANTS.forEach((p) => {
      if (removedSet && removedSet.has(p.key)) return;
      if (p.categoryId && map[p.categoryId] !== undefined) map[p.categoryId]++;
    });
    customPlants.forEach((p) => {
      const cat = p.categoryId || p.category;
      if (cat && map[cat] !== undefined) map[cat]++;
      else map['other']++;
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
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onPickCategory?.(cat.id)}
              className="relative rounded-2xl cursor-pointer overflow-hidden flex flex-col items-center"
              style={{
                minHeight: 160,
                padding: '12px 12px 14px',
                background: `linear-gradient(180deg, rgba(${rgb}, 0.18) 0%, var(--cat-card-bg, rgba(20, 14, 8, 0.55)) 100%)`,
                border: `1.5px solid rgba(${rgb}, 0.35)`,
                boxShadow: `0 2px 12px rgba(0,0,0,0.18), 0 0 0 1px rgba(${rgb}, 0.05) inset`,
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
                    minWidth: 24,
                    height: 22,
                    padding: '0 7px',
                    borderRadius: 11,
                    background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                    color: '#1A1208',
                    fontSize: 12,
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
              <img
                src={CATEGORY_SVG[cat.id]}
                alt=""
                aria-hidden="true"
                style={{
                  width: 80,
                  height: 80,
                  margin: '8px 0 4px',
                  filter: n === 0 ? 'grayscale(0.4) opacity(0.65)' : 'none',
                }}
              />
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--cat-card-text, #F0E8D8)',
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
                  color: 'var(--cat-card-muted, rgba(232, 221, 208, 0.65))',
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
