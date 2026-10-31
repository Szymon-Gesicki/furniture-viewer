// Small axonometric SVG of a cabinet with one or more boards highlighted (sheet and assembly step thumbnails)
import type { Part } from '../model/schema';
import { partBox, type V3 } from './plan';

const n1 = (v: number) => String(Math.round(v * 10) / 10);

// view from front-left-above: the cabinet front faces the viewer (frontN = outward normal of the fronts, model coords)
export function thumbSvg(parts: Part[], highlight: Set<string>, frontN: V3 = [0, -1, 0], sizePx = 160, labels?: Map<string, string>): string {
  const boxes = parts.map((p) => ({ p, b: partBox(p) })).filter((x): x is { p: Part; b: [V3, V3] } => !!x.b && x.p.layer !== 'room');
  if (!boxes.length) return '';
  // screen basis: right = (−n) × Z, depth = −n; axonometric: x' = r − 0.45·d, y' = z + 0.3·d … then y flipped
  const r: V3 = [-frontN[1], frontN[0], 0];
  const d: V3 = [-frontN[0], -frontN[1], 0];
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const proj = (p: V3): [number, number] => [dot(p, r) + 0.45 * dot(p, d), p[2] + 0.35 * dot(p, d)];
  const corners = (b: [V3, V3]) => [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => [b[x]![0], b[y]![1], b[z]![2]] as V3)));
  const all = boxes.flatMap((x) => corners(x.b).map(proj));
  const minX = Math.min(...all.map((q) => q[0])), maxX = Math.max(...all.map((q) => q[0]));
  const minY = Math.min(...all.map((q) => q[1])), maxY = Math.max(...all.map((q) => q[1]));
  const s = (sizePx - 8) / Math.max(maxX - minX, maxY - minY, 1);
  const W = (maxX - minX) * s + 8, H = (maxY - minY) * s + 8;
  const P = (p: V3) => { const [x, y] = proj(p); return `${n1((x - minX) * s + 4)},${n1(H - 4 - (y - minY) * s)}`; };
  // painter's order: far boxes first (along the view depth), then lower ones
  const order = [...boxes].sort((a, b) => dot(centre(b.b), d) - dot(centre(a.b), d) || centre(a.b)[2] - centre(b.b)[2]);
  const out: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" class="thumb" width="${n1(W)}" height="${n1(H)}" viewBox="0 0 ${n1(W)} ${n1(H)}">`];
  for (const { p, b } of order) {
    const hl = highlight.has(p.id);
    const [lo, hi] = b;
    // three visible faces: front (−d side), side (+r side) and top
    const faces: V3[][] = [];
    const pick = (axis: number, max: boolean) => corners(b).filter((c) => Math.abs(c[axis]! - (max ? hi[axis]! : lo[axis]!)) < 1e-6);
    const ia = Math.abs(d[0]) > 0.5 ? 0 : 1, ra = ia === 0 ? 1 : 0;
    const frontMax = d[ia]! < 0, rightMax = r[ra]! > 0;
    faces.push(pick(ia, frontMax), pick(ra, rightMax), pick(2, true));
    for (const f of faces) {
      const pts = hullOrder(f, proj);
      out.push(`<polygon points="${pts.map(P).join(' ')}" fill="${hl ? '#2f6f6a' : '#ece8e1'}" fill-opacity="${hl ? 0.85 : 0.9}" stroke="${hl ? '#1d4a46' : '#9a9387'}" stroke-width="${hl ? 0.9 : 0.4}"/>`);
    }
    const lab = labels?.get(p.id);
    if (lab) {
      const c = P(centre(b)).split(',');
      out.push(`<text x="${c[0]}" y="${c[1]}" font-size="7" text-anchor="middle" fill="#23211e" font-family="Helvetica, Arial, sans-serif">${lab.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</text>`);
    }
  }
  out.push('</svg>');
  return out.join('');
}
const centre = (b: [V3, V3]): V3 => [0, 1, 2].map((i) => (b[0][i]! + b[1][i]!) / 2) as V3;
// 4 corners of a box face in polygon order (sorted by angle around their projected centre)
function hullOrder(pts: V3[], proj: (p: V3) => [number, number]): V3[] {
  const q = pts.map((p) => ({ p, s: proj(p) }));
  const cx = q.reduce((a, x) => a + x.s[0], 0) / q.length, cy = q.reduce((a, x) => a + x.s[1], 0) / q.length;
  return q.sort((a, b) => Math.atan2(a.s[1] - cy, a.s[0] - cx) - Math.atan2(b.s[1] - cy, b.s[0] - cx)).map((x) => x.p);
}
