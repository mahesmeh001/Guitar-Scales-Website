/* Full list: serve this folder over HTTP (e.g. python3 -m http.server) so Scales.json can load. */

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FRET_MIN = 5;
const FRET_MAX = 27;
/** First fret column shown (open string / fret 0 omitted). */
const FRET_START = 1;
/** Simple view: wider string column + capped fret width. */
const FB_STRING_COL_SIMPLE = "3.35rem";
const FB_FRET_TRACK_SIMPLE = "minmax(1.85rem, min(2.26rem, 8.15vw))";
/** Informational: original layout (stretches with container). */
const FB_STRING_COL_INFO = "2.75rem";
const FB_FRET_TRACK_INFO = "minmax(1.55rem, 1fr)";

/** Fret markers like a typical guitar fingerboard (single = one dot, 12 = double). */
const INLAY_FRETS_SINGLE = new Set([3, 5, 7, 9, 15, 17, 19, 21]);

function fretInlayKind(f) {
  if (f === 12) return "double";
  if (INLAY_FRETS_SINGLE.has(f)) return "single";
  return null;
}

function fretColInlayClass(f) {
  return fretInlayKind(f) ? " fb-col-inlay" : "";
}

const TUNINGS = {
  standard: { label: "Standard (EADGBE)", openMidi: [40, 45, 50, 55, 59, 64] },
  dropD: { label: "Drop D", openMidi: [38, 45, 50, 55, 59, 64] },
  dadgad: { label: "DADGAD", openMidi: [38, 45, 50, 55, 57, 62] },
  eb: { label: "E♭ standard", openMidi: [39, 44, 49, 54, 58, 63] },
  openG: { label: "Open G", openMidi: [38, 43, 50, 55, 59, 62] },
};

const FALLBACK_PRESETS = [
  { Name: "Major", Value: "1;3;5;6;8;10;12", Group: "Common" },
  { Name: "Minor", Value: "1;3;4;6;8;9;11", Group: "Common" },
  { Name: "Major Pentatonic", Value: "1;3;5;8;10", Group: "Common" },
  { Name: "Minor Blues", Value: "1;4;6;7;8;11", Group: "Common" },
  { Name: "Dorian", Value: "1;3;4;6;8;10;11", Group: "Modal" },
];

function pc(midi) {
  return ((midi % 12) + 12) % 12;
}

function noteLabel(midi) {
  return NOTE_NAMES[pc(midi)];
}

/** Tab-style label: lowercase e for high-E string when pitch is E. */
function stringLabel(openStringMidi, s) {
  const n = noteLabel(openStringMidi[s]);
  if (s === 5 && pc(openStringMidi[s]) === 4) return "e";
  return n;
}

