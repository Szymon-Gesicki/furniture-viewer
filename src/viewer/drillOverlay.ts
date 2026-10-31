// Dimension overlay for orthographic views (PLAN 4.1): Figma-style lines from each hole to the 4 edges of its board face,
// value in a pill; drawn in screen space over the canvas, only for holes whose face looks at the camera.
import { Raycaster, Vector3, type Camera, type Mesh, type Object3D } from 'three';
import type { DrillFeature } from '../drilling/schema';
import { partBox } from '../drilling/plan';
import type { Part } from '../model/schema';
import { axisStatus } from '../drilling/dims';

const NS = 'http://www.w3.org/2000/svg';
const fmt = (v: number) => String(Math.round(v * 2) / 2).replace('.', ',');
const MAX = 80;                                   // more holes than this: too dense to read

export interface DrillOverlay {
  // occluders: visible meshes that can hide a hole (x-rayed fronts excluded); '' = drawn, otherwise a hint
  update(features: DrillFeature[], camera: Camera, w: number, h: number, occluders: Object3D[]): string;
  clear(): void; dispose(): void;
}

export function createDrillOverlay(host: HTMLElement, meshOf: (partId: string) => Mesh | undefined): DrillOverlay {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'drill-overlay');
  host.append(svg);
  const camDir = new Vector3(), v = new Vector3(), ray = new Raycaster();
  let last = '';

  const clear = () => { if (last) { svg.replaceChildren(); last = ''; } };
  return {
    clear,
    dispose: () => svg.remove(),
    // returns a hint when nothing is drawn on purpose ('' = drawn or nothing to draw)
    update(features, camera, w, h, occluders) {
      camera.getWorldDirection(camDir);           // from the camera into the scene
      const shown: { f: DrillFeature; m: Mesh; b: NonNullable<ReturnType<typeof partBox>> }[] = [];
      let hidden = 0;
      for (const f of features) {
        if (f.kind === 'runner-line') continue;
        const m = meshOf(f.part.id);
        if (!m || !m.visible) continue;
        // entry face must look at the camera: outward normal = −dir (model) → three (x, z, −y)
        const n = new Vector3(-f.world.dir[0], -f.world.dir[2], f.world.dir[1]);
        if (n.dot(camDir) > -0.95) continue;
        const b = partBox(m.userData.part as Part);
        if (!b) continue;
        // hidden behind another board (e.g. the far side panel seen through the near one)
        v.set(f.world.p[0], f.world.p[1], f.world.p[2]);
        m.localToWorld(v);
        ray.set(v.clone().addScaledVector(camDir, -1e5), camDir);
        const hit = ray.intersectObjects(occluders, false).find((x) => x.distance < 1e5 - 2);
        if (hit && hit.object !== m) { hidden++; continue; }
        shown.push({ f, m, b });
      }
      if (shown.length > MAX) { clear(); return `${shown.length} otworów w widoku – wybierz jedną grupę okuć lub część, aby zobaczyć wymiary`; }
      const toScreen = (m: Mesh, p: [number, number, number]) => {
        v.set(p[0], p[1], p[2]);
        m.localToWorld(v).project(camera);
        return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h] as const;
      };
      const out: string[] = [], pills: [number, number, number, number][] = [];
      const free = (x: number, y: number, tw: number) => !pills.some(([a, b2, c, d]) => x - tw / 2 < c && x + tw / 2 > a && y - 8 < d && y + 8 > b2);
      for (const { f, m, b } of shown) {
        const p = f.world.p, ax = f.face[0] === 'x' ? 0 : f.face[0] === 'y' ? 1 : 2;
        const [hx, hy] = toScreen(m, p);
        if (hx < -50 || hy < -50 || hx > w + 50 || hy > h + 50) continue;
        for (const i of [0, 1, 2]) {
          if (i === ax) continue;
          for (const end of [0, 1] as const) {
            const q: [number, number, number] = [p[0], p[1], p[2]];
            q[i] = b[end][i]!;
            const d = Math.abs(p[i]! - q[i]!);
            const [ex, ey] = toScreen(m, q);
            const len = Math.hypot(ex - hx, ey - hy);
            if (len < 4) continue;
            const isU = Math.abs(d - f.local.u) < 0.6, isV = Math.abs(d - (f.local.runner_line_v ?? f.local.v)) < 0.6 || Math.abs(d - f.local.v) < 0.6;
            const ref = isU || isV;
            const ph = ref && axisStatus(f, isU ? 'u' : 'v') === 'placeholder';
            const col = ph ? '#c25e00' : '#e5484d';
            out.push(`<line x1="${hx.toFixed(1)}" y1="${hy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${col}" stroke-width="${ref ? 1.4 : 0.8}"${ref ? '' : ' stroke-dasharray="4 3" opacity="0.7"'}/>`);
            if (len < 26) continue;
            const t = fmt(d) + (ph ? '?' : ''), tw = t.length * 6.4 + 8;
            // pill along the line where it does not cover another one
            const at = [0.5, 0.3, 0.7, 0.2, 0.8].map((k) => [hx + (ex - hx) * k, hy + (ey - hy) * k] as const).find(([x, y]) => free(x, y, tw));
            if (!at) continue;
            const [mx, my] = at;
            pills.push([mx - tw / 2, my - 8, mx + tw / 2, my + 8]);
            out.push(`<rect x="${(mx - tw / 2).toFixed(1)}" y="${(my - 8).toFixed(1)}" width="${tw.toFixed(1)}" height="16" rx="8" fill="${ref ? col : '#fff'}" stroke="${col}" stroke-width="0.8"/>`
              + `<text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" font-size="11" font-weight="600" text-anchor="middle" fill="${ref ? '#fff' : col}">${t}</text>`);
          }
        }
        out.push(`<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="3" fill="#e5484d"/>`);
      }
      const html = out.join('');
      if (!shown.length && hidden) { clear(); return `${hidden} otworów zasłoniętych – zaznacz część (dwuklik) lub ukryj warstwę, która je zasłania`; }
      if (html !== last) { svg.innerHTML = html; last = html; }
      return '';
    },
  };
}
