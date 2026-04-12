# Guitar scales

Static fretboard viewer: pick root, scale preset, tuning, fret span, and **Simple** vs **Informational** view.

## Run locally

`Scales.json` is loaded with `fetch`, so open the site over HTTP (not `file://`), e.g.:

```bash
python3 -m http.server
```

Then visit the served URL. If the JSON request fails, a small built-in preset list is used so the UI still works.

## Key design choices

| Choice | Rationale |
|--------|-----------|
| **Vanilla JS + Bootstrap 5** | No build step; fast to change; layout and forms stay accessible and responsive with little code. |
| **Single `js/app.js`** | One place for tuning, parsing, rendering, and UI wiring—avoids cross-script ordering issues and keeps `file://` debugging simpler when HTTP isn’t used. |
| **Frets start at 1 (no open column)** | Matches tab-style thinking: the grid is “fretted notes only,” so the neck reads like a chart rather than a full 0-based layout. |
| **Simple vs Informational** | **Simple** keeps only scale tones visible for a clean practice view. **Informational** adds faint labels for out-of-scale notes and highlights **chord tones** (triad-based when the scale supports M3+P5 or m3+P5; otherwise 3rd/5th scale steps). |
| **Preset `Value` as degrees 1–12** | Data stays human-editable (`1;3;5;…`); parser maps to semitone offsets and tolerates a few delimiter/typo patterns so bad rows don’t break the app. |
| **Scale menu: Common first, then A–Z groups** | Frequent scales surface first; long lists stay scannable. |
| **CSS palette variables** | Warm cream page (`--pal-bg`), slightly lighter fretboard and selects (`--pal-fretboard`), purple root accent—coherent “paper + ink” look without a CSS framework fight. |
| **Simple view: `fit-content` grid + capped fret column width** | Readable on phones; **Informational** uses `1fr` columns and full card width so the neck stretches with the container. |

## Data

`Scales.json` holds a `presets` array: `Name`, `Value` (degree list), `Group`. Indices in the `<select>` match array order after grouping/sorting.
