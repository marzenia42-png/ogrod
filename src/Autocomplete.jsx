import { useState, useRef, useEffect } from 'react';

/**
 * Lekki autocomplete input.
 *
 * Props:
 *   value         — bieżąca wartość (controlled)
 *   onChange(s)   — wywołane przy każdej zmianie wartości (input + wybór sugestii)
 *   suggestions   — Array<string> źródło podpowiedzi
 *   placeholder   — placeholder dla pustego inputa
 *   autoFocus     — auto-fokus po mount
 *   className     — dodatkowe klasy na input
 *   style         — dodatkowy style na input
 *   maxItems      — limit pokazywanych podpowiedzi (default 8)
 *
 * Logika:
 *   - Dropdown otwiera się gdy input ma fokus I sugestii > 0
 *   - Sugestie filtrowane case-insensitive (includes), bieżąca wartość pomijana z listy
 *   - Wartość pusta → pokaż wszystkie maxItems (intro), z wartością → tylko match
 *   - Klik sugestii → onChange + blur
 *   - Escape → blur (zamyka dropdown)
 */
export default function Autocomplete({
  value = '',
  onChange,
  onEnter,
  suggestions = [],
  placeholder = '',
  autoFocus = false,
  className = '',
  style = {},
  maxItems = 8,
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  // Close dropdown on outside click (mobile-friendly).
  useEffect(() => {
    if (!focused) return;
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [focused]);

  const lower = value.trim().toLowerCase();
  const seen = new Set();
  const filtered = [];
  for (const raw of suggestions) {
    const s = String(raw || '').trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    if (key === lower) continue;
    if (lower && !key.includes(lower)) continue;
    seen.add(key);
    filtered.push(s);
    if (filtered.length >= maxItems) break;
  }
  const showDropdown = focused && filtered.length > 0;

  const handlePick = (s) => {
    onChange?.(s);
    setFocused(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setFocused(false); inputRef.current?.blur(); }
          else if (e.key === 'Enter' && onEnter) onEnter();
        }}
        placeholder={placeholder}
        className={className}
        style={{ width: '100%', ...style }}
        autoComplete="off"
      />
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '220px',
            overflowY: 'auto',
            background: '#1a1208',
            border: '0.5px solid rgba(201,169,110,0.4)',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
            zIndex: 1300,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handlePick(s); }}
              onTouchStart={(e) => { e.preventDefault(); handlePick(s); }}
              className="w-full text-left cursor-pointer"
              style={{
                background: 'none',
                border: 'none',
                borderBottom: '0.5px solid rgba(201,169,110,0.12)',
                color: 'rgba(240,232,216,0.9)',
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: '14px',
                padding: '9px 14px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
