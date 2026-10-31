import { DrillOverridesSchema, emptyOverrides, type DrillOverrides } from './schema';

export const drillingFile = (projectId: string) => `projects/${projectId}/drilling.json`;

export function parseOverrides(text: string | null): DrillOverrides {
  if (!text) return emptyOverrides();
  return DrillOverridesSchema.parse(JSON.parse(text));
}
export const serializeOverrides = (o: DrillOverrides) => JSON.stringify(o, null, 2) + '\n';

// one edit of drilling.json; null / undefined value = back to the automatic rule
export type DrillEdit =
  | { kind: 'hingeSide'; name: string; value: 'L' | 'P' | null }
  | { kind: 'shelfMode'; name: string; value: 'fixed' | 'adjustable' | null }
  | { kind: 'hingeZ'; name: string; value: number[] | null }
  | { kind: 'extraShelfRows'; value: boolean | undefined }
  | { kind: 'param'; group: string; key: string; value: number | null }
  | { kind: 'notes'; name: string; value: string | null }          // name = catalogue item id
  | { kind: 'partNotes'; name: string; value: string | null }      // name = part code
  | { kind: 'done'; value: Record<string, boolean> };              // assembly progress (several steps at once)

export function applyDrillEdit(o: DrillOverrides, e: DrillEdit): DrillOverrides {
  const next: DrillOverrides = { ...o, hingeSide: { ...o.hingeSide }, shelfMode: { ...o.shelfMode }, hingeZ: { ...o.hingeZ },
    params: Object.fromEntries(Object.entries(o.params ?? {}).map(([g, v]) => [g, { ...v }])), notes: { ...o.notes },
    partNotes: { ...o.partNotes }, done: { ...o.done } };
  if (e.kind === 'param') {
    const g = { ...next.params[e.group] };
    if (e.value === null) delete g[e.key];
    else g[e.key] = e.value;
    if (Object.keys(g).length) next.params[e.group] = g;
    else delete next.params[e.group];
    return next;
  }
  if (e.kind === 'done') {
    for (const [k, v] of Object.entries(e.value)) if (v) next.done[k] = true; else delete next.done[k];
    return next;
  }
  if (e.kind === 'extraShelfRows') {
    if (e.value === undefined) delete next.extraShelfRows;
    else next.extraShelfRows = e.value;
    return next;
  }
  const map = next[e.kind] as Record<string, unknown>;
  if (e.value === null || e.value === '') delete map[e.name];
  else map[e.name] = e.value;
  return next;
}

export function describeEdit(e: DrillEdit): string {
  if (e.kind === 'extraShelfRows') return `extra shelf-pin rows ${e.value === undefined ? 'auto' : e.value ? 'on' : 'off'}`;
  if (e.kind === 'param') return `parameter ${e.group}.${e.key} → ${e.value ?? 'default'}`;
  if (e.kind === 'done') return `assembly progress (${Object.keys(e.value).length} steps)`;
  if (e.kind === 'notes' || e.kind === 'partNotes') return `${e.kind === 'notes' ? 'montage notes' : 'board note'} ${e.name}`;
  const v = e.value === null ? 'auto' : Array.isArray(e.value) ? e.value.join(', ') : e.value;
  return `${e.kind} ${e.name.split(' (')[0]} → ${v}`;
}

// "100, 600 1012" → [100, 600, 1012]; null when invalid
export function parseHingeZ(s: string): number[] | null {
  const parts = s.split(/[\s,;]+/).filter(Boolean);
  if (!parts.length) return null;
  const nums = parts.map(Number);
  return nums.every((n) => Number.isFinite(n) && n > 0) ? nums.sort((a, b) => a - b) : null;
}
