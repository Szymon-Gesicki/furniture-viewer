import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Raycaster, Vector3 } from 'three';
import { ModelSchema } from '../src/model/schema';
import { buildModel } from '../src/viewer/loadModel';
import { planDrilling } from '../src/drilling/plan';
import { createDrillMarkers } from '../src/viewer/drillMarkers';

const m = ModelSchema.parse(JSON.parse(readFileSync('projects/bathroom/model.json', 'utf8')));
const plan = planDrilling(m);

it('one marker per feature, attached to its part (moves with explode), hidden until switched on', () => {
  const built = buildModel(m);
  const mk = createDrillMarkers(built, plan.features);
  const kids = [...built.partsById.values()].flatMap((x) => x.children.filter((c) => c.userData.drill));
  expect(kids).toHaveLength(plan.features.length);
  expect(kids.every((k) => !k.visible)).toBe(true);
  mk.setFilter({ on: true, kinds: { 'shelf-pin': false }, optional: false });
  const vis = kids.filter((k) => k.visible);
  expect(vis.every((k) => k.userData.drill.kind !== 'shelf-pin' && !k.userData.drill.optional)).toBe(true);
  expect(vis.length).toBe(plan.features.filter((f) => f.kind !== 'shelf-pin' && !f.optional).length);
  mk.rebuild(plan.features.slice(0, 3));
  expect([...built.partsById.values()].flatMap((x) => x.children.filter((c) => c.userData.drill))).toHaveLength(3);
  mk.dispose();
});
it('pick: a ray along the hole direction hits the marker', () => {
  const built = buildModel(m);
  const mk = createDrillMarkers(built, plan.features);
  mk.setFilter({ on: true, kinds: {}, optional: false });
  const f = plan.features.find((x) => x.kind === 'hinge-cup')!;
  const dir = new Vector3(...f.world.dir);
  built.group.updateMatrixWorld(true);
  const ray = new Raycaster(new Vector3(...f.world.p).addScaledVector(dir, -50), dir);
  expect(mk.pick(ray)?.id).toBe(f.id);
});