function renderFretboard(mount, opts) {
  const {
    openStringMidi,
    scalePitchClasses,
    keyPitchClasses,
    signaturePitchClasses,
    fifthPitchClass,
    rootPitchClass,
    maxFret,
    displayMode,
  } = opts;
  if (!mount) return;
  mount.replaceChildren();

  const lastFret = Math.max(FRET_START, maxFret);
  const colCount = lastFret - FRET_START + 1;
  const simple = displayMode === "simple";

  const grid = document.createElement("div");
  grid.className = "fb-grid" + (simple ? " fb-simple" : " fb-informational");
  grid.style.gridTemplateColumns = simple
    ? `${FB_STRING_COL_SIMPLE} repeat(${colCount}, ${FB_FRET_TRACK_SIMPLE})`
    : `${FB_STRING_COL_INFO} repeat(${colCount}, ${FB_FRET_TRACK_INFO})`;

  const corner = document.createElement("div");
  corner.setAttribute("aria-hidden", "true");
  grid.appendChild(corner);

  for (let f = FRET_START; f <= lastFret; f++) {
    const hn = document.createElement("div");
    hn.className = "fb-fret-num" + (f === FRET_START ? " fb-first-fret" : "") + fretColInlayClass(f);
    hn.textContent = String(f);
    grid.appendChild(hn);
  }

  for (let s = 5; s >= 0; s--) {
    const lab = document.createElement("div");
    lab.className = "fb-string-label";
    lab.textContent = stringLabel(openStringMidi, s);
    grid.appendChild(lab);

    for (let f = FRET_START; f <= lastFret; f++) {
      const midi = openStringMidi[s] + f;
      const p = pc(midi);
      const inScale = scalePitchClasses.has(p);
      const isRoot = p === rootPitchClass;
      const name = noteLabel(midi);

      const cell = document.createElement("div");
      cell.className = "fb-cell" + (f === FRET_START ? " fb-first-fret" : "") + fretColInlayClass(f);

      if (!simple && !inScale) {
        const span = document.createElement("span");
        span.className = "fb-outside";
        span.textContent = name;
        span.title = name + " · fret " + f + " (outside scale)";
        cell.appendChild(span);
      } else if (inScale) {
        let tier = "scale";
        if (isRoot) tier = "root";
        else if (p === fifthPitchClass) tier = "fifth";
        else if (signaturePitchClasses.has(p)) tier = "sig";
        else if (displayMode === "informational" && keyPitchClasses.has(p)) tier = "key";

        const mark = document.createElement("div");
        mark.className = "fb-mark fb-" + tier;
        mark.title = name + " · fret " + f + (tier === "key" ? " · chord tone" : tier === "sig" ? " · emphasized note" : tier === "fifth" ? " · 5th" : "");
        const noteEl = document.createElement("span");
        noteEl.className = "fb-note";
        noteEl.textContent = name;
        mark.appendChild(noteEl);
        cell.appendChild(mark);
      }

      grid.appendChild(cell);
    }
  }

  const inlayCorner = document.createElement("div");
  inlayCorner.className = "fb-inlay-corner";
  inlayCorner.setAttribute("aria-hidden", "true");
  grid.appendChild(inlayCorner);

  for (let f = FRET_START; f <= lastFret; f++) {
    const kind = fretInlayKind(f);
    const well = document.createElement("div");
    well.className = "fb-inlay-well";
    if (kind === "single") well.classList.add("fb-inlay-single");
    if (kind === "double") well.classList.add("fb-inlay-double");
    well.setAttribute("aria-hidden", "true");
    grid.appendChild(well);
  }

  mount.appendChild(grid);
}

/** @returns {Set<number>} semitone offsets from root (0–11) */
function parsePresetValue(value) {
  const offsets = new Set();
  if (!value || typeof value !== "string") return offsets;

  for (const raw of value.split(";")) {
    const seg = raw.trim();
    if (!seg) continue;

    if (seg.includes(".")) {
      for (const part of seg.split(".")) {
        const n = parseInt(part.trim(), 10);
        if (n >= 1 && n <= 12) offsets.add(n - 1);
      }
      continue;
    }

    const n = parseInt(seg, 10);
    if (n >= 1 && n <= 12) {
      offsets.add(n - 1);
    } else if (seg.length === 2 && /^\d{2}$/.test(seg) && n > 12) {
      const a = parseInt(seg[0], 10);
      const b = parseInt(seg[1], 10);
      if (a >= 1 && a <= 12) offsets.add(a - 1);
      if (b >= 1 && b <= 12) offsets.add(b - 1);
    }
  }
  return offsets;
}

function scalePitchClassesFromOffsets(rootPc, offsets) {
  const set = new Set();
  for (const o of offsets) {
    const x = rootPc + o;
    set.add(((x % 12) + 12) % 12);
  }
  return set;
}

/**
 * Pitch classes to emphasize as "key" (triad tones): prefer M3+P5, else m3+P5, else 3rd & 5th notes in sorted scale order.
 */
function keyPitchClassesFromPattern(rootPc, offsetSet) {
  const arr = [...offsetSet].sort((a, b) => a - b);
  const pcs = new Set();
  const add = (off) => {
    const x = rootPc + off;
    pcs.add(((x % 12) + 12) % 12);
  };
  const has = (o) => offsetSet.has(o);

  if (has(4) && has(7)) {
    add(4);
    add(7);
    return pcs;
  }
  if (has(3) && has(7)) {
    add(3);
    add(7);
    return pcs;
  }
  if (arr.length > 2) add(arr[2]);
  if (arr.length > 4) add(arr[4]);
  return pcs;
}

/**
 * Commonly emphasized notes per scale, as semitone offsets from the root, taken from guitar/theory
 * lessons. The perfect 5th is always emphasized too, in its own color (see PERFECT_FIFTH).
 *   Major: 3 and 7   Minor: b3 and b6
 *   Modes: Dorian 6, Phrygian b2, Lydian #4, Mixolydian b7, Locrian b5
 *   Harmonic minor: 7 · Melodic minor: 6 and 7 · Phrygian dominant: b2 and 3
 *   Blues: minor blues b5 (blue note), major blues b3 · Pentatonics: 3rd
 */
