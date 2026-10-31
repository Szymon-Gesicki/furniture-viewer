# Hardware catalogue – exact drilling data (research)

Status: 2026-10-31 · all values in mm · machine-readable copy: `docs/drilling/hardware-catalog.json`

Every value has a **status**:

* **verified** – read directly from a manufacturer source (Blum E-SERVICES configuration, Blum catalogue, Häfele/Camar catalogue, shop technical sheet);
* **standard** – Blum/system-32 standard used across the industry, not printed on the pages we could read; safe, but the
  sheet must tell the user to check against the part (e.g. mark the screw holes through the hinge itself);
* **placeholder** – not published anywhere we found; the user measures the real part and edits the parameter. The viewer must
  show these holes with a **"verify"** badge and never hide that they are placeholders.

Conventions: `u` = along the board from the named reference edge, `v` = second direction from the second reference edge,
`face` = the face the drill enters. Drill direction = into the material, perpendicular to the face.

---

## 1. Blum CLIP top BLUMOTION hinges (screw-on)

Articles: **71B3550** (110°, overlay, 58 pcs incl. flap B3), **71B7550** (155°, zero protrusion, 6 pcs: kitchen B1, B4, P1),
**71B3750** (110°, **inset**, 2 pcs: kitchen L6). Caps 70T3504 (cup), 70.1503 (arm).

| Item | Value | Status | Source |
|---|---|---|---|
| Cup hole | Ø35, depth **13** (min.) | verified | Blum CLIP top BLUMOTION 110° tech sheet: "All 35 mm and 8 mm holes must be a minimum of 13 mm deep" |
| Boring distance B (door edge → cup edge) | **B = overlay − 11** with 0 mm plate (110°: overlay 14/15/16/17/18 for B 3/4/5/6/7) | verified | Blum CLIP top 110° overlay chart, plate H = 0 |
| B range | 3–7 (110°), 3–8 (155° zero protrusion) | verified | same charts |
| Cup centre from door edge | **B + 17.5** | derived | Ø35 / 2 |
| Cup screw holes | 2 holes, **45 apart** (±22.5 from cup centre along the edge), **9.5** further from the edge than the cup centre; pilot Ø2.5 × 10 | standard | Blum "45/9.5" boring pattern (shops list CLIP top screw-on hinges as "45 mm bore pattern"); **always mark through the hinge** |
| Hinge positions on the door | centres 100 from top/bottom (doors < 400 high: 22 % of height, min 45); count ≤900 → 2, ≤1600 → 3, ≤2000 → 4 | design rule | SPEC.md 4.3 |
| Min. reveal 18 mm door (110°) | 0.5–1.0 | verified | Blum chart (door 16–19 mm) |

Our doors: overlay 16 → **B 5 → cup centre 22.5**; exceptions: kitchen Z1 overlay 18 → B 7 → 24.5; B4 overlay 17 → B 6 → 23.5;
L6 inset → B and setback **placeholder** (check the 71B3750 leaflet).

## 2. Blum cruciform mounting plate 0 mm, screw-on – 173L6100

| Item | Value | Status | Source |
|---|---|---|---|
| Name | "Cruciform mounting plate – 37/32" | verified | Blum catalogue 2022 p. 147 |
| Screw holes | 2 holes on the line **37 from the front edge** of the side, **32 apart** (±16 from the hinge centre) | standard | system 32 ("37/32"); Blum page does not spell it out |
| Screws | chipboard Ø3.5 or Ø4, recommended length 17 (we use Blum 609.1500 3.5×15); pilot Ø2.5 × 10 | verified | Blum catalogue p. 147 |
| Plate height | 8.5 (0 mm version) | verified | p. 147 |
| Height adjustment | ±3 | verified | p. 147 |
| Inset door (L6) | line moved back by door thickness + 1.5 → **56.5** | verified rule / placeholder value | cabinetparts 71B3750 page: "Set back mounting plate … by door thickness + 1.5 mm" |

## 3. Blum MERIVOBOX NL 500, 40 kg (from Blum E-SERVICES configurations M / K / E with gallery)

| Item | Value | Status |
|---|---|---|
| Runner screws (chipboard **4 × 15**, we use Spax 4×16) | on the runner bottom line, **19, 37, 69, 261, 293** from the front edge of the side | verified (Blum drawing "Pozycje wkrętów pod prowadnice": reference 37, +32, −18, +224, +256) |
| Runner bottom line | front bottom edge + **16** (FA bottom); bottom drawer = top face of the bottom panel | verified (FA = 16 entered in the configurator) |
| Screw height above the runner line | defined by the runner holes – **placeholder 6** | placeholder (draw the line, screw through the runner) |
| INSERTA lower front fixing ZF4.10I2 | Ø10 (+0.2/−0.1) × **12**; **u 36.5** from each side edge of the front (20.5 + FA 16); **v 49.5 and 81.5** from the front bottom edge (FA 16 + 33.5, +32) | verified |
| INSERTA upper fixing ZF4.50I2 (gallery drawers E) | Ø10 × 12, u 36.5, **v 209.5** (128 above the upper lower hole) | verified (drawing "Wymiary wiercenia frontu INSERTA", gallery version) |
| Front stabiliser Z96.10E1 | 2 × Ø10 × 12 at the front centre ± 16, **v 34.5** (15 below the first INSERTA hole) | verified |
| Bottom / back (white 16) | bottom (inner width − 51) × **474**; back (inner width − 51) × **M 83 / K 121 / E 184** | verified |
| Bottom stabiliser position | 256 (note only, no hole) | verified |
| Min. inner depth | 503 | verified |
| Gap between fronts | 2.5 | verified |

