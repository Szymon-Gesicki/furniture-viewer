import { it, expect, beforeEach } from 'vitest';
import { VAULT_PATH, fetchVault, loginWithPassword, saveLoginPassword } from '../src/github/login';
import { encryptVault, WrongPasswordError } from '../src/github/vault';
import { b64ToUtf8 } from '../src/github/api';
import { loadGhConfig } from '../src/github/config';

const cfg = { owner: 'o', repo: 'r', branch: 'main', token: 'github_pat_X' };
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  (globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
});
const site = (body: string | null) => (async (url: string) =>
  url === 'login.json' && body !== null ? new Response(body, { status: 200 }) : new Response('', { status: 404 })) as unknown as typeof fetch;

it('fetchVault: no file or invalid file → null', async () => {
  expect(await fetchVault(site(null))).toBeNull();
  expect(await fetchVault(site('{"v":2}'))).toBeNull();
  const v = await encryptVault(cfg, 'correct horse battery', 1000);
  expect(await fetchVault(site(JSON.stringify(v)))).toEqual(v);
});
it('loginWithPassword: right password stores the config; wrong password → WrongPasswordError; no vault → clear error', async () => {
  const f = site(JSON.stringify(await encryptVault(cfg, 'correct horse battery', 1000)));
  await expect(loginWithPassword('nope nope nope', f)).rejects.toBeInstanceOf(WrongPasswordError);
  expect(loadGhConfig()).toBeNull();
  expect(await loginWithPassword('correct horse battery', f)).toEqual(cfg);
  expect(loadGhConfig()).toEqual(cfg);
  await expect(loginWithPassword('x', site(null))).rejects.toThrow(/not set up/);
});
it('saveLoginPassword: commits public/login.json with the encrypted config (sha when it exists); weak password rejected', async () => {
  const puts: any[] = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    if ((init.method ?? 'GET') === 'GET') return new Response(JSON.stringify({ content: btoa('{}'), sha: 'old' }), { status: 200 });
    puts.push({ url, ...JSON.parse(String(init.body)) });
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
  await expect(saveLoginPassword(cfg, 'short', f)).rejects.toThrow(/12/);
  await saveLoginPassword(cfg, 'correct horse battery', f, 1000);
  expect(puts[0].url).toContain(`/contents/${VAULT_PATH}`);
  expect(puts[0].sha).toBe('old');
  expect(puts[0].message).toBe('Update password login');
  const saved = JSON.parse(b64ToUtf8(puts[0].content));
  expect(JSON.stringify(saved)).not.toContain('github_pat_X');
  expect(await loginWithPassword('correct horse battery', site(JSON.stringify(saved)))).toEqual(cfg);
});
