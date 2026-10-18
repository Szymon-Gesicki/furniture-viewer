import { LAYERS, ModelSchema, type LayerId, type Model } from '../model/schema';
import { applyLayerEdit } from '../model/edits';
import { ConflictError, GhError, getFile, putFile } from './api';
import type { GhConfig } from './config';

export const modelFile = (projectId: string) => `projects/${projectId}/model.json`;

// the latest model.json from the repo (no waiting for a site rebuild); null when the project has no model.json
export async function loadRepoModel(cfg: GhConfig, projectId: string, f: typeof fetch = fetch): Promise<Model | null> {
  const file = await getFile(cfg, modelFile(projectId), f);
  return file ? ModelSchema.parse(JSON.parse(file.text)) : null;
}

// a layer change = a model.json commit; on a conflict (someone changed the file) one retry on the fresh version
export async function saveLayer(cfg: GhConfig, projectId: string, partId: string, name: string, layer: LayerId,
                                f: typeof fetch = fetch): Promise<Model> {
  for (let attempt = 0; ; attempt++) {
    const file = await getFile(cfg, modelFile(projectId), f);
    if (!file) throw new GhError(`Project ${projectId} has no model.json in the repository`);
    const next = applyLayerEdit(ModelSchema.parse(JSON.parse(file.text)), partId, name, layer);
    const part = next.parts.find((p) => p.id === partId)!;
    const label = LAYERS.find((l) => l.id === layer)?.label ?? layer;
    try {
      await putFile(cfg, modelFile(projectId), JSON.stringify(next, null, 2) + '\n', file.sha,
        `Layer ${part.meta.code ?? partId} → ${label} (${projectId})`, f);
      return next;
    } catch (e) {
      if (!(e instanceof ConflictError) || attempt > 0) throw e;
    }
  }
}
