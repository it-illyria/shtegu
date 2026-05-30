import type { Dictionary } from "./types";

const sq: Dictionary = {
  // App
  appName: "Shtegu",
  appTagline: "Shtigje hiking në Shqipëri — zbulo, planifiko, navigo.",

  // Nav/layout
  allTrails: "Të gjitha shtigjet",
  feedbackLink: "Komente",
  navExplore: "Eksploro",
  navNearMe: "Pranë meje",
  navSaved: "Të ruajtura",
  navSafety: "Siguria",
  navActivity: "Aktiviteti",
  navCommunity: "Komuniteti",
  navGear: "Pajisjet",
  navCompare: "Krahaso",

  // Footer
  footerDisclaimer:
    "Shtegu është një mjet planifikimi, jo pajisje navigimi. Rrugët mund të jenë afërsisht — ecni me përgjegjësi.",
  footerSafetyLink: "Siguria",

  // Trail list
  searchPlaceholder: "Kërko sipas emrit ose rajonit…",
  allDifficulties: "Të gjitha vështirësitë",
  trailCount: "{filtered} nga {total} shtigje",
  noTrailsFound: "Asnjë shteg nuk i përshtatet kërkimit tuaj.",
  filterDifficultyLabel: "Vështirësia",
  filterRegionLabel: "Rajoni",
  filterAllRegions: "Të gjitha rajonet",
  regionNorth: "Verior & Verilindor",
  regionWest: "Perëndimor",
  regionSouthEast: "Juglindor",
  regionSouth: "Jugor",

  // Trail detail
  distance: "Distanca",
  ascent: "Ngjitja",
  duration: "Kohëzgjatja",
  season: "Sezoni",
  loadingMap: "Duke ngarkuar hartën…",
  navigate: "Navigo (përdor vendndodhjen time)",
  stopNavigation: "Ndalo navigimin",
  locationOff: "Vendndodhja e çaktivizuar",
  elevation: "Lartësia",
  weather: "Moti",
  logistics: "Si të arrish & logjistikë",
  reviews: "Vlerësime",
  routeSource: "Të dhënat e rrugës: {source}",
  accuracy: "±{m} m",

  // Difficulty
  easy: "E lehtë",
  moderate: "Mesatare",
  hard: "E vështirë",
  expert: "Ekspert",

  // Safety notice (compact)
  safetyShort:
    "⚠️ Rrugët dhe statistikat mund të jenë afërsisht ose të vjetruara — mos u mbështesni vetëm në Shtegu për navigim. Kontrolloni kushtet, mbani një hartë dhe ecni me përgjegjësi.",
  safetyDisclaimerLink: "Siguria",

  // Safety page
  safetyBackHome: "← Kreu",
  safetyHeading: "Siguria",
  safetyIntro: "Ju lutemi lexoni këtë para se të mbështeteni në Shtegu në male.",
  safetyPlanningTitle: "Një mjet planifikimi, jo pajisje navigimi",
  safetyPlanningBody:
    "Shtegu është një ndihmë informative dhe planifikimi. Nuk është sistem i certifikuar navigimi. Mos u mbështetni vetëm tek ai për të gjetur rrugën. Gjithmonë mbani hartë offline, busull dhe/ose GPS të dedikuar, dhe dini si t'i përdorni.",
  safetyDataTitle: "Të dhënat e shtigjeve mund të jenë afërsisht ose të gabuara",
  safetyDataBody:
    "Rrugët vijnë nga OpenStreetMap dhe burime komunitare. Disa janë aproximacione të vizatuara me dorë dhe mund të jenë të pasakta, të vjetruara ose të pakompletuara. Distanca, ngjitja, vështirësia, moti dhe pikat e interesit janë vlerësime të nxjerra nga të dhëna të palëve të treta dhe mund të jenë të gabuara. Verifikoni kushtet lokalisht para se të niseni.",
  safetyRiskTitle: "Ecja malore bart rreziqe reale",
  safetyRiskBody:
    "Terreni malor, moti me ndryshime të shpejta, kalimi i lumenjve, fauna e egër dhe izolimi mund të jenë të rrezikshme. Alpet Shqiptare në veçanti janë të largëta, me mbulim të kufizuar të rrjetit celular dhe shërbime të kufizuara shpëtimi. Ju jeni përgjegjës për sigurinë tuaj:",
  safetyRiskList: [
    "Planifikoni rrugën tuaj dhe kontrolloni parashikimin para largimit.",
    "Tregoni dikujt planin tuaj dhe kohën e pritshme të kthimit.",
    "Mbani ujë, ushqim, shtresa të ngrohta/ujëprovuese dhe kit ndihmës të parë të mjaftueshme.",
    "Vlerësoni me ndershmëri kondicjonin dhe përvojën tuaj, dhe kthehuni kur është e nevojshme.",
    "Mos ecni vetëm në zona të largëta nëse mund ta shmangni.",
  ],
  safetyEmergencyTitle: "Urgjencë",
  safetyEmergencyBody:
    "Në Shqipëri, numri i përgjithshëm i urgjencës është 112. Mbulimi mund të mos jetë i disponueshëm në lugina të largëta — planifikoni sipas kësaj.",
  safetyLiabilityTitle: "Kufizim i përgjegjësisë",
  safetyLiabilityBody:
    "Shtegu ofrohet \"siç është\", pa asnjë garanci. Në masën maksimale të lejuar nga ligji, autorët dhe kontribuesit nuk pranojnë asnjë përgjegjësi për çdo dëmtim, humbje ose dëm që rrjedh nga përdorimi i kësaj aplikacioni ose mbështetja në të dhënat e saj. Përdoreni me rrezikun tuaj.",
  safetyAttributionTitle: "Të dhënat & atribuimi",
  safetyAttributionBody:
    "Të dhënat e hartës © kontribuesit e OpenStreetMap (ODbL). Pllatat e hartës bazë © Protomaps. Moti dhe lartësia nëpërmjet Open-Meteo. Pikat e interesit nëpërmjet OpenStreetMap Overpass API.",

  // Feedback
  feedbackBackLink: "← Të gjitha shtigjet",
  feedbackHeading: "Komente",
  feedbackSubheading:
    "Gjeni një defekt, të dhëna të gabuara rrugësh, ose keni një ide? Na tregoni — ankesat dhe sugjerimet janë njëlloj të mirëpritura.",
  feedbackNoConfig:
    "Komentet kërkojnë ID të formularit Formspree. Shtoni NEXT_PUBLIC_FORMSPREE_ID në .env.local për të aktivizuar formularin.",
  feedbackSuccess: "Faleminderit — reagimi juaj u dërgua. 🙏",
  feedbackTypeLabel: "Lloji",
  feedbackSuggestion: "Sugjerim",
  feedbackComplaint: "Ankesë",
  feedbackOther: "Tjetër",
  feedbackMessageLabel: "Mesazhi",
  feedbackMessagePlaceholder: "Çfarë mendoni? Defekte, shtigje që mungojnë, të dhëna të gabuara, ide…",
  feedbackEmailLabel: "Email",
  feedbackEmailHint: "(opsionale, nëse dëshironi një përgjigje)",
  feedbackEmailPlaceholder: "ju@shembull.com",
  feedbackSendButton: "Dërgo reagim",
  feedbackSending: "Duke dërguar…",
  feedbackErrorWait: "Ju lutemi prisni disa sekonda para se të dërgoni përsëri.",
  feedbackErrorFail: "Nuk u dërgua — ju lutemi provoni përsëri.",

  // Near me page
  nearMeHeading: "Shtigje pranë meje",
  nearMeSubheading: "Ndani vendndodhjen tuaj për të parë shtigjet më të afërta, të renditura nga më i afërti.",

  // Nearby component
  findNearMe: "Gjej shtigje pranë meje",
  updateLocation: "Përditëso vendndodhjen time",
  locating: "Duke ju gjetur…",
  locationError: "Nuk u mor vendndodhja juaj: {error}",
  locationDenied: "Leja u refuzua",
  locationUnavailable: "Vendndodhja nuk u gjet",
  locationTimeout: "Koha mbaroi — provoni përsëri",
  locationUnsupported: "Shfletuesi nuk e mbështet vendndodhjen",
  locationDeniedHelp: "Klikoni te ikona e bllokimit në shiritin e adresës dhe lejoni 'Location' për këtë faqe, pastaj provoni përsëri.",
  locationRetry: "Provo përsëri",
  nearbyBrowseFallback: "Shfletoni shtigjet sipas rajonit",
  locationPrompt: "Shtypni \"Gjej shtigje pranë meje\" për të aktivizuar vendndodhjen dhe të shihni shtigjet më të afërta.",
  nearestTrails: "Duke treguar {count} shtigjet më të afërta sipas distancës në vijë të drejtë.",
  nearestTrail: "Duke treguar shtegun {count} më të afërt sipas distancës në vijë të drejtë.",
  noTrailsAvailable: "Nuk ka shtigje të disponueshme.",
  distanceMeters: "{m} m larg",
  distanceKm: "{km} km larg",

  // Map
  trailhead: "Fillimi i shtegut",
  destination: "Destinacioni",
  trailStartLabel: "FILLIMI",
  trailEndLabel: "MBARIMI",
  downloadOfflineMap: "Shkarko hartën offline",
  downloading: "Duke shkarkuar…",
  offlineMapReady: "Harta offline gati ✓",
  downloadFailed: "Shkarkimi dështoi — provoni përsëri",
  pointsOfInterest: "Pikat e interesit",
  mapAria: "Hartë e {name}",
  poiWater: "Ujë",
  poiSpring: "Burim",
  poiViewpoint: "Pikëvëzhgim",
  poiHut: "Kasollje",
  poiPass: "Kalim malor",

  // Elevation
  loadingElevation: "Duke ngarkuar lartësinë…",
  elevationUnavailable: "Të dhënat e lartësisë nuk janë të disponueshme.",
  elevationAria: "Profili i lartësisë: lartësia në metra kundrejt distancës në kilometra",
  elevationMin: "Min {m} m",
  elevationMax: "Maks {m} m",
  elevationTotalAscent: "Ngjitja totale {m} m",
  elevationUnitM: "m",
  elevationStartKm: "0 km",
  elevationEndKm: "{km} km",

  // Weather
  loadingWeather: "Duke ngarkuar motin…",
  weatherUnavailable: "Moti nuk është i disponueshëm.",
  weatherToday: "Sot",
  weatherWind: "erë {kph} km/h",

  // Reviews
  reviewsNoConfig:
    "Vlerësimet kërkojnë konfigurimin e Supabase. Shtoni çelësat tuaj në .env.local për të aktivizuar vlerësimet e komunitetit.",
  reviewsSignInRequired:
    "Regjistrohu me email për të lënë një vlerësim.",
  reviewsNamePlaceholder: "Emri juaj (opsionale)",
  reviewsRatingLabel: "Vlerësimi",
  reviewsRatingOption: "{n} ★",
  reviewsRatingAria: "{n} nga 5",
  reviewsTextPlaceholder: "Si ishte shtegu? Kushtet, këshillat, paralajmërimet…",
  reviewsPost: "Posto vlerësim",
  reviewsPosting: "Duke postuar…",
  reviewsErrorWait: "Ju lutemi prisni disa sekonda para se të postoni përsëri.",
  reviewsErrorSession: "Nuk u nis një sesion — provoni përsëri.",
  reviewsErrorDuplicate: "Keni vlerësuar tashmë këtë shteg.",
  reviewsErrorTooMany: "Keni postuar disa vlerësime kohët e fundit — provoni më vonë.",
  reviewsErrorFail: "Nuk u postua — provoni përsëri.",
  reviewsNone: "Ende nuk ka vlerësime — jini i pari.",
  reviewsGuestBadge: "vizitor",
  reviewsMember: "Anëtar",
  reviewsAnonymous: "Anonim",

  // Auth
  authLoading: "…",
  authSignOut: "Dilni",
  authEmailPlaceholder: "ju@shembull.com",
  authSendMagicLink: "Dërgo lidhje magjike",
  authSending: "Duke dërguar…",
  authCheckInbox: "Kontrolloni kutinë tuaj postare për një lidhje magjike.",
  authError: "Provoni përsëri.",

  // Theme toggle
  themeSwitchLight: "Kaloni në modalitetin e ndritshëm",
  themeSwitchDark: "Kaloni në modalitetin e errët",

  // Language toggle
  langAlbanian: "SQ",
  langEnglish: "EN",

  // Home hero
  homeEyebrow: "Shqipëri · Shtigjet Alpine",
  homeHeroTagline: "Zbulo shtigjet e maleve.",
  homeTrailsLabel: "shtigje",
  homeRegionsLabel: "rajone",
  homeCountryLabel: "Shqipëri",
  heroFeaturedTrail: "Shteg i veçantë",
  heroViewTrail: "Shiko shtegun",
  heroSaveTrail: "Ruaj shtegun",
  heroSavedTrail: "Ruajtur",
  heroStatDistance: "Distanca",
  heroStatElevation: "Lartësi",
  heroStatTime: "Koha",

  // Footer
  footerColophon: "Shtegu — Shtigje alpine në Shqipëri",
  footerMadeWith: "Bërë me kujdes për malet e Shqipërisë.",

  // Trail edit / contributions
  editSuggestButton: "Suggjero ndryshim",
  editModalTitle: "Suggjero korrigjim",
  editModalDesc: "Të gjitha fushat janë të parapërgatitura — ndryshoni vetëm ato që kanë nevojë. Ndryshimi juaj do të rishikohet para se të bëhet publik.",
  editNameLabel: "Emri i shtegut (anglisht)",
  editNameSqLabel: "Emri i shtegut (shqip)",
  editRegionLabel: "Rajoni",
  editSummaryLabel: "Pershkrimi",
  editDifficultyLabel: "Vështirësia",
  editDistanceLabel: "Distanca (km)",
  editAscentLabel: "Ngjitja (m)",
  editDurationLabel: "Kohëzgjatja (orë)",
  editBestMonthsLabel: "Muajt më të mirë",
  editLogisticsLabel: "Logjistikë (një artikull për rresht)",
  editRouteLabel: "Skedari i rrugës (.gpx, .kml, .kmz, .tcx, .fit, .geojson)",
  editRouteHint: "Ngarkoni një skedar rruge të korrigjuar për të zëvendësuar gjeometrinë ekzistuese.",
  editRouteSelected: "Skedari: {name}",
  editRouteParsed: "{n} pika u lexuan.",
  editRouteError: "Nuk u lexua skedari — provoni .gpx ose .geojson.",
  editMessageLabel: "Arsyeja e ndryshimit",
  editMessagePlaceholder: "Çfarë është e gabuar? Çfarë po korrigjoni?",
  editSubmit: "Dërgoni për rishikim",
  editSubmitting: "Duke dërguar…",
  editSuccess: "Faleminderit — ndryshimi juaj u dorëzua dhe do të rishikohet para se të bëhet publik.",
  editErrorFail: "Nuk u dorëzua — ju lutemi provoni përsëri.",
  editCancel: "Anulo",
  editNoConfig: "Kontributet kërkojnë Supabase. Shtoni çelësat tuaj në .env.local.",

  // Condition reports
  conditionHeading: "Kushtet Aktuale",
  conditionGood: "Mirë",
  conditionMuddy: "Me baltë",
  conditionOvergrown: "E mbizotëruar",
  conditionClosed: "E mbyllur",
  conditionNone: "Nuk ka raporte të fundit.",
  conditionSubmit: "Raporto gjendjen",
  conditionSubmitting: "Po dërgon…",
  conditionNotes: "Shënime (opsionale)",
  conditionErrorWait: "Prisni 24 orë para se të raportoni përsëri.",
  conditionErrorFail: "Dërgimi dështoi. Provoni përsëri.",
  conditionReportedAgo: "{days} ditë më parë",
  conditionToday: "Sot",

  // Photos
  photosHeading: "Foto",
  photosUpload: "Shto foto",
  photosUploading: "Duke ngarkuar…",
  photosNone: "Ende nuk ka foto — bëhu i pari!",
  photosErrorSize: "Skedari duhet të jetë nën 5 MB",
  photosErrorUpload: "Ngarkimi dështoi",

  // GPX download
  downloadGpx: "Shkarko GPX",

  // Saved trails / bookmarks
  savedHeading: "Shtigje të Ruajtura",
  savedEmpty: "Nuk keni shtigje të ruajtura. Shtypni shenjën e faqeshënuesit mbi çdo shtig për ta ruajtur.",
  savedBookmark: "Ruaj shtigun",
  savedUnsave: "Hiq faqeshënuesin",

  // Activity page
  activityHeading: "Aktiviteti Im",
  activityTotalHikes: "Ekspeditë",
  activityTotalKm: "km të shkelura",
  activityTotalAscent: "m ngjitje",
  activityStreak: "ditë radhazi",
  activityLogHike: "Regjistro një ekspeditë",
  activityTrailLabel: "Shtigu",
  activityDateLabel: "Data",
  activityDurationLabel: "Kohëzgjatja (minuta)",
  activityNotesLabel: "Shënime",
  activitySubmit: "Regjistro",
  activitySubmitting: "Po ruaj…",
  activityNone: "Nuk keni regjistrime. Filloni të eksploroni!",
  activitySignInPrompt: "Hyni për të gjurmuar ekspeditat tuaja.",
  activityDelete: "Fshi",

  // Gear checklist
  gearHeading: "Lista e Pajisjeve",
  gearSubheading: "Gjithçka që ju nevojitet para se të hyni në malet shqiptare.",
  gearBackHome: "← Kreu",
  gearProgress: "{done} nga {total} të paketuara",
  gearReset: "Fshi",
  gearAllDone: "Jeni gati për të shkuar! 🎒",
  gearItemsOf: "{done}/{total}",

  // Share
  shareButton: "Ndaj",
  shareCopied: "U kopjua!",

  // Log hike
  logHikeButton: "Regjistro këtë shtegtim",

  // GPX import
  gpxImportButton: "Importo GPX",
  gpxImportHeading: "Rruga e importuar",
  gpxImportClear: "Pastro",
  gpxImportError: "Nuk mund të lexohet skedari GPX",
  gpxImportDistance: "Distanca",

  // Trail comparison
  compareHeading: "Krahaso Shtegjet",
  compareSubheading: "Zgjidh dy shtegje për t'i krahasuar krah për krah.",
  comparePickFirst: "Shtegu A",
  comparePickSecond: "Shtegu B",
  comparePickPlaceholder: "Zgjidh shteg…",
  compareBackHome: "← Të gjitha shtigjet",
  compareDistance: "Distanca",
  compareAscent: "Ngjitja",
  compareDuration: "Kohëzgjatja",
  compareDifficulty: "Vështirësia",
  compareSeason: "Sezoni",
  compareRegion: "Rajoni",
  compareDescription: "Përshkrimi",
  compareNoTrails: "Nuk u gjetën shtigje.",
  compareEmptyState: "Zgjidh dy shtegje sipër për t'i krahasuar.",

  // Trail proposals
  proposeButton: "Propozoni shteg",
  proposeModalTitle: "Propozoni Shteg të Ri",
  proposeModalDesc: "Dini një shteg që nuk është akoma në listë? Plotësoni detajet dhe bashkëngjitni skedarin GPX ose GeoJSON — ne do ta shqyrtojmë dhe do ta shtojmë në hartë.",
  proposeNotes: "Shënime për rishikuesin",
  proposeNotesPlaceholder: "Çdo gjë që duhet të dijë rishikuesi: aksesi, mbylljet sezonale, burimi i të dhënave…",
  proposeRouteHint: "Bashkëngjitni GPX ose GeoJSON për ta vendosur shtegun në hartë. Pa skedar mund të rishikohet por nuk do të shfaqet derisa të shtohet gjeometria.",
  proposeSubmit: "Dërgoni propozimin",
  proposeSubmitting: "Duke dërguar…",
  proposeSuccess: "Faleminderit — propozimi juaj u dërgua dhe do të rishikohet para se të bëhet publik.",
  proposeErrorFail: "Nuk u dërgua — ju lutemi provoni përsëri.",
};

export default sq;
