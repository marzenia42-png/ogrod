import { useMemo } from 'react';
import { PLANT_CATEGORIES } from './data/plantCategories.js';
import { PLANTS } from './data/plants.js';

// Zdjęcia kategorii z Pexels (free license, no attribution required).
// Importowane przez Vite — bundler hashuje + lazy-loaduje + optymalizuje.
import imgFruitTrees from './assets/categories/fruit-trees.jpg';
import imgFruitShrubs from './assets/categories/fruit-shrubs.jpg';
import imgGardenTrees from './assets/categories/garden-trees.jpg';
import imgVegetables from './assets/categories/vegetables.jpg';
import imgVegetablesGreenhouse from './assets/categories/vegetables-greenhouse.jpg';
import imgOrnamental from './assets/categories/ornamental.jpg';
import imgHerbs from './assets/categories/herbs.jpg';
import imgIndoor from './assets/categories/indoor.jpg';

const CATEGORY_IMAGES = {
  'fruit-trees': imgFruitTrees,
  'fruit-shrubs': imgFruitShrubs,
  'garden-trees': imgGardenTrees,
  'vegetables': imgVegetables,
  'vegetables-greenhouse': imgVegetablesGreenhouse,
  'ornamental': imgOrnamental,
  'herbs': imgHerbs,
  'indoor': imgIndoor,
};

const GOLD = 'var(--gold)';

// Polish plural: 1 roślina / 2-4 rośliny / 5+ roślin (z wyjątkiem 12-14).
function pluralRoslin(n) {
  if (n === 0) return '0 roślin';
  if (n === 1) return '1 roślina';
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} rośliny`;
  return `${n} roślin`;
}

/**
 * Siatka 8 kategorii roślin. Karta = zdjęcie tła + emoji + nazwa + licznik.
 * - filled (n>0): zdjęcie Pexels jako background + gradient ciemny od dołu dla czytelności
 * - empty (n=0): bez zdjęcia, glass dark + przygaszone emoji
 *
 * Props:
 *   customPlants  — Array<{ id, name, variety?, categoryId? }>
 *   removedSet    — Set<string> kluczy builtin plants ukrytych przez user
 *   onPickCategory(categoryId)
 */
export default function CategoryGrid({ customPlants = [], removedSet, onPickCategory }) {
  const counts = useMemo(() => {
    const map = {};
    for (const cat of PLANT_CATEGORIES) map[cat.id] = 0;
    PLANTS.forEach((p) => {
      if (removedSet && removedSet.has(p.key)) return;
      if (p.categoryId && map[p.categoryId] !== undefined) map[p.categoryId]++;
    });
    customPlants.forEach((p) => {
      if (p.categoryId && map[p.categoryId] !== undefined) map[p.categoryId]++;
    });
    return map;
  }, [customPlants, removedSet]);

  return (
    <section className="px-6 pb-8">
      <h2 className="font-serif italic mb-4" style={{ fontSize: '20px', color: GOLD, textShadow: '0 1px 3px rgba(0,0,0,0.45)' }}>
        Twoje rośliny
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {PLANT_CATEGORIES.map((cat) => {
          const n = counts[cat.id] || 0;
          const filled = n > 0;
          const imageUrl = CATEGORY_IMAGES[cat.id];
          // Filled: zdjęcie + gradient overlay (czarne od dołu → przezroczyste u góry)
          // Empty: glass dark + drobne tonowanie zdjęciem w tle (40% opacity)
          const cardBackground = filled
            ? `linear-gradient(to top, rgba(8,5,2,0.88) 0%, rgba(8,5,2,0.55) 45%, rgba(8,5,2,0.20) 100%), url(${imageUrl}) center/cover no-repeat`
            : `linear-gradient(to top, rgba(8,5,2,0.92) 0%, rgba(8,5,2,0.80) 60%, rgba(8,5,2,0.70) 100%), url(${imageUrl}) center/cover no-repeat`;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onPickCategory?.(cat.id)}
              className="rounded-2xl flex flex-col items-center justify-end cursor-pointer overflow-hidden relative"
              style={{
                minHeight: '150px',
                padding: '12px 12px 14px',
                gap: '4px',
                background: cardBackground,
                border: filled
                  ? '0.5px solid rgba(201, 169, 110, 0.55)'
                  : '0.5px solid rgba(201, 169, 110, 0.22)',
                boxShadow: filled
                  ? '0 4px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                  : '0 2px 8px rgba(0, 0, 0, 0.22)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Emoji w prawym górnym rogu — mały akcent over zdjęciem */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  fontSize: 22,
                  opacity: filled ? 0.95 : 0.5,
                  lineHeight: 1,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
                }}
              >
                {cat.emoji}
              </span>

              <span
                className="font-serif italic text-center px-1 self-stretch"
                style={{
                  fontSize: 15,
                  color: filled ? '#F8F0DC' : 'rgba(248, 240, 220, 0.65)',
                  lineHeight: 1.2,
                  fontWeight: filled ? 600 : 500,
                  textShadow: '0 1px 4px rgba(0, 0, 0, 0.85), 0 0 2px rgba(0, 0, 0, 0.5)',
                  letterSpacing: '0.2px',
                }}
              >
                {cat.name}
              </span>
              <span
                className="tracking-wide self-stretch text-center"
                style={{
                  fontSize: 11,
                  color: filled ? '#E8C77E' : 'rgba(232, 221, 208, 0.55)',
                  fontVariantNumeric: 'lining-nums tabular-nums',
                  fontWeight: filled ? 600 : 500,
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.85)',
                  letterSpacing: '0.4px',
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
