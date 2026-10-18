import { MOUSE } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// left = orbit, middle button and right = pan, wheel = zoom towards the cursor (like SketchUp)
export function applyControlScheme(c: Pick<OrbitControls, 'mouseButtons' | 'zoomToCursor'>): void {
  c.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN };
  c.zoomToCursor = true;
}

// OrbitControls swaps PAN↔ROTATE with Shift/Ctrl/Cmd; so that Shift + middle still pans, middle gets ROTATE then
export const middleAction = (modifier: boolean): MOUSE => (modifier ? MOUSE.ROTATE : MOUSE.PAN);
