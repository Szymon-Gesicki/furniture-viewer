import { it, expect } from 'vitest';
import { BoxGeometry } from 'three';
import { readFileSync } from 'node:fs';
import { DEFAULT_EDGE_STYLE, EdgeMaterials, edgeColor, edgeLines } from '../src/viewer/edges';
import { ModelSchema } from '../src/model/schema';
import { buildModel } from '../src/viewer/loadModel';

const r3 = (v: number) => Math.round(v * 1000) / 1000;

it('default style 70 % and 2 px', () => expect(DEFAULT_EDGE_STYLE).toEqual({ contrast: 70, width: 2 }));
it('edgeColor: 0 → 0.6 · colour, 100 → black, out of range clamped', () => {
  expect(edgeColor('#ffffff', 0).toArray().map(r3)).toEqual([0.6, 0.6, 0.6]);
  expect(edgeColor('#d6caba', 100).getHex()).toBe(0);
  expect(edgeColor('#d6caba', 500).getHex()).toBe(0);
});
it('EdgeMaterials: one material per key, setStyle and setResolution update all of them', () => {
  const e = new EdgeMaterials({ contrast: 0, width: 1 });
  const a = e.get('carcass|x', '#ffffff');
  expect(e.get('carcass|x', '#ffffff')).toBe(a);
  const b = e.get('front|y', '#ffffff');
  e.setStyle({ contrast: 100, width: 3 });
  for (const m of [a, b]) { expect(m.color.getHex()).toBe(0); expect(m.linewidth).toBe(3); }
  e.setResolution(800, 600);
  expect(a.resolution.toArray()).toEqual([800, 600]);
  expect(e.all().length).toBe(2);
});
it('edgeLines: 12 edges of a box, does not capture clicks', () => {
  const l = edgeLines(new BoxGeometry(10, 10, 10), 20, new EdgeMaterials(DEFAULT_EDGE_STYLE).get('k', '#ffffff'));
  expect((l.geometry as any).attributes.instanceStart.count).toBe(12);
  const hits: unknown[] = [];
  l.raycast({} as any, hits as any);
  expect(hits.length).toBe(0);
});
it('buildModel: every part has lines with a material from built.edges', () => {
  const m = ModelSchema.parse(JSON.parse(readFileSync('projects/tv-cabinet/model.json', 'utf8')));
  const b = buildModel(m);
  const mats = new Set(b.edges.all());
  for (const mesh of b.partsById.values()) {
    expect(mesh.children.length).toBe(1);
    expect(mats.has((mesh.children[0] as any).material)).toBe(true);
  }
});
it('a material created after setResolution gets the current resolution (e.g. after a layer change)', () => {
  const e = new EdgeMaterials(DEFAULT_EDGE_STYLE);
  e.get('carcass|x', '#ffffff');
  e.setResolution(800, 600);
  expect(e.get('blendy|x', '#ffffff').resolution.toArray()).toEqual([800, 600]);
});
