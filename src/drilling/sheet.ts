// Board sheet: a flat drawing of each drilled face of a board (SVG in paper mm) dimensioned by dims.ts
import type { Part } from '../model/schema';
import { partBox, type V3 } from './plan';
import { DRILL_KINDS, type DrillFeature } from './schema';
import { dimensionsFor, edgeDims, fmt, type Dim, type FaceGeom, type FaceHole, type Ref } from './dims';

export type SheetScale = '1:5' | 'fit';
export interface FaceSheet extends FaceGeom { face: string; faceLabel: string }
export type { FaceHole as SheetHole, Ref };

const AX = 'xyz';
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (i: number, s = 1): V3 => { const v: V3 = [0, 0, 0]; v[i] = s; return v; };
const n1 = (v: number) => String(Math.round(v * 10) / 10);
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const kindLabel = (k: string) => DRILL_KINDS.find((x) => x.id === k)?.label ?? k;
export const kindColor = (k: string) => DRILL_KINDS.find((x) => x.id === k)?.color ?? '#333';

// the edge opposite a reference edge (for naming all four sides of the drawing)
const OPPOSITE: [RegExp, string][] = [
  [/^front edge$/, 'back edge'], [/^BACK edge$/, 'front edge'], [/^panel bottom edge$/, 'panel top edge'],
  [/^door bottom edge$/, 'door top edge'], [/^hinge edge$/, 'opening edge'], [/^front bottom edge$/, 'front top edge'],
  [/^bottom \(hinge\) edge$/, 'top edge'], [/^left edge/, 'right edge (viewed from the front)'], [/^left end/, 'right end of the panel'],
  [/^inner/, 'outer face'],
];
const opposite = (label: string) => OPPOSITE.find(([re]) => re.test(label))?.[1] ?? `opposite of ${label}`;

// faces of one part, long side horizontal, viewed looking at the face (from outside)
export function faceSheets(part: Part, features: DrillFeature[]): FaceSheet[] {
  const b = partBox(part);
  if (!b) return [];
  const byFace = new Map<string, DrillFeature[]>();
  for (const f of features) if (f.part.id === part.id) byFace.set(f.face, [...(byFace.get(f.face) ?? []), f]);
  const out: FaceSheet[] = [];
  for (const [face, fs] of [...byFace].sort(([a], [c]) => a.localeCompare(c))) {
    const k = AX.indexOf(face[0]!), n = unit(k, face[1] === '+' ? 1 : -1);
    const [i, j] = [0, 1, 2].filter((x) => x !== k) as [number, number];
    const ext = (a: number) => b[1][a]! - b[0][a]!;
    const hAx = ext(i) >= ext(j) ? i : j;
    let right: V3, up: V3;
    if (k !== 2 && hAx !== 2) { up = unit(2); right = cross(up, n); }      // vertical board, long side horizontal
    else { right = unit(hAx); up = cross(n, right); }                        // long side vertical (laid flat) or a top face
    const corners = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => [b[x]![0], b[y]![1], b[z]![2]] as V3)));
    const x0 = Math.min(...corners.map((c) => dot(c, right))), y0 = Math.min(...corners.map((c) => dot(c, up)));
    const w = ext(hAx), h = ext(hAx === i ? j : i);
    const scr = (p: V3) => ({ x: dot(p, right) - x0, y: dot(p, up) - y0 });
    // which drawing edge each local coordinate is measured from
    const refOf = (val: number, pt: { x: number; y: number }, label: string, not?: 'x' | 'y'): Ref | null => {
      for (const axis of ['x', 'y'] as const) {
        if (axis === not) continue;
        const pos = pt[axis], size = axis === 'x' ? w : h;
        if (Math.abs(pos - val) < 0.6) return { axis, atMax: false, label };
        if (Math.abs(size - pos - val) < 0.6) return { axis, atMax: true, label };
      }
      return null;
    };
    const refs: Ref[] = [];
    const addRef = (r: Ref | null) => { if (r && !refs.some((x) => x.axis === r.axis && x.atMax === r.atMax && x.label === r.label)) refs.push(r); };
    const sorted = [...fs].sort((a, c) => a.kind.localeCompare(c.kind) || a.local.v - c.local.v || a.local.u - c.local.u);
    const holes: FaceHole[] = sorted.map((f, idx) => {
      const pt = scr(f.world.p);
      const v = f.local.runner_line_v ?? f.local.v;
      const vpt = scr([f.world.p[0], f.world.p[1], f.world.p[2] - (f.local.v - v)]);
      const ru = f.kind === 'runner-line' ? null : refOf(f.local.u, pt, f.local.u_from);
      addRef(ru);
      addRef(refOf(v, vpt, f.local.v_from, ru?.axis));
      return { n: idx + 1, f, ...pt, ...(f.line ? { to: scr(f.line.to) } : {}) };
    });
    const name = (axis: 'x' | 'y', atMax: boolean) => {
      const r = refs.find((x) => x.axis === axis && x.atMax === atMax);
      if (r) return r.label;
      const o = refs.find((x) => x.axis === axis && x.atMax !== atMax);
      return o ? opposite(o.label) : '';
    };
    out.push({ face, faceLabel: fs[0]!.local.face, w, h, holes, refs,
      edgeNames: { left: name('x', false), right: name('x', true), bottom: name('y', false), top: name('y', true) } });
  }
  return out;
}

