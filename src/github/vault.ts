import { z } from 'zod';
import type { GhConfig } from './config';

// Password login without a server: the GitHub config (incl. token) is encrypted with a password
// (PBKDF2-SHA256 → AES-256-GCM) and published as public/login.json. Only the ciphertext is public,
// so the security of the token depends on the strength of the password.
export const VaultSchema = z.object({
  v: z.literal(1),
  iterations: z.number().int().positive(),
  salt: z.string(),
  iv: z.string(),
  data: z.string(),
});
export type Vault = z.infer<typeof VaultSchema>;
export class WrongPasswordError extends Error {}

export const DEFAULT_ITERATIONS = 600_000;
export const passwordProblem = (p: string) => (p.length === 0 ? 'Enter a password' : null);

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(password: string, salt: Uint8Array, iterations: number, usage: KeyUsage): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base,
    { name: 'AES-GCM', length: 256 }, false, [usage]);
}

export async function encryptVault(cfg: GhConfig, password: string, iterations = DEFAULT_ITERATIONS): Promise<Vault> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await key(password, salt, iterations, 'encrypt');
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(cfg))));
  return { v: 1, iterations, salt: b64(salt), iv: b64(iv), data: b64(data) };
}

export async function decryptVault(vault: Vault, password: string): Promise<GhConfig> {
  const k = await key(password, unb64(vault.salt), vault.iterations, 'decrypt');
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(vault.iv) }, k, unb64(vault.data));
  } catch {
    throw new WrongPasswordError('Wrong password');
  }
  return JSON.parse(new TextDecoder().decode(plain)) as GhConfig;
}
