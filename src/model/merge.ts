import type { Model, Part } from './schema';

// fresh .rb import + previous model.json: manual layers and codes carry over by part name
// (the importer renumbers ids, so ids are not stable; parts with the same name are paired in order)
export function mergeImport(prev: Model | null, fresh: Model, info: { name: string; description: string }): Model {
  const pool = new Map<string, Part[]>();
  for (const p of prev?.parts ?? []) pool.set(p.name, [...(pool.get(p.name) ?? []), p]);
  const parts = fresh.parts.map((p) => {
    const old = pool.get(p.name)?.shift();
    if (!old) return p;
    const meta = { ...p.meta };
    if (typeof old.meta.code === 'string') meta.code = old.meta.code;
    let layer = p.layer;
    if (typeof old.meta.originalLayer === 'string') {
      layer = old.layer;                          // a manually set layer wins over the import
      if (layer !== p.layer) meta.originalLayer = p.layer;
    }
    return { ...p, layer, meta };
  });
  return { ...fresh, name: info.name, description: info.description, parts, ...(prev?.codes ? { codes: prev.codes } : {}) };
}
