import { useState } from 'react';
import { RECIPES, NATURAL_RULES } from './data/recipes.js';

export default function Recipes() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="px-5 pb-10">
      <p className="text-[11px] tracking-[2px] uppercase mb-2" style={{ color: 'rgba(134, 239, 172, 0.7)' }}>
        Naturalne preparaty
      </p>
      <p className="text-[13px] font-serif italic mb-5" style={{ color: 'rgba(232, 221, 208, 0.6)' }}>
        Domowe przepisy bez chemii — sprawdzone w polskich warunkach.
      </p>

      <div className="flex flex-col gap-3">
        {RECIPES.map((r) => {
          const open = openId === r.id;
          return (
            <div
              key={r.id}
              className="rounded-[14px] overflow-hidden"
              style={{
                backgroundColor: 'rgba(26, 46, 26, 0.7)',
                border: '1px solid #22c55e',
                backdropFilter: 'blur(8px)',
              }}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : r.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
                style={{ background: 'none', border: 'none' }}
              >
                <span className="font-serif italic" style={{ color: '#86efac', fontSize: '16px' }}>
                  🌿 {r.name}
                </span>
                <span style={{ color: 'rgba(134, 239, 172, 0.6)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              {open && (
                <div className="px-4 pb-4 pt-1 flex flex-col gap-3" style={{ borderTop: '0.5px solid rgba(134, 239, 172, 0.2)' }}>
                  <div>
                    <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                      Na co działa
                    </p>
                    <p className="text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'rgba(232, 221, 208, 0.85)' }}>
                      {r.target}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                      Częstotliwość
                    </p>
                    <p className="text-[13.5px] font-serif italic leading-relaxed" style={{ color: 'rgba(232, 221, 208, 0.85)' }}>
                      {r.frequency}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] tracking-[2px] uppercase mb-1" style={{ color: 'rgba(134, 239, 172, 0.55)' }}>
                      Przepis
                    </p>
                    <ol className="flex flex-col gap-1.5">
                      {r.steps.map((s, i) => (
                        <li
                          key={i}
                          className="text-[13.5px] font-serif italic leading-relaxed flex gap-2"
                          style={{ color: 'rgba(232, 221, 208, 0.85)' }}
                        >
                          <span style={{ color: '#86efac', fontWeight: 500, minWidth: '20px' }}>{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="mt-8 rounded-[14px] p-4"
        style={{ backgroundColor: 'rgba(26, 46, 26, 0.7)', border: '0.5px solid rgba(134, 239, 172, 0.35)', backdropFilter: 'blur(8px)' }}
      >
        <p className="text-[11px] tracking-[2px] uppercase mb-3" style={{ color: 'rgba(134, 239, 172, 0.7)' }}>
          Zasady oprysków naturalnych
        </p>
        <ul className="flex flex-col gap-2">
          {NATURAL_RULES.map((rule, i) => (
            <li
              key={i}
              className="text-[13px] font-serif italic leading-relaxed flex gap-2"
              style={{ color: 'rgba(232, 221, 208, 0.75)' }}
            >
              <span style={{ color: '#86efac', marginTop: '6px' }}>•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
