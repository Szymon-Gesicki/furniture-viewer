import { ModelSchema } from '../model/schema';
import { codeModel } from '../model/codes';
import { mergeImport } from '../model/merge';
import { AuthError, ConflictError, GhError, getFile, putFile } from './api';
import type { GhConfig } from './config';

export interface UploadFile { path: string; text: string; keepImported?: boolean }
type Plan = { files: UploadFile[] } | { error: string };

// what to write to the repo for an uploaded file: .rb (imported by GitHub Actions), model.json or project.ts (DSL)
export function planUpload(id: string, fileName: string, text: string, info: { name: string; description: string }): Plan {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || id === 'index') return { error: 'Invalid id: lowercase letters, digits and hyphens, e.g. bathroom-cabinet' };
  const dir = `projects/${id}`;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.rb')) {
    return { files: [
      { path: `${dir}/source.rb`, text },
      { path: `${dir}/import.json`, text: JSON.stringify({ source: `${dir}/source.rb`, ...info }, null, 2) + '\n', keepImported: true },
    ] };
  }
  if (lower.endsWith('.json')) {
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { return { error: 'The file is not valid JSON' }; }
    const r = ModelSchema.safeParse({ ...(raw as object), id, name: info.name, description: info.description });
    if (!r.success) return { error: `This is not a valid model.json: ${r.error.issues[0]?.path.join('.')} – ${r.error.issues[0]?.message}` };
    return { files: [{ path: `${dir}/model.json`, text: JSON.stringify(r.data, null, 2) + '\n' }] };
  }
  if (lower.endsWith('.ts')) return { files: [{ path: `${dir}/project.ts`, text }] };
  return { error: 'Supported files: .rb, model.json or project.ts' };
}

// writes the files as commits; existing files are overwritten (sha) and import.json keeps `importedSha`,
// so GitHub Actions re-imports the .rb only when its content changed
export async function uploadProject(cfg: GhConfig, id: string, files: UploadFile[], f: typeof fetch = fetch): Promise<{ existed: boolean }> {
  let existed = false;
  for (const file of files) {
    for (let attempt = 0; ; attempt++) {
      try {
        const cur = await getFile(cfg, file.path, f);
        if (cur) existed = true;
        let text = file.text;
        if (file.keepImported && cur) {
          const prev = JSON.parse(cur.text) as { importedSha?: string };
          if (prev.importedSha) text = JSON.stringify({ ...JSON.parse(text), importedSha: prev.importedSha }, null, 2) + '\n';
        }
        if (file.path.endsWith('/model.json') && cur) {
          // a new model.json for an existing project: manual layers and part codes carry over by name
          const prev = ModelSchema.parse(JSON.parse(cur.text));
          const up = ModelSchema.parse(JSON.parse(text));
          text = JSON.stringify(codeModel(mergeImport(prev, up, { name: up.name, description: up.description })).model, null, 2) + '\n';
        }
        await putFile(cfg, file.path, text, cur?.sha ?? null, `Project ${id}: ${file.path.split('/').pop()}`, f);
        break;
      } catch (e) {
        if (e instanceof ConflictError && attempt === 0) continue;   // quick consecutive commits: fresh sha and try again
        const msg = `Could not save ${file.path}: ${e instanceof Error ? e.message : String(e)}`;
        throw e instanceof AuthError ? new AuthError(msg) : new GhError(msg);
      }
    }
  }
  return { existed };
}

export async function projectExists(cfg: GhConfig, id: string, f: typeof fetch = fetch): Promise<boolean> {
  for (const name of ['model.json', 'import.json', 'project.ts']) if (await getFile(cfg, `projects/${id}/${name}`, f)) return true;
  return false;
}
