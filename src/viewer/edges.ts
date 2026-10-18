import { Color, EdgesGeometry, type BufferGeometry } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

export interface EdgeStyle { contrast: number; width: number }   // contrast 0–100 %, width 1–4 px
export const DEFAULT_EDGE_STYLE: EdgeStyle = { contrast: 70, width: 2 };

const BLACK = new Color(0, 0, 0);
// contrast 0 = 60 % of the board colour, 100 = black
export function edgeColor(hex: string, contrast: number): Color {
  const k = 0.4 + (0.6 * Math.min(100, Math.max(0, contrast))) / 100;
  return new Color(hex).lerp(BLACK, k);
}

// one LineMaterial per `${layer}|${material}` key – the sliders update a dozen materials, not hundreds of objects
export class EdgeMaterials {
  private mats = new Map<string, { mat: LineMaterial; hex: string }>();
  private res: [number, number] | null = null;   // current resolution – also applied to materials created later
  constructor(private style: EdgeStyle) {}
  get(key: string, hex: string): LineMaterial {
    let e = this.mats.get(key);
    if (!e) {
      const mat = new LineMaterial({ color: edgeColor(hex, this.style.contrast).getHex(), linewidth: this.style.width });
      if (this.res) mat.resolution.set(...this.res);
      e = { mat, hex };
      this.mats.set(key, e);
    }
    return e.mat;
  }
  setStyle(s: EdgeStyle) {
    this.style = { ...s };
    for (const { mat, hex } of this.mats.values()) {
      mat.color.copy(edgeColor(hex, s.contrast));
      mat.linewidth = s.width;
    }
  }
  setResolution(w: number, h: number) {
    this.res = [w, h];
    for (const { mat } of this.mats.values()) mat.resolution.set(w, h);
  }
  all(): LineMaterial[] { return [...this.mats.values()].map((e) => e.mat); }
}

export function edgeLines(geom: BufferGeometry, thresholdDeg: number, mat: LineMaterial): LineSegments2 {
  const g = new LineSegmentsGeometry().fromEdgesGeometry(new EdgesGeometry(geom, thresholdDeg));
  const lines = new LineSegments2(g, mat);
  lines.raycast = () => {};                     // clicks hit the board, not the line
  return lines;
}
