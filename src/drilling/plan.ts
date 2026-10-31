// Drilling plan (hinges, plates, drawers, shelves, handles) – port of docs/drilling/reference/drill.py.
// Pure function of the model + per-project overrides; all dimensions in mm, world = model coordinates (Z up).
import type { Model, Part } from '../model/schema';
import { mergeParams } from './params';
import { itemFor, statusFor, type HoleStatus } from './catalog';
import type { DrillFeature, DrillKindId, DrillOverrides, DrillPlan, HingeRecord, Moved } from './schema';

export type V3 = [number, number, number];
type Bx = [V3, V3];
export interface DPart extends Part { b: Bx }

// Python round(): half to even (the fixtures were produced with it)
export function pyRound(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : r;
}
const r1 = (v: number) => pyRound(v * 10) / 10;

export function partBox(p: Part): Bx | null {
  const s = p.shape;
  if (s.type === 'box') return [[...s.min] as V3, [...s.max] as V3];
  if (s.type === 'extrude') {
    const ax = { yz: 0, xz: 1, xy: 2 }[s.plane];
    const keep = [0, 1, 2].filter((i) => i !== ax);
    const mn: V3 = [0, 0, 0], mx: V3 = [0, 0, 0];
    keep.forEach((i, k) => {
      const vals = s.outline.map((pt) => pt[k]!);
      mn[i] = Math.min(...vals); mx[i] = Math.max(...vals);
    });
    mn[ax] = s.from; mx[ax] = s.to;
    return [mn, mx];
  }
  return null;
}
const dims = (b: Bx) => [0, 1, 2].map((i) => b[1][i]! - b[0][i]!);
export const thinAxis = (b: Bx) => { const d = dims(b); return d.indexOf(Math.min(...d)); };
const ctr = (b: Bx): V3 => [0, 1, 2].map((i) => (b[0][i]! + b[1][i]!) / 2) as V3;
const vec = (i: number, s: number): V3 => { const v: V3 = [0, 0, 0]; v[i] = s; return v; };
const overlap = (b1: Bx, b2: Bx, i: number) => Math.min(b1[1][i]!, b2[1][i]!) - Math.max(b1[0][i]!, b2[0][i]!) > 0;
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const hi = (b: Bx, i: number, s: number) => (s > 0 ? b[1][i]! : b[0][i]!);   // face of the box on the s side of axis i

export interface Frame { n: V3; ni: number; ns: number; a: number; rs: number }
interface SideHit { p: DPart; ov: number; face: number; gap: number }

