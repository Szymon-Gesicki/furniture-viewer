// Dimensioning engine (PLAN section 3): pure functions from a drawn face to dimension primitives, in board mm
// (x right, y up on the drawing, origin = bottom-left corner of the face). Two styles:
//  * workshop drawing: ordinate / chain dims from the reference edges, spacings, Ø callouts, hole lines;
//  * Figma-style "measure": from one hole to all 4 edges, value in a pill on each line.
import type { DrillFeature } from './schema';
import { groupOf, type HoleStatus } from './catalog';

export interface FaceHole { n: number; f: DrillFeature; x: number; y: number; to?: { x: number; y: number } }
export interface Ref { axis: 'x' | 'y'; atMax: boolean; label: string }
export interface FaceGeom { w: number; h: number; holes: FaceHole[]; refs: Ref[]; edgeNames: { left: string; right: string; bottom: string; top: string } }

export type Pt = [number, number];
export type Dim =
  | { kind: 'linear'; from: Pt; to: Pt; axis: 'x' | 'y'; side: 'below' | 'above' | 'left' | 'right'; level: number; text: string; status: HoleStatus; role: 'edge' | 'spacing' }
  | { kind: 'ordinate'; axis: 'x' | 'y'; zero: number; side: 'below' | 'left'; level: number; ticks: { pos: number; text: string; status: HoleStatus }[]; label: string }
  | { kind: 'diameter'; at: Pt; r: number; text: string; status: HoleStatus }
  | { kind: 'line'; from: Pt; to: Pt; style: 'centre' | 'runner'; text?: string }
  | { kind: 'measure'; from: Pt; to: Pt; text: string; edge: 'left' | 'right' | 'bottom' | 'top'; ref: boolean; status: HoleStatus };

export const fmt = (v: number) => String(Math.round(v * 2) / 2).replace('.', ',');   // 0.5 precision, Polish decimal
const key = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

// placeholder flags per axis (HARDWARE.md): Camar u, runner screw height, inset hinges; the rest from the feature
export function axisStatus(f: DrillFeature, which: 'u' | 'v'): HoleStatus {
  if (f.kind === 'hanger-dowel') return which === 'u' ? 'placeholder' : 'verified';
  if (f.kind === 'runner-screw') return which === 'v' ? 'placeholder' : 'verified';
  return f.status;
}
const withQ = (text: string, s: HoleStatus) => (s === 'placeholder' ? text + '?' : text);

// value of a hole measured from a reference edge, in board coordinates
const along = (h: FaceHole, r: Ref, g: FaceGeom) => {
  const p = r.axis === 'x' ? h.x : h.y, size = r.axis === 'x' ? g.w : g.h;
  return r.atMax ? size - p : p;
};
// which local value (u or v) a reference edge carries for this feature
const refWhich = (f: DrillFeature, r: Ref): 'u' | 'v' => (r.label === f.local.u_from ? 'u' : 'v');

export interface DimOpts { ordinateFrom?: number; maxSpacing?: number }

