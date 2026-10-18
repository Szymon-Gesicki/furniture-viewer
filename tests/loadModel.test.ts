import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ModelSchema } from '../src/model/schema';
import { buildModel } from '../src/viewer/loadModel';

const kuchnia = ModelSchema.parse(JSON.parse(readFileSync('projects/kitchen/model.json', 'utf8')));

it('every part has a mesh with part in userData and a centre for exploding', () => {
  const b = buildModel(kuchnia);
  expect(b.partsById.size).toBe(kuchnia.parts.length);
  expect(b.items.length).toBe(kuchnia.parts.length);
  const p = kuchnia.parts[0]!;
  expect(b.partsById.get(p.id)!.userData.part).toBe(p);
});
it('wall materials are not shared with furniture', () => {
  const b = buildModel(kuchnia);
  for (const m of b.partsById.values()) {
    const isWall = m.userData.part.layer === 'room';
    expect(b.wallMaterials.includes(m.material as any)).toBe(isWall);
  }
});
it('minZ is the lowest point of the model', () => {
  const b = buildModel(kuchnia);
  const zs = b.items.map((i) => i.center[2]);
  expect(b.minZ).toBeLessThanOrEqual(Math.min(...zs));
});
it('the same material on a wall and on furniture gives two separate three materials', () => {
  const box = { type: 'box' as const, min: [0, 0, 0] as [number, number, number], max: [10, 10, 10] as [number, number, number] };
  const m = ModelSchema.parse({ format: 'furniture-model', version: 1, id: 't', name: 'T',
    materials: { white: { label: 'White', color: '#ffffff' } }, groups: [],
    parts: [
      { id: 'a', name: 'Side', group: null, unit: 'k', layer: 'carcass', material: 'white', shape: box },
      { id: 'b', name: 'Wall', group: null, unit: 'room', layer: 'room', material: 'white', shape: box },
    ] });
  const b = buildModel(m);
  expect(b.partsById.get('a')!.material).not.toBe(b.partsById.get('b')!.material);
  expect(b.wallMaterials).toEqual([b.partsById.get('b')!.material]);
});

it('setPartLayer moves a part: layer, material shared with the new layer, lines, items', () => {
  const box = { type: 'box' as const, min: [0, 0, 0] as [number, number, number], max: [10, 10, 10] as [number, number, number] };
  const m = ModelSchema.parse({ format: 'furniture-model', version: 1, id: 't', name: 'T',
    materials: { white: { label: 'White', color: '#ffffff' } }, groups: [],
    parts: [
      { id: 'a', name: 'Side', group: null, unit: 'k', layer: 'carcass', material: 'white', shape: box },
      { id: 'b', name: 'Door', group: null, unit: 'k', layer: 'front', material: 'white', shape: box },
    ] });
  const b = buildModel(m);
  b.setPartLayer('a', 'front');
  const a = b.partsById.get('a')!, d = b.partsById.get('b')!;
  expect(a.userData.part.layer).toBe('front');
  expect(m.parts[0]!.layer).toBe('front');
  expect(a.material).toBe(d.material);
  expect((a.children[0] as any).material).toBe((d.children[0] as any).material);
  expect(b.items.find((i) => i.id === 'a')!.layer).toBe('front');
  b.setPartLayer('a', 'room');
  expect(b.wallMaterials).toContain(a.material);
  expect(() => b.setPartLayer('nie-ma', 'front')).not.toThrow();
});
