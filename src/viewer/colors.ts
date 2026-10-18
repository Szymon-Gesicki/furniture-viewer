import { Color } from 'three';
export const darker = (hex: string, k = 0.6) => new Color(hex).multiplyScalar(k);
export const ACCENT = new Color('#2f6f6a');
