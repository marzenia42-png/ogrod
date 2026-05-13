import { useRef, useEffect, useMemo } from 'react';
import { PLANT_CATEGORIES, CATEGORY_BY_ID } from './data/plantCategories.js';
import { PLANTS } from './data/plants.js';

const GOLD = 'var(--gold)';

/**
 * Podstrona kategorii: poziomy strip nawigacji + lista roślin.
 *
 * Props:
 *   categoryId               — id aktywnej kategorii (string)
 *   customPlants             — Array
 *   removedSet               — Set<string> ukrytych builtin plants
 *   onBack()                 — powrót do gridu (Główna)
 *   onSelectCategory(id)     — zmiana aktywnej kategorii
 *   onOpenPlant(id, name)    — kliknięcie rośliny → PlantDetail
 *   onAddPlant()             — kliknięcie "+ Dodaj roślinę"
 */
export default function CategoryPage({
  categoryId,
  customPlants = [],
  removedSet,
  onBack,
  onSelectCategory,
  onOpenPlant,
  onAddPlant,
}) {
  const stripRef = useRef(null);
  const cat = CATEGORY_BY_ID[categoryId];

  const builtinForCategory = useMemo(
    () => PLANTS.filter((p) => p.categoryId === categoryId && !(removedSet && removedSet.has(p.key))),
    [categoryId, removedSet],
  );
  const customForCategory = useMemo(
    () => customPlants.filter((p) => p.categoryId === categoryId),
    [customPlants, categoryId],
  );
  const isEmpty = builtinForCategory.length === 0 && customForCategory.length === 0;

  // Auto-scroll active chip into view.
  useEffect(() => {
    const el = stripRef.current?.querySelector(`[data-cat="${categoryId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [categoryId]);

  return (
    <div>
      {/* Powrót + strip kategorii */}
      <section className="pb-3">
        <div className="px-6 mb-2">
          <button
            type="button"
            onClick={onBack}
            className="text-[12px] tracking-wide cursor-pointer px-3 py-1.5 rounded-full"
            style={{
              background: 'var(--surface-card-soft)',
              border: '0.5px solid var(--border-medium)',
              color: 'var(--text-secondary)',
              backdropFilter: 'blur(6px)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ← Wszystkie kategorie
          </button>
        </div>
        <div
          ref={stripRef}
          className="flex gap-2 px-6 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {PLANT_CATEGORIES.map((c) => {
            const active = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                data-cat={c.id}
                onClick={() => onSelectCategory?.(c.id)}
                className="shrink-0 px-3 py-2 rounded-full text-[12px] tracking-wide cursor-pointer flex items-center gap-1.5"
                style={{
                  border: active ? `1px solid ${GOLD}` : '0.5px solid var(--border-soft)',
                  background: active ? 'linear-gradient(135deg, rgba(201,169,110,0.22), rgba(123,201,123,0.12))' : 'var(--surface-card-soft)',
                  color: active ? GOLD : 'var(--text-muted)',
                  fontWeight: active ? 500 : 400,
                  backdropFilter: 'blur(6px)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{c.emoji}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Lista roślin kategorii */}
      <section className="px-6 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif italic" style={{ fontSize: '20px', color: GOLD }}>
            {cat?.emoji} {cat?.name || 'Kategoria'}
          </h2>
          <button
            type="button"
            onClick={onAddPlant}
            className="text-[11px] tracking-wide cursor-pointer px-3 py-1.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #C9A96E, #b89556)',
              color: '#1A1208',
              border: 'none',
              fontWeight: 500,
            }}
          >
            + Dodaj
          </button>
        </div>

        {isEmpty && (
          <div
            className="rounded-2xl py-8 px-4 text-center"
            style={{ background: 'var(--surface-faint)', border: '0.5px dashed var(--border-medium)' }}
          >
            <p className="font-serif italic" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Brak roślin w tej kategorii.
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-faint)' }}>
              Kliknij <strong style={{ color: GOLD }}>+ Dodaj</strong> żeby dodać pierwszą.
            </p>
          </div>
        )}

        {!isEmpty && (
          <div className="flex flex-col gap-2">
            {builtinForCategory.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => onOpenPlant?.(p.key, p.name)}
                className="rounded-xl px-4 py-3 flex items-center justify-between gap-2 cursor-pointer text-left"
                style={{
                  background: 'var(--surface-tint)',
                  border: '0.5px solid var(--border-soft)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span className="font-serif italic" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                  {p.name}
                </span>
                <span style={{ color: 'var(--gold-label)', fontSize: 14 }}>›</span>
              </button>
            ))}
            {customForCategory.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenPlant?.(p.id, p.variety ? `${p.name} · ${p.variety}` : p.name)}
                className="rounded-xl px-4 py-3 flex items-center justify-between gap-2 cursor-pointer text-left"
                style={{
                  background: 'linear-gradient(135deg, rgba(123,201,123,0.10), rgba(201,169,110,0.06))',
                  border: '0.5px solid rgba(76, 175, 80, 0.30)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-serif italic" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                    {p.name}
                    {p.variety && <span style={{ color: 'var(--gold-label-strong)', marginLeft: 6, fontSize: 13 }}>· {p.variety}</span>}
                  </p>
                  {p.location && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      📍 {p.location}
                    </p>
                  )}
                </div>
                <span style={{ color: 'var(--gold-label)', fontSize: 14 }}>›</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
