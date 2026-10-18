import { it, expect } from 'vitest';
import { project, cabinet, shelf, front, handle, legs } from '../src/dsl';
import { ModelSchema } from '../src/model/schema';
const dims = (p: any) => [0, 1, 2].map((i) => p.shape.max[i] - p.shape.min[i]);
const find = (m: any, n: string) => m.parts.find((p: any) => p.name.startsWith(n));

it('sides outside: top panel = w − 36', () => {
  const m = project({ id: 't', name: 'T', build: (p) => {
    const c = cabinet(p, { id: 'k', name: 'K', w: 600, d: 300, h: 720, at: [0, 0, 0], layout: 'sides-outside', back: false });
    shelf(c, { z: 300 });
  } }).toModel();
  expect(dims(find(m, 'K Top panel'))).toEqual([564, 300, 18]);
  expect(dims(find(m, 'K Side L'))).toEqual([18, 300, 720]);
  expect(find(m, 'K Shelf').layer).toBe('carcass');
});
it('panels outside: side = h − 36', () => {
  const m = project({ id: 't', name: 'T', build: (p) => {
    cabinet(p, { id: 'k', name: 'K', w: 600, d: 300, h: 720, at: [0, 0, 0], layout: 'panels-outside', back: false });
  } }).toModel();
  expect(dims(find(m, 'K Side L'))).toEqual([18, 300, 684]);
});
it('the front is in front (smaller Y than the side) and the model validates', () => {
  const pr = project({ id: 't', name: 'T', build: (p) => {
    const c = cabinet(p, { id: 'k', name: 'K', w: 600, d: 300, h: 720, at: [0, 0, 0], layout: 'sides-outside' });
    front(c, { name: 'Door', x0: 2, x1: 598, z0: 2, z1: 718 });
  } });
  const m = pr.toModel();
  expect(find(m, 'K Door').shape.max[1]).toBeLessThanOrEqual(find(m, 'K Side L').shape.min[1]);
  expect(() => ModelSchema.parse(m)).not.toThrow();
  expect(pr.toModel().parts.length).toBe(m.parts.length);   // no duplication
});
it('base: bottom panel under the sides and two 100 mm rails', () => {
  const m = project({ id: 't', name: 'T', build: (p) => {
    cabinet(p, { id: 'k', name: 'K', w: 600, d: 510, h: 720, at: [0, 0, 100], layout: 'base', back: false });
  } }).toModel();
  expect(dims(find(m, 'K Bottom panel'))).toEqual([600, 510, 18]);
  expect(dims(find(m, 'K Side L'))).toEqual([18, 510, 702]);
  const fr = find(m, 'K Front rail'), br = find(m, 'K Back rail');
  expect(dims(fr)).toEqual([564, 100, 18]);
  expect(fr.shape.min[1]).toBe(-510);
  expect(br.shape.max[1]).toBe(0);
  expect(fr.shape.max[2]).toBe(820);
  expect(fr.edges.raw).not.toContain('y-');
  expect([...br.edges.raw].sort()).toEqual(['x+', 'x-', 'y+', 'y-']);
});
it('back behind the box, legs underneath, handle in front of the front, ids and materials', () => {
  const m: any = project({ id: 'x', name: 'X', build: (p) => {
    const c = cabinet(p, { id: 'k', name: 'K', w: 800, d: 300, h: 1200, at: [0, 0, 100], layout: 'sides-outside' });
    front(c, { name: 'Door L', x0: 2, x1: 398, z0: 2, z1: 1198 });
    handle(c, { x: 370, z: 600, type: '32' });
    legs(c);
  } }).toModel();
  const back = find(m, 'K Back HDF');
  expect(back.layer).toBe('back');
  expect([back.shape.min[1], back.shape.max[1]]).toEqual([0, 3]);
  const l = m.parts.filter((p: any) => p.layer === 'legs');
  expect(l.length).toBe(4);
  for (const x of l) expect([x.shape.min[2], x.shape.max[2]]).toEqual([0, 100]);
  const h = find(m, 'K Handle');
  expect(h.layer).toBe('handles');
  expect(h.shape.max[1]).toBeLessThanOrEqual(find(m, 'K Door L').shape.min[1]);
  expect(m.parts[0].id).toBe('p0001');
  expect(m.source).toBe('dsl:projects/x/project.ts');
  expect(Object.keys(m.materials).sort()).toEqual(['carcass-macadamia', 'front-macadamia', 'handle-black', 'hdf', 'leg']);
  expect(m.groups).toEqual([{ id: 'k', name: 'K', parent: null }]);
  for (const p of m.parts) { expect(p.unit).toBe('k'); expect(p.group).toBe('k'); }
});
it('edge banding as in imported models: only narrow edges in edges.raw', () => {
  const m: any = project({ id: 't', name: 'T', build: (p) => {
    const c = cabinet(p, { id: 'k', name: 'K', w: 600, d: 300, h: 720, at: [0, 0, 0], layout: 'sides-outside' });
    shelf(c, { z: 300 });
  } }).toModel();
  const raw = (n: string) => [...find(m, n).edges.raw].sort();
  expect(raw('K Side L')).toEqual(['y+', 'z+', 'z-']);
  expect(raw('K Top panel')).toEqual(['x+', 'x-', 'y+']);
  expect(raw('K Shelf')).toEqual(['x+', 'x-', 'y+']);
  expect(raw('K Back HDF')).toEqual(['x+', 'x-', 'z+', 'z-']);
});
