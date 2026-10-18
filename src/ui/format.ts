import type { Shape } from '../model/schema';
export function partDims(s: Shape): string {
  let d: number[];
  if (s.type === 'box') d = [0, 1, 2].map((i) => s.max[i]! - s.min[i]!);
  else if (s.type === 'extrude') {
    const us = s.outline.map((p) => p[0]), vs = s.outline.map((p) => p[1]);
    d = [Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs), s.to - s.from];
  } else return '—';
  return d.map((v) => Math.round(v)).sort((a, b) => b - a).join(' × ') + ' mm';
}
// in the models the front of the furniture faces −Y and the back +Y (as produced by the importer)
const SIDE: Record<string, string> = { 'z-': 'bottom', 'z+': 'top', 'y+': 'back', 'y-': 'front', 'x-': 'left', 'x+': 'right' };
export const rawEdgesLabel = (raw: string[]) =>
  raw.length === 0 ? 'all visible edges banded' : 'no banding: ' + raw.map((r) => SIDE[r] ?? r).join(', ');
export const partsCount = (n: number) => `${n} ${n === 1 ? 'part' : 'parts'}`;
