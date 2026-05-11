import { useState, useEffect, useRef } from 'react';
import {
  loadPhotos, addPhoto, deletePhoto,
  loadPlantNotes, addPlantNote, deletePlantNote,
  loadVarietiesFor, addVariety, deleteVariety,
  compressImage,
} from './lib/plantStorage.js';
import { MONTHS, ACTIONS, CATEGORIES, CATEGORY_BY_KEY, PLANTS } from './data/plants.js';

export default function PlantDetail({
  plantId,
  plantName,
  isVariety = false,
  parentId = null,
  parentName = null,
  onClose,
  onOpenVariety,
}) {
  const [photos, setPhotos] = useState(() => loadPhotos(plantId));
  const [notes, setNotes] = useState(() => loadPlantNotes(plantId));
  const [varieties, setVarieties] = useState(() =>
    isVariety ? [] : loadVarietiesFor(plantId),
  );
  const [noteDraft, setNoteDraft] = useState('');
  const [varietyDraft, setVarietyDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);
  const photoInputRef = useRef(null);

  // If the user opens a different plant, refresh local state.
  useEffect(() => {
    setPhotos(loadPhotos(plantId));
    setNotes(loadPlantNotes(plantId));
    setVarieties(isVariety ? [] : loadVarietiesFor(plantId));
  }, [plantId, isVariety]);

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setAdding(true);
    try {
      // Smaller cap for plant photos so localStorage doesn't blow up.
      const dataUrl = await compressImage(file, 1024, 0.72);
      const next = addPhoto(plantId, dataUrl);
      setPhotos(next);
    } catch {
      alert('Nie udało się zapisać zdjęcia (pamięć przeglądarki pełna?).');
    } finally {
      setAdding(false);
    }
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
          backgroundColor: '#0d0c0a',
          border: '1px solid rgba(201,169,110,0.3)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px',
        }}
      >
        <div
          className="flex items-center justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: '0.5px solid rgba(201,169,110,0.2)' }}
        >
          <div className="min-w-0 flex-1">
            {isVariety && parentName && (
              <p className="text-[10px] tracking-[2px] uppercase truncate" style={{ color: 'rgba(201,169,110,0.5)' }}>
                odmiana · {parentName}
              </p>
            )}
            <h3 className="font-serif italic truncate" style={{ fontSize: '22px', color: gold }}>{plantName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,221,208,0.5)', padding: 4 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-6 flex-1">
          {/* Gallery */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] tracking-[2px] uppercase" style={{ color: 'rgba(201,169,110,0.55)' }}>
                Galeria
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
                disabled={adding}
                className="text-[11px] tracking-wide cursor-pointer px-3 py-1 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                  color: '#1A1208',
                  border: 'none',
                  opacity: adding ? 0.5 : 1,
                }}
              >
                {adding ? 'Zapisuję…' : '+ zdjęcie'}
              </button>
            </div>
            {photos.length === 0 ? (
              <p className="text-[13px] font-serif italic" style={{ color: 'rgba(232,221,208,0.4)' }}>
                Brak zdjęć. Wgraj pierwsze.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFullscreenPhoto(p)}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                    style={{ border: '0.5px solid rgba(201,169,110,0.2)', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <img src={p.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <span
                      className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 text-[9px] tracking-wide"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', color: 'rgba(232,221,208,0.85)' }}
                    >
                      {p.date}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(201,169,110,0.55)' }}>
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
                style={{ border: '0.5px solid rgba(201,169,110,0.25)', color: 'rgba(232,221,208,0.85)' }}
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
              <p className="text-[13px] font-serif italic" style={{ color: 'rgba(232,221,208,0.4)' }}>
                Brak notatek dla tej rośliny.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="px-3 py-2 rounded-lg flex items-start gap-2"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '0.5px solid rgba(201,169,110,0.15)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] tracking-wide" style={{ color: 'rgba(201,169,110,0.55)' }}>{n.date}</p>
                      <p className="mt-0.5 text-[13px] font-serif italic leading-relaxed" style={{ color: 'rgba(232,221,208,0.85)' }}>
                        {n.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotes(deletePlantNote(plantId, n.id))}
                      className="cursor-pointer shrink-0"
                      style={{ background: 'none', border: 'none', color: 'rgba(232,221,208,0.4)', fontSize: '16px', lineHeight: 1, padding: 2 }}
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
              <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(201,169,110,0.55)' }}>
                Odmiany
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={varietyDraft}
                  onChange={(e) => setVarietyDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddVariety(); }}
                  placeholder="np. New Dawn, Knock Out"
                  className="flex-1 bg-transparent text-[13px] font-serif italic px-3 py-2 rounded-lg outline-none"
                  style={{ border: '0.5px solid rgba(201,169,110,0.25)', color: 'rgba(232,221,208,0.85)' }}
                />
                <button
                  type="button"
                  onClick={handleAddVariety}
                  disabled={!varietyDraft.trim()}
                  className="px-3 py-2 rounded-lg text-[12px] tracking-wide cursor-pointer"
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
                <p className="text-[13px] font-serif italic" style={{ color: 'rgba(232,221,208,0.4)' }}>
                  Brak odmian. Dodaj pierwszą.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {varieties.map((v) => (
                    <div
                      key={v.id}
                      className="px-3 py-2 rounded-lg flex items-center justify-between gap-2"
                      style={{ background: 'rgba(0,0,0,0.4)', border: '0.5px solid rgba(201,169,110,0.15)' }}
                    >
                      <button
                        type="button"
                        onClick={() => onOpenVariety?.(v)}
                        className="text-left flex-1 cursor-pointer"
                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit' }}
                      >
                        <p className="font-serif italic" style={{ fontSize: '14px', color: '#F0E8D8' }}>
                          {v.name}
                        </p>
                        <p className="text-[10px] tracking-wide" style={{ color: 'rgba(201,169,110,0.55)' }}>
                          dodano {v.addedAt}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Usunąć odmianę "${v.name}"? Notatki i zdjęcia odmiany też znikną.`)) {
                            const next = deleteVariety(v.id);
                            setVarieties(next.filter((x) => x.parent === plantId));
                          }
                        }}
                        className="cursor-pointer shrink-0"
                        style={{ background: 'none', border: 'none', color: 'rgba(232,221,208,0.4)', fontSize: '16px', lineHeight: 1, padding: 2 }}
                        aria-label="Usuń odmianę"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Calendar context */}
          {parentActionsByMonth.length > 0 && (
            <section>
              <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(201,169,110,0.55)' }}>
                {isVariety ? `Kalendarz (z parent: ${parentName})` : 'Kalendarz'}
              </p>
              <div className="flex flex-col gap-2">
                {parentActionsByMonth.map(({ month, items }) => (
                  <div key={month}>
                    <p className="text-[11px] uppercase mb-1" style={{ color: 'rgba(201,169,110,0.7)' }}>
                      {MONTHS[month - 1]}
                    </p>
                    <div className="flex flex-col gap-1">
                      {items.map((a, idx) => {
                        const cat = CATEGORY_BY_KEY[a.type];
                        return (
                          <div
                            key={idx}
                            className="px-3 py-2 rounded-lg flex items-start gap-2"
                            style={{ background: cat?.bg || 'rgba(0,0,0,0.4)', border: `0.5px solid ${cat?.border || 'rgba(201,169,110,0.2)'}` }}
                          >
                            <span style={{ fontSize: '10px', color: cat?.text, minWidth: '70px' }}>
                              {cat?.label}
                            </span>
                            <p className="font-serif italic text-[13px] leading-relaxed flex-1" style={{ color: 'rgba(232,221,208,0.85)' }}>
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
            <p className="text-[13px] font-serif italic" style={{ color: 'rgba(232,221,208,0.4)' }}>
              Roślina własna — kalendarz pojawi się gdy dodasz akcje w sekcji "Twoje rośliny".
            </p>
          )}
        </div>
      </div>

      {fullscreenPhoto && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={() => setFullscreenPhoto(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center"
            style={{ maxWidth: '600px', width: '100%' }}
          >
            <img
              src={fullscreenPhoto.dataUrl}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px', border: '0.5px solid rgba(201,169,110,0.3)' }}
            />
            <div className="flex items-center justify-between mt-3 w-full">
              <span className="text-[12px]" style={{ color: 'rgba(232,221,208,0.7)' }}>{fullscreenPhoto.date}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Usunąć zdjęcie?')) {
                      const next = deletePhoto(plantId, fullscreenPhoto.id);
                      setPhotos(next);
                      setFullscreenPhoto(null);
                    }
                  }}
                  className="px-3 py-1.5 rounded-full text-[11px] cursor-pointer"
                  style={{ background: 'none', border: '0.5px solid rgba(232,100,100,0.4)', color: 'rgba(232,100,100,0.85)' }}
                >
                  Usuń
                </button>
                <button
                  type="button"
                  onClick={() => setFullscreenPhoto(null)}
                  className="px-3 py-1.5 rounded-full text-[11px] cursor-pointer"
                  style={{ background: 'none', border: '0.5px solid rgba(201,169,110,0.3)', color: 'rgba(232,221,208,0.85)' }}
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
