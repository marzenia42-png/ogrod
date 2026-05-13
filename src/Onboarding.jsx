// Modal powitalny — pokazywany RAZ na pierwszym otwarciu aplikacji.
// Flaga w localStorage 'garden-onboarding-seen' = 'true' po kliknięciu "Zaczynamy".
//
// Dlaczego nie carousel: Beata ma to przeczytać raz, więc wszystko na jednym ekranie
// dla szybkości. 3 piktogramy + krótki opis każdej z kluczowych funkcji.

export const ONBOARDING_KEY = 'garden-onboarding-seen';

export function hasSeenOnboarding() {
  try { return localStorage.getItem(ONBOARDING_KEY) === 'true'; }
  catch { return true; } // brak storage = nie blokuj
}

export function markOnboardingSeen() {
  try { localStorage.setItem(ONBOARDING_KEY, 'true'); }
  catch { /* ignore */ }
}

export default function Onboarding({ onClose }) {
  const handleStart = () => {
    markOnboardingSeen();
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{
        zIndex: 2000,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: '440px',
          maxHeight: '92vh',
          backgroundColor: 'var(--surface-modal)',
          border: '1px solid var(--border-strong)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(201, 169, 110, 0.15)',
          overflow: 'hidden',
        }}
      >
        <div
          className="overflow-y-auto px-6 pt-7 pb-5 flex flex-col gap-5"
          style={{ flex: 1 }}
        >
          <div className="text-center">
            <div
              className="mx-auto mb-3 flex items-center justify-center"
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7bc97b 0%, #C9A96E 100%)',
                boxShadow: '0 4px 14px rgba(123, 201, 123, 0.35)',
              }}
            >
              <span style={{ fontSize: 36, lineHeight: 1 }}>🌿</span>
            </div>
            <h2
              className="font-serif italic"
              style={{
                fontSize: '28px',
                color: 'var(--gold)',
                lineHeight: 1.1,
                marginBottom: '6px',
              }}
            >
              Cześć Beato!
            </h2>
            <p
              className="font-serif italic"
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              Witaj w Twoim <strong style={{ color: 'var(--gold)', fontStyle: 'normal' }}>Ogrodzie Marzeń</strong>.
              <br />
              Oto jak zacząć:
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <OnboardItem
              emoji="🌱"
              title="Dodaj swoje rośliny"
              text={(
                <>
                  Złoty przycisk <span style={{ color: 'var(--gold)', fontWeight: 600 }}>„+"</span> w lewym dolnym rogu otwiera szybki kreator.
                  Wybierz kategorię, gatunek, datę i cenę zakupu.
                  Masz zdjęcie? FLORA spróbuje rozpoznać roślinę za Ciebie.
                </>
              )}
            />

            <OnboardItem
              emoji="🌿"
              title="Pytaj FLORA o wszystko"
              text={(
                <>
                  Zielony liść w prawym dolnym rogu to <strong style={{ color: '#7bc97b' }}>FLORA</strong> — asystentka AI.
                  Możesz zapytać o cokolwiek lub wysłać jej zdjęcie:
                  <em> „Co to za roślina?"</em>, <em>„Co tu jest chore?"</em>, <em>„Kiedy podlać?"</em>.
                </>
              )}
            />

            <OnboardItem
              emoji="📅"
              title="Kalendarz i dziennik"
              text={(
                <>
                  W zakładce <strong>Kalendarz</strong> zobaczysz co warto zrobić w tym miesiącu — oprysk, cięcie, nawożenie.
                  W <strong>Dzienniku</strong> zapisujesz dzień po dniu co już zrobiłaś.
                </>
              )}
            />

            <OnboardItem
              emoji="🌦️"
              title="Pogoda i alerty"
              text={(
                <>
                  Aplikacja sama sprawdza pogodę w Twojej lokalizacji.
                  Jeśli włączysz powiadomienia, dam znać o mrozie, suszy lub ryzyku chorób.
                </>
              )}
            />
          </div>

          <p
            className="font-serif italic text-center"
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            Wszystko zapisuje się lokalnie — Twoje dane zostają na Twoim telefonie.
            <br />
            Możesz wrócić do tej pomocy z menu ustawień ⚙️.
          </p>
        </div>

        <div
          className="px-6 py-4"
          style={{
            borderTop: '0.5px solid var(--border-soft)',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-3 rounded-full cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #C9A96E 0%, #b89556 100%)',
              color: '#1A1208',
              border: 'none',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              boxShadow: '0 4px 12px rgba(201, 169, 110, 0.35)',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Zaczynamy →
          </button>
        </div>
      </div>
    </div>
  );
}

function OnboardItem({ emoji, title, text }) {
  return (
    <div
      className="flex items-start gap-3 px-3 py-3 rounded-xl"
      style={{
        background: 'var(--surface-tint)',
        border: '0.5px solid var(--border-soft)',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'var(--surface-faint)',
          border: '0.5px solid var(--border-medium)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 20,
        }}
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="font-serif italic"
          style={{
            fontSize: '15px',
            color: 'var(--gold)',
            fontWeight: 500,
            marginBottom: '3px',
            lineHeight: 1.2,
          }}
        >
          {title}
        </p>
        <p
          className="font-serif italic"
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
