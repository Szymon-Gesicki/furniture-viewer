# Plan: hole dimensions, hardware filter and multi-view drawings

Status: ready to implement · 2026-10-31 · extends `SPEC.md` (drilling plan) – implement SPEC first or together.

Inputs in this folder:

| File | Use |
|---|---|
| `HARDWARE.md` | researched hole patterns, spacings and edge distances for every hardware item, with status verified / standard / placeholder |
| `hardware-catalog.json` | the same as data: templates per hardware item + `kind_to_item` mapping |
| `fixtures/<project>.drill.json` | regenerated: now also `tipon-bore` (21 TIP-ON units), `hanger-dowel` (Camar 801), handle holes for **Nomet TECHNO 320/128** (rule-based, no longer from the model's old handle parts), `front-fixing-top` (ZF4.50I2) |
| `reference/drill.py` | reference implementation (port to TS) |

## 1. What the user wants

1. Pick a **hardware type** (hinge, plate, drawer runner, INSERTA, stabiliser, TIP-ON, Camar hanger, handle, shelf pin) – or "all".
2. See the holes of that type on the model **and** on a flat drawing of each board, with **dimension arrows from the edges**
   of the board to every hole and between holes (spacing), Ø and depth, all taken from the documentation (`HARDWARE.md`).
3. Look at a board or a whole cabinet **from any side**: front, back, left, right, top, bottom – plus the free 3D view.
4. See clearly which numbers are **placeholders** (to measure) and which are verified.

## 2. Data model

```ts
// src/drilling/catalog.ts – loaded from docs/drilling/hardware-catalog.json (copy to src/ at build time)
type HardwareItem = { id: string; label: string; group: 'hinge'|'drawer'|'tipon'|'hanger'|'handle'|'shelf';
  articles?: string[]; template: { part: string; face: string; origin: string; holes: TemplateHole[]; line?: {...} };
  sources?: string[] };
type TemplateHole = { name?: string; u: number|string; v: number|string; dia: number; depth: number;
  status: 'verified'|'standard'|'placeholder'|'placeholder-u'|'placeholder-height' };
```

Every `DrillFeature` (SPEC 6.1) gets `item: string` (catalogue id, via `kind_to_item`, handles via the hardware code) and
`status`. Group = `catalog[item].group` → used by the filter.

Placeholders are **parameters** (`DRILL_PARAMS.camar801.first_dowel_from_back_edge` …) editable in a small settings
dialog ("Hardware parameters"), saved in `projects/<id>/drilling.json` → `params` (same commit flow as other edits).
Changing a parameter recomputes the plan.

## 3. Dimensioning engine (`src/drilling/dims.ts`)

Pure function: `dimensionsFor(board: PartBox, face: FaceId, holes: DrillFeature[], opts): Dim[]`

```ts
type Dim = { kind: 'linear'|'diameter'|'note'; from: [u,v]; to: [u,v]; offset: number; text: string; level: number;
             status?: 'verified'|'standard'|'placeholder' };
```

Rules (classic workshop drawing, ISO 129 style):

1. **Reference edges** per face come from the features' `u_from` / `v_from` (front edge, back edge, bottom edge, hinge edge,
   left edge…). Dimension **from the reference edge**, never from the opposite edge, so the numbers match `HARDWARE.md`.
2. **Ordinate (baseline) dimensions** along u and along v: one baseline per axis on the reference edge, each hole gets an
   ordinate value (e.g. runner screws 19 / 37 / 69 / 261 / 293). Use ordinate style when ≥ 3 holes share an axis, chain
   style for 2 holes (plus their spacing, e.g. "32" between plate screws, "45" between hinge screws, "320" for handles).
3. **Spacing dims** between holes of the same hardware instance (from the template: 45, 32, 320, 128, 128 for INSERTA
   upper↔gallery…).
4. **Diameter callout** per distinct hole type: leader + "Ø35 × 13", "Ø10 × 12", "Ø5 × 10"…; group identical holes:
   "4 × Ø10 × 12".
