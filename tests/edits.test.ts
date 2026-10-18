import { it, expect } from 'vitest';
import { ModelSchema } from '../src/model/schema';
import { codeModel } from '../src/model/codes';
import { StaleError, applyLayerEdit } from '../src/model/edits';
import { saveLayer } from '../src/github/project';
import { AuthError, b64ToUtf8, utf8ToB64 } from '../src/github/api';
import { testModel } from './fixtures';

const coded = () => codeModel(testModel()).model;       // p1 Side carcass A-1, p2 Door front A-2

it('applyLayerEdit: layer + originalLayer; moving back removes it; no mutation', () => {
  const m = coded();
  const a = applyLayerEdit(m, 'p1', 'Side', 'fillers');
  expect([a.parts[0]!.layer, a.parts[0]!.meta.originalLayer, a.parts[0]!.meta.code]).toEqual(['fillers', 'carcass', 'A-1']);
  expect(m.parts[0]!.layer).toBe('carcass');
  const b = applyLayerEdit(a, 'p1', 'Side', 'carcass');
  expect(b.parts[0]!.meta.originalLayer).toBeUndefined();
  expect(applyLayerEdit(a, 'p1', 'Side', 'cladding').parts[0]!.meta.originalLayer).toBe('carcass');
});
it('applyLayerEdit: different name or missing part → StaleError', () => {
  expect(() => applyLayerEdit(coded(), 'p1', 'Other', 'fillers')).toThrow(StaleError);
  expect(() => applyLayerEdit(coded(), 'p9', 'Side', 'fillers')).toThrow(StaleError);
});
it('applyLayerEdit: a part moved into a cut layer gets a code', () => {
  const m = ModelSchema.parse({ ...testModel(), parts: [...testModel().parts, { id: 'p3', name: 'Handle', group: null, unit: 'k', layer: 'handles', material: 'm',
    shape: { type: 'box', min: [0, 0, 0], max: [1, 1, 1] } }] });
  const c = codeModel(m).model;
  expect(c.parts[2]!.meta.code).toBeUndefined();
  expect(applyLayerEdit(c, 'p3', 'Handle', 'front').parts[2]!.meta.code).toBe('A-3');
});

const cfg = { owner: 'o', repo: 'r', branch: 'main', token: 't' };
function server(initial: object) {
  let file = { text: JSON.stringify(initial, null, 2) + '\n', sha: 's1' };
  const puts: any[] = [];
  let conflictOnce = false;
  let interfere: ((m: any) => void) | null = null;
  const f = (async (url: string, init: RequestInit = {}) => {
    if ((init.method ?? 'GET') === 'GET') return new Response(JSON.stringify({ content: utf8ToB64(file.text), sha: file.sha }), { status: 200 });
    const body = JSON.parse(String(init.body));
    puts.push(body);
    if (conflictOnce) {
      conflictOnce = false;
      const m = JSON.parse(file.text); interfere!(m);           // someone else changed the file in the meantime
      file = { text: JSON.stringify(m, null, 2) + '\n', sha: 's2' };
      return new Response(JSON.stringify({ message: 'sha mismatch' }), { status: 409 });
    }
    if (body.sha !== file.sha) return new Response('{}', { status: 409 });
    file = { text: b64ToUtf8(body.content), sha: 's' + (puts.length + 2) };
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  return { f, puts, file: () => JSON.parse(file.text), conflict(fn: (m: any) => void) { conflictOnce = true; interfere = fn; } };
}

it('saveLayer: commit with the new model.json and a readable message', async () => {
  const s = server(coded());
  const m = await saveLayer(cfg, 'a', 'p1', 'Side', 'fillers', s.f);
  expect(m.parts[0]!.layer).toBe('fillers');
  expect(s.puts[0].message).toBe('Layer A-1 → Fillers and plinths (a)');
  expect(s.file().parts[0].layer).toBe('fillers');
  expect(s.file().parts[0].meta.originalLayer).toBe('carcass');
});
it('saveLayer: conflict → refetch, another change is kept', async () => {
  const s = server(coded());
  s.conflict((m) => { m.parts[1].layer = 'cladding'; m.parts[1].meta.originalLayer = 'front'; });
  await saveLayer(cfg, 'a', 'p1', 'Side', 'fillers', s.f);
  expect(s.puts.length).toBe(2);
  expect(s.file().parts.map((p: any) => p.layer)).toEqual(['fillers', 'cladding']);
});
it('saveLayer: bad token → AuthError', async () => {
  const f = (async () => new Response('{"message":"Bad credentials"}', { status: 401 })) as unknown as typeof fetch;
  await expect(saveLayer(cfg, 'a', 'p1', 'Side', 'fillers', f)).rejects.toBeInstanceOf(AuthError);
});
