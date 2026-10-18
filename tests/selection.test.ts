import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ModelSchema } from '../src/model/schema';
import { buildModel } from '../src/viewer/loadModel';
import { createHighlighter, meshesOf } from '../src/viewer/selection';

const rtv = ModelSchema.parse(JSON.parse(readFileSync('projects/tv-cabinet/model.json', 'utf8')));

it('meshesOf: cabinet, part, none', () => {
  const b = buildModel(rtv);
  expect(meshesOf(b, { kind: 'unit', unit: 'RTV K1' }).length).toBe(rtv.parts.filter((p) => p.unit === 'RTV K1').length);
  expect(meshesOf(b, { kind: 'part', id: rtv.parts[0]!.id })).toEqual([b.partsById.get(rtv.parts[0]!.id)]);
  expect(meshesOf(b, { kind: 'part', id: 'nie-ma' })).toEqual([]);
  expect(meshesOf(b, null)).toEqual([]);
});
it('cabinet highlight: only its parts, one clone per shared material, restore puts them back', () => {
  const b = buildModel(rtv);
  const before = new Map([...b.partsById].map(([id, m]) => [id, m.material]));
  const hl = createHighlighter(b);
  hl.apply({ kind: 'unit', unit: 'RTV K1' });
  const lit = new Set<unknown>();
  for (const [id, m] of b.partsById) {
    const inUnit = m.userData.part.unit === 'RTV K1';
    expect(m.material !== before.get(id)).toBe(inUnit);
    if (inUnit) { lit.add(m.material); expect((m.material as any).emissive.getHex()).not.toBe(0); }
  }
  const sharedInUnit = new Set(meshesOf(b, { kind: 'unit', unit: 'RTV K1' }).map((m) => before.get(m.userData.part.id)));
  expect(lit.size).toBe(sharedInUnit.size);
  hl.restore();
  for (const [id, m] of b.partsById) expect(m.material).toBe(before.get(id));
});
it('apply replaces the previous selection', () => {
  const b = buildModel(rtv);
  const hl = createHighlighter(b);
  hl.apply({ kind: 'unit', unit: 'RTV K1' });
  hl.apply({ kind: 'part', id: rtv.parts.find((p) => p.unit === 'RTV K2')!.id });
  const k1 = meshesOf(b, { kind: 'unit', unit: 'RTV K1' });
  for (const m of k1) expect((m.material as any).emissive.getHex()).toBe(0);
});

it('changing the layer of a highlighted part: after restore the new shared material remains, not a clone', () => {
  const b = buildModel(ModelSchema.parse(JSON.parse(readFileSync('projects/tv-cabinet/model.json', 'utf8'))));
  const id = [...b.partsById.keys()][0]!;
  const hl = createHighlighter(b);
  hl.apply({ kind: 'part', id });
  hl.restore();
  b.setPartLayer(id, 'fillers');
  hl.apply({ kind: 'part', id });
  const lit = b.partsById.get(id)!.material;
  hl.restore();
  const mesh = b.partsById.get(id)!;
  expect(mesh.material).not.toBe(lit);
  expect((mesh.material as any).emissive.getHex()).toBe(0);
  expect(mesh.userData.part.layer).toBe('fillers');
});

import { PerspectiveCamera } from 'three';
import { attachSelection } from '../src/viewer/selection';
import { testModel } from './fixtures';

it('a click hits the current position of a part even without a render frame since it moved', () => {
  const b = buildModel(testModel());                       // two 1×1×1 parts at the origin
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0.5, 0.5, 10); camera.lookAt(0.5, 0.5, 0.5); camera.updateMatrixWorld();
  const canvas = Object.assign(new EventTarget(), { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) });
  const ctx = { renderer: { domElement: canvas }, camera } as any;
  const mesh = b.partsById.get('p1')!;
  mesh.position.set(50, 0, 0); b.group.updateMatrixWorld(true);   // e.g. framing computed fully exploded
  mesh.position.set(0, 0, 0);                                      // position restored, matrices still stale
  let got: unknown = 'none';
  attachSelection(ctx, b, { candidates: () => [mesh], resolve: (hit) => (hit ? { kind: 'part', id: hit.userData.part.id } : null), onChange: (s) => { got = s; } });
  const ev = (type: string) => Object.assign(new Event(type), { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
  canvas.dispatchEvent(ev('pointerdown'));
  canvas.dispatchEvent(ev('pointerup'));
  expect(got).toEqual({ kind: 'part', id: 'p1' });
});

import { isDoubleClick } from '../src/viewer/selection';
it('isDoubleClick: time and distance', () => {
  expect(isDoubleClick({ t: 0, x: 10, y: 10 }, { t: 300, x: 12, y: 11 })).toBe(true);
  expect(isDoubleClick({ t: 0, x: 10, y: 10 }, { t: 400, x: 10, y: 10 })).toBe(false);
  expect(isDoubleClick({ t: 0, x: 10, y: 10 }, { t: 100, x: 20, y: 10 })).toBe(false);
  expect(isDoubleClick(null, { t: 100, x: 10, y: 10 })).toBe(false);
});
it('attachSelection: a second quick click is a double click, a third is single again; a drag breaks the series', () => {
  const b = buildModel(testModel());
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0.5, 0.5, 10); camera.lookAt(0.5, 0.5, 0.5); camera.updateMatrixWorld();
  const canvas = Object.assign(new EventTarget(), { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) });
  const doubles: boolean[] = [];
  attachSelection({ renderer: { domElement: canvas }, camera } as any, b,
    { candidates: () => [b.partsById.get('p1')!], resolve: (_h, d) => { doubles.push(d); return null; }, onChange: () => {} });
  let now = 1000;
  const realNow = performance.now;
  (performance as any).now = () => now;
  const click = (x: number, t: number, upX = x) => {
    now = t;
    canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerId: 1, button: 0, clientX: x, clientY: 50 }));
    canvas.dispatchEvent(Object.assign(new Event('pointerup'), { pointerId: 1, button: 0, clientX: upX, clientY: 50 }));
  };
  click(50, 1000); click(50, 1200); click(50, 1300);          // single, double, single
  click(50, 2000); click(50, 2100, 80); click(50, 2200);      // a drag in the middle: no double
  (performance as any).now = realNow;
  expect(doubles).toEqual([false, true, false, false, false]);
});
