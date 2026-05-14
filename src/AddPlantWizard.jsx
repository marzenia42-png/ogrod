import { useState, useRef, useMemo } from 'react';
import { PLANT_CATEGORIES, CATEGORY_BY_ID } from './data/plantCategories.js';
import { PLANT_SPECIES, speciesByCategory } from './data/plantSpecies.js';
import { compressImage, loadVarieties } from './lib/plantStorage.js';
import { MONTHS_SHORT } from './data/plants.js';
import { callFloraIdentify } from './lib/floraApi.js';
import Autocomplete from './Autocomplete.jsx';

const GOLD = 'var(--gold)';
const TOTAL_STEPS = 5;

const STEP_TITLES = {
  1: 'Kategoria',
  2: 'Gatunek',
  3: 'Odmiana',
  4: 'Lokalizacja i zakup',
  5: 'Podsumowanie',
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function monthsFromSpecies(species) {
  if (!species?.calendarTasks?.length) return [];
  return [...new Set(species.calendarTasks.map((t) => t.month))].sort((a, b) => a - b);
}

function formatPLN(value) {
  if (value == null || Number.isNaN(value)) return '';
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 }).format(value);
}

/**
 * 5-krokowy wizard dodawania rośliny (v5):
 *   1) Kategoria — domyślnie; opcjonalny mini-panel "🔍 Rozpoznaj zdjęciem"
 *      → po rozpoznaniu auto-preselect kategorii+gatunku+odmiany i skok do kroku 2/3
 *   2) Gatunek (preselect z FLORA, autocomplete dla "Inne")
 *   3) Odmiana (preselect z FLORA, autocomplete) — opcjonalna
 *   4) Lokalizacja + Zakup (data zakupu + cena PLN) — wszystkie opcjonalne
 *   5) Podsumowanie z info o zakupie
 *
 * Zdjęcie z kroku rozpoznawania NIE jest zapisywane do galerii rośliny —
 * zdjęcia rośliny dodawane są dopiero w PlantDetail (kontekst choroby/problemu).
 */
