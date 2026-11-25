(async () => {
  // ---------- helpers ----------
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem("leonida.v2." + k)) ?? d; } catch { return d; } },
    set: (k, v) => localStorage.setItem("leonida.v2." + k, JSON.stringify(v)),
  };
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const icon = window.icon;
  let toastTimer;
  const toast = (msg, err = false) => {
    const t = $("#toast"); t.textContent = msg; t.className = err ? "err" : ""; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 3500);
  };
  const ago = iso => {
    const s = (Date.now() - new Date(iso)) / 1000;
    for (const [n, u] of [[86400 * 365, "year"], [86400 * 30, "month"], [86400, "day"], [3600, "hour"], [60, "minute"]])
      if (s >= n) { const v = Math.floor(s / n); return `${v} ${u}${v > 1 ? "s" : ""} ago`; }
    return "just now";
  };

  // ---------- map ----------
  // gtadb grid: 32768 game units wide, origin in the middle, 1024px at zoom 0, y points north.
  const CRS = L.extend({}, L.CRS.Simple, { transformation: new L.Transformation(1 / 32, 512, -1 / 32, 512) });
  const ll = (x, y) => L.latLng(y, x);
  const xy = p => [Math.round(p.lng), Math.round(p.lat)];

  const mapEl = $("#map");
  const map = L.map(mapEl, {
    crs: CRS, minZoom: 0, maxZoom: 8, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 90,
    zoomControl: false, attributionControl: false,
    maxBounds: [[-12500, -14000], [14000, 7000]], maxBoundsViscosity: 0.8,
  });
  L.control.zoom({ position: "bottomright" }).addTo(map);

  const DAY_RANGES = { 0: [[0, 0], [2, 3]], 1: [[1, 1], [5, 6]], 2: [[2, 2], [10, 12]], 3: [[4, 4], [20, 25]],
    4: [[8, 8], [41, 51]], 5: [[17, 17], [83, 103]], 6: [[34, 34], [167, 206]] };
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  const Tiles = L.TileLayer.extend({
    getTileUrl(c) {
      const r = DAY_RANGES[c.z];
      if (!r || c.x < r[0][0] || c.x > r[1][0] || c.y < r[0][1] || c.y > r[1][1]) return BLANK;
      return `vendor/gtadb/maps/tiles/6/day/${c.z}/${c.z},${c.y},${c.x}.jpg`;
    },
  });
  new Tiles("", { minNativeZoom: 0, maxNativeZoom: 6, maxZoom: 8, noWrap: true, keepBuffer: 4, errorTileUrl: BLANK }).addTo(map);

  const [hx, hy, hz, hid] = location.hash.slice(1).split(",");
  if (hz !== undefined && !isNaN(+hx)) map.setView(ll(+hx, +hy), +hz);
  else map.setView(ll(-3300, 400), 1.25);

  const setZoomClass = () => { mapEl.dataset.z = map.getZoom() < 2 ? "far" : "near"; };
  map.on("zoomend", setZoomClass); setZoomClass();

  // ---------- landmark data ----------
  const CATS = window.CATEGORIES.flatMap(g => g.items.map(c => ({ ...c, group: g.group, kind: g.kind })));
  const catById = Object.fromEntries(CATS.map(c => [c.id, c]));
  const KINDS = window.COMMUNITY_KINDS;
  const kindById = Object.fromEntries(KINDS.map(k => [k.id, k]));
  const STATUS_IDS = new Set(window.STATUSES.map(s => s.id));
  const HIDDEN_TAG = t => /^l\d$/.test(t) || t.startsWith("//") || t.startsWith("@");
  const catIcon = c => c.kind === "pin" ? c.id : "building";

  let raw;
  try {
    raw = await (await fetch("vendor/gtadb/map/data/6/landmarks.json")).json();
  } catch {
    $("#loading").textContent = "Couldn't load landmark data. Run the site through a web server.";
    return;
  }

  const landmarks = [];
  for (const [id, v] of Object.entries(raw)) {
    const [ig, pos, igPhoto, rl, latlng, rlPhoto, tags = []] = v;
    if (pos?.length !== 2) continue; // not placed on the map yet
    const cat = CATS.find(c => c.tags.some(t => tags.includes(t)))?.id ?? "other";
    const [first, ...rest] = (ig || "?").split(", ");
    const l = {
      type: "lm", id, cat, x: pos[0], y: pos[1], ig, rl, latlng,
      name: first && first !== "?" ? first : "Unnamed building",
      named: !!first && first !== "?",
      area: rest.join(", "),
      tags: tags.filter(t => !HIDDEN_TAG(t)),
      status: tags.filter(t => STATUS_IDS.has(t)),
      enterable: tags.includes("enterable"),
      photos: [igPhoto?.length === 2 && "ig", rlPhoto?.length === 2 && "rl"].filter(Boolean),
    };
    l.search = `${l.name} ${l.area} ${rl ?? ""} ${id} ${catById[cat].name} ${l.tags.join(" ")}`.toLowerCase();
    landmarks.push(l);
  }
  const byId = Object.fromEntries(landmarks.map(l => [l.id, l]));
  const photoUrl = (id, kind) => `vendor/gtadb/map/photos/6/${id},${kind}.jpg`;

  // ---------- community backend (Supabase REST, no SDK) ----------
  const { supabaseUrl: SB_URL, supabaseAnonKey: SB_KEY } = window.CONFIG || {};
  const sb = SB_URL && SB_KEY ? {
    async req(path, body) {
      const r = await fetch(`${SB_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
        method: body ? "POST" : "GET",
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
        body: body && JSON.stringify(body),
      });
      const text = await r.text();
      const data = text ? JSON.parse(text) : null;
      if (!r.ok) throw new Error(data?.hint || data?.message || r.statusText);
      return data;
    },
    list: () => sb.req("community_pins?select=id,x,y,name,note,kind,score,created_at&order=created_at.desc&limit=5000"),
    add: p => sb.req("rpc/add_pin", { p_x: p.x, p_y: p.y, p_name: p.name, p_note: p.note, p_kind: p.kind }),
    vote: (id, v) => sb.req("rpc/vote_pin", { p_id: id, p_value: v }),
    report: id => sb.req("rpc/report_pin", { p_id: id }),
  } : null;

  // ---------- state ----------
  const state = {
    hiddenCats: new Set(store.get("hiddenCats", [])),
    hiddenKinds: new Set(store.get("hiddenKinds", [])),
    hiddenStatus: new Set(store.get("hiddenStatus", [])),
    closedGroups: new Set(store.get("closedGroups", [])),
    layers: { landmarks: true, mine: true, community: true, ...store.get("layers2", {}) },
    enterableOnly: store.get("enterableOnly", false),
    visited: new Set(store.get("visited", [])),
    mine: store.get("pins", []).map(p => ({ ...p, type: "mine" })),
    community: [],
    communityStatus: sb ? "loading" : "off",
    myVotes: store.get("votes", {}),
    reported: new Set(store.get("reported", [])),
    selected: null,
  };
  const saveFilters = () => {
    store.set("hiddenCats", [...state.hiddenCats]); store.set("hiddenKinds", [...state.hiddenKinds]);
    store.set("hiddenStatus", [...state.hiddenStatus]); store.set("closedGroups", [...state.closedGroups]);
    store.set("layers2", state.layers); store.set("enterableOnly", state.enterableOnly);
  };
  const saveMine = () => store.set("pins", state.mine.map(({ type, marker, ...p }) => p));
  const find = id => byId[id] || state.mine.find(p => p.id === id) || state.community.find(p => p.id === id);

  // ---------- markers ----------
  const canvas = L.canvas({ padding: 0.5 });
  const lmLayer = L.layerGroup().addTo(map);
  const mineLayer = L.layerGroup().addTo(map);
  const cmLayer = L.layerGroup().addTo(map);
  const dotRadius = () => map.getZoom() < 2 ? 3 : map.getZoom() < 4 ? 4.5 : 6;

  const blipIcon = (color, iconId, visited) => L.divIcon({
    className: "", iconSize: [24, 24], iconAnchor: [12, 12], tooltipAnchor: [0, -12],
    html: `<div style="width:24px;height:24px;display:grid;place-items:center"><div class="badge blip ${visited ? "visited" : ""}" style="--c:${color}">${icon(iconId)}</div></div>`,
  });
  const dropIcon = (color, iconId, visited) => L.divIcon({
    className: "", iconSize: [30, 30], iconAnchor: [15, 36], tooltipAnchor: [0, -36],
    html: `<div class="drop ${visited ? "visited" : ""}" style="--c:${color}">${icon(iconId)}</div>`,
  });
  const tipHtml = t => {
    const pics = t.photos?.length ? `<div class="tpics">${t.photos.map(k => `<img src="${photoUrl(t.id, k)}" alt="">`).join("")}</div>` : "";
    const sub = t.type === "lm" ? `${catById[t.cat].name}${t.area ? " · " + t.area : ""}`
      : t.type === "cm" ? `Community · ${kindById[t.kind]?.name ?? "Other"}` : "My pin";
    return `${pics}<div class="tt">${esc(t.name)}<small>${esc(sub)}</small></div>`;
  };
  const tip = (marker, t) => marker.bindTooltip(() => tipHtml(t), { className: "tip", direction: "top" });

  function styleLandmark(l) {
    const c = catById[l.cat], v = state.visited.has(l.id);
    c.kind === "pin" ? l.marker.setIcon(blipIcon(c.color, c.id, v)) : l.marker.setStyle({ fillOpacity: v ? 0.3 : 0.95 });
  }
  for (const l of landmarks) {
    const c = catById[l.cat];
    l.marker = c.kind === "pin"
      ? L.marker(ll(l.x, l.y), { icon: blipIcon(c.color, c.id, state.visited.has(l.id)), riseOnHover: true })
      : L.circleMarker(ll(l.x, l.y), { renderer: canvas, radius: dotRadius(), color: "#0b0d12", weight: 1,
          fillColor: c.color, fillOpacity: state.visited.has(l.id) ? 0.3 : 0.95 });
    tip(l.marker, l).on("click", () => select(l.id));
  }
  map.on("zoomend", () => { const r = dotRadius(); landmarks.forEach(l => l.marker.setRadius?.(r)); });

  function renderMine() {
    mineLayer.clearLayers();
    for (const p of state.mine) {
      p.marker = L.marker(ll(p.x, p.y), { icon: dropIcon("#ff6fa5", "mine", state.visited.has(p.id)), draggable: true, riseOnHover: true })
        .on("click", () => select(p.id))
        .on("dragend", e => { const [x, y] = xy(e.target.getLatLng()); Object.assign(p, { x, y }); saveMine(); if (state.selected === p.id) select(p.id); })
        .addTo(mineLayer);
      tip(p.marker, p);
    }
  }
  function renderCommunity() {
    cmLayer.clearLayers();
    for (const p of state.community) {
      const k = kindById[p.kind] ?? kindById.other;
      p.marker = L.marker(ll(p.x, p.y), { icon: dropIcon(k.color, k.id, state.visited.has(p.id)), riseOnHover: true })
        .on("click", () => select(p.id));
      tip(p.marker, p);
    }
  }

  const lmVisible = l => state.layers.landmarks && !state.hiddenCats.has(l.cat)
    && !l.status.some(s => state.hiddenStatus.has(s)) && (!state.enterableOnly || l.enterable);
  const cmVisible = p => state.layers.community && !state.hiddenKinds.has(p.kind);

  function applyFilters() {
    let shown = 0;
    for (const l of landmarks) {
      const show = lmVisible(l), on = lmLayer.hasLayer(l.marker);
      if (show) shown++;
      if (show && !on) lmLayer.addLayer(l.marker); else if (!show && on) lmLayer.removeLayer(l.marker);
    }
    for (const p of state.community) {
      const show = cmVisible(p), on = cmLayer.hasLayer(p.marker);
      if (show) shown++;
      if (show && !on) cmLayer.addLayer(p.marker); else if (!show && on) cmLayer.removeLayer(p.marker);
    }
    state.layers.mine ? map.addLayer(mineLayer) : map.removeLayer(mineLayer);
    if (state.layers.mine) shown += state.mine.length;
    $("#statShown").textContent = fmt(shown);
    renderFilters();
    saveFilters();
  }

  // ---------- filter sidebar ----------
  const counts = {}, statusCounts = {};
  landmarks.forEach(l => { counts[l.cat] = (counts[l.cat] || 0) + 1; l.status.forEach(s => statusCounts[s] = (statusCounts[s] || 0) + 1); });

  const chip = (f, color, iconId, label, n, on, wide = false) => `
    <button class="chip ${on ? "" : "off"} ${wide ? "wide" : ""}" data-f="${f}" aria-pressed="${on}">
      ${iconId ? `<span class="badge" style="--c:${color}">${icon(iconId)}</span>` : ""}
      <span class="label">${esc(label)}</span><span class="n">${n}</span></button>`;
  const group = (key, title, sub, chips, extra = "", allOn = null) => `
    <section class="group ${state.closedGroups.has(key) ? "closed" : ""}" data-key="${esc(key)}">
      <div class="ghead"><button class="gtoggle">${esc(title)} <span class="gn">${sub}</span></button>
        ${allOn === null ? "" : `<button class="gall ${allOn ? "on" : ""}" data-gall="${esc(key)}">All</button>`}</div>
      <div class="chips">${chips}</div>${extra}
    </section>`;

  // group key → the filter ids it controls
  const groupMembers = key => {
    if (key === "Layers") return ["layer:landmarks", "layer:mine", "layer:community"];
    if (key === "Community") return KINDS.map(k => "kind:" + k.id);
    if (key === "Status") return window.STATUSES.map(s => "status:" + s.id);
    return CATS.filter(c => c.group === key && counts[c.id]).map(c => "cat:" + c.id);
  };
  const isOn = f => {
    const [t, id] = f.split(":");
    return t === "layer" ? state.layers[id] : t === "cat" ? !state.hiddenCats.has(id)
      : t === "kind" ? !state.hiddenKinds.has(id) : !state.hiddenStatus.has(id);
  };
  const setOn = (f, on) => {
    const [t, id] = f.split(":");
    if (t === "layer") state.layers[id] = on;
    else { const set = { cat: state.hiddenCats, kind: state.hiddenKinds, status: state.hiddenStatus }[t]; on ? set.delete(id) : set.add(id); }
  };

  function renderFilters() {
    const cmCounts = {};
    state.community.forEach(p => cmCounts[p.kind] = (cmCounts[p.kind] || 0) + 1);
    const visibleIn = ids => ids.filter(isOn).length;
    let html = group("Layers", "Layers", "", [
      chip("layer:landmarks", "#ff6fa5", "landmarks", "Landmarks", fmt(landmarks.length), state.layers.landmarks, true),
      chip("layer:mine", "#ff6fa5", "mine", "My pins", state.mine.length, state.layers.mine),
      chip("layer:community", "#2dd4bf", "community", "Community", state.communityStatus === "ready" ? state.community.length : "–", state.layers.community),
    ].join(""), "", groupMembers("Layers").every(isOn));

    for (const g of window.CATEGORIES) {
      const items = g.items.filter(c => counts[c.id]);
      const ids = groupMembers(g.group);
      const total = items.reduce((s, c) => s + counts[c.id], 0);
      html += group(g.group, g.group, `${visibleIn(ids)}/${ids.length} · ${fmt(total)}`,
        items.map(c => chip("cat:" + c.id, c.color, catIcon(c), c.name, fmt(counts[c.id]), isOn("cat:" + c.id))).join(""),
        "", ids.every(isOn));
    }

    const cmNote = state.communityStatus === "off" ? `<p class="gnote">Community pins aren't connected yet. Add your Supabase details to <code>config.js</code>.</p>`
      : state.communityStatus === "error" ? `<p class="gnote">Couldn't reach the community server. Try again later.</p>`
      : state.communityStatus === "loading" ? `<p class="gnote">Loading community pins…</p>` : "";
    html += group("Community", "Community pins", "",
      KINDS.map(k => chip("kind:" + k.id, k.color, k.id, k.name, cmCounts[k.id] || 0, isOn("kind:" + k.id))).join(""),
      cmNote, groupMembers("Community").every(isOn));

    html += group("Status", "Status", "",
      window.STATUSES.map(s => chip("status:" + s.id, "", null, s.name, fmt(statusCounts[s.id] || 0), isOn("status:" + s.id))).join(""),
      `<label class="gextra"><input type="checkbox" id="enterableOnly" ${state.enterableOnly ? "checked" : ""}> Only places with enterable interiors</label>`,
      groupMembers("Status").every(isOn));

    const scroll = $("#filters").scrollTop;
    $("#filters").innerHTML = html;
    $("#filters").scrollTop = scroll;
  }

  $("#filters").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.f) setOn(b.dataset.f, !isOn(b.dataset.f));
    else if (b.dataset.gall) { const ids = groupMembers(b.dataset.gall), all = ids.every(isOn); ids.forEach(f => setOn(f, !all)); }
    else if (b.classList.contains("gtoggle")) {
      const key = b.closest(".group").dataset.key;
      state.closedGroups.has(key) ? state.closedGroups.delete(key) : state.closedGroups.add(key);
      b.closest(".group").classList.toggle("closed"); saveFilters(); return;
    }
    else return;
    applyFilters();
  });
  $("#filters").addEventListener("change", e => {
    if (e.target.id === "enterableOnly") { state.enterableOnly = e.target.checked; applyFilters(); }
  });
  $(".toolbar").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const allFilters = ["Layers", ...window.CATEGORIES.map(g => g.group), "Community"].flatMap(groupMembers);
    if (b.dataset.bulk === "all") allFilters.forEach(f => setOn(f, true));
    else if (b.dataset.bulk === "none") allFilters.filter(f => !f.startsWith("layer:")).forEach(f => setOn(f, false));
    else if (b.dataset.bulk === "reset") {
      allFilters.forEach(f => setOn(f, true)); state.hiddenStatus.clear(); state.enterableOnly = false;
    }
    else if (b.id === "collapseAll") {
      const keys = $$(".group").map(g => g.dataset.key);
      const close = keys.some(k => !state.closedGroups.has(k));
      keys.forEach(k => close ? state.closedGroups.add(k) : state.closedGroups.delete(k));
      b.textContent = close ? "Expand groups" : "Collapse groups";
    }
    applyFilters();
  });

  // ---------- search ----------
  const results = $("#results");
  let hits = [], hi = 0;
  function runSearch() {
    const q = $("#search").value.trim().toLowerCase();
    if (!q) { results.hidden = true; return; }
    const pins = [...state.mine, ...state.community].filter(p => `${p.name} ${p.note ?? ""}`.toLowerCase().includes(q));
    const lms = landmarks.filter(l => l.search.includes(q))
      .sort((a, b) => (b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q)) || (b.named - a.named) || a.name.localeCompare(b.name));
    hits = [...pins, ...lms].slice(0, 60); hi = 0;
    results.innerHTML = hits.length ? hits.map((h, i) => {
      const [color, ic, sub] = h.type === "lm" ? [catById[h.cat].color, catIcon(catById[h.cat]), h.area || h.rl || ""]
        : h.type === "cm" ? [kindById[h.kind]?.color, h.kind, "Community pin"] : ["#ff6fa5", "mine", "My pin"];
      const thumb = h.photos?.length ? `<img src="${photoUrl(h.id, h.photos[0])}" alt="" loading="lazy">` : "";
      return `<li data-i="${i}" class="${i === 0 ? "hi" : ""}"><span class="badge" style="--c:${color}">${icon(ic)}</span>
        <div style="min-width:0"><div class="t">${esc(h.name)}</div><div class="sub">${esc(sub)}</div></div>${thumb}</li>`;
    }).join("") : `<li class="empty">No matches</li>`;
    results.hidden = false;
  }
  const pick = i => { const h = hits[i]; if (!h) return; results.hidden = true; $("#search").blur(); focusOn(h.id); };
  $("#search").addEventListener("input", runSearch);
  $("#search").addEventListener("focus", runSearch);
  $("#search").addEventListener("keydown", e => {
    if (e.key === "Enter") pick(hi);
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); hi = Math.max(0, Math.min(hits.length - 1, hi + (e.key === "ArrowDown" ? 1 : -1)));
      results.querySelectorAll("li").forEach((li, i) => li.classList.toggle("hi", i === hi));
      results.querySelector(".hi")?.scrollIntoView({ block: "nearest" });
    }
  });
  results.addEventListener("mousedown", e => { const li = e.target.closest("li[data-i]"); if (li) pick(+li.dataset.i); });
  $("#search").addEventListener("blur", () => setTimeout(() => results.hidden = true, 150));

  // ---------- photo comparison ----------
  const cmp = $("#compare");
  const cbody = cmp.querySelector(".cbody");
  function openCompare(l, mode = "side") {
    if (!l?.photos?.length) return;
    const both = l.photos.length === 2;
    cmp.querySelector(".ctitle").innerHTML = `${esc(l.name)}<small>${esc(l.area || "Leonida")}</small>`;
    for (const k of ["ig", "rl"]) {
      const fig = cmp.querySelector(k === "ig" ? ".cig" : ".crl");
      fig.hidden = !l.photos.includes(k);
      fig.querySelector("img").src = l.photos.includes(k) ? photoUrl(l.id, k) : "";
    }
    cmp.querySelector(".seg").hidden = !both;
    setCompareMode(both ? mode : "side");
    cbody.classList.toggle("single", !both);
    cmp.querySelector(".cfoot").innerHTML =
      `<b style="color:var(--pink)">In-game:</b> ${esc(l.ig || "?")} &nbsp;·&nbsp; <b style="color:#7dd3fc">Real life:</b> ${esc(l.rl || "Unknown")}
       <br>Photos: gtadb.org contributors, CC BY 4.0`;
    cmp.hidden = false;
  }
  function setCompareMode(mode) {
    cbody.className = `cbody ${mode}${cbody.classList.contains("single") ? " single" : ""}`;
    cmp.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === mode));
  }
  cmp.querySelector(".seg").onclick = e => { const m = e.target.dataset.mode; if (m) setCompareMode(m); };
  cmp.querySelector(".cslider").oninput = e => cbody.style.setProperty("--pos", e.target.value + "%");
  cmp.querySelector(".cclose").onclick = () => cmp.hidden = true;
  cbody.addEventListener("click", e => { if (cbody.classList.contains("side") && e.target === cbody) cmp.hidden = true; });

  // ---------- info panel ----------
  const panel = $("#panel");
  const ring = L.marker([0, 0], { interactive: false, icon: L.divIcon({ className: "", iconSize: [48, 48], html: '<div class="sel-ring"></div>' }) });

  function focusOn(id) {
    const t = find(id); if (!t) return;
    if (t.type === "lm" && !lmVisible(t)) {
      state.layers.landmarks = true; state.hiddenCats.delete(t.cat); t.status.forEach(s => state.hiddenStatus.delete(s));
      state.enterableOnly = false; applyFilters();
    }
    if (t.type === "cm" && !cmVisible(t)) { state.layers.community = true; state.hiddenKinds.delete(t.kind); applyFilters(); }
    if (t.type === "mine" && !state.layers.mine) { state.layers.mine = true; applyFilters(); }
    map.flyTo(ll(t.x, t.y), Math.max(map.getZoom(), 5), { duration: 0.8 });
    select(id);
  }
  function closePanel() { panel.hidden = true; state.selected = null; ring.remove(); updateHash(); }

  const head = (color, ic, label, title) => `
    <div class="phead"><span class="badge" style="--c:${color}">${icon(ic)}</span>
      <div><div class="cat" style="--c:${color}">${esc(label)}</div><h3>${esc(title)}</h3></div></div>`;
  const visitBtn = id => `<button data-act="visit" class="${state.visited.has(id) ? "on" : ""}">${state.visited.has(id) ? "✓ Visited" : "Mark visited"}</button>`;

  function select(id) {
    const t = find(id); if (!t) return;
    state.selected = id;
    ring.setLatLng(ll(t.x, t.y)).addTo(map);
    panel.hidden = false;

    if (t.type === "lm") {
      const c = catById[t.cat];
      const gmaps = t.latlng ? `https://www.google.com/maps/search/?api=1&query=${t.latlng[0]},${t.latlng[1]}` : null;
      const photos = t.photos.length ? `
        <div class="pcompare ${t.photos.length === 1 ? "single" : ""}">
          ${t.photos.map(k => `<figure class="${k}"><img src="${photoUrl(t.id, k)}" alt=""><figcaption>${k === "ig" ? "IN-GAME" : "REAL LIFE"}</figcaption></figure>`).join("")}
          ${t.photos.length === 2 ? `<button class="open" data-act="compare">⇆ Compare</button>` : ""}
        </div>` : "";
      panel.innerHTML = `
        <button class="close" aria-label="Close">×</button>
        ${photos}
        <div class="pbody">
          ${head(c.color, catIcon(c), c.name, t.name)}
          <div class="area">${esc(t.area || "Leonida")}</div>
          <dl>
            <dt>In-game</dt><dd>${esc(t.ig || "?")}</dd>
            <dt>Real life</dt><dd>${esc(t.rl || "Unknown")}${gmaps ? `<br><a href="${gmaps}" target="_blank" rel="noopener">Open in Google Maps ↗</a>` : ""}</dd>
            <dt>X / Y</dt><dd>${fmt(t.x)}, ${fmt(t.y)}</dd>
            <dt>Source</dt><dd>gtadb.org · ${esc(t.id)}</dd>
          </dl>
          ${t.tags.length ? `<div class="tags">${t.tags.map(g => `<span class="tag">${esc(g.replace(/^#/, ""))}</span>`).join("")}</div>` : ""}
          <div class="actions">${visitBtn(id)}<button data-act="link">Copy link</button></div>
        </div>`;
      panel.querySelectorAll(".pcompare figure").forEach(f => f.onclick = () => openCompare(t, "side"));
    } else if (t.type === "mine") {
      panel.innerHTML = `
        <button class="close" aria-label="Close">×</button>
        <div class="pbody">
          ${head("#ff6fa5", "mine", "My pin · only you", t.name)}
          <p>${esc(t.note) || '<span class="area">No notes.</span>'}</p>
          <dl><dt>X / Y</dt><dd>${fmt(t.x)}, ${fmt(t.y)}</dd></dl>
          <div class="actions">${visitBtn(id)}<button data-act="link">Copy link</button><button data-act="edit">Edit</button><button data-act="del">Delete</button></div>
          <p class="hint">Drag the pin to move it.</p>
        </div>`;
    } else {
      const k = kindById[t.kind] ?? kindById.other;
      const myVote = state.myVotes[id] || 0;
      panel.innerHTML = `
        <button class="close" aria-label="Close">×</button>
        <div class="pbody">
          ${head(k.color, k.id, "Community · " + k.name, t.name)}
          <p>${esc(t.note) || '<span class="area">No notes.</span>'}</p>
          <dl><dt>Added</dt><dd>${ago(t.created_at)}</dd><dt>X / Y</dt><dd>${fmt(t.x)}, ${fmt(t.y)}</dd></dl>
          <div class="actions">
            <div class="votes"><button data-vote="1" class="${myVote === 1 ? "on" : ""}" title="Accurate">▲</button><b>${t.score}</b>
              <button data-vote="-1" class="${myVote === -1 ? "on" : ""}" title="Wrong or spam">▼</button></div>
            ${visitBtn(id)}<button data-act="link">Copy link</button>
          </div>
          <div class="actions" style="margin-top:6px">
            <button data-act="report" ${state.reported.has(id) ? "disabled" : ""}>${state.reported.has(id) ? "Reported" : "⚑ Report"}</button>
          </div>
          <p class="hint">Pins that get voted down or reported are hidden automatically.</p>
        </div>`;
    }
    wirePanel(t);
    updateHash();
  }

  function wirePanel(t) {
    const id = t.id, on = (sel, fn) => { const el = panel.querySelector(sel); if (el) el.onclick = fn; };
    on(".close", closePanel);
    on('[data-act="compare"]', () => openCompare(t, "slider"));
    on('[data-act="visit"]', () => {
      state.visited.has(id) ? state.visited.delete(id) : state.visited.add(id);
      store.set("visited", [...state.visited]);
      if (t.type === "lm") styleLandmark(t); else if (t.type === "mine") renderMine(); else { renderCommunity(); applyFilters(); }
      select(id);
    });
    on('[data-act="link"]', e => {
      updateHash(); navigator.clipboard?.writeText(location.href);
      e.target.textContent = "Copied!"; setTimeout(() => e.target.textContent = "Copy link", 1200);
    });
    on('[data-act="edit"]', () => pinForm(t));
    on('[data-act="del"]', () => { state.mine = state.mine.filter(p => p.id !== id); saveMine(); renderMine(); applyFilters(); closePanel(); });
    on('[data-act="report"]', async e => {
      if (e.target.dataset.confirm !== "1") { e.target.dataset.confirm = "1"; e.target.textContent = "Click again to report"; return; }
      try {
        await sb.report(id); state.reported.add(id); store.set("reported", [...state.reported]);
        toast("Thanks, the pin was reported."); select(id);
      } catch (err) { toast("Couldn't report: " + err.message, true); }
    });
    panel.querySelectorAll("[data-vote]").forEach(b => b.onclick = async () => {
      const v = +b.dataset.vote, next = state.myVotes[id] === v ? 0 : v;
      try {
        t.score = await sb.vote(id, next);
        next ? state.myVotes[id] = next : delete state.myVotes[id];
        store.set("votes", state.myVotes); select(id);
      } catch (err) { toast("Couldn't vote: " + err.message, true); }
    });
  }

  // ---------- add / edit pins ----------
  let placing = false;
  const setPlacing = on => {
    placing = on; mapEl.classList.toggle("placing", on); $("#addPin").classList.toggle("on", on);
    if (on) toast("Click the map where the pin should go.");
  };
  $("#addPin").onclick = () => setPlacing(!placing);

  function pinForm(p) {
    const editing = !!p.id;
    let vis = "me", kind = "collectible";
    panel.hidden = false;
    panel.innerHTML = `
      <button class="close" aria-label="Close">×</button>
      <div class="pbody">
        ${head("#ff6fa5", "mine", editing ? "Edit pin" : "New pin", `X ${fmt(p.x)} · Y ${fmt(p.y)}`)}
        <label class="f">Name<input id="pinName" placeholder="What's here?" value="${esc(p.name)}" maxlength="80"></label>
        <label class="f">Notes<textarea id="pinNote" rows="3" maxlength="500" placeholder="Optional details">${esc(p.note)}</textarea></label>
        ${editing ? "" : `
          <label class="f">Who can see it</label>
          <div class="seg"><button data-vis="me" class="on">Only me</button><button data-vis="all" ${sb ? "" : "disabled"}>Everyone</button></div>
          <div id="kindPick" hidden><label class="f">Type</label><div class="kinds">
            ${KINDS.map(k => `<button class="chip ${k.id === kind ? "sel" : ""}" data-kind="${k.id}"><span class="badge" style="--c:${k.color}">${icon(k.id)}</span><span class="label">${esc(k.name)}</span></button>`).join("")}
          </div></div>
          <p class="hint" id="visHint">${sb ? "Saved in this browser only." : "Saved in this browser. Sharing turns on once community pins are connected."}</p>`}
        <div class="actions" style="margin-top:14px"><button id="pinSave" class="on">${editing ? "Save" : "Add pin"}</button><button id="pinCancel">Cancel</button></div>
      </div>`;
    const name = $("#pinName"); name.focus();
    panel.querySelectorAll("[data-vis]").forEach(b => b.onclick = () => {
      vis = b.dataset.vis;
      panel.querySelectorAll("[data-vis]").forEach(x => x.classList.toggle("on", x === b));
      $("#kindPick").hidden = vis !== "all";
      $("#visHint").textContent = vis === "all" ? "Everyone will see this pin. Keep it accurate and about the game." : "Saved in this browser only.";
    });
    panel.querySelectorAll("[data-kind]").forEach(b => b.onclick = () => {
      kind = b.dataset.kind; panel.querySelectorAll("[data-kind]").forEach(x => x.classList.toggle("sel", x === b));
    });
    const commit = async () => {
      const data = { name: name.value.trim(), note: $("#pinNote").value.trim() };
      if (!data.name) { name.focus(); toast("Give the pin a name.", true); return; }
      if (editing) { Object.assign(p, data); saveMine(); renderMine(); select(p.id); return; }
      if (vis === "all") {
        $("#pinSave").disabled = true; $("#pinSave").textContent = "Sharing…";
        try {
          const row = await sb.add({ x: p.x, y: p.y, kind, ...data });
          state.community.unshift({ ...row, type: "cm" });
          state.layers.community = true; state.hiddenKinds.delete(kind);
          renderCommunity(); applyFilters(); select(row.id); toast("Shared with the community.");
        } catch (err) {
          $("#pinSave").disabled = false; $("#pinSave").textContent = "Add pin";
          toast(/rate_limited|10 pins/.test(err.message) ? "You've hit the limit of 10 shared pins per hour." : "Couldn't share: " + err.message, true);
        }
        return;
      }
      const pin = { type: "mine", id: "pin-" + Date.now().toString(36), x: p.x, y: p.y, ...data };
      state.mine.push(pin); state.layers.mine = true; saveMine(); renderMine(); applyFilters(); select(pin.id);
    };
    $("#pinSave").onclick = commit;
    name.onkeydown = e => { if (e.key === "Enter") commit(); };
    $("#pinCancel").onclick = () => editing ? select(p.id) : closePanel();
    panel.querySelector(".close").onclick = closePanel;
  }
  const newPinAt = latlng => { setPlacing(false); const [x, y] = xy(latlng); ring.setLatLng(latlng).addTo(map); pinForm({ x, y, name: "", note: "" }); };
  map.on("click", e => { if (placing) newPinAt(e.latlng); });
  map.on("contextmenu", e => newPinAt(e.latlng));

  // ---------- coordinates ----------
  map.on("mousemove", e => { const [x, y] = xy(e.latlng); $("#cursor").textContent = `${fmt(x)}, ${fmt(y)}`; });
  $("#goto").addEventListener("submit", e => {
    e.preventDefault();
    let x = parseFloat($("#gx").value), y = parseFloat($("#gy").value);
    const both = $("#gx").value.match(/-?\d+(\.\d+)?/g);
    if (isNaN(y) && both?.length === 2) [x, y] = both.map(Number);
    if (isNaN(x) || isNaN(y)) return toast("Enter an X and a Y coordinate.", true);
    ring.setLatLng(ll(x, y)).addTo(map);
    map.flyTo(ll(x, y), Math.max(map.getZoom(), 5), { duration: 0.8 });
  });

  // ---------- URL hash ----------
  function updateHash() {
    const c = map.getCenter();
    history.replaceState(null, "", `#${Math.round(c.lng)},${Math.round(c.lat)},${map.getZoom()}${state.selected ? "," + state.selected : ""}`);
  }
  map.on("moveend", updateHash);

  // ---------- chrome ----------
  $("#toggleSidebar").onclick = () => {
    document.body.classList.toggle("collapsed");
    $("#toggleSidebar").textContent = document.body.classList.contains("collapsed") ? "›" : "‹";
    setTimeout(() => map.invalidateSize(), 220);
  };
  const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  $("#fullscreen").onclick = toggleFullscreen;
  document.addEventListener("fullscreenchange", () => setTimeout(() => map.invalidateSize(), 100));
  $("#shortcuts .shead").onclick = () => $("#shortcuts").classList.toggle("closed");

  document.addEventListener("keydown", e => {
    if (e.target.matches?.("input:not([type=range]), textarea")) { if (e.key === "Escape") e.target.blur(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (e.key === "Escape") {
      if (!cmp.hidden) cmp.hidden = true;
      else { setPlacing(false); if (!panel.hidden) closePanel(); }
    }
    else if (!cmp.hidden) return;
    else if (k === "f") toggleFullscreen();
    else if (k === "/") { e.preventDefault(); $("#search").focus(); }
    else if (k === "p") setPlacing(!placing);
    else if (k === "c" && byId[state.selected]) openCompare(byId[state.selected], "slider");
  });

  // ---------- go ----------
  renderMine();
  applyFilters();
  $("#loading").hidden = true;
  if (hid && find(hid)) select(hid);

  async function loadCommunity() {
    if (!sb) return;
    try {
      const rows = await sb.list();
      state.community = rows.map(r => ({ ...r, type: "cm" }));
      state.communityStatus = "ready";
    } catch (err) {
      console.warn("community pins:", err);
      if (state.communityStatus !== "ready") state.communityStatus = "error";
    }
    renderCommunity(); applyFilters();
    if (hid && !state.selected && find(hid)) select(hid);
  }
  loadCommunity();
  setInterval(() => { if (!document.hidden) loadCommunity(); }, 120000);
})().catch(err => {
  console.error(err.stack);
  document.querySelector("#loading").textContent = "Something broke: " + err.message;
});
