import { LAYERS } from '../model/schema';
import { partsCount } from './format';
import { loadGhConfig } from '../github/config';
import { openAddProject, openSettings } from './githubDialogs';

interface Entry { id: string; name: string; description: string; parts: number; layers: string[] }

const readThumb = (id: string) => {
  try { return localStorage.getItem(`thumb:${id}`); } catch { return null; }
};

export function libraryPage(el: HTMLElement): { dispose(): void } {
  const root = document.createElement('main');
  root.className = 'library';
  root.innerHTML = '<h1>Furniture viewer</h1><p class="lead">Board furniture projects – pick one to view it in 3D.</p>';
  // toolbar: GitHub connection (saving changes) and adding projects
  const tools = document.createElement('div');
  tools.className = 'lib-tools';
  const renderTools = () => {
    const cfg = loadGhConfig();
    const state = document.createElement('span');
    state.className = 'gh-state' + (cfg ? ' on' : '');
    state.textContent = cfg ? `Saving to GitHub: ${cfg.owner}/${cfg.repo}` : 'View only – add a token to save changes';
    const settings = Object.assign(document.createElement('button'), { type: 'button', className: 'btn', textContent: 'Settings' });
    settings.addEventListener('click', () => openSettings(renderTools));
    const kids: HTMLElement[] = [state, settings];
    if (cfg) {
      const add = Object.assign(document.createElement('button'), { type: 'button', className: 'btn btn-primary', textContent: 'Add project' });
      add.addEventListener('click', () => openAddProject(cfg));
      kids.push(add);
    }
    tools.replaceChildren(...kids);
  };
  renderTools();
  const body = document.createElement('div');
  root.append(tools, body);
  el.append(root);
  let alive = true;

  const load = async () => {
    body.replaceChildren(Object.assign(document.createElement('p'), { className: 'lead', textContent: 'Loading…' }));
    try {
      // relative path: works locally and on GitHub Pages (base './', hash routing)
      const res = await fetch('projects/index.json');
      if (!res.ok) throw new Error(String(res.status));
      const list = (await res.json()) as Entry[];
      if (alive) render(list);
    } catch {
      if (!alive) return;
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = 'Could not load the project list. ';
      const retry = document.createElement('button');
      retry.type = 'button'; retry.className = 'btn'; retry.textContent = 'Try again';
      retry.addEventListener('click', load);
      p.append(retry);
      body.replaceChildren(p);
    }
  };

  const render = (list: Entry[]) => {
    const grid = document.createElement('div');
    grid.className = 'tiles';
    for (const e of list) {
      const a = document.createElement('a');
      a.className = 'tile';
      a.href = `#/p/${encodeURIComponent(e.id)}`;
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      const t = readThumb(e.id);
      if (t) thumb.style.backgroundImage = `url("${t}")`;
      const b = document.createElement('div');
      b.className = 'body';
      const h = document.createElement('h2'); h.textContent = e.name;
      b.append(h);
      if (e.description) { const d = document.createElement('p'); d.textContent = e.description; b.append(d); }
      const c = document.createElement('span'); c.className = 'count'; c.textContent = partsCount(e.parts);
      const chips = document.createElement('div'); chips.className = 'chips';
      for (const l of LAYERS) {
        if (l.id === 'room' || !e.layers.includes(l.id)) continue;
        const s = document.createElement('span'); s.className = 'chip'; s.textContent = l.label;
        chips.append(s);
      }
      b.append(c, chips);
      a.append(thumb, b);
      grid.append(a);
    }
    body.replaceChildren(grid);
  };

  load();
  return { dispose: () => { alive = false; root.remove(); } };
}
