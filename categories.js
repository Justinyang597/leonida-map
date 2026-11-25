// How gtadb landmark tags map onto the filter categories.
// "#tag" = a map icon seen in-game. Plain tag = building type.
// A landmark takes the first category it matches, in the order listed here.

window.CATEGORIES = [
  { group: "Important", kind: "pin", items: [
    { id: "safehouse",   name: "Safehouses",      color: "#22c55e", tags: ["#safehouse"] },
    { id: "landmark",    name: "Landmarks",       color: "#facc15", tags: ["landmark"] },
  ]},
  { group: "Shops & Services", kind: "pin", items: [
    { id: "gas",         name: "Gas Stations",    color: "#f97316", tags: ["#gas"] },
    { id: "supermarket", name: "Supermarkets",    color: "#84cc16", tags: ["#supermarket"] },
    { id: "clothes",     name: "Clothing",        color: "#a855f7", tags: ["#clothes", "#shoes"] },
    { id: "hair",        name: "Barbers & Tattoo",color: "#ec4899", tags: ["#hair", "#tattoos"] },
    { id: "guns",        name: "Gun Stores",      color: "#ef4444", tags: ["#guns"] },
    { id: "electronics", name: "Electronics",     color: "#06b6d4", tags: ["#electronics"] },
    { id: "modshop",     name: "Mod Shops",       color: "#64748b", tags: ["#modshop", "#carwash"] },
    { id: "paynspray",   name: "Pay 'n' Spray",   color: "#14b8a6", tags: ["#pay'n'spray"] },
    { id: "fence",       name: "Fences",          color: "#eab308", tags: ["#fence"] },
    { id: "food",        name: "Food & Drink",    color: "#fb923c", tags: ["#food", "#fastfood", "#drinks", "#vendor"] },
  ]},
  { group: "Nightlife & Leisure", kind: "pin", items: [
    { id: "bar",         name: "Bars & Clubs",    color: "#d946ef", tags: ["#bar", "#nightclub", "#stripclub"] },
    { id: "sport",       name: "Sports & Racing", color: "#0ea5e9", tags: ["#tennis", "#racetrack"] },
    { id: "attraction",  name: "Attractions",     color: "#f472b6", tags: ["#ferriswheel", "#blimp"] },
  ]},
  { group: "Transport", kind: "pin", items: [
    { id: "airport",     name: "Airports",        color: "#38bdf8", tags: ["#airport", "#airbase"] },
    { id: "marina",      name: "Marinas",         color: "#2dd4bf", tags: ["#marina"] },
    { id: "transit",     name: "Bus & Rail",      color: "#60a5fa", tags: ["#bus", "#train", "#metro", "#metromover"] },
  ]},
  { group: "Emergency", kind: "pin", items: [
    { id: "police",      name: "Police & Jail",   color: "#3b82f6", tags: ["#police", "#jail"] },
    { id: "hospital",    name: "Hospitals",       color: "#f43f5e", tags: ["#hospital"] },
  ]},
  { group: "Buildings", kind: "dot", items: [
    { id: "hotel",       name: "Hotels",          color: "#f59e0b", tags: ["hotel"] },
    { id: "residential", name: "Residential",     color: "#a3e635", tags: ["residential"] },
    { id: "retail",      name: "Retail",          color: "#c084fc", tags: ["retail", "supermarket"] },
    { id: "restaurant",  name: "Restaurants",     color: "#fb7185", tags: ["restaurant"] },
    { id: "leisure",     name: "Leisure",         color: "#22d3ee", tags: ["leisure", "events"] },
    { id: "office",      name: "Offices",         color: "#94a3b8", tags: ["office"] },
    { id: "government",  name: "Government",      color: "#818cf8", tags: ["government", "public"] },
    { id: "industrial",  name: "Industrial",      color: "#a8a29e", tags: ["industrial", "utilities", "construction", "agriculture"] },
    { id: "transportation", name: "Transport Infra", color: "#7dd3fc", tags: ["transportation"] },
    { id: "natural",     name: "Nature",          color: "#4ade80", tags: ["natural"] },
    { id: "other",       name: "Other",           color: "#e2e8f0", tags: [] },
  ]},
];

// Kinds people can pick for community pins (icon ids from icons.js).
window.COMMUNITY_KINDS = [
  { id: "collectible", name: "Collectibles",  color: "#facc15" },
  { id: "easteregg",   name: "Easter Eggs",   color: "#c084fc" },
  { id: "vehicle",     name: "Vehicles",      color: "#38bdf8" },
  { id: "weapon",      name: "Weapons",       color: "#f87171" },
  { id: "stunt",       name: "Stunt Jumps",   color: "#fb923c" },
  { id: "activity",    name: "Activities",    color: "#4ade80" },
  { id: "other",       name: "Other",         color: "#e2e8f0" },
];

// Status flags: turning one off hides every landmark carrying it.
window.STATUSES = [
  { id: "unconfirmed", name: "Unconfirmed", hint: "Match not confirmed yet" },
  { id: "demolished",  name: "Demolished",  hint: "Real-world building is gone" },
  { id: "closed",      name: "Closed",      hint: "Real-world business closed" },
];
