# Ogród Marzeń

PWA — kalendarz ogrodniczy dla Myślenic (49.83°N 19.94°E) z asystentką **FLORA** (Claude AI przez Supabase Edge Function). Działa na telefonie i laptopie. Wszystkie dane lokalnie (`localStorage`) — bez konta, bez sync między urządzeniami.

## Funkcje

**3 zakładki (bottom nav):**
- 📅 **Kalendarz** — 14 domyślnych roślin × 12 miesięcy × 5 kolorowych kategorii (🧪 Chemia, 🌿 Naturalny, 🪴 Nawożenie, ✂️ Cięcie, 🛡️ Ochrona). Pogoda live z ikoną WMO + alerty mróz/wilgotność. Notification API.
- 🌿 **Przepisy** — 11 receptur domyślnych (gnojówka z pokrzywy, wrotycz, czosnek, tymianek, drożdże, skrzyp, soda+olej, bez czarny, gnojówka z obornika, odwar ze skrzypu, **nawóz z bananów**) z typami (Gnojówka / Oprysk / Nawóz / Odżywka / Inny). Filtry po typie. Dodaj własną z fotem + zastosowaniem do konkretnych roślin.
- 📔 **Dziennik** — kalendarz miesięczny, kliknij dzień → notatka co zrobiłeś. Złota kropka na dniach z wpisem.

**Detale roślin** (klik w nazwę dowolnej rośliny):
- Galeria max 3 zdjęć z datą (upload z kamery, poziomy scroll, fullscreen, delete)
- **Historia wydarzeń** (ostatnie 5): 💧 Podlano, 🪴 Nawieziono, 🧴 Oprysknięto, ✂️ Cięcie, 🌱 Sadzenie, 🌾 Zbiór, 📝 Inne — każde z datą i opcjonalną notatką
- Notatki per roślina (osobne od historii)
- Odmiany jako sub-rośliny (np. Róża → New Dawn / Knock Out) — każda z własną galerią i notatkami
- Kalendarz akcji parent (read-only)

**FAB "+"** (lewy dolny róg, nad bottom nav) — szybkie dodanie rośliny: nazwa + **odmiana** (opcjonalnie, np. "Pomidor · Cherry") + zdjęcie + miesiące. Szczegóły można dodać później w detalu.

**FLORA** (pływający przycisk prawy dolny):
- Asystentka AI, model `claude-sonnet-4-6` przez Supabase Edge Function `garden-flora`.
- Kontekst: data + **godzina**, miesiąc, pogoda live, ostatnie 5 notatek, **ostatnie 7 wpisów z dziennika**.
- Klucz Anthropic w secrecie Supabase (`ANTHROPIC_API_KEY`) — userzy nic nie konfigurują.

**Personalizacja:**
- Tło — domyślne `public/garden-bg.jpg` (pergola) lub własne zdjęcie (kompresowane do 1920px JPEG, zapis w localStorage). Podgląd miniaturki w ustawieniach.
- Pogoda — **geolokalizacja przeglądarki** → Twoja pogoda; jeśli brak zgody, fallback Myślenice.
- Lista roślin — checkboxy do ukrycia + dodawanie własnych akcji (multiselect miesięcy).

## localStorage keys

- `garden-notes` — notatki
- `garden-custom-plants` — własne rośliny + akcje
- `garden-removed-plants` — ukryte domyślne
- `garden-reminders-shown` — debounce dzienny powiadomień
- `garden-bg` — własne tło (base64 data URL, ~500KB)
- `garden-diary-YYYY-MM-DD` — wpis z konkretnego dnia (jeden klucz na dzień)
- `garden-location` — `{lat, lon, label, source}` z geolokalizacji
- `garden-plant-photos-<plantId>` — galeria zdjęć per roślina/odmiana (1024px JPEG, max 3 zdjęcia)
- `garden-plant-notes-<plantId>` — notatki per roślina/odmiana
- `garden-plant-events-<plantId>` — historia wydarzeń per roślina (podlano, nawieziono, oprysknięto, etc.)
- `garden-varieties` — `[{id, parent, name, addedAt}]`
- `garden-custom-recipes` — własne receptury

## Praca lokalna

```bash
npm install
npm run dev          # http://localhost:5173/ogrod/
npm run build
npm run preview
```

Dev serwer respektuje base `/ogrod/`. Żeby pracować na `/`: `VITE_BASE=/ npm run dev`.

## Edge Function (Supabase)

Plik: `supabase/functions/garden-flora/index.ts`. Deploy:

```bash
npx supabase login    # otwiera przeglądarkę, generuje access token
npx supabase functions deploy garden-flora --project-ref txqjjwanyfcpezgqbwou
```

Funkcja korzysta z `ANTHROPIC_API_KEY` w Supabase Function Secrets (już ustawione dla `lyra-chat` — współdzielone). `verify_jwt = false` w `supabase/config.toml`. CORS whitelist'a domeny GitHub Pages + localhost dev.

## Deploy

Push na `main` triggeruje workflow `.github/workflows/deploy.yml` → GitHub Pages. Live: https://marzenia42-png.github.io/ogrod/