const EMPHASIS_BY_NAME = {
  Major: [4, 11],
  Minor: [3, 8],
  Dorian: [9],
  Phrygian: [1],
  Lydian: [6],
  Mixolydian: [10],
  "Locrian - B to A Ascending": [6],
  "Harmonic Minor": [11],
  "Minor Melodic": [9, 11],
  "Phrygian Dominant": [1, 4],
  "Minor Blues": [6],
  "Major Blues": [3],
  "Major Pentatonic": [4],
  "Blues Pentatonic Minor": [3],
};

const PERFECT_FIFTH = 7;

/** Emphasized offsets for the current preset, limited to notes still in the (possibly edited) scale. */
function emphasisOffsets(offsetSet) {
  const idx = currentPresetIndex();
  const list = (idx >= 0 && EMPHASIS_BY_NAME[presets[idx].Name]) || [];
  return new Set(list.filter((o) => offsetSet.has(o)));
}

function clampFret(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 21;
  return Math.min(FRET_MAX, Math.max(FRET_MIN, Math.round(x)));
}

function setRootPc(pc, opts) {
  const rootSel = document.getElementById("rootSelect");
  const wrap = document.getElementById("rootPicker");
  if (!rootSel || !wrap) return;
  const v = String(((pc % 12) + 12) % 12);
  rootSel.value = v;
  wrap.querySelectorAll('[role="radio"]').forEach((btn) => {
    const on = btn.getAttribute("data-pc") === v;
    btn.setAttribute("aria-checked", on ? "true" : "false");
  });
  if (opts && opts.focus) {
    wrap.querySelector(`[data-pc="${v}"]`)?.focus();
  }
  customOffsets = null;
  redraw();
}

function buildRootPicker() {
  const wrap = document.getElementById("rootPicker");
  const rootSel = document.getElementById("rootSelect");
  if (!wrap || !rootSel) return;
  wrap.replaceChildren();

  NOTE_NAMES.forEach((name, pcVal) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "radio");
    btn.dataset.pc = String(pcVal);
    btn.className = "root-note-btn";
    btn.textContent = name;
    btn.setAttribute("aria-checked", rootSel.value === String(pcVal) ? "true" : "false");
    btn.title = name + " — root";
    btn.addEventListener("click", () => setRootPc(pcVal, { focus: false }));
    wrap.appendChild(btn);
  });

  wrap.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const cur = parseInt(rootSel.value, 10);
    const n = Number.isFinite(cur) ? cur : 0;
    let next = n;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 11;
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (n + 1) % 12;
    else next = (n - 1 + 12) % 12;
    setRootPc(next, { focus: true });
  });
}

function syncScaleQuickPickPressed() {
  const sel = document.getElementById("scaleSelect");
  const wrap = document.getElementById("scaleQuickPick");
  if (!sel || !wrap) return;
  const v = sel.value;
  wrap.querySelectorAll(".scale-pill").forEach((btn) => {
    btn.setAttribute("aria-pressed", btn.getAttribute("data-index") === v ? "true" : "false");
  });
}

function buildScaleQuickPick() {
  const wrap = document.getElementById("scaleQuickPick");
  const sel = document.getElementById("scaleSelect");
  if (!wrap || !sel) return;
  wrap.replaceChildren();

  const common = [];
  for (let i = 0; i < presets.length; i++) {
    const p = presets[i];
    if ((p.Group || "") !== "Common") continue;
    common.push({ i, p });
  }
  common.sort((a, b) => a.p.Name.localeCompare(b.p.Name));

  if (common.length === 0) {
    const p = document.createElement("p");
    p.className = "small intro-muted mb-0";
    p.textContent = "No “Common” scales in the loaded list — use the menu below.";
    wrap.appendChild(p);
    return;
  }

  common.forEach(({ i, p }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "scale-pill";
    btn.setAttribute("data-index", String(i));
    btn.setAttribute("aria-pressed", sel.value === String(i) ? "true" : "false");
    btn.textContent = p.Name;
    btn.title = p.Name + " (" + (p.Group || "Other") + ")";
    btn.addEventListener("click", () => {
      sel.value = String(i);
      syncScaleQuickPickPressed();
      customOffsets = null;
      redraw();
    });
    wrap.appendChild(btn);
  });
}

function syncFretInputs(rangeEl, numEl, v) {
  const c = clampFret(v);
  rangeEl.value = String(c);
  numEl.value = String(c);
  return c;
}

