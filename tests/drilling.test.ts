import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { ModelSchema, type Model } from '../src/model/schema';
import { planDrilling, pyRound, isHole } from '../src/drilling/plan';
import { parseOverrides, applyDrillEdit, parseHingeZ } from '../src/drilling/overrides';
import { hardwareCount } from '../src/drilling/hardware';
import type { DrillFeature, DrillOverrides } from '../src/drilling/schema';

const IDS = ['alcove-wardrobe', 'bathroom', 'fuse-box-cabinet', 'kitchen', 'nightstands', 'tv-cabinet'];
const model = (id: string): Model => ModelSchema.parse(JSON.parse(readFileSync(`projects/${id}/model.json`, 'utf8')));
const overrides = (id: string): DrillOverrides => {
  const f = `projects/${id}/drilling.json`;
  return parseOverrides(existsSync(f) ? readFileSync(f, 'utf8') : null);
};
const fixture = (id: string) => JSON.parse(readFileSync(`docs/drilling/fixtures/${id}.drill.json`, 'utf8'));
const plans = new Map(IDS.map((id) => [id, planDrilling(model(id), overrides(id))]));
const plan = (id: string) => plans.get(id)!;
const d3 = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
// features also in the fixtures: real holes, without the optional pin rows
const comparable = (fs: DrillFeature[]) => fs.filter((f) => isHole(f) && !f.optional);

describe.each(IDS)('%s matches its fixture', (id) => {
  const fx = fixture(id);
  const p = plan(id);
  const key = (f: { part: { name: string }; kind: string }) => `${f.part.name} | ${f.kind}`;
  const group = (fs: any[]) => fs.reduce((m: Map<string, any[]>, f) => m.set(key(f), [...(m.get(key(f)) ?? []), f]), new Map());

  it('same number of features per kind and part', () => {
    const a = group(comparable(p.features)), b = group(fx.features);
    expect([...a.keys()].sort()).toEqual([...b.keys()].sort());
    for (const [k, fs] of b) expect(a.get(k)!.length, k).toBe(fs.length);
  });
  it('every feature within 0.5 mm of a fixture feature (nearest point), same Ø, depth and direction', () => {
    const a = group(comparable(p.features));
    for (const [k, fs] of group(fx.features)) {
      const pool = [...a.get(k)!];
      for (const f of fs) {
        pool.sort((x, y) => d3(x.world.p, f.world.p) - d3(y.world.p, f.world.p));
        const m = pool.shift()!;
        expect(d3(m.world.p, f.world.p), `${k} at ${f.world.p}`).toBeLessThanOrEqual(0.5);
        expect(m.world.dir, k).toEqual(f.world.dir);
        expect([m.dia, m.depth, m.face, m.local.face], k).toEqual([f.dia, f.depth, f.face, f.local.face]);
        expect(Math.abs(m.local.u - f.local.u), `${k} u`).toBeLessThanOrEqual(0.5);
        expect(Math.abs(m.local.v - f.local.v), `${k} v`).toBeLessThanOrEqual(0.5);
        expect(m.verify, `${k} verify`).toBe(f.verify);
      }
    }
  });
  it('same per-cabinet summaries', () => {
    const pick = (h: any) => ({ door: h.door.name, side: h.hinge_side, hw: h.hardware, inset: h.inset, panel: h.side_panel.name,
      overlay: h.overlay, B: h.B, cup: h.cup_from_edge, setback: h.plate_setback, hz: h.hinges_from_door_bottom ?? h.hinges_from_door_left,
      plates: h.plates_from_side_bottom, moved: h.moved });
    expect(p.hinges.map(pick)).toEqual(fx.hinges.map(pick));
    const dr = (d: any) => ({ front: d.front.name, type: d.type, w: d.inner_width, rb: d.runner_bottom_from_side_bottom, bottom: d.bottom_panel, back: d.back_panel, sides: d.side_panels.map((s: any) => s.name) });
    expect(p.drawers.map(dr)).toEqual(fx.drawers.map(dr));
    const sh = (s: any) => ({ shelf: s.shelf.name, fixed: s.fixed, holes: s.holes });
    expect(p.shelves.map(sh)).toEqual(fx.shelves.map(sh));
    expect(p.handles).toEqual(fx.handles);
    expect(p.tipons).toEqual(fx.tipons);
    expect(p.hangers).toEqual(fx.hangers);
    expect(p.warnings.map((w) => w.text)).toEqual(fx.warnings);
  });
});

