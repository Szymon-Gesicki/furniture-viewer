# Drilling plan: hinges, drawers, shelves, handles – spec for the viewer

Status: ready to implement · 2026-10-24, updated 2026-10-31 · author: Szymon (research and numbers prepared with Claude)

> **Update 2026-10-31:** handles are now Nomet TECHNO 320/128 (rule-based, 4.9), TIP-ON and Camar 801 hangers are in the
> fixtures (4.10, 4.12). Exact hardware data with sources: `HARDWARE.md` / `hardware-catalog.json`. Dimension arrows,
> hardware filter and 6-direction views: `PLAN-dimensions-and-views.md`.

## 1. Goal

For every project in the viewer, show **where to drill and how** – for Blum hinges and mounting plates, MERIVOBOX
drawers (carcass runners and INSERTA front fixings), shelf pins / fixed shelves and handles – so that the parts can
be marked and drilled in the workshop straight from the viewer (or from a printed sheet).

User stories:

1. I open a project, switch on the **Drilling** layer and see every hole as a small marker on the part it belongs to.
2. I click a part (e.g. `KIT-17 · G2 Bok P`) and the info panel lists its holes with dimensions **from the edges of
   that board** (u from the front edge, v from the bottom edge, Ø, depth, hardware).
3. I open the **drilling sheet** of a part or a whole cabinet: a flat 2D drawing of each face with dimension lines,
   ready to print (A4, 1:5 or fit-to-page).
4. I see a per-cabinet summary (hinge side, number of hinges, cup distance B, runner heights …) and warnings.
5. Hinge side, fixed/adjustable shelves and manual hinge moves can be overridden per project, saved like other edits.

Out of scope for now: carcass assembly screws (sides ↔ wieńce), HDF backs, legs, wall hanging rails.

## 2. What is in this folder

| Path | What |
|---|---|
| `docs/drilling/SPEC.md` | this document |
| `docs/drilling/fixtures/<project>.drill.json` | expected result for each project (golden data for tests) |
| `docs/drilling/reference/drill.py` | reference implementation (Python) that produced the fixtures – port it to TypeScript |
| `docs/drilling/reference/tables.py` | renders the tables in section 9 from the fixtures |

The fixtures were generated from the **current** SketchUp scripts. Two of them changed after the last import, so
`sources/sketchup/kitchen-in-room.rb` (drawer bottoms/backs per Blum) and `sources/sketchup/alcove-wardrobe.rb`
(v4: two partitions in the top box) were updated in the same change. **First step: run `npm run import:rb`**
so that `projects/kitchen/model.json` and `projects/alcove-wardrobe/model.json` match the fixtures.

Fixture part references contain `id` and `name`. `mergeImport` may keep older ids, so match parts **by name, and
if a name occurs more than once (e.g. three `R1 Polka 385x150`) by the nearest bounding box** to the feature point.

## 3. Hardware (decided)

| Item | Blum article | Where |
|---|---|---|
| Hinge 110°, full overlay, screw-on, BLUMOTION | 71B3550 | all overlay doors + flap B3 (58 pcs) |
| Hinge 155°, zero protrusion, screw-on, BLUMOTION | 71B7550 | kitchen B1, B4, P1 (6 pcs) |
| Hinge 110°, **inset**, screw-on, BLUMOTION | 71B3750 | kitchen L6 – inset door between fridge panels (2 pcs) |
| Cruciform mounting plate 0 mm, screw-on | 173L6100 | every hinge (66 pcs) |
| Screws for hinges and plates | 609.1500 (3.5×15) | 2 per cup, 2 per plate |
| Drawer | MERIVOBOX NL 500, 40 kg, BLUMOTION, A1 (wooden back sits on the bottom) | kitchen P2, P3 (M / K / E with gallery rail – *reling*, not BOXCAP) |
| Runner | 450.5001B, chipboard screws 4×15 (Blum drawing "A: 4 mm × 15 mm") | |
| Front fixing | ZF4.10I2 INSERTA (lower, all drawers) + ZF4.50I2 INSERTA (upper, gallery-rail drawers E) + stabiliser Z96.10E1 | |
| Shelf pins | Ø5 | adjustable shelves |
| Handles | Nomet TECHNO black matt 320 (C-1149-320.P61) and 128, M4 × 25 | kitchen only (everything else TIP-ON) |
| Wall-cabinet hangers | Camar 801 (2 dowels Ø10) on a wall rail | kitchen G2–G4 |

## 4. Rules

All dimensions in mm. Plates are 18 mm chipboard, fronts 18 mm.

### 4.1 Doors – which edge carries the hinges

Priority:

1. per-project override (`hingeSide`, see 6.3);
2. label in the part name: `zawiasy L` / `zawiasy P` (L = left, P = right **as seen from the front**);
3. kitchen: the edge **opposite the handle** (handle centre more than 15 % of the width away from the middle);
4. door name `Drzwi L …` / `Drzwi lewe` → L, `Drzwi P …` / `Drzwi prawe` → P.

