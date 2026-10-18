import type { LayerId } from '../model/schema';
export type V3 = [number, number, number];
export interface Item { id: string; unit: string; layer: LayerId; center: V3 }
const FIXED: LayerId[] = ['room', 'appliances'];
const avg = (pts: V3[]): V3 => [0, 1, 2].map((i) => pts.reduce((a, p) => a + p[i]!, 0) / Math.max(pts.length, 1)) as V3;

export function explodeOffsets(items: Item[], s: number, kPart = 0.8, kUnit = 0.5): Map<string, V3> {
  const moving = items.filter((i) => !FIXED.includes(i.layer));
  const C = avg(moving.map((i) => i.center));
  const byUnit = new Map<string, V3[]>();
  for (const i of moving) byUnit.set(i.unit, [...(byUnit.get(i.unit) ?? []), i.center]);
  const U = new Map([...byUnit].map(([u, pts]) => [u, avg(pts)]));
  const out = new Map<string, V3>();
  for (const i of items) {
    if (FIXED.includes(i.layer) || s === 0) { out.set(i.id, [0, 0, 0]); continue; }
    const u = U.get(i.unit)!;
    out.set(i.id, [0, 1, 2].map((k) => (i.center[k]! - u[k]!) * kPart * s + (u[k]! - C[k]!) * kUnit * s) as V3);
  }
  return out;
}