export function planDrilling(model: Model, overrides?: Partial<DrillOverrides>): DrillPlan {
  const ov = { hingeSide: {}, shelfMode: {}, hingeZ: {}, ...overrides } as DrillOverrides;
  const P = mergeParams(ov.params);
  const parts: DPart[] = [];
  for (const p of model.parts) {
    const b = partBox(p);
    if (b && p.layer !== 'room') parts.push({ ...p, b });
  }
  const plan: DrillPlan = { hinges: [], drawers: [], shelves: [], handles: [], tipons: [], hangers: [], warnings: [], features: [] };
  let fid = 0;
  const warn = (unit: string, text: string) => plan.warnings.push({ unit, text });

  const feat = (cab: string, unit: string, kind: DrillKindId, part: DPart, faceN: V3, world: V3, local: DrillFeature['local'],
                dia: number, depth: number, hw: string, extra: Partial<DrillFeature> = {}) => {
    fid += 1;
    const item = itemFor(kind, hw);
    const status: HoleStatus = extra.status ?? statusFor(kind, item);
    const ax = faceN.findIndex((c) => c !== 0);
    plan.features.push({
      id: `f${String(fid).padStart(4, '0')}`, cabinet: cab, unit, kind, hardware: hw,
      part: { id: part.id, name: part.name },
      face: 'xyz'[ax]! + (faceN[ax]! > 0 ? '+' : '-'),
      world: { p: world.map(r1) as V3, dir: faceN.map((c) => (c === 0 ? 0 : -c)) as V3 },
      local, dia, depth, note: '', verify: false, optional: false, item, ...extra, status,
    });
  };

  const carcass = parts.filter((p) => p.layer === 'carcass' || p.layer === 'cladding' || p.layer === 'fillers');
  const fronts = parts.filter((p) => p.layer === 'front');
  const handles = parts.filter((p) => p.layer === 'handles');   // model handle parts: only for the hinge-side rule 4.1
  const doorInfos: { d: DPart; cab: string; f: Frame; hingeEdge: number; zlo: number; zhi: number; doorBack: number }[] = [];

  // ---------------------------------------------------------------- helpers
  function doorFrame(d: DPart): Frame {
    const b = d.b, ai = thinAxis(b);
    const car = parts.filter((p) => p.unit === d.unit && p.layer === 'carcass');
    const cc: V3 = car.length
      ? ctr([[0, 1, 2].map((i) => Math.min(...car.map((p) => p.b[0][i]!))) as V3, [0, 1, 2].map((i) => Math.max(...car.map((p) => p.b[1][i]!))) as V3])
      : [0, 0, 0];
    const ns = ctr(b)[ai]! > cc[ai]! ? 1 : -1;
    const n = vec(ai, ns);
    const a = [0, 1].find((i) => i !== ai)!;
    const v = n.map((c) => -c) as V3, up: V3 = [0, 0, 1];
    const right = [v[1] * up[2] - v[2] * up[1], v[2] * up[0] - v[0] * up[2], v[0] * up[1] - v[1] * up[0]];
    return { n, ni: ai, ns, a, rs: Math.trunc(right[a]!) };
  }

  // vertical panel with thin axis a whose inner face is inward of `edge`, just behind the door
  function sidePanelAt(edge: number, a: number, nAx: number, nSgn: number, doorBack: number, zlo: number, zhi: number, inward: number): SideHit | null {
    let best: (SideHit & { score: number }) | null = null;
    for (const p of carcass) {
      const b = p.b;
      if (thinAxis(b) !== a) continue;
      const front = hi(b, nAx, nSgn);
      const gap = (doorBack - front) * nSgn;
      if (!(gap >= -1 && gap <= 30)) continue;
      const ovz = Math.min(b[1][2], zhi) - Math.max(b[0][2], zlo);
      if (ovz < 0.5 * (zhi - zlo) && ovz < 150) continue;
      const face = hi(b, a, inward);              // face toward the door centre
      const outer = hi(b, a, -inward);
      const o = (face - edge) * inward;
      if (o >= -25 && o <= 25 && (outer - edge) * inward <= 2) {
        const score = Math.abs(o - 16) + Math.abs(gap);
        if (!best || score < best.score) best = { score, p, ov: o, face, gap };
      }
    }
    return best;
  }

  // panel beside an inset door: its face toward the door just outside the door edge, front flush with the door front
  function insetSide(edge: number, a: number, nAx: number, nSgn: number, doorFront: number, zlo: number, zhi: number, inward: number) {
    let best: { gapl: number; p: DPart; face: number } | null = null;
    for (const p of carcass) {
      const b = p.b;
      if (thinAxis(b) !== a) continue;
      if (Math.min(b[1][2], zhi) - Math.max(b[0][2], zlo) < 0.8 * (zhi - zlo)) continue;
      if (Math.abs(hi(b, nAx, nSgn) - doorFront) > 3) continue;
      const face = hi(b, a, inward);
      const gapl = (edge - face) * inward;
      if (gapl >= 0 && gapl <= 5 && (!best || gapl < best.gapl)) best = { gapl, p, face };
    }
    return best;
  }

  // panels touching the side panel's inner region within the plate depth window
  function blockers(side: DPart, nAx: number, nSgn: number, depthLo: number, depthHi: number): DPart[] {
    const sb = side.b, front = hi(sb, nAx, nSgn), a = thinAxis(sb);
    return carcass.filter((p) => {
      if (p === side) return false;
      const b = p.b;
      if (thinAxis(b) === a) return false;
      const d0 = nSgn > 0 ? front - b[1][nAx]! : b[0][nAx]! - front;
      const d1 = nSgn > 0 ? front - b[0][nAx]! : b[1][nAx]! - front;
      const lo = Math.min(d0, d1), hh = Math.max(d0, d1);
      if (hh < depthLo || lo > depthHi) return false;
      if (lo < -0.5 || p.layer === 'fillers') return false;
      if (!(b[0][a]! <= sb[1][a]! + 1 && b[1][a]! >= sb[0][a]! - 1)) return false;
      return !(b[1][2] < sb[0][2] - 1 || b[0][2] > sb[1][2] + 1);
    });
  }

  const handlesOf = (d: DPart, f: Frame, doorFront: number) =>
    handles.filter((h) => overlap(h.b, d.b, f.a) && overlap(h.b, d.b, 2)
      && Math.abs(((h.b[0][f.ni]! + h.b[1][f.ni]!) / 2 - doorFront) * f.ns) < 40);


  // ---------------------------------------------------------------- doors
  function doorCabinet(nm: string) {
    if (nm.startsWith('P ')) return 'Pawlacz';
    if (/^(N1|N2|RTV)/.test(nm)) return nm.split(' ').slice(0, 2).join(' ');
    if (nm.startsWith('Drzwi')) return 'Rozdzielnia';
    return nm.split(' ')[0]!;
  }

  function door(d: DPart) {
    const H = P.hinge, b = d.b, nm = d.name;
    const f = doorFrame(d), { n, ni, ns, a, rs } = f;
    const cab = doorCabinet(nm), unit = d.unit;
    const zlo = b[0][2], zhi = b[1][2];
    const doorBack = hi(b, ni, -ns), doorFront = hi(b, ni, ns);
    const flap = nm.includes('Klapa');
    // ---- which edge carries the hinges (SPEC 4.1)
    let side: 'L' | 'P' | null = null, reason = '';
    if (ov.hingeSide[nm]) { side = ov.hingeSide[nm]!; reason = 'project override'; }
    if (!side) {
      if (/zawiasy L/.test(nm)) { side = 'L'; reason = 'label'; }
      else if (/zawiasy P/.test(nm)) { side = 'P'; reason = 'label'; }
    }
    const hnd = handlesOf(d, f, doorFront);
    let handleSide: 'L' | 'P' | null = null;
    if (hnd.length && !flap) {
      const hc = hnd.reduce((s, h) => s + (h.b[0][a]! + h.b[1][a]!) / 2, 0) / hnd.length;
      const mid = (b[0][a]! + b[1][a]!) / 2;
      if (Math.abs(hc - mid) > 0.15 * (b[1][a]! - b[0][a]!)) handleSide = (hc - mid) * rs > 0 ? 'P' : 'L';
    }
    if (!side && handleSide) { side = handleSide === 'P' ? 'L' : 'P'; reason = 'opposite the handle'; }
    if (!side) {
      if (/Drzwi L |Drzwi lewe/.test(nm)) { side = 'L'; reason = 'door name (left door)'; }
      else if (/Drzwi P |Drzwi prawe/.test(nm)) { side = 'P'; reason = 'door name (right door)'; }
    }
    if (side && handleSide && side === handleSide && !flap) warn(unit, `${nm}: hinge side ${side} is the same side as the handle`);
    let hw = nm.includes('155') ? '71B7550' : '71B3550';
    if (flap) { flapHinges(d, cab, f, hw); return; }
    if (!side) { warn(unit, `${nm}: hinge side unknown - skipped`); return; }
    const edge = (side === 'P') === (rs > 0) ? b[1][a]! : b[0][a]!;
    const inward = edge === b[1][a] ? -1 : 1;
    const sp = sidePanelAt(edge, a, ni, ns, doorBack, zlo, zhi, inward);
    let inset = false, sideP: DPart, overlay: number, face: number, B: number;
    if (!sp) {
      const ins = insetSide(edge, a, ni, ns, doorFront, zlo, zhi, inward);
      if (!ins) { warn(unit, `${nm}: no carcass side found behind the hinge edge`); return; }
      inset = true; hw = '71B3750';
      sideP = ins.p; overlay = -ins.gapl; face = ins.face; B = H.inset_B;
    } else {
      sideP = sp.p; overlay = sp.ov; face = sp.face; B = overlay - H.B_minus;
    }
    const range = H.B_range[hw] ?? [3, 7];
    if (!inset && !(B >= range[0] && B <= range[1])) warn(unit, `${nm}: overlay ${r1(overlay)} -> B=${r1(B)} outside Blum range ${range[0]}-${range[1]}`);
    const Hh = zhi - zlo;
    const sb = sideP.b, sideFront = hi(sb, ni, ns);
    const setback = H.plate_setback + (inset ? H.inset_extra_setback : 0);
    const blk = blockers(sideP, ni, ns, 0, setback + 25);
    const clash = (zz: number): DPart | string | null => {
      for (const p of blk)
        if (zz + H.plate_half_height > p.b[0][2] - H.clash_below && zz - H.plate_half_height < p.b[1][2] + H.clash_above) return p;
      if (zz - H.plate_half_height < sb[0][2] || zz + H.plate_half_height > sb[1][2]) return 'side end';
      const rc = H.cup_dia / 2, e = H.cup_min_from_door_edge;
      if (zz - rc < zlo + e || zz + rc > zhi - e) return 'door edge';
      return null;
    };
    const clashName = (c: DPart | string | null) => (c === null ? '' : typeof c === 'string' ? c : c.name);
    const moved: Moved[] = [];
    let outZ: number[];
    const manual = ov.hingeZ[nm];
    if (manual) {
      outZ = manual.map((v) => zlo + v);
      reason += ' · hinge heights: project override';
      outZ.forEach((z, k) => { const c = clash(z); if (c) warn(unit, `${nm}: hinge ${k + 1} (override ${r1(z - zlo)}) clashes with ${clashName(c)}`); });
    } else {
      const cnt = H.count.find(([lim]) => Hh <= lim)?.[1] ?? H.count[H.count.length - 1]![1];
      const ed = Hh >= 400 ? H.edge_dist_tall : Math.max(H.edge_dist_min, pyRound(Hh * H.edge_dist_small_factor));
      const zs = Array.from({ length: cnt }, (_, i) => zlo + ed + (i * (Hh - 2 * ed)) / (cnt - 1));
      outZ = zs.map((z0, k) => {
        let z = z0;
        if (clash(z)) {
          let ok = false;
          for (let dz = 1; dz < 200; dz++) {
            // top/bottom hinge: towards the door centre first; middle hinge: +dz, then −dz
            const cand = k === cnt - 1 ? [z - dz, z + dz] : [z + dz, z - dz];
            const hit = cand.find((c) => !clash(c));
            if (hit !== undefined) { z = hit; ok = true; break; }
          }
          if (!ok) warn(unit, `${nm}: hinge ${k + 1} cannot avoid ${clashName(clash(z))}`);
          moved.push({ hinge: k + 1, from: r1(z0 - zlo), to: r1(z - zlo), because: clashName(clash(z0)) });
        }
        return z;
      }).map(pyRound);
    }
    const cupU = B + H.cup_edge_offset;
    const rec: HingeRecord = {
      cabinet: cab, unit, door: { id: d.id, name: nm }, size: [r1(b[1][a]! - b[0][a]!), r1(Hh)],
      hinge_side: side, hinge_side_reason: reason, hardware: hw, inset,
      side_panel: { id: sideP.id, name: sideP.name }, overlay: r1(overlay), B: r1(B),
      cup_from_edge: r1(cupU), plate_setback: setback,
      hinges_from_door_bottom: outZ.map((z) => r1(z - zlo)), plates_from_side_bottom: outZ.map((z) => r1(z - sb[0][2])), moved,
    };
    plan.hinges.push(rec);
    const dn = n.map((c) => -c) as V3;
    const v = inset ? { verify: true, status: 'placeholder' as const, note: 'INSET door – B and plate setback to verify (Blum chart / E-SERVICES)' } : {};
    for (const z of outZ) {
      const wp: V3 = [0, 0, 0]; wp[a] = edge + inward * cupU; wp[ni] = doorBack; wp[2] = z;
      feat(cab, unit, 'hinge-cup', d, dn, wp, { u: r1(cupU), v: r1(z - zlo), u_from: 'hinge edge', v_from: 'door bottom edge', face: 'back' },
        H.cup_dia, H.cup_depth, hw, v);
      for (const s of [-1, 1]) {
        const w2 = [...wp] as V3; w2[a] = edge + inward * (cupU + H.screw_offset); w2[2] = z + (s * H.screw_spacing) / 2;
        feat(cab, unit, 'hinge-screw', d, dn, w2, { u: r1(cupU + H.screw_offset), v: r1(z + (s * H.screw_spacing) / 2 - zlo), u_from: 'hinge edge', v_from: 'door bottom edge', face: 'back' },
          H.screw_dia, H.screw_depth, '609.1500', v);
      }
      const fn = vec(a, inward);
      for (const s of [-1, 1]) {
        const w3: V3 = [0, 0, 0]; w3[a] = face; w3[ni] = sideFront - ns * setback; w3[2] = z + (s * H.plate_screw_spacing) / 2;
        feat(cab, unit, 'plate-screw', sideP, fn, w3, { u: setback, v: r1(z + (s * H.plate_screw_spacing) / 2 - sb[0][2]), u_from: 'front edge', v_from: 'panel bottom edge', face: 'inner (towards the door centre)' },
          H.plate_screw_dia, H.plate_screw_depth, inset ? '173L6100 (inset setback)' : '173L6100', v);
      }
    }
    doorInfos.push({ d, cab, f, hingeEdge: edge, zlo, zhi, doorBack });
  }

  function flapHinges(d: DPart, cab: string, f: Frame, hw: string) {
    const H = P.hinge, b = d.b, nm = d.name, { n, ni, ns, a, rs } = f;
    const zlo = b[0][2], doorBack = hi(b, ni, -ns);
    // plate surface: top face of the panel directly behind the flap bottom edge
    let best: { p: DPart; ov: number } | null = null;
    for (const p of carcass) {
      const pb = p.b;
      if (thinAxis(pb) !== 2 || !overlap(pb, b, a)) continue;
      const g = (doorBack - hi(pb, ni, ns)) * ns;
      if (!(g >= -1 && g <= 30)) continue;
      const o = pb[1][2] - zlo;
      if (o > 0 && o < 25 && (!best || Math.abs(o - 16) < Math.abs(best.ov - 16))) best = { p, ov: o };
    }
    if (!best) { warn(d.unit, `${nm}: flap support panel not found`); return; }
    const side = best.p, overlay = best.ov, B = overlay - H.B_minus, sb = side.b;
    const sideFront = hi(sb, ni, ns);
    const W = b[1][a]! - b[0][a]!, ed = H.flap_edge_dist;
    const leftEdge = rs > 0 ? b[0][a]! : b[1][a]!;
    const us = [ed, W - ed];
    const cupV = B + H.cup_edge_offset;
    plan.hinges.push({
      cabinet: cab, unit: d.unit, door: { id: d.id, name: nm }, size: [r1(W), r1(b[1][2] - zlo)], hinge_side: 'bottom (flap)',
      hinge_side_reason: 'label', hardware: hw, inset: false, side_panel: { id: side.id, name: side.name },
      overlay: r1(overlay), B: r1(B), cup_from_edge: r1(cupV), plate_setback: H.plate_setback, hinges_from_door_left: us, moved: [],
    });
    const dn = n.map((c) => -c) as V3;
    for (const u of us) {
      const x = leftEdge + u * rs;
      const wp: V3 = [0, 0, 0]; wp[a] = x; wp[ni] = doorBack; wp[2] = zlo + cupV;
      feat(cab, d.unit, 'hinge-cup', d, dn, wp, { u, v: r1(cupV), u_from: 'left edge (viewed from the front)', v_from: 'bottom (hinge) edge', face: 'back' }, H.cup_dia, H.cup_depth, hw);
      for (const s of [-1, 1]) {
        const w2 = [...wp] as V3; w2[a] = x + (s * H.screw_spacing / 2) * rs; w2[2] = zlo + cupV + H.screw_offset;
        feat(cab, d.unit, 'hinge-screw', d, dn, w2, { u: u + (s * H.screw_spacing) / 2, v: r1(cupV + H.screw_offset), u_from: 'left edge (viewed from the front)', v_from: 'bottom (hinge) edge', face: 'back' },
          H.screw_dia, H.screw_depth, '609.1500');
        const w3: V3 = [0, 0, 0]; w3[a] = x + (s * H.plate_screw_spacing / 2) * rs; w3[ni] = sideFront - ns * H.plate_setback; w3[2] = sb[1][2];
        const lu = Math.abs(w3[a]! - (rs > 0 ? sb[0][a]! : sb[1][a]!));
        feat(cab, d.unit, 'plate-screw', side, [0, 0, 1], w3, { u: H.plate_setback, v: r1(lu), u_from: 'front edge', v_from: 'left end of the panel (viewed from the front)', face: 'top' },
          H.plate_screw_dia, H.plate_screw_depth, '173L6100');
      }
    }
  }

  // ---------------------------------------------------------------- drawers (MERIVOBOX, SPEC 4.7)
  function drawer(fr: DPart) {
    const D = P.drawer, b = fr.b, nm = fr.name;
    const f = doorFrame(fr), { n, ni, ns, a, rs } = f;
    const cab = nm.split(' ')[0]!, unit = fr.unit;
    const doorBack = hi(b, ni, -ns), zlo = b[0][2], W = b[1][a]! - b[0][a]!;
    const leftEdge = rs > 0 ? b[0][a]! : b[1][a]!;
    const sides: SideHit[] = [];
    for (const [edge, inward] of [[b[0][a]!, 1], [b[1][a]!, -1]] as const) {
      const sp = sidePanelAt(edge, a, ni, ns, doorBack, zlo, b[1][2], inward);
      if (!sp) { warn(unit, `${nm}: drawer side panel missing`); return; }
      sides.push(sp);
    }
    const innerW = Math.abs(sides[0]!.face - sides[1]!.face);
    const zRunner = zlo + D.FA_bottom;
    const typ = /\((\w)/.exec(nm)?.[1] ?? '?';
    const dn = n.map((c) => -c) as V3;
    const L = { u_from: 'left edge (viewed from the front)', v_from: 'front bottom edge', face: 'back' };
    for (const k of [0, 1])
      for (const su of [D.FA_side + D.front_hole_x, W - D.FA_side - D.front_hole_x]) {
        const v = D.FA_bottom + D.front_hole_z1 + k * D.front_hole_pitch;
        const wp: V3 = [0, 0, 0]; wp[a] = leftEdge + su * rs; wp[ni] = doorBack; wp[2] = zlo + v;
        feat(cab, unit, 'front-fixing', fr, dn, wp, { u: r1(su), v: r1(v), ...L }, D.front_hole_dia, D.front_hole_depth, 'ZF4.10I2 (INSERTA)',
          { note: 'Ø10 +0.2/−0.1 – INSERTA is pressed in' });
      }
    if (typ === 'E')   // E with gallery rail: upper front fixing ZF4.50I2, 128 above the upper lower-fixing hole
      for (const su of [D.FA_side + D.front_hole_x, W - D.FA_side - D.front_hole_x]) {
        const v = D.FA_bottom + D.front_hole_z1 + D.front_hole_pitch + D.top_fixing_above;
        const wp: V3 = [0, 0, 0]; wp[a] = leftEdge + su * rs; wp[ni] = doorBack; wp[2] = zlo + v;
        feat(cab, unit, 'front-fixing-top', fr, dn, wp, { u: r1(su), v: r1(v), ...L }, D.front_hole_dia, D.front_hole_depth, 'ZF4.50I2 (INSERTA, gallery rail)');
      }
    for (const s of [-1, 1]) {
      const u = W / 2 + (s * D.stab_pitch) / 2, v = D.FA_bottom + D.front_hole_z1 - D.stab_below_first;
      const wp: V3 = [0, 0, 0]; wp[a] = leftEdge + u * rs; wp[ni] = doorBack; wp[2] = zlo + v;
      feat(cab, unit, 'front-stabiliser', fr, dn, wp, { u: r1(u), v: r1(v), ...L }, D.front_hole_dia, D.front_hole_depth, 'Z96.10E1');
    }
    const rb: number[] = [];
    for (const sp of sides) {
      const sb = sp.p.b, sideFront = hi(sb, ni, ns);
      const fn = vec(a, sp.face === sb[1][a] ? 1 : -1);
      const lineV = r1(zRunner - sb[0][2]);
      rb.push(lineV);
      const sideDepth = sb[1][ni]! - sb[0][ni]!;
      const p0: V3 = [0, 0, 0]; p0[a] = sp.face; p0[ni] = sideFront; p0[2] = zRunner;
      const p1 = [...p0] as V3; p1[ni] = sideFront - ns * Math.min(D.nominal_length, sideDepth);
      feat(cab, unit, 'runner-line', sp.p, fn, p0, { u: 0, v: lineV, u_from: 'front edge', v_from: 'panel bottom edge', face: 'inner', runner_line_v: lineV },
        0, 0, '450.5001B', { note: 'runner bottom line – the runner bottom edge sits on this line', line: { to: p1.map(r1) as V3 } });
      for (const u of D.runner_screws_from_front) {
        const wp: V3 = [0, 0, 0]; wp[a] = sp.face; wp[ni] = sideFront - ns * u; wp[2] = zRunner + D.runner_screw_above_runner_bottom;
        feat(cab, unit, 'runner-screw', sp.p, fn, wp,
          { u, v: r1(zRunner - sb[0][2] + D.runner_screw_above_runner_bottom), u_from: 'front edge', v_from: 'panel bottom edge', face: 'inner', runner_line_v: lineV },
          D.runner_screw_dia, D.runner_screw_depth, '450.5001B + screws 4x15',
          { verify: true, note: 'screw height approximate - place the runner bottom on runner_line_v and drill through the runner holes' });
      }
    }
    plan.drawers.push({
      cabinet: cab, unit, front: { id: fr.id, name: nm }, type: typ, front_size: [r1(W), r1(b[1][2] - zlo)],
      inner_width: r1(innerW), overlays: [r1(sides[0]!.ov), r1(sides[1]!.ov)], runner_bottom_from_side_bottom: rb,
      runner_bottom_world_z: r1(zRunner), bottom_panel: [r1(innerW - D.bottom_minus), D.bottom_depth],
      back_panel: [r1(innerW - D.bottom_minus), D.back_height[typ] ?? null], side_panels: sides.map((s) => ({ id: s.p.id, name: s.p.name })),
    });
  }

  // ---------------------------------------------------------------- shelves (SPEC 4.8)
  function frontsNear(p: DPart): DPart[] {
    const own = parts.filter((q) => q.layer === 'front' && q.unit === p.unit);
    if (own.length) return own;
    return [...fronts].sort((x, y) => dist(ctr(x.b), ctr(p.b)) - dist(ctr(y.b), ctr(p.b))).slice(0, 1);
  }

  const shelfPins: { q: DPart; face: number; a: number; z: number; u: number[]; sfront: number; uf: number; dep: number; sgn: number; cab: string; unit: string }[] = [];
  function shelves() {
    const S = P.shelf;
    for (const p of carcass) {
      if (!/Polka|Przegroda pod/.test(p.name)) continue;
      const b = p.b;
      if (thinAxis(b) !== 2) continue;
      const fr = frontsNear(p);
      if (!fr.length) { warn(p.unit, `${p.name}: no front to orient the shelf`); continue; }
      const byName = P.fixedShelves.test(p.name), mode = ov.shelfMode[p.name];
      const fixed = mode ? mode === 'fixed' : byName;
      const modeReason = mode ? 'project override' : byName ? 'fixed by name' : 'adjustable (default)';
      const dep = thinAxis(fr[0]!.b), aLen = 1 - dep;
      const ends: ({ q: DPart; face: number; sgn: number } | null)[] = [];
      for (const [end, sgn] of [[b[0][aLen]!, -1], [b[1][aLen]!, 1]] as const) {
        let cand: { q: DPart; face: number; sgn: number } | null = null;
        for (const q of carcass) {
          const qb = q.b;
          if (thinAxis(qb) !== aLen || q === p) continue;
          const face = sgn > 0 ? qb[0][aLen]! : qb[1][aLen]!;
          if (Math.abs(face - end) > 1.5) continue;
          if (qb[0][2] > b[0][2] || qb[1][2] < b[1][2]) continue;
          if (qb[1][dep]! < b[0][dep]! || qb[0][dep]! > b[1][dep]!) continue;
          cand = { q, face, sgn }; break;
        }
        ends.push(cand);
      }
      const uf = ctr(fr[0]!.b)[dep]! > ctr(b)[dep]! ? 1 : -1;
      const cab = p.name.split(' ')[0]!;
      const holes: { panel: string; u: number; v: number }[] = [];
      const sfront = hi(b, dep, uf), sback = hi(b, dep, -uf), depth = Math.abs(sfront - sback);
      for (const e of ends) {
        if (!e) { warn(p.unit, `${p.name}: end support panel not found`); continue; }
        const { q, face, sgn } = e, qb = q.b, qfront = hi(qb, dep, uf);
        if (fixed) {
          const us = [S.screw_from_edge, depth - S.screw_from_edge, ...(depth > S.screw_middle_if_deeper ? [depth / 2] : [])].sort((x, y) => x - y);
          for (const u of us) {
            const wp: V3 = [0, 0, 0]; wp[aLen] = sgn > 0 ? qb[1][aLen]! : qb[0][aLen]!;   // outer face – screwed from outside
            wp[dep] = sfront - uf * u; wp[2] = (b[0][2] + b[1][2]) / 2;
            const uu = Math.abs(wp[dep]! - qfront);
            feat(cab, p.unit, 'shelf-screw', q, vec(aLen, sgn), wp, { u: r1(uu), v: r1(wp[2] - qb[0][2]), u_from: 'front edge', v_from: 'panel bottom edge', face: 'outer' },
              S.screw_dia, S.screw_depth, 'Spax 4x50', { note: 'through the side, countersink; pilot 2.5 mm into the shelf edge' });
            holes.push({ panel: q.name, u: r1(uu), v: r1(wp[2] - qb[0][2]) });
          }
        } else {
          const us = [S.pin_from_edge, depth - S.pin_from_edge], z = b[0][2] - S.pin_below_shelf;
          for (const u of us) {
            const wp: V3 = [0, 0, 0]; wp[aLen] = face; wp[dep] = sfront - uf * u; wp[2] = z;
            const uu = Math.abs(wp[dep]! - qfront);
            feat(cab, p.unit, 'shelf-pin', q, vec(aLen, -sgn), wp, { u: r1(uu), v: r1(z - qb[0][2]), u_from: 'front edge', v_from: 'panel bottom edge', face: 'inner' },
              S.pin_dia, S.pin_depth, 'podporka 5 mm');
            holes.push({ panel: q.name, u: r1(uu), v: r1(z - qb[0][2]) });
          }
          shelfPins.push({ q, face, a: aLen, z, u: us, sfront, uf, dep, sgn, cab, unit: p.unit });
        }
      }
      plan.shelves.push({ cabinet: cab, unit: p.unit, shelf: { id: p.id, name: p.name }, fixed, mode_reason: modeReason, z_bottom: r1(b[0][2]), holes });
    }
  }

  // optional extra pin rows at ±32 / ±64 – skipped where they hit a plate band, another board or an existing hole
  function extraRows() {
    const S = P.shelf, H = P.hinge, r = S.pin_dia / 2;
    for (const s of shelfPins) {
      const qb = s.q.b;
      const bands = plan.hinges.filter((h) => h.side_panel.id === s.q.id && h.plates_from_side_bottom)
        .flatMap((h) => h.plates_from_side_bottom!.map((v) => qb[0][2] + v));   // plate centres
      const boards = carcass.filter((p) => p !== s.q && thinAxis(p.b) === 2
        && Math.abs(hi(p.b, s.a, s.sgn) - s.face) <= 1.5 && p.b[1][s.dep]! >= Math.min(qb[0][s.dep]!, qb[1][s.dep]!) && p.b[0][s.dep]! <= Math.max(qb[0][s.dep]!, qb[1][s.dep]!));
      for (const off of S.extra_rows) {
        const z = s.z + off;
        if (z - r < qb[0][2] || z + r > qb[1][2]) continue;
        if (bands.some((c) => z + r > c - H.plate_half_height && z - r < c + H.plate_half_height)) continue;
        if (boards.some((p) => z + r > p.b[0][2] - 1 && z - r < p.b[1][2] + 1)) continue;
        for (const u of s.u) {
          const wp: V3 = [0, 0, 0]; wp[s.a] = s.face; wp[s.dep] = s.sfront - s.uf * u; wp[2] = z;
          if (plan.features.some((f) => f.kind === 'shelf-pin' && f.part.id === s.q.id && dist(f.world.p, wp.map(r1) as V3) < 1)) continue;
          const uu = Math.abs(wp[s.dep]! - hi(qb, s.dep, s.uf));
          feat(s.cab, s.unit, 'shelf-pin', s.q, vec(s.a, -s.sgn), wp, { u: r1(uu), v: r1(z - qb[0][2]), u_from: 'front edge', v_from: 'panel bottom edge', face: 'inner' },
            S.pin_dia, S.pin_depth, 'podporka 5 mm', { optional: true, note: `optional row (${off > 0 ? '+' : ''}${off})` });
        }
      }
    }
  }

  // ---------------------------------------------------------------- handles (SPEC 4.9, Nomet TECHNO, rule-based)
  function handleHoles(fr: DPart, cab: string, pts: [number, number][], model: { code: string; name: string }) {
    const { n, ni, ns, a, rs } = doorFrame(fr), b = fr.b, ff = hi(b, ni, ns), left = rs > 0 ? b[0][a]! : b[1][a]!;
    for (const [u, v] of pts) {
      const wp: V3 = [0, 0, 0]; wp[a] = left + u * rs; wp[ni] = ff; wp[2] = b[0][2] + v;
      feat(cab, fr.unit, 'handle-hole', fr, n, wp, { u: r1(u), v: r1(v), u_from: 'left edge (viewed from the front)', v_from: 'front bottom edge', face: 'front' },
        P.handle.dia, P.handle.depth, model.code, { note: 'through hole from the front (backing board behind), M4x25 screws' });
    }
    plan.handles.push({ front: fr.name, handle: model.name, holes_uv: pts.map(([u, v]) => [r1(u), r1(v)]) });
  }
  function handlesRules() {
    const Hd = P.handle, Lg = Hd.long, Sh = Hd.short;
    const doors = new Map(doorInfos.map((di) => [di.d.id, di]));
    for (const fr of fronts) {
      const nm = fr.name, cab = nm.split(' ')[0]!, { a, rs } = doorFrame(fr), b = fr.b;
      const W = b[1][a]! - b[0][a]!, H = b[1][2] - b[0][2];
      if (/Szuflada|Zmywarka/.test(nm)) {
        const v = H - Hd.drawer_from_top;
        handleHoles(fr, cab, [[W / 2 - Lg.cc / 2, v], [W / 2 + Lg.cc / 2, v]], Lg);
      } else if (nm.includes('Klapa')) {
        handleHoles(fr, cab, [[W / 2 - Sh.cc / 2, H / 2], [W / 2 + Sh.cc / 2, H / 2]], Sh);
      } else {
        const di = doors.get(fr.id);
        if (!di) continue;
        const hingeLeft = di.hingeEdge === (rs > 0 ? b[0][a]! : b[1][a]!);
        const u = hingeLeft ? W - Hd.door_from_opening_edge : Hd.door_from_opening_edge;
        const e = Hd.door_end_hole_from_edge;
        handleHoles(fr, cab, b[0][2] > Hd.wall_unit_above ? [[u, e], [u, e + Sh.cc]] : [[u, H - e - Sh.cc], [u, H - e]], Sh);
      }
    }
  }

  // ---------------------------------------------------------------- TIP-ON 956A1006 (SPEC 4.10, doors without handles)
  function tipons() {
    const T = P.tipon;
    for (const di of doorInfos) {
      const { d, f } = di, b = d.b, { a, ni, ns } = f, H = di.zhi - di.zlo;
      const openEdge = di.hingeEdge === b[0][a] ? b[1][a]! : b[0][a]!;
      const inward = openEdge === b[0][a] ? 1 : -1;
      const vs = H > T.two_units_above ? [pyRound(H * 0.35), pyRound(H * 0.65)]
        : di.zlo > T.wall_unit_above ? [T.from_door_end]
        : di.zhi < T.base_unit_below ? [pyRound(H - T.from_door_end)] : [pyRound(H / 2)];
      const sp = sidePanelAt(openEdge, a, ni, ns, di.doorBack, di.zlo, di.zhi, inward);
      const note = 'Blum template 65.5010; position allowed +-300 mm in height';
      for (const v of vs) {
        const z = di.zlo + v;
        if (sp) {
          const sb = sp.p.b, wp: V3 = [0, 0, 0];
          wp[a] = sp.face + (sp.face === sb[0][a] ? T.from_inner_face : -T.from_inner_face); wp[ni] = hi(sb, ni, ns); wp[2] = z;
          feat(di.cab, d.unit, 'tipon-bore', sp.p, vec(ni, ns), wp,
            { u: T.from_inner_face, v: r1(z - sb[0][2]), u_from: 'inner face (bore in the FRONT EDGE of the panel)', v_from: 'panel bottom edge', face: 'front edge' },
            T.bore_dia, T.bore_depth, T.code, { note });
          plan.tipons.push({ door: d.name, panel: sp.p.name, v_from_panel_bottom: r1(z - sb[0][2]), v_from_door_bottom: v });
          continue;
        }
        // double doors meeting in the middle: bore into the front edge of the top (wall/tall) or bottom panel
        const cands = carcass.filter((p) => thinAxis(p.b) === 2 && overlap(p.b, b, a) && Math.abs(hi(p.b, ni, ns) - di.doorBack) < 30);
        if (!cands.length) { warn(d.unit, `${d.name}: no panel for TIP-ON`); break; }
        const top = cands.filter((p) => p.b[0][2] >= di.zhi - 60), bot = cands.filter((p) => p.b[1][2] <= di.zlo + 60);
        const pan = vs.length === 2 && v === vs[1] && bot.length ? [...bot].sort((x, y) => y.b[1][2] - x.b[1][2])[0]!
          : top.length ? [...top].sort((x, y) => x.b[0][2] - y.b[0][2])[0]! : [...cands].sort((x, y) => y.b[1][2] - x.b[1][2])[0]!;
        const pb = pan.b, under = top.includes(pan) && !bot.includes(pan);
        const wp: V3 = [0, 0, 0]; wp[a] = openEdge + inward * T.from_opening_edge_on_panel; wp[ni] = hi(pb, ni, ns);
        wp[2] = under ? pb[0][2] + T.from_inner_face : pb[1][2] - T.from_inner_face;
        const pleft = f.rs > 0 ? pb[0][a]! : pb[1][a]!;
        feat(di.cab, d.unit, 'tipon-bore', pan, vec(ni, ns), wp,
          { u: r1(Math.abs(wp[a]! - pleft)), v: T.from_inner_face, u_from: 'left end of the panel (viewed from the front)', v_from: 'inner (door-side) face; bore in the FRONT EDGE', face: 'front edge' },
          T.bore_dia, T.bore_depth, T.code, { note: 'double door: unit in the top/bottom panel, 60 mm from the opening edge' });
        plan.tipons.push({ door: d.name, panel: pan.name, u_from_panel_left: r1(Math.abs(wp[a]! - pleft)) });
        if (!(vs.length === 2 && bot.length)) break;
      }
    }
  }

  // ---------------------------------------------------------------- Camar 801 wall-cabinet hangers (SPEC 4.12)
  function camar801(cabinetRe: RegExp) {
    const C = P.camar801;
    for (const p of carcass) {
      if (!cabinetRe.test(p.name) || !p.name.includes('Bok')) continue;
      const b = p.b, a = thinAxis(b);
      const q = carcass.find((t) => thinAxis(t.b) === 2 && Math.abs(t.b[1][2] - b[1][2]) < 1
        && (Math.abs(t.b[0][a]! - b[1][a]!) < 1 || Math.abs(t.b[1][a]! - b[0][a]!) < 1));
      if (!q) { warn(p.unit, `${p.name}: no top panel for Camar 801`); continue; }
      const inner = Math.abs(q.b[0][a]! - b[1][a]!) < 1 ? b[1][a]! : b[0][a]!;
      const dep = 1 - a, back = b[1][dep]!, z = q.b[0][2] - C.below_top_panel_underside;
      for (let k = 0; k < 2; k++) {
        const u = C.first_dowel_from_back_edge + k * C.dowel_spacing;
        const wp: V3 = [0, 0, 0]; wp[a] = inner; wp[dep] = back - u; wp[2] = z;
        feat(p.name.split(' ')[0]!, p.unit, 'hanger-dowel', p, vec(a, inner === b[1][a] ? 1 : -1), wp,
          { u, v: r1(z - b[0][2]), u_from: 'BACK edge', v_from: 'panel bottom edge', face: 'inner' },
          C.dowel_dia, C.dowel_depth, 'Camar 801', { verify: true, note: 'u and spacing are placeholders - measure the hanger' });
      }
      plan.hangers.push({ panel: p.name, dowel_axis_below_top: r1(b[1][2] - z), v_from_bottom: r1(z - b[0][2]) });
    }
  }

  for (const d of fronts) {
    if (/Szuflada/.test(d.name)) drawer(d);
    else if (!/Zmywarka|GB Front/.test(d.name)) door(d);
  }
  shelves();
  extraRows();
  const rules = { handles: 'none', camar801: '', ...ov.rules };
  if (rules.handles === 'techno') handlesRules();
  else tipons();
  if (rules.camar801) camar801(new RegExp(rules.camar801));
  return plan;
}

// features drawn in the 3D view / counted as holes
export const isHole = (f: DrillFeature) => f.kind !== 'runner-line';

// outward normal of a cabinet's fronts (views and thumbnails); without fronts: −Y
export function unitFrontNormal(model: Model, unit: string | null): V3 {
  const boxes = model.parts.filter((p) => p.layer !== 'room' && (unit === null || p.unit === unit)).map((p) => ({ p, b: partBox(p) }))
    .filter((x): x is { p: Part; b: Bx } => !!x.b);
  const fr = boxes.find((x) => x.p.layer === 'front');
  const car = boxes.filter((x) => x.p.layer === 'carcass' && (!fr || x.p.unit === fr.p.unit));
  if (!fr || !car.length) return [0, -1, 0];
  const ai = thinAxis(fr.b);
  if (ai === 2) return [0, -1, 0];
  const c = (Math.min(...car.map((x) => x.b[0][ai]!)) + Math.max(...car.map((x) => x.b[1][ai]!))) / 2;
  return vec(ai, ctr(fr.b)[ai]! > c ? 1 : -1);
}
