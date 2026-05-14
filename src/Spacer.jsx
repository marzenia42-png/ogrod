import { useState, useRef } from 'react';
import { compressImage } from './lib/plantStorage.js';
import { callFloraIdentify } from './lib/floraApi.js';
import { CATEGORY_BY_ID } from './data/plantCategories.js';

/**
 * Spacer mode — szybka identyfikacja rośliny w terenie.
 * Flow: zdjęcie -> FLORA identify -> wynik + "Dodaj do ogrodu" lub zamknij.
 * Zdjęcie identyfikacyjne NIE jest zapisywane do galerii — tylko do propozycji.
 */
export default function Spacer({ onClose, onAddToGarden }) {
  const fileRef = useRef(null);
  const [phase, setPhase] = useState('start'); // start | loading | result | error
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handlePick = async (file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    setPhase('loading'); setError(null); setResults([]);
    try {
      const dataUrl = await compressImage(file, 1024, 0.78);
      setPreview(dataUrl);
      const commaIdx = dataUrl.indexOf(',');
      const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
      const res = await callFloraIdentify(b64, 'image/jpeg');
      const arr = Array.isArray(res?.identifications) ? res.identifications : [];
      setResults(arr);
      setPhase('result');
    } catch (e) {
      setError(e?.message || 'FLORA nie odpowiada. Sprawdź połączenie.');
      setPhase('error');
    }
  };

  const pickFile = () => fileRef.current?.click();

  const top = results[0];

  return (
    <div
      role="dialog"
      aria-label="Spacer z aparatem"
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 1100, background: 'rgba(0,0,0,0.92)', animation: 'screenEnter 0.2s ease' }}
    >
      <header className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.15)' }}>
        <h2 className="font-serif italic" style={{ fontSize: 22, color: '#E8C77E' }}>📸 Spacer z aparatem</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Zamknij"
          style={{ background: 'rgba(255,255,255,0.10)', color: '#F0E8D8', border: 'none', width: 36, height: 36, borderRadius: 12, fontSize: 18, cursor: 'pointer' }}
        >×</button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 max-w-lg mx-auto w-full">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => { handlePick(e.target.files?.[0]); e.target.value = ''; }}
          style={{ display: 'none' }}
        />

        {phase === 'start' && (
          <div className="text-center pt-8">
            <div style={{ fontSize: 80, lineHeight: 1 }}>🌿</div>
            <h3 style={{ fontSize: 20, color: '#F0E8D8', marginTop: 16, fontWeight: 600 }}>Co to za roślina?</h3>
            <p style={{ fontSize: 14, color: 'rgba(240,232,216,0.7)', marginTop: 8, lineHeight: 1.5 }}>
              Zrób zdjęcie lub wybierz z galerii.<br/>FLORA rozpozna nazwę i powie czy jadalna.
            </p>
            <button
              type="button"
              onClick={pickFile}
              style={{
                marginTop: 24, padding: '14px 24px', borderRadius: 999,
                background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                color: '#1A1208', fontWeight: 600, fontSize: 15,
                border: 'none', cursor: 'pointer', width: '100%',
              }}
            >📸 Wybierz zdjęcie</button>
            <p style={{ fontSize: 12, color: 'rgba(240,232,216,0.5)', marginTop: 12 }}>
              Zdjęcie nie zapisuje się do galerii.
            </p>
          </div>
        )}

        {phase === 'loading' && (
          <div className="text-center pt-8">
            {preview && (
              <img src={preview} alt="" style={{ maxWidth: 240, maxHeight: 240, borderRadius: 14, margin: '0 auto', display: 'block' }} />
            )}
            <p style={{ fontSize: 15, color: '#F0E8D8', marginTop: 20 }}>FLORA analizuje<span className="flora-dots">.</span><span className="flora-dots" style={{ animationDelay: '0.15s' }}>.</span><span className="flora-dots" style={{ animationDelay: '0.30s' }}>.</span></p>
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center pt-8">
            <div style={{ fontSize: 60 }}>😕</div>
            <p style={{ fontSize: 15, color: '#F0E8D8', marginTop: 16 }}>{error}</p>
            <button
              type="button"
              onClick={() => setPhase('start')}
              style={{ marginTop: 16, padding: '10px 20px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', color: '#F0E8D8', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer' }}
            >Spróbuj ponownie</button>
          </div>
        )}

        {phase === 'result' && (
          <div>
            {preview && (
              <img src={preview} alt="" style={{ width: '100%', maxHeight: 280, borderRadius: 14, objectFit: 'cover' }} />
            )}
            {!top && (
              <p style={{ fontSize: 15, color: '#F0E8D8', marginTop: 20, textAlign: 'center' }}>
                🌿 Nie rozpoznałam tej rośliny. Spróbuj zrobić zdjęcie liścia z bliska, w lepszym świetle.
              </p>
            )}
            {top && (
              <>
                <div className="mt-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,169,110,0.4)' }}>
                  <p style={{ fontSize: 13, color: 'rgba(240,232,216,0.6)' }}>Najpewniej:</p>
                  <p className="font-serif italic" style={{ fontSize: 24, color: '#E8C77E', marginTop: 4 }}>
                    {top.name}{top.variety ? ` · ${top.variety}` : ''}
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(240,232,216,0.75)', marginTop: 4 }}>
                    Pewność: {Math.round((Number(top.confidence) || 0) * 100)}%
                    {top.categoryId && CATEGORY_BY_ID[top.categoryId] && (
                      <> · {CATEGORY_BY_ID[top.categoryId].emoji} {CATEGORY_BY_ID[top.categoryId].name}</>
                    )}
                  </p>
                </div>
                {results.length > 1 && (
                  <div className="mt-3">
                    <p style={{ fontSize: 13, color: 'rgba(240,232,216,0.55)' }}>Możliwe alternatywy:</p>
                    {results.slice(1, 3).map((alt, idx) => (
                      <p key={idx} style={{ fontSize: 14, color: 'rgba(240,232,216,0.8)', marginTop: 4 }}>
                        • {alt.name}{alt.variety ? ` · ${alt.variety}` : ''} ({Math.round((Number(alt.confidence) || 0) * 100)}%)
                      </p>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => onAddToGarden?.({ name: top.name, categoryId: top.categoryId, variety: top.variety })}
                    style={{
                      padding: '14px 20px', borderRadius: 999,
                      background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                      color: '#1A1208', fontWeight: 600, fontSize: 15,
                      border: 'none', cursor: 'pointer',
                    }}
                  >🌱 Dodaj do ogrodu</button>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: '12px 20px', borderRadius: 999,
                      background: 'transparent', color: 'rgba(240,232,216,0.85)',
                      border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 14,
                    }}
                  >Zamknij</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
