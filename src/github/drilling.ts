import { applyDrillEdit, describeEdit, drillingFile, parseOverrides, serializeOverrides, type DrillEdit } from '../drilling/overrides';
import type { DrillOverrides } from '../drilling/schema';
import { ConflictError, getFile, putFile } from './api';
import type { GhConfig } from './config';

// drilling.json straight from the repo; no file = no exceptions
export async function loadRepoOverrides(cfg: GhConfig, projectId: string, f: typeof fetch = fetch): Promise<DrillOverrides> {
  const file = await getFile(cfg, drillingFile(projectId), f);
  return parseOverrides(file?.text ?? null);
}

// a drilling exception = a drilling.json commit (created on first use); one retry on a conflict, like layer edits
export async function saveDrillEdit(cfg: GhConfig, projectId: string, edit: DrillEdit, f: typeof fetch = fetch): Promise<DrillOverrides> {
  for (let attempt = 0; ; attempt++) {
    const file = await getFile(cfg, drillingFile(projectId), f);
    const next = applyDrillEdit(parseOverrides(file?.text ?? null), edit);
    try {
      await putFile(cfg, drillingFile(projectId), serializeOverrides(next), file?.sha ?? null,
        `Drilling: ${describeEdit(edit)} (${projectId})`, f);
      return next;
    } catch (e) {
      if (!(e instanceof ConflictError) || attempt > 0) throw e;
    }
  }
}
