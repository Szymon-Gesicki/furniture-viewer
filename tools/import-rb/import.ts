// Imports SketchUp scripts (.rb) into projects/<id>/model.json – without SketchUp, merging with the previous model.json.
//   npx tsx tools/import-rb/import.ts             all projects with an import.json
//   npx tsx tools/import-rb/import.ts --changed   only new ones or those whose .rb changed (GitHub Actions)
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { ModelSchema } from '../../src/model/schema';
import { codeModel } from '../../src/model/codes';
import { modelPath, writeModel } from '../build-models';
import { mergeImport } from '../../src/model/merge';

export const ImportSchema = z.object({
  source: z.string().min(1),                     // path relative to the repo root
  name: z.string(),
  description: z.string().default(''),
  importedSha: z.string().optional(),            // sha1 of the .rb content at the last import
});
export type RunRuby = (rbAbs: string, id: string, out: string, info: { name: string; description: string }) => void;

const ruby: RunRuby = (rb, id, out, info) => {
  const r = spawnSync('ruby', [join('tools', 'import-rb', 'export.rb'), rb, id, info.name, out, info.description], { encoding: 'utf8' });
  const err = (r.stderr ?? '').split('\n').filter((l) => l && !/warning|previous definition/.test(l)).join('\n');
  if (r.status !== 0) throw new Error(`import of ${id} failed:\n${err}`);
  if (err) console.warn(err);
};

export async function importProject(root: string, id: string, o: { changedOnly?: boolean; runRuby?: RunRuby } = {}): Promise<boolean> {
  const cfgFile = join(root, 'projects', id, 'import.json');
  const cfg = ImportSchema.parse(JSON.parse(readFileSync(cfgFile, 'utf8')));
  const rb = join(root, cfg.source);
  const sha = createHash('sha1').update(readFileSync(rb)).digest('hex');
  const mf = modelPath(root, id);
  if (o.changedOnly && existsSync(mf) && cfg.importedSha === sha) return false;

  const out = join(mkdtempSync(join(tmpdir(), 'furniture-import-')), `${id}.json`);
  (o.runRuby ?? ruby)(rb, id, out, { name: cfg.name, description: cfg.description });
  const fresh = ModelSchema.parse(JSON.parse(readFileSync(out, 'utf8')));
  const prev = existsSync(mf) ? ModelSchema.parse(JSON.parse(readFileSync(mf, 'utf8'))) : null;
  writeModel(mf, codeModel(mergeImport(prev, fresh, cfg)).model);
  writeFileSync(cfgFile, JSON.stringify({ ...cfg, importedSha: sha }, null, 2) + '\n');
  return true;
}

async function main() {
  const root = process.cwd();
  const changedOnly = process.argv.includes('--changed');
  const ids = readdirSync(join(root, 'projects')).filter((d) => existsSync(join(root, 'projects', d, 'import.json'))).sort();
  let n = 0;
  for (const id of ids) if (await importProject(root, id, { changedOnly })) { console.log(`Imported ${id}`); n++; }
  console.log(n ? `Imported ${n} projects` : 'No changes in .rb scripts');
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main().catch((e) => { console.error(e.message); process.exit(1); });
