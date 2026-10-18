import { it, expect } from 'vitest';
import { explodeOffsets, type Item } from '../src/viewer/explode';
const items: Item[] = [
  { id: 'l', unit: 'A', layer: 'carcass', center: [0, 0, 0] },
  { id: 'r', unit: 'A', layer: 'carcass', center: [100, 0, 0] },
  { id: 'w', unit: 'room', layer: 'room', center: [500, 0, 0] },
];
it('s = 0 moves nothing', () => {
  for (const v of explodeOffsets(items, 0).values()) expect(v).toEqual([0, 0, 0]);
});
it('parts move apart in opposite directions, the room stays', () => {
  const o = explodeOffsets(items, 1);
  expect(o.get('l')![0]).toBeLessThan(0);
  expect(o.get('r')![0]).toBeGreaterThan(0);
  expect(o.get('w')).toEqual([0, 0, 0]);
});
