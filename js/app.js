/* Full list: serve this folder over HTTP (e.g. python3 -m http.server) so Scales.json can load. */

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FRET_MIN = 5;
const FRET_MAX = 27;
/** First fret column shown (open string / fret 0 omitted). */
const FRET_START = 1;

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
  const { openStringMidi, scalePitchClasses, keyPitchClasses, rootPitchClass, maxFret, displayMode } = opts;
  if (!mount) return;
  mount.replaceChildren();

  const lastFret = Math.max(FRET_START, maxFret);
  const colCount = lastFret - FRET_START + 1;
  const simple = displayMode === "simple";

  const grid = document.createElement("div");
  grid.className = "fb-grid" + (simple ? " fb-simple" : "");
  grid.style.gridTemplateColumns = `2.75rem repeat(${colCount}, minmax(1.55rem, 1fr))`;

  const corner = document.createElement("div");
  corner.setAttribute("aria-hidden", "true");
  grid.appendChild(corner);

  for (let f = FRET_START; f <= lastFret; f++) {
    const hn = document.createElement("div");
    hn.className = "fb-fret-num" + (f === FRET_START ? " fb-first-fret" : "");
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
      cell.className = "fb-cell" + (f === FRET_START ? " fb-first-fret" : "");

      if (!simple && !inScale) {
        const span = document.createElement("span");
        span.className = "fb-outside";
        span.textContent = name;
        span.title = name + " · fret " + f + " (outside scale)";
        cell.appendChild(span);
      } else if (inScale) {
        let tier = "scale";
        if (isRoot) tier = "root";
        else if (displayMode === "informational" && keyPitchClasses.has(p)) tier = "key";

        const mark = document.createElement("div");
        mark.className = "fb-mark fb-" + tier;
        mark.title = name + " · fret " + f + (tier === "key" ? " · chord-tone highlight" : "");
        const noteEl = document.createElement("span");
        noteEl.className = "fb-note";
        noteEl.textContent = name;
        mark.appendChild(noteEl);
        cell.appendChild(mark);
      }

      grid.appendChild(cell);
    }
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

function clampFret(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 21;
  return Math.min(FRET_MAX, Math.max(FRET_MIN, Math.round(x)));
}

function syncFretInputs(rangeEl, numEl, v) {
  const c = clampFret(v);
  rangeEl.value = String(c);
  numEl.value = String(c);
  return c;
}

let presets = [];

function getState() {
  const rootSel = document.getElementById("rootSelect");
  const scaleSel = document.getElementById("scaleSelect");
  const tuningSel = document.getElementById("tuningSelect");
  const fretRange = document.getElementById("fretRange");
  const modeSel = document.getElementById("displayMode");
  const idx = parseInt(scaleSel.value, 10);
  const preset = Number.isFinite(idx) ? presets[idx] : undefined;
  const rootPc = parseInt(rootSel.value, 10);
  const offsets = preset ? parsePresetValue(preset.Value) : new Set();
  const maxFret = clampFret(fretRange.value);
  const tuning = TUNINGS[tuningSel.value] || TUNINGS.standard;
  const displayMode = modeSel && modeSel.value === "informational" ? "informational" : "simple";

  return {
    maxFret,
    displayMode,
    rootPitchClass: rootPc,
    scalePitchClasses: scalePitchClassesFromOffsets(rootPc, offsets),
    keyPitchClasses: keyPitchClassesFromPattern(rootPc, offsets),
    openStringMidi: tuning.openMidi,
  };
}

function redraw() {
  renderFretboard(document.getElementById("fretboardMount"), getState());
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
}

async function loadScales() {
  const warn = document.getElementById("loadError");
  const urls = ["Scales.json", "./Scales.json"];
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const data = await r.json();
      if (data.presets && data.presets.length) {
        buildScaleSelect(data);
        warn.classList.add("d-none");
        redraw();
        return;
      }
    } catch (_) {
      /* file:// or missing file */
    }
  }
  warn.textContent =
    "Could not load Scales.json (open via a local server from this folder, e.g. python3 -m http.server). Using a small built-in scale list.";
  warn.classList.remove("d-none");
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

  rootSel.addEventListener("change", redraw);
  tuningSel.addEventListener("change", redraw);
  document.getElementById("scaleSelect").addEventListener("change", redraw);
  document.getElementById("displayMode").addEventListener("change", redraw);

  loadScales();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
