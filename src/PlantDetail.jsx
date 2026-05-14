import { useState, useEffect, useRef, useMemo } from 'react';
import {
  loadPhotos, addPhoto, deletePhoto, updatePhotoCaption, PHOTO_LIMIT,
  compressImage,
} from './lib/plantStorage.js';
import { CATEGORY_BY_ID, PLANT_CATEGORIES } from './data/plantCategories.js';
import { SPECIES_BY_ID } from './data/plantSpecies.js';
import { PLANTS } from './data/plants.js';
import {
  savePlant, deletePlant,
  ensureSeason, updateSeasonNotes,
  getSeasonEntries, addSeasonEntry, updateSeasonEntry, deleteSeasonEntry,
  getPlantPhotos, addPlantPhoto, updatePlantPhoto, deletePlantPhoto,
} from './lib/db.js';

const ENTRY_TYPES = [
  { id: 'note',        icon: '📝', label: 'Notatka' },
  { id: 'spray',       icon: '💊', label: 'Oprysk' },
  { id: 'fertilizer',  icon: '🌿', label: 'Nawóz' },
  { id: 'observation', icon: '👁️', label: 'Obserwacja' },
];
const ENTRY_BY_ID = Object.fromEntries(ENTRY_TYPES.map((t) => [t.id, t]));
const POSITION_OPTIONS = ['Słoneczne', 'Półcień', 'Cień'];

function formatPLN(value) {
  if (value == null || Number.isNaN(value)) return '';
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 }).format(value);
}

function hasManualSpec(spec) {
  return Boolean(spec.height_cm || spec.position || spec.soil || spec.watering || spec.frost_hardiness || spec.flowering || spec.description);
}