// workshop drawing dims for the holes of one face
export function dimensionsFor(g: FaceGeom, holes: FaceHole[] = g.holes, opts: DimOpts = {}): Dim[] {
  const out: Dim[] = [];
  const ordFrom = opts.ordinateFrom ?? 3, maxSp = opts.maxSpacing ?? 330;
  const real = holes.filter((h) => h.f.kind !== 'runner-line');
  const levels = { below: 0, left: 0, above: 0, right: 0 };

  // 1–2: per reference edge, ordinate (≥ 3 distinct values) or chain (1–2 values); always from the reference edge
  for (const r of g.refs) {
    const vals = new Map<string, { pos: number; status: HoleStatus }>();
    for (const h of holes) {
      const which = refWhich(h.f, r);
      const label = which === 'u' ? h.f.local.u_from : h.f.local.v_from;
      if (label !== r.label || (h.f.kind === 'runner-line' && which === 'u')) continue;
      // runner screws are dimensioned to the runner line (their height is set by the runner itself)
      const p = h.f.kind === 'runner-screw' && which === 'v' ? null : along(h, r, g);
      if (p === null) continue;
      const k = key(p), st = axisStatus(h.f, which), prev = vals.get(k);
      vals.set(k, { pos: p, status: prev?.status === 'placeholder' ? 'placeholder' : st });
    }
    if (!vals.size) continue;
    const list = [...vals.values()].sort((a, b) => a.pos - b.pos);
    const side = r.axis === 'x' ? 'below' : 'left';
    const zero = r.atMax ? (r.axis === 'x' ? g.w : g.h) : 0;
    const coord = (p: number) => (r.atMax ? zero - p : p);
    if (list.length >= ordFrom) {
      out.push({ kind: 'ordinate', axis: r.axis, zero, side, level: levels[side]++, label: r.label,
        ticks: list.map((v) => ({ pos: coord(v.pos), text: withQ(fmt(v.pos), v.status), status: v.status })) });
    } else {
      for (const v of list) {
        const a: Pt = r.axis === 'x' ? [zero, 0] : [0, zero], b: Pt = r.axis === 'x' ? [coord(v.pos), 0] : [0, coord(v.pos)];
        out.push({ kind: 'linear', from: a, to: b, axis: r.axis, side, level: levels[side]++, text: withQ(fmt(v.pos), v.status), status: v.status, role: 'edge' });
      }
    }
  }

  // 3: spacing between consecutive holes of the same hardware group on one line (45, 32, 320, 128 …)
  const seen = new Set<string>();
  for (const axis of ['x', 'y'] as const) {
    const other = axis === 'x' ? 'y' : 'x';
    const rows = new Map<string, FaceHole[]>();
    for (const h of real) {
      const grp = groupOf(h.f.kind);
      if (grp === 'shelf' || grp === 'fixed') continue;
      const k = `${grp}|${key(h[other])}`;
      rows.set(k, [...(rows.get(k) ?? []), h]);
    }
    for (const row of rows.values()) {
      const s = [...row].sort((a, b) => a[axis] - b[axis]);
      for (let i = 1; i < s.length; i++) {
        const a = s[i - 1]!, b = s[i]!, d = b[axis] - a[axis];
        if (d < 0.5 || d > maxSp) continue;
        const id = `${axis}|${key(a[axis])}|${key(b[axis])}|${key(a[other])}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const st: HoleStatus = [a, b].some((h) => axisStatus(h.f, axis === 'x' ? xWhich(h, g) : yWhich(h, g)) === 'placeholder') ? 'placeholder' : 'verified';
        const side = axis === 'x' ? 'above' : 'right';
        out.push({ kind: 'linear', from: [a.x, a.y], to: [b.x, b.y], axis, side, level: 0, text: withQ(fmt(d), st), status: st, role: 'spacing' });
      }
    }
  }

  // 4: Ø callouts, identical holes grouped ("4 × Ø10 × 12")
  const byType = new Map<string, FaceHole[]>();
  for (const h of real) {
    const k = `${h.f.kind}|${h.f.dia}|${h.f.depth}`;
    byType.set(k, [...(byType.get(k) ?? []), h]);
  }
  for (const hs of byType.values()) {
    const f = hs[0]!.f;
    const anchor = [...hs].sort((a, b) => b.y - a.y || b.x - a.x)[0]!;
    out.push({ kind: 'diameter', at: [anchor.x, anchor.y], r: f.dia / 2, text: `${hs.length > 1 ? hs.length + ' × ' : ''}Ø${fmt(f.dia)} × ${fmt(f.depth)}`, status: f.status });
  }

  // 5: centre lines through holes sharing x or y; the runner bottom line solid
  for (const axis of ['x', 'y'] as const) {
    const groups = new Map<string, FaceHole[]>();
    for (const h of real) groups.set(key(h[axis]), [...(groups.get(key(h[axis])) ?? []), h]);
    for (const [k, hs] of groups) {
      if (hs.length < 2) continue;
      const c = Number(k);
      out.push({ kind: 'line', from: axis === 'x' ? [c, 0] : [0, c], to: axis === 'x' ? [c, g.h] : [g.w, c], style: 'centre' });
    }
  }
  for (const h of holes) if (h.f.kind === 'runner-line' && h.to)
    out.push({ kind: 'line', from: [h.x, h.y], to: [h.to.x, h.to.y], style: 'runner', text: `linia prowadnicy ${fmt(h.f.local.v)}` });
  return out;
}
// which local value runs along drawing x / y for a hole (by its reference edges)
const xWhich = (h: FaceHole, g: FaceGeom): 'u' | 'v' => (g.refs.find((r) => r.axis === 'x' && r.label === h.f.local.u_from) ? 'u' : 'v');
const yWhich = (h: FaceHole, g: FaceGeom): 'u' | 'v' => (xWhich(h, g) === 'u' ? 'v' : 'u');

// Figma-style measure: from the hole centre to all 4 edges, each with its value; reference edges flagged
export function edgeDims(g: FaceGeom, h: FaceHole): Dim[] {
  const isRef = (axis: 'x' | 'y', atMax: boolean) => g.refs.some((r) => r.axis === axis && r.atMax === atMax && (r.label === h.f.local.u_from || r.label === h.f.local.v_from));
  const st = (axis: 'x' | 'y') => axisStatus(h.f, axis === 'x' ? xWhich(h, g) : yWhich(h, g));
  const m = (to: Pt, edge: 'left' | 'right' | 'bottom' | 'top', d: number, axis: 'x' | 'y', atMax: boolean): Dim =>
    ({ kind: 'measure', from: [h.x, h.y], to, edge, text: withQ(fmt(d), isRef(axis, atMax) ? st(axis) : 'verified'), ref: isRef(axis, atMax), status: isRef(axis, atMax) ? st(axis) : 'verified' });
  return [
    m([0, h.y], 'left', h.x, 'x', false), m([g.w, h.y], 'right', g.w - h.x, 'x', true),
    m([h.x, 0], 'bottom', h.y, 'y', false), m([h.x, g.h], 'top', g.h - h.y, 'y', true),
  ];
}
