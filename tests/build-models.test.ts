import { it, expect } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildProject, checkIds, loadCodeBook, summarize } from '../tools/build-models';
import { testModel } from './fixtures';

it('summarize counts parts and layers', () => {
  const s = summarize({ id: 'a', name: 'A', description: 'd', parts: [
    { layer: 'carcass' }, { layer: 'front' }, { layer: 'carcass' },
  ] } as any);
  expect(s).toEqual({ id: 'a', name: 'A', description: 'd', parts: 3, layers: ['carcass', 'front'] });
});
it('project id must match the folder name and be unique', () => {
  expect(() => checkIds([['a', 'a'], ['b', 'b']])).not.toThrow();
  expect(() => checkIds([['cabinet', 'example-shelf']])).toThrow(/cabinet/);
});

function tmpProject(model: object = testModel()) {
  const root = mkdtempSync(join(tmpdir(), 'furniture-'));
  mkdirSync(join(root, 'projects', 'a'), { recursive: true });
  writeFileSync(join(root, 'projects', 'a', 'model.json'), JSON.stringify(model));
  return root;
}
const modelFile = (root: string) => join(root, 'projects', 'a', 'model.json');

it('model.json: codes assigned and stored in model.json itself; a second run does not change the file', async () => {
  const root = tmpProject();
  const r = (await buildProject(root, 'a'))!;
  expect(r.model.parts.map((p) => p.meta.code)).toEqual(['A-1', 'A-2']);
  const first = readFileSync(modelFile(root), 'utf8');
  expect(JSON.parse(first).codes).toEqual({ prefix: 'A', next: 3 });
  expect(JSON.parse(first).parts[0].meta.code).toBe('A-1');
  expect(existsSync(join(root, 'projects', 'a', 'codes.json'))).toBe(false);
  await buildProject(root, 'a');
  expect(readFileSync(modelFile(root), 'utf8')).toBe(first);
});
it('a manual layer from model.json reaches the output unchanged', async () => {
  const m = testModel();
  m.parts[0] = { ...m.parts[0]!, layer: 'fillers', meta: { originalLayer: 'carcass' } };
  const r = (await buildProject(tmpProject(m), 'a'))!;
  expect(r.model.parts[0]!.layer).toBe('fillers');
  expect(r.model.parts[0]!.meta.originalLayer).toBe('carcass');
});
it('folder without a model → null; broken codes.json → error naming the file', async () => {
  const root = tmpProject();
  mkdirSync(join(root, 'projects', 'empty'));
  expect(await buildProject(root, 'empty')).toBeNull();
  writeFileSync(join(root, 'projects', 'a', 'codes.json'), '{bad');
  expect(() => loadCodeBook(root, 'a')).toThrow(/codes\.json/);
});
