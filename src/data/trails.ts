import type { Trail } from "@/lib/types";

// Sample seed data for the MVP. Coordinates are APPROXIMATE waypoints traced by
// hand — good enough to render a route and pan the map, NOT for navigation.
// These get replaced by real OSM/GPX geometry (via Overpass) once the data
// pipeline lands. [lng, lat] ordering throughout.

export const trails: Trail[] = [
  {
    slug: "theth-valbona",
    name: "Theth to Valbona Pass",
    region: "Albanian Alps (Accursed Mountains)",
    summary:
      "The classic Balkan day hike, crossing the Valbona Pass (~1,800 m) between two glacial valleys. Albania's most famous trek.",
    difficulty: "hard",
    distanceKm: 17,
    ascentM: 1000,
    durationHours: 7,
    trailhead: [19.7740, 42.3956],
    geometry: [
      [19.7740, 42.3956], // Theth village
      [19.7900, 42.3980],
      [19.8053, 42.4020],
      [19.8153, 42.4058], // Qafa e Valbonës (~1 795 m)
      [19.8380, 42.4210],
      [19.8640, 42.4380], // Rrogam
      [19.8878, 42.4533], // Valbona village
    ],
    bestMonths: "June – October",
    logistics: [
      "Furgon (minibus) Shkodër → Theth daily in season (~2.5 h).",
      "Guesthouses with half-board in both Theth and Valbona; book ahead in summer.",
      "Return via Valbona → Fierza ferry across Koman Lake — a highlight in itself.",
      "Carry 2 L water; the pass section is exposed with no reliable source.",
    ],
    sq: {
      name: "Theth – Qafa e Valbonës",
      summary:
        "Shëtitja klasike ballkanike ditore, duke kaluar Grykën e Valbonës (~1.800 m) ndërmjet dy luginave glaciare. Treku më i famshëm i Shqipërisë.",
      bestMonths: "Qershor – Tetor",
      logistics: [
        "Furgon Shkodër → Theth çdo ditë në sezon (~2.5 h).",
        "Bujtina me gjysmë pension si në Theth ashtu edhe në Valbonë; rezervoni paraprakisht në verë.",
        "Kthim nëpërmjet Valbonë → tragetu Fierza në Liqenin e Komanit — një pikë kulmore.",
        "Mbani 2 L ujë; seksioni i grykës është i ekspozuar pa burim të besueshëm.",
      ],
    },
  },
  {
    slug: "llogara-pass-cesar",
    name: "Llogara Pass – Caesar's Pass Ridge",
    region: "Llogara National Park, Riviera",
    summary:
      "Pine-forest ridge walk high above the Ionian coast with dramatic drops to the sea. Named for Julius Caesar, who reputedly crossed here.",
    difficulty: "moderate",
    distanceKm: 9,
    ascentM: 450,
    durationHours: 4,
    trailhead: [19.5924, 40.1982],
    geometry: [
      [19.5924, 40.1982], // Qafa e Llogarasë / Llogara Pass (~1 027 m)
      [19.5900, 40.2040],
      [19.5875, 40.2090],
      [19.5855, 40.2130],
      [19.5828, 40.2170], // Qafa e Qesarit / Caesar's Pass
    ],
    bestMonths: "April – November",
    logistics: [
      "Vlorë → Himarë buses stop at Llogara Pass on request.",
      "Hotels and restaurants at the pass itself; easy base.",
      "Strong winds common on the ridge — bring a windproof layer.",
    ],
    sq: {
      name: "Passi i Llogarasë – Kreshta e Qafës së Qesarit",
      region: "Parku Kombëtar i Llogarasë, Riviera",
      summary:
        "Shëtitje malore me pishë lart mbi bregdetin Jonian me pamje dramatike drejt detit. E quajtur pas Julius Caesar-it, i cili sipas traditës kaloi këtu.",
      bestMonths: "Prill – Nëntor",
      logistics: [
        "Autobusat Vlorë → Himarë ndalojnë në Passin e Llogarasë me kërkesë.",
        "Hotele dhe restorante pranë pasit; bazë e lehtë.",
        "Era e fortë e zakonshme në kreshtë — sillni një shtresë kundërerës.",
      ],
    },
  },
  {
    slug: "mount-dajti",
    name: "Mount Dajti Summit",
    region: "Dajti National Park, near Tirana",
    summary:
      "An accessible summit hike right beside the capital, reachable by cable car. Panoramas over Tirana and the plain.",
    difficulty: "easy",
    distanceKm: 6,
    ascentM: 350,
    durationHours: 3,
    trailhead: [19.9090, 41.3700],
    geometry: [
      [19.9090, 41.3700], // Dajti Ekspres top station (~1 030 m)
      [19.9130, 41.3698],
      [19.9170, 41.3696],
      [19.9220, 41.3694], // Maja e Dajtit (~1 612 m)
    ],
    bestMonths: "Year-round (snow possible Dec–Feb)",
    logistics: [
      "Dajti Ekspres cable car from eastern Tirana to the trailhead.",
      "Cafés at the top station; no resupply higher up.",
      "Great half-day option if you're based in Tirana.",
    ],
    sq: {
      name: "Maja e Dajtit",
      region: "Parku Kombëtar i Dajtit, pranë Tiranës",
      summary:
        "Shëtitje e arritshme në majë pranë kryeqytetit, e arritshme me teleferik. Panorama mbi Tiranën dhe fushën.",
      bestMonths: "Gjatë gjithë vitit (borë e mundshme Dhjetor–Shkurt)",
      logistics: [
        "Teleferiku Dajti Ekspres nga Tirana lindore deri te kryqëzimi.",
        "Kafene në stacionin e sipërm; pa furnizim më lart.",
        "Opsion i shkëlqyeshëm gjysmëditor nëse jeni bazuar në Tiranë.",
      ],
    },
  },
  {
    slug: "gjipe-canyon",
    name: "Gjipe Canyon to Beach",
    region: "Ionian Riviera",
    summary:
      "A short descent through a limestone canyon to a hidden beach between Himarë and Dhërmi. Swim at the end.",
    difficulty: "easy",
    distanceKm: 4,
    ascentM: 150,
    durationHours: 2,
    trailhead: [19.6583, 40.1304],
    geometry: [
      [19.6583, 40.1304], // Gjipe trailhead / SH8 parking
      [19.6620, 40.1300],
      [19.6665, 40.1293],
      [19.6718, 40.1284], // Gjipe Beach
    ],
    bestMonths: "May – October",
    logistics: [
      "Park near the Gjipe trailhead off the SH8 coastal road.",
      "Seasonal beach bar at the bottom; bring water out of season.",
      "Loose gravel on the descent — proper shoes recommended.",
    ],
    sq: {
      name: "Kanioni i Gjipesë drejt Plazhit",
      region: "Riviera Joniane",
      summary:
        "Zbritje e shkurtër nëpër një kanion guri gëlqeror drejt një plazhi të fshehtë ndërmjet Himarës dhe Dhërmit. Notim në fund.",
      bestMonths: "Maj – Tetor",
      logistics: [
        "Parkim pranë kryqëzimit Gjipe nga rruga bregdetare SH8.",
        "Bar plazhi sezonal në fund; sillni ujë jashtë sezonit.",
        "Zhavori i lirshëm në zbritje — rekomandohen këpucë të përshtatshme.",
      ],
    },
  },
  {
    slug: "liqeni-novosej",
    name: "Liqeni Novosej",
    region: "Kukës / Korab-Koritnik",
    summary:
      "A forest loop through the Meshtekne natural monument inside Korab-Koritnik National Park, passing alpine meadows with diverse flowers and birch stands with medicinal plants. Starts at km 27 of the Kukës–Shishtavec road.",
    difficulty: "hard",
    distanceKm: 12.1,
    ascentM: 379,
    durationHours: 3.5,
    trailhead: [20.569998, 41.977344],
    geometry: [
      [20.5700, 41.9773], // km 27, Kukës–Shishtavec road
      [20.5748, 41.9792],
      [20.5810, 41.9820], // toward Novosej village
      [20.5878, 41.9826], // Novosej village (~1 300 m)
      [20.5920, 41.9780],
      [20.5940, 41.9720],
      [20.5900, 41.9660],
      [20.5840, 41.9590], // Meshtekne forest lower
      [20.5740, 41.9540],
      [20.5630, 41.9560],
      [20.5560, 41.9620],
      [20.5540, 41.9690],
      [20.5580, 41.9740],
      [20.5640, 41.9770],
      [20.5700, 41.9773], // back to start
    ],
    bestMonths: "May – October",
    logistics: [
      "Furgon from Kukës to Shishtavec; alight at km 27 marker on the main road.",
      "The trail starts on the right side of the Kukës–Shishtavec road; public parking along the main road.",
      "Loop route — returns to the same trailhead.",
      "Part of Korab-Koritnik National Park; no facilities on the trail.",
    ],
    source: "OutdoorActive #801678548",
    sq: {
      name: "Liqeni Novosej",
      region: "Kukës / Korab-Koritnik",
      summary:
        "Lak pylli nëpër monumentin natyror Meshtekne brenda Parkut Kombëtar Korab-Koritnik, duke kaluar nëpër livadhe alpine me lule të larmishme dhe pyje thupre me bimë medicinale. Fillon në km 27 të rrugës Kukës–Shishtavec.",
      bestMonths: "Maj – Tetor",
      logistics: [
        "Furgon nga Kukësi drejt Shishtavecit; zbrisnin te shenja e km 27 në rrugë.",
        "Shtigu fillon në anën e djathtë të rrugës Kukës–Shishtavec; parkim publik gjatë rrugës kryesore.",
        "Rrugë lak — kthehet te i njëjti kryqëzim.",
        "Pjesë e Parkut Kombëtar Korab-Koritnik; nuk ka facilitete në shteg.",
      ],
    },
  },
  {
    slug: "shishtavec-border-loop",
    name: "Shishtavec Border Loop",
    region: "Kukës / Korab-Koritnik",
    summary:
      "A challenging alpine circuit from Shishtavec village into the Korab-Koritnik Nature Park, climbing to 2,022 m along the Albania–Kosovo border ridge with panoramic views over both countries.",
    difficulty: "hard",
    distanceKm: 12.2,
    ascentM: 735,
    durationHours: 4.5,
    trailhead: [20.605486, 41.980083],
    geometry: [
      [20.6055, 41.9801], // Shishtavec village (~1 283 m)
      [20.6120, 41.9840],
      [20.6190, 41.9890],
      [20.6260, 41.9950],
      [20.6320, 42.0010], // ascending toward border ridge
      [20.6280, 42.0080],
      [20.6180, 42.0130], // border ridge area (~2 022 m)
      [20.6060, 42.0100],
      [20.5980, 42.0030],
      [20.5940, 41.9960],
      [20.5970, 41.9890],
      [20.6010, 41.9840],
      [20.6055, 41.9801], // back to Shishtavec
    ],
    bestMonths: "June – October",
    logistics: [
      "Furgon from Kukës to Shishtavec village (~32 km, 1 h); loop returns to same start.",
      "Guesthouses in Shishtavec village; no facilities on the ridge.",
      "Crosses into the Albania–Kosovo border zone — stay on marked trails.",
      "Exposed ridge above 1,800 m; avoid in thunderstorms.",
    ],
    source: "OutdoorActive #810314460",
    sq: {
      name: "Laku i Shishtavecit (Vajtje-Ardhje Kufitar)",
      region: "Kukës / Korab-Koritnik",
      summary:
        "Qark alpin sfidues nga fshati Shishtavec brenda Parkut Natyror Korab-Koritnik, duke ngjetur deri në 2 022 m përgjatë kufirit shqiptaro-kosovar me pamje panoramike mbi të dy vendet.",
      bestMonths: "Qershor – Tetor",
      logistics: [
        "Furgon nga Kukësi drejt fshatit Shishtavec (~32 km, 1 h); laku kthehet te i njëjti nisje.",
        "Bujtina në fshatin Shishtavec; nuk ka facilitete në kreshtë.",
        "Kalon zonën kufitare Shqipëri–Kosovë — qëndroni te shtigjet e shënuara.",
        "Kreshta e ekspozuar mbi 1 800 m; shmangni gjatë stuhive.",
      ],
    },
  },
  {
    slug: "shtegu-i-ngjyrave",
    name: "Shtegu i Ngjyrave (Trail of Colors)",
    region: "Kukës / Korab-Koritnik",
    summary:
      "A point-to-point traverse from Shishtavec/Novosej to Grykë Çajë through the largest alpine pastures in southeastern Europe. Home to the endemic Albanian Lily and part of the High Scardus Trail.",
    difficulty: "moderate",
    distanceKm: 18.5,
    ascentM: 1034,
    durationHours: 7.5,
    trailhead: [20.5881, 41.9828],
    geometry: [
      [20.5881, 41.9828], // Novosej village (~1 300 m)
      [20.5855, 41.9770], // heading SW toward lake
      [20.5810, 41.9700], // Liqeni i Novosejës (~1 500 m)
      [20.5795, 41.9580], // alpine pastures (~1 700 m)
      [20.5780, 41.9440], // Kallabak shoulder (~1 950 m)
      [20.5753, 41.9173], // Maja e Kallabakut peak (~2 174 m)
      [20.5630, 41.9060], // descent SW, High Scardus ridge
      [20.5370, 41.8950], // Çajë valley approach
      [20.5000, 41.8833], // Grykë-Çajë village
    ],
    bestMonths: "May – October",
    logistics: [
      "Furgon from Kukës to Shishtavec (~32 km, 1 h); arrange return transport from Grykë Çajë before setting out.",
      "Guesthouses in Shishtavec village; basic accommodation at Grykë Çajë.",
      "Fill up at Novosej Lake (1 500 m) — reliable alpine streams above, scarce below the pass.",
      "Part of the High Scardus Trail (495 km, Albania–Kosovo–North Macedonia).",
    ],
    sq: {
      name: "Shtegu i Ngjyrave",
      region: "Kukës / Korab-Koritnik",
      summary:
        "Kalim pikë-për-pikë nga Shishtaveci/Novoseja drejt Grykës Çajë nëpër livadhet alpine më të mëdha të Evropës Juglindore. Vendbanim i Lilyçes Shqiptare endemike dhe pjesë e Shtegut të Lartë Scardus.",
      bestMonths: "Maj – Tetor",
      logistics: [
        "Furgon nga Kukësi drejt Shishtavecit (~32 km, 1 h); organizoni transport kthimi nga Gryka Çajë para nisjes.",
        "Bujtina në fshatin Shishtavec; akomodim bazik në Grykën Çajë.",
        "Mbushni ujë te Liqeni i Novosejt (1 500 m) — burime alpine të besueshme lart, të pakta poshtë grykës.",
        "Pjesë e Shtegut të Lartë Scardus (495 km, Shqipëri–Kosovë–Maqedonia e Veriut).",
      ],
    },
  },
  {
    slug: "maja-e-kallabakut",
    name: "Maja e Kallabakut Summit Loop",
    region: "Kukës / Korab-Koritnik",
    summary:
      "A round-trip ascent to the 2,174 m summit of Kallabak from Shishtavec, climbing through open alpine pastures along the Albania–Kosovo border ridge. Short but rewarding.",
    difficulty: "moderate",
    distanceKm: 12,
    ascentM: 870,
    durationHours: 5.5,
    trailhead: [20.5881, 41.9828],
    geometry: [
      [20.5881, 41.9828], // Novosej village (~1 300 m)
      [20.5855, 41.9770], // heading SW toward lake
      [20.5810, 41.9700], // Liqeni i Novosejës (~1 500 m)
      [20.5795, 41.9580], // open pastures (~1 700 m)
      [20.5780, 41.9440], // summit approach (~1 950 m)
      [20.5753, 41.9173], // Maja e Kallabakut (~2 174 m)
      [20.5780, 41.9440],
      [20.5795, 41.9580],
      [20.5810, 41.9700],
      [20.5855, 41.9770],
      [20.5881, 41.9828], // back to Novosej
    ],
    bestMonths: "June – October",
    logistics: [
      "Furgon from Kukës to Shishtavec (~32 km, 1 h); return from same trailhead.",
      "Guesthouses in Shishtavec village; no facilities higher up.",
      "Water at Novosej Lake (~1 500 m); carry extra above the lake.",
      "Exposed ridge on the final approach — avoid in thunderstorms.",
    ],
    sq: {
      name: "Maja e Kallabakut (Vajtje-Ardhje)",
      region: "Kukës / Korab-Koritnik",
      summary:
        "Ngjitje vajtje-ardhje nga Shishtaveci deri në majën 2 174 m të Kallabakut, nëpër livadhe alpine të hapura përgjatë kufirit shqiptaro-kosovar. E shkurtër por shpërblyese.",
      bestMonths: "Qershor – Tetor",
      logistics: [
        "Furgon nga Kukësi drejt Shishtavecit (~32 km, 1 h); kthim nga i njëjti kryqëzim.",
        "Bujtina në fshatin Shishtavec; nuk ka facilitete lart.",
        "Ujë te Liqeni i Novosejt (~1 500 m); mbani rezervë mbi liqen.",
        "Kreshta e ekspozuar në afrimin final — shmangni gjatë stuhive.",
      ],
    },
  },
  {
    slug: "koritnik-maja-e-pikellimes",
    name: "Koritnik – Maja e Pikëllimës",
    region: "Kukës / Koritnik",
    summary:
      "A long ridge circuit to the 2,396 m summit of Koritnik in the Korab-Koritnik Nature Park, ascending from Zapod village through beech forest onto a dramatic horseshoe ridge on the Albania–Kosovo border.",
    difficulty: "moderate",
    distanceKm: 22,
    ascentM: 1200,
    durationHours: 7.5,
    trailhead: [20.5554, 42.0513],
    geometry: [
      [20.5554, 42.0513], // Zapod village (~1 198 m)
      [20.5558, 42.0580],
      [20.5562, 42.0650],
      [20.5558, 42.0720],
      [20.5555, 42.0770],
      [20.5553, 42.0817], // Maja e Pikëllimës (~2 396 m)
      [20.5555, 42.0770],
      [20.5558, 42.0720],
      [20.5562, 42.0650],
      [20.5558, 42.0580],
      [20.5554, 42.0513], // back to Zapod
    ],
    bestMonths: "May – October",
    logistics: [
      "Drive or taxi from Kukës city to Zapod village (~20 km); no regular bus service.",
      "No accommodation on the mountain; base in Kukës city.",
      "Carry 2 L water — sources unreliable above Zapod village.",
      "Caution in winter: upper ridge ices over, making descent dangerous.",
    ],
    sq: {
      name: "Koritniku – Maja e Pikëllimës",
      region: "Kukës / Koritnik",
      summary:
        "Qark i gjatë kreshte deri në majën 2 396 m të Koritnikut në Parkun Natyror Korab-Koritnik, duke ngjetur nga fshati Zapod nëpër pyje lisi dhe në një kreshtë dramatike patkoi në kufirin shqiptaro-kosovar.",
      bestMonths: "Maj – Tetor",
      logistics: [
        "Drejtohuni ose merrni taksi nga qyteti i Kukësit drejt fshatit Zapod (~20 km); nuk ka linjë autobusi.",
        "Nuk ka akomodim në mal; bazë në qytetin e Kukësit.",
        "Mbani 2 L ujë — burimet janë të pabesueshme mbi fshatin Zapod.",
        "Kujdes në dimër: kreshta e sipërme ngrin, duke e bërë zbritjen të rrezikshme.",
      ],
    },
  },
  {
    slug: "maja-e-gjallices",
    name: "Maja e Gjallicës Summit",
    region: "Kukës / Gjallica",
    summary:
      "A full-day ascent to the highest peak in Kukës County at 2,489 m. The trail climbs from Brekijë village through beech forest onto open limestone ridges with panoramic views across northern Albania.",
    difficulty: "hard",
    distanceKm: 30,
    ascentM: 1250,
    durationHours: 8.5,
    trailhead: [20.5103, 41.9922],
    geometry: [
      [20.5103, 41.9922], // Brekijë village (~1 235 m)
      [20.5020, 41.9960],
      [20.4940, 42.0020],
      [20.4860, 42.0080],
      [20.4790, 42.0120],
      [20.4721, 42.0169], // Maja e Gjallicës (~2 489 m)
      [20.4790, 42.0120],
      [20.4860, 42.0080],
      [20.4940, 42.0020],
      [20.5020, 41.9960],
      [20.5103, 41.9922], // back to Brekijë
    ],
    bestMonths: "May – November",
    logistics: [
      "Drive from Kukës toward Topojan Commune; Brekijë village is ~25 km from Kukës city.",
      "Early start essential — 30 km round trip requires a full day.",
      "No facilities on the mountain; guesthouses possible in nearby villages.",
      "Part of the High Scardus Trail network.",
    ],
    sq: {
      name: "Maja e Gjallicës",
      region: "Kukës / Gjallica",
      summary:
        "Ngjitje gjatëditore deri në majën më të lartë të rrethit Kukës, 2 489 m. Shtigu ngjitet nga fshati Brekijë nëpër pyje lisi dhe kreshta guri gëlqeror me pamje panoramike mbi Shqipërinë e Veriut.",
      bestMonths: "Maj – Nëntor",
      logistics: [
        "Drejtohuni nga Kukësi drejt Komunës Topojan; fshati Brekijë është ~25 km nga qyteti i Kukësit.",
        "Nisja e hershme është e domosdoshme — 30 km vajtje-ardhje kërkon një ditë të plotë.",
        "Nuk ka facilitete në mal; bujtina të mundshme në fshatrat e afërt.",
        "Pjesë e rrjetit të Shtegut të Lartë Scardus.",
      ],
    },
  },
  {
    slug: "bicaj-tershen-brekije",
    name: "Bicaj–Tërshen–Brekijë Passage",
    region: "Kukës / Bicaj",
    summary:
      "A village-to-village traverse climbing from the Bicaj valley floor at 450 m to high summer pastures at 1,750 m before descending to Brekijë. A living cultural route still used by local shepherds.",
    difficulty: "moderate",
    distanceKm: 14.5,
    ascentM: 1400,
    durationHours: 7.5,
    trailhead: [20.4170, 41.9830],
    geometry: [
      [20.4170, 41.9830], // Mustafë village (~450 m)
      [20.4400, 41.9850], // Tërshen lower (~1 050 m)
      [20.4600, 41.9870], // Tërshen upper (~1 300 m)
      [20.4800, 41.9890], // Stanet e Bicajt (~1 750 m)
      [20.4960, 41.9910], // descent
      [20.5103, 41.9922], // Brekijë (~1 350 m)
    ],
    bestMonths: "April – October",
    logistics: [
      "Bicaj commune is ~35 km from Kukës city; arrange return transport from Brekijë before setting out.",
      "Spring and autumn best; the lower valley is hot in midsummer.",
      "Water in Tërshen village — fill up before the climb to the high pastures.",
      "The route connects with the Gjallica trail at Brekijë.",
    ],
    sq: {
      name: "Kalimi Bicaj–Tërshen–Brekijë",
      region: "Kukës / Bicaj",
      summary:
        "Kalim fshat-me-fshat duke ngjetur nga lugina e Bicajt në 450 m deri te kullotat verore të larta në 1 750 m para zbritjes në Brekijë. Rrugë kulturore e gjallë, akoma e përdorur nga barinjtë lokalë.",
      bestMonths: "Prill – Tetor",
      logistics: [
        "Komuna e Bicajit është ~35 km nga qyteti i Kukësit; organizoni transport kthimi nga Brekijë para nisjes.",
        "Pranvera dhe vjeshta janë stinët më të mira; lugina e poshtme është e nxehtë në mes të verës.",
        "Ujë në fshatin Tërshen — mbushni para ngjitjes drejt kullotave të larta.",
        "Rruga lidhet me shtegun e Gjallicës në Brekijë.",
      ],
    },
  },
  {
    slug: "maja-e-pashtrikut",
    name: "Maja e Pashtrikut Summit",
    region: "Has / Kukës",
    summary:
      "A short but steep ascent to the 1,988 m summit of Pashtrik in the Has Mountains, a distinctive border peak with sweeping views over Albania and Kosovo. Sacred to communities on both sides of the border.",
    difficulty: "moderate",
    distanceKm: 10,
    ascentM: 900,
    durationHours: 7.5,
    trailhead: [20.4982, 42.1875],
    geometry: [
      [20.4982, 42.1875], // Gjinal / Kishaj village (~1 070 m)
      [20.5060, 42.1940],
      [20.5130, 42.2000],
      [20.5185, 42.2055],
      [20.5239, 42.2104], // Maja e Pashtrikut (~1 988 m)
      [20.5185, 42.2055],
      [20.5130, 42.2000],
      [20.5060, 42.1940],
      [20.4982, 42.1875], // back to Gjinal
    ],
    bestMonths: "May – October",
    logistics: [
      "Drive or taxi from Krumë (Has district capital) to Gjinal/Kishaj village (~15 km).",
      "No facilities on the mountain; base in Krumë.",
      "Rocky, exposed upper section — sturdy footwear essential.",
      "The summit hosts annual traditional gatherings on both sides of the border.",
    ],
    sq: {
      name: "Maja e Pashtrikut",
      region: "Has / Kukës",
      summary:
        "Ngjitje e shkurtër por e pjerrët deri në majën 1 988 m të Pashtrikut në Malet e Hasit, majë kufitare e dallueshme me pamje të gjera mbi Shqipërinë dhe Kosovën. E shenjtë për bashkësitë në të dy anët e kufirit.",
      bestMonths: "Maj – Tetor",
      logistics: [
        "Drejtohuni ose merrni taksi nga Kruma (kryeqyteti i rrethit Has) drejt fshatit Gjinal/Kishaj (~15 km).",
        "Nuk ka facilitete në mal; bazë në Krumë.",
        "Seksioni i sipërm shkëmbor dhe i ekspozuar — këpucë të forta të domosdoshme.",
        "Maja pret tubime tradicionale vjetore në të dy anët e kufirit.",
      ],
    },
  },
  {
    slug: "pellumbas-cave",
    name: "Pëllumbas Cave (Black Cave) Trail",
    region: "Erzen Canyon, near Tirana",
    summary:
      "A canyon-edge path to a large prehistoric cave above the Erzen river. Easy family-friendly outing close to Tirana.",
    difficulty: "moderate",
    distanceKm: 5,
    ascentM: 300,
    durationHours: 3,
    trailhead: [19.9567, 41.2461],
    geometry: [
      [19.9567, 41.2461], // Pëllumbas village
      [19.9590, 41.2490],
      [19.9620, 41.2530],
      [19.9647, 41.2567], // Shpella e Zezë / cave entrance
    ],
    bestMonths: "March – November",
    logistics: [
      "Drive or taxi from Tirana to Pëllumbas village (~40 min).",
      "Bring a headlamp to enter the cave.",
      "No facilities at the cave; small shops in the village.",
    ],
    sq: {
      name: "Shpella e Pëllumbasit (Shpella e Zezë)",
      region: "Gryka e Erzenit, pranë Tiranës",
      summary:
        "Shtigje në anë të grykës drejt një shpelle prehistorike të madhe mbi lumin Erzen. Shëtitje e lehtë familjare afër Tiranës.",
      bestMonths: "Mars – Nëntor",
      logistics: [
        "Drejtohuni ose merrni taksi nga Tirana deri në fshatin Pëllumbas (~40 min).",
        "Sillni një fener për të hyrë në shpellë.",
        "Nuk ka facilitete pranë shpellës; dyqane të vogla në fshat.",
      ],
    },
  },
  {
    slug: "caje-shishtavec",
    name: "Çajë – Shishtavec",
    region: "Kukës / Korab-Koritnik",
    summary:
      "A long valley-to-mountain traverse from Grykë Çajë up through open alpine pastures to Shishtavec village, following the High Scardus Trail corridor. The reverse direction of Shtegu i Ngjyrave, starting lower and ending in the mountain village.",
    difficulty: "hard",
    distanceKm: 22.1,
    ascentM: 914,
    durationHours: 8.0,
    trailhead: [20.5000, 41.8833],
    geometry: [
      [20.5000, 41.8833], // Grykë-Çajë village (~600 m)
      [20.5120, 41.8950],
      [20.5250, 41.9070],
      [20.5370, 41.9150], // lower valley climb
      [20.5500, 41.9250],
      [20.5630, 41.9380], // Kallabak shoulder area
      [20.5700, 41.9540], // alpine pastures (~1 700 m)
      [20.5780, 41.9620],
      [20.5810, 41.9700],
      [20.5855, 41.9770],
      [20.5881, 41.9828], // Novosej village (~1 300 m)
      [20.6055, 41.9801], // Shishtavec village (~1 283 m)
    ],
    bestMonths: "May – October",
    logistics: [
      "Furgon from Kukës toward Peshkopi passes Grykë Çajë (~1.5 h); arrange return furgon from Shishtavec before setting out.",
      "Guesthouses in Shishtavec village at the end; no accommodation en route.",
      "Water at Novosej Lake (~1 500 m before the descent); carry enough for the long climb.",
      "Part of the High Scardus Trail (495 km, Albania–Kosovo–North Macedonia).",
    ],
    source: "OutdoorActive (Shishtavec area)",
    sq: {
      name: "Çajë – Shishtavec",
      region: "Kukës / Korab-Koritnik",
      summary:
        "Kalim i gjatë nga Gryka Çajë nëpër livadhe alpine të hapura drejt fshatit Shishtavec, duke ndjekur korridorin e Shtegut të Lartë Scardus. Drejtimi i kundërt i Shtegut të Ngjyrave, duke nisur nga ulësirat dhe duke mbaruar në fshatin malor.",
      bestMonths: "Maj – Tetor",
      logistics: [
        "Furgon nga Kukësi drejt Peshkopisë kalon Grykën Çajë (~1.5 h); organizoni furgon kthimi nga Shishtaveci para nisjes.",
        "Bujtina në fshatin Shishtavec në fund; nuk ka akomodim gjatë rrugës.",
        "Ujë te Liqeni i Novosejt (~1 500 m para zbritjes); mbani mjaftueshëm për ngjitjen e gjatë.",
        "Pjesë e Shtegut të Lartë Scardus (495 km, Shqipëri–Kosovë–Maqedonia e Veriut).",
      ],
    },
  },
];

export function getTrail(slug: string): Trail | undefined {
  return trails.find((t) => t.slug === slug);
}
