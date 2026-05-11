// Baza gatunków roślin — Etap 1: 10 najpopularniejszych w polskich ogrodach.
// Każdy wpis ma: id, categoryId, name, guide, pruning, fertilizing, diseases, calendarTasks.
//
// type w calendarTasks używa tych samych kategorii co istniejący kalendarz w plants.js:
//   'chemia' | 'naturalny' | 'nawozenie' | 'ciecie' | 'ochrona'

export const PLANT_SPECIES = [
  // ───────────────── DRZEWA OWOCOWE ─────────────────
  {
    id: 'jablon',
    categoryId: 'fruit-trees',
    name: 'Jabłoń',
    guide: {
      light: 'pełne słońce, min. 6h dziennie',
      water: 'młode drzewa co 7 dni 20 L; dojrzałe — tylko w długiej suszy',
      soil: 'pH 6.0–6.8, próchniczna, przepuszczalna',
      frostHardy: true,
      winterProtection: 'ochrona pni przed zającami (osłonki / siatka), pobielanie wapnem',
      companions: ['lawenda', 'czosnek', 'nasturcja'],
      avoid: ['orzech włoski', 'wiśnia'],
    },
    pruning: {
      spring: 'cięcie zimowe luty–marzec: prześwietlanie korony, usunięcie wilków i krzyżujących się gałęzi. Cel: lampka o 3–4 piętrach.',
      summer: 'lipiec — odmłodzenie: skróć tegoroczne pędy o 1/3 jeśli za bujne. Lepsze nasłonecznienie owoców.',
      autumn: 'po opadnięciu liści (listopad): tylko sanitarne — usuń suche, chore, połamane.',
    },
    fertilizing: 'Marzec NPK wieloskładnikowy (1 kopiec łopaty pod koronę). Kwiecień: mocznik 5% dolistnie. Listopad: oprysk mocznikiem 5% na opadłe liście (likwiduje zarodniki parcha).',
    diseases: [
      {
        name: 'Parch jabłoni',
        symptoms: 'Oliwkowo-brązowe plamy na liściach i owocach, pęknięcia na owocach',
        treatment: 'Topsin M 70 WP 1.5 g/L, opryski co 10–14 dni od fazy zielonego pąka. Wieczorem.',
        prevention: 'Listopadowy oprysk mocznikiem 5% na opadłe liście, sprzątnie listowia.',
      },
      {
        name: 'Mączniak jabłoni',
        symptoms: 'Biały, mączysty nalot na liściach i pędach, deformacje',
        treatment: 'Score 250 EC 0.2 ml/L lub Topas 100 EC, opryski co 10 dni',
        prevention: 'Cięcie zimowe — usunąć porażone pędy. Prześwietlona korona.',
      },
      {
        name: 'Owocówka jabłkóweczka',
        symptoms: 'Robaczywe owoce — gąsienice w miąższu',
        treatment: 'Mospilan 20 SP 0.4 g/L po opadnięciu płatków, powtórz za 14 dni',
        prevention: 'Pułapki feromonowe od kwitnienia. Wyciąg z wrotyczu — alt naturalna.',
      },
    ],
    calendarTasks: [
      { month: 2,  type: 'ciecie',    task: 'Cięcie zimowe — prześwietlanie korony' },
      { month: 3,  type: 'chemia',    task: 'Oprysk miedziowy zapobiegający parchowi' },
      { month: 4,  type: 'chemia',    task: 'Faza różowego pąka — oprysk na mszyce i parch (Score, Mospilan)' },
      { month: 4,  type: 'nawozenie', task: 'Nawożenie wieloskładnikowe (NPK + magnez)' },
      { month: 5,  type: 'naturalny', task: 'Oprysk skrzypem polnym — profilaktyka parcha i mączniaka' },
      { month: 5,  type: 'chemia',    task: 'Oprysk po opadnięciu płatków na owocówkę jabłkóweczkę' },
      { month: 6,  type: 'chemia',    task: 'Profilaktyka parcha — fungicyd kontaktowy (Topsin M)' },
      { month: 11, type: 'nawozenie', task: 'Oprysk mocznikiem 5% na opadłe liście' },
      { month: 11, type: 'ochrona',   task: 'Ściółkowanie i ochrona pni przed zającami' },
    ],
  },

  {
    id: 'sliwa',
    categoryId: 'fruit-trees',
    name: 'Śliwa',
    guide: {
      light: 'pełne słońce',
      water: 'umiarkowane — głównie w fazie wzrostu owoców (czerwiec–lipiec)',
      soil: 'pH 6.5–7.5, gliniasto-piaszczysta, dobrze drenowana',
      frostHardy: true,
      winterProtection: 'pobielanie pni wapnem przeciw mrozom i pęknięciom',
      companions: ['nagietek', 'rumianek'],
      avoid: ['orzech włoski', 'gruszka — różne wymagania'],
    },
    pruning: {
      spring: 'luty–marzec: cięcie sanitarne. Usuń krzyżujące się i suche gałęzie. UWAGA: nie tnij głęboko w starsze drewno — śliwa źle goi rany.',
      summer: 'lipiec — przerzedzanie owoców jeśli przeładowane (co 8 cm).',
      autumn: 'po opadnięciu liści: oprysk miedziowy + wycięcie suchych pędów.',
    },
    fertilizing: 'Kwiecień: NPK wieloskładnikowy. Czerwiec: dokarmianie potasem podczas wzrostu owoców.',
    diseases: [
      {
        name: 'Owocówka śliwkóweczka',
        symptoms: 'Robaczywe śliwki, gąsienice wewnątrz, opadanie owoców',
        treatment: 'Karate Zeon 050 CS 0.15 ml/L po kwitnieniu, powtórz po 14 dniach',
        prevention: 'Pułapki feromonowe, wyciąg z wrotyczu wieczorami',
      },
      {
        name: 'Rak bakteryjny',
        symptoms: 'Wyciek gumy na pniu, zamieranie pędów, ciemne plamy',
        treatment: 'Wycięcie porażonej tkanki + oprysk miedziowy (Miedzian 50 WP 5 g/L)',
        prevention: 'Pobielanie pni, unikanie ran. Listopadowy oprysk miedzią.',
      },
    ],
    calendarTasks: [
      { month: 2,  type: 'ciecie',    task: 'Cięcie sanitarne — chore i krzyżujące się gałęzie' },
      { month: 3,  type: 'chemia',    task: 'Oprysk miedziowy (rak bakteryjny, kędzierzawość)' },
      { month: 4,  type: 'nawozenie', task: 'Nawożenie wczesnowiosenne (NPK)' },
      { month: 5,  type: 'chemia',    task: 'Oprysk przeciw owocówce śliwkóweczce (Karate Zeon)' },
      { month: 6,  type: 'naturalny', task: 'Pułapki feromonowe + wyciąg z wrotyczu' },
      { month: 10, type: 'chemia',    task: 'Oprysk miedziowy po opadnięciu liści' },
    ],
  },

  {
    id: 'wisnia',
    categoryId: 'fruit-trees',
    name: 'Wiśnia',
    guide: {
      light: 'pełne słońce',
      water: 'młode drzewa regularnie; dojrzałe tylko w długiej suszy',
      soil: 'pH 6.5–7.5, dobrze drenowana, niezbyt żyzna',
      frostHardy: true,
      winterProtection: 'pobielanie pni, osłona ptasia podczas dojrzewania (sieci)',
      companions: ['lawenda', 'rzeżucha'],
      avoid: ['ziemniak', 'pomidor — przenoszą wirusy'],
    },
    pruning: {
      spring: 'PO ZBIORZE — czerwiec/lipiec, nie wiosną (wycieka guma). Cięcie odmładzające co kilka lat.',
      summer: 'lipiec po zbiorze: prześwietlenie, skrócenie zbyt długich pędów.',
      autumn: 'minimalne — tylko sanitarne wycięcie chorych gałęzi.',
    },
    fertilizing: 'Marzec NPK pod koronę. Po zbiorze (lipiec): kompost lub obornik granulowany.',
    diseases: [
      {
        name: 'Drobna plamistość liści wiśni',
        symptoms: 'Drobne brązowe plamki na liściach, przedwczesne opadanie',
        treatment: 'Score 250 EC 0.2 ml/L po kwitnieniu, powtórz 2–3 razy co 10 dni',
        prevention: 'Sprzątanie opadłych liści. Oprysk miedziowy listopad.',
      },
      {
        name: 'Brunatna zgnilizna drzew pestkowych (monilioza)',
        symptoms: 'Brązowienie i więdnięcie kwiatów, zamieranie pędów, gnijące owoce',
        treatment: 'Switch 62.5 WG 0.8 g/L lub Topsin M 70 WP 1.5 g/L w fazie kwitnienia',
        prevention: 'Usuwanie zmumifikowanych owoców z drzewa i z gleby.',
      },
    ],
    calendarTasks: [
      { month: 3,  type: 'chemia',    task: 'Oprysk miedziowy przed pąkowaniem (monilioza)' },
      { month: 4,  type: 'chemia',    task: 'Faza białego pąka — oprysk Switch lub Topsin M' },
      { month: 4,  type: 'nawozenie', task: 'Nawożenie NPK pod koronę' },
      { month: 7,  type: 'ciecie',    task: 'Cięcie po zbiorze — prześwietlanie korony' },
      { month: 11, type: 'chemia',    task: 'Oprysk miedziowy po opadnięciu liści' },
    ],
  },

  // ───────────────── KRZEWY OWOCOWE ─────────────────
  {
    id: 'porzeczka',
    categoryId: 'fruit-shrubs',
    name: 'Porzeczka',
    guide: {
      light: 'pełne słońce lub półcień',
      water: 'regularnie podczas wzrostu owoców (maj–czerwiec)',
      soil: 'pH 6.0–6.8, próchniczna, wilgotna',
      frostHardy: true,
      winterProtection: 'brak — w pełni zimotrwała',
      companions: ['czosnek', 'cebula', 'nagietek'],
      avoid: ['agrest — wspólne choroby'],
    },
    pruning: {
      spring: 'luty: cięcie odmładzające — usuń pędy starsze niż 4 lata (czarna porzeczka) lub starsze niż 3 lata (czerwona/biała). Zostaw 8–12 pędów na krzaku.',
      summer: 'po zbiorze: usuń słabe i połamane pędy.',
      autumn: 'opcjonalnie — cięcie sanitarne.',
    },
    fertilizing: 'Marzec: NPK + obornik granulowany. Po zbiorze: kompost.',
    diseases: [
      {
        name: 'Wielkopąkowiec porzeczkowy',
        symptoms: 'Nadmiernie napuchnięte pąki, brak rozwoju',
        treatment: 'Siarczan żelaza 50 g/L przed pąkowaniem (luty/marzec). Usuń zaatakowane pąki ręcznie.',
        prevention: 'Wczesnowiosenny oprysk siarczanem żelaza co roku.',
      },
      {
        name: 'Antraknoza porzeczki',
        symptoms: 'Brązowe plamy na liściach, opadanie liści w lecie',
        treatment: 'Topsin M 70 WP 1.5 g/L po kwitnieniu, powtórz po 14 dniach',
        prevention: 'Gnojówka z pokrzywy — wzmocnienie odporności.',
      },
    ],
    calendarTasks: [
      { month: 2,  type: 'ciecie',    task: 'Cięcie odmładzające — pędy starsze niż 4 lata' },
      { month: 3,  type: 'chemia',    task: 'Oprysk siarczanem żelaza (wielkopąkowiec)' },
      { month: 4,  type: 'nawozenie', task: 'Nawożenie wczesnowiosenne (NPK + obornik granulowany)' },
      { month: 5,  type: 'chemia',    task: 'Oprysk fungicydem po kwitnieniu (mączniak, antraknoza)' },
      { month: 5,  type: 'naturalny', task: 'Gnojówka z pokrzywy na mszyce — co 7 dni przy nalocie' },
      { month: 9,  type: 'ciecie',    task: 'Cięcie sanitarne po owocowaniu' },
    ],
  },

  {
    id: 'agrest',
    categoryId: 'fruit-shrubs',
    name: 'Agrest',
    guide: {
      light: 'pełne słońce',
      water: 'umiarkowane',
      soil: 'pH 6.0–6.8, próchniczna, dobrze drenowana',
      frostHardy: true,
      winterProtection: 'brak — wytrzymały',
      companions: ['nagietek', 'rumianek'],
      avoid: ['porzeczka — wspólne choroby'],
    },
    pruning: {
      spring: 'luty: cięcie odmładzające. Usuń pędy starsze niż 5 lat. Forma kielicha (8–10 pędów).',
      summer: 'po zbiorze: skróć zbyt długie pędy.',
      autumn: 'opcjonalnie sanitarne.',
    },
    fertilizing: 'Maj: nawożenie potasowo-fosforowe.',
    diseases: [
      {
        name: 'Amerykański mącznik agrestu',
        symptoms: 'Biały nalot na liściach, owocach, pędach. Owoce stają się brązowe.',
        treatment: 'Siarka koloidalna 5 g/L przed kwitnieniem, opryski co 7 dni. Po kwitnieniu Topsin M.',
        prevention: 'Sadzenie odmian odpornych. Mleko rozcieńczone 1:10 — profilaktyka naturalna.',
      },
    ],
    calendarTasks: [
      { month: 2,  type: 'ciecie',    task: 'Cięcie odmładzające i prześwietlające' },
      { month: 3,  type: 'chemia',    task: 'Oprysk siarkowy przeciw amerykańskiemu mącznikowi' },
      { month: 5,  type: 'chemia',    task: 'Po kwitnieniu — oprysk fungicydem (Topsin M)' },
      { month: 5,  type: 'nawozenie', task: 'Nawożenie potasowo-fosforowe' },
      { month: 6,  type: 'naturalny', task: 'Spryskiwanie mlekiem 1:10 — profilaktyka mączniaka' },
    ],
  },

  {
    id: 'borowka',
    categoryId: 'fruit-shrubs',
    name: 'Borówka amerykańska',
    guide: {
      light: 'pełne słońce',
      water: 'OBFITE — wymaga wilgoci, najlepiej deszczówka (niskie pH)',
      soil: 'pH 4.0–5.5 (kwaśne!), próchniczna, torfowo-kora',
      frostHardy: true,
      winterProtection: 'ściółkowanie korą sosnową na zimę',
      companions: ['rododendron', 'azalia — te same wymagania glebowe'],
      avoid: ['rośliny lubiące zasaolne — wapń niszczy borówkę'],
    },
    pruning: {
      spring: 'luty/marzec: cięcie sanitarne. Po 4–5 latach mocniejsze odmłodzenie — usuń stare, słabe pędy.',
      summer: 'lipiec po zbiorze: opcjonalnie skrócić zbyt długie pędy.',
      autumn: 'opcjonalnie sanitarne.',
    },
    fertilizing: 'Marzec i wrzesień: siarczan amonu (zakwaszacz + azot) 30 g/m². NIE używaj wapnia ani obornika.',
    diseases: [
      {
        name: 'Szara pleśń (Botrytis)',
        symptoms: 'Szary nalot na owocach, gnicie',
        treatment: 'Switch 62.5 WG 0.8 g/L lub Signum 33 WG 1 g/L podczas kwitnienia',
        prevention: 'Przewietrzanie krzaków, sprzątanie opadłych owoców.',
      },
    ],
    calendarTasks: [
      { month: 3,  type: 'nawozenie', task: 'Nawożenie kwaśne (siarczan amonu) + zakwaszanie podłoża' },
      { month: 4,  type: 'ciecie',    task: 'Cięcie sanitarne — cienkie i stare pędy' },
      { month: 4,  type: 'ochrona',   task: 'Ściółkowanie korą sosnową lub trocinami (pH < 5.5)' },
      { month: 5,  type: 'chemia',    task: 'Profilaktyczny oprysk przeciw szarej pleśni' },
      { month: 9,  type: 'nawozenie', task: 'Drugie nawożenie kwaśne pod koniec sezonu' },
    ],
  },

  {
    id: 'truskawka',
    categoryId: 'fruit-shrubs',
    name: 'Truskawka',
    guide: {
      light: 'pełne słońce, min. 6h',
      water: 'regularnie, ale bez moczenia liści — krople pod korzeń',
      soil: 'pH 5.5–6.5, próchniczna, dobrze drenowana',
      frostHardy: true,
      winterProtection: 'agrowłóknina przy mocnych mrozach bez śniegu',
      companions: ['czosnek', 'cebula', 'szpinak', 'sałata'],
      avoid: ['kapusta', 'pomidor', 'ziemniak — wspólne choroby'],
    },
    pruning: {
      spring: 'marzec: usuń stare, suche liście. Wzrusz glebę.',
      summer: 'po owocowaniu (lipiec): przytnij liście i rozłogi.',
      autumn: 'wrzesień: sanitarne usunięcie żółtych liści.',
    },
    fertilizing: 'Marzec NPK. Wrzesień: nawożenie potasowe (lepsze przezimowanie).',
    diseases: [
      {
        name: 'Szara pleśń truskawki',
        symptoms: 'Szary nalot na owocach, gnicie podczas dojrzewania',
        treatment: 'Switch 62.5 WG 0.8 g/L przed kwitnieniem i po. Polyversum WP — bioaktywny.',
        prevention: 'Ściółkowanie słomą pod owoce (bariera przed glebą), przewietrzanie.',
      },
      {
        name: 'Mączniak truskawki',
        symptoms: 'Biały nalot na spodzie liści, deformacje',
        treatment: 'Topas 100 EC 0.4 ml/L po kwitnieniu',
        prevention: 'Czosnek wodny — oprysk profilaktyczny co 7 dni.',
      },
    ],
    calendarTasks: [
      { month: 3,  type: 'ciecie',    task: 'Usunięcie starych, suchych liści' },
      { month: 3,  type: 'nawozenie', task: 'Wczesnowiosenne nawożenie NPK' },
      { month: 4,  type: 'ochrona',   task: 'Ściółkowanie słomą pod owoce' },
      { month: 5,  type: 'chemia',    task: 'Oprysk przeciw szarej pleśni i kwieciakowi (Switch)' },
      { month: 5,  type: 'naturalny', task: 'Czosnek wodny — wieczorny oprysk profilaktyczny' },
      { month: 7,  type: 'ciecie',    task: 'Po owocowaniu — przycięcie liści i rozłogów' },
      { month: 8,  type: 'ochrona',   task: 'Sadzenie nowych rozsad (optymalny termin)' },
      { month: 9,  type: 'nawozenie', task: 'Nawożenie potasowe (lepsze przezimowanie)' },
    ],
  },

  // ───────────────── WARZYWA ─────────────────
  {
    id: 'pomidor',
    categoryId: 'vegetables',
    name: 'Pomidor',
    guide: {
      light: 'pełne słońce, min. 6h',
      water: 'regularnie pod korzeń, NIGDY na liście. Co 2–3 dni gleba wilgotna.',
      soil: 'pH 6.0–6.8, próchniczna, dobrze drenowana',
      frostHardy: false,
      winterProtection: 'roślina jednoroczna — usuń po pierwszych przymrozkach',
      companions: ['bazylia', 'marchew', 'pietruszka', 'nagietek'],
      avoid: ['ziemniak', 'koper', 'kapusta'],
    },
    pruning: {
      spring: 'sadzonki — bez cięcia.',
      summer: 'PASYNKOWANIE: usuwaj wybiegi (pędy z kątów liści) raz w tygodniu. W sierpniu uszczyknij wierzchołek nad ostatnim gronem.',
      autumn: 'usunięcie roślin po zbiorze (nie kompostuj — choroby).',
    },
    fertilizing: 'Po wysadzeniu: kompost. Co 14 dni gnojówka z pokrzywy 1:10 lub specjalistyczny nawóz do pomidorów. Od kwitnienia: dokarmianie potasowe (skórki bananów, popiół drzewny).',
    diseases: [
      {
        name: 'Zaraza ziemniaczana (Phytophthora)',
        symptoms: 'Brązowe plamy na liściach i owocach, biały nalot pod spodem liścia',
        treatment: 'Ridomil Gold MZ 67.8 WG 2.5 g/L co 10 dni od pierwszych objawów. Polyversum WP — alt bioaktywny.',
        prevention: 'Płodozmian (nie po ziemniakach!). Mulczowanie. Podlewanie pod korzeń. Pierwsza pomoc: odwar ze skrzypu polnego co 10 dni.',
      },
      {
        name: 'Septorioza pomidora',
        symptoms: 'Małe ciemne plamki na liściach, żółknięcie',
        treatment: 'Score 250 EC 0.2 ml/L co 10 dni. Usuwaj zaatakowane liście.',
        prevention: 'Cyrkulacja powietrza (rozsada, palikowanie), mulcz.',
      },
      {
        name: 'Mączniak rzekomy',
        symptoms: 'Białe plamy + nalot na spodzie liści, w wilgotne lata',
        treatment: 'Topas 100 EC 0.4 ml/L',
        prevention: 'Tunel foliowy — kontrola wilgotności. Skrzyp polny dolistnie.',
      },
    ],
    calendarTasks: [
      { month: 4,  type: 'ochrona',   task: 'Sadzonki — wysadzanie do gruntu pod osłonę (folia, agrowłóknina)' },
      { month: 5,  type: 'ochrona',   task: 'Wysadzanie do gruntu (po świętej Zofii — 15.05)' },
      { month: 5,  type: 'nawozenie', task: 'Kompost + gnojówka z pokrzywy 1:10' },
      { month: 6,  type: 'ciecie',    task: 'PASYNKOWANIE — raz na tydzień, wybiegi z kątów liści' },
      { month: 6,  type: 'naturalny', task: 'Odwar ze skrzypu — profilaktyka zarazy' },
      { month: 7,  type: 'chemia',    task: 'Oprysk preventywny Ridomil lub Polyversum (zaraza)' },
      { month: 7,  type: 'nawozenie', task: 'Dokarmianie potasem (skórki bananów, popiół)' },
      { month: 8,  type: 'ciecie',    task: 'Uszczyknięcie wierzchołka nad ostatnim gronem' },
      { month: 10, type: 'ochrona',   task: 'Usunięcie roślin po pierwszych przymrozkach (nie kompostować)' },
    ],
  },

  {
    id: 'ogorek',
    categoryId: 'vegetables',
    name: 'Ogórek',
    guide: {
      light: 'pełne słońce, osłona od wiatru',
      water: 'OBFITE codziennie pod korzeń ciepłą wodą — zimna woda powoduje gorzkie owoce',
      soil: 'pH 6.0–7.0, próchniczna, ciepła. Doskonała pod gnojówkę z obornika.',
      frostHardy: false,
      winterProtection: 'roślina jednoroczna',
      companions: ['fasola', 'kukurydza', 'koper', 'sałata'],
      avoid: ['ziemniak', 'pomidor', 'rośliny krzyżowe'],
    },
    pruning: {
      spring: 'siew lub sadzonki w maju (po świętej Zofii).',
      summer: 'PROWADZENIE: usuń kwiaty żeńskie z 4 pierwszych węzłów (gruntowe). Tyczkowe — uszczyknij wierzchołek nad 8 liściem.',
      autumn: 'usunięcie roślin po zbiorze.',
    },
    fertilizing: 'Co 10 dni gnojówka z obornika 1:10 lub z pokrzywy. W lipcu dokarmianie potasowe.',
    diseases: [
      {
        name: 'Mączniak rzekomy ogórka',
        symptoms: 'Żółte plamy na wierzchu liścia, szary nalot pod spodem, więdnięcie',
        treatment: 'Polyversum WP 1 g/L co 5–7 dni, lub Switch 62.5 WG. Naturalne: skrzyp polny + czosnek.',
        prevention: 'Odmiany odporne (Polan F1, Borus F1). Płodozmian co 4 lata.',
      },
      {
        name: 'Mączniak prawdziwy',
        symptoms: 'Biały, mączysty nalot na wierzchu liści',
        treatment: 'Topas 100 EC 0.4 ml/L',
        prevention: 'Soda oczyszczona + olej — naturalny preparat.',
      },
    ],
    calendarTasks: [
      { month: 5,  type: 'ochrona',   task: 'Siew lub sadzonki do gruntu (po 15.05)' },
      { month: 5,  type: 'ochrona',   task: 'Palikowanie / tyczkowanie (odmiany długoowocowe)' },
      { month: 6,  type: 'nawozenie', task: 'Gnojówka z obornika 1:10 co 10 dni' },
      { month: 6,  type: 'ciecie',    task: 'Usuń kwiaty żeńskie z 4 pierwszych węzłów' },
      { month: 7,  type: 'chemia',    task: 'Oprysk Polyversum lub Switch — profilaktyka mączniaka rzekomego' },
      { month: 7,  type: 'naturalny', task: 'Soda + olej — naturalny oprysk na mączniaka' },
      { month: 8,  type: 'nawozenie', task: 'Dokarmianie potasem (popiół drzewny)' },
    ],
  },

  // ───────────────── ROŚLINY OZDOBNE ─────────────────
  {
    id: 'roza',
    categoryId: 'ornamental',
    name: 'Róża',
    guide: {
      light: 'pełne słońce, min. 6h',
      water: 'regularnie pod korzeń, bez moczenia liści',
      soil: 'pH 6.0–6.8, próchniczna, dobrze drenowana',
      frostHardy: true,
      winterProtection: 'kopczykowanie podstaw przed pierwszymi mrozami (listopad). Pnące — osłonki z agrowłókniny.',
      companions: ['lawenda', 'czosnek', 'nasturcja', 'aksamitka'],
      avoid: ['inne róże w bliskim sąsiedztwie — przenoszą choroby'],
    },
    pruning: {
      spring: 'marzec/kwiecień (gdy kwitnie forsycja): herbatnie do 3–5 oczek, parkowe lekko. Usuń wszystkie suche, słabe pędy.',
      summer: 'po pierwszym kwitnieniu — usuń przekwitłe kwiatostany do pierwszego pełnego liścia (zachęca do drugiej fali).',
      autumn: 'październik: skróć długie pędy o 1/3 (zabezpieczenie przed wyłamywaniem przez śnieg). Cięcie sanitarne.',
    },
    fertilizing: 'Marzec: nawóz wieloskładnikowy. Czerwiec po pierwszym kwitnieniu: dokarmianie potasowe. Wrzesień: STOP nawożeniu azotowemu (utrudnia zimowanie).',
    diseases: [
      {
        name: 'Czarna plamistość liści róż',
        symptoms: 'Czarne plamy z żółtą obwódką, opadanie liści',
        treatment: 'Score 250 EC 0.2 ml/L co 10 dni od pierwszych objawów. Topsin M alt.',
        prevention: 'Sprzątanie opadłych liści. Skrzyp polny + pokrzywa dolistnie.',
      },
      {
        name: 'Mączniak prawdziwy róż',
        symptoms: 'Biały nalot na liściach i pąkach',
        treatment: 'Topas 100 EC 0.4 ml/L lub Score',
        prevention: 'Przewietrzanie krzaków, cięcie wiosenne. Drożdże piwne — biostymulacja.',
      },
      {
        name: 'Mszyce na różach',
        symptoms: 'Zielone/czarne mszyce na pąkach i młodych pędach, zniekształcenia',
        treatment: 'Mospilan 20 SP 0.4 g/L. Naturalne: gnojówka z pokrzywy 1:20.',
        prevention: 'Biedronki — sojusznicy. Lawenda obok róży — odstrasza.',
      },
    ],
    calendarTasks: [
      { month: 3,  type: 'ciecie',    task: 'Cięcie wiosenne — herbatnie do 3–5 oczek' },
      { month: 3,  type: 'ochrona',   task: 'Sadzenie róż z gołym korzeniem' },
      { month: 4,  type: 'chemia',    task: 'Oprysk profilaktyczny (mączniak, czarna plamistość) — Score' },
      { month: 4,  type: 'nawozenie', task: 'Nawożenie wieloskładnikowe dla róż' },
      { month: 5,  type: 'naturalny', task: 'Gnojówka z pokrzywy + skrzyp — wzmocnienie liści' },
      { month: 5,  type: 'chemia',    task: 'Oprysk na mszyce i przędziorki (Mospilan)' },
      { month: 6,  type: 'chemia',    task: 'Cykliczny oprysk przeciw chorobom grzybowym (co 10–14 dni)' },
      { month: 7,  type: 'nawozenie', task: 'Letnie dokarmianie pod drugi rzut kwiatów' },
      { month: 7,  type: 'naturalny', task: 'Drożdże piwne — biostymulacja kwitnienia' },
      { month: 10, type: 'ciecie',    task: 'Cięcie sanitarne i skrócenie długich pędów' },
      { month: 10, type: 'ochrona',   task: 'Jesienne sadzenie róż doniczkowanych' },
      { month: 11, type: 'ochrona',   task: 'Kopczykowanie podstaw przed mrozami' },
    ],
  },
];

export const SPECIES_BY_ID = Object.fromEntries(
  PLANT_SPECIES.map((s) => [s.id, s]),
);

export function speciesByCategory(categoryId) {
  return PLANT_SPECIES.filter((s) => s.categoryId === categoryId);
}
