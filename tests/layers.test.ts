import { it, expect } from 'vitest';
import { defaultVisibility, toggle, solo } from '../src/viewer/layers';
it('assembly hidden by default, everything else visible', () => {
  const v = defaultVisibility(['carcass', 'assembly', 'room']);
  expect(v).toEqual({ carcass: true, assembly: false, room: true });
});
it('toggle and solo', () => {
  const v = { carcass: true, front: true, room: true };
  expect(toggle(v, 'front')).toEqual({ carcass: true, front: false, room: true });
  expect(solo(v, 'carcass')).toEqual({ carcass: true, front: false, room: false });
});
