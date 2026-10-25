// Zodiac Ascendant Codex: a static card viewer over data/cards.json.
(() => {
  const EL = {
    wood: { name: "Wood", glyph: "木", c: "#5fbf77" },
    fire: { name: "Fire", glyph: "火", c: "#f06a4a" },
    earth: { name: "Earth", glyph: "土", c: "#d9a441" },
    metal: { name: "Metal", glyph: "金", c: "#c9d1dc" },
    water: { name: "Water", glyph: "水", c: "#4f9bea" },
  };
  const TYPES = [
    ["all", "All"],
    ["zodiac", "Zodiac beasts"],
    ["wanderer", "Wanderers"],
    ["spirit", "Vessel spirits"],
    ["keeper-card", "Keeper cards"],
    ["material", "Materials"],
    ["recipe", "Recipes"],
  ];
  const KIND_LABEL = { zodiac: "Zodiac", wanderer: "Wanderer", spirit: "Vessel spirit", "keeper-card": "Keeper card", material: "Material", recipe: "Recipe" };
  const PLACEHOLDER = { material: "材", recipe: "工", "keeper-card": "符" };

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const title = (s) => String(s).replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  const state = { type: "all", elements: new Set(), q: "", sort: "codex", cards: [], shown: [] };
  try {
    const saved = JSON.parse(localStorage.getItem("codex-filters") || "{}");
    if (saved.type) state.type = saved.type;
    if (saved.sort) state.sort = saved.sort;
  } catch { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem("codex-filters", JSON.stringify({ type: state.type, sort: state.sort })); } catch { /* ignore */ } };

  // ---------------------------------------------------------------- list
  function pills(card) {
    const p = card.elements.map((e) => `<span class="pill" style="--c:${EL[e].c}">${EL[e].glyph} ${EL[e].name}</span>`);
    if (card.typeLabel) p.push(`<span class="pill" style="--c:#b9a07a">${esc(title(card.typeLabel))}</span>`);
    if (card.family) p.push(`<span class="pill" style="--c:#cbbfa9">${esc(title(card.family))}</span>`);
    if (card.mythical) p.push(`<span class="pill" style="--c:#b48ad6">Mythical</span>`);
    if (card.native) p.push(`<span class="pill" style="--c:#e9c46a">Native line</span>`);
    return `<div class="pills">${p.join("")}</div>`;
  }
  const pips = (n) => (n ? `<span class="stage-pips" aria-label="Stage ${n}">${"<i></i>".repeat(n)}</span>` : "");
  const elColour = (card) => (card.elements[0] ? EL[card.elements[0]].c : "#c9972f");

  function cardHtml(card, i) {
    const img = card.art
      ? `<img class="art" src="${esc(card.art)}" alt="" loading="lazy" width="400" height="300">`
      : `<div class="art placeholder" aria-hidden="true">${PLACEHOLDER[card.type] || "?"}</div>`;
    const facts = Object.entries(card.facts || {}).slice(0, 3).map(([k, v]) => `<span>${esc(k)} <b>${esc(v)}</b></span>`).join("");
    return `<button class="card" data-i="${i}" style="--el:${elColour(card)}" aria-label="${esc(card.name)}, ${esc(KIND_LABEL[card.type])}">
      ${img}<span class="kind">${KIND_LABEL[card.type]}</span>
      <div class="body"><h2>${esc(card.name)}${pips(card.stage)}</h2><div class="sub">${esc(card.subtitle)}</div>
      ${pills(card)}<p class="text">${esc(card.text)}</p><div class="facts">${facts}</div></div></button>`;
  }

  function weightOf(c) { return c.data?.physical?.weight_kg?.mean ?? -1; }
  function dcOf(c) { return c.data?.taming?.bond_dc ?? c.data?.capture?.dc ?? c.data?.dc ?? c.data?.resolve ?? 0; }

  function apply() {
    const q = state.q.trim().toLowerCase();
    let list = state.cards.filter((c) => state.type === "all" || c.type === state.type);
    if (state.elements.size) list = list.filter((c) => c.elements.some((e) => state.elements.has(e)));
    if (q) list = list.filter((c) => c._search.includes(q));
    if (state.sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === "weight") list = [...list].sort((a, b) => weightOf(b) - weightOf(a));
    if (state.sort === "dc") list = [...list].sort((a, b) => dcOf(b) - dcOf(a));
    state.shown = list;
    $("#grid").innerHTML = list.map((c) => cardHtml(c, state.cards.indexOf(c))).join("");
    $("#count").textContent = `${list.length} of ${state.cards.length} cards`;
    for (const b of document.querySelectorAll("#types button")) b.setAttribute("aria-selected", String(b.dataset.type === state.type));
    for (const b of document.querySelectorAll("#elements button")) b.setAttribute("aria-pressed", String(state.elements.has(b.dataset.el)));
  }

  // ---------------------------------------------------------------- detail
  function kv(obj) {
    const rows = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "");
    return `<dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(Array.isArray(v) ? v.join(", ") : v)}</dd>`).join("")}</dl>`;
  }
  function bars(list, label) {
    return `<div class="bars">${list.map((x) => `<div class="bar"><span>${esc(title(x.id))}</span><span class="track"><span class="fill" style="width:${x.weight}%"></span></span><span>${x.weight}%</span></div>`).join("")}</div>`;
  }
  /** Truncated normal curve with mean, p95 and upper markers. */
  function curve(c, unit, label) {
    const W = 460, H = 120, pad = 10;
    const x = (v) => pad + ((v - c.min) / (c.upper - c.min)) * (W - pad * 2);
    let d = "";
    for (let i = 0; i <= 60; i++) {
      const v = c.min + ((c.upper - c.min) * i) / 60;
      const z = (v - c.mean) / c.sd;
      const y = H - 28 - Math.exp(-0.5 * z * z) * (H - 46);
      d += `${i ? "L" : "M"}${x(v).toFixed(1)} ${y.toFixed(1)} `;
    }
    const mark = (v, name, col, anchor = "middle") => `<line x1="${x(v)}" x2="${x(v)}" y1="14" y2="${H - 28}" stroke="${col}" stroke-dasharray="3 3"/><text x="${x(v)}" y="${H - 12}" text-anchor="${anchor}" font-size="11" fill="#5d544a">${name} ${v}</text>`;
    return `<svg class="curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}: mean ${c.mean} ${unit}, upper ${c.upper} ${unit}">
      <path d="${d} L${x(c.upper)} ${H - 28} L${x(c.min)} ${H - 28} Z" fill="var(--el)" opacity=".25"/><path d="${d}" fill="none" stroke="#2a241e" stroke-width="2"/>
      ${mark(c.mean, "avg", "#2a241e")}${mark(c.p95, "p95", "#8a7a66")}${mark(c.upper, "max", "#b8322a", "end")}
      <text x="${pad}" y="11" font-size="11" fill="#5d544a">${esc(label)} (${unit}) · min ${c.min}</text></svg>`;
  }
  const folklore = (list) => (list?.length ? `<h3>Folklore it draws on</h3><ul class="plain src">${list.map((f) => `<li><b>${esc(f.region)}:</b> ${esc(f.tradition)}</li>`).join("")}</ul>` : "");

  function physicalSection(p) {
    if (!p) return "";
    const lenKey = Object.keys(p).find((k) => k.endsWith("_cm"));
    return `<h3>Physical profile</h3>${curve(p.weight_kg, "kg", "Weight")}${lenKey ? curve(p[lenKey], "cm", title(lenKey.replace("_cm", ""))) : ""}`;
  }

  function creatureSections(card) {
    const s = card.data;
    const a = s.armour;
    return `
      <p class="lede">${esc(s.description)}</p>
      <h3>Lore</h3><p class="lore">${esc(s.lore)}</p>
      ${physicalSection(s.physical)}
      <h3>Characteristics</h3>
      <p><b>Temperament</b></p>${bars(s.characteristics.temperaments)}
      <p><b>Markings</b></p>${bars(s.characteristics.markings)}
      ${s.characteristics.quirks ? `<p><b>Quirks</b></p><ul class="plain">${s.characteristics.quirks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <p class="src">Moonmarked (rare pale colouring): ${esc(s.characteristics.moonmarked_chance)}</p>
      <h3>Taming and control</h3>
      ${kv({
        "Bond DC": `${s.taming.bond_dc} (${s.taming.difficulty})`,
        "Command DC": `${s.control.command_dc} (${s.control.difficulty})`,
        "Disobeys when": s.control.disobeys_when,
        "Favoured offerings": s.taming.favoured_offerings,
        Dislikes: s.taming.dislikes,
        Habitat: s.habitat,
      })}
      ${a ? `<h3>Armour</h3>${kv({ "Body plan": title(a.body_plan), Size: title(a.size), Slots: a.slots, "Heaviest armour": title(a.max_weight) })}
        <p class="src">Can wear: ${a.armour_types.map((t) => esc(title(t.type)) + (t.fit === "adapted" ? " (adapted)" : "")).join(", ")}</p>` : ""}
      ${folklore(s.folklore_sources)}`;
  }

  function spiritSections(card) {
    const s = card.data;
    return `
      <p class="cardtext">${esc(s.release.card_text)}</p>
      <p>${esc(s.release.rules_text)}</p>
      <h3>Lore</h3><p class="lore">${esc(s.lore)}</p>
      <h3>Capture</h3>
      ${kv({
        "Capture DC": `${s.capture.dc} (${s.capture.difficulty})`,
        Vessel: s.vessel_detail ? `${s.vessel_detail.name} — ${s.vessel_detail.holds}` : s.capture.vessel,
        Mode: s.capture.vessel_mode === "token" ? "Token: the vessel holds a pledge, never the spirit" : "Held in the vessel",
        "Escapes after": `${s.capture.hold_rounds} round${s.capture.hold_rounds === 1 ? "" : "s"}`,
        Temperament: title(s.temperament),
        Type: s.type.kind === "element" ? title(s.type.id) : `${title(s.type.id)} (${s.type.elements.map(title).join(" + ") || "no element"})`,
      })}
      ${physicalSection(s.physical)}
      ${folklore(s.folklore_sources)}`;
  }

  function keeperSections(card) {
    const c = card.data;
    return `
      <p class="cardtext">${esc(c.card_text)}</p>
      ${c.flavour ? `<p class="lore"><i>${esc(c.flavour)}</i></p>` : ""}
      <h3>Play</h3>
      ${kv({ Category: c.category_detail.name, Speed: title(c.speed), "Resolve cost": c.resolve, Trigger: c.trigger, "Extra cost": c.extra_cost, Charges: c.charges, Delay: c.delay_rounds ? `${c.delay_rounds} rounds` : null, "Equips to": c.equips_to, Tags: c.tags })}
      <p class="src">${esc(c.category_detail.summary)}</p>`;
  }

  function materialSections(card) {
    const m = card.data;
    return `
      <p class="lede">${esc(m.properties)}</p>
      <h3>Details</h3>
      ${kv({ Element: m.element ? title(m.element) : "None", Tier: m.tier, Category: title(m.category), Roles: m.roles.map(title), Source: m.source.from ? `${title(m.source.method)} — ${title(m.source.from)}` : title(m.source.method), "Gather DC": m.gather_dc ?? "Story only", Value: m.value === null ? "Gift only — never sold" : `${m.value} strings of cash`, Resists: m.resists.map(title), "Vulnerable to": m.vulnerable_to.map(title) })}`;
  }

  function recipeSections(card) {
    const r = card.data;
    return `
      <h3>Materials</h3><ul class="plain">${r.materials.map((x) => `<li>${x.qty}× ${esc(title(x.material))}</li>`).join("")}</ul>
      <h3>Crafting</h3>
      ${kv({ Discipline: title(r.discipline), "Base DC": r.base_dc, "Final DC": r.dc, Synergy: r.synergy?.length ? r.synergy.map((s) => `${s.pair.map(title).join(" + ")}: ${s.dc_change > 0 ? "+" : ""}${s.dc_change}`).join("; ") : "None", Days: r.days })}
      ${r.weight ? `<h3>Armour</h3>${kv({ Wearer: title(r.wearer), Type: r.armour_type ? title(r.armour_type) : null, Weight: title(r.weight), Guard: `+${r.guard_bonus}`, Speed: r.speed_change_ft ? `${r.speed_change_ft} ft` : null, Durability: r.durability, Element: r.armour_element ? title(r.armour_element) : "None", Resists: r.resists?.map(title), "Vulnerable to": r.vulnerable_to?.map(title) })}` : ""}
      ${r.fits ? `<p class="src">Fits: ${r.fits.map((f) => esc(title(f.body_plan)) + (f.fit === "adapted" ? " (adapted)" : "")).join(", ")}</p>` : ""}
      ${r.notes ? `<p>${esc(r.notes)}</p>` : ""}`;
  }

  const SECTIONS = { zodiac: creatureSections, wanderer: creatureSections, spirit: spiritSections, "keeper-card": keeperSections, material: materialSections, recipe: recipeSections };

  const indexOfId = (type, id) => state.cards.findIndex((c) => c.type === type && c.id === id);

  /** Stage buttons (Kit → Adept → Sovereign) and, for zodiac beasts, the same stage in each element line. */
  function navGroups(card) {
    const out = [];
    if (card.stages && card.stages.length > 1) {
      out.push(`<div class="forms" role="group" aria-label="Evolution stage">${card.stages
        .map((s) => `<button data-goto="${esc(s.id)}" aria-pressed="${s.id === card.id}" style="--c:#e6d8bd">${esc(s.label)}</button>`)
        .join("")}</div>`);
    }
    if (card.siblings && card.siblings.length > 1) {
      out.push(`<div class="forms" role="group" aria-label="Element line">${card.siblings
        .map((s) => `<button data-goto="${esc(s.id)}" aria-pressed="${s.id === card.id}" style="--c:${EL[s.element].c}">${EL[s.element].glyph} ${EL[s.element].name}${s.native ? " · native" : ""}</button>`)
        .join("")}</div>`);
    }
    return out.join("");
  }

  function open(i) {
    const card = state.cards[i];
    const pos = state.shown.indexOf(card);
    const d = $("#detail");
    d.style.setProperty("--el", elColour(card));
    d.innerHTML = `<button class="close" aria-label="Close">×</button>
      <div class="d-wrap">
        <div class="d-art">${card.art ? `<img src="${esc(card.art)}" alt="${esc(card.name)}">` : `<div class="placeholder">${PLACEHOLDER[card.type] || "?"}</div>`}${navGroups(card)}</div>
        <div class="d-main">
          <h2 id="d-name">${esc(card.name)}${pips(card.stage)}</h2>
          <div class="sub">${esc(KIND_LABEL[card.type])} · ${esc(card.subtitle)}</div>
          ${pills(card)}
          ${SECTIONS[card.type](card)}
          <details class="raw"><summary>Raw JSON</summary><pre>${esc(JSON.stringify(card.data, null, 2))}</pre></details>
          <div class="nav-arrows">
            <button data-step="-1" ${pos <= 0 ? "disabled" : ""}>← Previous</button>
            <button data-step="1" ${pos < 0 || pos >= state.shown.length - 1 ? "disabled" : ""}>Next →</button>
          </div>
        </div>
      </div>`;
    d.querySelector(".close").onclick = () => d.close();
    d.querySelectorAll("[data-goto]").forEach((b) => (b.onclick = () => {
      const j = indexOfId(card.type, b.dataset.goto);
      if (j >= 0) open(j);
    }));
    d.querySelectorAll("[data-step]").forEach((b) => (b.onclick = () => {
      const next = state.shown[pos + Number(b.dataset.step)];
      if (next) open(state.cards.indexOf(next));
    }));
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    history.replaceState(null, "", `#${card.type}/${card.id}`);
  }

  // ---------------------------------------------------------------- boot
  async function boot() {
    const res = await fetch("data/cards.json");
    const data = await res.json();
    state.cards = data.cards.map((c) => ({
      ...c,
      _search: [c.name, c.id, c.subtitle, c.text, c.family, c.animal, c.mythical ? "mythical" : "", c.category, ...(c.elements || []), c.data?.lore, c.data?.creature].filter(Boolean).join(" ").toLowerCase(),
    }));
    $("#version").textContent = `· v${data.version} · built ${data.built}`;

    const counts = Object.fromEntries(TYPES.map(([t]) => [t, t === "all" ? state.cards.length : state.cards.filter((c) => c.type === t).length]));
    $("#types").innerHTML = TYPES.map(([t, label]) => `<button role="tab" data-type="${t}">${label}<small>${counts[t]}</small></button>`).join("");
    $("#elements").innerHTML = Object.entries(EL).map(([id, e]) => `<button data-el="${id}"><span class="dot" style="background:${e.c}"></span>${e.glyph} ${e.name}</button>`).join("");
    $("#sort").value = state.sort;

    $("#types").onclick = (e) => { const b = e.target.closest("button"); if (b) { state.type = b.dataset.type; save(); apply(); } };
    $("#elements").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      state.elements.has(b.dataset.el) ? state.elements.delete(b.dataset.el) : state.elements.add(b.dataset.el);
      apply();
    };
    $("#q").oninput = (e) => { state.q = e.target.value; apply(); };
    $("#sort").onchange = (e) => { state.sort = e.target.value; save(); apply(); };
    $("#grid").onclick = (e) => { const b = e.target.closest(".card"); if (b) open(Number(b.dataset.i)); };
    $("#detail").addEventListener("close", () => history.replaceState(null, "", location.pathname));
    $("#detail").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

    apply();
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
  }

  /** Opens the card named in the URL hash: #type/id. */
  function openFromHash() {
    const m = /^#([\w-]+)\/([\w-]+)$/.exec(location.hash);
    if (!m) return;
    const i = indexOfId(m[1], m[2]);
    if (i >= 0) open(i);
  }
  boot().catch((err) => { $("#count").textContent = `Could not load cards: ${err.message}`; });
})();
