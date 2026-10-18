import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelSchema, type Model } from '../src/model/schema';
import { codeModel } from '../src/model/codes';
import { mergeImport } from '../src/model/merge';
import { importProject } from '../tools/import-rb/import';

const box = { type: 'box' as const, min: [0, 0, 0] as [number, number, number], max: [18, 300, 700] as [number, number, number] };
const P = (id: string, unit: string, layer: string, name: string) => ({ id, name, group: unit, unit, layer, material: 'm', shape: box });
const model = (parts: any[], extra: object = {}): Model => ModelSchema.parse({
  format: 'furniture-model', version: 1, id: 'bathroom', name: 'Old name', materials: { m: { label: 'M', color: '#ffffff' } },
  groups: [], parts, ...extra,
});

// previous model: codes assigned, "B Side L" manually moved to fillers
const prev = () => {
  const m = codeModel(model([
    P('p0001', 'B', 'carcass', 'B Side L'), P('p0002', 'B', 'carcass', 'B Shelf'), P('p0003', 'B', 'carcass', 'B Shelf'),
    P('p0004', 'B', 'front', 'B Door'), P('p0005', 'A', 'carcass', 'A Side'),
  ])).model;
  m.parts[0] = { ...m.parts[0]!, layer: 'fillers', meta: { ...m.parts[0]!.meta, originalLayer: 'carcass' } };
  return m;
};

it('codes and manual layer carry over by name despite renumbering; duplicates paired in order', () => {
  // new import: "B Door" removed, a part added at the start, ids renumbered
  const fresh = model([
    P('p0001', 'B', 'carcass', 'B Top panel'), P('p0002', 'B', 'carcass', 'B Side L'), P('p0003', 'B', 'carcass', 'B Shelf'),
    P('p0004', 'B', 'carcass', 'B Shelf'), P('p0005', 'A', 'carcass', 'A Side'),
  ]);
  const before = prev();
  const m = codeModel(mergeImport(before, fresh, { name: 'Bathroom', description: 'description' })).model;
  const code = (n: string) => m.parts.filter((p) => p.name === n).map((p) => p.meta.code);
  const was = (n: string) => before.parts.filter((p) => p.name === n).map((p) => p.meta.code);
  expect(code('B Side L')).toEqual(was('B Side L'));
  expect(code('B Shelf')).toEqual(was('B Shelf'));
  expect(code('A Side')).toEqual(was('A Side'));
  expect(code('B Top panel')).toEqual([`BAT-${before.codes!.next}`]);     // new part → next number
  const side = m.parts.find((p) => p.name === 'B Side L')!;
  expect([side.layer, side.meta.originalLayer]).toEqual(['fillers', 'carcass']);
  expect([m.name, m.description]).toEqual(['Bathroom', 'description']);
  expect(m.codes!.next).toBe(before.codes!.next + 1);
});
it('manual layer equal to the layer from the new import → no originalLayer', () => {
  const fresh = model([P('p0001', 'B', 'fillers', 'B Side L')]);
  const p = mergeImport(prev(), fresh, { name: 'x', description: '' }).parts[0]!;
  expect(p.layer).toBe('fillers');
  expect(p.meta.originalLayer).toBeUndefined();
});
it('first import (no previous model)', () => {
  const m = codeModel(mergeImport(null, model([P('p0001', 'B', 'carcass', 'B Side L')]), { name: 'N', description: 'D' })).model;
  expect(m.parts[0]!.meta.code).toBe('BAT-1');
});

function repo() {
  const root = mkdtempSync(join(tmpdir(), 'furniture-'));
  mkdirSync(join(root, 'projects', 'bathroom'), { recursive: true });
  writeFileSync(join(root, 'projects', 'bathroom', 'source.rb'), '# script v1');
  writeFileSync(join(root, 'projects', 'bathroom', 'import.json'),
    JSON.stringify({ source: 'projects/bathroom/source.rb', name: 'Bathroom', description: 'description' }));
  return root;
}
const fakeRuby = (m: Model) => (_rb: string, _id: string, out: string) => { writeFileSync(out, JSON.stringify(m)); };

it('importProject: writes model.json, sha in import.json, --changed skips an unchanged .rb', async () => {
  const root = repo();
  const fresh = model([P('p0001', 'B', 'carcass', 'B Side L')]);
  expect(await importProject(root, 'bathroom', { changedOnly: true, runRuby: fakeRuby(fresh) })).toBe(true);
  const mf = join(root, 'projects', 'bathroom', 'model.json');
  expect(JSON.parse(readFileSync(mf, 'utf8')).parts[0].meta.code).toBe('BAT-1');
  const cfg = JSON.parse(readFileSync(join(root, 'projects', 'bathroom', 'import.json'), 'utf8'));
  expect(cfg.importedSha).toMatch(/^[0-9a-f]{40}$/);
  expect(await importProject(root, 'bathroom', { changedOnly: true, runRuby: () => { throw new Error('should not run'); } })).toBe(false);
  writeFileSync(join(root, 'projects', 'bathroom', 'source.rb'), '# script v2');
  expect(await importProject(root, 'bathroom', { changedOnly: true, runRuby: fakeRuby(fresh) })).toBe(true);
  expect(existsSync(mf)).toBe(true);
});
