import { DEFAULT_EDGE_STYLE, type EdgeStyle } from '../viewer/edges';

// settings shared by all projects
export interface Settings { edges: EdgeStyle }
export const DEFAULT_SETTINGS: Settings = { edges: { ...DEFAULT_EDGE_STYLE } };
const KEY = 'fv:settings';

const num = (v: unknown, lo: number, hi: number, def: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def;

export function loadSettings(): Settings {
  const d = DEFAULT_SETTINGS.edges;
  try {
    const raw = localStorage.getItem(KEY);
    const e = raw ? JSON.parse(raw)?.edges ?? {} : {};
    return { edges: { contrast: num(e.contrast, 0, 100, d.contrast), width: num(e.width, 1, 4, d.width) } };
  } catch {
    return { edges: { ...d } };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore silently
  }
}
