import { LAYERS, type LayerId, type Model, type Part } from '../model/schema';
import { createScene, type SceneCtx } from '../viewer/scene';
import { buildModel } from '../viewer/loadModel';
import type { V3 } from '../viewer/explode';
import type { Visibility } from '../viewer/layers';
import { attachSelection, meshesOf } from '../viewer/selection';
import { explodeTargets, isRoomUnit, unitName, unitParts, unitSummary } from '../viewer/focus';
import { findPart } from '../model/codes';
import type { GhConfig } from '../github/config';
import { saveLayer } from '../github/project';
import { defaultVisibility } from '../viewer/layers';
import { layersPanel } from './layersPanel';
import { infoPanel } from './infoPanel';
import { unitPanel } from './unitPanel';
import { projectHash } from './route';
import { loadSettings, saveSettings } from './settings';
import { loadState, restoreState, saveState, type Walls } from './storage';

export interface ViewerPage { dispose(): void; setUnit(unit: string | null): void }
// saving layers: a commit to model.json in the repo (with a token) or disabled with a reason
export type EditMode = { mode: 'github'; cfg: GhConfig } | { mode: 'off'; reason: string };

const WALL_OPTIONS: { id: Walls; label: string }[] = [
  { id: 'visible', label: 'visible' }, { id: 'xray', label: 'x-ray' }, { id: 'hidden', label: 'hidden' },
];

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

function rangeRow(parent: HTMLElement, label: string, min: number, max: number, step: number): HTMLInputElement {
  const lab = h('label', 'range-row');
  lab.append(h('span', undefined, label));
  const r = h('input');
  r.type = 'range'; r.min = String(min); r.max = String(max); r.step = String(step);
  lab.append(r);
  parent.append(lab);
  return r;
}

// library thumbnail: render right after fitting (without preserveDrawingBuffer the image would be blank)
function saveThumb(ctx: SceneCtx, id: string) {
  try {
    ctx.renderer.render(ctx.scene, ctx.camera);
    const src = ctx.renderer.domElement;
    if (!src.width || !src.height) return;
    const c = document.createElement('canvas');
    c.width = 320; c.height = Math.round((320 * src.height) / src.width);
    c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
    localStorage.setItem(`thumb:${id}`, c.toDataURL('image/jpeg', 0.7));
  } catch {
    // out of space or blocked site data – the thumbnail is optional
  }
}

