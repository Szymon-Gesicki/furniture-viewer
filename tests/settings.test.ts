import { it, expect, beforeEach } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../src/ui/settings';

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
  };
});

it('nothing saved: 70 % and 2 px', () => expect(loadSettings()).toEqual({ edges: { contrast: 70, width: 2 } }));
it('save and load under fv:settings', () => {
  saveSettings({ edges: { contrast: 30, width: 3.5 } });
  expect(JSON.parse(store.get('fv:settings')!)).toEqual({ edges: { contrast: 30, width: 3.5 } });
  expect(loadSettings()).toEqual({ edges: { contrast: 30, width: 3.5 } });
});
it('out-of-range values are clamped', () => {
  store.set('fv:settings', JSON.stringify({ edges: { contrast: 250, width: 0 } }));
  expect(loadSettings().edges).toEqual({ contrast: 100, width: 1 });
});
it('wrong types → defaults', () => {
  store.set('fv:settings', JSON.stringify({ edges: { contrast: '50', width: null } }));
  expect(loadSettings().edges).toEqual({ contrast: 70, width: 2 });
});
it('broken JSON and getItem exception → defaults', () => {
  store.set('fv:settings', '{bad');
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  (globalThis as any).localStorage.getItem = () => { throw new Error('blocked'); };
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});
it('setItem throws → silent', () => {
  (globalThis as any).localStorage.setItem = () => { throw new Error('quota'); };
  expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
});
it('returns a copy – changing the result does not affect the defaults', () => {
  loadSettings().edges.contrast = 5;
  expect(DEFAULT_SETTINGS.edges.contrast).toBe(70);
});
