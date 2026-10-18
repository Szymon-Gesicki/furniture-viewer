import { it, expect, beforeEach } from 'vitest';
import { loadState, saveState, type ViewState } from '../src/ui/storage';

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
  };
});

it('save and load give the same state', () => {
  const s: ViewState = { visibility: { carcass: true, front: false }, explode: 40, walls: 'xray' };
  saveState('kitchen', s);
  expect(store.has('fv:view:kitchen')).toBe(true);
  expect(loadState('kitchen')).toEqual(s);
});
it('no data → {}', () => expect(loadState('nic')).toEqual({}));
it('getItem throws → {}', () => {
  (globalThis as any).localStorage.getItem = () => { throw new Error('blocked'); };
  expect(loadState('kitchen')).toEqual({});
});
it('broken JSON → {}', () => {
  store.set('fv:view:kitchen', '{nie json');
  expect(loadState('kitchen')).toEqual({});
});
it('setItem throws → silent', () => {
  (globalThis as any).localStorage.setItem = () => { throw new Error('quota'); };
  expect(() => saveState('k', { visibility: {}, explode: 0, walls: 'visible' })).not.toThrow();
});
