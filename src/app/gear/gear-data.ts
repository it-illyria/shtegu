export interface GearItem {
  id: string;
  en: string;
  sq: string;
}

export interface GearCategory {
  id: string;
  emoji: string;
  en: string;
  sq: string;
  items: GearItem[];
}

export const GEAR_CATEGORIES: GearCategory[] = [
  {
    id: "navigation",
    emoji: "🗺️",
    en: "Navigation",
    sq: "Navigim",
    items: [
      { id: "nav-map",     en: "Topographic map of the area",              sq: "Hartë topografike e zonës" },
      { id: "nav-compass", en: "Compass",                                   sq: "Busull" },
      { id: "nav-offline", en: "Downloaded offline map (Shtegu / Maps.me)", sq: "Hartë offline e shkarkuar (Shtegu / Maps.me)" },
      { id: "nav-phone",   en: "Fully charged phone",                       sq: "Telefon i karikuar plotësisht" },
    ],
  },
  {
    id: "clothing",
    emoji: "🧥",
    en: "Clothing & Footwear",
    sq: "Veshje & Këpucë",
    items: [
      { id: "cl-boots",      en: "Sturdy, broken-in hiking boots",        sq: "Çizme solide, të vjetra hiking" },
      { id: "cl-base",       en: "Moisture-wicking base layer",           sq: "Shtresë bazë transpirante" },
      { id: "cl-mid",        en: "Insulating mid-layer (fleece / down)",  sq: "Shtresë e mesme izoluese (polar / puh)" },
      { id: "cl-shell",      en: "Waterproof jacket and trousers",        sq: "Xhaketë dhe pantallona ujëprovuese" },
      { id: "cl-hat-gloves", en: "Warm hat and gloves",                   sq: "Kapelë e ngrohtë dhe dorezë" },
      { id: "cl-sun-hat",    en: "Sun hat and sunglasses",                sq: "Kapelë dielli dhe syze dielli" },
      { id: "cl-socks",      en: "Spare moisture-wicking socks",          sq: "Çorape rezervë transpirante" },
      { id: "cl-gaiters",    en: "Gaiters (for muddy or snowy terrain)",  sq: "Gaiter (për terren me baltë ose borë)" },
    ],
  },
  {
    id: "safety",
    emoji: "🩹",
    en: "Safety & First Aid",
    sq: "Siguria & Ndihma e Parë",
    items: [
      { id: "sf-kit",       en: "First-aid kit",                         sq: "Kit i ndihmës së parë" },
      { id: "sf-whistle",   en: "Emergency whistle",                     sq: "Fishkëllimë emergjence" },
      { id: "sf-headlamp",  en: "Headlamp + spare batteries",            sq: "Llambë koke + bateri rezervë" },
      { id: "sf-knife",     en: "Multi-tool or knife",                   sq: "Multi-mjet ose thikë" },
      { id: "sf-sunscreen", en: "Sun cream SPF 30+",                     sq: "Krem dielli SPF 30+" },
      { id: "sf-insect",    en: "Insect repellent",                      sq: "Sprej kundër insekteve" },
    ],
  },
  {
    id: "food",
    emoji: "🍫",
    en: "Food & Water",
    sq: "Ushqim & Ujë",
    items: [
      { id: "fw-water",   en: "At least 2 L water per person",          sq: "Të paktën 2 L ujë për person" },
      { id: "fw-filter",  en: "Water purification tablets or filter",   sq: "Tableta ose filtër për pastrimin e ujit" },
      { id: "fw-snacks",  en: "High-energy snacks (nuts, bars, fruit)", sq: "Ushqime energjetike (arra, bare, fruta)" },
      { id: "fw-lunch",   en: "Packed lunch",                           sq: "Drekë e paketuar" },
      { id: "fw-reserve", en: "Emergency rations (extra day's food)",   sq: "Ushqim rezervë (një ditë shtesë)" },
    ],
  },
  {
    id: "shelter",
    emoji: "⛺",
    en: "Shelter & Survival",
    sq: "Strehim & Mbijetesë",
    items: [
      { id: "sh-bivvy",   en: "Emergency bivvy bag or space blanket",   sq: "Qese bivy emergjence ose batanije hapësinore" },
      { id: "sh-poles",   en: "Trekking poles",                         sq: "Shkopinj trekingu" },
      { id: "sh-drybag",  en: "Dry bags for electronics and documents", sq: "Çanta kundër ujit për elektronikë dhe dokumente" },
      { id: "sh-lighter", en: "Lighter or matches (waterproof)",        sq: "Çakmak ose shkrepëse (ujëprovuese)" },
    ],
  },
  {
    id: "communication",
    emoji: "📡",
    en: "Communication",
    sq: "Komunikim",
    items: [
      { id: "co-contacts",  en: "Emergency contacts written down",        sq: "Kontaktet e emergjencës të shkruara" },
      { id: "co-112",       en: "Albanian emergency number: 112",         sq: "Numri i emergjencës në Shqipëri: 112" },
      { id: "co-plan",      en: "Told someone your route and return time", sq: "I keni treguar dikujt rrugën dhe kohën e kthimit" },
      { id: "co-powerbank", en: "Portable power bank (fully charged)",    sq: "Power bank portativ (i karikuar plotësisht)" },
    ],
  },
];

export const ALL_ITEM_IDS = GEAR_CATEGORIES.flatMap((c) => c.items.map((i) => i.id));