export function viewerPage(el: HTMLElement, model: Model, unit: string | null = null,
                           edit: EditMode = { mode: 'off', reason: 'Changing layers is disabled' }): ViewerPage {
  // --- layout ---
  const root = h('div', 'viewer');
  const stage = h('div', 'stage');
  const top = h('header', 'topbar');
  const back = h('a', 'back');
  const title = h('h1', 'title');
  const find = h('input', 'find');
  find.type = 'search'; find.placeholder = 'Find part (e.g. BAT-7)';
  find.setAttribute('aria-label', 'Find a part by code, id or name');
  top.append(back, title, find);

  const panel = h('aside', 'panel');
  const layersSec = h('section');
  layersSec.append(h('h2', undefined, 'Layers'));
  const layersHost = h('div');
  layersSec.append(layersHost);

  const wallsSec = h('section');
  wallsSec.append(h('h2', undefined, 'Walls'));
  const seg = h('div', 'segmented');
  seg.setAttribute('role', 'radiogroup');
  const wallInputs = new Map<Walls, HTMLInputElement>();
  for (const o of WALL_OPTIONS) {
    const lab = h('label');
    const r = h('input');
    r.type = 'radio'; r.name = `walls-${model.id}`; r.value = o.id;
    lab.append(r, h('span', undefined, o.label));
    seg.append(lab);
    wallInputs.set(o.id, r);
  }
  wallsSec.append(seg);

  const lookSec = h('section');
  lookSec.append(h('h2', undefined, 'Appearance'));
  const contrast = rangeRow(lookSec, 'Edge contrast', 0, 100, 1);
  const width = rangeRow(lookSec, 'Edge width', 1, 4, 0.5);

  const bar = h('div', 'bar');
  const explodeLab = h('label', 'explode');
  explodeLab.append(h('span', undefined, 'Explode'));
  const slider = h('input');
  slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '1';
  explodeLab.append(slider);
  const views = h('div', 'views');
  const bFit = h('button', 'btn', 'Fit');
  const bFront = h('button', 'btn', 'Front');
  const bTop = h('button', 'btn', 'Top');
  views.append(bFit, bFront, bTop);
  const drawerBtn = h('button', 'btn drawer-toggle', 'Layers');
  drawerBtn.setAttribute('aria-expanded', 'false');
  bar.append(drawerBtn, explodeLab, views);

  const hasWalls = model.parts.some((p) => p.layer === 'room');
  panel.append(layersSec);
  if (hasWalls) panel.append(wallsSec);
  panel.append(lookSec);
  const unitInfo = h('aside');
  const info = h('aside');
  root.append(stage, top, panel, unitInfo, info, bar);
  el.append(root);

  // --- scene ---
  const ctx = createScene(stage);
  try {
    return setup(ctx);
  } catch (e) {
    ctx.dispose(); root.remove();
    throw e;
  }

  function setup(ctx: SceneCtx): ViewerPage {
    const settings = loadSettings();
    const built = buildModel(model, settings.edges);
    ctx.root.add(built.group);
    ctx.setFloor(built.minZ);
    ctx.onResize((w, hh) => built.edges.setResolution(w, hh));
    const meshes = [...built.partsById.values()];

    // --- state ---
    let focus: string | null = null;              // cabinet mode: cabinet code
    let focusExplode = 0;                         // slider value in cabinet mode (not saved)
    const presentLayers = (scope: Part[]) =>
      LAYERS.map((l) => l.id).filter((id) => scope.some((p) => p.layer === id)) as LayerId[];
    const state = restoreState(loadState(model.id), presentLayers(model.parts));
    const save = () => saveState(model.id, state);
    const inScope = (p: Part) => focus === null || p.unit === focus;
    const isVisible = (p: Part) =>
      p.layer === 'room' ? focus === null && state.walls !== 'hidden' : inScope(p) && !!state.visibility[p.layer];

    // --- panels and selection ---
    const infoApi = infoPanel(info, model, () => selection.clear(), (u) => selection.set({ kind: 'unit', unit: u }));
    const unitApi = unitPanel(unitInfo, {
      onDetails: (u) => { location.hash = projectHash(model.id, u); },
      onPart: (id) => revealPart(built.partsById.get(id)!.userData.part as Part),
      onClose: () => selection.clear(),
    });
    const selection = attachSelection(ctx, built, {
      candidates: () => meshes.filter((m) => m.visible && !(state.walls === 'xray' && m.userData.part.layer === 'room')),
      // single click: cabinet (a part in cabinet mode); double click: always a part
      resolve: (hit, double) => {
        if (!hit) return null;
        const p = hit.userData.part as Part;
        if (focus !== null) return { kind: 'part', id: p.id };
        if (isRoomUnit(model.parts, p.unit)) return null;
        return double ? { kind: 'part', id: p.id } : { kind: 'unit', unit: p.unit };
      },
      onChange: (sel) => {
        if (sel?.kind === 'unit') unitApi.show(unitSummary(model, sel.unit), unitParts(model, sel.unit), focus !== null);
        else unitApi.show(null);
        const part = sel?.kind === 'part' ? (built.partsById.get(sel.id)!.userData.part as Part) : null;
        infoApi.show(part, part ? { enabled: edit.mode === 'github', hint: edit.mode === 'off' ? edit.reason : undefined, onChange: (layer) => changeLayer(part, layer) } : undefined);
      },
    });

    const applyVisibility = () => {
      for (const m of meshes) m.visible = isVisible(m.userData.part);
      // a hidden selection is cleared
      const sel = selection.get();
      if (sel && meshesOf(built, sel).every((m) => !m.visible)) selection.clear();
    };
    const applyWalls = () => {
      for (const mat of built.wallMaterials) {
        const x = state.walls === 'xray';
        mat.transparent = x; mat.opacity = x ? 0.15 : 1; mat.depthWrite = !x;
        mat.needsUpdate = true;
      }
      for (const [id, r] of wallInputs) { r.checked = id === state.walls; r.disabled = focus !== null; }
      wallsSec.classList.toggle('disabled', focus !== null);
    };

    let layersApi: { update(v: Visibility): void } | null = null;
    const renderLayers = () => {
      const scope = model.parts.filter(inScope);
      const counts: Record<string, number> = {};
      for (const p of scope) counts[p.layer] = (counts[p.layer] ?? 0) + 1;
      layersApi = layersPanel(layersHost, {
        present: presentLayers(scope), counts, visibility: state.visibility,
        onChange: (v: Visibility) => { state.visibility = v; layersApi!.update(v); applyVisibility(); save(); },
      });
    };
    const renderTop = () => {
      if (focus === null) {
        back.textContent = '← Library'; back.href = '#/'; title.textContent = model.name;
      } else {
        back.textContent = '← Whole project'; back.href = projectHash(model.id);
        title.textContent = `${model.name} · ${unitName(model, focus)}`;
      }
    };

    for (const [id, r] of wallInputs) r.addEventListener('change', () => setWalls(id));
    function setWalls(w: Walls) {
      state.walls = w;
      if (state.visibility.room !== undefined) state.visibility = { ...state.visibility, room: w !== 'hidden' };
      applyWalls(); applyVisibility(); save();
    }

    // --- explode: the current offset eases towards the target ---
    const explodeValue = () => (focus === null ? state.explode : focusExplode);
    let target = explodeTargets(built.items, focus, explodeValue() / 100);
    const cur = new Map<string, V3>(built.items.map((i) => [i.id, [0, 0, 0] as V3]));
    const retarget = (snap = false) => {
      target = explodeTargets(built.items, focus, explodeValue() / 100);
      if (!snap) return;
      for (const [id, m] of built.partsById) {
        const t = target.get(id)!;
        cur.set(id, [...t] as V3);
        m.position.set(t[0], t[1], t[2]);
      }
    };
    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      if (focus === null) { state.explode = v; save(); } else focusExplode = v;
      retarget();
    });
    ctx.onFrame((dt) => {
      const a = Math.min(1, dt / 120);
      for (const [id, m] of built.partsById) {
        const c = cur.get(id)!, t = target.get(id)!;
        if (c[0] === t[0] && c[1] === t[1] && c[2] === t[2]) continue;
        for (let k = 0; k < 3; k++) c[k] = Math.abs(t[k]! - c[k]!) < 0.05 ? t[k]! : c[k]! + (t[k]! - c[k]!) * a;
        m.position.set(c[0], c[1], c[2]);
      }
    });

    // framing: visible furniture in scope (no walls); if everything is hidden – the whole scope
    const fitScope = () => {
      const furniture = meshes.filter((m) => inScope(m.userData.part) && m.userData.part.layer !== 'room');
      const vis = furniture.filter((m) => m.visible);
      ctx.fit(vis.length ? vis : furniture.length ? furniture : meshes);
    };

    // cabinet mode: frame the cabinet fully exploded so the slider never pushes parts off screen
    const fitExploded = () => {
      const full = explodeTargets(built.items, focus, 1);
      for (const [id, m] of built.partsById) m.position.set(...full.get(id)!);
      fitScope();
      for (const [id, m] of built.partsById) m.position.set(...cur.get(id)!);
    };

        // --- appearance (global) ---
    contrast.value = String(settings.edges.contrast);
    width.value = String(settings.edges.width);
    const onLook = () => {
      settings.edges = { contrast: Number(contrast.value), width: Number(width.value) };
      built.edges.setStyle(settings.edges);
      saveSettings(settings);
    };
    contrast.addEventListener('input', onLook);
    width.addEventListener('input', onLook);

    // --- manual layer change: commit model.json to the repo (GitHub) ---
    async function changeLayer(part: Part, layer: LayerId) {
      if (edit.mode !== 'github') throw new Error(edit.reason);
      const saved = (await saveLayer(edit.cfg, model.id, part.id, part.name, layer)).parts.find((p) => p.id === part.id)!;
      selection.refresh(() => built.setPartLayer(part.id, layer));
      for (const k of ['originalLayer', 'code'] as const) {   // state from the saved model.json (e.g. a new part code)
        if (saved.meta[k] === undefined) delete part.meta[k];
        else part.meta[k] = saved.meta[k];
      }
      if (state.visibility[layer] === undefined) state.visibility = { ...state.visibility, ...defaultVisibility([layer]) };
      renderLayers(); applyWalls(); applyVisibility(); retarget(); save();   // applyWalls: the part may have moved to the walls
    }

    // --- reveal and select a part (part list, search) ---
    function revealPart(p: Part) {
      if (focus !== null && p.unit !== focus) { setUnit(null); location.hash = projectHash(model.id); }
      if (p.layer === 'room') { if (state.walls === 'hidden') setWalls('visible'); }
      else if (!state.visibility[p.layer]) {
        state.visibility = { ...state.visibility, [p.layer]: true };
        layersApi?.update(state.visibility); applyVisibility(); save();
      }
      selection.set({ kind: 'part', id: p.id });
    }
    find.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const p = findPart(model, find.value);
      find.classList.toggle('not-found', !p && find.value.trim() !== '');
      if (p) revealPart(p);
    });
    find.addEventListener('input', () => find.classList.remove('not-found'));

    // --- cabinet mode ---
    const setUnit = (u: string | null) => {
      if (u !== null && (!model.parts.some((p) => p.unit === u) || isRoomUnit(model.parts, u))) {
        location.replace(projectHash(model.id));   // unknown cabinet → whole project
        return;
      }
      if (u === focus) return;
      selection.clear();
      focus = u;
      focusExplode = 0;
      slider.value = String(explodeValue());
      renderTop(); renderLayers(); applyWalls(); applyVisibility();
      retarget(true);                             // no animation, so the framing uses the target positions
      if (focus === null) fitScope();
      else fitExploded();
    };

    // Esc: first deselect, then leave cabinet mode
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selection.get()) selection.clear();
      else if (focus !== null) location.hash = projectHash(model.id);
    };
    window.addEventListener('keydown', onKey);

    bFit.addEventListener('click', fitScope);
    bFront.addEventListener('click', () => ctx.view('front'));
    bTop.addEventListener('click', () => ctx.view('top'));
    drawerBtn.addEventListener('click', () => {
      const open = root.classList.toggle('drawer-open');
      drawerBtn.setAttribute('aria-expanded', String(open));
    });

    slider.value = String(explodeValue());
    renderTop(); renderLayers(); applyWalls(); applyVisibility();
    retarget(true);
    fitScope();
    saveThumb(ctx, model.id);
    if (unit !== null) setUnit(unit);

    return {
      setUnit,
      dispose: () => {
        window.removeEventListener('keydown', onKey);
        selection.dispose();
        ctx.dispose();
        root.remove();
      },
    };
  }
}