"As seen from the front": outward normal **n** of the front (thin axis, pointing away from its cabinet's carcass);
viewer looks along −n; `right = (−n) × Z`. Example: front facing −Y → right = +X.

Skip: drawer fronts (`Szuflada`), dishwasher front (`Zmywarka`), fixed panel `GB Front`.
Flap `Klapa` → hinges on the bottom edge (4.6).

### 4.2 Hinge side panel and overlay

The side panel is the carcass/cladding panel whose thin axis is the door's lateral axis, whose front face is 0–30 mm
behind the door back face, which covers most of the door height, and whose **inner face** (towards the door centre)
lies 0–25 mm inward of the hinge edge.

`overlay = distance from the hinge edge of the door to the inner face of the side panel`

`B (cup boring distance, door edge → cup edge) = overlay − 11`  (Blum chart, 0 mm plate; same for 71B3550 and 71B7550)

Allowed B: 3–7 mm (71B3550), 3–8 mm (71B7550) – otherwise warning. Typical result here: overlay 16 → B = 5.

If no side panel is behind the edge but a panel stands beside the door with its front flush with the door front and
a 0–5 mm gap → **inset door** (L6): hinge 71B3750, plate setback `37 + 18 + 1.5 = 56.5` (Blum: "set back the plate
by door thickness + 1.5"). B for the inset hinge is **not verified** – show the holes, but mark them "verify".

### 4.3 Hinge positions on the door

* count by door height H: ≤ 900 → 2, ≤ 1600 → 3, ≤ 2000 → 4, ≤ 2400 → 5;
* top and bottom hinge centre `d` from the door edge: 100 if H ≥ 400, otherwise `max(45, round(0.22·H))`;
* middle hinges evenly between them;
* **clash check** against panels touching the inner face of the side panel inside the plate area
  (depth 0 … setback + 25 from the side's front edge, not fillers, not in front of the carcass):
  plate band `z ± 25` must not overlap `[panel.zmin − 8, panel.zmax + 3]` (the −8 also keeps shelf-pin holes free);
  the band must stay on the side panel; the cup must stay ≥ 8 mm (+17.5 radius) from the door's top/bottom.
  On clash move the hinge 1 mm at a time (top/bottom hinge: towards the door centre first; middle hinge: try ±1, ±2 …)
  and record `moved {hinge, from, to, because}`.

### 4.4 Drilling – door (back face, drill direction −n)

| Hole | Ø × depth | u (from hinge edge) | v |
|---|---|---|---|
| cup | 35 × 13 | B + 17.5 | hinge centre |
| 2 screws | 2.5 × 10 (pilot) | B + 17.5 + 9.5 | hinge centre ± 22.5 (45 apart) |

### 4.5 Drilling – side panel (inner face), mounting plate 173L6100

| Hole | Ø × depth | u (from the side's front edge) | v |
|---|---|---|---|
| 2 screws | 2.5 × 10 (pilot) | 37 (inset: 56.5) | hinge centre ± 16 (32 apart) |

### 4.6 Flap (B3, opens downwards)

Hinges on the bottom edge; plates on the **top face** of the panel just behind the flap bottom edge (B3 wieniec dolny).
Overlay = wieniec top − flap bottom edge (16 → B = 5). Cups 100 mm from the left and right edges, cup centre
B + 17.5 above the bottom edge, screws ±22.5 sideways, 9.5 higher. Plate screws on the wieniec top face, 37 from its
front edge, ±16 sideways from each cup axis.

### 4.7 Drawers – MERIVOBOX (from Blum E-SERVICES configurations, M / K / E with gallery rail)

Front overlays used in the configurator: left 16, right 16, bottom FA = 16 (measured from the carcass inner faces).

* **Runner bottom line** on both side panels (inner face): `z = front bottom edge + 16`.
  Bottom drawer → the runner stands on the bottom wieniec (line = 0 from the side bottom).
* **Runner screws** (4×15) along that line, u from the side's front edge: **19, 37, 69, 261, 293**
  (Blum drawing: reference hole 37, +32, −18, +224, +256). The screw height is fixed by the runner itself –
  the fixture uses line + 6 as an approximate marker; **draw the line** and label the screws "through runner holes".
* **INSERTA front fixing** (back face of the front), 4 holes Ø10 (+0.2/−0.1) × 12 deep:
  u = 16 + 20.5 = **36.5** from the left and from the right edge; v = 16 + 33.5 = **49.5** and **81.5** from the
  front bottom edge.
* **Upper front fixing ZF4.50I2** (only E drawers with gallery rail – *reling*): 1 hole Ø10 × 12 per side, u = 36.5,
  v = 49.5 + 32 + 128 = **209.5** from the front bottom edge (kind `front-fixing-top`).
* **Front stabiliser Z96.10E1**: 2 holes Ø10 × 12, centred (W/2 ± 16), v = 49.5 − 15 = **34.5**.
* Drawer bottom / back (white 16 mm): bottom (inner width − 51) × 474, back (inner width − 51) × M 83 / K 121 / E 184.
  The bottom has a stabiliser position at 256 (Blum drawing) – show as a note, no hole.
* Min. inner depth 503; min. front height M 124 / K 146 / E 209; gap between fronts 2.5.

### 4.8 Shelves

* Shelf = carcass part named `Polka…` or `Przegroda pod…` lying flat. Depth axis = the thin axis of the cabinet's fronts.
  End panels = vertical panels touching both ends of the shelf.
* **Adjustable** (default): 4 pin holes Ø5 × 10, in each end panel 2 holes:
  37 from the shelf front edge and 37 from the shelf back edge (u measured from the end panel's front edge),
  hole centre 2.5 below the shelf underside.
  Optional (setting, default on in the sheet, off in the 3D view): extra rows at ±32 and ±64 when they do not clash
  with a hinge plate band or another shelf.
* **Fixed** (by name: `pod piekarnik`, `N1/N2 … Polka`; overridable): screws Spax 4×50
  through the end panel from outside, at mid shelf thickness, u = 40, depth − 40 and depth / 2 if depth > 300;
  Ø4 through + countersink, 2.5 pilot in the shelf edge.

### 4.9 Handles (kitchen) – Nomet TECHNO, rule-based

Ignore the handle parts of the model (old 190 mm bars / knobs). Holes Ø5 through, drilled from the front, M4 × 25:

* drawer fronts and the dishwasher front: **TECHNO 320** horizontal, centred, hole line **50 below the top edge**;
* doors: **TECHNO 128** vertical, hole line **40 from the opening edge**; wall units (bottom > 1200 above the floor): lower
  hole **60 above the door bottom**; other doors: upper hole **60 below the door top**;
* flap B3: TECHNO 128 horizontal, centred (v = 41).

### 4.10 TIP-ON 956A1006 (all doors without handles – 21 units)

Bore **Ø10 × 76 into the front edge** of the carcass panel at the opening side, centre **7.5 from the panel's inner face**
(Blum template 65.5010). Height "where the handle would be", ±300 allowed: wall units 100 above the door bottom, base units
100 below the door top, doors > 1500 two units at 0.35 H and 0.65 H, others H/2. Double doors meeting in the middle: bore
into the front edge of the top panel (tall doors also the bottom panel), 60 from the opening edge. Kind `tipon-bore`.

### 4.12 Camar 801 hangers (kitchen G2–G4)

Per side panel: 2 dowel holes Ø10 × 10.5 in the inner face, axis **42 below the underside of the top panel** (= 60 below
the cabinet top). Distance from the back edge (20) and spacing (32, along the depth) are **placeholders** → `verify: true`
until the user measures the hanger. Kind `hanger-dowel`. Wall rail and plugs: see `HARDWARE.md` section 5.

### 4.11 Workshop jig note (Wolfcraft 4656000)

Szymon drills cups with the Wolfcraft 4656000 kit (templates with a fixed stop, Forstner Ø35, centring bit Ø2.5, bit Ø5).
Assume the template puts the cup centre **22.5 mm** from the door edge (setting `JIG_CUP_FROM_EDGE = 22.5`, editable).
For every door show `spacer = cup_from_edge − JIG_CUP_FROM_EDGE` on the drilling sheet and in the hinge summary:
0 → "template as is", > 0 → "put an X mm spacer under the template stop" (kitchen Z1: 2 mm, B4: 1 mm),
inset door (L6) → "do not use the template – mark by hand". Cup depth note: "set the Forstner depth stop to 13 mm".
Screw holes next to the cup: "mark through the hinge with the Ø2.5 centring bit". Shelf pins: "Ø5 bit, depth 10".

## 5. Coordinates and conventions

* World: viewer model coordinates, mm, Z up, fronts face −Y (kitchen in the room also faces ±X).
* `world.p` = hole centre **on the entry face**; `world.dir` = unit vector **into the material**; depth along `dir`.
* `local.u` / `local.v` = position on the named face of that part, with `u_from` / `v_from` naming the reference edges
  (for doors: "hinge edge" / "door bottom edge"; for side panels: "front edge" / "panel bottom edge";
  for drawer fronts and handles: "left edge (viewed from the front)" / "front bottom edge").
* `face`: `back` (inside of a front), `front`, `inner` (side panel face towards the cabinet inside),
  `outer`, `top`.

## 6. Implementation proposal

### 6.1 Model

```ts
// src/drilling/schema.ts
export const DrillKind = z.enum(['hinge-cup','hinge-screw','plate-screw','runner-screw','runner-line',
  'front-fixing','front-fixing-top','tipon-bore','hanger-dowel','front-stabiliser','shelf-pin','shelf-screw','handle-hole','tipon']);
export const DrillFeature = z.object({
  id: z.string(), cabinet: z.string(), kind: DrillKind, hardware: z.string(),
  part: z.object({ id: z.string(), name: z.string() }),
  face: z.string(),                                   // 'x+' | 'y-' … outward normal of the entry face
  world: z.object({ p: Vec3, dir: Vec3 }),
  local: z.object({ u: z.number(), v: z.number(), u_from: z.string(), v_from: z.string(), face: z.string() }),
  dia: z.number(), depth: z.number(), note: z.string().default(''), verify: z.boolean().default(false),
});
```

The fixture files also contain per-cabinet summaries: `hinges[]`, `drawers[]`, `shelves[]`, `handles[]`, `warnings[]`.

### 6.2 Computation

`planDrilling(model: Model, overrides?: DrillOverrides): DrillPlan` – a pure function in `src/drilling/plan.ts`,
port of `reference/drill.py` (classes → small functions: `doorFrame`, `sidePanelAt`, `insetSide`, `blockers`,
`doorHinges`, `flapHinges`, `drawer`, `shelves`, `handles`). Run it when a model is loaded (it is cheap), so the plan
follows every re-import automatically. Parameters (section 4) in one `DRILL_PARAMS` object.

### 6.3 Overrides (saved with the project, same commit flow as layer edits)

`projects/<id>/drilling.json`:

```json
{ "hingeSide": { "L6 Drzwi nadstawki 610x374": "P" },
  "shelfMode": { "G2 Polka 414x312": "fixed" },
  "hingeZ":    { "R1 Drzwi (zawiasy P) 417x1112": [100, 600, 1012] },
  "extraShelfRows": true }
```

### 6.4 UI

* New layer **Drilling** (default hidden). Markers = small cylinders Ø × depth along `dir`, colours per kind
  (hinge cup / screws, plate, runner, INSERTA, shelf pin, handle). Runner line drawn as a line on the side panel.
* Toggle per kind in the layers panel; markers follow explode (they move with their part).
* Hover tooltip: kind, Ø × depth, hardware, `u/v` with their reference edges, note, "verify" badge.
* Part info panel: list of the part's holes (sortable), button **Drilling sheet**.
* Drilling sheet (new route `#/p/<id>/drill/<partCode>` and per cabinet `#/p/<id>/drill/cab/<cabinet>`): SVG of each
  drilled face of the board at scale, edges labelled ("front edge", "bottom edge", "hinge edge"), chained dimensions
  from the two reference edges, hole table, print CSS (A4 landscape). The board outline comes from the part box;
  its long side horizontal.
* Cabinet summary in the unit panel: hinge side, hardware, overlay → B, hinge heights, moved hinges, runner lines,
  shelf mode; warnings in red.
* Hardware count per project (hinges per article, plates, pins, INSERTA) – must equal section 8.
* Jig spacer note per door (4.11).

### 6.5 Tests (vitest)

* For each project: `planDrilling(model)` matches `docs/drilling/fixtures/<id>.drill.json` – same number of features
  per kind and part, positions within 0.5 mm (match features by part name + kind + nearest point).
* Unit tests: B = overlay − 11; hinge count by height; clash move (bathroom R1 middle hinge 556 → 593 because of
  `R1 Polka`; kitchen Z1 top hinge 616 → 585 because of `Z1 Trawers przod pionowy`); inset detection (L6);
  flap (B3 plates on the wieniec top); drawer runner lines (P2: 0 / 323 / 576 from the side bottom);
  INSERTA holes (36.5 / 49.5 / 81.5; E drawers also 209.5).
* Override tests: hinge side flip mirrors cups and moves plates to the other side panel.

## 7. Assumptions and open questions (for Szymon)

1. **L6 above the fridge is an inset door** (it sits between the fridge panels L1/L2, 2 mm gaps). It needs 2 inset
   hinges 71B3750 instead of overlay ones (shopping list updated). B and plate setback must be checked in the Blum
   chart / E-SERVICES before drilling. Hinge side: living-room side (L2) – confirmed.
2. Nightstands: hinges on the side away from the bed (N1 left, N2 right) – confirmed.
3. Shelves: all adjustable on pins (including every shelf and the partition in the fuse-box cabinet) except the oven
   shelf (B3) and the nightstand shelves – confirmed.
4. Runner screw height on the side is set by the runner – the marker is approximate; use the line.
5. Hinge centres 100 mm from door edges (small doors 22 % of height, min 45). Change in one place if preferred.
6. TIP-ON positions to be added after reading the Blum 956A1006 instruction.

## 8. Hardware totals (from the plan)

| Article | Pcs |
|---|---|
| 71B3550 (110° overlay) | 58 (56 doors + 2 flap) |
| 71B7550 (155°) | 6 |
| 71B3750 (110° inset) | 2 |
| 173L6100 plates | 66 |
| 609.1500 screws | 264 (132 cup + 132 plate) |
| INSERTA ZF4.10I2 | 12 (6 drawers × 2) |
| INSERTA ZF4.50I2 (upper, gallery rail) | 4 (2 drawers × 2) |
| Z96.10E1 | 6 |
| Shelf pins Ø5 | 88 |
| Runner screws 4×15 | 60 (12 runners × 5) |

## 9. Per-cabinet results (generated from the fixtures)

u/v as in section 5. "Hinge centres from door bottom" = cup centre heights measured from the door's bottom edge.
"Plate centres from panel bottom" = the same heights measured from the bottom edge of the side panel the plate is
screwed to (plate screws at ±16 from that value), setback in brackets.

### Kitchen (`kitchen`)

**Doors and hinges**

| Door | Hinges on | Hinge | Overlay → B | Cup centre from hinge edge | Hinge centres from door bottom | Plates on panel | Plate centres from panel bottom (setback) | Notes |
|---|---|---|---|---|---|---|---|---|
| B1 Drzwiczki (zawiasy od strony zmywarki, Blum 155 st.) 105x716 | P | 71B7550 | 16 → 5 | 22.5 | 100, 616 | B1 Bok L 702x510 | 84, 600 (37) |  |
| B3 Klapa schowka (2 zawiasy na dole, otwiera sie w dol) 596x82 | bottom edge (flap) | 71B3550 | 16 → 5 | 22.5 | 100, 496 (from left edge) | B3 Wieniec dolny (pod bokami) 600x510 | top face, 37 from front edge, under each cup |  |
| B4 Drzwiczki narozne (zawiasy Blum 155 st. na boku B4, otw. w lewo, chowaja sie za drzwiami P1) 131x716 | L | 71B7550 | 17 → 6 | 23.5 | 100, 616 | B4 Bok L 702x492 (skrec z bokiem B3, tu zawiasy drzwiczek) | 84, 600 (37) |  |
| P1 Drzwi (zawiasy Blum 155 st. od szuflad, otw. w prawo, otwierasz PIERWSZE) 367x716 | P | 71B7550 | 16 → 5 | 22.5 | 100, 616 | P1 Bok L 702x505 | 84, 600 (37) |  |
| G2 Drzwi (zawiasy L) 446x896 | L | 71B3550 | 16 → 5 | 22.5 | 100, 796 | G2 Bok P 900x332 | 102, 798 (37) |  |
| G3 Drzwi (zawiasy L) 596x896 | L | 71B3550 | 16 → 5 | 22.5 | 100, 796 | G3 Bok P 900x332 | 102, 798 (37) |  |
| G4 Drzwi (zawiasy P) 596x896 | P | 71B3550 | 16 → 5 | 22.5 | 100, 796 | G4 Bok L 900x332 | 102, 798 (37) |  |
| Z1 Drzwi L 365x716 | P | 71B3550 | 18 → 7 | 24.5 | 100, 585 | Z1 Bok L 702x330 | 84, 569 (37) | hinge 2 moved 616→585 (clear of Z1 Trawers przod pionowy 696x100) |
| Z1 Drzwi P 364x716 | L | 71B3550 | 18 → 7 | 24.5 | 100, 585 | Z1 Bok P 702x330 | 84, 569 (37) | hinge 2 moved 616→585 (clear of Z1 Trawers przod pionowy 696x100) |
| L6 Drzwi nadstawki 610x374 | L | 71B3750 | -2 → 5 | 22.5 | 82, 292 | L2 Bok lodowki (strona salonu) 688x2414 (z naddatkiem, dotnij) | 2056, 2266 (56.5) | INSET door – B and setback to verify |

**Drawers (MERIVOBOX NL 500, INSERTA, BLUMOTION)**

| Front | Type | Inner width | Runner bottom line from side-panel bottom (both sides) | INSERTA holes Ø10×12 (u from left / v from bottom) | Stabiliser holes Ø10×12 | Bottom / back panel |
|---|---|---|---|---|---|---|
| P2 Szuflada dolna (E + galeria) 596x320 | E | 564 | 0 | u 36.5 and 559.5; v 49.5 and 81.5 + upper ZF4.50I2 at v 209.5 | u 282 and 314; v 34.5 | 513×474 / 513×184 |
| P2 Szuflada srodkowa (K) 596x250 | K | 564 | 323 | u 36.5 and 559.5; v 49.5 and 81.5 | u 282 and 314; v 34.5 | 513×474 / 513×121 |
| P2 Szuflada gorna (M, sztucce) 596x140 | M | 564 | 576 | u 36.5 and 559.5; v 49.5 and 81.5 | u 282 and 314; v 34.5 | 513×474 / 513×83 |
| P3 Szuflada dolna (E + galeria) 496x320 | E | 464 | 0 | u 36.5 and 459.5; v 49.5 and 81.5 + upper ZF4.50I2 at v 209.5 | u 232 and 264; v 34.5 | 413×474 / 413×184 |
| P3 Szuflada srodkowa (K) 496x250 | K | 464 | 323 | u 36.5 and 459.5; v 49.5 and 81.5 | u 232 and 264; v 34.5 | 413×474 / 413×121 |
| P3 Szuflada gorna (M, sztucce) 496x140 | M | 464 | 576 | u 36.5 and 459.5; v 49.5 and 81.5 | u 232 and 264; v 34.5 | 413×474 / 413×83 |

**Shelves**

| Shelf | Mounting | Holes in both end panels: u from front edge / v from panel bottom |
|---|---|---|
| B3 Polka pod piekarnik | screws Spax 4×50 from outside, Ø4 + countersink | u 40, 235, 430 / v 68 — in B3 Bok L 702x510, B3 Bok P 702x510 |
| P1 Polka 864x485 | pins Ø5×10 | u 57, 192, 468, 603 / v 319.5 — in P1 Bok L 702x505, P1 Bok tylny przy scianie 702x640 |
| G2 Polka 414x312 | pins Ø5×10 | u 57, 295 / v 447.5 — in G2 Bok L 900x332, G2 Bok P 900x332 |
| G4 Polka 564x312 | pins Ø5×10 | u 57, 295 / v 447.5 — in G4 Bok L 900x332, G4 Bok P 900x332 |

**Handles – Nomet TECHNO (through holes Ø5 from the front, M4×25)**

| Front | Handle | Holes (u from left edge, v from bottom) |
|---|---|---|
| B1 Drzwiczki (zawiasy od strony zmywarki, Blum 155 st.) 105x716 | Nomet TECHNO 128 czarny mat | (40, 528); (40, 656) |
| B2 Zmywarka Front 446x716 | Nomet TECHNO 320 czarny mat | (63, 666); (383, 666) |
| B3 Klapa schowka (2 zawiasy na dole, otwiera sie w dol) 596x82 | Nomet TECHNO 128 czarny mat | (234, 41); (362, 41) |
| B4 Drzwiczki narozne (zawiasy Blum 155 st. na boku B4, otw. w lewo, chowaja sie za drzwiami P1) 131x716 | Nomet TECHNO 128 czarny mat | (91, 528); (91, 656) |
| P1 Drzwi (zawiasy Blum 155 st. od szuflad, otw. w prawo, otwierasz PIERWSZE) 367x716 | Nomet TECHNO 128 czarny mat | (40, 528); (40, 656) |
| P2 Szuflada dolna (E + galeria) 596x320 | Nomet TECHNO 320 czarny mat | (138, 270); (458, 270) |
| P2 Szuflada srodkowa (K) 596x250 | Nomet TECHNO 320 czarny mat | (138, 200); (458, 200) |
| P2 Szuflada gorna (M, sztucce) 596x140 | Nomet TECHNO 320 czarny mat | (138, 90); (458, 90) |
| P3 Szuflada dolna (E + galeria) 496x320 | Nomet TECHNO 320 czarny mat | (88, 270); (408, 270) |
| P3 Szuflada srodkowa (K) 496x250 | Nomet TECHNO 320 czarny mat | (88, 200); (408, 200) |
| P3 Szuflada gorna (M, sztucce) 496x140 | Nomet TECHNO 320 czarny mat | (88, 90); (408, 90) |
| G2 Drzwi (zawiasy L) 446x896 | Nomet TECHNO 128 czarny mat | (406, 60); (406, 188) |
| G3 Drzwi (zawiasy L) 596x896 | Nomet TECHNO 128 czarny mat | (556, 60); (556, 188) |
| G4 Drzwi (zawiasy P) 596x896 | Nomet TECHNO 128 czarny mat | (40, 60); (40, 188) |
| Z1 Drzwi L 365x716 | Nomet TECHNO 128 czarny mat | (40, 528); (40, 656) |
| Z1 Drzwi P 364x716 | Nomet TECHNO 128 czarny mat | (324, 528); (324, 656) |
| L6 Drzwi nadstawki 610x374 | Nomet TECHNO 128 czarny mat | (570, 60); (570, 188) |

**Camar 801 hangers – 2 dowel holes Ø10 × 10.5 in the inner face, top back corner (u = placeholder, VERIFY)**

| Side panel | Dowel axis below panel top | v from panel bottom |
|---|---|---|
| G2 Bok L 900x332 | 60 | 840 |
| G2 Bok P 900x332 | 60 | 840 |
| G3 Bok L 900x332 | 60 | 840 |
| G3 Bok P 900x332 | 60 | 840 |
| G4 Bok L 900x332 | 60 | 840 |
| G4 Bok P 900x332 | 60 | 840 |

### Alcove wardrobe (alcove-wardrobe)

**Doors and hinges**

| Door | Hinges on | Hinge | Overlay → B | Cup centre from hinge edge | Hinge centres from door bottom | Plates on panel | Plate centres from panel bottom (setback) | Notes |
|---|---|---|---|---|---|---|---|---|
| S1 Drzwi (zawiasy L) 396x1796 | L | 71B3550 | 16 → 5 | 22.5 | 100, 632, 1164, 1696 | S1 Schowek Bok L 1782x560 | 84, 616, 1148, 1680 (37) |  |
| S2 Drzwi lewe (zawiasy L) 361x1796 | L | 71B3550 | 16 → 5 | 22.5 | 100, 632, 1164, 1696 | S2 Kurtki Bok L 1782x560 | 84, 616, 1148, 1680 (37) |  |
| S2 Drzwi prawe (zawiasy P) 361x1796 | P | 71B3550 | 16 → 5 | 22.5 | 100, 632, 1164, 1696 | S2 Kurtki Bok P 1782x560 | 84, 616, 1148, 1680 (37) |  |
| P Drzwi nad schowkiem (zawiasy L) 396x426 | L | 71B3550 | 16 → 5 | 22.5 | 100, 326 | P Pawlacz Bok L 430x560 | 102, 328 (37) |  |
| P Drzwi lewe nad kurtkami (zawiasy L) 361x426 | L | 71B3550 | 16 → 5 | 22.5 | 100, 326 | P Pawlacz Przegroda P 394x560 (nad bokiem S2, zawiasy drzwi lewych) | 84, 310 (37) |  |
| P Drzwi prawe nad kurtkami (zawiasy P) 361x426 | P | 71B3550 | 16 → 5 | 22.5 | 100, 326 | P Pawlacz Bok P 430x560 | 102, 328 (37) |  |

**Shelves**

| Shelf | Mounting | Holes in both end panels: u from front edge / v from panel bottom |
|---|---|---|
| S1 Schowek Polka 364x540 | pins Ø5×10 | u 57, 523 / v 1197.5 — in S1 Schowek Bok L 1782x560, S1 Schowek Bok P 1782x560 |
| S1 Schowek Polka 364x540 | pins Ø5×10 | u 57, 523 / v 1479.5 — in S1 Schowek Bok L 1782x560, S1 Schowek Bok P 1782x560 |
| S2 Kurtki Polka 694x540 | pins Ø5×10 | u 57, 523 / v 179.5 — in S2 Kurtki Bok L 1782x560, S2 Kurtki Bok P 1782x560 |
| S2 Kurtki Polka 694x540 | pins Ø5×10 | u 57, 523 / v 379.5 — in S2 Kurtki Bok L 1782x560, S2 Kurtki Bok P 1782x560 |

**TIP-ON 956A1006 – bore Ø10 × 76 into the FRONT EDGE of the panel, centre 7.5 mm from its inner face**

| Door | Panel | Position |
|---|---|---|
| S1 Drzwi (zawiasy L) 396x1796 | S1 Schowek Bok P 1782x560 | v 613 from panel bottom |
| S1 Drzwi (zawiasy L) 396x1796 | S1 Schowek Bok P 1782x560 | v 1151 from panel bottom |
| S2 Drzwi lewe (zawiasy L) 361x1796 | S2 Kurtki Wieniec gorny (miedzy bokami) 694x560 | u 285 from panel left end |
| S2 Drzwi lewe (zawiasy L) 361x1796 | S2 Kurtki Wieniec dolny (pod bokami) 730x560 | u 303 from panel left end |
| S2 Drzwi prawe (zawiasy P) 361x1796 | S2 Kurtki Wieniec gorny (miedzy bokami) 694x560 | u 409 from panel left end |
| S2 Drzwi prawe (zawiasy P) 361x1796 | S2 Kurtki Wieniec dolny (pod bokami) 730x560 | u 427 from panel left end |
| P Drzwi nad schowkiem (zawiasy L) 396x426 | P Pawlacz Przegroda L 394x560 (nad bokiem S1) | v 84 from panel bottom |
| P Drzwi lewe nad kurtkami (zawiasy L) 361x426 | P Pawlacz Wieniec gorny (miedzy bokami) 1094x560 | u 685 from panel left end |
| P Drzwi prawe nad kurtkami (zawiasy P) 361x426 | P Pawlacz Wieniec gorny (miedzy bokami) 1094x560 | u 809 from panel left end |

### Bathroom (bathroom)

**Doors and hinges**

| Door | Hinges on | Hinge | Overlay → B | Cup centre from hinge edge | Hinge centres from door bottom | Plates on panel | Plate centres from panel bottom (setback) | Notes |
|---|---|---|---|---|---|---|---|---|
| R1 Drzwi (zawiasy P) 417x1112 | P | 71B3550 | 16 → 5 | 22.5 | 100, 593, 1012 | R1 Bok L 1098x170 | 84, 577, 996 (37) | hinge 2 moved 556→593 (clear of R1 Polka 385x150) |
| U1 Drzwi prawe (zawiasy P) 318x1167 | P | 71B3550 | 16 → 5 | 22.5 | 100, 584, 1067 | U1 Bok L 1171x170 | 102, 586, 1069 (37) |  |
| U1 Drzwi lewe (zawiasy L) 318x1167 | L | 71B3550 | 16 → 5 | 22.5 | 100, 584, 1067 | U1 Bok P 1171x170 | 102, 586, 1069 (37) |  |
| U2 Drzwi (zawiasy P) 417x1167 | P | 71B3550 | 16 → 5 | 22.5 | 100, 620, 1067 | U2 Bok L 1171x170 | 102, 622, 1069 (37) | hinge 2 moved 583.5→620.5 (clear of U2 Polka 385x150) |

**Shelves**

| Shelf | Mounting | Holes in both end panels: u from front edge / v from panel bottom |
|---|---|---|
| R1 Polka 385x150 | pins Ø5×10 | u 57, 133 / v 253.5 — in R1 Bok L 1098x170, R1 Bok P 1098x170 |
| R1 Polka 385x150 | pins Ø5×10 | u 57, 133 / v 528.5 — in R1 Bok L 1098x170, R1 Bok P 1098x170 |
| R1 Polka 385x150 | pins Ø5×10 | u 57, 133 / v 802.5 — in R1 Bok L 1098x170, R1 Bok P 1098x170 |
| U1 Polka 607x150 | pins Ø5×10 | u 57, 133 / v 417.5 — in U1 Bok L 1171x170, U1 Bok P 1171x170 |
| U1 Polka 607x150 | pins Ø5×10 | u 57, 133 / v 657.5 — in U1 Bok L 1171x170, U1 Bok P 1171x170 |
| U1 Polka 607x150 | pins Ø5×10 | u 57, 133 / v 897.5 — in U1 Bok L 1171x170, U1 Bok P 1171x170 |
| U2 Polka 385x150 | pins Ø5×10 | u 57, 133 / v 285.5 — in U2 Bok L 1171x170, U2 Bok P 1171x170 |
| U2 Polka 385x150 | pins Ø5×10 | u 57, 133 / v 573.5 — in U2 Bok L 1171x170, U2 Bok P 1171x170 |
| U2 Polka 385x150 | pins Ø5×10 | u 57, 133 / v 862.5 — in U2 Bok L 1171x170, U2 Bok P 1171x170 |

**TIP-ON 956A1006 – bore Ø10 × 76 into the FRONT EDGE of the panel, centre 7.5 mm from its inner face**

| Door | Panel | Position |
|---|---|---|
| R1 Drzwi (zawiasy P) 417x1112 | R1 Bok P 1098x170 | v 996 from panel bottom |
| U1 Drzwi prawe (zawiasy P) 318x1167 | U1 Wieniec gorny 607x170 | u 365 from panel left end |
| U1 Drzwi lewe (zawiasy L) 318x1167 | U1 Wieniec gorny 607x170 | u 242 from panel left end |
| U2 Drzwi (zawiasy P) 417x1167 | U2 Bok P 1171x170 | v 586 from panel bottom |

### Fuse-box cabinet (fuse-box-cabinet)

**Doors and hinges**

| Door | Hinges on | Hinge | Overlay → B | Cup centre from hinge edge | Hinge centres from door bottom | Plates on panel | Plate centres from panel bottom (setback) | Notes |
|---|---|---|---|---|---|---|---|---|
| Drzwi gorne 446x528 (zawiasy L, 2 szt.) | L | 71B3550 | 16 → 5 | 22.5 | 100, 428 | Bok L 2196x122 (zawiasy) | 1784, 2112 (37) |  |
| Drzwi dolne 446x1696 (zawiasy L, 4 szt.) | L | 71B3550 | 16 → 5 | 22.5 | 100, 599, 1097, 1596 | Bok L 2196x122 (zawiasy) | 84, 583, 1081, 1580 (37) |  |

**Shelves**

| Shelf | Mounting | Holes in both end panels: u from front edge / v from panel bottom |
|---|---|---|
| Przegroda pod rozdzielnia 414x122 | pins Ø5×10 | u 37, 85 / v 1670.5 — in Bok L 2196x122, Bok P 2196x122 |
| Polka 3 nad gniazdkiem 414x122 | pins Ø5×10 | u 37, 85 / v 1329.5 — in Bok L 2196x122, Bok P 2196x122 |
| Polka 2 pod gniazdkiem 414x122 | pins Ø5×10 | u 37, 85 / v 829.5 — in Bok L 2196x122, Bok P 2196x122 |
| Polka 1 dolna 414x122 | pins Ø5×10 | u 37, 85 / v 379.5 — in Bok L 2196x122, Bok P 2196x122 |

**TIP-ON 956A1006 – bore Ø10 × 76 into the FRONT EDGE of the panel, centre 7.5 mm from its inner face**

| Door | Panel | Position |
|---|---|---|
| Drzwi gorne 446x528 (zawiasy L, 2 szt.) | Bok P 2196x122 | v 1784 from panel bottom |
| Drzwi dolne 446x1696 (zawiasy L, 4 szt.) | Bok P 2196x122 | v 578 from panel bottom |
| Drzwi dolne 446x1696 (zawiasy L, 4 szt.) | Bok P 2196x122 | v 1086 from panel bottom |

### Nightstands (nightstands)

**Doors and hinges**

| Door | Hinges on | Hinge | Overlay → B | Cup centre from hinge edge | Hinge centres from door bottom | Plates on panel | Plate centres from panel bottom (setback) | Notes |
|---|---|---|---|---|---|---|---|---|
| N1 lewa Drzwiczki 226x228 | L | 71B3550 | 16 → 5 | 22.5 | 50, 178 | N1 lewa Bok L 514x282 | 352, 480 (37) |  |
| N2 prawa Drzwiczki 226x228 | P | 71B3550 | 16 → 5 | 22.5 | 50, 178 | N2 prawa Bok P 514x282 | 352, 480 (37) |  |

**Shelves**

| Shelf | Mounting | Holes in both end panels: u from front edge / v from panel bottom |
|---|---|---|
| N1 lewa Polka 194x282 | screws Spax 4×50 from outside, Ø4 + countersink | u 40, 242 / v 309 — in N1 lewa Bok L 514x282, N1 lewa Bok P 514x282 |
| N2 prawa Polka 194x282 | screws Spax 4×50 from outside, Ø4 + countersink | u 40, 242 / v 309 — in N2 prawa Bok L 514x282, N2 prawa Bok P 514x282 |

**TIP-ON 956A1006 – bore Ø10 × 76 into the FRONT EDGE of the panel, centre 7.5 mm from its inner face**

| Door | Panel | Position |
|---|---|---|
| N1 lewa Drzwiczki 226x228 | N1 lewa Bok P 514x282 | v 430 from panel bottom |
| N2 prawa Drzwiczki 226x228 | N2 prawa Bok L 514x282 | v 430 from panel bottom |

### TV cabinet, variant B (tv-cabinet)

**Doors and hinges**

| Door | Hinges on | Hinge | Overlay → B | Cup centre from hinge edge | Hinge centres from door bottom | Plates on panel | Plate centres from panel bottom (setback) | Notes |
|---|---|---|---|---|---|---|---|---|
| RTV K1 Drzwi (zawiasy L) 324x330 | L | 71B3550 | 16 → 5 | 22.5 | 73, 257 | RTV K1 Bok L 332x282 | 73, 257 (37) |  |
| RTV K2 Drzwi srodkowe (zawiasy L, otwierane na bok) 404x330 | L | 71B3550 | 16 → 5 | 22.5 | 73, 257 | RTV K2 Bok L 332x282 | 73, 257 (37) |  |
| RTV K3 Drzwi (zawiasy P) 324x330 | P | 71B3550 | 16 → 5 | 22.5 | 73, 257 | RTV K3 Bok P 332x282 | 73, 257 (37) |  |

**Shelves**

| Shelf | Mounting | Holes in both end panels: u from front edge / v from panel bottom |
|---|---|---|
| RTV K1 Polka 290x262 | pins Ø5×10 | u 57, 245 / v 154.5 — in RTV K1 Bok L 332x282, RTV K1 Bok P 332x282 |
| RTV K3 Polka 290x262 | pins Ø5×10 | u 57, 245 / v 154.5 — in RTV K3 Bok L 332x282, RTV K3 Bok P 332x282 |

**TIP-ON 956A1006 – bore Ø10 × 76 into the FRONT EDGE of the panel, centre 7.5 mm from its inner face**

| Door | Panel | Position |
|---|---|---|
| RTV K1 Drzwi (zawiasy L) 324x330 | RTV K1 Bok P 332x282 | v 230 from panel bottom |
| RTV K2 Drzwi srodkowe (zawiasy L, otwierane na bok) 404x330 | RTV K2 Bok P 332x282 | v 230 from panel bottom |
| RTV K3 Drzwi (zawiasy P) 324x330 | RTV K3 Bok L 332x282 | v 230 from panel bottom |