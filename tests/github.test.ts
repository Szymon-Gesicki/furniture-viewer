import { it, expect, beforeEach } from 'vitest';
import { AuthError, ConflictError, b64ToUtf8, checkRepo, getFile, putFile, utf8ToB64 } from '../src/github/api';
import { clearGhConfig, guessRepo, loadGhConfig, saveGhConfig, type GhConfig } from '../src/github/config';

const cfg: GhConfig = { owner: 'szymon', repo: 'furniture-viewer', branch: 'main', token: 'tok' };
type Call = { url: string; init: RequestInit };
function fakeFetch(responses: { status: number; body?: unknown }[]) {
  const calls: Call[] = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const r = responses.shift() ?? { status: 500 };
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { f, calls };
}

it('base64 UTF-8 round trip (non-ASCII characters)', () => {
  const s = '{"name":"Café naïve – Ångström ✓"}';
  expect(b64ToUtf8(utf8ToB64(s))).toBe(s);
  expect(b64ToUtf8(utf8ToB64(s).replace(/(.{10})/g, '$1\n'))).toBe(s);   // GitHub wraps base64 every 60 characters
});
it('getFile: content and sha; 404 → null; token in the header; branch in ref', async () => {
  const { f, calls } = fakeFetch([{ status: 200, body: { content: utf8ToB64('crème brûlée'), sha: 'abc' } }, { status: 404 }]);
  expect(await getFile(cfg, 'projects/a b/model.json', f)).toEqual({ text: 'crème brûlée', sha: 'abc' });
  expect(calls[0]!.url).toBe('https://api.github.com/repos/szymon/furniture-viewer/contents/projects/a%20b/model.json?ref=main');
  expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  expect(await getFile(cfg, 'x.json', f)).toBeNull();
});
it('putFile: PUT with message, branch, sha and base64 content', async () => {
  const { f, calls } = fakeFetch([{ status: 200, body: {} }]);
  await putFile(cfg, 'projects/a/model.json', 'Zürich', 'abc', 'Layer BAT-1 → Fillers', f);
  expect(calls[0]!.init.method).toBe('PUT');
  const body = JSON.parse(String(calls[0]!.init.body));
  expect(body).toEqual({ message: 'Layer BAT-1 → Fillers', branch: 'main', sha: 'abc', content: utf8ToB64('Zürich') });
});
it('putFile of a new file without sha', async () => {
  const { f, calls } = fakeFetch([{ status: 201, body: {} }]);
  await putFile(cfg, 'n.json', 'x', null, 'm', f);
  expect('sha' in JSON.parse(String(calls[0]!.init.body))).toBe(false);
});
it('errors: 409/422 → ConflictError, 401/403 → AuthError', async () => {
  for (const [status, E] of [[409, ConflictError], [422, ConflictError], [401, AuthError], [403, AuthError]] as const) {
    const { f } = fakeFetch([{ status, body: { message: 'x' } }]);
    await expect(putFile(cfg, 'a', 'b', 'c', 'm', f)).rejects.toBeInstanceOf(E);
  }
  const { f } = fakeFetch([{ status: 401 }]);
  await expect(getFile(cfg, 'a', f)).rejects.toBeInstanceOf(AuthError);
});
it('checkRepo: requires write access', async () => {
  await expect(checkRepo(cfg, fakeFetch([{ status: 200, body: { permissions: { push: true } } }]).f)).resolves.toBeUndefined();
  await expect(checkRepo(cfg, fakeFetch([{ status: 200, body: { permissions: { push: false } } }]).f)).rejects.toBeInstanceOf(AuthError);
  await expect(checkRepo(cfg, fakeFetch([{ status: 404 }]).f)).rejects.toThrow(/not found/);
});

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
});
it('config: save, load, clear, broken → null, exception → null', () => {
  expect(loadGhConfig()).toBeNull();
  saveGhConfig(cfg);
  expect(loadGhConfig()).toEqual(cfg);
  clearGhConfig();
  expect(loadGhConfig()).toBeNull();
  store.set('fv:github', JSON.stringify({ owner: 'a', repo: '', branch: 'main', token: 't' }));
  expect(loadGhConfig()).toBeNull();
  (globalThis as any).localStorage.getItem = () => { throw new Error('blocked'); };
  expect(loadGhConfig()).toBeNull();
});
it('guessRepo from a GitHub Pages URL', () => {
  expect(guessRepo('https://szymon.github.io/furniture-viewer/#/p/tv-cabinet')).toEqual({ owner: 'szymon', repo: 'furniture-viewer' });
  expect(guessRepo('https://szymon.github.io/')).toEqual({ owner: 'szymon', repo: 'szymon.github.io' });
  expect(guessRepo('http://localhost:5173/')).toBeNull();
});
