export const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export const MONTHS_SHORT = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

export const CATEGORIES = [
  { key: 'chemia',    label: '🧪 Chemia',    border: '#ef4444', bg: '#3b1a1a', text: '#fca5a5' },
  { key: 'naturalny', label: '🌿 Naturalny', border: '#22c55e', bg: '#1a2e1a', text: '#86efac' },
  { key: 'nawozenie', label: '🪴 Nawożenie', border: '#84cc16', bg: '#1a2218', text: '#bef264' },
  { key: 'ciecie',    label: '✂️ Cięcie',    border: '#818cf8', bg: '#1a1a2e', text: '#c7d2fe' },
  { key: 'ochrona',   label: '🛡️ Ochrona',   border: '#f97316', bg: '#2a1a10', text: '#fdba74' },
];

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

export const PLANTS = [
  { key: 'brzoskwinia', name: 'Brzoskwinia',          categoryId: 'fruit-trees' },
  { key: 'sliwa',       name: 'Śliwa',                categoryId: 'fruit-trees' },
  { key: 'jablon',      name: 'Jabłoń',               categoryId: 'fruit-trees' },
  { key: 'grusza',      name: 'Grusza',               categoryId: 'fruit-trees' },
  { key: 'porzeczka',   name: 'Porzeczka',            categoryId: 'fruit-shrubs' },
  { key: 'agrest',      name: 'Agrest',               categoryId: 'fruit-shrubs' },
  { key: 'borowka',     name: 'Borówka amerykańska',  categoryId: 'fruit-shrubs' },
  { key: 'truskawka',   name: 'Truskawka',            categoryId: 'fruit-shrubs' },
  { key: 'roza',        name: 'Róża',                 categoryId: 'ornamental' },
  { key: 'hortensja',   name: 'Hortensja',            categoryId: 'ornamental' },
  { key: 'rododendron', name: 'Rododendron',          categoryId: 'ornamental' },
  { key: 'magnolia',    name: 'Magnolia',             categoryId: 'ornamental' },
  { key: 'lawenda',     name: 'Lawenda',              categoryId: 'vegetables' },
  { key: 'iglaki',      name: 'Iglaki',               categoryId: 'garden-trees' },
];