let presets = [];
/** Parsed semitone offsets per preset (same indices as `presets`). */
let presetOffsetsList = [];
/** User-edited offsets from root, or null when showing the preset as-is. Reset on root/scale change. */
let customOffsets = null;
const MIN_SUGGESTIONS = 8;
/** Groups that aren't scales — left out of suggestions. */
const NON_SCALE_GROUPS = new Set(["Chords", "Chorts", "Intervals"]);
/** Tie-break: familiar groups first. */
function groupFamiliarity(g) {
  if (g === "Common") return 0;
  if (g === "Modal" || g === "Jazz" || g === "Blues") return 1;
  return 2;
}

function currentPresetIndex() {
  const idx = parseInt(document.getElementById("scaleSelect").value, 10);
  return Number.isFinite(idx) && presets[idx] ? idx : -1;
}

function presetOffsets() {
  const idx = currentPresetIndex();
  return idx >= 0 ? presetOffsetsList[idx] : new Set();
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function isEdited() {
  return customOffsets !== null && !setsEqual(customOffsets, presetOffsets());
}

function getState() {
  const rootSel = document.getElementById("rootSelect");
  const tuningSel = document.getElementById("tuningSelect");
  const fretRange = document.getElementById("fretRange");
  const modeSel = document.getElementById("displayMode");
  const rootPc = parseInt(rootSel.value, 10);
  const offsets = customOffsets || presetOffsets();
  const maxFret = clampFret(fretRange.value);
  const tuning = TUNINGS[tuningSel.value] || TUNINGS.standard;
  const displayMode = modeSel && modeSel.value === "informational" ? "informational" : "simple";

  return {
    maxFret,
    displayMode,
    rootPitchClass: rootPc,
    scalePitchClasses: scalePitchClassesFromOffsets(rootPc, offsets),
    keyPitchClasses: keyPitchClassesFromPattern(rootPc, offsets),
    signaturePitchClasses: scalePitchClassesFromOffsets(rootPc, emphasisOffsets(offsets)),
    fifthPitchClass: offsets.has(PERFECT_FIFTH) ? (rootPc + PERFECT_FIFTH) % 12 : -1,
    openStringMidi: tuning.openMidi,
  };
}

function redraw() {
  const state = getState();
  renderFretboard(document.getElementById("fretboardMount"), state);
  renderNoteEditor(state.rootPitchClass);
  renderSuggestions(state.rootPitchClass, state.scalePitchClasses);
}

function toggleNote(pcVal, rootPc) {
  const off = (pcVal - rootPc + 12) % 12;
  if (off === 0) return; // root stays in
  if (!customOffsets) customOffsets = new Set(presetOffsets());
  if (customOffsets.has(off)) customOffsets.delete(off);
  else customOffsets.add(off);
  redraw();
}

/** 12 toggles (C..B). Root is locked; added/removed vs. the preset are marked. */
function renderNoteEditor(rootPc) {
  const wrap = document.getElementById("noteEditor");
  const resetBtn = document.getElementById("resetNotesBtn");
  if (!wrap) return;
  const base = presetOffsets();
  const cur = customOffsets || base;
  const sig = emphasisOffsets(cur);
  wrap.replaceChildren();

  NOTE_NAMES.forEach((name, pcVal) => {
    const off = (pcVal - rootPc + 12) % 12;
    const on = cur.has(off) || off === 0;
    const inBase = base.has(off) || off === 0;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "note-toggle";
    btn.textContent = name;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (off === 0) {
      btn.classList.add("is-root");
      btn.disabled = true;
      btn.title = name + " — root (change it with the root picker)";
    } else {
      if (on && off === PERFECT_FIFTH) btn.classList.add("is-fifth");
      else if (sig.has(off)) btn.classList.add("is-signature");
      if (on && !inBase) btn.classList.add("is-added");
      if (!on && inBase) btn.classList.add("is-removed");
      btn.title = (on ? "Remove " : "Add ") + name;
      btn.addEventListener("click", () => toggleNote(pcVal, rootPc));
    }
    wrap.appendChild(btn);
  });

  if (resetBtn) resetBtn.classList.toggle("d-none", !isEdited());
}

/**
 * Rank every preset at every root against the selected pitch classes.
 * Score = matching notes − extra notes (notes in the scale you didn't select).
 * Presets with the same root and the same notes are merged into one option.
 * Returns every option missing at most one selected note, and at least MIN_SUGGESTIONS.
 */
function rankSuggestions(selPcs, rootPc) {
  const curIdx = currentPresetIndex();
  const edited = isEdited();
  const byNotes = new Map(); // "root|sorted pcs" -> option

  presetOffsetsList.forEach((offs, i) => {
    if (!offs.size) return;
    const p = presets[i];
    if (NON_SCALE_GROUPS.has(p.Group)) return;
    for (let r = 0; r < 12; r++) {
      if (!edited && i === curIdx && r === rootPc) continue;
      const pcs = [...new Set([...offs].map((o) => (r + o) % 12))].sort((a, b) => a - b);
      const key = r + "|" + pcs.join(",");
      let opt = byNotes.get(key);
      if (!opt) {
        const matches = pcs.filter((x) => selPcs.has(x)).length;
        const extras = pcs.length - matches;
        opt = { r, members: [], matches, extras, score: matches - extras };
        byNotes.set(key, opt);
      }
      if (!opt.members.some((m) => m.name === p.Name)) {
        opt.members.push({ i, name: p.Name, fam: groupFamiliarity(p.Group || "") });
      }
    }
  });

  const out = [...byNotes.values()];
  for (const o of out) {
    o.members.sort((a, b) => a.fam - b.fam || a.name.localeCompare(b.name));
    o.fam = o.members[0].fam;
  }
  out.sort(
    (a, b) =>
      b.score - a.score ||
      b.matches - a.matches ||
      a.fam - b.fam ||
      (a.r === rootPc ? 0 : 1) - (b.r === rootPc ? 0 : 1) ||
      a.members[0].name.localeCompare(b.members[0].name)
  );
  const minMatches = selPcs.size - 1;
  return out.filter((o, idx) => idx < MIN_SUGGESTIONS || (o.matches >= minMatches && o.extras <= 1));
}

function loadSuggestion(s) {
  const sel = document.getElementById("scaleSelect");
  sel.value = String(s.members[0].i);
  syncScaleQuickPickPressed();
  setRootPc(s.r); // resets edits + redraws
}

function renderSuggestions(rootPc, selPcs) {
  const list = document.getElementById("suggestionList");
  if (!list) return;
  list.replaceChildren();
  const total = selPcs.size;

  for (const s of rankSuggestions(selPcs, rootPc)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggestion-item";
    const label = s.members.map((m) => NOTE_NAMES[s.r] + " " + m.name).join(" / ");
    btn.title = "Load " + NOTE_NAMES[s.r] + " " + s.members[0].name;

    const nameEl = document.createElement("span");
    nameEl.className = "suggestion-name";
    nameEl.textContent = label;

    const metaEl = document.createElement("span");
    metaEl.className = "suggestion-meta";
    metaEl.textContent = s.matches + "/" + total + (s.extras ? " · +" + s.extras + " extra" : "");

    btn.append(nameEl, metaEl);
    btn.addEventListener("click", () => loadSuggestion(s));
    list.appendChild(btn);
  }
}

function groupSortOrder(a, b) {
  const pri = (g) => (g === "Common" ? 0 : 1);
  const pa = pri(a);
  const pb = pri(b);
  if (pa !== pb) return pa - pb;
  return a.localeCompare(b);
}

/** Preset index for C major: Major in Common, else first Major, else 0. */
function defaultPresetIndexForCMajor() {
  let majorCommon = -1;
  let majorAny = -1;
  for (let i = 0; i < presets.length; i++) {
    if (presets[i].Name !== "Major") continue;
    if (majorAny < 0) majorAny = i;
    const g = presets[i].Group || "";
    if (g === "Common" && majorCommon < 0) majorCommon = i;
  }
  if (majorCommon >= 0) return majorCommon;
  if (majorAny >= 0) return majorAny;
  return 0;
}

function buildScaleSelect(data) {
  presets = data.presets || [];
  presetOffsetsList = presets.map((p) => parsePresetValue(p.Value));
  customOffsets = null;
  const sel = document.getElementById("scaleSelect");
  sel.replaceChildren();

  const byGroup = new Map();
  for (let i = 0; i < presets.length; i++) {
    const g = presets[i].Group || "Other";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push({ i, p: presets[i] });
  }

  const order = [...byGroup.keys()].sort(groupSortOrder);
  for (const g of order) {
    const items = byGroup.get(g).slice().sort((a, b) => a.p.Name.localeCompare(b.p.Name));
    const og = document.createElement("optgroup");
    og.label = g;
    for (const { i, p } of items) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = p.Name;
      og.appendChild(opt);
    }
    sel.appendChild(og);
  }

  sel.value = String(defaultPresetIndexForCMajor());
  buildScaleQuickPick();
  syncScaleQuickPickPressed();
}

