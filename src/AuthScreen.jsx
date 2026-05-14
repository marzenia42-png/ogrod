import { useState } from 'react';
import { supabase } from './lib/supabaseClient.js';

const MIN_PASSWORD = 6;

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || '').trim());
}

export default function AuthScreen({ bg }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const reset = () => {
    setError(null); setInfo(null);
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    reset();
    if (!isValidEmail(email)) return setError('Niepoprawny email');
    if (!password) return setError('Wpisz hasło');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setError(error.message || 'Logowanie nie powiodło się');
  };

  const handleSignup = async (e) => {
    e?.preventDefault();
    reset();
    if (!isValidEmail(email)) return setError('Niepoprawny email');
    if (!password || password.length < MIN_PASSWORD) return setError(`Hasło min. ${MIN_PASSWORD} znaków`);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: name.trim() ? { full_name: name.trim() } : undefined,
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + (window.location.pathname || '/') : undefined,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message || 'Rejestracja nie powiodła się');
      return;
    }
    if (data?.user && !data.session) {
      setInfo('Sprawdź email i kliknij link aktywacyjny. Po aktywacji zaloguj się.');
      setMode('login');
    } else if (data?.session) {
      setInfo('Konto utworzone! Zalogowano.');
    }
  };

  const handleReset = async (e) => {
    e?.preventDefault();
    reset();
    if (!isValidEmail(email)) return setError('Niepoprawny email');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? window.location.origin + (window.location.pathname || '/') : undefined,
    });
    setLoading(false);
    if (error) {
      setError(error.message || 'Reset hasła nie powiódł się');
      return;
    }
    setInfo('Sprawdź email — link do resetu hasła został wysłany.');
    setMode('login');
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, overflowY: 'auto',
        zIndex: 2000,
      }}
    >
      {bg && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 0,
              backgroundImage: `url(${bg})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}
          />
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 0,
              backgroundColor: 'rgba(13,12,10,0.55)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />
        </>
      )}
      <div
        className="relative max-w-md mx-auto px-5 py-8 flex flex-col min-h-svh"
        style={{ zIndex: 1, paddingTop: 'calc(env(safe-area-inset-top) + 40px)' }}
      >
        <div className="text-center mb-8">
          <p className="font-serif italic" style={{ fontSize: 28, color: '#F0E8D8', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>🌿</p>
          <h1 className="font-serif italic" style={{ fontSize: 36, color: 'var(--gold)', letterSpacing: 1, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>Ogród Marzeń</h1>
          <p style={{ fontSize: 14, color: 'rgba(240,232,216,0.85)', marginTop: 6, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
            Twój ogrodniczy asystent
          </p>
        </div>

        <div
          className="rounded-3xl p-6 mx-auto w-full"
          style={{
            maxWidth: 380,
            background: 'rgba(13,12,10,0.65)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid var(--border-medium)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          }}
        >
          {mode !== 'reset' && (
            <div className="flex gap-1.5 mb-5 rounded-full p-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-soft)' }}>
              {[
                { id: 'login',  label: 'Zaloguj się' },
                { id: 'signup', label: 'Zarejestruj się' },
              ].map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setMode(m.id); reset(); }}
                    className="flex-1 cursor-pointer"
                    style={{
                      padding: '8px 10px', borderRadius: 999, fontSize: 14, fontWeight: 600,
                      background: active ? 'linear-gradient(135deg, #C9A96E, #b89556)' : 'transparent',
                      color: active ? '#1A1208' : 'rgba(240,232,216,0.85)',
                      border: 'none',
                    }}
                  >{m.label}</button>
                );
              })}
            </div>
          )}

          {mode === 'reset' && (
            <p className="font-serif italic mb-4" style={{ fontSize: 18, color: 'var(--gold)' }}>Resetuj hasło</p>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleReset}>
            <label style={{ fontSize: 13, color: 'rgba(240,232,216,0.75)' }}>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                lang="pl"
                placeholder="twoj@email.pl"
                className="mt-1 w-full px-3.5 py-2.5 rounded-lg"
                style={{
                  fontSize: 15,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1.5px solid var(--border-medium)',
                  color: '#F0E8D8',
                  outline: 'none',
                }}
              />
            </label>

            {mode !== 'reset' && (
              <label style={{ fontSize: 13, color: 'rgba(240,232,216,0.75)', display: 'block', marginTop: 12 }}>
                Hasło {mode === 'signup' && <span style={{ color: 'rgba(240,232,216,0.55)' }}>(min. {MIN_PASSWORD} znaków)</span>}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-lg"
                  style={{
                    fontSize: 15,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid var(--border-medium)',
                    color: '#F0E8D8',
                    outline: 'none',
                  }}
                />
              </label>
            )}

            {mode === 'signup' && (
              <label style={{ fontSize: 13, color: 'rgba(240,232,216,0.75)', display: 'block', marginTop: 12 }}>
                Imię (opcjonalne)
                <input
                  type="text"
                  lang="pl"
                  spellCheck={true}
                  autoCorrect="on"
                  autoCapitalize="words"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Beata"
                  className="mt-1 w-full px-3.5 py-2.5 rounded-lg"
                  style={{
                    fontSize: 15,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid var(--border-medium)',
                    color: '#F0E8D8',
                    outline: 'none',
                  }}
                />
              </label>
            )}

            {error && (
              <p style={{ fontSize: 13, color: '#FCA5A5', marginTop: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.35)' }}>
                {error}
              </p>
            )}
            {info && (
              <p style={{ fontSize: 13, color: '#86efac', marginTop: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.35)' }}>
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 cursor-pointer"
              style={{
                padding: '13px 16px', borderRadius: 999, fontSize: 15, fontWeight: 700,
                background: 'linear-gradient(135deg, #C9A96E, #b89556)',
                color: '#1A1208', border: 'none',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(201,169,110,0.35)',
              }}
            >
              {loading
                ? 'Czekaj...'
                : mode === 'login' ? 'Zaloguj się'
                : mode === 'signup' ? 'Utwórz konto'
                : 'Wyślij link resetu'}
            </button>
          </form>

          <div className="mt-4 text-center">
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => { setMode('reset'); reset(); }}
                style={{ background: 'none', border: 'none', color: 'rgba(240,232,216,0.7)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
              >Nie pamiętam hasła</button>
            )}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => { setMode('login'); reset(); }}
                style={{ background: 'none', border: 'none', color: 'rgba(240,232,216,0.7)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
              >← Wróć do logowania</button>
            )}
          </div>
        </div>

        <p className="text-center mt-6" style={{ fontSize: 12, color: 'rgba(240,232,216,0.55)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          Twoje dane są bezpieczne. Dostęp z każdego urządzenia.
        </p>
      </div>
    </div>
  );
}