export default function PlantDetail({
  plantId,
  plantName,
  isVariety = false,
  parentId = null,
  parentName = null,
  speciesId = null,
  isCustom = false,
  customPlant = null,
  onClose,
  onUpdateName,
  onUpdatePurchase,
  onOpenFlora,
}) {
  const species = speciesId ? SPECIES_BY_ID[speciesId] : null;
  const categoryId = customPlant?.categoryId || customPlant?.category
    || PLANTS.find((p) => p.key === plantId)?.categoryId
    || (species?.categoryId);
  const category = categoryId ? CATEGORY_BY_ID[categoryId] : null;

  // ── Section A: Tożsamość ────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(plantName);
  const canEditName = isCustom && typeof onUpdateName === 'function';

  // ── Section B: Specyfikacja (v6 fields) ─────────────────────────────────────
  // Initial values: from customPlant if loaded, else from species guide.
  const initialSpec = () => ({
    height_cm: customPlant?.height_cm || species?.guide?.height || '',
    position: customPlant?.position || '',
    soil: customPlant?.soil || species?.guide?.soil || '',
    watering: customPlant?.watering || species?.guide?.watering || '',
    frost_hardiness: customPlant?.frost_hardiness || species?.guide?.frostHardiness || '',
    flowering: customPlant?.flowering || species?.guide?.flowering || '',
    description: customPlant?.description || species?.guide?.description || '',
  });
  const [spec, setSpec] = useState(initialSpec);
  const [specDirty, setSpecDirty] = useState(false);
  useEffect(() => { setSpec(initialSpec()); setSpecDirty(false); /* eslint-disable-next-line */ }, [plantId]);

  const handleSpecChange = (field, value) => {
    setSpec((s) => ({ ...s, [field]: value }));
    setSpecDirty(true);
  };
  const saveSpec = async () => {
    if (!isCustom) {
      // Promote built-in plant to a stored garden_plants row using its key as id.
      await savePlant({
        id: plantId,
        name: plantName,
        category: categoryId || null,
        is_custom: false,
        is_variety: isVariety,
        parent_plant_id: parentId,
        species_id: speciesId,
        ...spec,
      });
    } else {
      await savePlant({
        id: plantId,
        name: plantName,
        category: categoryId,
        is_custom: true,
        is_variety: isVariety,
        parent_plant_id: parentId,
        species_id: speciesId,
        variety_name: customPlant?.variety,
        location: customPlant?.location,
        purchase_date: customPlant?.purchaseDate,
        purchase_price: customPlant?.purchasePrice,
        ...spec,
      });
    }
    setSpecDirty(false);
  };

  // ── Section C: Zakup ────────────────────────────────────────────────────────
  const canEditPurchase = isCustom && !isVariety && typeof onUpdatePurchase === 'function';
  const [editingPurchase, setEditingPurchase] = useState(false);
  const [purchaseDateDraft, setPurchaseDateDraft] = useState(customPlant?.purchaseDate || '');
  const [purchasePriceDraft, setPurchasePriceDraft] = useState(
    customPlant?.purchasePrice != null ? String(customPlant.purchasePrice) : '',
  );
  const [purchaseShopDraft, setPurchaseShopDraft] = useState(customPlant?.purchase_shop || customPlant?.purchaseShop || '');
  useEffect(() => {
    setPurchaseDateDraft(customPlant?.purchaseDate || '');
    setPurchasePriceDraft(customPlant?.purchasePrice != null ? String(customPlant.purchasePrice) : '');
    setPurchaseShopDraft(customPlant?.purchase_shop || customPlant?.purchaseShop || '');
  }, [customPlant?.purchaseDate, customPlant?.purchasePrice, customPlant?.purchase_shop, customPlant?.purchaseShop]);

  const savePurchase = async () => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(purchaseDateDraft) ? purchaseDateDraft : null;
    const price = purchasePriceDraft.trim() ? Number(purchasePriceDraft.replace(',', '.')) : null;
    const shop = purchaseShopDraft.trim() || null;
    if (canEditPurchase) {
      onUpdatePurchase?.(plantId, {
        purchaseDate: date,
        purchasePrice: Number.isFinite(price) && price != null ? price : null,
        purchaseShop: shop,
      });
    }
    await savePlant({
      id: plantId,
      name: plantName,
      category: categoryId,
      is_custom: isCustom,
      is_variety: isVariety,
      parent_plant_id: parentId,
      purchase_date: date,
      purchase_price: Number.isFinite(price) && price != null ? price : null,
      purchase_shop: shop,
      ...spec,
    });
    setEditingPurchase(false);
  };

  // ── Section D: Sezony ───────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const [yearTabs, setYearTabs] = useState(() => {
    const years = new Set([currentYear, currentYear - 1, currentYear + 1]);
    return Array.from(years).sort((a, b) => b - a);
  });
  const [activeYear, setActiveYear] = useState(currentYear);
  const [activeSeason, setActiveSeason] = useState(null);
  const [seasonNotes, setSeasonNotes] = useState('');
  const [seasonEntries, setSeasonEntries] = useState([]);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [entryDraft, setEntryDraft] = useState({ text: '', type: 'note' });
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null); // { id, text, type, date }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSeasonLoading(true);
      try {
        const season = await ensureSeason(plantId, activeYear);
        if (cancelled) return;
        setActiveSeason(season);
        setSeasonNotes(season?.notes || '');
        const entries = await getSeasonEntries(season.id);
        if (!cancelled) setSeasonEntries(entries || []);
      } finally {
        if (!cancelled) setSeasonLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [plantId, activeYear]);

  const handleSaveSeasonNotes = async () => {
    if (!activeSeason) return;
    await updateSeasonNotes(activeSeason.id, seasonNotes);
  };

  const handleAddEntry = async () => {
    if (!activeSeason || !entryDraft.text.trim()) return;
    await addSeasonEntry(activeSeason.id, { text: entryDraft.text.trim(), type: entryDraft.type });
    const entries = await getSeasonEntries(activeSeason.id);
    setSeasonEntries(entries);
    setEntryDraft({ text: '', type: 'note' });
    setShowEntryForm(false);
  };
  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    await updateSeasonEntry(editingEntry.id, {
      text: editingEntry.text,
      type: editingEntry.type,
      date: editingEntry.date,
    });
    const entries = await getSeasonEntries(activeSeason.id);
    setSeasonEntries(entries);
    setEditingEntry(null);
  };
  const handleDeleteEntry = async (id) => {
    if (!confirm('Usunąć wpis?')) return;
    await deleteSeasonEntry(id);
    setSeasonEntries((s) => s.filter((e) => e.id !== id));
  };

  const addYearTab = () => {
    const years = yearTabs.slice();
    const next = (years[0] || currentYear) + 1;
    if (!years.includes(next)) years.unshift(next);
    setYearTabs(years.sort((a, b) => b - a));
    setActiveYear(next);
  };

  // ── Section E: Photos ───────────────────────────────────────────────────────
  // v6 cloud + legacy localStorage. Cloud first if migrated.
  const [photos, setPhotos] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [photoError, setPhotoError] = useState(null);
  const [adding, setAdding] = useState(false);
  const photoInputRef = useRef(null);
  const [fullscreenIdx, setFullscreenIdx] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPhotoLoading(true);
      try {
        const cloud = await getPlantPhotos(plantId);
        if (cancelled) return;
        if (cloud && cloud.length > 0) {
          setPhotos(cloud.map((p) => ({
            id: p.id,
            dataUrl: p.photo_data,
            caption: p.description,
            date: (p.taken_at || '').slice(0, 10),
            _cloud: true,
          })));
        } else {
          // Legacy fallback
          const legacy = loadPhotos(plantId);
          setPhotos(legacy);
        }
      } finally {
        if (!cancelled) setPhotoLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [plantId]);

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setAdding(true); setPhotoError(null);
    try {
      const dataUrl = await compressImage(file, 1024, 0.72);
      const saved = await addPlantPhoto(plantId, { dataUrl, type: 'problem' });
      setPhotos((cur) => [{
        id: saved.id, dataUrl: saved.photo_data || dataUrl, caption: saved.description || '',
        date: (saved.taken_at || new Date().toISOString()).slice(0, 10), _cloud: true,
      }, ...cur]);
      // FLORA prompt
      if (typeof onOpenFlora === 'function') {
        setTimeout(() => onOpenFlora(`Widzę nowe zdjęcie problemu — ocenić co się dzieje z ${plantName}? Wyślij zdjęcie do mnie używając aparatu w panelu.`), 400);
      }
    } catch (e) {
      setPhotoError(e?.message || 'Nie udało się zapisać zdjęcia.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePhoto = async (id) => {
    if (!confirm('Usunąć zdjęcie?')) return;
    if (photos.find((p) => p.id === id)?._cloud) {
      await deletePlantPhoto(id);
    } else {
      // legacy
      deletePhoto(plantId, id);
    }
    setPhotos((cur) => cur.filter((p) => p.id !== id));
    setFullscreenIdx(null);
  };

  // ── Sekcja FLORA banner ────────────────────────────────────────────────────
  const showFloraBanner = hasManualSpec(spec);

  // ── Quick actions (F) ──────────────────────────────────────────────────────
  const quickAction = (type) => {
    setEntryDraft({ text: '', type });
    setShowEntryForm(true);
    // Scroll to entry form
    setTimeout(() => {
      document.getElementById('plant-detail-entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const fullscreenPhoto = fullscreenIdx != null ? photos[fullscreenIdx] : null;

  return (
    <div
      role="dialog"
      aria-label={`Szczegóły rośliny: ${plantName}`}
      className="fixed inset-0 overflow-y-auto"
      style={{ zIndex: 1000, background: 'var(--surface-modal)', animation: 'screenEnter 0.2s ease' }}
    >
      <div className="max-w-lg mx-auto pb-24" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <header
          className="sticky top-0 flex items-center justify-between px-4 py-3"
          style={{ background: 'var(--surface-modal)', borderBottom: '1px solid var(--border-soft)', zIndex: 10 }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Wróć"
            className="cursor-pointer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, padding: '7px 14px', borderRadius: 999,
              background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)',
              color: 'var(--text-primary)', fontWeight: 500,
            }}
          >
            ← Wróć
          </button>
          <p className="font-serif italic" style={{ fontSize: 18, color: 'var(--gold)', flex: 1, textAlign: 'center', minWidth: 0 }}>
            {category?.emoji} {plantName}
          </p>
          <span style={{ width: 40 }} />
        </header>

        {/* Section A — Tożsamość */}
        <section className="px-5 pt-5 pb-3">
          <p className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: 'var(--gold-label)' }}>Tożsamość</p>
          <div className="mt-2 rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)' }}>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg"
                  style={{ fontSize: 16, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { onUpdateName?.(plantId, nameDraft.trim(), isVariety); setEditingName(false); }}
                  style={{ padding: '8px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208', fontWeight: 600, fontSize: 13, border: 'none' }}
                >Zapisz</button>
                <button type="button" onClick={() => setEditingName(false)} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', border: '0.5px solid var(--border-medium)', fontSize: 13 }}>×</button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{plantName}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    {category ? `${category.name}` : 'Brak kategorii'}
                    {parentName && ` · odmiana ${parentName}`}
                    {species && ` · ${species.botanicalName || ''}`}
                  </p>
                </div>
                {canEditName && (
                  <button type="button" onClick={() => setEditingName(true)} style={{ padding: '6px 10px', borderRadius: 8, background: 'transparent', color: 'var(--gold)', border: '0.5px solid var(--border-medium)', fontSize: 13 }}>
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {showFloraBanner && (
          <section className="px-5 pb-3">
            <button
              type="button"
              onClick={() => onOpenFlora?.(`Powiedz mi więcej o tej roślinie: ${plantName}.\nMam już swoje notatki o wysokości, podlewaniu, glebie itd. — uzupełnij wiedzą botaniczną i podpowiedz co przeoczyłem.`)}
              className="w-full text-left cursor-pointer rounded-2xl px-4 py-3"
              style={{ background: 'linear-gradient(135deg, rgba(123,201,123,0.18), rgba(201,169,110,0.10))', border: '1px solid rgba(123,201,123,0.40)' }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)' }}>🌿 Mam więcej informacji o tej roślinie</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Zapytaj mnie — dopowiem botanikę i pielęgnację.</p>
            </button>
          </section>
        )}

        {/* Section B — Specyfikacja */}
        <section className="px-5 pt-3 pb-3">
          <p className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: 'var(--gold-label)' }}>Specyfikacja</p>
          <div className="mt-2 rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)' }}>
            <SpecField icon="📏" label="Wysokość" value={spec.height_cm} onChange={(v) => handleSpecChange('height_cm', v)} placeholder="np. 100-150 cm" />
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>☀️ Stanowisko</p>
              <div className="flex gap-2">
                {POSITION_OPTIONS.map((opt) => {
                  const active = spec.position === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSpecChange('position', active ? '' : opt)}
                      style={{
                        padding: '7px 14px', borderRadius: 999, fontSize: 13,
                        background: active ? 'rgba(201,169,110,0.20)' : 'var(--surface-faint)',
                        border: active ? '1px solid var(--gold)' : '0.5px solid var(--border-soft)',
                        color: active ? 'var(--gold)' : 'var(--text-secondary)',
                        fontWeight: active ? 600 : 400, cursor: 'pointer',
                      }}
                    >{opt}</button>
                  );
                })}
              </div>
            </div>
            <SpecField icon="🌱" label="Gleba" value={spec.soil} onChange={(v) => handleSpecChange('soil', v)} placeholder="np. próchnicza, lekko kwaśna" />
            <SpecField icon="💧" label="Podlewanie" value={spec.watering} onChange={(v) => handleSpecChange('watering', v)} placeholder="np. obficie w upały" />
            <SpecField icon="🌡️" label="Mrozoodporność" value={spec.frost_hardiness} onChange={(v) => handleSpecChange('frost_hardiness', v)} placeholder="np. do -25°C" />
            <SpecField icon="🌸" label="Kwitnienie" value={spec.flowering} onChange={(v) => handleSpecChange('flowering', v)} placeholder="np. maj-czerwiec" />
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>📝 Opis ogólny</p>
              <textarea
                value={spec.description}
                onChange={(e) => handleSpecChange('description', e.target.value)}
                rows={3}
                placeholder="Krótki opis, wymagania, ciekawostki..."
                className="w-full px-3 py-2 rounded-lg resize-none"
                style={{ fontSize: 14, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
              />
            </div>
            {specDirty && (
              <button
                type="button"
                onClick={saveSpec}
                style={{ padding: '10px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}
              >Zapisz specyfikację</button>
            )}
          </div>
        </section>

        {/* Section C — Zakup */}
        {(isCustom && !isVariety) && (
          <section className="px-5 pt-3 pb-3">
            <p className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: 'var(--gold-label)' }}>Zakup</p>
            <div className="mt-2 rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)' }}>
              {editingPurchase ? (
                <div className="flex flex-col gap-2.5">
                  <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Data zakupu
                    <input type="date" value={purchaseDateDraft} onChange={(e) => setPurchaseDateDraft(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg"
                      style={{ fontSize: 14, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }} />
                  </label>
                  <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Cena (PLN)
                    <input type="number" step="0.01" value={purchasePriceDraft} onChange={(e) => setPurchasePriceDraft(e.target.value)}
                      placeholder="np. 49.90"
                      className="mt-1 w-full px-3 py-2 rounded-lg"
                      style={{ fontSize: 14, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }} />
                  </label>
                  <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Sklep
                    <input type="text" value={purchaseShopDraft} onChange={(e) => setPurchaseShopDraft(e.target.value)}
                      placeholder="np. Castorama, ogrodnik za rogiem..."
                      className="mt-1 w-full px-3 py-2 rounded-lg"
                      style={{ fontSize: 14, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }} />
                  </label>
                  <div className="flex gap-2 mt-1">
                    <button type="button" onClick={savePurchase}
                      style={{ padding: '8px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>Zapisz</button>
                    <button type="button" onClick={() => setEditingPurchase(false)}
                      style={{ padding: '8px 14px', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', border: '0.5px solid var(--border-medium)', fontSize: 13, cursor: 'pointer' }}>Anuluj</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                    {customPlant?.purchaseDate && <p>📅 {customPlant.purchaseDate}</p>}
                    {customPlant?.purchasePrice != null && <p>💵 {formatPLN(customPlant.purchasePrice)}</p>}
                    {(customPlant?.purchase_shop || customPlant?.purchaseShop) && <p>🏪 {customPlant.purchase_shop || customPlant.purchaseShop}</p>}
                    {!customPlant?.purchaseDate && customPlant?.purchasePrice == null && !customPlant?.purchase_shop && !customPlant?.purchaseShop && (
                      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Brak danych zakupu</p>
                    )}
                  </div>
                  <button type="button" onClick={() => setEditingPurchase(true)}
                    style={{ padding: '6px 10px', borderRadius: 8, background: 'transparent', color: 'var(--gold)', border: '0.5px solid var(--border-medium)', fontSize: 13, cursor: 'pointer' }}>✏️</button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section F — Quick actions */}
        <section className="px-5 pt-3 pb-3">
          <p className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: 'var(--gold-label)' }}>Szybkie akcje</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <QuickActionBtn icon="💊" label="Oprysk" onClick={() => quickAction('spray')} />
            <QuickActionBtn icon="🌿" label="Nawóz" onClick={() => quickAction('fertilizer')} />
            <QuickActionBtn icon="📝" label="Notatka" onClick={() => quickAction('note')} />
          </div>
        </section>

        {/* Section D — Sezony */}
        <section className="px-5 pt-3 pb-3">
          <p className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: 'var(--gold-label)' }}>Historia sezonów</p>
          <div className="mt-2 rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)' }}>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
              {yearTabs.map((y) => {
                const active = y === activeYear;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setActiveYear(y)}
                    style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 13,
                      background: active ? 'linear-gradient(135deg, rgba(201,169,110,0.30), rgba(123,201,123,0.10))' : 'var(--surface-faint)',
                      color: active ? 'var(--gold)' : 'var(--text-muted)',
                      border: active ? '1px solid var(--gold)' : '0.5px solid var(--border-soft)',
                      fontWeight: active ? 600 : 400, fontVariantNumeric: 'tabular-nums', cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    {y}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={addYearTab}
                style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, background: 'transparent', color: 'var(--gold)', border: '0.5px dashed var(--border-medium)', cursor: 'pointer' }}
              >+</button>
            </div>
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>Notatka sezonu {activeYear}</p>
              <textarea
                value={seasonNotes}
                onChange={(e) => setSeasonNotes(e.target.value)}
                onBlur={handleSaveSeasonNotes}
                rows={2}
                placeholder="Jak poszedł ten sezon? Co się sprawdziło?"
                className="w-full px-3 py-2 rounded-lg resize-none"
                style={{ fontSize: 14, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
              />
            </div>

            {showEntryForm && (
              <div id="plant-detail-entry-form" className="mt-3 rounded-xl p-3" style={{ background: 'var(--surface-tint)', border: '0.5px solid var(--border-medium)' }}>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                  {ENTRY_TYPES.map((t) => {
                    const active = entryDraft.type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEntryDraft((d) => ({ ...d, type: t.id }))}
                        style={{
                          padding: '6px 10px', borderRadius: 8, fontSize: 12,
                          background: active ? 'rgba(201,169,110,0.18)' : 'transparent',
                          border: active ? '1px solid var(--gold)' : '0.5px solid var(--border-soft)',
                          color: active ? 'var(--gold)' : 'var(--text-secondary)',
                          fontWeight: active ? 600 : 400, cursor: 'pointer',
                        }}
                      >{t.icon} {t.label}</button>
                    );
                  })}
                </div>
                <textarea
                  value={entryDraft.text}
                  onChange={(e) => setEntryDraft((d) => ({ ...d, text: e.target.value }))}
                  rows={2}
                  placeholder="Opis wpisu..."
                  className="w-full px-3 py-2 rounded-lg resize-none"
                  style={{ fontSize: 14, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
                />
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={handleAddEntry} disabled={!entryDraft.text.trim()}
                    style={{ padding: '7px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', opacity: entryDraft.text.trim() ? 1 : 0.5 }}>
                    Zapisz
                  </button>
                  <button type="button" onClick={() => { setShowEntryForm(false); setEntryDraft({ text: '', type: 'note' }); }}
                    style={{ padding: '7px 14px', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', border: '0.5px solid var(--border-medium)', fontSize: 13, cursor: 'pointer' }}>
                    Anuluj
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3">
              {seasonLoading && <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Ładuję wpisy...</p>}
              {!seasonLoading && seasonEntries.length === 0 && !showEntryForm && (
                <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '12px 0' }}>Brak wpisów w {activeYear}.</p>
              )}
              <div className="flex flex-col gap-2">
                {seasonEntries.map((entry) => {
                  const tdef = ENTRY_BY_ID[entry.entry_type] || ENTRY_BY_ID.note;
                  const isEditing = editingEntry?.id === entry.id;
                  return (
                    <div key={entry.id} className="rounded-xl p-3" style={{ background: 'var(--surface-faint)', border: '0.5px solid var(--border-soft)' }}>
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-1.5 flex-wrap">
                            {ENTRY_TYPES.map((t) => {
                              const active = editingEntry.type === t.id;
                              return (
                                <button key={t.id} type="button" onClick={() => setEditingEntry((e) => ({ ...e, type: t.id }))}
                                  style={{ padding: '5px 9px', borderRadius: 8, fontSize: 12, background: active ? 'rgba(201,169,110,0.18)' : 'transparent', border: active ? '1px solid var(--gold)' : '0.5px solid var(--border-soft)', color: active ? 'var(--gold)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                                  {t.icon} {t.label}
                                </button>
                              );
                            })}
                          </div>
                          <input type="date" value={editingEntry.date || ''} onChange={(e) => setEditingEntry((s) => ({ ...s, date: e.target.value }))}
                            className="px-3 py-2 rounded-lg"
                            style={{ fontSize: 13, background: 'var(--surface-card)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }} />
                          <textarea value={editingEntry.text} onChange={(e) => setEditingEntry((s) => ({ ...s, text: e.target.value }))} rows={2}
                            className="w-full px-3 py-2 rounded-lg resize-none"
                            style={{ fontSize: 14, background: 'var(--surface-card)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }} />
                          <div className="flex gap-2">
                            <button type="button" onClick={handleUpdateEntry}
                              style={{ padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}>Zapisz</button>
                            <button type="button" onClick={() => setEditingEntry(null)}
                              style={{ padding: '6px 12px', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', border: '0.5px solid var(--border-medium)', fontSize: 12, cursor: 'pointer' }}>Anuluj</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span style={{ fontSize: 12, color: 'var(--gold-label)', fontVariantNumeric: 'tabular-nums' }}>{(entry.entry_date || '').slice(0, 10)}</span>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(201,169,110,0.15)', color: 'var(--gold)', border: '0.5px solid var(--border-soft)' }}>
                                {tdef.icon} {tdef.label}
                              </span>
                            </div>
                            <p style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{entry.entry_text}</p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button type="button" onClick={() => setEditingEntry({ id: entry.id, text: entry.entry_text, type: entry.entry_type, date: entry.entry_date })}
                              style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', color: 'var(--gold)', border: '0.5px solid var(--border-soft)', fontSize: 12, cursor: 'pointer' }}>✏️</button>
                            <button type="button" onClick={() => handleDeleteEntry(entry.id)}
                              style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', color: 'var(--text-faint)', border: '0.5px solid var(--border-soft)', fontSize: 12, cursor: 'pointer' }}>🗑️</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {!showEntryForm && (
                <button
                  type="button"
                  onClick={() => setShowEntryForm(true)}
                  className="w-full mt-3 cursor-pointer"
                  style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'transparent',
                    border: '1px dashed var(--border-strong)',
                    color: 'var(--gold)', fontSize: 14, fontWeight: 500,
                  }}
                >+ Dodaj wpis w sezonie {activeYear}</button>
              )}
            </div>
          </div>
        </section>

        {/* Section E — Photos */}
        <section className="px-5 pt-3 pb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: 'var(--gold-label)' }}>Zdjęcia problemów</p>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={adding || photos.length >= PHOTO_LIMIT}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12,
                background: 'transparent', color: 'var(--gold)',
                border: '0.5px solid var(--gold)',
                opacity: photos.length >= PHOTO_LIMIT ? 0.4 : 1,
                cursor: photos.length >= PHOTO_LIMIT ? 'default' : 'pointer',
              }}
            >+ Dodaj</button>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => { handlePhotoUpload(e.target.files?.[0]); e.target.value = ''; }}
            style={{ display: 'none' }}
          />
          {photoError && <p style={{ fontSize: 13, color: '#E54B4B', marginBottom: 8 }}>{photoError}</p>}
          {photoLoading && <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>Ładuję zdjęcia...</p>}
          {!photoLoading && photos.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', padding: '14px 0', background: 'var(--surface-card)', borderRadius: 12, border: '0.5px dashed var(--border-medium)' }}>
              Brak zdjęć — dodaj fotografie chorób/uszkodzeń aby FLORA mogła pomóc.
            </p>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFullscreenIdx(idx)}
                  className="relative rounded-xl overflow-hidden cursor-pointer"
                  style={{ aspectRatio: '1', border: '0.5px solid var(--border-soft)' }}
                >
                  <img src={p.dataUrl} alt={p.caption || `Zdjęcie ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Fullscreen photo viewer */}
      {fullscreenPhoto && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center"
          style={{ zIndex: 1100, background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setFullscreenIdx(null)}
        >
          <img src={fullscreenPhoto.dataUrl} alt={fullscreenPhoto.caption || ''}
            style={{ maxWidth: '95vw', maxHeight: '75vh', borderRadius: 8 }} onClick={(e) => e.stopPropagation()} />
          {fullscreenPhoto.caption && (
            <p style={{ marginTop: 16, color: '#F0E8D8', fontSize: 14, textAlign: 'center', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
              {fullscreenPhoto.caption}
            </p>
          )}
          <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => handleDeletePhoto(fullscreenPhoto.id)}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(229,75,75,0.20)', color: '#E54B4B', border: '1px solid rgba(229,75,75,0.55)', fontSize: 13, cursor: 'pointer' }}>🗑️ Usuń</button>
            <button type="button" onClick={() => setFullscreenIdx(null)}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.10)', color: '#F0E8D8', border: '1px solid rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer' }}>Zamknij</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SpecField({ icon, label, value, onChange, placeholder }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{icon} {label}</p>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg"
        style={{ fontSize: 14, background: 'var(--surface-faint)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

function QuickActionBtn({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer flex flex-col items-center justify-center"
      style={{
        padding: '14px 6px', borderRadius: 14,
        background: 'var(--surface-card)', border: '0.5px solid var(--border-medium)',
        gap: 4,
      }}
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
    </button>
  );
}