describe('hardware totals (SPEC section 8)', () => {
  it('sum over all projects', () => {
    const tot: Record<string, number> = {};
    for (const id of IDS) for (const r of hardwareCount(plan(id))) tot[r.article] = (tot[r.article] ?? 0) + r.pcs;
    expect(tot).toMatchObject({ '71B3550': 58, '71B7550': 6, '71B3750': 2, '173L6100': 66, '609.1500': 264,
      'ZF4.10I2': 12, 'ZF4.50I2': 4, 'Z96.10E1': 6, 'Ø5 pin': 88, '4×15': 60 });
    expect(tot['956A1006']).toBe(21);                        // HARDWARE.md 4
    expect(tot['Camar 801']).toBe(6);                         // HARDWARE.md 5
    expect(tot['C-1149-320.P61']! + tot['C-1149-128.P61']!).toBe(17);   // HARDWARE.md 6
  });
});

const hinge = (id: string, door: string) => plan(id).hinges.find((h) => h.door.name.startsWith(door))!;
const feats = (id: string, part: string, kind: string) => plan(id).features.filter((f) => f.part.name.startsWith(part) && f.kind === kind);

describe('hinges', () => {
  it('B = overlay − 11', () => {
    for (const id of IDS) for (const h of plan(id).hinges) if (!h.inset) expect(h.B).toBeCloseTo(h.overlay - 11, 5);
    expect(hinge('kitchen', 'Z1 Drzwi L').B).toBe(7);
    expect(hinge('kitchen', 'B4 Drzwiczki').overlay).toBe(17);
  });
  it('hinge count by door height', () => {
    const n = (id: string, d: string) => hinge(id, d).hinges_from_door_bottom!.length;
    expect(n('kitchen', 'G2 Drzwi')).toBe(2);                 // 896
    expect(n('bathroom', 'R1 Drzwi')).toBe(3);                // 1112
    expect(n('alcove-wardrobe', 'S1 Drzwi')).toBe(4);         // 1796
    expect(n('fuse-box-cabinet', 'Drzwi dolne')).toBe(4);     // 1696
  });
  it('small doors: hinge centre 22 % of the height, at least 45', () => {
    expect(hinge('nightstands', 'N1 lewa').hinges_from_door_bottom).toEqual([50, 178]);   // 0.22 × 228 = 50.16
    expect(hinge('tv-cabinet', 'RTV K1').hinges_from_door_bottom).toEqual([73, 257]);     // 0.22 × 330 = 72.6
  });
  it('clash moves: bathroom R1 middle hinge 556 → 593 (R1 Polka), kitchen Z1 top hinge 616 → 585 (Z1 Trawers)', () => {
    expect(hinge('bathroom', 'R1 Drzwi').moved).toEqual([{ hinge: 2, from: 556, to: 593, because: 'R1 Polka 385x150' }]);
    const z1 = hinge('kitchen', 'Z1 Drzwi L');
    expect(z1.moved).toHaveLength(1);
    expect(z1.moved[0]).toMatchObject({ hinge: 2, from: 616, to: 585 });
    expect(z1.moved[0]!.because).toMatch(/^Z1 Trawers przod pionowy/);
    expect(z1.hinges_from_door_bottom).toEqual([100, 585]);
  });
  it('inset door L6: hinge 71B3750 on L2 (living-room side), setback 56.5, flagged to verify', () => {
    const h = hinge('kitchen', 'L6 Drzwi');
    expect(h).toMatchObject({ inset: true, hardware: '71B3750', hinge_side: 'L', plate_setback: 56.5 });
    expect(h.side_panel.name).toMatch(/^L2 Bok lodowki \(strona salonu\)/);
    const fs = plan('kitchen').features.filter((f) => f.unit === h.unit && f.cabinet === 'L6' && f.kind.startsWith('hinge') || f.part.name.startsWith('L2') && f.kind === 'plate-screw');
    expect(fs.length).toBeGreaterThan(0);
    expect(fs.every((f) => f.verify)).toBe(true);
    expect(feats('kitchen', 'L2', 'plate-screw').every((f) => f.local.u === 56.5)).toBe(true);
  });
  it('flap B3: plates on the top face of the bottom wieniec, cups 100 from the edges', () => {
    const h = hinge('kitchen', 'B3 Klapa');
    expect(h).toMatchObject({ hinge_side: 'bottom (flap)', overlay: 16, B: 5, hinges_from_door_left: [100, 496] });
    const ps = feats('kitchen', 'B3 Wieniec dolny', 'plate-screw');
    expect(ps).toHaveLength(4);
    expect(ps.every((f) => f.face === 'z+' && f.local.face === 'top' && f.local.u === 37)).toBe(true);
    expect(ps.map((f) => f.local.v).sort((a, b) => a - b)).toEqual([86, 118, 482, 514]);
  });
});

