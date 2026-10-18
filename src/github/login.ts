import { getFile, putFile } from './api';
import { saveGhConfig, type GhConfig } from './config';
import { DEFAULT_ITERATIONS, VaultSchema, decryptVault, encryptVault, passwordProblem, type Vault } from './vault';

// the encrypted config is published with the site (public/ → dist/), so every device can log in with the password
export const VAULT_PATH = 'public/login.json';

export async function fetchVault(f: typeof fetch = fetch): Promise<Vault | null> {
  try {
    const res = await f('login.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const r = VaultSchema.safeParse(await res.json());
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export async function loginWithPassword(password: string, f: typeof fetch = fetch): Promise<GhConfig> {
  const vault = await fetchVault(f);
  if (!vault) throw new Error('Password login is not set up yet – paste a token in Settings once and set a password');
  const cfg = await decryptVault(vault, password);
  saveGhConfig(cfg);
  return cfg;
}

// encrypts the current config with the password and commits it; the site shows it after the next rebuild
export async function saveLoginPassword(cfg: GhConfig, password: string, f: typeof fetch = fetch,
                                        iterations = DEFAULT_ITERATIONS): Promise<void> {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const vault = await encryptVault(cfg, password, iterations);
  const cur = await getFile(cfg, VAULT_PATH, f);
  await putFile(cfg, VAULT_PATH, JSON.stringify(vault, null, 2) + '\n', cur?.sha ?? null, 'Update password login', f);
}
