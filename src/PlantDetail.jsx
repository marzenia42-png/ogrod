import { useState, useEffect, useRef } from 'react';
import {
  loadPhotos, addPhoto, deletePhoto, updatePhotoCaption, PHOTO_LIMIT,
  loadPlantNotes, addPlantNote, deletePlantNote,
  loadEvents, addEvent, deleteEvent, EVENT_TYPES,
  loadVarietiesFor, loadVarieties, addVariety, deleteVariety,
  compressImage,
} from './lib/plantStorage.js';
import { MONTHS, ACTIONS, CATEGORIES, CATEGORY_BY_KEY, PLANTS } from './data/plants.js';
import { SPECIES_BY_ID } from './data/plantSpecies.js';
import Autocomplete from './Autocomplete.jsx';

function formatPLN(value) {
  if (value == null || Number.isNaN(value)) return '';
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 }).format(value);
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
  onOpenVariety,
  onUpdateName,
  onUpdatePurchase,
}) {
  // Profil gatunku — pełne dane botaniczne gdy plantId / parent matches species.
  const species = speciesId ? SPECIES_BY_ID[speciesId] : null;
  const [openDiseaseId, setOpenDiseaseId] = useState(null);
  const [photos, setPhotos] = useState(() => loadPhotos(plantId));
  const [notes, setNotes] = useState(() => loadPlantNotes(plantId));
  const [events, setEvents] = useState(() => loadEvents(plantId));
  const [varieties, setVarieties] = useState(() =>
    isVariety ? [] : loadVarietiesFor(plantId),
  );
  const [noteDraft, setNoteDraft] = useState('');
  const [varietyDraft, setVarietyDraft] = useState('');
  const [eventDraft, setEventDraft] = useState({ type: 'podlano', note: '' });
  const [showEventForm, setShowEventForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [fullscreenIdx, setFullscreenIdx] = useState(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(plantName);
  // Edycja sekcji "Zakup" — inline drafts (data + cena).
  const [editingPurchase, setEditingPurchase] = useState(false);
  const [purchaseDateDraft, setPurchaseDateDraft] = useState(customPlant?.purchaseDate || '');
  const [purchasePriceDraft, setPurchasePriceDraft] = useState(
    customPlant?.purchasePrice != null ? String(customPlant.purchasePrice) : '',
  );
  const photoInputRef = useRef(null);
  const touchStartXRef = useRef(0);

  const canEditName = isCustom && typeof onUpdateName === 'function';
  const canEditPurchase = isCustom && !isVariety && typeof onUpdatePurchase === 'function';

  const startEditName = () => {
    setNameDraft(plantName);
    setEditingName(true);
  };

  const cancelEditName = () => {
    setNameDraft(plantName);
    setEditingName(false);
  };

  const saveEditName = () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === plantName) {
      cancelEditName();
      return;
    }
    onUpdateName?.(plantId, trimmed, isVariety);
    setEditingName(false);
  };

  const fullscreenPhoto = fullscreenIdx != null ? photos[fullscreenIdx] : null;

  const persistCaption = (idx, draft) => {
    const photo = photos[idx];
    if (!photo) return photos;
    if ((photo.caption || '') === draft.trim()) return photos;
    const next = updatePhotoCaption(plantId, photo.id, draft);
    setPhotos(next);
    return next;
  };

  const openFullscreen = (idx) => {
    setFullscreenIdx(idx);
    setCaptionDraft(photos[idx]?.caption || '');
  };

  const closeFullscreen = () => {
    if (fullscreenIdx != null) persistCaption(fullscreenIdx, captionDraft);
    setFullscreenIdx(null);
    setCaptionDraft('');
  };

  const goToPhoto = (nextIdx) => {
    if (fullscreenIdx == null || photos.length < 2) return;
    const saved = persistCaption(fullscreenIdx, captionDraft);
    const wrapped = ((nextIdx % saved.length) + saved.length) % saved.length;
    setFullscreenIdx(wrapped);
    setCaptionDraft(saved[wrapped]?.caption || '');
  };

  const onTouchStart = (e) => { touchStartXRef.current = e.touches[0]?.clientX ?? 0; };
  const onTouchEnd = (e) => {
    if (fullscreenIdx == null || photos.length < 2) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current;
    if (Math.abs(dx) < 50) return;
    goToPhoto(fullscreenIdx + (dx > 0 ? -1 : 1));
  };

  const handleDeleteCurrentPhoto = () => {
    if (!fullscreenPhoto) return;
    if (!confirm('Usunąć zdjęcie?')) return;
    const nextPhotos = deletePhoto(plantId, fullscreenPhoto.id);
    setPhotos(nextPhotos);
    if (nextPhotos.length === 0) {
      setFullscreenIdx(null);
      setCaptionDraft('');
    } else {
      const nextIdx = Math.min(fullscreenIdx, nextPhotos.length - 1);
      setFullscreenIdx(nextIdx);
      setCaptionDraft(nextPhotos[nextIdx]?.caption || '');
    }
  };

  // If the user opens a different plant, refresh local state.
  useEffect(() => {
    setPhotos(loadPhotos(plantId));
    setNotes(loadPlantNotes(plantId));
    setEvents(loadEvents(plantId));
    setVarieties(isVariety ? [] : loadVarietiesFor(plantId));
    setPhotoError(null);
    setEditingName(false);
    setEditingPurchase(false);
  }, [plantId, isVariety]);

  useEffect(() => { setNameDraft(plantName); }, [plantName]);

  useEffect(() => {
    setPurchaseDateDraft(customPlant?.purchaseDate || '');
    setPurchasePriceDraft(customPlant?.purchasePrice != null ? String(customPlant.purchasePrice) : '');
  }, [customPlant?.purchaseDate, customPlant?.purchasePrice]);

  const startEditPurchase = () => {
    setPurchaseDateDraft(customPlant?.purchaseDate || '');
    setPurchasePriceDraft(customPlant?.purchasePrice != null ? String(customPlant.purchasePrice) : '');
    setEditingPurchase(true);
  };

  const cancelEditPurchase = () => {
    setPurchaseDateDraft(customPlant?.purchaseDate || '');
    setPurchasePriceDraft(customPlant?.purchasePrice != null ? String(customPlant.purchasePrice) : '');
    setEditingPurchase(false);
  };

  const savePurchase = () => {
    if (!onUpdatePurchase) return;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(purchaseDateDraft) ? purchaseDateDraft : null;
    const price = purchasePriceDraft.trim()
      ? Number(purchasePriceDraft.replace(',', '.'))
      : null;
    onUpdatePurchase(plantId, {
      purchaseDate: date,
      purchasePrice: Number.isFinite(price) && price != null ? price : null,
    });
    setEditingPurchase(false);
  };

  const clearPurchase = () => {
    if (!onUpdatePurchase) return;
    onUpdatePurchase(plantId, { purchaseDate: null, purchasePrice: null });
    setPurchaseDateDraft('');
    setPurchasePriceDraft('');
    setEditingPurchase(false);
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setAdding(true);
    setPhotoError(null);
    try {
      const dataUrl = await compressImage(file, 1024, 0.72);
      const next = addPhoto(plantId, dataUrl);
      setPhotos(next);
    } catch (e) {
      setPhotoError(e?.message || 'Nie udało się zapisać zdjęcia.');
    } finally {
      setAdding(false);
    }
  };

  const handleAddEvent = () => {
    setEvents(addEvent(plantId, eventDraft.type, eventDraft.note));
    setEventDraft({ type: 'podlano', note: '' });
    setShowEventForm(false);
  };

  const handleAddNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    setNotes(addPlantNote(plantId, text));
    setNoteDraft('');
  };

  const handleAddVariety = () => {
    const name = varietyDraft.trim();
    if (!name) return;
    const updated = addVariety(plantId, name);
    setVarieties(updated.filter((v) => v.parent === plantId));
    setVarietyDraft('');
  };

  // For a variety, parent's monthly actions are read-only context.
  const parentForCalendar = isVariety ? parentId : plantId;
  const parentActions = ACTIONS.filter((a) => a.plant === parentForCalendar);
  const parentActionsByMonth = MONTHS.map((_, i) => {
    const m = i + 1;
    return { month: m, items: parentActions.filter((a) => a.month === m) };
  }).filter((g) => g.items.length > 0);

  const gold = '#C9A96E';

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full flex flex-col"
        style={{
          maxWidth: '480px',
          maxHeight: '90vh',
          backgroundColor: 'var(--surface-modal)',
          border: '1px solid var(--border-strong)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px',
        }}
      >
        <div
          className="flex items-center justify-between px-5 pt-5 pb-3 gap-2"
          style={{ borderBottom: '0.5px solid var(--border-soft)' }}
        >
          <div className="min-w-0 flex-1">
            {isVariety && parentName && (
              <p className="text-[10px] tracking-[2px] uppercase truncate" style={{ color: 'var(--gold-label)' }}>
                odmiana · {parentName}
              </p>
            )}
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditName();
                    if (e.key === 'Escape') cancelEditName();
                  }}
                  autoFocus
                  className="bg-transparent font-serif italic px-2 py-1 rounded outline-none flex-1 min-w-0"
                  style={{ fontSize: '20px', color: 'var(--gold)', border: `0.5px solid var(--gold)` }}
                />
                <button
                  type="button"
                  onClick={saveEditName}
                  aria-label="Zapisz nazwę"
                  className="cursor-pointer shrink-0"
                  style={{ background: 'rgba(76, 175, 80, 0.20)', border: '0.5px solid rgba(76, 175, 80, 0.5)', color: '#2e7d32', borderRadius: '50%', width: 28, height: 28, display: 'grid', placeItems: 'center', fontSize: 14 }}
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={cancelEditName}
                  aria-label="Anuluj edycję"
                  className="cursor-pointer shrink-0"
                  style={{ background: 'none', border: '0.5px solid var(--border-medium)', color: 'var(--text-muted)', borderRadius: '50%', width: 28, height: 28, display: 'grid', placeItems: 'center', fontSize: 14 }}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-serif italic truncate" style={{ fontSize: '22px', color: 'var(--gold)' }}>{plantName}</h3>
                {canEditName && (
                  <button
                    type="button"
                    onClick={startEditName}
                    aria-label="Edytuj nazwę"
                    className="cursor-pointer shrink-0"
                    style={{ background: 'none', border: 'none', color: 'var(--gold-label-strong)', padding: 2, fontSize: 14, lineHeight: 1 }}
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="shrink-0"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-6 flex-1">
          {/* Zakup — wyświetlanie + edycja inline (tylko dla custom plants) */}
          {canEditPurchase && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] tracking-[2px] uppercase" style={{ color: 'var(--gold-label)' }}>
                  🧾 Zakup
                </p>
                {!editingPurchase && (
                  <button
                    type="button"
                    onClick={startEditPurchase}
                    className="text-[11px] tracking-wide cursor-pointer px-3 py-1 rounded-full"
                    style={{ background: 'var(--surface-faint)', border: '0.5px solid var(--border-medium)', color: 'var(--gold)' }}
                  >
                    {customPlant?.purchaseDate || customPlant?.purchasePrice != null ? 'Edytuj' : '+ dodaj'}
                  </button>
                )}
              </div>
              {!editingPurchase ? (
                customPlant?.purchaseDate || customPlant?.purchasePrice != null ? (
                  <div
                    className="rounded-lg px-3 py-2 flex items-center gap-3"
                    style={{ background: 'var(--surface-tint)', border: '0.5px solid var(--border-soft)' }}
                  >
                    <div className="flex-1 min-w-0 flex flex-wrap gap-x-3 gap-y-1 items-baseline">
                      {customPlant?.purchaseDate && (
                        <span className="font-serif italic" style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                          {new Date(customPlant.purchaseDate).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      )}
                      {customPlant?.purchasePrice != null && (
                        <span className="font-serif tabular-nums" style={{ fontSize: '14px', color: 'var(--gold)', fontWeight: 500 }}>
                          {formatPLN(customPlant.purchasePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] font-serif italic" style={{ color: 'var(--text-faint)' }}>
                    Brak danych zakupu. Dodaj datę i cenę.
                  </p>
                )
              ) : (
                <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: 'var(--surface-tint)', border: '0.5px solid var(--border-soft)' }}>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>
                        Data zakupu
                      </label>
                      <input
                        type="date"
                        value={purchaseDateDraft}
                        onChange={(e) => setPurchaseDateDraft(e.target.value)}
                        className="w-full bg-transparent text-[13px] font-serif italic px-2 py-1.5 rounded outline-none"
                        style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div style={{ width: '110px' }}>
                      <label className="text-[10px] tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>
                        Cena (PLN)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={purchasePriceDraft}
                        onChange={(e) => setPurchasePriceDraft(e.target.value)}
                        placeholder="49.99"
                        className="w-full bg-transparent text-[13px] font-serif italic px-2 py-1.5 rounded outline-none"
                        style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={savePurchase}
                      className="flex-1 py-1.5 rounded-full text-[11px] cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #C9A96E, #b89556)', color: '#1A1208', border: 'none', fontWeight: 500 }}
                    >
                      Zapisz
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditPurchase}
                      className="px-3 py-1.5 rounded-full text-[11px] cursor-pointer"
                      style={{ background: 'none', border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}
                    >
                      Anuluj
                    </button>
                    {(customPlant?.purchaseDate || customPlant?.purchasePrice != null) && (
                      <button
                        type="button"
                        onClick={clearPurchase}
                        className="px-3 py-1.5 rounded-full text-[11px] cursor-pointer"
                        style={{ background: 'none', border: '0.5px solid rgba(232,100,100,0.4)', color: '#c62828' }}
                      >
                        Wyczyść
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Gallery — zdjęcia chorób / problemów / postępu */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] tracking-[2px] uppercase" style={{ color: 'var(--gold-label)' }}>
                📷 Zdjęcia <span style={{ color: 'var(--text-faint)' }}>· {photos.length}/{PHOTO_LIMIT}</span>
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => { handlePhotoUpload(e.target.files?.[0]); e.target.value = ''; }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={adding || photos.length >= PHOTO_LIMIT}
                className="text-[11px] tracking-wide cursor-pointer px-3 py-1 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                  color: '#1A1208',
                  border: 'none',
                  opacity: adding || photos.length >= PHOTO_LIMIT ? 0.4 : 1,
                }}
              >
                {adding ? 'Zapisuję…' : '+ zdjęcie'}
              </button>
            </div>
            <p className="text-[11px] font-serif italic mb-3" style={{ color: 'var(--text-faint)' }}>
              Dodawaj zdjęcia chorób, szkodników, problemów lub postępu — pomoże FLORZE w diagnozie.
            </p>
            {photoError && (
              <p className="text-[12px] mb-2" style={{ color: '#c62828' }}>{photoError}</p>
            )}
            {photos.length === 0 ? (
              <p className="text-[13px] font-serif italic" style={{ color: 'var(--text-faint)' }}>
                Brak zdjęć. Dodaj gdy zauważysz problem.
              </p>
            ) : (
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openFullscreen(idx)}
                    className="relative rounded-lg overflow-hidden cursor-pointer shrink-0"
                    style={{
                      width: '140px',
                      height: '140px',
                      border: '0.5px solid var(--border-soft)',
                      background: 'var(--surface-faint)',
                      padding: 0,
                    }}
                  >
                    <img src={p.dataUrl} alt={p.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {p.caption && (
                      <span
                        className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] tracking-wide rounded"
                        style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(232,221,208,0.9)' }}
                        aria-label="Ma opis"
                      >
                        💬
                      </span>
                    )}
                    <span
                      className="absolute bottom-0 left-0 right-0 px-2 py-0.5 text-[10px] tracking-wide"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', color: 'var(--text-secondary)' }}
                    >
                      {p.date}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Profil gatunku — guide/pruning/fertilizing/diseases/companions z plantSpecies. */}
          {species && (
            <section>
              <p
                className="text-[11px] tracking-[2px] uppercase mb-3"
                style={{ color: 'var(--gold-label)' }}
              >
                🌱 Profil gatunku
              </p>

              {/* Pielęgnacja */}
              <div
                className="rounded-xl p-3 mb-2"
                style={{ background: 'rgba(201,169,110,0.06)', border: '0.5px solid var(--border-soft)' }}
              >
                <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gold-label-strong)' }}>
                  Pielęgnacja
                </p>
                <div className="flex flex-col gap-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  <p><span style={{ color: gold }}>☀️ Światło: </span>{species.guide.light}</p>
                  <p><span style={{ color: gold }}>💧 Podlewanie: </span>{species.guide.water}</p>
                  <p><span style={{ color: gold }}>🌍 Gleba: </span>{species.guide.soil}</p>
                  <p>
                    <span style={{ color: gold }}>❄️ Mróz: </span>
                    {species.guide.frostHardy ? 'mrozoodporna' : 'wrażliwa na mróz'}
                    {species.guide.winterProtection && (
                      <span style={{ color: 'var(--text-secondary)' }}> · {species.guide.winterProtection}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Sąsiedztwo */}
              {(species.guide.companions?.length || species.guide.avoid?.length) && (
                <div
                  className="rounded-xl p-3 mb-2"
                  style={{ background: 'rgba(76, 175, 80, 0.06)', border: '0.5px solid rgba(76, 175, 80, 0.25)' }}
                >
                  <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(134, 239, 172, 0.7)' }}>
                    Sąsiedztwo
                  </p>
                  {species.guide.companions?.length > 0 && (
                    <p className="text-[13px] mb-1" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: '#86efac' }}>✓ Dobrzy sąsiedzi: </span>
                      {species.guide.companions.join(', ')}
                    </p>
                  )}
                  {species.guide.avoid?.length > 0 && (
                    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: '#fca5a5' }}>✗ Unikaj obok: </span>
                      {species.guide.avoid.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Cięcie */}
              {species.pruning && (
                <div
                  className="rounded-xl p-3 mb-2"
                  style={{ background: 'rgba(129, 140, 248, 0.06)', border: '0.5px solid rgba(129, 140, 248, 0.25)' }}
                >
                  <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(199, 210, 254, 0.75)' }}>
                    ✂️ Cięcie
                  </p>
                  <div className="flex flex-col gap-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    {species.pruning.spring && (
                      <p><span style={{ color: '#c7d2fe' }}>Wiosna: </span>{species.pruning.spring}</p>
                    )}
                    {species.pruning.summer && (
                      <p><span style={{ color: '#c7d2fe' }}>Lato: </span>{species.pruning.summer}</p>
                    )}
                    {species.pruning.autumn && (
                      <p><span style={{ color: '#c7d2fe' }}>Jesień: </span>{species.pruning.autumn}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Nawożenie */}
              {species.fertilizing && (
                <div
                  className="rounded-xl p-3 mb-2"
                  style={{ background: 'rgba(132, 204, 22, 0.06)', border: '0.5px solid rgba(132, 204, 22, 0.25)' }}
                >
                  <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(190, 242, 100, 0.75)' }}>
                    🪴 Nawożenie
                  </p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {species.fertilizing}
                  </p>
                </div>
              )}

              {/* Choroby — collapsible cards */}
              {species.diseases?.length > 0 && (
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(239, 68, 68, 0.06)', border: '0.5px solid rgba(239, 68, 68, 0.25)' }}
                >
                  <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(252, 165, 165, 0.8)' }}>
                    🦠 Choroby i szkodniki
                  </p>
                  <div className="flex flex-col gap-2">
                    {species.diseases.map((d, idx) => {
                      const open = openDiseaseId === idx;
                      return (
                        <div
                          key={idx}
                          className="rounded-lg overflow-hidden"
                          style={{ background: 'var(--surface-deep)', border: '0.5px solid rgba(239, 68, 68, 0.2)' }}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenDiseaseId(open ? null : idx)}
                            className="w-full text-left px-3 py-2 flex items-center justify-between cursor-pointer"
                            style={{ background: 'none', border: 'none' }}
                          >
                            <span className="text-[13px] font-serif italic" style={{ color: '#fca5a5' }}>
                              {d.name}
                            </span>
                            <span style={{
                              color: 'rgba(252, 165, 165, 0.6)',
                              transform: open ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s',
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </span>
                          </button>
                          {open && (
                            <div
                              className="px-3 pb-3 pt-1 flex flex-col gap-2 text-[12.5px]"
                              style={{ color: 'var(--text-secondary)', borderTop: '0.5px solid rgba(239, 68, 68, 0.15)' }}
                            >
                              <p>
                                <span style={{ color: 'rgba(252, 165, 165, 0.65)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1.5px' }}>
                                  Objawy:{' '}
                                </span>
                                {d.symptoms}
                              </p>
                              <p>
                                <span style={{ color: 'rgba(252, 165, 165, 0.65)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1.5px' }}>
                                  Leczenie:{' '}
                                </span>
                                {d.treatment}
                              </p>
                              <p>
                                <span style={{ color: 'rgba(252, 165, 165, 0.65)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '1.5px' }}>
                                  Profilaktyka:{' '}
                                </span>
                                {d.prevention}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Historia wydarzeń — podlano, nawieziono, oprysknieto, etc. */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] tracking-[2px] uppercase" style={{ color: 'var(--gold-label)' }}>
                Historia
              </p>
              <button
                type="button"
                onClick={() => setShowEventForm((s) => !s)}
                className="text-[11px] tracking-wide cursor-pointer px-3 py-1 rounded-full"
                style={{ background: showEventForm ? 'var(--border-soft)' : 'linear-gradient(135deg, #4CAF50, #2e7d32)', color: showEventForm ? gold : '#0a0f0a', border: 'none' }}
              >
                {showEventForm ? 'Anuluj' : '+ wydarzenie'}
              </button>
            </div>

            {showEventForm && (
              <div
                className="mb-3 p-3 rounded-lg flex flex-col gap-2"
                style={{ background: 'rgba(76, 175, 80, 0.08)', border: '0.5px solid rgba(76, 175, 80, 0.3)' }}
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {EVENT_TYPES.map((t) => {
                    const active = eventDraft.type === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setEventDraft((d) => ({ ...d, type: t.key }))}
                        className="py-1.5 px-2 rounded-md text-[11px] cursor-pointer"
                        style={{
                          background: active ? 'rgba(76, 175, 80, 0.25)' : 'var(--surface-faint)',
                          border: active ? '0.5px solid #4CAF50' : '0.5px solid rgba(76, 175, 80, 0.2)',
                          color: active ? '#86efac' : 'var(--text-secondary)',
                          fontWeight: active ? 500 : 400,
                        }}
                      >
                        <span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={eventDraft.note}
                  onChange={(e) => setEventDraft({ ...eventDraft, note: e.target.value })}
                  placeholder="Krótka notatka (opcjonalnie)"
                  className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                  style={{ border: '0.5px solid rgba(76, 175, 80, 0.25)', color: 'var(--text-primary)' }}
                />
                <button
                  type="button"
                  onClick={handleAddEvent}
                  className="py-2 rounded-full text-[12px] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #4CAF50, #2e7d32)', color: '#0a0f0a', border: 'none', fontWeight: 500 }}
                >
                  Zapisz wydarzenie
                </button>
              </div>
            )}

            {events.length === 0 ? (
              <p className="text-[13px] font-serif italic" style={{ color: 'var(--text-faint)' }}>
                Brak wydarzeń. Pierwsze podlanie się liczy.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {events.slice(0, 5).map((ev) => {
                  const meta = EVENT_TYPES.find((t) => t.key === ev.type);
                  return (
                    <div
                      key={ev.id}
                      className="px-3 py-2 rounded-lg flex items-start gap-2"
                      style={{ background: 'var(--surface-elevated)', border: '0.5px solid rgba(76, 175, 80, 0.2)' }}
                    >
                      <span style={{ fontSize: '18px' }}>{meta?.icon || '📝'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px]" style={{ color: '#86efac', fontWeight: 500 }}>
                          {meta?.label || ev.type}
                          <span style={{ marginLeft: 8, color: 'var(--gold-label)', fontWeight: 400 }}>{ev.date}</span>
                        </p>
                        {ev.note && (
                          <p className="text-[12.5px] font-serif italic leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {ev.note}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEvents(deleteEvent(plantId, ev.id))}
                        className="cursor-pointer shrink-0"
                        style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: '16px', lineHeight: 1, padding: 2 }}
                        aria-label="Usuń"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {events.length > 5 && (
                  <p className="text-[11px] text-center" style={{ color: 'var(--text-very-faint)' }}>
                    + {events.length - 5} starszych
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'var(--gold-label)' }}>
              Notatki
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
                placeholder="Co zauważyłeś?"
                className="flex-1 bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!noteDraft.trim()}
                className="px-3 py-2 rounded-lg text-[12px] tracking-wide cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                  color: '#1A1208',
                  border: 'none',
                  opacity: noteDraft.trim() ? 1 : 0.4,
                }}
              >
                Dodaj
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-[13px] font-serif italic" style={{ color: 'var(--text-faint)' }}>
                Brak notatek dla tej rośliny.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="px-3 py-2 rounded-lg flex items-start gap-2"
                    style={{ background: 'var(--surface-elevated)', border: '0.5px solid var(--border-soft)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] tracking-wide" style={{ color: 'var(--gold-label)' }}>{n.date}</p>
                      <p className="mt-0.5 text-[13px] font-serif italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {n.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotes(deletePlantNote(plantId, n.id))}
                      className="cursor-pointer shrink-0"
                      style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: '16px', lineHeight: 1, padding: 2 }}
                      aria-label="Usuń"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Varieties — only for non-variety plants */}
          {!isVariety && (
            <section>
              <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'var(--gold-label)' }}>
                Odmiany
              </p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <Autocomplete
                    value={varietyDraft}
                    onChange={setVarietyDraft}
                    onEnter={handleAddVariety}
                    suggestions={[
                      ...(species?.commonVarieties || []),
                      ...loadVarieties().filter((v) => v.parent !== plantId).map((v) => v.name),
                    ]}
                    placeholder="np. New Dawn, Knock Out"
                    className="bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                    style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddVariety}
                  disabled={!varietyDraft.trim()}
                  className="px-3 py-2 rounded-lg text-[12px] tracking-wide cursor-pointer shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                    color: '#1A1208',
                    border: 'none',
                    opacity: varietyDraft.trim() ? 1 : 0.4,
                  }}
                >
                  Dodaj
                </button>
              </div>
              {varieties.length === 0 ? (
                <p className="text-[13px] font-serif italic" style={{ color: 'var(--text-faint)' }}>
                  Brak odmian. Dodaj pierwszą.
                </p>
              ) : (
                <div
                  className="flex gap-2 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                >
                  {varieties.map((v) => {
                    const vPhotos = loadPhotos(v.id);
                    const vNotes = loadPlantNotes(v.id);
                    const firstPhoto = vPhotos[0];
                    const lastNote = vNotes[0];
                    return (
                      <div
                        key={v.id}
                        className="relative rounded-lg overflow-hidden shrink-0 flex flex-col"
                        style={{
                          width: '160px',
                          minHeight: '220px',
                          background: 'var(--surface-elevated)',
                          border: '0.5px solid var(--border-soft)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => onOpenVariety?.(v)}
                          className="flex flex-col text-left cursor-pointer flex-1"
                          style={{ background: 'none', border: 'none', padding: 0, color: 'inherit' }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: '110px',
                              background: firstPhoto
                                ? `url(${firstPhoto.dataUrl}) center/cover`
                                : 'linear-gradient(135deg, rgba(201,169,110,0.12), rgba(76,175,80,0.08))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {!firstPhoto && (
                              <span style={{ fontSize: '32px', opacity: 0.4 }}>🌱</span>
                            )}
                          </div>
                          <div className="px-2.5 py-2 flex-1 flex flex-col gap-1">
                            <p
                              className="font-serif italic"
                              style={{
                                fontSize: '13px',
                                color: 'var(--text-primary)',
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {v.name}
                            </p>
                            {lastNote ? (
                              <p
                                className="font-serif italic"
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-muted)',
                                  lineHeight: 1.3,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  flex: 1,
                                }}
                              >
                                „{lastNote.text}"
                              </p>
                            ) : (
                              <p
                                className="font-serif italic"
                                style={{ fontSize: '11px', color: 'var(--text-very-faint)', flex: 1 }}
                              >
                                Brak notatek
                              </p>
                            )}
                            <p
                              className="tracking-wide"
                              style={{ fontSize: '10px', color: 'var(--gold-label-strong)' }}
                            >
                              📷 {vPhotos.length} · 📝 {vNotes.length}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Usunąć odmianę "${v.name}"? Notatki i zdjęcia odmiany też znikną.`)) {
                              const next = deleteVariety(v.id);
                              setVarieties(next.filter((x) => x.parent === plantId));
                            }
                          }}
                          className="absolute cursor-pointer"
                          style={{
                            top: '4px',
                            right: '4px',
                            background: 'rgba(0,0,0,0.6)',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '14px',
                            lineHeight: 1,
                            padding: '2px 7px',
                            borderRadius: '999px',
                          }}
                          aria-label="Usuń odmianę"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Calendar context */}
          {parentActionsByMonth.length > 0 && (
            <section>
              <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'var(--gold-label)' }}>
                {isVariety ? `Kalendarz (z parent: ${parentName})` : 'Kalendarz'}
              </p>
              <div className="flex flex-col gap-2">
                {parentActionsByMonth.map(({ month, items }) => (
                  <div key={month}>
                    <p className="text-[11px] uppercase mb-1" style={{ color: 'var(--gold-label-strong)' }}>
                      {MONTHS[month - 1]}
                    </p>
                    <div className="flex flex-col gap-1">
                      {items.map((a, idx) => {
                        const cat = CATEGORY_BY_KEY[a.type];
                        return (
                          <div
                            key={idx}
                            className="px-3 py-2 rounded-lg flex items-start gap-2"
                            style={{ background: cat?.bg || 'var(--surface-elevated)', border: `0.5px solid ${cat?.border || 'var(--border-soft)'}` }}
                          >
                            <span style={{ fontSize: '10px', color: cat?.text, minWidth: '70px' }}>
                              {cat?.label}
                            </span>
                            <p className="font-serif italic text-[13px] leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
                              {a.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty-calendar fallback for custom plants */}
          {parentActionsByMonth.length === 0 && !isVariety && !PLANTS.find((p) => p.key === plantId) && (
            <p className="text-[13px] font-serif italic" style={{ color: 'var(--text-faint)' }}>
              Roślina własna — kalendarz pojawi się gdy dodasz akcje w sekcji "Twoje rośliny".
            </p>
          )}
        </div>
      </div>

      {fullscreenPhoto && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={closeFullscreen}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center w-full"
            style={{ maxWidth: '600px' }}
          >
            <div className="relative w-full flex items-center justify-center">
              <img
                src={fullscreenPhoto.dataUrl}
                alt={fullscreenPhoto.caption || ''}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '12px', border: '0.5px solid var(--border-medium)', touchAction: 'pan-y' }}
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goToPhoto(fullscreenIdx - 1)}
                    aria-label="Poprzednie zdjęcie"
                    className="absolute cursor-pointer"
                    style={{
                      left: '4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.55)',
                      border: '0.5px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: '22px',
                      lineHeight: 1,
                      display: 'grid',
                      placeItems: 'center',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPhoto(fullscreenIdx + 1)}
                    aria-label="Następne zdjęcie"
                    className="absolute cursor-pointer"
                    style={{
                      right: '4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.55)',
                      border: '0.5px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: '22px',
                      lineHeight: 1,
                      display: 'grid',
                      placeItems: 'center',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    ›
                  </button>
                  <span
                    className="absolute"
                    style={{
                      top: '8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.6)',
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      padding: '2px 10px',
                      borderRadius: '999px',
                      letterSpacing: '1px',
                    }}
                  >
                    {fullscreenIdx + 1} / {photos.length}
                  </span>
                </>
              )}
            </div>

            <textarea
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              onBlur={() => persistCaption(fullscreenIdx, captionDraft)}
              placeholder="Krótki opis (opcjonalny)..."
              rows={2}
              className="w-full mt-3 bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none resize-none"
              style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
            />

            <div className="flex items-center justify-between mt-3 w-full">
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{fullscreenPhoto.date}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteCurrentPhoto}
                  className="px-3 py-1.5 rounded-full text-[11px] cursor-pointer"
                  style={{ background: 'none', border: '0.5px solid rgba(232,100,100,0.4)', color: 'rgba(232,100,100,0.85)' }}
                >
                  Usuń
                </button>
                <button
                  type="button"
                  onClick={closeFullscreen}
                  className="px-3 py-1.5 rounded-full text-[11px] cursor-pointer"
                  style={{ background: 'none', border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
