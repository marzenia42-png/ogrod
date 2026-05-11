import { useState, useEffect, useRef } from 'react';
import { callFlora } from './lib/floraApi.js';
import { listRecentDiaryEntries } from './Diary.jsx';
import { MONTHS } from './data/plants.js';

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
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 350);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const data = await callFlora({
        messages: trimHistoryForApi(next).map((m) => ({ role: m.role, content: m.content })),
        context: buildContext({ notes, weather, currentMonth }),
      });
      if (data?.error) {
        setError(`FLORA: ${data.error}`);
      } else if (data?.response) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
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
              placeholder="Zapytaj FLORA..."
              disabled={loading}
              className="flex-1 bg-transparent font-serif italic outline-none"
              style={{ color: '#F0E8D8', fontSize: '14px', padding: '6px 0' }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || loading}
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
                opacity: input.trim() && !loading ? 1 : 0.35,
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
