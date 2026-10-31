// Assembly mode (PLAN 5b): one step per board × hardware item × face, in workshop order
import type { Model, Part } from '../model/schema';
import type { DrillFeature, DrillPlan } from './schema';

export interface Step { id: string; part: Part; code: string; face: string; faceLabel: string; item: string; features: DrillFeature[] }

// sides: shelf pins → plates → runners → Camar; doors: cups + hinge screws; drawer fronts: INSERTA → stabiliser → handle; TIP-ON last
const ITEM_ORDER = ['shelf-pin-5', 'fixed-shelf', 'blum-plate-173L6100', 'blum-merivobox-runner-NL500', 'camar-801',
  'blum-cliptop-71B3550', 'blum-inserta-ZF4.10I2', 'blum-inserta-ZF4.50I2', 'blum-stabiliser-Z96.10E1',
  'nomet-techno-320', 'nomet-techno-128', 'blum-tipon-956A1006'];

export const partCode = (p: Part) => (typeof p.meta.code === 'string' ? p.meta.code : p.id);

export function buildSteps(model: Model, plan: DrillPlan, unit: string): Step[] {
  const idx = new Map(model.parts.map((p, i) => [p.id, i]));
  const byId = new Map(model.parts.map((p) => [p.id, p]));
  const groups = new Map<string, Step>();
  for (const f of plan.features) {
    const part = byId.get(f.part.id);
    if (!part || (f.unit !== unit && part.unit !== unit) || f.optional) continue;
    const id = `${partCode(part)}|${f.item}|${f.face}`;
    const s = groups.get(id) ?? { id, part, code: partCode(part), face: f.face, faceLabel: f.local.face, item: f.item, features: [] };
    s.features.push(f);
    groups.set(id, s);
  }
  const rank = (s: Step) => [s.item === 'blum-tipon-956A1006' ? 2 : s.part.layer === 'front' ? 1 : 0, idx.get(s.part.id) ?? 0,
    ITEM_ORDER.indexOf(s.item) < 0 ? 99 : ITEM_ORDER.indexOf(s.item)];
  return [...groups.values()].sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    return ra[0]! - rb[0]! || ra[1]! - rb[1]! || ra[2]! - rb[2]!;
  });
}
