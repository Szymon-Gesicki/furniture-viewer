// Blum / hardware parameters (SPEC section 4, HARDWARE.md) – change values here only
export const DRILL_PARAMS = {
  hinge: {
    overlay_formula: 'B = overlay - 11 (CLIP top 110 deg 71B3550 and 155 deg 71B7550, 0 mm plate)',
    B_minus: 11,                                       // B = overlay − 11
    cup_dia: 35, cup_depth: 13, cup_edge_offset: 17.5, // cup centre = B + 17.5 from the hinge edge
    screw_spacing: 45, screw_offset: 9.5, screw_dia: 2.5, screw_depth: 10,
    plate_setback: 37, plate_screw_spacing: 32, plate_screw_dia: 2.5, plate_screw_depth: 10,
    inset_extra_setback: 18 + 1.5,                     // Blum: set back the plate by door thickness + 1.5
    inset_B: 5,                                        // placeholder (HARDWARE.md 1 – check the 71B3750 leaflet)
    plate_half_height: 25, edge_dist_tall: 100, edge_dist_small_factor: 0.22, edge_dist_min: 45,
    clash_below: 8, clash_above: 3, cup_min_from_door_edge: 8,
    flap_edge_dist: 100,
    count: [[900, 2], [1600, 3], [2000, 4], [2400, 5]] as [number, number][],
    B_range: { '71B3550': [3, 7], '71B7550': [3, 8] } as Record<string, [number, number]>,
  },
  shelf: {
    pin_dia: 5, pin_depth: 10, pin_from_edge: 37, pin_below_shelf: 2.5,
    screw_dia: 4, screw_depth: 18, screw_from_edge: 40, screw_middle_if_deeper: 300,
    extra_rows: [32, -32, 64, -64],
  },
  drawer: {
    FA_side: 16, FA_bottom: 16, front_hole_x: 20.5, front_hole_z1: 33.5, front_hole_pitch: 32,
    front_hole_dia: 10, front_hole_depth: 12, stab_below_first: 15, stab_pitch: 32,
    top_fixing_above: 128,                             // ZF4.50I2: 128 above the upper lower-fixing hole (E with gallery)
    runner_screws_from_front: [19, 37, 69, 261, 293], runner_screw_dia: 2.5, runner_screw_depth: 10,
    runner_screw_above_runner_bottom: 6,               // placeholder – set by the runner holes
    nominal_length: 500,
    bottom_minus: 51, bottom_depth: 474, back_height: { M: 83, K: 121, E: 184 } as Record<string, number>,
  },
  handle: {
    dia: 5, depth: 18, drawer_from_top: 50, door_from_opening_edge: 40, door_end_hole_from_edge: 60, wall_unit_above: 1200,
    long: { code: 'C-1149-320.P61', name: 'Nomet TECHNO 320 czarny mat', cc: 320 },
    short: { code: 'C-1149-128.P61 (verify code)', name: 'Nomet TECHNO 128 czarny mat', cc: 128 },
  },
  tipon: {
    code: '956A1006', bore_dia: 10, bore_depth: 76, from_inner_face: 7.5, from_opening_edge_on_panel: 60,
    two_units_above: 1500, wall_unit_above: 1200, base_unit_below: 1300, from_door_end: 100,
  },
  camar801: {
    dowel_dia: 10, dowel_depth: 10.5, below_top_panel_underside: 42,
    first_dowel_from_back_edge: 20, dowel_spacing: 32,   // placeholders – measure the hanger
  },
  jig: { cup_from_edge: 22.5 },                        // SPEC 4.11: Wolfcraft 4656000 template stop → cup centre
  // shelves fixed by name (SPEC 4.8, confirmed in 7.3): oven shelf and nightstand shelves
  fixedShelves: /pod piekarnik|N\d (lewa|prawa) Polka/,
};
export type DrillParams = typeof DRILL_PARAMS;

// values the user measures on the real hardware (HARDWARE.md "placeholder"); editable, saved in drilling.json → params
export const PLACEHOLDER_PARAMS: { group: 'camar801' | 'drawer' | 'hinge' | 'jig'; key: string; label: string }[] = [
  { group: 'camar801', key: 'first_dowel_from_back_edge', label: 'Camar 801: first dowel from the back edge' },
  { group: 'camar801', key: 'dowel_spacing', label: 'Camar 801: dowel spacing (along the depth)' },
  { group: 'drawer', key: 'runner_screw_above_runner_bottom', label: 'MERIVOBOX: runner screw height above the runner line' },
  { group: 'hinge', key: 'inset_B', label: '71B3750 inset: boring distance B' },
  { group: 'jig', key: 'cup_from_edge', label: 'Wolfcraft template: cup centre from the door edge' },
];

// defaults + numeric overrides from drilling.json (unknown keys ignored)
export function mergeParams(over: Record<string, Record<string, number>> = {}): DrillParams {
  const out = { ...DRILL_PARAMS } as Record<string, unknown>;
  for (const [g, vals] of Object.entries(over)) {
    const base = out[g];
    if (!base || typeof base !== 'object' || base instanceof RegExp) continue;
    const next = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(vals)) if (typeof next[k] === 'number' && Number.isFinite(v)) next[k] = v;
    out[g] = next;
  }
  return out as DrillParams;
}
