import { z } from 'zod';

const Vec3 = z.tuple([z.number(), z.number(), z.number()]);

export const DRILL_KINDS = [
  { id: 'hinge-cup', label: 'Hinge cups', color: '#c0392b' },
  { id: 'hinge-screw', label: 'Hinge screws', color: '#e67e22' },
  { id: 'plate-screw', label: 'Mounting plates', color: '#8e44ad' },
  { id: 'runner-screw', label: 'Runner screws', color: '#2471a3' },
  { id: 'runner-line', label: 'Runner lines', color: '#2471a3' },
  { id: 'front-fixing', label: 'INSERTA fixings', color: '#16a085' },
  { id: 'front-fixing-top', label: 'INSERTA upper (gallery)', color: '#0e6655' },
  { id: 'front-stabiliser', label: 'Front stabilisers', color: '#1abc9c' },
  { id: 'shelf-pin', label: 'Shelf pins', color: '#b7950b' },
  { id: 'shelf-screw', label: 'Fixed shelf screws', color: '#7d6608' },
  { id: 'handle-hole', label: 'Handle holes', color: '#212f3d' },
  { id: 'tipon-bore', label: 'TIP-ON bores', color: '#566573' },
  { id: 'hanger-dowel', label: 'Camar 801 dowels', color: '#a04000' },
] as const;
export type DrillKindId = (typeof DRILL_KINDS)[number]['id'];
export const DrillKind = z.enum(DRILL_KINDS.map((k) => k.id) as [DrillKindId, ...DrillKindId[]]);

export const DrillFeature = z.object({
  id: z.string(), cabinet: z.string(), kind: DrillKind, hardware: z.string(),
  part: z.object({ id: z.string(), name: z.string() }),
  face: z.string(),                                   // 'x+' | 'y-' … outward normal of the entry face
  world: z.object({ p: Vec3, dir: Vec3 }),            // p = centre on the entry face, dir = into the material
  local: z.object({ u: z.number(), v: z.number(), u_from: z.string(), v_from: z.string(), face: z.string(),
                    runner_line_v: z.number().optional() }),
  dia: z.number(), depth: z.number(), note: z.string().default(''), verify: z.boolean().default(false),
  unit: z.string().default(''),                       // model unit of the part that caused the hole (door, shelf …)
  optional: z.boolean().default(false),               // extra shelf-pin rows (±32 / ±64)
  item: z.string().default(''),                       // hardware-catalog item id
  status: z.enum(['verified', 'standard', 'placeholder']).default('standard'),
  line: z.object({ to: Vec3 }).optional(),            // runner-line: segment p → to on the panel face
});
export type DrillFeature = z.infer<typeof DrillFeature>;

// projects/<id>/drilling.json – per-project exceptions (SPEC 6.3), keys = full part names
export const DrillOverridesSchema = z.object({
  hingeSide: z.record(z.enum(['L', 'P'])).default({}),
  shelfMode: z.record(z.enum(['fixed', 'adjustable'])).default({}),
  hingeZ: z.record(z.array(z.number()).min(1)).default({}),   // hinge centres from the door bottom
  extraShelfRows: z.boolean().optional(),                    // unset: on in the sheet, off in the 3D view
  // which hardware rules apply: kitchen = TECHNO handles + Camar 801 hangers, elsewhere TIP-ON on every door
  rules: z.object({ handles: z.enum(['techno', 'none']).default('none'), camar801: z.string().default('') }).optional(),
  params: z.record(z.record(z.number())).default({}),       // measured placeholder values, e.g. camar801.dowel_spacing
  notes: z.record(z.string()).default({}),                  // montage notes per catalogue item (user text)
  partNotes: z.record(z.string()).default({}),              // free note per board (by part code)
  done: z.record(z.boolean()).default({}),                  // assembly mode progress per step id
});
export type DrillOverrides = z.infer<typeof DrillOverridesSchema>;
export const emptyOverrides = (): DrillOverrides => ({ hingeSide: {}, shelfMode: {}, hingeZ: {}, params: {}, notes: {}, partNotes: {}, done: {} });

export interface PartRef { id: string; name: string }
export interface Moved { hinge: number; from: number; to: number; because: string }
export interface HingeRecord {
  cabinet: string; unit: string; door: PartRef; size: [number, number];
  hinge_side: string; hinge_side_reason: string; hardware: string; inset: boolean;
  side_panel: PartRef; overlay: number; B: number; cup_from_edge: number; plate_setback: number;
  hinges_from_door_bottom?: number[]; plates_from_side_bottom?: number[]; hinges_from_door_left?: number[];
  moved: Moved[];
}
export interface DrawerRecord {
  cabinet: string; unit: string; front: PartRef; type: string; front_size: [number, number];
  inner_width: number; overlays: [number, number]; runner_bottom_from_side_bottom: number[];
  runner_bottom_world_z: number; bottom_panel: [number, number]; back_panel: [number, number | null];
  side_panels: PartRef[];
}
export interface ShelfRecord {
  cabinet: string; unit: string; shelf: PartRef; fixed: boolean; mode_reason: string; z_bottom: number;
  holes: { panel: string; u: number; v: number }[];
}
export interface HandleRecord { front: string; handle: string; holes_uv: [number, number][] }
export interface TiponRecord { door: string; panel: string; v_from_panel_bottom?: number; v_from_door_bottom?: number; u_from_panel_left?: number }
export interface HangerRecord { panel: string; dowel_axis_below_top: number; v_from_bottom: number }
export interface DrillPlan {
  hinges: HingeRecord[]; drawers: DrawerRecord[]; shelves: ShelfRecord[]; handles: HandleRecord[];
  tipons: TiponRecord[]; hangers: HangerRecord[];
  warnings: { unit: string; text: string }[]; features: DrillFeature[];
}
