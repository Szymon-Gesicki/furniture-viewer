import { it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { ModelSchema } from '../src/model/schema';
import { planDrilling } from '../src/drilling/plan';
import { parseOverrides, applyDrillEdit } from '../src/drilling/overrides';
import { buildSteps } from '../src/drilling/steps';
import { emptyOverrides } from '../src/drilling/schema';
import { drillSession } from '../src/ui/drillSession';
import { templateSheet } from '../src/ui/drillDialogs';
import { itemById } from '../src/drilling/catalog';
import { dimensionsFor } from '../src/drilling/dims';

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  (globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
});
const kitchen = ModelSchema.parse(JSON.parse(readFileSync('projects/kitchen/model.json', 'utf8')));
const kov = parseOverrides(readFileSync('projects/kitchen/drilling.json', 'utf8'));
const unitOf = (name: string) => kitchen.parts.find((p) => p.name.startsWith(name))!.unit;

it('assembly steps: sides first (pins → plates → runners → Camar), fronts after, every hole in exactly one step', () => {
  const plan = planDrilling(kitchen, kov);
  const g2 = buildSteps(kitchen, plan, unitOf('G2 Bok P'));
  const side = g2.filter((s) => s.part.name.startsWith('G2 Bok P')).map((s) => s.item);
  expect(side).toEqual(['shelf-pin-5', 'blum-plate-173L6100', 'camar-801']);
  const firstFront = g2.findIndex((s) => s.part.layer === 'front');
  expect(g2.slice(firstFront).every((s) => s.part.layer === 'front')).toBe(true);
  const p2 = buildSteps(kitchen, plan, unitOf('P2 Bok L'));
  const front = p2.filter((s) => s.part.name.startsWith('P2 Szuflada dolna')).map((s) => s.item);
  expect(front).toEqual(['blum-inserta-ZF4.10I2', 'blum-inserta-ZF4.50I2', 'blum-stabiliser-Z96.10E1', 'nomet-techno-320']);
  const n = p2.reduce((a, s) => a + s.features.length, 0);
  expect(new Set(p2.flatMap((s) => s.features.map((f) => f.id))).size).toBe(n);
});
it('TIP-ON steps come last', () => {
  const m = ModelSchema.parse(JSON.parse(readFileSync('projects/bathroom/model.json', 'utf8')));
  const unit = m.parts.find((p) => p.name.startsWith('R1 Bok L'))!.unit;
  const s = buildSteps(m, planDrilling(m), unit);
  expect(s[s.length - 1]!.item).toBe('blum-tipon-956A1006');
});
it('session without a token: "Zrobione" kept locally (offline cache), other edits refused with the reason', async () => {
  const s = drillSession(kitchen, kov, { mode: 'off', reason: 'no token' });
  await s.save({ kind: 'done', value: { 'KIT-1|x|y-': true } });
  expect(s.overrides.done).toEqual({ 'KIT-1|x|y-': true });
  expect(JSON.parse(store.get('fv:done:kitchen')!)).toEqual({ 'KIT-1|x|y-': true });
  expect(drillSession(kitchen, kov, { mode: 'off', reason: 'r' }).overrides.done).toEqual({ 'KIT-1|x|y-': true });
  await expect(s.save({ kind: 'param', group: 'camar801', key: 'dowel_spacing', value: 40 })).rejects.toThrow('no token');
});
it('edits: param set/reset, notes, done untick', () => {
  let o = applyDrillEdit(emptyOverrides(), { kind: 'param', group: 'camar801', key: 'dowel_spacing', value: 40 });
  expect(o.params).toEqual({ camar801: { dowel_spacing: 40 } });
  o = applyDrillEdit(o, { kind: 'param', group: 'camar801', key: 'dowel_spacing', value: null });
  expect(o.params).toEqual({});
  o = applyDrillEdit(o, { kind: 'notes', name: 'camar-801', value: 'moja uwaga' });
  expect(o.notes).toEqual({ 'camar-801': 'moja uwaga' });
  o = applyDrillEdit(applyDrillEdit(o, { kind: 'done', value: { a: true, b: true } }), { kind: 'done', value: { a: false } });
  expect(o.done).toEqual({ b: true });
});
it('datasheet: hinge template drawn with the dims engine (45 spacing, B + 17.5 = 22.5)', () => {
  const t = templateSheet(itemById('blum-cliptop-71B3550')!);
  const texts = dimensionsFor(t).flatMap((d) => (d.kind === 'ordinate' ? d.ticks.map((x) => x.text) : 'text' in d && d.text ? [d.text] : []));
  expect(texts).toEqual(expect.arrayContaining(['45', '22,5', '32']));
});
