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

it('drilling view: off by default with every hardware group on; invalid values dropped; round trip', async () => {
  const { loadDrillView, saveDrillView } = await import('../src/ui/drillState');
  const d = loadDrillView('kitchen');
  expect([d.on, d.xray]).toEqual([false, false]);
  expect(Object.values(d.groups).every(Boolean)).toBe(true);
  store.set('fv:drill:kitchen', JSON.stringify({ on: 'yes', groups: { shelf: false, hinge: 3, bogus: false }, xray: true }));
  const e = loadDrillView('kitchen');
  expect([e.on, e.groups.shelf, e.groups.hinge, 'bogus' in e.groups, e.xray]).toEqual([false, false, true, false, true]);
  saveDrillView('kitchen', { ...e, on: true });
  expect(loadDrillView('kitchen')).toEqual({ ...e, on: true });
});
