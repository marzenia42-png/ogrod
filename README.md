# Ogród Marzeń

PWA z kalendarzem ogrodniczym dla Myślenic (49.83°N 19.94°E) + asystentka **FLORA** (Claude AI). Działa na telefonie i laptopie. Wszystkie dane (notatki, własne akcje, ukryte rośliny, klucz API) trzymane w `localStorage` — per urządzenie, bez backendu.

## Funkcje

- Widok miesięczny z 14 roślinami pogrupowanymi po: Opryski / Cięcie / Nawożenie / Sadzenie / Profilaktyka
- Pogoda live z Open-Meteo + alerty mróz / wysoka wilgotność
- Notatki ogrodnika
- Dodawanie własnych akcji + usuwanie / przywracanie domyślnych roślin
- Przypomnienia przez Notification API (gdy aplikacja otwarta)
- **FLORA** — pływający przycisk → chat z Claude AI; zna pogodę, miesiąc, ostatnie notatki. Klucz API user wpisuje w ustawieniach (sk-ant-…).
- Offline-ready (service worker, Workbox)

## Praca lokalna

```bash
npm install
npm run dev          # http://localhost:5173/ogrod/
npm run build
npm run preview
```

Dev serwer respektuje base path `/ogrod/`. Żeby pracować na `/` (np. test PWA na root), uruchom: `VITE_BASE=/ npm run dev`.

## Deploy na GitHub Pages

1. Utwórz repo `ogrod` na GitHub (publiczne lub prywatne — Pages działa na obu jeśli masz odpowiedni plan).
2. Wypchnij ten katalog:
   ```bash
   git remote add origin git@github.com:<user>/ogrod.git
   git push -u origin main
   ```
3. W repo: **Settings → Pages → Source: GitHub Actions**.
4. Workflow `.github/workflows/deploy.yml` ruszy automatycznie przy każdym pushu na `main`. URL: `https://<user>.github.io/ogrod/`.

Jeśli używasz repo o innej nazwie niż `ogrod`, zmień `base` w `vite.config.js`.

## Instalacja jako aplikacja

- **Telefon**: otwórz URL → menu przeglądarki → "Dodaj do ekranu głównego" / "Zainstaluj aplikację".
- **Laptop (Chrome/Edge)**: ikona instalacji w pasku adresu po lewej od gwiazdki.

## Dane

Wszystko siedzi w localStorage pod kluczami:

- `garden-notes` — notatki
- `garden-custom-plants` — własne akcje
- `garden-removed-plants` — ukryte rośliny domyślne
- `garden-reminders-shown` — data ostatnich powiadomień (debounce dzienny)
- `garden-claude-key` — klucz Anthropic API dla FLORA (nigdy nie commituj)

Eksport / sync między urządzeniami: brak (świadomie). Telefon i laptop mają osobne dane.