describe('drawers', () => {
  it('runner bottom lines P2: 0 / 323 / 576 from the side bottom', () => {
    const lines = plan('kitchen').drawers.filter((d) => d.cabinet === 'P2').map((d) => d.runner_bottom_from_side_bottom);
    expect(lines).toEqual([[0, 0], [323, 323], [576, 576]]);
    const rl = feats('kitchen', 'P2 Bok L', 'runner-line');
    expect(rl.map((f) => f.local.v).sort((a, b) => a - b)).toEqual([0, 323, 576]);
    expect(rl.every((f) => f.line && d3(f.world.p, f.line.to) === 500)).toBe(true);
  });
  it('INSERTA holes at u 36.5 / W − 36.5, v 49.5 / 81.5; stabiliser W/2 ± 16 at 34.5', () => {
    const f = feats('kitchen', 'P3 Szuflada gorna', 'front-fixing');
    expect([...new Set(f.map((x) => x.local.u))].sort((a, b) => a - b)).toEqual([36.5, 459.5]);
    expect([...new Set(f.map((x) => x.local.v))].sort((a, b) => a - b)).toEqual([49.5, 81.5]);
    expect(f.every((x) => x.dia === 10 && x.depth === 12)).toBe(true);
    const s = feats('kitchen', 'P3 Szuflada gorna', 'front-stabiliser');
    expect(s.map((x) => [x.local.u, x.local.v])).toEqual([[232, 34.5], [264, 34.5]]);
  });
});

describe('shelves', () => {
  it('fixed only under the oven and in the nightstands; fuse-box shelves and partition on pins', () => {
    const fixed = IDS.flatMap((id) => plan(id).shelves.filter((s) => s.fixed).map((s) => s.shelf.name.split(' (')[0]));
    expect(fixed).toEqual(['B3 Polka pod piekarnik', 'N1 lewa Polka 194x282', 'N2 prawa Polka 194x282']);
    expect(plan('fuse-box-cabinet').shelves.every((s) => !s.fixed)).toBe(true);
    expect(plan('fuse-box-cabinet').shelves.some((s) => s.shelf.name.startsWith('Przegroda pod'))).toBe(true);
  });
  it('optional rows ±32/±64 avoid plate bands and other boards', () => {
    const p = planDrilling(model('bathroom'), {});
    const opt = p.features.filter((f) => f.optional);
    expect(opt.length).toBeGreaterThan(0);
    for (const f of opt) {
      for (const h of p.hinges.filter((h) => h.side_panel.id === f.part.id))
        for (const v of h.plates_from_side_bottom!) expect(Math.abs(f.local.v - v)).toBeGreaterThanOrEqual(25 + 2.5);
    }
  });
  it('shelfMode override switches a shelf to screws', () => {
    const name = plan('kitchen').shelves.find((s) => s.shelf.name.startsWith('G2 Polka'))!.shelf.name;
    const p = planDrilling(model('kitchen'), applyDrillEdit(overrides('kitchen'), { kind: 'shelfMode', name, value: 'fixed' }));
    const s = p.shelves.find((x) => x.shelf.name === name)!;
    expect(s).toMatchObject({ fixed: true, mode_reason: 'project override' });
    expect(p.features.filter((f) => f.kind === 'shelf-screw' && f.cabinet === 'G2')).toHaveLength(6);   // depth 312 > 300: 3 per side;
  });
});

describe('overrides', () => {
  it('hinge side flip mirrors the cups and moves the plates to the other side panel', () => {
    const name = 'G2 Drzwi (zawiasy L) 446x896';
    const base = plan('kitchen');
    const p = planDrilling(model('kitchen'), applyDrillEdit(overrides('kitchen'), { kind: 'hingeSide', name, value: 'P' }));
    const a = base.hinges.find((h) => h.door.name === name)!, b = p.hinges.find((h) => h.door.name === name)!;
    expect(a.side_panel.name).toBe('G2 Bok P 900x332');
    expect(b).toMatchObject({ hinge_side: 'P', hinge_side_reason: 'project override' });
    expect(b.side_panel.name).toBe('G2 Bok L 900x332');
    const cups = (pl: typeof p) => pl.features.filter((f) => f.kind === 'hinge-cup' && f.part.name === name).map((f) => f.world.p);
    const door = model('kitchen').parts.find((x) => x.name === name)!;
    const s = door.shape as { min: number[]; max: number[] };
    const mid = (s.min[0]! + s.max[0]!) / 2;
    for (const [i, c] of cups(base).entries()) {
      expect(cups(p)[i]![0]).toBeCloseTo(2 * mid - c[0]!, 5);
      expect(cups(p)[i]![2]).toBe(c[2]);
    }
    expect(p.features.filter((f) => f.kind === 'plate-screw' && f.part.name === 'G2 Bok L 900x332')).toHaveLength(4);
    expect(p.features.filter((f) => f.kind === 'plate-screw' && f.part.name === 'G2 Bok P 900x332')).toHaveLength(0);
  });
  it('hingeZ override sets the hinge heights', () => {
    const name = 'R1 Drzwi (zawiasy P) 417x1112';
    const p = planDrilling(model('bathroom'), { hingeZ: { [name]: [100, 560, 1012] } });
    const h = p.hinges.find((x) => x.door.name === name)!;
    expect(h.hinges_from_door_bottom).toEqual([100, 560, 1012]);
    expect(h.moved).toEqual([]);
    expect(p.warnings.some((w) => w.text.includes('hinge 2 (override 560) clashes'))).toBe(true);
  });
  it('without project overrides the nightstands and L6 have no hinge side (decisions live in drilling.json)', () => {
    const p = planDrilling(model('nightstands'));
    expect(p.hinges).toHaveLength(0);
    expect(p.warnings.map((w) => w.text)).toContain('N1 lewa Drzwiczki 226x228: hinge side unknown - skipped');
  });
  it('parseHingeZ', () => {
    expect(parseHingeZ('100, 600 1012')).toEqual([100, 600, 1012]);
    expect(parseHingeZ('100, x')).toBeNull();
    expect(parseHingeZ('')).toBeNull();
  });
});

