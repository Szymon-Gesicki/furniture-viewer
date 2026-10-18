import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ModelSchema, type Model } from '../src/model/schema';
import { assignCodes, emptyCodeBook, findPart, projectPrefix, shortLabel } from '../src/model/codes';

const box = { type: 'box' as const, min: [0, 0, 0] as [number, number, number], max: [18, 300, 700] as [number, number, number] };
const P = (id: string, unit: string, layer: string, name: string) => ({ id, name, group: unit, unit, layer, material: 'm', shape: box });
const model = (parts: any[]): Model => ModelSchema.parse({
  format: 'furniture-model', version: 1, id: 'bathroom', name: 'Bathroom', materials: { m: { label: 'M', color: '#ffffff' } },
  groups: [{ id: 'B', name: 'B2 Wall cabinet', parent: null }, { id: 'A', name: 'A1 Base cabinet', parent: null }],
  parts,
});
const base = () => model([
  P('p1', 'B', 'front', 'B2 Door 396x700'),
  P('p2', 'B', 'carcass', 'B2 Side L 700x300'),
  P('p3', 'A', 'carcass', 'A1 Side L 700x300'),
  P('p4', 'B', 'handles', 'B2 Handle'),
  P('p5', 'A', 'room', 'Wall'),
]);
const codes = (m: Model) => Object.fromEntries(m.parts.map((p) => [p.id, p.meta.code ?? null]));

it('project prefix', () => {
  expect(['bathroom', 'tv-cabinet', 'example-shelf', 'éclair', '123'].map(projectPrefix)).toEqual(['BAT', 'TVC', 'EXA', 'ECL', 'P']);
});
it('assignment: cabinet order from the model, by layer within a cabinet, cut parts only', () => {
  const r = assignCodes(base(), emptyCodeBook('bathroom'));
  expect(codes(r.model)).toEqual({ p1: 'BAT-2', p2: 'BAT-1', p3: 'BAT-3', p4: null, p5: null });
  expect(r.book).toEqual({ prefix: 'BAT', next: 4, codes: {
    p2: { n: 1, name: 'B2 Side L 700x300' }, p1: { n: 2, name: 'B2 Door 396x700' }, p3: { n: 3, name: 'A1 Side L 700x300' } } });
  expect(r.changed).toBe(true);
});
it('stability: a repeated assignment changes nothing, inputs are not mutated', () => {
  const m = base();
  const b1 = assignCodes(m, emptyCodeBook('bathroom')).book;
  const snap = JSON.stringify(b1);
  const r = assignCodes(m, b1);
  expect(r.changed).toBe(false);
  expect(JSON.stringify(r.book)).toBe(snap);
  expect(JSON.stringify(b1)).toBe(snap);
  expect(m.parts[0]!.meta.code).toBeUndefined();
});
it('a new part gets the next number; a renamed part → new number, the old one is not reused', () => {
  const b1 = assignCodes(base(), emptyCodeBook('bathroom')).book;
  const m2 = model([
    P('p1', 'B', 'front', 'B2 Door 396x700'),
    P('p2', 'B', 'carcass', 'B2 Side L 720x300'),          // renamed (re-import)
    P('p3', 'A', 'carcass', 'A1 Side L 700x300'),
    P('p6', 'A', 'back', 'A1 Back HDF'),
  ]);
  const r = assignCodes(m2, b1);
  expect(codes(r.model)).toEqual({ p1: 'BAT-2', p2: 'BAT-4', p3: 'BAT-3', p6: 'BAT-5' });
  expect(r.book.next).toBe(6);
});
it('a part moved to a non-cut layer keeps its code, others do not shift', () => {
  const b1 = assignCodes(base(), emptyCodeBook('bathroom')).book;
  const m2 = base();
  m2.parts[1] = { ...m2.parts[1]!, layer: 'handles' };
  const r = assignCodes(m2, b1);
  expect(codes(r.model)).toEqual({ p1: 'BAT-2', p2: 'BAT-1', p3: 'BAT-3', p4: null, p5: null });
  expect(r.changed).toBe(false);
});
it('prefix from the file wins', () => {
  const r = assignCodes(base(), { prefix: 'BZ', next: 10, codes: {} });
  expect(r.model.parts[1]!.meta.code).toBe('BZ-10');
});
it('short part label', () => {
  const m = assignCodes(model([
    P('p1', 'TV K1', 'carcass', 'TV K1 Side L 332x282'),
    P('p2', 'TV K1', 'carcass', 'TV K1 Shelf 290x262 (on pins, adjustable)'),
  ]), emptyCodeBook('tv-cabinet')).model;
  expect(shortLabel(m, m.parts[0]!)).toBe('TVC-1 · TV K1 · Side L · 700 × 300 × 18');
  expect(shortLabel(m, m.parts[1]!)).toContain('· Shelf (on pins, adjustable) ·');
  const r = base();
  expect(shortLabel(r, r.parts[0]!)).toBe('B2 Wall cabinet · Door · 700 × 300 × 18');
});
it('search: code ignoring case and spaces, id, name fragment, nothing', () => {
  const m = assignCodes(base(), emptyCodeBook('bathroom')).model;
  expect(findPart(m, 'bat-3')?.id).toBe('p3');
  expect(findPart(m, '  BAT-2 ')?.id).toBe('p1');
  expect(findPart(m, 'p4')?.id).toBe('p4');
  expect(findPart(m, 'door')?.id).toBe('p1');
  expect(findPart(m, 'BAT-99')).toBeNull();
  expect(findPart(m, '   ')).toBeNull();
});