async function loadScales() {
  const warn = document.getElementById("loadError");

  // 1. Pre-loaded via js/scales-data.js (avoids CORS issues on file:// protocol)
  if (typeof window !== "undefined" && window.SCALES_DATA && window.SCALES_DATA.presets && window.SCALES_DATA.presets.length) {
    buildScaleSelect(window.SCALES_DATA);
    if (warn) {
      warn.classList.add("d-none");
      warn.replaceChildren();
    }
    redraw();
    return;
  }

  // 2. Fetch if hosted on web server
  const urls = ["Scales.json", "./Scales.json"];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const data = await r.json();
      if (data.presets && data.presets.length) {
        buildScaleSelect(data);
        if (warn) {
          warn.classList.add("d-none");
          warn.replaceChildren();
        }
        redraw();
        return;
      }
    } catch (_) {
      /* file:// or network error */
    }
  }

  // 3. Graceful fallback without showing confusing server warning
  if (warn) {
    warn.classList.add("d-none");
    warn.replaceChildren();
  }
  buildScaleSelect({ presets: FALLBACK_PRESETS });
  redraw();
}

function init() {
  const rootSel = document.getElementById("rootSelect");
  if (!rootSel) return;

  rootSel.replaceChildren();
  NOTE_NAMES.forEach((name, pcVal) => {
    const opt = document.createElement("option");
    opt.value = String(pcVal);
    opt.textContent = name;
    rootSel.appendChild(opt);
  });
  rootSel.value = "0";
  buildRootPicker();

  const tuningSel = document.getElementById("tuningSelect");
  tuningSel.replaceChildren();
  for (const [id, t] of Object.entries(TUNINGS)) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = t.label;
    tuningSel.appendChild(opt);
  }

  const fretRange = document.getElementById("fretRange");
  const fretNumber = document.getElementById("fretNumber");
  fretRange.min = String(FRET_MIN);
  fretRange.max = String(FRET_MAX);
  fretRange.step = "1";
  syncFretInputs(fretRange, fretNumber, 21);

  fretRange.addEventListener("input", () => {
    syncFretInputs(fretRange, fretNumber, fretRange.value);
    redraw();
  });
  fretNumber.addEventListener("input", () => {
    syncFretInputs(fretRange, fretNumber, fretNumber.value);
    redraw();
  });
  fretNumber.addEventListener("change", () => {
    syncFretInputs(fretRange, fretNumber, fretNumber.value);
    redraw();
  });

  rootSel.addEventListener("change", () => {
    customOffsets = null;
    redraw();
  });
  tuningSel.addEventListener("change", redraw);
  const scaleSel = document.getElementById("scaleSelect");
  scaleSel.addEventListener("change", () => {
    syncScaleQuickPickPressed();
    customOffsets = null;
    redraw();
  });
  document.getElementById("resetNotesBtn").addEventListener("click", () => {
    customOffsets = null;
    redraw();
  });
  document.getElementById("displayMode").addEventListener("change", redraw);

  initTheme();
  loadScales();
}

