import type { Model } from '../model/schema';
import { planDrilling } from '../drilling/plan';
import type { DrillOverrides, DrillPlan } from '../drilling/schema';
import { applyDrillEdit, type DrillEdit } from '../drilling/overrides';
import { saveDrillEdit } from '../github/drilling';
import type { EditMode } from './viewerPage';

export interface DrillSession {
  readonly overrides: DrillOverrides; readonly plan: DrillPlan;
  readonly enabled: boolean; readonly hint?: string;
  save(e: DrillEdit): Promise<void>;              // commit drilling.json (GitHub), then recompute the plan
  readonly syncError: string;                     // last failed background commit of the assembly progress
  onChange(cb: () => void): () => void;
  recompute(): void;                              // the model changed in place (layer edit)
}

const doneKey = (id: string) => `fv:done:${id}`;
export function loadDoneCache(id: string): Record<string, boolean> {
  try { const v = JSON.parse(localStorage.getItem(doneKey(id)) ?? '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
function saveDoneCache(id: string, done: Record<string, boolean>) {
  try { localStorage.setItem(doneKey(id), JSON.stringify(done)); } catch { /* offline cache is optional */ }
}

export function drillSession(model: Model, initial: DrillOverrides, edit: EditMode): DrillSession {
  // assembly progress: repo state + whatever was ticked on this device (offline / without a token)
  let overrides: DrillOverrides = { ...initial, done: { ...loadDoneCache(model.id), ...initial.done } };
  let plan = planDrilling(model, overrides);
  const subs = new Set<() => void>();
  const changed = () => { plan = planDrilling(model, overrides); subs.forEach((f) => f()); };
  // ticking "Zrobione" is instant and local; the repo gets one commit per burst of ticks
  let pending: Record<string, boolean> = {}, timer: ReturnType<typeof setTimeout> | null = null, syncError = '';
  const flush = async () => {
    timer = null;
    if (edit.mode !== 'github' || !Object.keys(pending).length) return;
    const batch = pending; pending = {};
    try {
      const saved = await saveDrillEdit(edit.cfg, model.id, { kind: 'done', value: batch });
      overrides = { ...saved, done: withPending(saved.done) };
      syncError = '';
    } catch (e) {
      pending = { ...batch, ...pending };
      syncError = e instanceof Error ? e.message : String(e);
    }
    subs.forEach((f) => f());
  };
  // repo progress + ticks not committed yet (a pending false removes the step)
  const withPending = (done: Record<string, boolean>) => {
    const out = { ...done };
    for (const [k, v] of Object.entries(pending)) if (v) out[k] = true; else delete out[k];
    return out;
  };
  return {
    get overrides() { return overrides; },
    get plan() { return plan; },
    enabled: edit.mode === 'github',
    hint: edit.mode === 'off' ? edit.reason : undefined,
    async save(e) {
      if (e.kind === 'done') {                    // progress is kept locally even without a token
        overrides = applyDrillEdit(overrides, e);
        saveDoneCache(model.id, overrides.done);
        pending = { ...pending, ...e.value };
        if (edit.mode === 'github') { if (timer) clearTimeout(timer); timer = setTimeout(() => void flush(), 2000); }
        subs.forEach((f) => f());
        return;
      }
      if (edit.mode !== 'github') throw new Error(edit.reason);
      const saved = await saveDrillEdit(edit.cfg, model.id, e);
      overrides = { ...saved, done: withPending({ ...overrides.done, ...saved.done }) };
      changed();
    },
    get syncError() { return syncError; },
    onChange(cb) { subs.add(cb); return () => subs.delete(cb); },
    recompute: changed,
  };
}