5. **Hole lines**: thin dashed centre lines through holes that share u or v (37 mm line, runner line, INSERTA line).
   The runner bottom line is drawn as a solid line with label "linia prowadnicy".
6. **Layout**: dims placed outside the board outline, stacked in levels (8 mm step at 1:5) without overlaps; text never
   upside-down; long boards may be split into two rows.
7. Placeholder values: dimension text in orange with "?" suffix and a footnote "zmierz na okuciu".
8. Units mm, 0.5 precision, no unit suffix on dims (title block says "wymiary w mm").

Unit tests: given the fixtures, the dims for `G2 Bok P` include 37 (plate line), the plate screws at 84±16 / 798±16 and
the Camar dowel height 840; `P2 Szuflada dolna` front: 36.5, 49.5, 81.5, 209.5, 34.5, 320 spacing.

## 4. Views

### 4.1 3D viewer

* Toolbar **View**: `3D` · `Przód` (front) · `Tył` (back) · `Lewo` · `Prawo` · `Góra` · `Dół` – switches to an
  **orthographic camera** aligned to the selected axis of the project (or of the selected cabinet in cabinet mode).
  "Front" = looking along the cabinet's front normal (fronts face −Y, kitchen also ±X: use the selected unit's front
  normal). Smooth camera tween, zoom-to-fit.
* Holes rendered as small cylinders (Ø × depth along `dir`); colour per group; placeholders hatched/orange.
* In orthographic views show the **dimension overlay** for visible boards (SVG/CSS2D layer projected from the board
  plane), only for the selected hardware group, to keep it readable. "X-ray fronts" toggle so the inside of carcasses is
  visible in the front view.

### 4.2 Board sheet (2D) – the main deliverable

Route `#/p/<id>/drill/<partCode>`:

* Each face that has holes is drawn as a rectangle at scale (1:5 default, fit-to-page option), with the **edge names** on
  the four sides (front / back / top / bottom edge, hinge / opening edge) and a little 3D thumbnail showing where the
  face is on the cabinet.
* **Face selector** (tabs): inner face, outer face, front edge, top edge … – edges are drawn as long thin rectangles
  (18 mm) with their holes (TIP-ON Ø10 × 76 goes into the front edge!).
* **Mirror toggle** "widok od strony wiercenia / od drugiej strony" so the user can lay the drawing on the board.
* Dimensions per section 3, hole table under the drawing (id, hardware, u, v, Ø, depth, status), title block (project,
  cabinet, part code, part name, size L × W × T, material, scale, date).
* Print CSS: A4 landscape, one face per page, `@page` margins 10 mm, black/white friendly (status = text, not colour only).

### 4.3 Cabinet sheet

Route `#/p/<id>/drill/cab/<cabinet>`: all boards of a cabinet, one per section, plus an exploded thumbnail with
board codes; button "Drukuj szafkę".

## 5. Hardware filter (UI)

* Left panel section **Okucia** (hardware) with checkboxes per group: Zawiasy (puszki + wkręty), Prowadniki, Szuflady
  (prowadnice, INSERTA, stabilizacja), TIP-ON, Zawieszki Camar 801, Uchwyty, Podpórki półek, Półki stałe – plus "wszystko".
* Selecting a group: highlights the parts that carry those holes, shows only those holes + dims; counts per article
  ("71B3550: 58 szt." etc., must match `HARDWARE.md` / SPEC section 8).
* Clicking a hole: tooltip with item label, article, Ø × depth, u/v from the reference edges, status, source link
  (`sources[0]`).
* Hardware detail popover: the template drawing of that item (e.g. the hinge cup with 45 / 9.5 / B+17.5, the plate
  37 / 32, the runner 19/37/69/261/293, INSERTA 36.5 / 49.5 / 81.5 / 209.5) rendered with the same dims engine from the
  catalogue template – a "datasheet" view.

## 5a. Montage notes ("Uwagi montażowe")

