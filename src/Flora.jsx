import { useState, useEffect, useRef } from 'react';

const KEY_STORAGE = 'garden-claude-key';

const MONTHS = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
];

const INITIAL_MESSAGE = 'Cześć! Jestem FLORA 🌿 Twój ogrodnik AI. Co dziś sadzimy, pryskamy lub przycinamy?';

const PERSONA = `Jesteś FLORA — przyjacielska, kompetentna asystentka ogrodnicza dla domowego ogrodu w Myślenicach (południowa Polska, region górski, strefa 6a/6b).

Zasady odpowiedzi:
- Mów po polsku, ciepło, konkretnie. Bez markdownu, bez bulletów.
- 2-4 zdania. Najpierw odpowiedź, potem jedna praktyczna sugestia (preparat / termin / technika).
- Polecaj realne preparaty dostępne w PL: Topsin M, Miedzian, Score, Switch, Signum, Ridomil, Polyversum, Karate Zeon, Mospilan, siarczan miedzi, siarczan amonu, mocznik.
- Bądź konkretna o terminach (faza fenologiczna lub konkretny tydzień).
- Gdy nie wiesz — przyznaj się, zapytaj o szczegół (zdjęcie, objaw, wiek rośliny).
- Bezpieczeństwo: nie polecaj substancji wycofanych (np. Bravo 500, Dithane M-45 z mankozebem w sadach domowych).`;

