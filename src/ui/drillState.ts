import { HW_GROUPS } from '../drilling/catalog';

// Drilling layer view state per project (browser only): off by default, every hardware group on, fronts solid
export interface DrillView { on: boolean; groups: Record<string, boolean>; xray: boolean }
const key = (id: string) => `fv:drill:${id}`;

export function loadDrillView(id: string): DrillView {
  const groups = Object.fromEntries(HW_GROUPS.map((g) => [g.id, true]));
  let v: any = null;
  try { v = JSON.parse(localStorage.getItem(key(id)) ?? 'null'); } catch { v = null; }
  if (v && typeof v.groups === 'object' && v.groups) for (const g of HW_GROUPS) if (typeof v.groups[g.id] === 'boolean') groups[g.id] = v.groups[g.id];
  return { on: v?.on === true, groups, xray: v?.xray === true };
}

export function saveDrillView(id: string, v: DrillView): void {
  try {
    localStorage.setItem(key(id), JSON.stringify(v));
  } catch {
    // ignore silently
  }
}
