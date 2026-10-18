import { Mesh, MeshStandardMaterial, Raycaster, Vector2 } from 'three';
import type { Built } from './loadModel';
import type { SceneCtx } from './scene';
import { ACCENT } from './colors';

export interface Click { t: number; x: number; y: number }
// two clicks within ≤ ms and ≤ px of each other
export const isDoubleClick = (prev: Click | null, cur: Click, ms = 350, px = 5) =>
  prev !== null && cur.t - prev.t <= ms && Math.hypot(cur.x - prev.x, cur.y - prev.y) <= px;

export type Selection = { kind: 'unit'; unit: string } | { kind: 'part'; id: string } | null;

export function meshesOf(built: Pick<Built, 'partsById'>, sel: Selection): Mesh[] {
  if (!sel) return [];
  if (sel.kind === 'part') {
    const m = built.partsById.get(sel.id);
    return m ? [m] : [];
  }
  return [...built.partsById.values()].filter((m) => m.userData.part.unit === sel.unit);
}

// highlight via material clones – materials are shared by many parts, so they must not be modified
export function createHighlighter(built: Pick<Built, 'partsById'>) {
  let lit: { mesh: Mesh; shared: MeshStandardMaterial }[] = [];
  const clones = new Map<MeshStandardMaterial, MeshStandardMaterial>();
  const restore = () => {
    for (const { mesh, shared } of lit) mesh.material = shared;
    for (const c of clones.values()) c.dispose();
    lit = [];
    clones.clear();
  };
  const apply = (sel: Selection) => {
    restore();
    for (const mesh of meshesOf(built, sel)) {
      const shared = mesh.material as MeshStandardMaterial;
      let c = clones.get(shared);
      if (!c) {
        c = shared.clone();
        c.emissive.copy(ACCENT).multiplyScalar(0.25);
        clones.set(shared, c);
      }
      lit.push({ mesh, shared });
      mesh.material = c;
    }
  };
  return { apply, restore };
}

export interface SelectionOptions {
  candidates(): Mesh[];                          // meshes that can be hit (visible, no x-rayed walls)
  resolve(hit: Mesh | null, double: boolean): Selection;   // what to select for a hit (cabinet or part)
  onChange(sel: Selection): void;
}
export interface SelectionApi {
  get(): Selection;
  set(sel: Selection): void;
  clear(): void;
  refresh(between?: () => void): void;          // remove the highlight, apply a change (e.g. material), highlight again
  dispose(): void;
}

export function attachSelection(ctx: SceneCtx, built: Built, opts: SelectionOptions): SelectionApi {
  const canvas = ctx.renderer.domElement;
  const ray = new Raycaster();
  const hl = createHighlighter(built);
  let cur: Selection = null;
  const pointers = new Set<number>();
  let down: { x: number; y: number; id: number } | null = null;
  let last: Click | null = null;                 // previous click – for double-click detection

  const set = (sel: Selection) => { cur = sel; hl.apply(sel); opts.onChange(sel); };

  const onDown = (e: PointerEvent) => {
    pointers.add(e.pointerId);
    // left button / single finger only; a second finger cancels (pinch gesture)
    down = pointers.size === 1 && e.button === 0 ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (!down || e.pointerId !== down.id) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved >= 5) { last = null; return; }      // it was an orbit or a pan
    const click = { t: performance.now(), x: e.clientX, y: e.clientY };
    const double = isDoubleClick(last, click);
    last = double ? null : click;                 // after a double click the series restarts
    built.group.updateMatrixWorld();             // positions may have changed since the last frame (explode, fit)
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), ctx.camera);
    const hit = ray.intersectObjects(opts.candidates(), false)[0];
    set(opts.resolve(hit ? (hit.object as Mesh) : null, double));
  };
  const onCancel = (e: PointerEvent) => { pointers.delete(e.pointerId); down = null; };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);

  return {
    get: () => cur,
    set,
    clear: () => { if (cur) set(null); },
    refresh: (between) => { hl.restore(); between?.(); hl.apply(cur); },
    dispose: () => {
      hl.restore();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
    },
  };
}
