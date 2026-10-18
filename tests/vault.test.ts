import { it, expect } from 'vitest';
import { VaultSchema, WrongPasswordError, decryptVault, encryptVault, passwordProblem } from '../src/github/vault';

const cfg = { owner: 'Szymon-Gesicki', repo: 'furniture-viewer', branch: 'main', token: 'github_pat_ABC123' };
const FAST = 1000;   // fewer PBKDF2 rounds to keep the tests quick; production uses the default

it('round trip: the right password gives back the full config', async () => {
  const v = await encryptVault(cfg, 'correct horse battery staple', FAST);
  expect(VaultSchema.parse(v)).toEqual(v);
  expect(JSON.stringify(v)).not.toContain('github_pat_ABC123');
  expect(await decryptVault(v, 'correct horse battery staple')).toEqual(cfg);
});
it('wrong password → WrongPasswordError', async () => {
  const v = await encryptVault(cfg, 'correct horse battery staple', FAST);
  await expect(decryptVault(v, 'wrong password here')).rejects.toBeInstanceOf(WrongPasswordError);
});
it('tampered data → WrongPasswordError (authenticated encryption)', async () => {
  const v = await encryptVault(cfg, 'correct horse battery staple', FAST);
  const d = Buffer.from(v.data, 'base64'); d[0]! ^= 1;
  await expect(decryptVault({ ...v, data: d.toString('base64') }, 'correct horse battery staple')).rejects.toBeInstanceOf(WrongPasswordError);
});
it('fresh salt and IV every time; the round count is stored', async () => {
  const a = await encryptVault(cfg, 'correct horse battery staple', FAST);
  const b = await encryptVault(cfg, 'correct horse battery staple', FAST);
  expect(a.salt).not.toBe(b.salt);
  expect(a.iv).not.toBe(b.iv);
  expect(a.iterations).toBe(FAST);
  expect((await encryptVault(cfg, 'correct horse battery staple')).iterations).toBeGreaterThanOrEqual(600000);
});
it('password rules: any non-empty password', () => {
  expect(passwordProblem('')).toMatch(/password/i);
  expect(passwordProblem('abc')).toBeNull();
  expect(passwordProblem('correct horse battery staple')).toBeNull();
});
