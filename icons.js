// Original icon set: white glyphs on a 24x24 grid, drawn on a colored badge.
// `var(--c)` inside a glyph punches out a detail in the badge color.
const S = 'fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

window.ICONS = {
  safehouse:   `<path d="M12 3 3 10.5V21h6.5v-6h5v6H21V10.5z"/>`,
  landmark:    `<path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/>`,
  gas:         `<rect x="4" y="3" width="10" height="18" rx="1.5"/><rect x="6.5" y="5.5" width="5" height="4.5" fill="var(--c)"/><path d="M14 9h2.5l2 2v7a1.5 1.5 0 0 0 3 0V8l-3-3" ${S} stroke-width="1.8"/>`,
  supermarket: `<path d="M2 4h3l2.4 10h10.2L20 7H6.5" ${S}/><circle cx="9" cy="19" r="1.9"/><circle cx="17" cy="19" r="1.9"/>`,
  clothes:     `<path d="M8.5 3 3 6.2l2 4.3 2-1V21h10V9.5l2 1 2-4.3L15.5 3c0 1.9-1.5 3.2-3.5 3.2S8.5 4.9 8.5 3z"/>`,
  hair:        `<circle cx="6" cy="17.5" r="3" ${S}/><circle cx="18" cy="17.5" r="3" ${S}/><path d="M8 15.5 17.5 3M16 15.5 6.5 3" ${S}/>`,
  guns:        `<circle cx="12" cy="12" r="7" ${S}/><circle cx="12" cy="12" r="1.8"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5" ${S}/>`,
  electronics: `<rect x="2" y="4" width="20" height="14" rx="2"/><rect x="4.5" y="6.5" width="15" height="9" rx=".5" fill="var(--c)"/><path d="M8 21h8" ${S}/>`,
  modshop:     `<path d="M21.3 6.4a5.2 5.2 0 0 1-7 4.9l-8.4 8.4a2.1 2.1 0 1 1-3-3l8.4-8.4a5.2 5.2 0 0 1 6.5-6.8l-3.2 3.2.8 2.6 2.6.8z"/>`,
  paynspray:   `<rect x="6" y="8.5" width="9" height="13" rx="2"/><rect x="8.5" y="4.5" width="4" height="4"/><path d="M16.5 3.5h1.5M18 6h3M16.5 8.5H18" ${S} stroke-width="1.6"/>`,
  fence:       `<path d="M12 2.5v19M16.6 6.6C15.7 5.4 14 4.8 12 4.8c-2.8 0-4.4 1.4-4.4 3.2 0 4.3 9.2 2.3 9.2 7.2 0 1.9-1.8 3.2-4.8 3.2-2.3 0-4-.7-5-2.2" ${S} stroke-width="2.3"/>`,
  food:        `<path d="M4 10.5a8 6.5 0 0 1 16 0z"/><rect x="3" y="12.5" width="18" height="2.6" rx="1.2"/><path d="M4 17h16v.5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/>`,
  bar:         `<path d="M3.5 4h17L12 13.5z"/><path d="M12 13.5V20M8 21h8" ${S}/>`,
  sport:       `<path d="M5 2.5v19" ${S}/><path d="M6 3.5h13l-3 4.5 3 4.5H6z"/>`,
  attraction:  `<circle cx="12" cy="10" r="7" ${S}/><path d="M12 3v14M5 10h14M7 5l10 10M17 5 7 15" ${S} stroke-width="1.2"/><path d="M8 22l4-8 4 8" ${S}/>`,
  airport:     `<path d="M21.5 16v-2L13.5 9V3.8a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5l-2-1.5v-5.5z"/>`,
  marina:      `<circle cx="12" cy="5" r="2.2" ${S}/><path d="M12 7.5V21M4.5 13.5a7.5 7.5 0 0 0 15 0M8 11h8" ${S}/>`,
  transit:     `<rect x="4" y="2.5" width="16" height="16.5" rx="3"/><rect x="6.3" y="5.3" width="11.4" height="6" rx="1" fill="var(--c)"/><circle cx="8.2" cy="15.3" r="1.4" fill="var(--c)"/><circle cx="15.8" cy="15.3" r="1.4" fill="var(--c)"/><path d="M7 19v2.5M17 19v2.5" ${S}/>`,
  police:      `<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="M12 7.3l1.4 2.8 3.1.5-2.3 2.1.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.1 3.1-.5z" fill="var(--c)"/>`,
  hospital:    `<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>`,

  building:    `<path d="M4 21V5l8-3v19zM13 21V8l7 2.5V21z"/><path d="M6.5 7h3M6.5 10.5h3M6.5 14h3M15.5 12.5h2M15.5 16h2" stroke="var(--c)" stroke-width="1.6"/>`,

  // layers + pins
  landmarks:   `<path d="M12 2a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.6" fill="var(--c)"/>`,
  mine:        `<path d="M12 2.5 21 12l-9 9.5L3 12z"/>`,
  community:   `<circle cx="9" cy="7.5" r="3.2"/><circle cx="17.2" cy="9" r="2.5"/><path d="M2.5 20.5c0-3.7 2.9-6.3 6.5-6.3s6.5 2.6 6.5 6.3zM16.6 20.5c0-2.2-.6-3.9-1.7-5.2 3.4-.4 6.6 1.6 6.6 5.2z"/>`,

  // community pin kinds
  collectible: `<path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5" ${S} stroke="var(--c)" stroke-width="2.4"/>`,
  easteregg:   `<path d="M12 2.5c-3.9 0-7 6.2-7 11a7 7 0 0 0 14 0c0-4.8-3.1-11-7-11z"/><path d="M6 13l3-2 3 2 3-2 3 2" ${S} stroke="var(--c)" stroke-width="1.8"/>`,
  vehicle:     `<path d="M3 17v-4.5L5.5 7h13l2.5 5.5V17z"/><rect x="7" y="9" width="10" height="3" rx=".5" fill="var(--c)"/><circle cx="7.5" cy="17.5" r="2.3"/><circle cx="16.5" cy="17.5" r="2.3"/>`,
  weapon:      `<path d="M3 7.5h17v4h-6l-1 2h-3l-.8 6.5H5l1.3-8.5H3z"/>`,
  stunt:       `<path d="M2 20h20L22 9z"/><path d="M4 9c2.5-4 7-6 11-4" ${S}/><path d="M13 3l2.5 2-2.5 2.3" ${S}/>`,
  activity:    `<circle cx="12" cy="12" r="9.5"/><path d="M10 7.5v9l7-4.5z" fill="var(--c)"/>`,
  other:       `<circle cx="12" cy="12" r="9.5"/><circle cx="7.5" cy="12" r="1.6" fill="var(--c)"/><circle cx="12" cy="12" r="1.6" fill="var(--c)"/><circle cx="16.5" cy="12" r="1.6" fill="var(--c)"/>`,
};

// <svg> markup for an icon id, sized by CSS.
window.icon = id => `<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">${window.ICONS[id] ?? window.ICONS.other}</svg>`;
