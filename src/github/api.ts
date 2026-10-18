import type { GhConfig } from './config';

// GitHub Contents API – the repository as the database (reading and writing files = commits)
export class AuthError extends Error {}
export class ConflictError extends Error {}
export class GhError extends Error {}

const API = 'https://api.github.com';
type Fetch = typeof fetch;

export function utf8ToB64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function b64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const headers = (cfg: GhConfig) => ({
  Authorization: `Bearer ${cfg.token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});
const repoUrl = (cfg: GhConfig) => `${API}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`;
const contentsUrl = (cfg: GhConfig, path: string) => `${repoUrl(cfg)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;

async function fail(res: Response): Promise<never> {
  const msg = ((await res.json().catch(() => ({}))) as { message?: string }).message ?? `HTTP ${res.status}`;
  if (res.status === 401 || res.status === 403) throw new AuthError(`No access to the repository (${msg}) – check the token`);
  if (res.status === 404) throw new GhError('The token cannot see the repository (or it does not exist) – check the token and the repository name');
  if (res.status === 409 || res.status === 422) throw new ConflictError(`The file changed in the repository (${msg})`);
  throw new GhError(`GitHub: ${msg}`);
}

export async function getFile(cfg: GhConfig, path: string, f: Fetch = fetch): Promise<{ text: string; sha: string } | null> {
  const res = await f(`${contentsUrl(cfg, path)}?ref=${encodeURIComponent(cfg.branch)}`, { headers: headers(cfg), cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) return fail(res);
  const j = (await res.json()) as { content: string; sha: string };
  return { text: b64ToUtf8(j.content), sha: j.sha };
}

export async function putFile(cfg: GhConfig, path: string, text: string, sha: string | null, message: string, f: Fetch = fetch): Promise<void> {
  const body = { message, branch: cfg.branch, ...(sha ? { sha } : {}), content: utf8ToB64(text) };
  const res = await f(contentsUrl(cfg, path), { method: 'PUT', headers: headers(cfg), body: JSON.stringify(body) });
  if (!res.ok) return fail(res);
}

export async function checkRepo(cfg: GhConfig, f: Fetch = fetch): Promise<void> {
  const res = await f(repoUrl(cfg), { headers: headers(cfg) });
  if (res.status === 404) throw new GhError(`Repository ${cfg.owner}/${cfg.repo} not found (or the token cannot see it)`);
  if (!res.ok) return fail(res);
  const j = (await res.json()) as { permissions?: { push?: boolean } };
  if (!j.permissions?.push) throw new AuthError('The token has no write access (Contents: Read and write)');
}