const LeafIcon = ({ size = 24, stroke = '#0a0f0a', strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22V12" />
    <path d="M12 12c0-4 3-7 8-7 0 4-3 7-8 7z" />
    <path d="M12 12c0-4-3-7-8-7 0 4 3 7 8 7z" />
    <path d="M12 9c0-2.5 2-4.5 4.5-4.5 0 2.5-2 4.5-4.5 4.5z" />
  </svg>
);

export default function Flora({ notes = [], weather, currentMonth }) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; }
  });
  const [keyDraft, setKeyDraft] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', content: INITIAL_MESSAGE }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && apiKey && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [open, apiKey]);

  const saveKey = () => {
    const trimmed = keyDraft.trim();
    if (!trimmed) return;
    try { localStorage.setItem(KEY_STORAGE, trimmed); } catch { /* storage full or blocked */ }
    setApiKey(trimmed);
    setKeyDraft('');
    setShowSettings(false);
  };

  const removeKey = () => {
    try { localStorage.removeItem(KEY_STORAGE); } catch { /* ignore */ }
    setApiKey('');
  };

  const buildSystem = () => {
    const monthName = MONTHS[((currentMonth ?? new Date().getMonth() + 1) - 1)] || '';
    const dateStr = new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    let ctx = `Dziś: ${dateStr}. Bieżący miesiąc: ${monthName}.`;
    if (weather?.current) {
      ctx += `\nPogoda Myślenice (live z Open-Meteo, 49.83°N 19.94°E): ${Math.round(weather.current.temperature_2m)}°C, wilgotność ${weather.current.relative_humidity_2m}%, wiatr ${Math.round(weather.current.wind_speed_10m)} km/h.`;
      if (weather.daily?.temperature_2m_min?.[0] != null) {
        ctx += ` Prognoza dziś: min ${Math.round(weather.daily.temperature_2m_min[0])}°C, max ${Math.round(weather.daily.temperature_2m_max[0])}°C`;
        if (weather.daily.precipitation_sum?.[0] > 0) {
          ctx += `, opady ${weather.daily.precipitation_sum[0]} mm`;
        }
        ctx += '.';
      }
    }
    const recent = notes.slice(0, 5);
    if (recent.length > 0) {
      ctx += `\n\nOstatnie notatki ogrodnika (kontekst — odwołuj się gdy ważne):\n` +
        recent.map((n) => `- (${n.date}) ${n.text}`).join('\n');
    }
    return [
      { type: 'text', text: PERSONA, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: ctx },
    ];
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !apiKey) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          system: buildSystem(),
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        let hint = '';
        if (res.status === 401) hint = ' Klucz nieprawidłowy lub wygasł.';
        else if (res.status === 429) hint = ' Limit zapytań — poczekaj chwilę.';
        else if (res.status >= 500) hint = ' Problem po stronie Anthropic.';
        setError(`Błąd API (${res.status}).${hint}`);
        if (detail) console.warn('FLORA API error:', detail);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const reply = typeof data?.content?.[0]?.text === 'string' ? data.content[0].text.trim() : '';
      if (reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } else {
        setError('FLORA milczy. Spróbuj jeszcze raz.');
      }
    } catch (e) {
      setError(e?.message || 'Błąd sieci');
    } finally {
      setLoading(false);
    }
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
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSettings((s) => !s)}
              aria-label="Ustawienia"
              style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', color: showSettings ? '#7bc97b' : 'rgba(123, 201, 123, 0.55)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
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
        </div>

        {showSettings && (
          <div
            className="px-6 py-4"
            style={{ backgroundColor: 'rgba(123, 201, 123, 0.05)', borderBottom: '1px solid rgba(123, 201, 123, 0.15)' }}
          >
            <p style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(123, 201, 123, 0.6)', marginBottom: '8px' }}>
              Klucz Anthropic API
            </p>
            <p className="font-serif italic" style={{ fontSize: '12px', color: 'rgba(232, 221, 208, 0.55)', marginBottom: '12px', lineHeight: 1.5 }}>
              Pobierz na console.anthropic.com → Settings → API Keys. Klucz zostaje na tym urządzeniu (localStorage), nie wysyłamy go nigdzie poza Anthropic.
            </p>
            {apiKey ? (
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '12px', fontFamily: 'ui-monospace, monospace', color: '#7bc97b' }}>
                  {apiKey.slice(0, 12)}…{apiKey.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={removeKey}
                  style={{ fontSize: '11px', color: 'rgba(232, 120, 120, 0.85)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Usuń
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveKey(); }}
                  placeholder="sk-ant-api03-..."
                  className="flex-1 bg-transparent px-3 py-2 rounded-lg outline-none"
                  style={{ border: '0.5px solid rgba(123, 201, 123, 0.3)', color: '#7bc97b', fontSize: '12px', fontFamily: 'ui-monospace, monospace' }}
                />
                <button
                  type="button"
                  onClick={saveKey}
                  disabled={!keyDraft.trim()}
                  className="px-4 rounded-lg cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #7bc97b, #C9A96E)',
                    color: '#0a0f0a',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    opacity: keyDraft.trim() ? 1 : 0.4,
                  }}
                >
                  Zapisz
                </button>
              </div>
            )}
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className="font-serif italic px-4 py-2.5 rounded-2xl"
              style={m.role === 'assistant'
                ? {
                    alignSelf: 'flex-start',
                    maxWidth: '85%',
                    backgroundColor: 'rgba(123, 201, 123, 0.08)',
                    border: '0.5px solid rgba(123, 201, 123, 0.22)',
                    color: 'rgba(232, 221, 208, 0.92)',
                    fontSize: '14px',
                    lineHeight: 1.55,
                  }
                : {
                    alignSelf: 'flex-end',
                    maxWidth: '85%',
                    background: 'linear-gradient(135deg, rgba(123, 201, 123, 0.22), rgba(201, 169, 110, 0.18))',
                    color: '#F0E8D8',
                    fontSize: '14px',
                    lineHeight: 1.55,
                  }
              }
            >
              {m.content}
            </div>
          ))}
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
          {!apiKey && (
            <div
              className="font-serif italic text-center"
              style={{ alignSelf: 'center', maxWidth: '85%', fontSize: '12px', color: 'rgba(123, 201, 123, 0.55)', marginTop: '8px' }}
            >
              Dodaj klucz Anthropic w ustawieniach (ikona koła zębatego), żeby zacząć rozmowę.
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
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(123, 201, 123, 0.25)' }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={apiKey ? 'Zapytaj FLORA...' : 'Najpierw dodaj klucz API'}
              disabled={!apiKey || loading}
              className="flex-1 bg-transparent font-serif italic outline-none"
              style={{ color: '#F0E8D8', fontSize: '14px', padding: '6px 0' }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || loading || !apiKey}
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
                opacity: input.trim() && apiKey && !loading ? 1 : 0.35,
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
    </>
  );
}
