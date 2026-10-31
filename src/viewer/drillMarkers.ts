import {
  BoxGeometry, BufferGeometry, EdgesGeometry, LineSegments, Color, CylinderGeometry, Float32BufferAttribute, Line, LineBasicMaterial, Mesh,
  MeshBasicMaterial, Object3D, Quaternion, Raycaster, Vector3,
} from 'three';
import type { Built } from './loadModel';
import { DRILL_KINDS, type DrillFeature, type DrillKindId } from '../drilling/schema';

export interface DrillFilter { on: boolean; kinds: Partial<Record<DrillKindId, boolean>>; optional: boolean }
export interface DrillMarkers {
  rebuild(features: DrillFeature[]): void;
  setFilter(f: DrillFilter): void;
  pick(ray: Raycaster): DrillFeature | null;     // the nearest visible marker under the ray
  setHighlight(partIds: Set<string>): void;      // outline the boards that carry the filtered holes
  dispose(): void;
}

const MIN_DIA = 4;                                // tiny pilot holes would be invisible at room scale
const PROUD = 0.8;                                // markers stick out of the face so the disc shows on the surface
const Y = new Vector3(0, 1, 0);

// markers are children of their part's mesh: they follow explode and the part's visibility
export function createDrillMarkers(built: Pick<Built, 'partsById'>, features: DrillFeature[] = []): DrillMarkers {
  let objs: Object3D[] = [];
  let filter: DrillFilter = { on: false, kinds: {}, optional: false };
  const mats = new Map<string, MeshBasicMaterial>();
  const lineMats = new Map<string, LineBasicMaterial>();
  const geoms = new Map<string, BufferGeometry>();
  const color = (k: string) => new Color(k === 'placeholder' ? '#e67e22' : DRILL_KINDS.find((x) => x.id === k)?.color ?? '#333333');
  const mat = (k: string) => {
    let m = mats.get(k);
    if (!m) { m = new MeshBasicMaterial({ color: color(k) }); mats.set(k, m); }
    return m;
  };
  const geom = (key: string, make: () => BufferGeometry) => {
    let g = geoms.get(key);
    if (!g) { g = make(); geoms.set(key, g); }
    return g;
  };

  const make = (f: DrillFeature): Object3D => {
    const p = new Vector3(...f.world.p), dir = new Vector3(...f.world.dir);
    if (f.kind === 'runner-line' && f.line) {
      const off = dir.clone().multiplyScalar(-PROUD);
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute([...p.clone().add(off).toArray(), ...new Vector3(...f.line.to).add(off).toArray()], 3));
      let m = lineMats.get(f.kind);
      if (!m) { m = new LineBasicMaterial({ color: color(f.kind) }); lineMats.set(f.kind, m); }
      return new Line(g, m);
    }
    const q = new Quaternion().setFromUnitVectors(Y, dir);
    const dia = Math.max(f.dia, MIN_DIA), len = f.depth + PROUD;
    // placeholders (to measure on the hardware) in orange
    const m = new Mesh(geom(`${dia}|${len}`, () => new CylinderGeometry(dia / 2, dia / 2, len, f.kind === 'hinge-cup' ? 32 : 12)), mat(f.status === 'placeholder' ? 'placeholder' : f.kind));
    m.quaternion.copy(q);
    m.position.copy(p).addScaledVector(dir, len / 2 - PROUD);
    return m;
  };

  const apply = () => {
    for (const o of objs) {
      const f = o.userData.drill as DrillFeature;
      o.visible = filter.on && filter.kinds[f.kind] !== false && (!f.optional || filter.optional);
    }
  };
  const clear = () => {
    for (const o of objs) {
      o.removeFromParent();
      if (o instanceof Line) o.geometry.dispose();
    }
    objs = [];
  };
  const rebuild = (fs: DrillFeature[]) => {
    clear();
    for (const f of fs) {
      const parent = built.partsById.get(f.part.id);
      if (!parent) continue;
      const o = make(f);
      o.userData.drill = f;
      o.renderOrder = 1;
      parent.add(o);
      objs.push(o);
    }
    apply();
  };
  rebuild(features);

  let outlines: LineSegments[] = [];
  const outlineMat = new LineBasicMaterial({ color: new Color('#e5484d'), depthTest: false, transparent: true, opacity: 0.9 });
  const setHighlight = (ids: Set<string>) => {
    for (const o of outlines) { o.removeFromParent(); o.geometry.dispose(); }
    outlines = [];
    for (const id of ids) {
      const mesh = built.partsById.get(id);
      if (!mesh) continue;
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox!;
      const size = bb.getSize(new Vector3()), c = bb.getCenter(new Vector3());
      const box = new BoxGeometry(size.x + 4, size.y + 4, size.z + 4);
      box.translate(c.x, c.y, c.z);
      const o = new LineSegments(new EdgesGeometry(box), outlineMat);
      box.dispose();
      o.renderOrder = 2;
      mesh.add(o);
      outlines.push(o);
    }
  };

  return {
    setHighlight,
    rebuild,
    setFilter: (f) => { filter = f; apply(); },
    pick: (ray) => {
      const vis = objs.filter((o) => o instanceof Mesh && o.visible && o.parent?.visible);
      const hit = ray.intersectObjects(vis, false)[0];
      return hit ? (hit.object.userData.drill as DrillFeature) : null;
    },
    dispose: () => {
      clear();
      setHighlight(new Set());
      outlineMat.dispose();
      for (const g of geoms.values()) g.dispose();
      for (const m of [...mats.values(), ...lineMats.values()]) m.dispose();
    },
  };
}
