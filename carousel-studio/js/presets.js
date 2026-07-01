/* ============================================================
   PRESETY TREŚCI + IKONY
   Treść to zwykły obiekt JS/JSON. Silnik składa z niej slajdy.
   Format tytułu: tablica fragmentów, np.
     [{t:"3 zadania, których "},{t:"NIE",hl:true},{t:" automatyzuj"}]
   hl:true => słowo w kolorze akcentu.
   ============================================================ */

/* ---- Ikony (inline SVG, dziedziczą currentColor) ------------- */
const ICONS = {
  check:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  user:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  data:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  target:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  gear:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>',
  bulb:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"/></svg>',
  ruler:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8 16 21l5-5L8 3Z"/><path d="M7 7l2 2M11 11l2 2M15 15l2 2"/></svg>',
  sofa:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 14a2 2 0 0 1 2-2c1.1 0 2 .9 2 2v3h12v-3c0-1.1.9-2 2-2a2 2 0 0 1 2 2v4H2Z"/><path d="M6 18v2M18 18v2"/></svg>',
  bookmark:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/></svg>',
  mail:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  doc:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M8 13h8M8 17h6"/></svg>',
  chat:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z"/></svg>',
  warn:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17.5v.5"/></svg>',
  shield:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
};

/* ==== PRESET 1: KIERUNEK.AI (odwzorowanie stylu Vadyma) ======= */
const PRESET_VADYM = {
  meta: { theme: "vadym", handle: "kierunek.ai", total: 5, chip: "AI" },
  slides: [
    { layout: "cover", num: "01",
      title: [{t:"3 zadania, których "},{t:"NIE",hl:true},{t:" automatyzuj jako pierwszych"}],
      text: "AI nie naprawia chaosu.\nOno go przyspiesza.",
      visual: { motif: "flow", icons: ["gear","doc","warn","chat","data","mail"] } },
    { layout: "text-visual", num: "02",
      title: [{t:"1. Procesy bez "},{t:"standardu",hl:true}],
      text: "Jeśli każdy w firmie robi coś inaczej, AI też będzie robić to inaczej.\n\nNajpierw ustal: co, kiedy i według jakich zasad.",
      visual: { motif: "chip", label: "AI" } },
    { layout: "list", num: "03",
      title: [{t:"Zanim wdrożysz AI, "},{t:"sprawdź 3 rzeczy",hl:true}],
      text: "Jeśli nie — najpierw porządek. Potem automatyzacja.",
      cards: [
        { icon: "check", head: "Proces", desc: "Czy proces ma jasne zasady?" },
        { icon: "user",  head: "Człowiek", desc: "Czy klient nie potrzebuje tam człowieka?" },
        { icon: "data",  head: "Dane", desc: "Czy dane są aktualne i uporządkowane?" },
      ] },
    { layout: "text-visual", num: "04",
      title: [{t:"Największy "},{t:"błąd?",hl:true}],
      text: "Automatyzować coś tylko dlatego, że „da się\".\n\nW AI nie chodzi o to, żeby wszystko robiło się samo. Chodzi o to, żeby <span class='em'>właściwe rzeczy</span> robiły się lepiej.",
      visual: { motif: "grid" } },
    { layout: "cta", num: "05",
      title: [{t:"Zapamiętaj:",hl:false}],
      text: "Automatyzacja <span class='em'>złego procesu</span> nie daje dobrej firmy. Daje złą firmę, która działa <span class='em'>szybciej</span>.",
      cta: { head: "Zapisz ten post,", sub: "zanim podłączysz AI do kolejnego chaosu." },
      visual: { motif: "orbit", icons: ["target","gear","warn","data","check","chat"] } },
  ],
};

/* ==== PRESET 2: DB MEBLE (dbmeble.pl) ======================== */
const PRESET_DBMEBLE = {
  meta: { theme: "dbmeble", handle: "dbmeble.pl", total: 5, chip: "DB" },
  slides: [
    { layout: "cover", num: "01",
      title: [{t:"3 błędy przy zamawianiu "},{t:"kuchni na wymiar",hl:true}],
      text: "Zanim podpiszesz projekt — przeczytaj to.",
      visual: { motif: "flow", icons: ["sofa","ruler","check","bulb","mail","doc"] } },
    { layout: "text-visual", num: "02",
      title: [{t:"1. Wybór "},{t:"bez pomiaru",hl:true}],
      text: "Katalogowe wymiary rzadko pasują 1:1.\n\nProfesjonalny pomiar u Ciebie w domu to podstawa — <span class='em'>zanim</span> zamówisz fronty.",
      visual: { motif: "orbit", icons: ["ruler","sofa","check","bulb","target","gear"] } },
    { layout: "list", num: "03",
      title: [{t:"Na co "},{t:"zwrócić uwagę",hl:true}],
      text: "Trzy rzeczy, które decydują o trwałości mebli.",
      cards: [
        { icon: "ruler",  head: "Wymiar", desc: "Dokładny pomiar i plan zabudowy." },
        { icon: "sofa",   head: "Materiał", desc: "Płyta, fronty, okucia — jakość klasy premium." },
        { icon: "check",  head: "Montaż", desc: "Fachowy montaż i serwis po sprzedaży." },
      ] },
    { layout: "text-visual", num: "04",
      title: [{t:"Dobre meble to "},{t:"inwestycja",hl:true}],
      text: "Tania zabudowa kusi ceną, ale kosztuje później.\n\n<span class='em'>Solidne wykonanie</span> służy latami — i wygląda jak pierwszego dnia.",
      visual: { motif: "cards" } },
    { layout: "cta", num: "05",
      title: [{t:"Marzysz o "},{t:"meblach na wymiar?",hl:true}],
      text: "Zaprojektujemy je razem — od pomysłu po montaż.",
      cta: { head: "Napisz do nas,", sub: "przygotujemy bezpłatną wycenę." },
      visual: { motif: "chip", label: "DB" } },
  ],
};

const PRESETS = { vadym: PRESET_VADYM, dbmeble: PRESET_DBMEBLE };