Every hardware item has `notes_pl: string[]` in `hardware-catalog.json` – short workshop instructions, e.g. for Camar 801:
"Zawieszka ma się stykać górą ze spodem wieńca górnego i tyłem z tylną krawędzią boku".

* Shown in: the hole tooltip (first note), the hardware datasheet popover (all notes), and on every board sheet / cabinet
  sheet in a box **"Uwagi montażowe"** under the hole table – one block per hardware item present on that board.
* Editable: a pencil icon next to the notes opens a textarea; the user's text is saved per project in
  `projects/<id>/drilling.json` → `notes[itemId]` (overrides/extends the catalogue notes; same commit flow as other edits).
* Free note per part: the board sheet also has an optional note field for that single board (`partNotes[partCode]`),
  printed under the drawing.
* Printed in full (no truncation); placeholders referenced in notes are highlighted like placeholder dimensions.

## 5b. Assembly mode ("Tryb składania") – notes visible while working

Goal: Szymon has the phone/tablet next to the board in the workshop and sees **what to drill and how** without hunting
through menus.

* Button **"Składanie"** on a cabinet (unit panel) → route `#/p/<id>/build/<cabinet>`.
* A list of **steps**, one per board × hardware item, in a sensible order (sides: shelf pins → plates → runners → Camar 801;
  then doors: cups → hinge screws; drawer fronts: INSERTA → stabiliser → handle; TIP-ON last).
* Each step card shows, big and readable on a phone (min. 18 px text, full width):
  1. board code + name, which face, small 3D thumbnail with the board highlighted;
  2. the 2D board drawing with only this hardware's holes and dimension arrows (section 3);
  3. **"Uwagi montażowe"** – all `notes_pl` of the item + the user's own notes, always expanded (e.g. Camar 801:
     "stykać się górą ze spodem wieńca i tyłem z tylną krawędzią boku");
  4. drill info chip: "Ø35 × 13", "Ø10 × 12", "Ø5 × 10" … and the tool hint from SPEC 4.11 (Wolfcraft spacer, depth stop);
  5. checkbox **"Zrobione"** – progress saved per project (`drilling.json` → `done[stepId]`, commit flow; also cached in
     localStorage for offline), progress bar per cabinet.
* Navigation: big "Wstecz / Dalej" buttons, swipe on mobile; screen stays awake (Wake Lock API where available).
* Works offline after first load (the models/fixtures are static files; service worker optional).
* Placeholder values in a step show an orange box "Zmierz na okuciu: …" with an input to type the measured value
  (writes the parameter, recomputes the plan).

## 6. Acceptance

1. All fixtures load; feature counts per kind and per project equal the fixtures (`tipon-bore` 21 in total,
   `hanger-dowel` 12, kitchen `handle-hole` 34, `front-fixing-top` 4).
2. For any part with holes the sheet shows every hole and every number in `HARDWARE.md` that applies to it, measured from
   the same reference edge.
3. Orthographic views from 6 directions + 3D; dims readable at 1:5 on A4.
4. Placeholder values visibly marked; changing a parameter (e.g. Camar dowel spacing 32 → 40) updates 3D, sheet and fixture
   comparison (fixture test then expects the parameter values recorded in `parameters`).
5. Print of one board and one cabinet produces clean A4 pages.
7. Assembly mode: step list per cabinet, notes always visible, 'Zrobione' progress saved, usable on a phone.
6. Montage notes from the catalogue appear in tooltip, datasheet and on the sheets; user edits are saved and survive reload.

## 7. Implementation order

1. Port `drill.py` → `src/drilling/plan.ts` (SPEC.md) incl. the new rules: TECHNO handles, TIP-ON, Camar 801.
2. Catalogue loader + `item`/`status` on features + golden tests against fixtures.
3. Dims engine (`dims.ts`) + unit tests.
4. Board sheet route + print CSS.
5. Orthographic view switcher + 3D dim overlay.
6. Hardware filter panel, hole tooltip, datasheet popover, parameters dialog.
7. Montage notes (5a) and assembly mode (5b).