export default function AddPlantWizard({ onClose, onSave, preseed = null }) {
  // preseed: { name, categoryId?, variety? } — pre-filled from Spacer flow.
  const [step, setStep] = useState(preseed?.categoryId ? 2 : 1);
  const [categoryId, setCategoryId] = useState(preseed?.categoryId || null);
  const [speciesId, setSpeciesId] = useState(preseed?.name ? '__custom__' : null);
  const [customName, setCustomName] = useState(preseed?.name || '');
  const [variety, setVariety] = useState(preseed?.variety || '');
  const [location, setLocation] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  // Rozpoznawanie zdjęciem — tryb opcjonalny w kroku 1.
  const [identifyMode, setIdentifyMode] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [identifying, setIdentifying] = useState(false);
  const [identifications, setIdentifications] = useState(null);
  const [identifyError, setIdentifyError] = useState(null);
  const photoRef = useRef(null);

  const speciesList = useMemo(
    () => (categoryId ? speciesByCategory(categoryId) : []),
    [categoryId],
  );

  const selectedSpecies = speciesId && speciesId !== '__custom__'
    ? PLANT_SPECIES.find((s) => s.id === speciesId)
    : null;
  const isCustomNameMode = speciesId === '__custom__';

  const allSpeciesNames = useMemo(() => PLANT_SPECIES.map((s) => s.name), []);
  const userVarietyNames = useMemo(() => loadVarieties().map((v) => v.name), []);
  const varietySuggestions = useMemo(
    () => [...(selectedSpecies?.commonVarieties || []), ...userVarietyNames],
    [selectedSpecies, userVarietyNames],
  );

  const canNext =
    (step === 1 && !!categoryId) ||
    (step === 2 && ((speciesId && !isCustomNameMode) || (isCustomNameMode && customName.trim().length >= 2))) ||
    (step === 3) ||
    (step === 4) ||
    (step === 5);

  const handleNext = () => { if (step < TOTAL_STEPS) setStep(step + 1); };
  const handleBack = () => {
    if (identifyMode && step === 1) {
      setIdentifyMode(false);
      setPhotoPreview(null);
      setPhotoBase64(null);
      setIdentifications(null);
      setIdentifyError(null);
      return;
    }
    if (step > 1) setStep(step - 1);
  };

  const handlePhotoPick = async (file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    try {
      const dataUrl = await compressImage(file, 1024, 0.78);
      const commaIdx = dataUrl.indexOf(',');
      setPhotoPreview(dataUrl);
      setPhotoBase64(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
      setIdentifications(null);
      setIdentifyError(null);
    } catch { /* ignore */ }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoBase64(null);
    setIdentifications(null);
    setIdentifyError(null);
  };

  const handleIdentify = async () => {
    if (!photoBase64) return;
    setIdentifying(true);
    setIdentifyError(null);
    try {
      const data = await callFloraIdentify(photoBase64, 'image/jpeg');
      const list = Array.isArray(data?.identifications) ? data.identifications : [];
      setIdentifications(list);
      if (list.length === 0) {
        setIdentifyError('FLORA nie rozpoznała rośliny. Wybierz ręcznie.');
      }
    } catch (e) {
      setIdentifyError(e?.message || 'Błąd rozpoznawania. Wybierz ręcznie.');
    } finally {
      setIdentifying(false);
    }
  };

  const applyIdentification = (it) => {
    const matched = PLANT_SPECIES.find(
      (s) => s.name.toLowerCase() === (it.name || '').toLowerCase(),
    );
    const validCategory = PLANT_CATEGORIES.some((c) => c.id === it.categoryId);
    setCategoryId(validCategory ? it.categoryId : (matched?.categoryId || null));
    if (matched) {
      setSpeciesId(matched.id);
      setCustomName('');
    } else {
      setSpeciesId('__custom__');
      setCustomName(it.name || '');
    }
    setVariety(it.variety || '');
    // Reset identify mode i przejdź dalej.
    setIdentifyMode(false);
    setPhotoPreview(null);
    setPhotoBase64(null);
    // Jeśli FLORA podała wariant — pomiń krok odmiany, idź do lokalizacji.
    setStep(it.variety ? 4 : 3);
  };

  const handleSave = () => {
    const id = uid();
    const finalName = isCustomNameMode ? customName.trim() : (selectedSpecies?.name || customName.trim());
    if (!finalName) return;

    const months = selectedSpecies ? monthsFromSpecies(selectedSpecies) : [];
    const priceNum = Number(purchasePrice.replace(',', '.'));
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) ? purchaseDate : undefined;
    const validPrice = Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum * 100) / 100 : undefined;

    const plant = {
      id,
      name: finalName,
      variety: variety.trim() || undefined,
      speciesId: isCustomNameMode ? null : (speciesId || null),
      categoryId: categoryId || undefined,
      location: location.trim() || undefined,
      purchaseDate: validDate,
      purchasePrice: validPrice,
      months,
      type: 'naturalny',
      text: variety.trim() ? `${finalName} · ${variety.trim()}` : finalName,
    };

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
          backgroundColor: 'var(--surface-modal)',
          border: '1px solid var(--border-strong)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px',
        }}
      >
        <div
          className="flex items-center justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: '0.5px solid var(--border-soft)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-[2px] uppercase" style={{ color: 'var(--gold-label)' }}>
              Krok {step} z {TOTAL_STEPS}
            </p>
            <h3 className="font-serif italic" style={{ fontSize: '20px', color: GOLD }}>
              {identifyMode && step === 1 ? '🔍 Rozpoznawanie' : STEP_TITLES[step]}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="px-5 pt-2 pb-1">
          <div className="rounded-full overflow-hidden" style={{ background: 'var(--surface-tint)', height: 3 }}>
            <div
              style={{
                width: `${(step / TOTAL_STEPS) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #C9A96E, #b89556)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* File input dla rozpoznawania zdjęciem — montowany RAZ poza warunkami,
            dzięki czemu photoRef.current jest stabilny niezależnie od identifyMode. */}
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          onChange={(e) => { handlePhotoPick(e.target.files?.[0]); e.target.value = ''; setIdentifyMode(true); }}
          style={{ display: 'none' }}
        />

        <div className="overflow-y-auto px-5 py-4 flex-1">
          {/* ── KROK 1: Kategoria (z opcjonalnym rozpoznawaniem zdjęciem) ── */}
          {step === 1 && !identifyMode && (
            <>
              <button
                type="button"
                onClick={() => { setIdentifyMode(true); }}
                className="w-full py-3 rounded-xl cursor-pointer mb-4 flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(123,201,123,0.18), rgba(76,175,80,0.10))',
                  border: '0.5px dashed rgba(76, 175, 80, 0.45)',
                  color: '#2e7d32',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                🔍 Mam zdjęcie rośliny — pomóż mi rozpoznać (opcjonalne)
              </button>

              <div className="grid grid-cols-2 gap-3">
                {PLANT_CATEGORIES.map((c) => {
                  const active = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setCategoryId(c.id); if (!speciesId) { setSpeciesId(null); setCustomName(''); } setStep(2); }}
                      className="rounded-xl py-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                      style={{
                        background: active
                          ? 'linear-gradient(135deg, rgba(201,169,110,0.25), rgba(123,201,123,0.15))'
                          : 'var(--surface-faint)',
                        border: active ? `1px solid var(--gold)` : '0.5px solid var(--border-soft)',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <span style={{ fontSize: '36px', lineHeight: 1 }}>{c.emoji}</span>
                      <span
                        className="font-serif italic text-center px-2"
                        style={{ fontSize: '13px', color: active ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.2 }}
                      >
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── KROK 1 alt: Rozpoznawanie zdjęciem ── */}
          {step === 1 && identifyMode && (
            <div>
              {!photoPreview && (
                <div className="flex flex-col gap-3">
                  <p className="text-[13px] font-serif italic" style={{ color: 'var(--text-secondary)' }}>
                    Zrób zdjęcie rośliny — FLORA spróbuje ją rozpoznać i wypełni resztę kroków za Ciebie.
                  </p>
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    className="w-full py-6 rounded-xl cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, rgba(123,201,123,0.25), rgba(76,175,80,0.15))',
                      border: '0.5px solid rgba(76, 175, 80, 0.45)',
                      color: '#2e7d32',
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    📷 Zrób / wybierz zdjęcie
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdentifyMode(false)}
                    className="w-full py-2.5 rounded-full cursor-pointer"
                    style={{ background: 'none', border: '0.5px dashed var(--border-strong)', color: 'var(--text-secondary)', fontSize: 12 }}
                  >
                    ← Wróć do listy kategorii
                  </button>
                </div>
              )}

              {photoPreview && (
                <div className="flex flex-col gap-3">
                  <div className="relative rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border-strong)' }}>
                    <img src={photoPreview} alt="" style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 cursor-pointer"
                      style={{ background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#F0E8D8', lineHeight: 1, fontSize: 18 }}
                      aria-label="Usuń zdjęcie"
                    >
                      ×
                    </button>
                  </div>

                  {!identifying && identifications === null && (
                    <>
                      <button
                        type="button"
                        onClick={handleIdentify}
                        className="w-full py-3 rounded-full cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, #7bc97b, #4CAF50)',
                          color: '#0a0f0a',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        🔍 Rozpoznaj przez FLORA
                      </button>
                      <button
                        type="button"
                        onClick={() => setIdentifyMode(false)}
                        className="w-full py-2.5 rounded-full cursor-pointer"
                        style={{ background: 'none', border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)', fontSize: 12 }}
                      >
                        Pomiń — wybiorę ręcznie
                      </button>
                    </>
                  )}

                  {identifying && (
                    <div
                      className="py-4 rounded-xl flex items-center justify-center gap-3"
                      style={{ background: 'rgba(76, 175, 80, 0.08)', border: '0.5px solid rgba(76, 175, 80, 0.25)' }}
                    >
                      <span style={{ fontSize: 24 }}>🌿</span>
                      <span className="font-serif italic" style={{ color: '#2e7d32', fontSize: 14 }}>
                        FLORA myśli...
                      </span>
                    </div>
                  )}

                  {!identifying && Array.isArray(identifications) && identifications.length > 0 && (
                    <div>
                      <p
                        className="text-[11px] tracking-[2px] uppercase mb-2"
                        style={{ color: 'rgba(46, 125, 50, 0.8)' }}
                      >
                        🌿 FLORA proponuje
                      </p>
                      <div className="flex flex-col gap-2">
                        {identifications.map((it, i) => {
                          const cat = CATEGORY_BY_ID[it.categoryId];
                          const conf = Math.round((Number(it.confidence) || 0) * 100);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => applyIdentification(it)}
                              className="text-left rounded-lg px-3 py-3 cursor-pointer flex items-center gap-3"
                              style={{
                                background: i === 0
                                  ? 'linear-gradient(135deg, rgba(123,201,123,0.18), rgba(76,175,80,0.10))'
                                  : 'var(--surface-faint)',
                                border: i === 0
                                  ? '0.5px solid rgba(76, 175, 80, 0.45)'
                                  : '0.5px solid var(--border-soft)',
                                touchAction: 'manipulation',
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-serif italic" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                                  {it.name}
                                  {it.variety && (
                                    <span style={{ color: 'var(--gold-label-strong)' }}> · {it.variety}</span>
                                  )}
                                </p>
                                {cat && (
                                  <p style={{ fontSize: 11, color: 'var(--gold-label)', marginTop: 2 }}>
                                    {cat.emoji} {cat.name}
                                  </p>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: conf >= 60 ? '#2e7d32' : conf >= 30 ? 'var(--gold-label-strong)' : 'var(--text-muted)',
                                  fontWeight: 500,
                                  minWidth: 44,
                                  textAlign: 'right',
                                  fontVariantNumeric: 'lining-nums tabular-nums',
                                }}
                              >
                                {conf}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIdentifyMode(false)}
                        className="w-full mt-3 py-2.5 rounded-full cursor-pointer"
                        style={{ background: 'none', border: '0.5px dashed var(--border-strong)', color: 'var(--text-secondary)', fontSize: 12 }}
                      >
                        Żadne nie pasuje — wybiorę ręcznie
                      </button>
                    </div>
                  )}

                  {identifyError && (
                    <p className="text-[12px] font-serif italic mt-1" style={{ color: '#c62828' }}>
                      {identifyError}
                    </p>
                  )}

                  {!identifying && Array.isArray(identifications) && identifications.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setIdentifyMode(false)}
                      className="w-full py-2.5 rounded-full cursor-pointer"
                      style={{ background: 'none', border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)', fontSize: 12 }}
                    >
                      Wybierz ręcznie
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── KROK 2: Gatunek ── */}
          {step === 2 && (
            <div className="flex flex-col gap-2">
              {speciesList.length === 0 && (
                <p className="text-[13px] font-serif italic mb-2" style={{ color: 'var(--text-muted)' }}>
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
                        : 'var(--surface-faint)',
                      border: active ? `0.5px solid var(--gold)` : '0.5px solid var(--border-soft)',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      touchAction: 'manipulation',
                    }}
                  >
                    <p className="font-serif italic" style={{ fontSize: '15px' }}>{s.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--gold-label-strong)', marginTop: '2px' }}>
                      {s.guide.light} · {s.guide.frostHardy ? 'mrozoodporna' : 'nie mrozoodporna'}
                    </p>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSpeciesId('__custom__')}
                className="text-left rounded-lg px-4 py-3 cursor-pointer mt-1"
                style={{
                  background: isCustomNameMode ? 'var(--surface-tint)' : 'transparent',
                  border: '0.5px dashed var(--border-strong)',
                  color: 'var(--text-secondary)',
                }}
              >
                <p className="font-serif italic" style={{ fontSize: '14px' }}>+ Inne (wpisz nazwę)</p>
              </button>

              {isCustomNameMode && (
                <div className="mt-2">
                  <Autocomplete
                    value={customName}
                    onChange={setCustomName}
                    suggestions={allSpeciesNames}
                    placeholder="np. Aronia, Forsycja, Kapusta..."
                    autoFocus
                    className="bg-transparent text-[14px] font-serif italic px-3 py-2 rounded-lg outline-none"
                    style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── KROK 3: Odmiana ── */}
          {step === 3 && (
            <div>
              <p className="text-[13px] font-serif italic mb-3" style={{ color: 'var(--text-secondary)' }}>
                Opcjonalna — odmiana, kultywar, nazwa handlowa.
              </p>
              <Autocomplete
                value={variety}
                onChange={setVariety}
                suggestions={varietySuggestions}
                placeholder={selectedSpecies?.id === 'roza' ? 'np. Pierre de Ronsard, New Dawn' : 'np. Malinowy, Cherry, Antonówka'}
                autoFocus
                className="bg-transparent text-[15px] font-serif italic px-4 py-3 rounded-lg outline-none"
                style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
              />
              {selectedSpecies && (
                <p className="mt-3 text-[11px]" style={{ color: 'var(--gold-label)' }}>
                  Wybrano: {selectedSpecies.name}
                </p>
              )}
            </div>
          )}

          {/* ── KROK 4: Lokalizacja + Zakup ── */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gold-label)' }}>
                  📍 Lokalizacja (opcjonalna)
                </p>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="np. Sad, Balkon, Działka, Ogród przedni"
                  className="w-full bg-transparent text-[15px] font-serif italic px-4 py-3 rounded-lg outline-none"
                  style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {['Sad', 'Balkon', 'Działka', 'Ogród', 'Szklarnia', 'Donica'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setLocation(q)}
                      className="px-3 py-1 rounded-full text-[12px] cursor-pointer"
                      style={{
                        background: location === q ? 'var(--surface-tint)' : 'var(--surface-faint)',
                        border: location === q ? `0.5px solid var(--gold)` : '0.5px solid var(--border-soft)',
                        color: location === q ? 'var(--gold)' : 'var(--text-secondary)',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gold-label)' }}>
                  🧾 Zakup (opcjonalny)
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>
                      Data zakupu
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full bg-transparent text-[14px] font-serif italic px-3 py-2 rounded-lg outline-none"
                      style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div style={{ width: '120px' }}>
                    <label className="text-[10px] tracking-wide block mb-1" style={{ color: 'var(--text-muted)' }}>
                      Cena (PLN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="np. 49.99"
                      className="w-full bg-transparent text-[14px] font-serif italic px-3 py-2 rounded-lg outline-none"
                      style={{ border: '0.5px solid var(--border-medium)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                <p className="text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
                  Przyda się do historii ogrodu i wartości kolekcji.
                </p>
              </div>
            </div>
          )}

          {/* ── KROK 5: Podsumowanie ── */}
          {step === 5 && (
            <div>
              <div
                className="rounded-xl p-3"
                style={{ background: 'var(--surface-tint)', border: '0.5px solid var(--border-soft)' }}
              >
                <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: 'var(--gold-label)' }}>Podsumowanie</p>
                <p className="text-[14px] font-serif italic" style={{ color: 'var(--text-primary)' }}>
                  {isCustomNameMode ? customName : selectedSpecies?.name}
                  {variety && <span style={{ color: 'var(--gold-label-strong)' }}> · {variety}</span>}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                  {CATEGORY_BY_ID[categoryId]?.emoji} {CATEGORY_BY_ID[categoryId]?.name}
                  {location && <> · 📍 {location}</>}
                </p>
                {(purchaseDate || purchasePrice) && (
                  <p className="text-[11px]" style={{ color: 'var(--gold-label-strong)', marginTop: 4 }}>
                    🧾 Zakup:
                    {purchaseDate && <> {new Date(purchaseDate).toLocaleDateString('pl-PL')}</>}
                    {purchasePrice && <> · {formatPLN(Number(purchasePrice.replace(',', '.')))}</>}
                  </p>
                )}
                {selectedSpecies && (
                  <p className="text-[11px]" style={{ color: 'var(--gold-label)', marginTop: 4 }}>
                    Automatycznie {monthsFromSpecies(selectedSpecies).length} zadań w kalendarzu (
                    {monthsFromSpecies(selectedSpecies).map((m) => MONTHS_SHORT[m - 1]).join(', ')})
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="flex gap-2 px-5 py-3"
          style={{ borderTop: '0.5px solid var(--border-soft)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {step > 1 || identifyMode ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-2.5 rounded-full text-[13px] cursor-pointer"
              style={{ background: 'none', border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}
            >
              ← Wstecz
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full text-[13px] cursor-pointer"
              style={{ background: 'none', border: '0.5px solid var(--border-medium)', color: 'var(--text-secondary)' }}
            >
              Anuluj
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext || identifyMode}
              className="flex-1 py-2.5 rounded-full text-[13px] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                color: '#1A1208',
                border: 'none',
                fontWeight: 500,
                opacity: canNext && !identifyMode ? 1 : 0.4,
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
