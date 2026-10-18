import type { LayerId, Model } from './schema';
import { codeModel } from './codes';

export class StaleError extends Error {}

// manual layer change straight in model.json: originalLayer = layer from the import (moving back removes it)
export function applyLayerEdit(model: Model, partId: string, name: string, layer: LayerId): Model {
  const part = model.parts.find((p) => p.id === partId);
  if (!part || part.name !== name) throw new StaleError('This part changed in the repository – reload the page');
  const orig = (part.meta.originalLayer as LayerId | undefined) ?? part.layer;
  const meta = { ...part.meta };
  if (layer === orig) delete meta.originalLayer;
  else meta.originalLayer = orig;
  const parts = model.parts.map((p) => (p.id === partId ? { ...p, layer, meta } : p));
  return codeModel({ ...model, parts }).model;      // a part moved into a cut layer gets a code
}
