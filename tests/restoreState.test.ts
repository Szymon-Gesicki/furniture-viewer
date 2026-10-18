import { it, expect } from 'vitest';
import { restoreState } from '../src/ui/storage';

it('nothing saved: default layers, slider 0, walls in x-ray', () => {
  expect(restoreState({}, ['carcass', 'assembly', 'room'])).toEqual({
    visibility: { carcass: true, assembly: false, room: true }, explode: 0, walls: 'xray' });
});
it('saved values override defaults, unknown layers dropped, bad values corrected', () => {
  const s = restoreState({ visibility: { carcass: false, front: true, xxx: true } as any, explode: 250, walls: 'bad' as any },
    ['carcass', 'room']);
  expect(s).toEqual({ visibility: { carcass: false, room: true }, explode: 100, walls: 'xray' });
});
it('hidden walls → room invisible', () => {
  expect(restoreState({ walls: 'hidden' }, ['carcass', 'room']).visibility.room).toBe(false);
});
