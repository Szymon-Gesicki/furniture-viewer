import { z } from 'zod';

export const LAYERS = [
  { id: 'carcass', label: 'Carcasses' },
  { id: 'back', label: 'Back panels (HDF)' },
  { id: 'front', label: 'Fronts' },
  { id: 'handles', label: 'Handles' },
  { id: 'drawers', label: 'Drawer boxes' },
  { id: 'fillers', label: 'Fillers and plinths' },
  { id: 'cladding', label: 'Cladding and casings' },
  { id: 'worktop', label: 'Worktop' },
  { id: 'legs', label: 'Legs and clips' },
  { id: 'assembly', label: 'Battens, blocks, markers' },
  { id: 'appliances', label: 'Appliances and services' },
  { id: 'room', label: 'Room' },
] as const;
export const LAYER_IDS = LAYERS.map((l) => l.id);
export type LayerId = (typeof LAYERS)[number]['id'];
export const LayerSchema = z.enum(LAYER_IDS as [LayerId, ...LayerId[]]);

const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
const Box = z.object({ type: z.literal('box'), min: Vec3, max: Vec3 });
const Extrude = z.object({
  type: z.literal('extrude'),
  plane: z.enum(['xy', 'yz', 'xz']),
  outline: z.array(z.tuple([z.number(), z.number()])).min(3),
  from: z.number(), to: z.number(),
});
const Mesh = z.object({ type: z.literal('mesh'), positions: z.array(z.number()) });
export const ShapeSchema = z.discriminatedUnion('type', [Box, Extrude, Mesh]);

export const PartSchema = z.object({
  id: z.string(),
  name: z.string(),
  group: z.string().nullable(),
  unit: z.string(),
  layer: LayerSchema,
  material: z.string(),
  shape: ShapeSchema,
  edges: z.object({ raw: z.array(z.string()) }).default({ raw: [] }),
  meta: z.record(z.unknown()).default({}),
});

export const ModelSchema = z.object({
  format: z.literal('furniture-model'),
  version: z.literal(1),
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  source: z.string().default(''),
  materials: z.record(z.object({ label: z.string(), color: z.string().regex(/^#[0-9a-f]{6}$/i) })),
  groups: z.array(z.object({ id: z.string(), name: z.string(), parent: z.string().nullable() })),
  parts: z.array(PartSchema),
  codes: z.object({ prefix: z.string().min(1), next: z.number().int().positive() }).optional(),   // part code counter
});

export type Model = z.infer<typeof ModelSchema>;
export type Part = z.infer<typeof PartSchema>;
export type Shape = z.infer<typeof ShapeSchema>;
