import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ModelSchema } from '../src/model/schema';
import { explodeTargets, isRoomUnit, unitName, unitSummary } from '../src/viewer/focus';
import type { Item } from '../src/viewer/explode';

const kuchnia = ModelSchema.parse(JSON.parse(readFileSync('projects/kitchen/model.json', 'utf8')));
const rtv = ModelSchema.parse(JSON.parse(readFileSync('projects/tv-cabinet/model.json', 'utf8')));

it('cabinet name from groups, or the code itself', () => {
  const g = kuchnia.groups.find((x) => x.name.startsWith('P2'))!;
  expect(unitName(kuchnia, g.id)).toBe(g.name);
  expect(unitName(rtv, 'RTV K1')).toBe('RTV K1');
});
it('room cabinet', () => {
  const pomiar = kuchnia.groups.find((g) => g.name === 'Kuchnia_pomiar')!.id;
  expect(isRoomUnit(kuchnia.parts, pomiar)).toBe(true);
  expect(isRoomUnit(rtv.parts, 'RTV K1')).toBe(false);
  expect(isRoomUnit(rtv.parts, 'nie-ma')).toBe(false);
});
it('cabinet summary: count and layers in LAYERS order', () => {
  const s = unitSummary(rtv, 'RTV K2');
  expect(s.count).toBe(rtv.parts.filter((p) => p.unit === 'RTV K2').length);
  expect(s.layers.map((l) => l.id)).toEqual(['carcass', 'back', 'front', 'legs']);
  expect(s.layers.reduce((a, l) => a + l.count, 0)).toBe(s.count);
});

const items: Item[] = [
  { id: 'a1', unit: 'A', layer: 'carcass', center: [0, 0, 0] },
  { id: 'a2', unit: 'A', layer: 'carcass', center: [100, 0, 0] },
  { id: 'b1', unit: 'B', layer: 'carcass', center: [1000, 0, 0] },
  { id: 'b2', unit: 'B', layer: 'carcass', center: [1200, 0, 0] },
];
it('exploding one cabinet does not move other parts nor push the cabinet from the project centre', () => {
  const t = explodeTargets(items, 'A', 1);
  expect(t.get('b1')).toEqual([0, 0, 0]);
  expect(t.get('b2')).toEqual([0, 0, 0]);
  expect(t.get('a1')![0]).toBeCloseTo(-40);
  expect(t.get('a2')![0]).toBeCloseTo(40);
});
it('no cabinet = explode the whole project', () => {
  const t = explodeTargets(items, null, 1);
  expect(t.get('b1')![0]).not.toBe(0);
});

import { unitParts } from '../src/viewer/focus';
import { assignCodes, emptyCodeBook } from '../src/model/codes';
it('unitParts: cabinet parts grouped by layer with codes', () => {
  const m = assignCodes(rtv, emptyCodeBook('tv-cabinet')).model;
  const g = unitParts(m, 'RTV K1');
  expect(g.map((x) => x.id)).toEqual(['carcass', 'back', 'front', 'legs']);
  const side = g[0]!.parts.find((p) => p.id === 'p0004')!;
  expect(side.code).toMatch(/^TVC-\d+$/);
  expect(side.label).toMatch(/ · 332 × 282 × 18$/);
  expect(g.find((x) => x.id === 'legs')!.parts[0]!.code).toBeNull();
  expect(g.reduce((a, x) => a + x.parts.length, 0)).toBe(m.parts.filter((p) => p.unit === 'RTV K1').length);
});