// a re-import renumbers ids (p0001, p0002… in order) – codes must follow the part name
const renumber = (m: Model, parts: Model['parts']): Model =>
  ({ ...m, parts: parts.map((p, i) => ({ ...p, id: `p${String(i + 1).padStart(4, '0')}` })) });
it('removing a part and renumbering ids keeps the codes of the other parts (real bathroom)', () => {
  const laz = ModelSchema.parse(JSON.parse(readFileSync('projects/bathroom/model.json', 'utf8')));
  const first = assignCodes(laz, emptyCodeBook('bathroom'));
  const byName = (m: Model) => m.parts.filter((p) => p.meta.code).map((p) => `${p.name}=${p.meta.code}`).sort();
  const removed = laz.parts[3]!;
  const after = assignCodes(renumber(laz, laz.parts.filter((p) => p !== removed)), first.book);
  const expected = byName(first.model).filter((s) => !s.startsWith(removed.name + '='));
  expect(byName(after.model)).toEqual(expected);
  expect(after.book.next).toBe(first.book.next);
  // and a second run changes nothing
  expect(assignCodes(renumber(laz, laz.parts.filter((p) => p !== removed)), after.book).changed).toBe(false);
});
it('inserting a part at the start: old parts keep their codes, the new one gets the next number', () => {
  const b1 = assignCodes(base(), emptyCodeBook('bathroom')).book;
  const m = base();
  const r = assignCodes(renumber(m, [P('x', 'A', 'carcass', 'A1 Side R 700x300') as any, ...m.parts]), b1);
  expect(r.model.parts.map((p) => `${p.name}=${p.meta.code ?? '-'}`)).toEqual([
    'A1 Side R 700x300=BAT-4', 'B2 Door 396x700=BAT-2', 'B2 Side L 700x300=BAT-1', 'A1 Side L 700x300=BAT-3', 'B2 Handle=-', 'Wall=-']);
});

import { codeModel } from '../src/model/codes';
it('codeModel: the first assignment stores codes on parts and in the header', () => {
  const r = codeModel(base());
  expect(codes(r.model)).toEqual({ p1: 'BAT-2', p2: 'BAT-1', p3: 'BAT-3', p4: null, p5: null });
  expect(r.model.codes).toEqual({ prefix: 'BAT', next: 4 });
  expect(r.changed).toBe(true);
});
it('codeModel: a second run changes nothing (byte for byte)', () => {
  const once = codeModel(base()).model;
  const r = codeModel(once);
  expect(r.changed).toBe(false);
  expect(JSON.stringify(r.model)).toBe(JSON.stringify(once));
});
it('codeModel: a new cut part gets the next number from the header', () => {
  const once = codeModel(base()).model;
  const m = { ...once, codes: { prefix: 'BAT', next: 10 }, parts: [...once.parts, P('p9', 'A', 'front', 'A1 Door') as any] };
  const r = codeModel(ModelSchema.parse(m));
  expect(r.model.parts.find((p) => p.id === 'p9')!.meta.code).toBe('BAT-10');
  expect(r.model.parts.find((p) => p.id === 'p2')!.meta.code).toBe('BAT-1');   // existing codes unchanged
  expect(r.model.codes).toEqual({ prefix: 'BAT', next: 11 });
});
it('codeModel: the counter never goes below the highest code (hand-edited file)', () => {
  const once = codeModel(base()).model;
  const m = ModelSchema.parse({ ...once, codes: { prefix: 'BAT', next: 1 }, parts: [...once.parts, P('p9', 'A', 'front', 'A1 Door')] });
  expect(codeModel(m).model.parts.find((p) => p.id === 'p9')!.meta.code).toBe('BAT-4');
});
