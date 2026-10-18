import { LAYERS, type LayerId, type Model, type Part } from '../model/schema';
import { explodeOffsets, type Item, type V3 } from './explode';
import { partRole } from '../model/codes';
import { partDims } from '../ui/format';

export interface UnitSummary { unit: string; name: string; count: number; layers: { id: LayerId; label: string; count: number }[] }

export const unitName = (model: Pick<Model, 'groups'>, unit: string) =>
  model.groups.find((g) => g.id === unit)?.name ?? unit;

// a cabinet made only of walls/floors – it cannot be selected
export function isRoomUnit(parts: Pick<Part, 'unit' | 'layer'>[], unit: string): boolean {
  const own = parts.filter((p) => p.unit === unit);
  return own.length > 0 && own.every((p) => p.layer === 'room');
}

export function unitSummary(model: Pick<Model, 'groups' | 'parts'>, unit: string): UnitSummary {
  const own = model.parts.filter((p) => p.unit === unit);
  const layers = LAYERS.map((l) => ({ id: l.id as LayerId, label: l.label, count: own.filter((p) => p.layer === l.id).length }))
    .filter((l) => l.count > 0);
  return { unit, name: unitName(model, unit), count: own.length, layers };
}

// unit = null: explode the whole project; otherwise only the cabinet's parts (the rest stays put)
export function explodeTargets(items: Item[], unit: string | null, s: number): Map<string, V3> {
  if (unit === null) return explodeOffsets(items, s);
  const out = new Map<string, V3>(items.map((i) => [i.id, [0, 0, 0] as V3]));
  for (const [id, v] of explodeOffsets(items.filter((i) => i.unit === unit), s)) out.set(id, v);
  return out;
}

export interface UnitPartGroup { id: LayerId; label: string; parts: { id: string; code: string | null; label: string }[] }

// cabinet part list for the panel: groups by layer (LAYERS order), each row = role + dimensions
export function unitParts(model: Pick<Model, 'groups' | 'parts'>, unit: string): UnitPartGroup[] {
  const own = model.parts.filter((p) => p.unit === unit);
  return LAYERS.map((l) => ({
    id: l.id as LayerId,
    label: l.label,
    parts: own.filter((p) => p.layer === l.id).map((p) => ({
      id: p.id,
      code: typeof p.meta.code === 'string' ? p.meta.code : null,
      label: [partRole(model, p), partDims(p.shape).replace(/ mm$/, '')].filter((x) => x && x !== '—').join(' · '),
    })),
  })).filter((g) => g.parts.length > 0);
}
