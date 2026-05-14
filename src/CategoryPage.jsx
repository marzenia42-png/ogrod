import { useRef, useEffect, useMemo, useState } from 'react';
import { PLANT_CATEGORIES, CATEGORY_BY_ID, REAL_CATEGORIES, normalizeCategoryId } from './data/plantCategories.js';
import { PLANTS } from './data/plants.js';

const GOLD = 'var(--gold)';

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return '155, 155, 155';
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

// Variety helper — reads legacy 'garden-varieties' key.
// In v6 varieties live in garden_plants with is_variety=true + parent_plant_id.
// We keep legacy reader as backup.
function readLegacyVarieties() {
  try { return JSON.parse(localStorage.getItem('garden-varieties') || '[]'); }
  catch { return []; }
}

/**
 * Podstrona kategorii (v6):
 *   - karty z akcentem koloru kategorii (10% bg + 35% border)
 *   - badge: liczba odmian na karcie
 *   - klik w roślinę z odmianami → widok odmian (subfolder)
 *   - klik w listę → PlantDetail przez onOpenPlant
 */
export default function CategoryPage({
  categoryId,
  customPlants = [],
  removedSet,
  onBack,
  onSelectCategory,
  onOpenPlant,
  onOpenVariety,
  onAddPlant,
}) {
  const stripRef = useRef(null);
  const cat = CATEGORY_BY_ID[categoryId];
  const accentRgb = hexToRgb(cat?.accent);

  // Subfolder state — id rośliny której odmiany aktualnie oglądamy (null = lista kategorii).
  const [openedParentId, setOpenedParentId] = useState(null);

  // Legacy varieties list — wszystkie odmiany w localStorage.
  const legacyVarieties = useMemo(readLegacyVarieties, [customPlants]);

  const builtinForCategory = useMemo(
    () => PLANTS.filter((p) => normalizeCategoryId(p.categoryId) === categoryId && !(removedSet && removedSet.has(p.key))),
    [categoryId, removedSet],
  );

  // Custom plants top-level: nie odmiana. Normalize legacy categoryId (herbs → vegetables).
  const customForCategory = useMemo(
    () => customPlants.filter((p) => {
      const isVariety = p.is_variety || p.parent_plant_id;
      if (isVariety) return false;
      return normalizeCategoryId(p.categoryId || p.category) === categoryId;
    }),
    [customPlants, categoryId],
  );

  // Mapowanie: rodzic → liczba odmian. Uwzględnia legacy garden-varieties + v6 plants z parent_plant_id.
  const varietiesByParent = useMemo(() => {
    const map = {};
    for (const v of legacyVarieties) {
      if (!v?.parent) continue;
      map[v.parent] = (map[v.parent] || 0) + 1;
    }
    for (const p of customPlants) {
      const parent = p.parent_plant_id;
      if (parent) map[parent] = (map[parent] || 0) + 1;
    }
    return map;
  }, [customPlants, legacyVarieties]);

  const varietiesFor = (parentId) => {
    const legacy = legacyVarieties.filter((v) => v.parent === parentId).map((v) => ({
      id: v.id,
      name: v.name,
      parent: v.parent,
      _legacy: true,
    }));
    const v6 = customPlants.filter((p) => p.parent_plant_id === parentId).map((p) => ({
      id: p.id,
      name: p.name,
      parent: parentId,
    }));
    return [...legacy, ...v6];
  };

  // Reset openedParentId on category change.
  useEffect(() => { setOpenedParentId(null); }, [categoryId]);

  useEffect(() => {
    const el = stripRef.current?.querySelector(`[data-cat="${categoryId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [categoryId]);

  const isEmpty = builtinForCategory.length === 0 && customForCategory.length === 0;

  const handleClickPlant = (id, name, isBuiltin) => {
    const count = varietiesByParent[id] || 0;
    if (count > 0) {
      setOpenedParentId(id);
      return;
    }
    onOpenPlant?.(id, name);
  };

  const openedParent = openedParentId
    ? (PLANTS.find((p) => p.key === openedParentId)
       || customPlants.find((p) => p.id === openedParentId))
    : null;
  const openedParentName = openedParent
    ? (openedParent.name || openedParent.id)
    : null;
  const openedParentVarieties = openedParentId ? varietiesFor(openedParentId) : [];

  // ── Subfolder view: odmiany rośliny ─────────────────────────────────────────
  if (openedParentId) {
    return (
      <div style={{ animation: 'screenEnter 0.2s ease' }}>
        <section className="pb-3 px-5">
          <button
            type="button"
            onClick={() => setOpenedParentId(null)}
            className="cursor-pointer"
            style={{
              fontSize: 13, padding: '6px 12px', borderRadius: 999,
              background: 'var(--surface-card-soft)', border: '0.5px solid var(--border-medium)',
              color: 'var(--text-secondary)',
            }}
          >
            ← {cat?.name || 'Kategoria'}
          </button>
        </section>

        <section className="px-5 pb-8">
          <h2 className="font-serif italic mb-3" style={{ fontSize: 22, color: GOLD }}>
            {openedParentName}
            <span style={{ marginLeft: 8, fontSize: 14, color: 'var(--text-muted)', fontStyle: 'normal' }}>
              · {openedParentVarieties.length} {openedParentVarieties.length === 1 ? 'odmiana' : openedParentVarieties.length < 5 ? 'odmiany' : 'odmian'}
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {openedParentVarieties.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  if (onOpenVariety) {
                    onOpenVariety({ id: v.id, parent: openedParentId, name: v.name });
                  } else {
                    onOpenPlant?.(v.id, v.name);
                  }
                }}
                className="cursor-pointer text-left"
                style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: `rgba(${accentRgb}, 0.10)`,
                  border: `1px solid rgba(${accentRgb}, 0.30)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Odmiana · {openedParentName}</p>
                </div>
                <span style={{ color: 'var(--gold-label)', fontSize: 16 }}>›</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ── Category view ───────────────────────────────────────────────────────────
  return (
    <div style={{ animation: 'screenEnter 0.2s ease' }}>
      <section className="pb-3">
        <div className="px-5 mb-2">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer"
            style={{
              fontSize: 13, padding: '6px 12px', borderRadius: 999,
              background: 'var(--surface-card-soft)', border: '0.5px solid var(--border-medium)',
              color: 'var(--text-secondary)',
            }}
          >
            ← Wszystkie kategorie
          </button>
        </div>
        <div
          ref={stripRef}
          className="flex gap-2 px-5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {REAL_CATEGORIES.map((c) => {
            const active = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                data-cat={c.id}
                onClick={() => onSelectCategory?.(c.id)}
                className="shrink-0 cursor-pointer"
                style={{
                  padding: '7px 13px', borderRadius: 999,
                  border: active ? `1px solid ${GOLD}` : '0.5px solid var(--border-soft)',
                  background: active ? 'linear-gradient(135deg, rgba(201,169,110,0.22), rgba(123,201,123,0.12))' : 'var(--surface-card-soft)',
                  color: active ? GOLD : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>{c.emoji}</span>
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif italic" style={{ fontSize: 22, color: GOLD }}>
            {cat?.emoji} {cat?.name || 'Kategoria'}
          </h2>
          <button
            type="button"
            onClick={onAddPlant}
            className="cursor-pointer"
            style={{
              fontSize: 13, padding: '7px 14px', borderRadius: 999,
              background: 'linear-gradient(135deg, #C9A96E, #b89556)',
              color: '#1A1208', border: 'none', fontWeight: 600,
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
            <p className="font-serif italic" style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              Brak roślin w tej kategorii.
            </p>
            <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-faint)' }}>
              Kliknij <strong style={{ color: GOLD }}>+ Dodaj</strong> żeby dodać pierwszą.
            </p>
          </div>
        )}

        {!isEmpty && (
          <div className="flex flex-col gap-2.5">
            {builtinForCategory.map((p) => {
              const vCount = varietiesByParent[p.key] || 0;
              return (
                <PlantCard
                  key={p.key}
                  accentRgb={accentRgb}
                  name={p.name}
                  varietyCount={vCount}
                  onClick={() => handleClickPlant(p.key, p.name, true)}
                />
              );
            })}
            {customForCategory.map((p) => {
              const vCount = varietiesByParent[p.id] || 0;
              return (
                <PlantCard
                  key={p.id}
                  accentRgb={accentRgb}
                  name={p.name}
                  variety={p.variety || p.variety_name}
                  location={p.location}
                  varietyCount={vCount}
                  onClick={() => handleClickPlant(p.id, p.variety ? `${p.name} · ${p.variety}` : p.name, false)}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function PlantCard({ accentRgb, accentHex, name, variety, location, lastActivity, varietyCount = 0, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer text-left"
      style={{
        padding: '16px',
        borderRadius: 12,
        background: `rgba(${accentRgb}, 0.15)`,
        borderLeft: `3px solid ${accentHex}`,
        borderTop: `0.5px solid rgba(${accentRgb}, 0.20)`,
        borderRight: `0.5px solid rgba(${accentRgb}, 0.20)`,
        borderBottom: `0.5px solid rgba(${accentRgb}, 0.20)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25 }}>
          {name}
        </p>
        {variety && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            {variety}
          </p>
        )}
        {location && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>📍 {location}</p>
        )}
        {lastActivity && (
          <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            🕐 {lastActivity}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {varietyCount > 0 && (
          <span
            style={{
              minWidth: 22, height: 22, padding: '0 8px',
              borderRadius: 11, fontSize: 12, fontWeight: 700,
              background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208',
              display: 'grid', placeItems: 'center',
            }}
            title={`${varietyCount} odmian`}
          >
            {varietyCount}
          </span>
        )}
        <span style={{ color: 'var(--gold-label)', fontSize: 20, lineHeight: 1 }}>›</span>
      </div>
    </button>
  );
}