// the same face seen from the other side (lay the drawing on the board): x flipped
export function mirrored(s: FaceSheet): FaceSheet {
  return { ...s, holes: s.holes.map((h) => ({ ...h, x: s.w - h.x, ...(h.to ? { to: { x: s.w - h.to.x, y: h.to.y } } : {}) })),
    refs: s.refs.map((r) => (r.axis === 'x' ? { ...r, atMax: !r.atMax } : r)),
    edgeNames: { ...s.edgeNames, left: s.edgeNames.right, right: s.edgeNames.left } };
}

const FIT = { w: 250, h: 120 };                   // drawing area on A4 landscape (paper mm)
export function scaleFor(s: Pick<FaceSheet, 'w' | 'h'>, scale: SheetScale): number {
  return scale === '1:5' ? 0.2 : Math.min(FIT.w / s.w, FIT.h / s.h, 1);
}

export interface SvgOpts {
  scale: SheetScale;
  measure?: 'none' | 'all' | number;              // Figma-style lines to the 4 edges: none, every hole, or hole #n
  kinds?: Set<string>;                            // hardware filter (undefined = all)
  showDims?: boolean;                             // workshop dims (ordinate/chain/spacing/Ø)
  box?: { w: number; h: number };                 // fit the board into this drawing area (paper mm) instead of the scale
  textScale?: number;                             // bigger text and symbols (phone: assembly mode)
}
const C = { ink: '#23211e', muted: '#6f6a62', ref: '#2f6f6a', dim: '#23211e', ph: '#c25e00', measure: '#e5484d', board: '#fbfaf7' };
const STEP0 = 7;                                  // paper mm between stacked dimension levels

