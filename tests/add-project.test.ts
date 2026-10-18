import { it, expect } from 'vitest';
import { planUpload, uploadProject } from '../src/github/addProject';
import { b64ToUtf8, utf8ToB64 } from '../src/github/api';
import { testModel } from './fixtures';

const info = { name: 'Cabinet', description: 'description' };
it('.rb file → source.rb + import.json', () => {
  const p = planUpload('cabinet-1', 'my cabinet.rb', '# ruby', info);
  expect(p).toEqual({ files: [
    { path: 'projects/cabinet-1/source.rb', text: '# ruby' },
    { path: 'projects/cabinet-1/import.json', text: JSON.stringify({ source: 'projects/cabinet-1/source.rb', ...info }, null, 2) + '\n', keepImported: true },
  ] });
});
it('model.json → validation, id from the form', () => {
  const p = planUpload('new', 'model.json', JSON.stringify({ ...testModel(), id: 'inne' }), info) as any;
  expect(p.files[0].path).toBe('projects/new/model.json');
  const m = JSON.parse(p.files[0].text);
  expect([m.id, m.name, m.description]).toEqual(['new', 'Cabinet', 'description']);
  expect(planUpload('new', 'model.json', '{"format":"bad"}', info)).toEqual({ error: expect.stringMatching(/model\.json/) });
  expect(planUpload('new', 'model.json', '{bad', info)).toEqual({ error: expect.stringMatching(/JSON/) });
});
it('project.ts → project.ts; bad id and unknown file type → error', () => {
  expect((planUpload('shelf', 'project.ts', 'export default 1', info) as any).files[0].path).toBe('projects/shelf/project.ts');
  expect(planUpload('Bad Name', 'a.rb', '', info)).toEqual({ error: expect.stringMatching(/id/) });
  expect(planUpload('ok', 'a.pdf', '', info)).toEqual({ error: expect.stringMatching(/\.rb, model\.json or project\.ts/) });
});
it('uploadProject: sha for existing files, importedSha kept, reports whether the project existed', async () => {
  const existing: Record<string, string> = { 'projects/a/import.json': JSON.stringify({ source: 'x', name: 'n', importedSha: 'abc' }) };
  const puts: any[] = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    const path = decodeURIComponent(url.split('/contents/')[1]!.split('?')[0]!);
    if ((init.method ?? 'GET') === 'GET') {
      return existing[path] ? new Response(JSON.stringify({ content: utf8ToB64(existing[path]!), sha: 'sha-' + path }), { status: 200 }) : new Response('', { status: 404 });
    }
    puts.push({ path, ...JSON.parse(String(init.body)) });
    return new Response('{}', { status: 201 });
  }) as unknown as typeof fetch;
  const plan = planUpload('a', 'x.rb', '# v2', info) as any;
  const r = await uploadProject({ owner: 'o', repo: 'r', branch: 'main', token: 't' }, 'a', plan.files, f);
  expect(r.existed).toBe(true);
  expect(puts.map((p) => [p.path, p.sha ?? null])).toEqual([['projects/a/source.rb', null], ['projects/a/import.json', 'sha-projects/a/import.json']]);
  expect(JSON.parse(b64ToUtf8(puts[1].content)).importedSha).toBe('abc');
  expect(puts[0].message).toBe('Project a: source.rb');
});

import { codeModel } from '../src/model/codes';
import { ConflictError, GhError, putFile } from '../src/github/api';
function repoFetch(existing: Record<string, string>, failPutsOnce: Set<string> = new Set()) {
  const puts: any[] = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    const path = decodeURIComponent(url.split('/contents/')[1]!.split('?')[0]!);
    if ((init.method ?? 'GET') === 'GET') {
      return existing[path] ? new Response(JSON.stringify({ content: utf8ToB64(existing[path]!), sha: 'sha-' + puts.length }), { status: 200 }) : new Response('', { status: 404 });
    }
    if (failPutsOnce.delete(path)) return new Response('{"message":"reference is at X"}', { status: 409 });
    const body = JSON.parse(String(init.body));
    puts.push({ path, ...body });
    existing[path] = b64ToUtf8(body.content);
    return new Response('{}', { status: 201 });
  }) as unknown as typeof fetch;
  return { f, puts, existing };
}
const cfg2 = { owner: 'o', repo: 'r', branch: 'main', token: 't' };
it('model.json over an existing project: codes and manual layers are kept (merged by name)', async () => {
  const prev = codeModel(testModel()).model;                       // Side A-1, Door A-2
  prev.parts[0] = { ...prev.parts[0]!, layer: 'fillers', meta: { ...prev.parts[0]!.meta, originalLayer: 'carcass' } };
  const r = repoFetch({ 'projects/a/model.json': JSON.stringify(prev) });
  const uploaded = { ...testModel(), parts: [...testModel().parts].reverse() };   // the same furniture, different order / ids
  const plan = planUpload('a', 'model.json', JSON.stringify(uploaded), info) as any;
  await uploadProject(cfg2, 'a', plan.files, r.f);
  const m = JSON.parse(r.existing['projects/a/model.json']!);
  const byName = Object.fromEntries(m.parts.map((p: any) => [p.name, [p.layer, p.meta.code]]));
  expect(byName).toEqual({ Side: ['fillers', 'A-1'], Door: ['front', 'A-2'] });
});
it('uploadProject: conflict on save → retry with a fresh sha; a persistent error names the file', async () => {
  const r = repoFetch({}, new Set(['projects/a/import.json']));
  const plan = planUpload('a', 'x.rb', '# v1', info) as any;
  await uploadProject(cfg2, 'a', plan.files, r.f);
  expect(r.puts.map((p) => p.path)).toEqual(['projects/a/source.rb', 'projects/a/import.json']);
  const always = (async (url: string, init: RequestInit = {}) =>
    (init.method ?? 'GET') === 'GET' ? new Response('', { status: 404 }) : new Response('{}', { status: 409 })) as unknown as typeof fetch;
  await expect(uploadProject(cfg2, 'a', plan.files, always)).rejects.toThrow(/source\.rb/);
});
it('PUT 404 → message that the token cannot see the repository', async () => {
  const f = (async () => new Response('{"message":"Not Found"}', { status: 404 })) as unknown as typeof fetch;
  await expect(putFile(cfg2, 'a', 'b', null, 'm', f)).rejects.toThrow(/cannot see the repository/);
  void ConflictError; void GhError;
});