it('pyRound rounds half to even like Python', () => {
  expect([0.5, 1.5, 2.5, 556.5, 583.5, -0.5].map(pyRound)).toEqual([0, 2, 2, 556, 584, -0]);
  expect(pyRound(2.6)).toBe(3);
});

describe('PLAN acceptance 6.1: new kinds', () => {
  const n = (kind: string) => IDS.reduce((a, id) => a + plan(id).features.filter((f) => f.kind === kind).length, 0);
  it('tipon-bore 21, hanger-dowel 12, kitchen handle-hole 34, front-fixing-top 4', () => {
    expect([n('tipon-bore'), n('hanger-dowel'), n('front-fixing-top')]).toEqual([21, 12, 4]);
    expect(plan('kitchen').features.filter((f) => f.kind === 'handle-hole')).toHaveLength(34);
    expect(plan('kitchen').features.filter((f) => f.kind === 'tipon-bore')).toHaveLength(0);
  });
  it('TIP-ON: Ø10 × 76 into the front edge, 7.5 from the inner face', () => {
    const t = plan('alcove-wardrobe').features.filter((f) => f.kind === 'tipon-bore');
    expect(t.every((f) => f.dia === 10 && f.depth === 76 && f.local.face === 'front edge' && f.status === 'verified')).toBe(true);
    expect(t.filter((f) => f.local.u_from.startsWith('inner face')).every((f) => f.local.u === 7.5)).toBe(true);
  });
  it('Camar 801: 60 below the cabinet top, placeholders flagged; parameters move the dowels', () => {
    const h = feats('kitchen', 'G2 Bok P', 'hanger-dowel');
    expect(h.map((f) => [f.local.u, f.local.v])).toEqual([[20, 840], [52, 840]]);
    expect(h.every((f) => f.verify && f.status === 'placeholder' && f.item === 'camar-801')).toBe(true);
    const p = planDrilling(model('kitchen'), { ...overrides('kitchen'), params: { camar801: { dowel_spacing: 40 } } });
    expect(p.features.filter((f) => f.kind === 'hanger-dowel' && f.part.name.startsWith('G2 Bok P')).map((f) => f.local.u)).toEqual([20, 60]);
  });
  it('INSERTA upper fixing only on E drawers at v 209.5', () => {
    const t = plan('kitchen').features.filter((f) => f.kind === 'front-fixing-top');
    expect(new Set(t.map((f) => f.part.name.split(' (')[0]))).toEqual(new Set(['P2 Szuflada dolna', 'P3 Szuflada dolna']));
    expect(t.every((f) => f.local.v === 209.5 && f.dia === 10 && f.depth === 12)).toBe(true);
  });
  it('TECHNO: drawers 320 centred 50 below the top; wall doors 128 from 60 above the bottom', () => {
    const d = plan('kitchen').handles.find((x) => x.front.startsWith('P2 Szuflada dolna'))!;
    expect(d).toMatchObject({ handle: 'Nomet TECHNO 320 czarny mat', holes_uv: [[138, 270], [458, 270]] });
    const g = plan('kitchen').handles.find((x) => x.front.startsWith('G2 Drzwi'))!;
    expect(g.holes_uv).toEqual([[406, 60], [406, 188]]);
  });
  it('every feature has a catalogue item and a status', () => {
    for (const id of IDS) for (const f of plan(id).features) { expect(f.item, f.kind).not.toBe(''); expect(f.status).toBeTruthy(); }
  });
});