## 4. Blum TIP-ON for doors with BLUMOTION – 956A1006 (long, with bumper)

21 units: bathroom R1, U1 ×2, U2 · fuse-box cabinet (top door 1, bottom door 2) · alcove wardrobe S1 ×2, S2 2 × 2, top box 3 ·
nightstands 2 · TV cabinet 3.

| Item | Value | Status | Source |
|---|---|---|---|
| Bore | **Ø10 × 76** | verified | Blum catalogue 2024 p. 192; Blum TIP-ON for doors leaflet |
| Where | bored into the **front edge** of the carcass panel at the opening side | verified | "can be either bored into the cabinet end panel or attached … using adapter plates" (Blum/Würth guide) |
| Bore centre from the panel's inner face | **7.5** | verified | Blum drilling template 65.5010 (catalogue 2024 p. 676) |
| Height | "exactly where the handle would be", tolerance **±300** in height | verified | Blum catalogue 2024 p. 192 |
| Doors > 1500 high | 2 units | design rule (Blum recommends 2 for tall doors) |
| Double doors meeting in the middle | unit in the top (and for tall doors also the bottom) panel, **60 from the opening edge** | design rule (Blum allows up to ¼ of the cabinet width) |
| Gap | factory 2, adjustable +4/−1 | verified |
| Catch plate | not needed (bumper version) | verified |

Default heights used in the fixtures: wall units 100 above the door bottom, base units 100 below the door top, tall doors
0.35 H and 0.65 H, otherwise H/2. All are inside Blum's ±300 window – the user may move them.

## 5. Camar 801 wall-cabinet hanger (kitchen G2, G3, G4 – 6 pcs) + wall rail

| Item | Value | Status | Source |
|---|---|---|---|
| Fixing | **2 dowels Ø10**, pressed in; holes Ø10 × **10.5** | verified (Ø10 Häfele catalogue "do wprasowania (kołki ø 10 mm)"; depth laserowo.com.pl template FAQ) |
| Height | dowel axis **42 below the underside of the top panel** → our cabinets: **60 below the cabinet top** | verified (laserowo.com.pl: "dystans 42mm od dołu górnego wieńca do osi otworu") |
| Distance of the first dowel from the back edge | **20** | **placeholder – measure the hanger** |
| Dowel spacing and direction | **32**, along the depth | **placeholder – measure the hanger** |
| Adjustment | 22 vertical, 19 depth | verified (Häfele catalogue) |
| Load | 200 kg / pair | verified (Häfele catalogue) |
| HDF (applied on the back) | notch at both top corners where the hook passes – size **placeholder** (trace the hook + 3) | placeholder |
| Rail | user's Kaprys-Met G 1 × 40, 2 m, cut to **1640** (outer left of G2 → outer right of G4) | user decision |
| Rail top edge height | **2319 − X** from the floor (X = cabinet top → hook bearing point, measured on the first cabinet) | placeholder |
| Rail plugs (Fischer 8×40 + 5×50) | **110, 250, 600, 800, 950, 1200, 1400, 1530** from the rail's left end (outside the hook zones 18–78, 372–432, 468–528, 972–1032, 1068–1128, 1572–1632) | design rule |

The rail is drawn on the wall in the room layer; its plugs are features of kind `wall-plug` on the room/wall (not on a board).

## 6. Nomet TECHNO handles, black matt (kitchen only, 17 pcs)

| Item | Value | Status | Source |
|---|---|---|---|
| TECHNO 320 – code **C-1149-320.P61** | hole spacing **320**, length 332, width 9, height 30 | verified | bivert24 product sheet |
| TECHNO 128 | hole spacing **128**, length 137 | verified (length option on the same page); code C-1149-128.P61 **to verify** |
| Holes | Ø5 through the 18 mm front, from the front with a backing board; screws M4 × 25 | standard |
| Drawers P2 / P3 and dishwasher B2 | TECHNO 320 horizontal, centred, hole line **50 below the front top edge** | design rule (user) |
| Doors | TECHNO 128 vertical, hole line **40 from the opening edge**; wall units (G2–G4, L6): lower hole **60** above the door bottom; base doors (B1, B4, P1, Z1): upper hole **60** below the door top | design rule |
| Flap B3 (82 high) | TECHNO 128 horizontal, centred, v = 41 | design rule |

## 7. Shelf pins (all cabinets) and fixed shelves

| Item | Value | Status |
|---|---|---|
| Pins | Ø5 × 10, 37 from the shelf front and back edges, centre 2.5 below the shelf underside | standard (system 32) |
| Extra adjustment rows | ±32, ±64 (optional) | standard |
| Fixed shelves (B3 oven shelf, nightstand shelves) | Spax 4×50 from outside, Ø4 through + countersink, at mid thickness, 40 from front/back (+ middle if depth > 300) | design rule |

## 8. What is still unknown (ask the user, keep `verify: true`)

1. Camar 801: first dowel distance from the back edge, dowel spacing and orientation; HDF notch size; X (hook bearing point).
2. 71B3750 inset hinge: boring distance B and plate setback for a 2 mm reveal.
3. TECHNO 128 article code.
4. MERIVOBOX runner screw height above the runner line.
