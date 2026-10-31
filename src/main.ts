import './styles.css';
import { ModelSchema, type Model } from './model/schema';
import { libraryPage } from './ui/libraryPage';
import { viewerPage, type EditMode, type ViewerPage } from './ui/viewerPage';
import { loadGhConfig } from './github/config';
import { loadRepoModel } from './github/project';
import { checkRepo } from './github/api';
import { parseRoute } from './ui/route';
import { loadRepoOverrides } from './github/drilling';
import { parseOverrides } from './drilling/overrides';
import { emptyOverrides, type DrillOverrides } from './drilling/schema';
import { drillSheetPage } from './ui/drillSheetPage';
import { buildPage } from './ui/buildPage';
import { drillSession } from './ui/drillSession';

let current: { dispose(): void } | null = null;
let viewer: { id: string; page: ViewerPage } | null = null;   // open project – switching cabinets without rebuilding the scene
let seq = 0;
async function route() {
  const r = parseRoute(location.hash);
  if (r.kind === 'project' && viewer?.id === r.id) { viewer.page.setUnit(r.unit); return; }
  current?.dispose(); current = null; viewer = null;
  const my = ++seq;                              // fast switching: an older load never overwrites a newer one
  const app = document.getElementById('app')!; app.replaceChildren();
  if (r.kind === 'library') { current = libraryPage(app); return; }
  try {
    const { model, edit, drill } = await loadProject(r.id);
    if (my !== seq) return;
    const session = drillSession(model, drill, edit);
    if (r.kind === 'drill') { current = drillSheetPage(app, model, session, r.target); return; }
    if (r.kind === 'build') { current = buildPage(app, model, session, r.unit); return; }
    const page = viewerPage(app, model, r.unit, edit, session);
    current = page;
    viewer = { id: r.id, page };
  } catch (e) {
    console.error(e);
    if (my !== seq) return;
    const p = document.createElement('p');
    p.className = 'error';
    p.append(`Could not load project ${r.id}. `);
    const a = document.createElement('a'); a.href = '#/'; a.textContent = 'Back to the library';
    p.append(a);
    app.replaceChildren(p);
  }
}
// with a token: the latest model.json straight from the repo (changes show up immediately, no waiting for a rebuild)
async function loadProject(id: string): Promise<{ model: Model; edit: EditMode; drill: DrillOverrides }> {
  const cfg = loadGhConfig();
  let repoError = '';
  if (cfg) {
    try {
      const m = await loadRepoModel(cfg, id);
      if (m) return { model: m, edit: { mode: 'github', cfg }, drill: await loadRepoOverrides(cfg, id) };
      await checkRepo(cfg);                       // 404 = no file or the token cannot see the repo – tell them apart
    } catch (e) {
      console.error(e);
      repoError = e instanceof Error ? e.message : String(e);
    }
  }
  const res = await fetch(`projects/${encodeURIComponent(id)}.json`);
  if (!res.ok) throw new Error(String(res.status));
  const model = ModelSchema.parse(await res.json());
  const reason = model.source.startsWith('dsl:') ? 'Project defined in code (project.ts) – change the layer in the code'
    : repoError ? `Saving unavailable: ${repoError}`
    : 'Add a GitHub token in Settings (library) to change layers';
  return { model, edit: { mode: 'off', reason }, drill: await loadPublicOverrides(id) };
}

// drilling exceptions published by the build next to the model; none (or a broken file) = automatic rules
async function loadPublicOverrides(id: string): Promise<DrillOverrides> {
  try {
    const res = await fetch(`projects/${encodeURIComponent(id)}.drilling.json`);
    const json = res.ok && (res.headers.get('content-type') ?? '').includes('json');   // dev server: index.html for a missing file
    return json ? parseOverrides(await res.text()) : emptyOverrides();
  } catch (e) {
    console.error(e);
    return emptyOverrides();
  }
}

addEventListener('hashchange', route);
route();