function initTheme() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  const toggleText = document.getElementById("themeToggleText");
  if (!toggleBtn) return;

  function getEffectiveTheme() {
    return (
      document.documentElement.getAttribute("data-bs-theme") ||
      (document.documentElement.classList.contains("theme-dark") ? "dark" : "light")
    );
  }

  function updateToggleUI(theme) {
    const isDark = theme === "dark";
    const nextTheme = isDark ? "light" : "dark";
    const label = `Switch to ${nextTheme} mode`;
    const text = isDark ? "Light mode" : "Dark mode";

    toggleBtn.setAttribute("aria-label", label);
    toggleBtn.setAttribute("title", label);
    toggleBtn.setAttribute("aria-pressed", isDark ? "true" : "false");
    if (toggleText) {
      toggleText.textContent = text;
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("theme-dark");
      document.documentElement.classList.remove("theme-light");
    } else {
      document.documentElement.classList.remove("theme-dark");
      document.documentElement.classList.add("theme-light");
    }
    updateToggleUI(theme);
  }

  applyTheme(getEffectiveTheme());

  toggleBtn.addEventListener("click", () => {
    const cur = getEffectiveTheme();
    const next = cur === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem("guitar-scales-theme", next);
    } catch (_) {}
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      try {
        if (!localStorage.getItem("guitar-scales-theme")) {
          const next = e.matches ? "dark" : "light";
          applyTheme(next);
        }
      } catch (_) {}
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