export const ACTIONS = [
  // Brzoskwinia
  { plant: 'brzoskwinia', month: 2, type: 'chemia',    text: 'Oprysk preparatem miedziowym przed pąkowaniem (kędzierzawość liści)' },
  { plant: 'brzoskwinia', month: 2, type: 'ciecie',    text: 'Cięcie formujące przed ruszeniem soków' },
  { plant: 'brzoskwinia', month: 3, type: 'chemia',    text: 'Drugi oprysk miedziowy gdy pąki zaczynają nabrzmiewać' },
  { plant: 'brzoskwinia', month: 4, type: 'chemia',    text: 'Po opadnięciu płatków: oprysk na mszyce i moniliozę (Switch, Mospilan)' },
  { plant: 'brzoskwinia', month: 4, type: 'nawozenie', text: 'Nawożenie azotowe (saletra amonowa lub dobrze przefermentowany kompost)' },
  { plant: 'brzoskwinia', month: 5, type: 'naturalny', text: 'Gnojówka z pokrzywy jako dolistne wzmocnienie (rozcieńczyć 1:10)' },
  { plant: 'brzoskwinia', month: 6, type: 'ochrona',   text: 'Przerzedzanie owoców — zostaw owoc co 10–15 cm' },
  { plant: 'brzoskwinia', month: 11, type: 'chemia',   text: 'Oprysk miedziowy po opadnięciu liści' },
  { plant: 'brzoskwinia', month: 11, type: 'ochrona',  text: 'Ściółkowanie korą wokół pnia' },

  // Śliwa
  { plant: 'sliwa', month: 2, type: 'ciecie',    text: 'Cięcie sanitarne — usunięcie chorych i krzyżujących się gałęzi' },
  { plant: 'sliwa', month: 3, type: 'chemia',    text: 'Oprysk miedziowy (rak bakteryjny, kędzierzawość)' },
  { plant: 'sliwa', month: 4, type: 'nawozenie', text: 'Nawożenie wczesnowiosenne (NPK wieloskładnikowy)' },
  { plant: 'sliwa', month: 5, type: 'chemia',    text: 'Oprysk przeciw owocówce śliwkóweczce po kwitnieniu (Karate Zeon)' },
  { plant: 'sliwa', month: 6, type: 'naturalny', text: 'Pułapki feromonowe + wyciąg z wrotyczu — naturalna kontrola owocówki' },
  { plant: 'sliwa', month: 6, type: 'chemia',    text: 'Drugi oprysk insektycydowy (owocówka)' },
  { plant: 'sliwa', month: 10, type: 'chemia',   text: 'Oprysk miedziowy po opadnięciu liści' },

  // Jabłoń
  { plant: 'jablon', month: 2, type: 'ciecie',    text: 'Cięcie zimowe — prześwietlanie korony' },
  { plant: 'jablon', month: 3, type: 'chemia',    text: 'Oprysk miedziowy zapobiegający parchowi' },
  { plant: 'jablon', month: 4, type: 'chemia',    text: 'Faza różowego pąka — oprysk na mszyce i parch (Score, Mospilan)' },
  { plant: 'jablon', month: 4, type: 'nawozenie', text: 'Nawożenie wieloskładnikowe (NPK + magnez)' },
  { plant: 'jablon', month: 5, type: 'naturalny', text: 'Oprysk skrzypem polnym — profilaktyka parcha i mączniaka' },
  { plant: 'jablon', month: 5, type: 'chemia',    text: 'Oprysk po opadnięciu płatków na owocówkę jabłkóweczkę' },
  { plant: 'jablon', month: 6, type: 'chemia',    text: 'Profilaktyka parcha — fungicyd kontaktowy (Topsin M)' },
  { plant: 'jablon', month: 11, type: 'nawozenie', text: 'Oprysk mocznikiem 5% na opadłe liście (likwidacja zarodników parcha)' },
  { plant: 'jablon', month: 11, type: 'ochrona',  text: 'Ściółkowanie i ochrona pni przed zającami (osłonki, papier)' },

  // Grusza
  { plant: 'grusza', month: 2, type: 'ciecie',    text: 'Cięcie formujące i prześwietlające' },
  { plant: 'grusza', month: 3, type: 'chemia',    text: 'Oprysk miedziowy (rak, parch)' },
  { plant: 'grusza', month: 4, type: 'chemia',    text: 'Oprysk na miodówkę gruszową i parch' },
  { plant: 'grusza', month: 5, type: 'naturalny', text: 'Oprysk skrzypem polnym (parch) — wieczorem' },
  { plant: 'grusza', month: 5, type: 'nawozenie', text: 'Nawożenie wieloskładnikowe' },
  { plant: 'grusza', month: 11, type: 'ochrona',  text: 'Ściółkowanie, sprzątanie opadłych liści (źródło parcha)' },

  // Porzeczka
  { plant: 'porzeczka', month: 2, type: 'ciecie',    text: 'Cięcie odmładzające — wycięcie pędów starszych niż 4 lata' },
  { plant: 'porzeczka', month: 3, type: 'chemia',    text: 'Oprysk siarczanem żelaza przeciw wielkopąkowcowi porzeczkowemu' },
  { plant: 'porzeczka', month: 4, type: 'nawozenie', text: 'Nawożenie wczesnowiosenne (NPK + obornik granulowany)' },
  { plant: 'porzeczka', month: 5, type: 'chemia',    text: 'Oprysk fungicydem po kwitnieniu (mączniak, antraknoza)' },
  { plant: 'porzeczka', month: 5, type: 'naturalny', text: 'Gnojówka z pokrzywy na mszyce — co 7 dni przy nalocie' },
  { plant: 'porzeczka', month: 9, type: 'ciecie',    text: 'Cięcie sanitarne po owocowaniu' },

  // Agrest
  { plant: 'agrest', month: 2, type: 'ciecie',    text: 'Cięcie odmładzające i prześwietlające' },
  { plant: 'agrest', month: 3, type: 'chemia',    text: 'Oprysk siarkowy przeciw amerykańskiemu mącznikowi agrestu' },
  { plant: 'agrest', month: 5, type: 'chemia',    text: 'Po kwitnieniu — oprysk fungicydem (mączniak)' },
  { plant: 'agrest', month: 5, type: 'nawozenie', text: 'Nawożenie potasowo-fosforowe' },
  { plant: 'agrest', month: 6, type: 'naturalny', text: 'Spryskiwanie mlekiem rozcieńczonym 1:10 — profilaktyka mączniaka' },

  // Borówka amerykańska
  { plant: 'borowka', month: 3, type: 'nawozenie', text: 'Nawożenie kwaśne (siarczan amonu) + zakwaszanie podłoża' },
  { plant: 'borowka', month: 4, type: 'ciecie',    text: 'Cięcie sanitarne — usunięcie cienkich i starych pędów' },
  { plant: 'borowka', month: 4, type: 'ochrona',   text: 'Ściółkowanie korą sosnową lub trocinami (pH < 5.5)' },
  { plant: 'borowka', month: 5, type: 'chemia',    text: 'Profilaktyczny oprysk przeciw szarej pleśni (Switch, Signum)' },
  { plant: 'borowka', month: 9, type: 'nawozenie', text: 'Drugie nawożenie kwaśne pod koniec sezonu' },

  // Truskawka
  { plant: 'truskawka', month: 3, type: 'ciecie',    text: 'Usunięcie starych, suchych liści' },
  { plant: 'truskawka', month: 3, type: 'nawozenie', text: 'Wczesnowiosenne nawożenie NPK' },
  { plant: 'truskawka', month: 4, type: 'ochrona',   text: 'Ściółkowanie słomą pod owoce' },
  { plant: 'truskawka', month: 5, type: 'chemia',    text: 'Oprysk przeciw szarej pleśni i kwieciakowi (Switch)' },
  { plant: 'truskawka', month: 5, type: 'naturalny', text: 'Czosnek wodny — wieczorny oprysk profilaktyczny' },
  { plant: 'truskawka', month: 7, type: 'ciecie',    text: 'Po owocowaniu — przycięcie liści i rozłogów' },
  { plant: 'truskawka', month: 8, type: 'ochrona',   text: 'Sadzenie nowych rozsad (optymalny termin)' },
  { plant: 'truskawka', month: 9, type: 'nawozenie', text: 'Nawożenie potasowe (lepsze przezimowanie)' },

  // Róża
  { plant: 'roza', month: 3, type: 'ciecie',    text: 'Cięcie wiosenne — herbatnie do 3–5 oczek, parkowe lekko' },
  { plant: 'roza', month: 3, type: 'ochrona',   text: 'Sadzenie róż z gołym korzeniem' },
  { plant: 'roza', month: 4, type: 'chemia',    text: 'Oprysk profilaktyczny (mączniak, czarna plamistość) — Score' },
  { plant: 'roza', month: 4, type: 'nawozenie', text: 'Nawożenie wieloskładnikowe dla róż' },
  { plant: 'roza', month: 5, type: 'naturalny', text: 'Gnojówka z pokrzywy + skrzyp — wzmocnienie liści, mniej grzybów' },
  { plant: 'roza', month: 5, type: 'chemia',    text: 'Oprysk na mszyce i przędziorki (Mospilan)' },
  { plant: 'roza', month: 6, type: 'chemia',    text: 'Cykliczny oprysk przeciw chorobom grzybowym (co 10–14 dni)' },
  { plant: 'roza', month: 7, type: 'nawozenie', text: 'Letnie dokarmianie (granulowane) pod drugi rzut kwiatów' },
  { plant: 'roza', month: 7, type: 'naturalny', text: 'Drożdże piwne (10g/10L) — biostymulacja kwitnienia' },
  { plant: 'roza', month: 10, type: 'ciecie',   text: 'Cięcie sanitarne i skrócenie długich pędów' },
  { plant: 'roza', month: 10, type: 'ochrona',  text: 'Jesienne sadzenie róż doniczkowanych' },
  { plant: 'roza', month: 11, type: 'ochrona',  text: 'Kopczykowanie podstaw przed mrozami' },

  // Hortensja
  { plant: 'hortensja', month: 3, type: 'ciecie',    text: 'Bukietowe — mocne cięcie. Ogrodowe — tylko przekwitnięte kwiatostany' },
  { plant: 'hortensja', month: 4, type: 'nawozenie', text: 'Nawożenie zakwaszające (dla niebieskich — siarczan glinu)' },
  { plant: 'hortensja', month: 4, type: 'ochrona',   text: 'Wiosenne sadzenie z doniczki w półcień' },
  { plant: 'hortensja', month: 5, type: 'ochrona',   text: 'Ściółkowanie korą — utrzymanie wilgoci' },
  { plant: 'hortensja', month: 7, type: 'nawozenie', text: 'Letnie dokarmianie pod kwitnienie' },
  { plant: 'hortensja', month: 11, type: 'ochrona',  text: 'Okrycie podstawy korą i agrowłókniną' },

  // Rododendron
  { plant: 'rododendron', month: 3, type: 'nawozenie', text: 'Nawożenie kwaśne specjalistyczne (Azalka, Substral kwaśny)' },
  { plant: 'rododendron', month: 4, type: 'ochrona',   text: 'Ściółkowanie korą sosnową (utrzymanie pH)' },
  { plant: 'rododendron', month: 4, type: 'ochrona',   text: 'Wiosenne sadzenie w półcień, w torf kwaśny' },
  { plant: 'rododendron', month: 5, type: 'ochrona',   text: 'Usunięcie przekwitłych kwiatostanów (wykręcanie)' },
  { plant: 'rododendron', month: 6, type: 'naturalny', text: 'Polewanie deszczówką + odwar ze skrzypu — wzmocnienie liści' },
  { plant: 'rododendron', month: 9, type: 'nawozenie', text: 'Ostatnie nawożenie potasowe (lepsze zdrewnienie)' },
  { plant: 'rododendron', month: 11, type: 'ochrona',  text: 'Osłona z chochołów lub agrowłókniny przed mrozem' },

  // Magnolia
  { plant: 'magnolia', month: 3, type: 'ciecie',    text: 'Lekkie cięcie sanitarne (UWAGA: kwitnie na zeszłorocznym drewnie)' },
  { plant: 'magnolia', month: 4, type: 'nawozenie', text: 'Nawożenie azotowo-fosforowe' },
  { plant: 'magnolia', month: 4, type: 'ochrona',   text: 'Wiosenne sadzenie w żyzną, próchniczną glebę' },
  { plant: 'magnolia', month: 5, type: 'ochrona',   text: 'Ściółkowanie korą wokół bryły korzeniowej' },
  { plant: 'magnolia', month: 11, type: 'ochrona',  text: 'Okrycie świeżych nasadzeń korą' },

  // Lawenda
  { plant: 'lawenda', month: 4, type: 'ciecie',    text: 'Cięcie wiosenne — 2/3 zeszłorocznego przyrostu, nie w stare drewno' },
  { plant: 'lawenda', month: 5, type: 'ochrona',   text: 'Sadzenie w słońcu, na przepuszczalnym podłożu z wapniem' },
  { plant: 'lawenda', month: 7, type: 'ochrona',   text: 'Zbiór kwiatów na suszenie (pełnia kwitnienia)' },
  { plant: 'lawenda', month: 8, type: 'ciecie',    text: 'Cięcie po kwitnieniu — uformowanie kulistej kępy' },
  { plant: 'lawenda', month: 11, type: 'ochrona',  text: 'Lekkie okrycie gałązkami iglaków przed mrozem' },

  // Iglaki
  { plant: 'iglaki', month: 3, type: 'ochrona',   text: 'Ściółkowanie korą sosnową, podlewanie po zimie' },
  { plant: 'iglaki', month: 4, type: 'nawozenie', text: 'Wiosenne nawożenie iglakowe (azotowe) — szybki start' },
  { plant: 'iglaki', month: 5, type: 'ciecie',    text: 'Korekta kształtu (tuje, cyprysiki — przed nowymi przyrostami)' },
  { plant: 'iglaki', month: 6, type: 'chemia',    text: 'Oprysk przeciw przędziorkom i rdzom' },
  { plant: 'iglaki', month: 7, type: 'naturalny', text: 'Oprysk czosnkiem wodnym — odstrasza przędziorki' },
  { plant: 'iglaki', month: 8, type: 'nawozenie', text: 'Drugie nawożenie (potasowo-fosforowe pod zimę)' },
  { plant: 'iglaki', month: 9, type: 'ochrona',   text: 'Najlepszy termin sadzenia iglaków (cieplejsza gleba, wilgoć)' },
  { plant: 'iglaki', month: 11, type: 'ochrona',  text: 'Sznurowanie tuj i jałowców kolumnowych przed śniegiem' },
];
