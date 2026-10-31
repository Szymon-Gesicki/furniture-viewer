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
import { buildHash, drillHash, projectHash } from './route';
import { Raycaster, Vector2, type Material, type MeshStandardMaterial } from 'three';
import { unitFrontNormal } from '../drilling/plan';
import { DRILL_KINDS, type DrillFeature } from '../drilling/schema';
import { HW_GROUPS, groupOf, itemLabel, notesFor } from '../drilling/catalog';
import { mergeParams } from '../drilling/params';
import { hardwareCount } from '../drilling/hardware';
import { createDrillMarkers } from '../viewer/drillMarkers';
import { createDrillOverlay } from '../viewer/drillOverlay';
import type { ViewDir } from '../viewer/scene';
import { drillPanel, type ExtraRows } from './drillPanel';
import { drillPartSection, type DrillCtx } from './drillInfo';
import { drillSummary } from './drillSummary';
import { featureLines } from './drillFormat';
import { loadDrillView, saveDrillView } from './drillState';
import type { DrillSession } from './drillSession';
import { openDatasheet, openParams } from './drillDialogs';
import { sourceOf, statusBadge } from './drillBlocks';
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
                           edit: EditMode = { mode: 'off', reason: 'Changing layers is disabled' },
                           session?: DrillSession): ViewerPage {
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

  const drillSec = h('section');
  drillSec.append(h('h2', undefined, 'Okucia (wiercenia)'));
  const drillHost = h('div');
  drillSec.append(drillHost);

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
  bFit.type = 'button';
  // PLAN 4.1: free 3D + orthographic views from the 6 sides of the project / the selected cabinet
  const VIEW_BTNS: [ViewDir, string][] = [['3d', '3D'], ['front', 'Przód'], ['back', 'Tył'], ['left', 'Lewo'], ['right', 'Prawo'], ['top', 'Góra'], ['bottom', 'Dół']];
  const viewSeg = h('div', 'view-seg');
  viewSeg.setAttribute('role', 'group'); viewSeg.setAttribute('aria-label', 'View');
  const viewBtns = new Map<ViewDir, HTMLButtonElement>();
  for (const [id, label] of VIEW_BTNS) {
    const b = h('button', 'btn-view', label); b.type = 'button';
    viewSeg.append(b); viewBtns.set(id, b);
  }
  views.append(bFit, viewSeg);
  const drawerBtn = h('button', 'btn drawer-toggle', 'Layers');
  drawerBtn.setAttribute('aria-expanded', 'false');
  bar.append(drawerBtn, explodeLab, views);

  const hasWalls = model.parts.some((p) => p.layer === 'room');
  panel.append(layersSec, drillSec);
  if (hasWalls) panel.append(wallsSec);
  panel.append(lookSec);
  const unitInfo = h('aside');
  const info = h('aside');
  const tip = h('div', 'drill-tip');
  tip.hidden = true;
  const overlayHint = h('div', 'overlay-hint');
  overlayHint.hidden = true;
  root.append(stage, top, panel, unitInfo, info, bar, tip, overlayHint);
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
      // x-rayed walls and fronts let the click through
      candidates: () => meshes.filter((m) => m.visible && !(state.walls === 'xray' && m.userData.part.layer === 'room')
        && !(drillView.on && drillView.xray && m.userData.part.layer === 'front')),
      // single click: cabinet (a part in cabinet mode); double click: always a part
      resolve: (hit, double) => {
        if (!hit) return null;
        const p = hit.userData.part as Part;
        if (focus !== null) return { kind: 'part', id: p.id };
        if (isRoomUnit(model.parts, p.unit)) return null;
        return double ? { kind: 'part', id: p.id } : { kind: 'unit', unit: p.unit };
      },
      onChange: () => showSelection(),
    });
    function showSelection() {
      const sel = selection.get();
      if (sel?.kind === 'unit') unitApi.show(unitSummary(model, sel.unit), unitParts(model, sel.unit), focus !== null,
        drillSummary(ds.plan, sel.unit, drillHash(model.id, { kind: 'cab', unit: sel.unit }), mergeParams(ds.overrides.params).jig.cup_from_edge,
          buildHash(model.id, sel.unit)));
      else unitApi.show(null);
      const part = sel?.kind === 'part' ? (built.partsById.get(sel.id)!.userData.part as Part) : null;
      infoApi.show(part, part ? { enabled: edit.mode === 'github', hint: edit.mode === 'off' ? edit.reason : undefined, onChange: (layer) => changeLayer(part, layer) } : undefined,
        part ? () => drillPartSection(part, drillCtx()) : undefined);
    }

    // --- drilling plan (session = model + drilling.json); markers follow their parts ---
    const ds: DrillSession = session ?? { overrides: { hingeSide: {}, shelfMode: {}, hingeZ: {}, params: {}, notes: {}, partNotes: {}, done: {} },
      plan: { hinges: [], drawers: [], shelves: [], handles: [], tipons: [], hangers: [], warnings: [], features: [] },
      enabled: false, syncError: '', save: async () => {}, onChange: () => () => {}, recompute: () => {} };
    const markers = createDrillMarkers(built, ds.plan.features);
    const overlay = createDrillOverlay(stage, (id) => built.partsById.get(id));
    const drillView = loadDrillView(model.id);
    const kindsOn = () => new Set(HW_GROUPS.filter((g) => drillView.groups[g.id] !== false).flatMap((g) => g.kinds as string[]));
    const narrowed = () => HW_GROUPS.some((g) => drillView.groups[g.id] === false);
    const partOf = (f: DrillFeature) => built.partsById.get(f.part.id)?.userData.part as Part | undefined;
    const showOptional = () => ds.overrides.extraShelfRows === true;
    const shownFeatures = () => {
      const k = kindsOn();
      return ds.plan.features.filter((f) => k.has(f.kind) && (!f.optional || showOptional()) && !!partOf(f) && inScope(partOf(f)!));
    };
    // fronts see-through so the inside of the carcasses shows (materials of the front layer are not shared with others)
    const frontMats = new Set<Material>(meshes.filter((m) => m.userData.part.layer === 'front').map((m) => m.material as Material));
    const applyXray = () => {
      for (const m of frontMats) {
        const mat = m as MeshStandardMaterial, x = drillView.on && drillView.xray;
        mat.transparent = x; mat.opacity = x ? 0.2 : 1; mat.depthWrite = !x; mat.needsUpdate = true;
      }
    };
    const applyDrill = () => {
      const k = kindsOn();
      markers.setFilter({ on: drillView.on, kinds: Object.fromEntries(DRILL_KINDS.map((x) => [x.id, k.has(x.id)])), optional: showOptional() });
      markers.setHighlight(drillView.on && narrowed() ? new Set(shownFeatures().map((f) => f.part.id)) : new Set());
      applyXray();
    };
    const drillCtx = (): DrillCtx => ({
      plan: ds.plan, overrides: ds.overrides, enabled: ds.enabled, hint: ds.hint,
      sheetHref: (p) => drillHash(model.id, { kind: 'part', code: typeof p.meta.code === 'string' ? p.meta.code : p.id }),
      save: (e) => ds.save(e),
    });
    const renderDrill = () => {
      const counts: Record<string, number> = {};
      for (const f of ds.plan.features) {
        const p = partOf(f);
        if (!p || !inScope(p) || f.kind === 'runner-line' || (f.optional && !showOptional())) continue;
        counts[groupOf(f.kind)] = (counts[groupOf(f.kind)] ?? 0) + 1;
      }
      const shown = shownFeatures();
      drillPanel(drillHost, {
        view: drillView, counts, editEnabled: ds.enabled, hint: ds.hint,
        extraRows: ds.overrides.extraShelfRows === undefined ? 'auto' : ds.overrides.extraShelfRows ? 'on' : 'off',
        hardware: hardwareCount({ features: shown, drawers: kindsOn().has('front-fixing') ? ds.plan.drawers.filter((d) => focus === null || d.unit === focus) : [] }),
        warnings: ds.plan.warnings.filter((w) => focus === null || w.unit === focus).map((w) => w.text),
        onView: (v) => { Object.assign(drillView, v); saveDrillView(model.id, drillView); applyDrill(); renderDrill(); if (!v.on) { tip.hidden = true; overlay.clear(); } },
        onExtraRows: (v: ExtraRows) => ds.save({ kind: 'extraShelfRows', value: v === 'auto' ? undefined : v === 'on' }),
        onParams: () => openParams(ds),
      });
    };
    const offSession = ds.onChange(() => { markers.rebuild(ds.plan.features); applyDrill(); renderDrill(); showSelection(); });

    // hover tooltip over drilling markers; a click pins it (source link, datasheet)
    const ray = new Raycaster();
    let tipRaf = 0, pinned = false;
    const pickAt = (e: { clientX: number; clientY: number }) => {
      const r = ctx.renderer.domElement.getBoundingClientRect();
      built.group.updateMatrixWorld();
      ray.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), ctx.camera);
      return markers.pick(ray);
    };
    const showTip = (f: DrillFeature, e: { clientX: number; clientY: number }, pin: boolean) => {
      const p = partOf(f);
      tip.replaceChildren();
      tip.classList.toggle('pinned', pin);
      const head = h('strong', undefined, `${itemLabel(f.item)}`);
      head.append(' ', statusBadge(f.status));
      tip.append(head);
      for (const line of featureLines(f)) tip.append(h('div', undefined, line));
      const note = notesFor(f.item, ds.overrides.notes)[0];
      if (note) tip.append(h('div', 'tip-note', note.text));
      tip.append(h('div', 'meta', `${typeof p?.meta.code === 'string' ? p.meta.code + ' · ' : ''}${f.part.name}`));
      if (pin) {
        const act = h('div', 'actions');
        const src = sourceOf(f.item);
        if (src?.startsWith('http')) { const a = h('a', 'btn-small', 'źródło'); a.href = src; a.target = '_blank'; a.rel = 'noopener'; act.append(a); }
        const sheet = h('button', 'btn-small', 'karta okucia'); sheet.type = 'button';
        sheet.addEventListener('click', () => openDatasheet(f.item, ds));
        const close = h('button', 'btn-small', 'zamknij'); close.type = 'button';
        close.addEventListener('click', () => { pinned = false; tip.hidden = true; });
        act.append(sheet, close);
        tip.append(act);
      }
      const rr = root.getBoundingClientRect();
      tip.style.left = `${Math.max(8, Math.min(e.clientX - rr.left + 14, rr.width - 310))}px`;
      tip.style.top = `${Math.min(e.clientY - rr.top + 14, rr.height - 200)}px`;
      tip.hidden = false;
    };
    const onMove = (e: PointerEvent) => {
      if (pinned) return;
      if (!drillView.on || e.buttons) { tip.hidden = true; return; }
      cancelAnimationFrame(tipRaf);
      tipRaf = requestAnimationFrame(() => {
        if (pinned) return;
        const f = pickAt(e);
        if (f) showTip(f, e, false); else tip.hidden = true;
      });
    };
    const onLeave = () => { if (!pinned) tip.hidden = true; };
    let downAt: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; };
    const onClick = (e: PointerEvent) => {
      if (!drillView.on || !downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
      cancelAnimationFrame(tipRaf);
      const f = pickAt(e);
      pinned = !!f;
      if (f) showTip(f, e, true); else tip.hidden = true;
    };
    ctx.renderer.domElement.addEventListener('pointermove', onMove);
    ctx.renderer.domElement.addEventListener('pointerleave', onLeave);
    ctx.renderer.domElement.addEventListener('pointerdown', onDown);
    ctx.renderer.domElement.addEventListener('pointerup', onClick);

    // orthographic views: Figma-style dimension overlay for the selected part or the filtered hardware groups
    // recomputed only when the camera, the selection or the filter changes (occlusion test is a raycast per hole)
    let overlayKey = '';
    ctx.onFrame(() => {
      if (ctx.viewDir === '3d' || !drillView.on) { overlay.clear(); overlayHint.hidden = true; overlayKey = ''; return; }
      const sel = selection.get();
      const r = ctx.renderer.domElement.getBoundingClientRect();
      const cam = ctx.camera;
      const key = [...cam.matrixWorld.elements.map((x) => x.toFixed(2)), cam.zoom, r.width, r.height, sel?.kind === 'part' ? sel.id : '',
        JSON.stringify(drillView), ds.plan.features.length, [...built.partsById.values()].map((m) => m.position.x + m.position.y + m.position.z).reduce((a, b) => a + b, 0).toFixed(1),
        meshes.filter((m) => m.visible).length].join('|');
      if (key === overlayKey) return;
      overlayKey = key;
      const fs = sel?.kind === 'part' ? shownFeatures().filter((f) => f.part.id === sel.id) : shownFeatures();
      // a selected part shows all its holes; otherwise holes hidden behind other boards are skipped
      const occluders = sel?.kind === 'part' ? [] : meshes.filter((m) => m.visible && m.userData.part.layer !== 'room' && !(drillView.xray && m.userData.part.layer === 'front'));
      const hint = overlay.update(fs, cam, r.width, r.height, occluders);
      overlayHint.textContent = hint;
      overlayHint.hidden = !hint;
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
      ds.recompute();                             // the layer decides what counts as a carcass panel
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
      renderTop(); renderLayers(); renderDrill(); applyWalls(); applyVisibility();
      retarget(true);                             // no animation, so the framing uses the target positions
      if (focus === null) fitScope();
      else fitExploded();
      if (ctx.viewDir !== '3d') setViewDir(ctx.viewDir);   // orthographic view follows the cabinet's front
    };

    // Esc: first deselect, then leave cabinet mode
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (selection.get()) selection.clear();
      else if (focus !== null) location.hash = projectHash(model.id);
    };
    window.addEventListener('keydown', onKey);

    bFit.addEventListener('click', fitScope);
    const furniture = () => {
      const f = meshes.filter((m) => inScope(m.userData.part) && m.userData.part.layer !== 'room');
      const vis = f.filter((m) => m.visible);
      return vis.length ? vis : f;
    };
    const setViewDir = (v: ViewDir) => {
      ctx.setView(v, unitFrontNormal(model, focus), furniture());
      for (const [id, b] of viewBtns) b.classList.toggle('on', id === v);
    };
    for (const [id, b] of viewBtns) b.addEventListener('click', () => setViewDir(id));
    viewBtns.get('3d')!.classList.add('on');
    drawerBtn.addEventListener('click', () => {
      const open = root.classList.toggle('drawer-open');
      drawerBtn.setAttribute('aria-expanded', String(open));
    });

    slider.value = String(explodeValue());
    renderTop(); renderLayers(); renderDrill(); applyDrill(); applyWalls(); applyVisibility();
    retarget(true);
    fitScope();
    saveThumb(ctx, model.id);
    if (unit !== null) setUnit(unit);

    return {
      setUnit,
      dispose: () => {
        window.removeEventListener('keydown', onKey);
        ctx.renderer.domElement.removeEventListener('pointermove', onMove);
        ctx.renderer.domElement.removeEventListener('pointerleave', onLeave);
        ctx.renderer.domElement.removeEventListener('pointerdown', onDown);
        ctx.renderer.domElement.removeEventListener('pointerup', onClick);
        cancelAnimationFrame(tipRaf);
        offSession();
        overlay.dispose();
        selection.dispose();
        markers.dispose();
        ctx.dispose();
        root.remove();
      },
    };
  }
}
