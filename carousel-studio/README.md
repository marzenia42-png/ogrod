# Carousel Studio

Generator karuzel na Instagram (format 4:5, 1080×1350) w stylu kont typu
`kierunek.ai`. Podkładasz treść (JSON) — **silnik sam składa slajdy i
dopasowuje wielkość tekstu do jego długości**. Motywy zmieniasz per marka
i per post; do grafiki można wstawić własne zdjęcie.

## Uruchomienie

To statyczne pliki. Najprościej lokalnym serwerem (żeby działał eksport i fonty):

```bash
cd carousel-studio
python3 -m http.server 8080
# otwórz http://localhost:8080
```

## Jak to działa

- **Treść** = obiekt JSON (`js/presets.js` ma 2 gotowe zestawy: DB Meble i Vadym).
- **Layouty** (`data-layout`): `cover`, `text-visual`, `list`, `cta`.
- **Auto-dopasowanie**: `fitText()` w `js/engine.js` binarnie dobiera `font-size`
  nagłówka i tekstu, aż zmieszczą się w polu — długi i krótki tekst wyglądają dobrze.
- **Motywy** (`css/themes.css`): `vadym`, `dbmeble`, `dbmeble-light`, `mint`.
  Każdą zmienną (`--accent`, `--bg`, `--text`...) można nadpisać per post
  w `meta.vars`.
- **Zdjęcie w grafice**: pole `image` slajdu (URL lub `assets/...`). Zdjęcie
  dostaje nakładkę w kolorze marki i wtapia się w tło.

## Format treści (skrót)

```jsonc
{
  "meta": { "theme": "dbmeble", "handle": "dbmeble.pl", "total": 5,
            "vars": { "accent": "#c9a15a" } },   // nadpisania per post
  "slides": [
    { "layout": "cover", "num": "01",
      "title": [ {"t":"3 błędy przy "}, {"t":"kuchni","hl":true} ],  // hl = kolor akcentu
      "text": "Podtytuł.\n\nDrugi akapit.",
      "image": "assets/kuchnia.jpg" },

    { "layout": "list", "num": "03",
      "title": [ {"t":"Sprawdź "}, {"t":"3 rzeczy","hl":true} ],
      "cards": [
        { "icon": "ruler", "head": "Wymiar", "desc": "..." },
        { "icon": "sofa",  "head": "Materiał", "desc": "..." },
        { "icon": "check", "head": "Montaż", "desc": "..." }
      ] },

    { "layout": "cta", "num": "05",
      "title": [ {"t":"Napisz do nas"} ],
      "text": "...",
      "cta": { "head": "Zapisz ten post,", "sub": "..." } }
  ]
}
```

Ikony do kart: `check, user, data, target, gear, bulb, ruler, sofa, bookmark`
(dokładasz kolejne w `js/presets.js`).

## Eksport

- **PNG (ten / wszystkie)** — pobiera slajdy 2160×2700 (retina) gotowe na IG.
- **HTML slajdu → Adobe Express** — zapisuje slajd jako samodzielny HTML do
  zaimportowania w Adobe Express / Canvie do ręcznych poprawek.

## Status

v1 — 4 layouty, 4 motywy, auto-fit, eksport PNG/HTML. Do zrobienia dalej:
biblioteka „rzeki ikon" jak u Vadyma (generatywne tło), więcej layoutów
(cytat, statystyka, before/after), presety kolorów pod DB Meble.
