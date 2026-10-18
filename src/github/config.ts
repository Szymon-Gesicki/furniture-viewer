// GitHub repo access: the token lives only in this browser (localStorage), never in the repo
export interface GhConfig { owner: string; repo: string; branch: string; token: string }
const KEY = 'fv:github';
// the project repository (not secret); on GitHub Pages it is guessed from the page URL
export const DEFAULT_REPO = { owner: 'Szymon-Gesicki', repo: 'furniture-viewer', branch: 'main' };

export function loadGhConfig(): GhConfig | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    const ok = v && ['owner', 'repo', 'branch', 'token'].every((k) => typeof v[k] === 'string' && v[k].trim() !== '');
    return ok ? { owner: v.owner, repo: v.repo, branch: v.branch, token: v.token } : null;
  } catch {
    return null;
  }
}
export function saveGhConfig(c: GhConfig): void {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode */ }
}
export function clearGhConfig(): void {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
}

// https://<owner>.github.io/<repo>/ → { owner, repo }
export function guessRepo(href: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(href);
    if (!u.hostname.endsWith('.github.io')) return null;
    const owner = u.hostname.slice(0, -'.github.io'.length);
    const repo = u.pathname.split('/').filter(Boolean)[0] ?? u.hostname;
    return { owner, repo };
  } catch {
    return null;
  }
}
