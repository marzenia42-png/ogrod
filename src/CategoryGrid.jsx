import { useMemo } from 'react';
import { PLANT_CATEGORIES } from './data/plantCategories.js';
import { PLANTS } from './data/plants.js';

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
 * Siatka 8 kategorii roślin. Karta = emoji + nazwa + licznik roślin Beaty.
 * Karty z 0 roślinami są stonowane (placeholder do dodania).
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
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onPickCategory?.(cat.id)}
              className="rounded-2xl py-5 px-3 flex flex-col items-center gap-2 cursor-pointer"
              style={{
                // Glassmorphism: ciemne tło z blur niezależnie od motywu — kontrast nad bg image.
                background: filled
                  ? 'linear-gradient(135deg, rgba(20,15,8,0.78) 0%, rgba(35,25,12,0.72) 100%)'
                  : 'linear-gradient(135deg, rgba(20,15,8,0.58) 0%, rgba(30,22,12,0.50) 100%)',
                border: filled
                  ? '0.5px solid rgba(201, 169, 110, 0.45)'
                  : '0.5px solid rgba(201, 169, 110, 0.18)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: filled
                  ? '0 4px 14px rgba(0, 0, 0, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.04)'
                  : '0 2px 8px rgba(0, 0, 0, 0.20)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span
                style={{
                  fontSize: 38,
                  opacity: filled ? 1 : 0.55,
                  lineHeight: 1,
                  filter: filled ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' : 'none',
                }}
              >
                {cat.emoji}
              </span>
              <span
                className="font-serif italic text-center px-1"
                style={{
                  fontSize: 14,
                  color: filled ? '#F5EDD8' : 'rgba(245, 237, 216, 0.55)',
                  lineHeight: 1.2,
                  fontWeight: filled ? 500 : 400,
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.55)',
                  letterSpacing: '0.2px',
                }}
              >
                {cat.name}
              </span>
              <span
                className="tracking-wide"
                style={{
                  fontSize: 11,
                  color: filled ? '#D4B26A' : 'rgba(232, 221, 208, 0.45)',
                  fontVariantNumeric: 'lining-nums tabular-nums',
                  fontWeight: filled ? 600 : 400,
                  textShadow: filled ? '0 1px 2px rgba(0, 0, 0, 0.70)' : 'none',
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
