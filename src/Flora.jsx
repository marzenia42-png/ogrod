import { useState, useEffect, useRef } from 'react';
import { callFlora } from './lib/floraApi.js';
import { listRecentDiaryEntries } from './Diary.jsx';
import { MONTHS, PLANTS } from './data/plants.js';
import { compressImage, addEvent } from './lib/plantStorage.js';

const CUSTOM_PLANTS_KEY = 'garden-custom-plants';

// Combined list of built-in + custom plants for the "Add to journal" picker.
// Read on-demand because customPlants live in App's state — we sync via localStorage.
function loadAllPlants() {
  const builtin = PLANTS.map((p) => ({ id: p.key, name: p.name }));
  let custom = [];
  try {
    const raw = localStorage.getItem(CUSTOM_PLANTS_KEY);
    if (raw) {
      custom = JSON.parse(raw).map((p) => ({
        id: p.id,
        name: p.variety ? `${p.name} · ${p.variety}` : p.name,
      }));
    }
  } catch { /* ignore */ }
  return [...builtin, ...custom];
}

const INITIAL_MESSAGE = 'Cześć! Jestem FLORA 🌿 Twój ogrodnik AI. Co dziś sadzimy, pryskamy lub przycinamy?';

const LeafIcon = ({ size = 24, stroke = '#0a0f0a', strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22V12" />
    <path d="M12 12c0-4 3-7 8-7 0 4-3 7-8 7z" />
    <path d="M12 12c0-4-3-7-8-7 0 4 3 7 8 7z" />
    <path d="M12 9c0-2.5 2-4.5 4.5-4.5 0 2.5-2 4.5-4.5 4.5z" />
  </svg>
);

function buildContext({ notes, weather, currentMonth }) {
  const now = new Date();
  const monthName = MONTHS[(currentMonth ?? now.getMonth() + 1) - 1] || '';
  const dateStr = now.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  const weatherCtx = weather?.current
    ? {
        temperature: weather.current.temperature_2m,
        humidity: weather.current.relative_humidity_2m,
        wind: weather.current.wind_speed_10m,
        minToday: weather.daily?.temperature_2m_min?.[0],
        maxToday: weather.daily?.temperature_2m_max?.[0],
        precipitation: weather.daily?.precipitation_sum?.[0],
      }
    : null;

  return {
    monthName,
    dateStr,
    timeStr,
    weather: weatherCtx,
    notes: (notes || []).slice(0, 5).map((n) => ({ date: n.date, text: n.text })),
    diary: listRecentDiaryEntries(7),
  };
}

// Claude API requires conversation to start with a user message and stay under reasonable size.
function trimHistoryForApi(messages, limit = 12) {
  let trimmed = messages.slice(-limit);
  while (trimmed.length > 0 && trimmed[0].role !== 'user') trimmed = trimmed.slice(1);
  return trimmed;
}

export default function Flora({ notes = [], weather, currentMonth }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: INITIAL_MESSAGE }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Foto-diagnostyka: zdjęcie dołączone do następnej wiadomości.
  const [imagePreview, setImagePreview] = useState(null); // pełny data URL
  const [imageData, setImageData] = useState(null);       // base64 bez prefiksu
  // Po odpowiedzi na zdjęcie: indeks ostatniej diagnozy + flow "Dodaj do dziennika".
  const [diagnosisAtIdx, setDiagnosisAtIdx] = useState(null);
  const [showPlantPicker, setShowPlantPicker] = useState(false);
  const [logToast, setLogToast] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 350);
  }, [open]);

  const handlePhotoPick = async (file) => {
    if (!file || !file.type?.startsWith('image/')) {
      setError('To nie jest zdjęcie');
      return;
    }
    try {
      // Kompresja do 1024px JPEG q=0.78 — bezpieczne ~150-400 KB po base64.
      const dataUrl = await compressImage(file, 1024, 0.78);
      const commaIdx = dataUrl.indexOf(',');
      setImagePreview(dataUrl);
      setImageData(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
      setError(null);
    } catch {
      setError('Nie udało się przygotować zdjęcia');
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageData(null);
  };

  const send = async () => {
    const text = input.trim();
    if (loading) return;
    if (!text && !imageData) return;

    // Default question when user sends image alone — gives FLORA prompt for diagnosis.
    const userText = text || 'Co widzisz na tym zdjęciu? Jaka choroba lub szkodnik? Polski preparat z dawkowaniem.';
    const next = [...messages, { role: 'user', content: userText }];
    setMessages(next);
    setInput('');
    const sentImage = imageData;
    const sentMediaType = 'image/jpeg';
    const wasImageRequest = !!sentImage;
    clearImage();
    setLoading(true);
    setError(null);
    try {
      const data = await callFlora({
        messages: trimHistoryForApi(next).map((m) => ({ role: m.role, content: m.content })),
        context: buildContext({ notes, weather, currentMonth }),
        ...(sentImage && { image_base64: sentImage, image_media_type: sentMediaType }),
      });
      if (data?.error) {
        setError(`FLORA: ${data.error}`);
      } else if (data?.response) {
        setMessages((prev) => {
          const updated = [...prev, { role: 'assistant', content: data.response, isDiagnosis: wasImageRequest }];
          if (wasImageRequest) setDiagnosisAtIdx(updated.length - 1);
          return updated;
        });
      } else {
        setError('FLORA milczy. Spróbuj jeszcze raz.');
      }
    } catch (e) {
      setError(e?.message || 'Błąd sieci');
    } finally {
      setLoading(false);
    }
  };

  const handleLogToDiary = (plantId, plantName) => {
    if (diagnosisAtIdx == null) return;
    const text = messages[diagnosisAtIdx]?.content || '';
    // Skróć dla event note — pełna diagnoza może być długa.
    const short = text.length > 280 ? text.slice(0, 277) + '…' : text;
    addEvent(plantId, 'oprysknieto', `Diagnoza FLORA: ${short}`);
    setLogToast(`Zapisano: ${plantName}`);
    setShowPlantPicker(false);
    setDiagnosisAtIdx(null);
    setTimeout(() => setLogToast(null), 2500);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Otwórz FLORA"
        className="flora-btn"
        style={{
          position: 'fixed',
          right: '20px',
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #7bc97b 0%, #C9A96E 100%)',
          cursor: 'pointer',
          zIndex: 999,
          display: 'grid',
          placeItems: 'center',
          padding: 0,
        }}
      >
        <LeafIcon size={30} stroke="#0a0f0a" strokeWidth={1.6} />
      </button>

      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          zIndex: 998,
        }}
      />

      <div
        role="dialog"
        aria-label="FLORA chat"
        aria-hidden={!open}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          marginInline: 'auto',
          maxWidth: '480px',
          height: '80vh',
          maxHeight: '720px',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)',
          pointerEvents: open ? 'auto' : 'none',
          backgroundColor: '#0a0f0a',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          border: '1px solid rgba(123, 201, 123, 0.25)',
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 pt-5 pb-3"
          style={{ borderBottom: '1px solid rgba(123, 201, 123, 0.15)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flora-avatar"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7bc97b, #C9A96E)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <LeafIcon size={18} stroke="#0a0f0a" strokeWidth={1.8} />
            </div>
            <div>
              <p className="font-serif italic" style={{ fontSize: '18px', color: '#7bc97b', lineHeight: 1.1 }}>FLORA</p>
              <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(123, 201, 123, 0.5)', marginTop: '2px' }}>
                ogrodnik AI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Zamknij"
            style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', color: 'rgba(123, 201, 123, 0.55)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {messages.map((m, i) => {
            const isLastDiagnosis = m.role === 'assistant' && m.isDiagnosis && i === diagnosisAtIdx;
            return (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'assistant' ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div
                  className="font-serif italic px-4 py-2.5 rounded-2xl"
                  style={m.role === 'assistant'
                    ? {
                        backgroundColor: 'rgba(123, 201, 123, 0.08)',
                        border: '0.5px solid rgba(123, 201, 123, 0.22)',
                        color: 'rgba(232, 221, 208, 0.92)',
                        fontSize: '14px',
                        lineHeight: 1.55,
                      }
                    : {
                        background: 'linear-gradient(135deg, rgba(123, 201, 123, 0.22), rgba(201, 169, 110, 0.18))',
                        color: '#F0E8D8',
                        fontSize: '14px',
                        lineHeight: 1.55,
                      }
                  }
                >
                  {m.content}
                </div>

                {isLastDiagnosis && !showPlantPicker && (
                  <button
                    type="button"
                    onClick={() => setShowPlantPicker(true)}
                    className="self-start cursor-pointer px-3 py-1.5 rounded-full text-[11px] tracking-wide"
                    style={{
                      background: 'linear-gradient(135deg, #4CAF50, #2e7d32)',
                      color: '#0a0f0a',
                      border: 'none',
                      fontWeight: 500,
                    }}
                  >
                    + Dodaj do dziennika
                  </button>
                )}

                {isLastDiagnosis && showPlantPicker && (
                  <div
                    className="self-start rounded-xl p-3"
                    style={{
                      background: 'rgba(76, 175, 80, 0.08)',
                      border: '0.5px solid rgba(76, 175, 80, 0.35)',
                      maxWidth: '100%',
                    }}
                  >
                    <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(134, 239, 172, 0.7)' }}>
                      Do której rośliny?
                    </p>
                    <div
                      className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto"
                    >
                      {loadAllPlants().map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleLogToDiary(p.id, p.name)}
                          className="px-2.5 py-1 rounded-full text-[11px] cursor-pointer"
                          style={{
                            background: 'rgba(0,0,0,0.4)',
                            border: '0.5px solid rgba(134, 239, 172, 0.3)',
                            color: '#86efac',
                          }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPlantPicker(false)}
                      className="mt-2 text-[10px] cursor-pointer"
                      style={{ background: 'none', border: 'none', color: 'rgba(232,221,208,0.5)', padding: 0 }}
                    >
                      anuluj
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div
              className="font-serif italic px-4 py-2.5 rounded-2xl"
              style={{
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(123, 201, 123, 0.08)',
                border: '0.5px solid rgba(123, 201, 123, 0.22)',
                color: 'rgba(123, 201, 123, 0.7)',
                fontSize: '14px',
              }}
            >
              FLORA myśli<span className="flora-dots">…</span>
            </div>
          )}
          {error && (
            <div
              className="px-4 py-2.5 rounded-2xl"
              style={{
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(232, 100, 100, 0.1)',
                border: '0.5px solid rgba(232, 100, 100, 0.3)',
                color: '#e89898',
                fontSize: '12px',
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          className="px-4 pt-3"
          style={{
            borderTop: '1px solid rgba(123, 201, 123, 0.15)',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          {/* Attached image preview — over the input row */}
          {imagePreview && (
            <div
              className="flex items-center gap-2 mb-2 pl-2 pr-1 py-1 rounded-xl"
              style={{ background: 'rgba(123, 201, 123, 0.08)', border: '0.5px solid rgba(123, 201, 123, 0.25)' }}
            >
              <img
                src={imagePreview}
                alt=""
                style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 6 }}
              />
              <span className="flex-1 text-[11px] font-serif italic" style={{ color: 'rgba(232, 221, 208, 0.75)' }}>
                Zdjęcie do diagnozy — naciśnij wyślij
              </span>
              <button
                type="button"
                onClick={clearImage}
                aria-label="Usuń zdjęcie"
                className="cursor-pointer"
                style={{ background: 'none', border: 'none', color: 'rgba(232, 221, 208, 0.55)', fontSize: '18px', lineHeight: 1, padding: '4px 8px' }}
              >
                ×
              </button>
            </div>
          )}

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => { handlePhotoPick(e.target.files?.[0]); e.target.value = ''; }}
            style={{ display: 'none' }}
          />

          <div
            className="flex items-center gap-2 rounded-full px-3 py-2"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(123, 201, 123, 0.25)' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={imageData ? 'Dodaj pytanie albo wyślij samo zdjęcie...' : 'Zapytaj FLORA...'}
              disabled={loading}
              className="flex-1 bg-transparent font-serif italic outline-none pl-2"
              style={{ color: '#F0E8D8', fontSize: '14px', padding: '6px 0 6px 8px' }}
            />

            {/* Camera button — opens file picker / camera */}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={loading || !!imageData}
              aria-label="Dodaj zdjęcie"
              style={{
                background: 'rgba(123, 201, 123, 0.12)',
                border: '0.5px solid rgba(123, 201, 123, 0.35)',
                width: 34,
                height: 34,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                color: '#7bc97b',
                opacity: loading || imageData ? 0.4 : 1,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>

            <button
              type="button"
              onClick={send}
              disabled={(!input.trim() && !imageData) || loading}
              aria-label="Wyślij"
              style={{
                background: 'linear-gradient(135deg, #7bc97b, #C9A96E)',
                border: 'none',
                width: 34,
                height: 34,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                opacity: ((input.trim() || imageData) && !loading) ? 1 : 0.35,
                transition: 'opacity 0.2s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0f0a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {logToast && (
        <div
          className="fixed left-1/2 px-4 py-2 rounded-full text-xs"
          style={{
            transform: 'translateX(-50%)',
            bottom: 'calc(20px + env(safe-area-inset-bottom))',
            backgroundColor: '#0a0f0a',
            border: '1px solid rgba(76, 175, 80, 0.5)',
            color: '#86efac',
            zIndex: 1200,
          }}
        >
          {logToast}
        </div>
      )}
    </>
  );
}