// SVG of one face in paper millimetres
export function faceSvg(s0: FaceSheet, o: SvgOpts): string {
  const s: FaceSheet = o.kinds ? { ...s0, holes: s0.holes.filter((h) => o.kinds!.has(h.f.kind)) } : s0;
  const z = o.textScale ?? 1;
  const k = o.box ? Math.min(o.box.w / s.w, o.box.h / s.h) : scaleFor(s, o.scale);
  const dims = o.showDims === false ? [] : dimensionsFor(s);
  const holesReal = s.holes.filter((h) => h.f.kind !== 'runner-line');
  // every hole: non-reference lines that run through another hole are left out (that hole measures the rest)
  const between = (d: Dim, self: FaceHole) => d.kind === 'measure' && holesReal.some((h) => h !== self && (
    Math.abs(d.from[1] - d.to[1]) < 1e-6 ? Math.abs(h.y - d.from[1]) < 0.5 && h.x > Math.min(d.from[0], d.to[0]) && h.x < Math.max(d.from[0], d.to[0])
      : Math.abs(h.x - d.from[0]) < 0.5 && h.y > Math.min(d.from[1], d.to[1]) && h.y < Math.max(d.from[1], d.to[1])));
  const measures = o.measure === 'all' ? holesReal.flatMap((h) => edgeDims(s, h).filter((d) => d.kind !== 'measure' || d.ref || !between(d, h)))
    : typeof o.measure === 'number' ? holesReal.filter((h) => h.n === o.measure).flatMap((h) => edgeDims(s, h)) : [];
  const lv = (side: string) => Math.max(0, ...dims.filter((d) => (d.kind === 'ordinate' || (d.kind === 'linear' && d.role === 'edge')) && d.side === side)
    .map((d) => ('level' in d ? d.level + 1 : 0)));
  const W = s.w * k, H = s.h * k;
  const STEP = STEP0 * z;
  const bare = o.showDims === false;              // only Figma pills: tight margins
  const ml = (bare ? 6 : 24) * z + lv('left') * STEP, mb = (bare ? 6 : 18) * z + lv('below') * STEP, mt = (bare ? 6 : 12) * z, mr = (bare ? 6 : 26) * z;
  const X = (x: number) => ml + x * k, Y = (y: number) => mt + H - y * k;
  const tw = W + ml + mr, th = H + mt + mb;
  const o2: string[] = [];
  const col = (st: string) => (st === 'placeholder' ? C.ph : C.dim);
  const pill = (x: number, y: number, text: string, fill: string, color = '#fff', size0 = 2.4) => {
    const size = size0 * z, tw2 = text.length * size * 0.56 + 1.6, th2 = size + 1.2;
    return `<rect x="${n1(x - tw2 / 2)}" y="${n1(y - th2 / 2)}" width="${n1(tw2)}" height="${n1(th2)}" rx="${n1(th2 / 2)}" fill="${fill}"${fill === '#fff' ? ` stroke="${color}" stroke-width="0.15"` : ''}/>`
      + `<text x="${n1(x)}" y="${n1(y + size * 0.36)}" font-size="${size}" text-anchor="middle" fill="${color}" font-weight="600">${esc(text)}</text>`;
  };
  const line = (x1: number, y1: number, x2: number, y2: number, stroke: string, w = 0.2, extra = '') =>
    `<line x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}" stroke="${stroke}" stroke-width="${w}"${extra}/>`;

  o2.push(`<svg xmlns="http://www.w3.org/2000/svg" class="drill-svg" width="${n1(tw)}mm" height="${n1(th)}mm" viewBox="0 0 ${n1(tw)} ${n1(th)}" font-family="Helvetica, Arial, sans-serif">`);
  o2.push(`<defs><marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="2.2" markerHeight="2.2" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="${C.dim}"/></marker>`
    + `<marker id="am" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="2.2" markerHeight="2.2" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="${C.measure}"/></marker></defs>`);
  o2.push(`<rect x="${n1(X(0))}" y="${n1(Y(s.h))}" width="${n1(W)}" height="${n1(H)}" fill="${C.board}" stroke="${C.ink}" stroke-width="0.35"/>`);
  // edge names on all four sides; reference edges bold
  const isRef = (axis: 'x' | 'y', atMax: boolean) => s.refs.some((r) => r.axis === axis && r.atMax === atMax);
  const edgeText = (txt: string, x: number, y: number, rot: number, ref: boolean) => txt
    ? `<text x="${n1(x)}" y="${n1(y)}" font-size="${n1(2.4 * z)}" text-anchor="middle" fill="${ref ? C.ref : C.muted}"${ref ? ' font-weight="600"' : ''}${rot ? ` transform="rotate(${rot} ${n1(x)} ${n1(y)})"` : ''}>${esc(txt)}</text>` : '';
  for (const [axis, atMax] of [['x', false], ['x', true], ['y', false], ['y', true]] as const) if (isRef(axis, atMax))
    o2.push(axis === 'x' ? line(X(atMax ? s.w : 0), Y(0), X(atMax ? s.w : 0), Y(s.h), C.ref, 0.9) : line(X(0), Y(atMax ? s.h : 0), X(s.w), Y(atMax ? s.h : 0), C.ref, 0.9));
  // edge names: inside the outline when dimensions sit outside, outside it when the drawing has only Figma pills
  const io = bare ? -1 : 1;
  o2.push(edgeText(s.edgeNames.top, X(s.w / 2), Y(s.h) + (bare ? -1.4 : 3.2) * z, 0, isRef('y', true)));
  o2.push(edgeText(s.edgeNames.bottom, X(s.w / 2), Y(0) + (bare ? 3.2 : -1.4) * z, 0, isRef('y', false)));
  o2.push(edgeText(s.edgeNames.left, X(0) + io * (bare ? 1.4 : 3.2) * z, Y(s.h / 2), -90, isRef('x', false)));
  o2.push(edgeText(s.edgeNames.right, X(s.w) + (bare ? 3.2 : -1.6) * z, Y(s.h / 2), -90, isRef('x', true)));
  // pills keep clear of the edge names
  const nameBox = (txt: string, x: number, y: number, vert: boolean): [number, number, number, number] => {
    const l = txt.length * 2.4 * z * 0.55, t = 3 * z;
    return vert ? [x - t, y - l / 2, x + t / 2, y + l / 2] : [x - l / 2, y - t, x + l / 2, y + t / 2];
  };
  const placed: [number, number, number, number][] = [
    nameBox(s.edgeNames.top, X(s.w / 2), Y(s.h) + (bare ? -1.4 : 3.2) * z, false), nameBox(s.edgeNames.bottom, X(s.w / 2), Y(0) + (bare ? 3.2 : -1.4) * z, false),
    nameBox(s.edgeNames.left, X(0) + io * (bare ? 1.4 : 3.2) * z, Y(s.h / 2), true), nameBox(s.edgeNames.right, X(s.w) + (bare ? 3.2 : -1.6) * z, Y(s.h / 2), true)];

  const P = (p: [number, number]) => [X(p[0]), Y(p[1])] as const;
  for (const d of dims) if (d.kind === 'line') {
    const [x1, y1] = P(d.from), [x2, y2] = P(d.to);
    if (d.style === 'centre') { o2.push(line(x1, y1, x2, y2, '#b9b3a8', 0.12, ' stroke-dasharray="2 0.6 0.4 0.6"')); continue; }
    o2.push(line(x1, y1, x2, y2, kindColor('runner-line'), 0.45));
    const vert = Math.abs(x2 - x1) < Math.abs(y2 - y1), tx = (x1 + x2) / 2, ty = (y1 + y2) / 2;
    o2.push(`<text x="${n1(tx + (vert ? -1 : 0))}" y="${n1(ty - (vert ? 0 : 1))}" font-size="${n1(2.3 * z)}" text-anchor="middle" fill="${kindColor('runner-line')}"${vert ? ` transform="rotate(-90 ${n1(tx - 1)} ${n1(ty)})"` : ''}>${esc(d.text ?? '')}</text>`);
  }
  for (const d of dims) {
    if (d.kind === 'ordinate') {
      if (d.axis === 'x') {
        const yy = Y(0) + 8 * z + d.level * STEP, zx = X(d.zero);
        o2.push(line(X(0), yy, X(s.w), yy, C.muted, 0.18), `<circle cx="${n1(zx)}" cy="${n1(yy)}" r="0.7" fill="none" stroke="${C.dim}" stroke-width="0.25"/>`);
        for (const t of d.ticks) {
          const x = X(t.pos);
          o2.push(line(x, Y(0) + 0.6, x, yy + 1.2, '#c9c3b8', 0.1), line(x, yy - 1.2, x, yy + 1.2, C.dim, 0.25));
          o2.push(`<text x="${n1(x + 0.7)}" y="${n1(yy - 1.4)}" font-size="${n1(2.4 * z)}" fill="${col(t.status)}" transform="rotate(-60 ${n1(x + 0.7)} ${n1(yy - 1.4)})">${esc(t.text)}</text>`);
        }
      } else {
        const xx = X(0) - 8 * z - d.level * STEP, zy = Y(d.zero);
        o2.push(line(xx, Y(0), xx, Y(s.h), C.muted, 0.18), `<circle cx="${n1(xx)}" cy="${n1(zy)}" r="0.7" fill="none" stroke="${C.dim}" stroke-width="0.25"/>`);
        for (const t of d.ticks) {
          const y = Y(t.pos);
          o2.push(line(X(0) - 0.6, y, xx - 1.2, y, '#c9c3b8', 0.1), line(xx - 1.2, y, xx + 1.2, y, C.dim, 0.25));
          o2.push(`<text x="${n1(xx - 1.6)}" y="${n1(y + 0.85)}" font-size="${n1(2.4 * z)}" text-anchor="end" fill="${col(t.status)}">${esc(t.text)}</text>`);
        }
      }
    } else if (d.kind === 'linear') {
      const [ax, ay] = P(d.from), [bx, by] = P(d.to);
      if (d.role === 'edge') {
        if (d.axis === 'x') {
          const yy = Y(0) + 8 * z + d.level * STEP;
          o2.push(line(ax, Y(0), ax, yy + 1, '#c9c3b8', 0.1), line(bx, Y(0), bx, yy + 1, '#c9c3b8', 0.1));
          o2.push(line(ax, yy, bx, yy, C.dim, 0.2, ' marker-start="url(#ar)" marker-end="url(#ar)"'), pill((ax + bx) / 2, yy, d.text, '#fff', col(d.status)));
        } else {
          const xx = X(0) - 8 * z - d.level * STEP;
          o2.push(line(X(0), ay, xx - 1, ay, '#c9c3b8', 0.1), line(X(0), by, xx - 1, by, '#c9c3b8', 0.1));
          o2.push(line(xx, ay, xx, by, C.dim, 0.2, ' marker-start="url(#ar)" marker-end="url(#ar)"'), pill(xx, (ay + by) / 2, d.text, '#fff', col(d.status)));
        }
      } else {
        // spacing: a short dim right next to the holes (above a row, right of a column)
        const off = 3.2 * z;
        if (d.axis === 'x') o2.push(line(ax, ay - off, bx, by - off, C.dim, 0.18, ' marker-start="url(#ar)" marker-end="url(#ar)"'), pill((ax + bx) / 2, ay - off, d.text, '#fff', col(d.status), 2.1));
        else o2.push(line(ax + off, ay, bx + off, by, C.dim, 0.18, ' marker-start="url(#ar)" marker-end="url(#ar)"'), pill(ax + off + 2.6, (ay + by) / 2, d.text, '#fff', col(d.status), 2.1));
      }
    }
  }
  // holes
  for (const hl of holesReal) {
    const f = hl.f, c = kindColor(f.kind), x = X(hl.x), y = Y(hl.y), r = Math.max((f.dia / 2) * k, 0.6 * z);
    const ph = f.status === 'placeholder';
    o2.push(`<circle data-n="${hl.n}" cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${f.optional ? 'none' : c}" fill-opacity="${f.dia >= 20 ? 0.25 : 0.9}" stroke="${ph ? C.ph : c}" stroke-width="${ph ? 0.45 : 0.25}"${f.optional || ph ? ' stroke-dasharray="0.6 0.4"' : ''}/>`);
    if (f.dia >= 20) o2.push(line(x - r - 0.8, y, x + r + 0.8, y, c, 0.1), line(x, y - r - 0.8, x, y + r + 0.8, c, 0.1));
    o2.push(`<text x="${n1(x + r + 0.5)}" y="${n1(y - r - 0.2)}" font-size="${n1(1.9 * z)}" fill="${C.ink}">${hl.n}</text>`);
  }
  // Ø callouts
  for (const d of dims) if (d.kind === 'diameter') {
    const [x, y] = P(d.at), r = Math.max(d.r * k, 0.6);
    const x1 = x + r * 0.7, y1 = y - r * 0.7, x2 = x1 + 4, y2 = y1 - 4;
    o2.push(line(x1, y1, x2, y2, C.muted, 0.15), line(x2, y2, x2 + d.text.length * 1.25, y2, C.muted, 0.15));
    o2.push(`<text x="${n1(x2 + 0.3)}" y="${n1(y2 - 0.6)}" font-size="${n1(2.2 * z)}" fill="${col(d.status)}">${esc(d.text)}</text>`);
  }
  // Figma-style measure: hole → 4 edges, value in a pill (reference edges solid, the other two dashed)
  const free = (x: number, y: number, w2: number, h2: number) => !placed.some(([a, b, c2, d2]) => x - w2 / 2 < c2 && x + w2 / 2 > a && y - h2 / 2 < d2 && y + h2 / 2 > b);
  // reference edges first, so their values win the free spots
  for (const d of [...measures].sort((a, b) => Number((b as { ref?: boolean }).ref) - Number((a as { ref?: boolean }).ref))) if (d.kind === 'measure') {
    const [x1, y1] = P(d.from), [x2, y2] = P(d.to);
    const stroke = d.status === 'placeholder' ? C.ph : C.measure;
    o2.push(line(x1, y1, x2, y2, stroke, d.ref ? 0.3 : 0.18, ` marker-end="url(#am)"${d.ref ? '' : ' stroke-dasharray="1 0.6" opacity="0.8"'}`));
    const tw2 = d.text.length * 2.4 * z * 0.56 + 1.6 * z, th2 = 3.6 * z;
    const len = Math.hypot(x2 - x1, y2 - y1);
    // along the line where it does not cover another pill; too short: just outside the edge
    const ox = x2 + Math.sign(x2 - x1) * (tw2 / 2 + 0.8), oy = y2 + Math.sign(y2 - y1) * th2 * 0.7;
    const spots: [number, number][] = len < tw2 + 1
      ? [0, 1, -1, 2, -2, 3, -3].map((j) => (Math.abs(x1 - x2) < 1e-6 ? [ox + j * (tw2 + 1), oy] : [ox, oy + j * (th2 + 0.6)]) as [number, number])
      : [0.5, 0.3, 0.7, 0.2, 0.8].map((t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
    // a value from a reference edge is always shown (even if it has to overlap)
    const at = spots.find(([x, y]) => free(x, y, tw2, th2)) ?? (d.ref ? spots[0] : undefined);
    if (!at) continue;
    placed.push([at[0] - tw2 / 2, at[1] - th2 / 2, at[0] + tw2 / 2, at[1] + th2 / 2]);
    o2.push(pill(at[0], at[1], d.text, d.ref ? stroke : '#fff', d.ref ? '#fff' : stroke));
  }
  if (dims.some((d) => 'status' in d && d.status === 'placeholder') || measures.some((d) => d.kind === 'measure' && d.status === 'placeholder'))
    o2.push(`<text x="${n1(X(0))}" y="${n1(th - 2)}" font-size="${n1(2.3 * z)}" fill="${C.ph}">? = placeholder – zmierz na okuciu</text>`);
  o2.push('</svg>');
  return o2.join('');
}

export { fmt };
