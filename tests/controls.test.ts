import { it, expect } from 'vitest';
import { MOUSE } from 'three';
import { applyControlScheme, middleAction } from '../src/viewer/controls';

it('left orbits, middle and right pan, zoom to cursor', () => {
  const c = { mouseButtons: {}, zoomToCursor: false } as any;
  applyControlScheme(c);
  expect(c.mouseButtons).toEqual({ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN });
  expect(c.zoomToCursor).toBe(true);
});
it('middle button with Shift/Ctrl/Cmd also pans (OrbitControls swaps the action with a modifier)', () => {
  expect(middleAction(false)).toBe(MOUSE.PAN);
  expect(middleAction(true)).toBe(MOUSE.ROTATE);
});
