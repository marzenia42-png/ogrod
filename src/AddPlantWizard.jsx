import { useState, useRef, useMemo } from 'react';
import { PLANT_CATEGORIES, CATEGORY_BY_ID } from './data/plantCategories.js';
import { PLANT_SPECIES, speciesByCategory } from './data/plantSpecies.js';
import { compressImage, addPhoto } from './lib/plantStorage.js';
import { MONTHS_SHORT } from './data/plants.js';

const GOLD = '#C9A96E';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Z calendarTasks gatunku wyciągnij unikalną listę miesięcy aktywności.
function monthsFromSpecies(species) {
  if (!species?.calendarTasks?.length) return [];
  return [...new Set(species.calendarTasks.map((t) => t.month))].sort((a, b) => a - b);
}

/**
 * 5-krokowy wizard dodawania rośliny.
 * Props:
 *   onClose()  — zamknij bez zapisu
 *   onSave(plant)  — zapis plant do customPlants i toast w parencie
 */
export default function AddPlantWizard({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState(null);
  const [speciesId, setSpeciesId] = useState(null);
  const [customName, setCustomName] = useState('');
  const [variety, setVariety] = useState('');
  const [location, setLocation] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoRef = useRef(null);

  const speciesList = useMemo(
    () => (categoryId ? speciesByCategory(categoryId) : []),
    [categoryId],
  );

  const selectedSpecies = speciesId ? PLANT_SPECIES.find((s) => s.id === speciesId) : null;
  const isCustomNameMode = speciesId === '__custom__';

  // Validation per step
  const canNext =
    (step === 1 && !!categoryId) ||
    (step === 2 && ((speciesId && !isCustomNameMode) || (isCustomNameMode && customName.trim().length >= 2))) ||
    step === 3 ||
    step === 4 ||
    step === 5;

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePhotoPick = async (file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    try {
      const dataUrl = await compressImage(file, 1024, 0.78);
      setPhotoPreview(dataUrl);
      setPhotoData(dataUrl);
    } catch { /* ignore */ }
  };

  const handleSave = () => {
    const id = uid();
    const finalName = isCustomNameMode ? customName.trim() : (selectedSpecies?.name || customName.trim());
    if (!finalName) return;

    // Miesiące: z gatunku (jeśli znany), inaczej pusta tablica.
    const months = selectedSpecies ? monthsFromSpecies(selectedSpecies) : [];

    // Domyślny type/text dla wstecznej kompatybilności z renderowaniem kalendarza.
    // Etap 2: kalendarz przeczyta calendarTasks per miesiąc; obecnie ustaw fallback.
    const plant = {
      id,
      name: finalName,
      variety: variety.trim() || undefined,
      speciesId: isCustomNameMode ? null : (speciesId || null),
      categoryId: categoryId || undefined,
      location: location.trim() || undefined,
      months,
      type: 'naturalny',
      text: variety.trim() ? `${finalName} · ${variety.trim()}` : finalName,
    };

    if (photoData) {
      try { addPhoto(id, photoData); } catch { /* photo limit — ignore for new plant */ }
    }

    onSave?.(plant);
  };

  // ──────────────── RENDER ────────────────
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
          maxHeight: '92vh',
          backgroundColor: '#0d0c0a',
          border: '1px solid rgba(201,169,110,0.3)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px',
        }}
      >
        {/* Header z progress */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: '0.5px solid rgba(201,169,110,0.2)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-[2px] uppercase" style={{ color: 'rgba(201,169,110,0.55)' }}>
              Krok {step} z 5
            </p>
            <h3 className="font-serif italic" style={{ fontSize: '20px', color: GOLD }}>
              {step === 1 && 'Kategoria'}
              {step === 2 && 'Gatunek'}
              {step === 3 && 'Odmiana'}
              {step === 4 && 'Lokalizacja'}
              {step === 5 && 'Zdjęcie'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,221,208,0.5)', padding: 4 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-2 pb-1">
          <div
            className="rounded-full overflow-hidden"
            style={{ background: 'rgba(201,169,110,0.12)', height: 3 }}
          >
            <div
              style={{
                width: `${(step / 5) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #C9A96E, #b89556)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="overflow-y-auto px-5 py-4 flex-1">
          {/* ── KROK 1: Kategoria ── */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {PLANT_CATEGORIES.map((c) => {
                const active = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setCategoryId(c.id); setSpeciesId(null); setCustomName(''); setStep(2); }}
                    className="rounded-xl py-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(201,169,110,0.25), rgba(123,201,123,0.15))'
                        : 'rgba(255,255,255,0.03)',
                      border: active ? `1px solid ${GOLD}` : '0.5px solid rgba(201,169,110,0.2)',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <span style={{ fontSize: '36px', lineHeight: 1 }}>{c.emoji}</span>
                    <span
                      className="font-serif italic text-center px-2"
                      style={{ fontSize: '13px', color: active ? '#F0E8D8' : 'rgba(232,221,208,0.75)', lineHeight: 1.2 }}
                    >
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── KROK 2: Gatunek ── */}
          {step === 2 && (
            <div className="flex flex-col gap-2">
              {speciesList.length === 0 && (
                <p className="text-[13px] font-serif italic mb-2" style={{ color: 'rgba(232,221,208,0.6)' }}>
                  W tej kategorii nie ma jeszcze gotowych gatunków — wpisz nazwę poniżej.
                </p>
              )}
              {speciesList.map((s) => {
                const active = speciesId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setSpeciesId(s.id); setCustomName(''); }}
                    className="text-left rounded-lg px-4 py-3 cursor-pointer"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(201,169,110,0.20), rgba(123,201,123,0.10))'
                        : 'rgba(255,255,255,0.03)',
                      border: active ? `0.5px solid ${GOLD}` : '0.5px solid rgba(201,169,110,0.18)',
                      color: active ? '#F0E8D8' : 'rgba(232,221,208,0.85)',
                      touchAction: 'manipulation',
                    }}
                  >
                    <p className="font-serif italic" style={{ fontSize: '15px' }}>{s.name}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(201,169,110,0.6)', marginTop: '2px' }}>
                      {s.guide.light} · {s.guide.frostHardy ? 'mrozoodporna' : 'nie mrozoodporna'}
                    </p>
                  </button>
                );
              })}

              {/* "Inne" — własna nazwa */}
              <button
                type="button"
                onClick={() => setSpeciesId('__custom__')}
                className="text-left rounded-lg px-4 py-3 cursor-pointer mt-1"
                style={{
                  background: isCustomNameMode ? 'rgba(201,169,110,0.10)' : 'transparent',
                  border: '0.5px dashed rgba(201,169,110,0.35)',
                  color: 'rgba(232,221,208,0.85)',
                }}
              >
                <p className="font-serif italic" style={{ fontSize: '14px' }}>+ Inne (wpisz nazwę)</p>
              </button>

              {isCustomNameMode && (
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="np. Aronia, Forsycja, Kapusta..."
                  autoFocus
                  className="mt-2 bg-transparent text-[14px] font-serif italic px-3 py-2 rounded-lg outline-none"
                  style={{ border: '0.5px solid rgba(201,169,110,0.3)', color: '#F0E8D8' }}
                />
              )}
            </div>
          )}

          {/* ── KROK 3: Odmiana ── */}
          {step === 3 && (
            <div>
              <p className="text-[13px] font-serif italic mb-3" style={{ color: 'rgba(232,221,208,0.65)' }}>
                Opcjonalna — odmiana, kultywar, nazwa handlowa.
              </p>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder={selectedSpecies?.id === 'roza' ? 'np. Pierre de Ronsard, New Dawn' : 'np. Malinowy, Cherry, Antonówka'}
                autoFocus
                className="w-full bg-transparent text-[15px] font-serif italic px-4 py-3 rounded-lg outline-none"
                style={{ border: '0.5px solid rgba(201,169,110,0.3)', color: '#F0E8D8' }}
              />
              {selectedSpecies && (
                <p className="mt-3 text-[11px]" style={{ color: 'rgba(201,169,110,0.5)' }}>
                  Wybrano: {selectedSpecies.name}
                </p>
              )}
            </div>
          )}

          {/* ── KROK 4: Lokalizacja ── */}
          {step === 4 && (
            <div>
              <p className="text-[13px] font-serif italic mb-3" style={{ color: 'rgba(232,221,208,0.65)' }}>
                Opcjonalna — gdzie ta roślina rośnie?
              </p>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="np. Sad, Balkon południowy, Działka, Ogród przedni"
                autoFocus
                className="w-full bg-transparent text-[15px] font-serif italic px-4 py-3 rounded-lg outline-none"
                style={{ border: '0.5px solid rgba(201,169,110,0.3)', color: '#F0E8D8' }}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {['Sad', 'Balkon', 'Działka', 'Ogród', 'Szklarnia', 'Donica'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setLocation(q)}
                    className="px-3 py-1 rounded-full text-[12px] cursor-pointer"
                    style={{
                      background: location === q ? 'rgba(201,169,110,0.20)' : 'rgba(255,255,255,0.03)',
                      border: location === q ? `0.5px solid ${GOLD}` : '0.5px solid rgba(201,169,110,0.2)',
                      color: location === q ? GOLD : 'rgba(232,221,208,0.7)',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── KROK 5: Zdjęcie ── */}
          {step === 5 && (
            <div>
              <p className="text-[13px] font-serif italic mb-3" style={{ color: 'rgba(232,221,208,0.65)' }}>
                Opcjonalne — zdjęcie rośliny do galerii.
              </p>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => { handlePhotoPick(e.target.files?.[0]); e.target.value = ''; }}
                style={{ display: 'none' }}
              />
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden" style={{ border: '0.5px solid rgba(201,169,110,0.3)' }}>
                  <img src={photoPreview} alt="" style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => { setPhotoData(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 cursor-pointer"
                    style={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#F0E8D8', lineHeight: 1, fontSize: 18 }}
                    aria-label="Usuń"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  className="w-full py-6 rounded-xl cursor-pointer"
                  style={{ background: 'none', border: '0.5px dashed rgba(201,169,110,0.45)', color: 'rgba(201,169,110,0.85)', fontSize: 14 }}
                >
                  📷 Wybierz / zrób zdjęcie
                </button>
              )}

              {/* Podsumowanie przed zapisem */}
              <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(201,169,110,0.06)', border: '0.5px solid rgba(201,169,110,0.2)' }}>
                <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(201,169,110,0.55)' }}>Podsumowanie</p>
                <p className="text-[13px] font-serif italic" style={{ color: '#F0E8D8' }}>
                  {isCustomNameMode ? customName : selectedSpecies?.name}
                  {variety && <span style={{ color: 'rgba(201,169,110,0.7)' }}> · {variety}</span>}
                </p>
                <p className="text-[11px]" style={{ color: 'rgba(232,221,208,0.55)', marginTop: 4 }}>
                  {CATEGORY_BY_ID[categoryId]?.emoji} {CATEGORY_BY_ID[categoryId]?.name}
                  {location && <> · 📍 {location}</>}
                </p>
                {selectedSpecies && (
                  <p className="text-[11px]" style={{ color: 'rgba(201,169,110,0.55)', marginTop: 4 }}>
                    Automatycznie {monthsFromSpecies(selectedSpecies).length} zadań w kalendarzu (
                    {monthsFromSpecies(selectedSpecies).map((m) => MONTHS_SHORT[m - 1]).join(', ')})
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div
          className="flex gap-2 px-5 py-3"
          style={{ borderTop: '0.5px solid rgba(201,169,110,0.2)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-2.5 rounded-full text-[13px] cursor-pointer"
              style={{ background: 'none', border: '0.5px solid rgba(201,169,110,0.3)', color: 'rgba(232,221,208,0.75)' }}
            >
              ← Wstecz
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full text-[13px] cursor-pointer"
              style={{ background: 'none', border: '0.5px solid rgba(201,169,110,0.3)', color: 'rgba(232,221,208,0.75)' }}
            >
              Anuluj
            </button>
          )}
          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="flex-1 py-2.5 rounded-full text-[13px] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                color: '#1A1208',
                border: 'none',
                fontWeight: 500,
                opacity: canNext ? 1 : 0.4,
              }}
            >
              Dalej →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-full text-[13px] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #4CAF50, #2e7d32)',
                color: '#0a0f0a',
                border: 'none',
                fontWeight: 600,
              }}
            >
              Zapisz roślinę
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
