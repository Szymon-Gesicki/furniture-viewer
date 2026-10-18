import { BoxGeometry, BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Matrix4, Shape as TShape, Vector2 } from 'three';
import type { Shape } from '../model/schema';

// mapping (u, v, w) → (x, y, z) for the polygon plane; w = extrusion direction
const BASIS: Record<'xy' | 'yz' | 'xz', [number[], number[], number[]]> = {
  xy: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  yz: [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
  xz: [[1, 0, 0], [0, 0, 1], [0, -1, 0]],   // w = −y to avoid mirroring (determinant +1)
};

export function shapeToGeometry(s: Shape): BufferGeometry {
  if (s.type === 'box') {
    const size = [0, 1, 2].map((i) => s.max[i]! - s.min[i]!);
    const g = new BoxGeometry(size[0], size[1], size[2]);
    g.translate(...([0, 1, 2].map((i) => (s.min[i]! + s.max[i]!) / 2) as [number, number, number]));
    return g;
  }
  if (s.type === 'extrude') {
    const sh = new TShape(s.outline.map(([u, v]) => new Vector2(u, v)));
    const g = new ExtrudeGeometry(sh, { depth: s.to - s.from, bevelEnabled: false });
    const [bu, bv, bw] = BASIS[s.plane];
    // offset along the extrusion axis: for w = +axis start at `from`, for w = −axis at `to`
    const off = (k: number) => (bw[k] === 1 ? s.from : bw[k] === -1 ? s.to : 0);
    const m = new Matrix4().set(
      bu[0]!, bv[0]!, bw[0]!, off(0),
      bu[1]!, bv[1]!, bw[1]!, off(1),
      bu[2]!, bv[2]!, bw[2]!, off(2),
      0, 0, 0, 1);
    g.applyMatrix4(m);
    return g;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(s.positions, 3));
  g.computeVertexNormals();
  return g;
}
