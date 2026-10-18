import { readdirSync, existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { ModelSchema, type Model, LAYER_IDS } from '../src/model/schema';
import { CodeBookSchema, assignCodes, codeModel, emptyCodeBook, type CodeBook } from '../src/model/codes';

export type Importer = (absPath: string) => Promise<any>;
const nodeImport: Importer = (p) => import(pathToFileURL(p).href);

export function summarize(m: Pick<Model, 'id' | 'name' | 'description' | 'parts'>) {
  const present = new Set(m.parts.map((p) => p.layer));
  return { id: m.id, name: m.name, description: m.description, parts: m.parts.length,
           layers: LAYER_IDS.filter((l) => present.has(l)) };
}

// [folder, model.id]: the output file and the library link must point to the same project
export function checkIds(pairs: [string, string][]) {
  const seen = new Set<string>();
  for (const [dir, id] of pairs) {
    if (dir !== id) throw new Error(`projects/${dir}: model id "${id}" must match the folder name "${dir}"`);
    if (seen.has(id)) throw new Error(`projects/${dir}: duplicate id "${id}"`);
    seen.add(id);
  }
}

// projects written in code (project.ts): part codes live in projects/<id>/codes.json, because the model is rebuilt every time
export const codesPath = (root: string, id: string) => join(root, 'projects', id, 'codes.json');

export function loadCodeBook(root: string, id: string): CodeBook | null {
  const f = codesPath(root, id);
  if (!existsSync(f)) return null;
  try {
    return CodeBookSchema.parse(JSON.parse(readFileSync(f, 'utf8')));
  } catch (e) {
    throw new Error(`${f}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export const modelPath = (root: string, id: string) => join(root, 'projects', id, 'model.json');
export const writeModel = (file: string, m: Model) => writeFileSync(file, JSON.stringify(m, null, 2) + '\n');

// model.json is the source of truth (manual layers, codes); new parts get codes and the file is written back
export async function buildProject(root: string, id: string, importer: Importer = nodeImport): Promise<{ model: Model } | null> {
  const dir = join(root, 'projects', id);
  if (existsSync(join(dir, 'project.ts'))) {
    const src = ModelSchema.parse((await importer(resolve(dir, 'project.ts'))).default.toModel());
    checkIds([[id, src.id]]);
    const coded = assignCodes(src, loadCodeBook(root, id) ?? emptyCodeBook(id));
    if (coded.changed) writeFileSync(codesPath(root, id), JSON.stringify(coded.book, null, 2) + '\n');
    return { model: coded.model };
  }
  if (!existsSync(modelPath(root, id))) return null;
  const src = ModelSchema.parse(JSON.parse(readFileSync(modelPath(root, id), 'utf8')));
  checkIds([[id, src.id]]);
  const r = codeModel(src);
  if (r.changed) writeModel(modelPath(root, id), r.model);
  return { model: r.model };
}

async function main() {
  const root = process.cwd();
  rmSync('public/projects', { recursive: true, force: true });
  mkdirSync('public/projects', { recursive: true });
  const index = [];
  for (const id of readdirSync('projects').sort()) {
    const r = await buildProject(root, id);
    if (!r) continue;
    writeFileSync(`public/projects/${id}.json`, JSON.stringify(r.model));
    index.push(summarize(r.model));
  }
  writeFileSync('public/projects/index.json', JSON.stringify(index, null, 2));
  console.log(`Built ${index.length} projects`);
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
