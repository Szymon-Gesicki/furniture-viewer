import { it, expect, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import { ModelSchema } from '../src/model/schema';
import { planDrilling } from '../src/drilling/plan';
import { parseOverrides } from '../src/drilling/overrides';
import { faceSheets, faceSvg, esc, mirrored } from '../src/drilling/sheet';
import { dimensionsFor, edgeDims, type Dim } from '../src/drilling/dims';

const m = ModelSchema.parse(JSON.parse(readFileSync('projects/kitchen/model.json', 'utf8')));
const plan = planDrilling(m, parseOverrides(readFileSync('projects/kitchen/drilling.json', 'utf8')));
const part = (name: string) => m.parts.find((p) => p.name.startsWith(name))!;
// every number a face's dims show (ordinate ticks, chain, spacing, Ø text)
const texts = (ds: Dim[]) => ds.flatMap((d) => (d.kind === 'ordinate' ? d.ticks.map((t) => t.text) : 'text' in d && d.text ? [d.text] : []));
const nums = (ds: Dim[]) => texts(ds).map((t) => Number(t.replace(',', '.').replace('?', ''))).filter((x) => !Number.isNaN(x));

describe('dims engine (PLAN section 3)', () => {
  it('G2 Bok P: 37 plate line, plate screws 102±16 / 798±16, Camar dowel height 840, Camar u flagged as placeholder', () => {
    const f = faceSheets(part('G2 Bok P'), plan.features).find((x) => x.faceLabel.startsWith('inner'))!;
    const ds = dimensionsFor(f);
    expect(nums(ds)).toEqual(expect.arrayContaining([37, 86, 118, 782, 814, 840, 32]));
    expect(texts(ds)).toEqual(expect.arrayContaining(['20?', '52?']));      // Camar u from the back edge – placeholder
    expect(ds.some((d) => d.kind === 'linear' && d.role === 'spacing' && d.text === '32')).toBe(true);   // plate screws
    // measured from the reference edges named by the features, never from the opposite edge
    const labels = ds.filter((d) => d.kind === 'ordinate').map((d) => (d as { label: string }).label);
    expect(labels).toEqual(expect.arrayContaining(['panel bottom edge']));
  });
  it('P2 Szuflada dolna: 36.5, 49.5, 81.5, 209.5, 34.5 on the back, 320 spacing on the front', () => {
    const fs = faceSheets(part('P2 Szuflada dolna'), plan.features);
    const back = dimensionsFor(fs.find((x) => x.faceLabel === 'back')!), front = dimensionsFor(fs.find((x) => x.faceLabel === 'front')!);
    expect(nums(back)).toEqual(expect.arrayContaining([36.5, 49.5, 81.5, 209.5, 34.5]));
    expect(back.some((d) => d.kind === 'linear' && d.role === 'spacing' && d.text === '128')).toBe(true);   // INSERTA upper ↔ gallery
    expect(front.some((d) => d.kind === 'linear' && d.role === 'spacing' && d.text === '320')).toBe(true);
  });
  it('door back: hinge screws 45 apart, cup Ø35 callout, values from the hinge edge', () => {
    const f = faceSheets(part('G4 Drzwi'), plan.features).find((x) => x.faceLabel === 'back')!;
    const ds = dimensionsFor(f);
    expect(nums(ds)).toEqual(expect.arrayContaining([22.5, 32, 100, 796]));
    expect(ds.filter((d) => d.kind === 'linear' && d.role === 'spacing').map((d) => (d as { text: string }).text)).toContain('45');
    expect(texts(ds)).toContain('2 × Ø35 × 13');
  });
  it('runner screws: ordinate 19/37/69/261/293, height dimensioned to the runner line (solid line labelled)', () => {
    const f = faceSheets(part('P2 Bok L'), plan.features)[0]!;
    const ds = dimensionsFor(f);
    const ord = ds.find((d) => d.kind === 'ordinate' && d.label === 'front edge') as Extract<Dim, { kind: 'ordinate' }>;
    expect(ord.ticks.map((t) => t.text)).toEqual(expect.arrayContaining(['19', '37', '69', '261', '293']));
    expect(nums(ds)).toEqual(expect.arrayContaining([0, 323, 576]));
    expect(ds.filter((d) => d.kind === 'line' && d.style === 'runner')).toHaveLength(3);
  });
  it('Figma measure: 4 lines from the hole to the edges, the two reference edges flagged, values add up', () => {
    const f = faceSheets(part('G2 Bok P'), plan.features).find((x) => x.faceLabel.startsWith('inner'))!;
    const h = f.holes.find((x) => x.f.kind === 'plate-screw')!;
    const ds = edgeDims(f, h) as Extract<Dim, { kind: 'measure' }>[];
    expect(ds.map((d) => d.edge).sort()).toEqual(['bottom', 'left', 'right', 'top']);
    expect(ds.filter((d) => d.ref)).toHaveLength(2);
    const v = (e: string) => Number(ds.find((d) => d.edge === e)!.text.replace(',', '.'));
    expect(v('left') + v('right')).toBeCloseTo(f.w, 0);
    expect(v('bottom') + v('top')).toBeCloseTo(f.h, 0);
    expect(ds.filter((d) => d.ref).map((d) => d.text)).toEqual(expect.arrayContaining(['37']));
  });
});

describe('board sheet', () => {
  it('side panel: long side horizontal, four edge names, front edge and bottom edge are the references', () => {
    const f = faceSheets(part('G2 Bok P'), plan.features).find((x) => x.faceLabel.startsWith('inner'))!;
    expect(f.w).toBeGreaterThanOrEqual(f.h);
    expect(Object.values(f.edgeNames).sort()).toEqual(['BACK edge', 'front edge', 'panel bottom edge', 'panel top edge'])   // Camar dowels measured from the back edge;
  });
  it('TIP-ON bore drawn on the front edge face (18 mm strip)', () => {
    const am = ModelSchema.parse(JSON.parse(readFileSync('projects/alcove-wardrobe/model.json', 'utf8')));
    const ap = planDrilling(am);
    const p = am.parts.find((x) => x.name.startsWith('S1 Schowek Bok P'))!;
    const edge = faceSheets(p, ap.features).find((x) => x.faceLabel === 'front edge')!;
    expect(edge.h).toBe(18);
    expect(edge.holes.every((h) => h.f.kind === 'tipon-bore')).toBe(true);
    expect(nums(dimensionsFor(edge))).toEqual(expect.arrayContaining([7.5, 613, 1151]));
  });
  it('mirror swaps the left/right edges and keeps the values', () => {
    const f = faceSheets(part('G4 Drzwi'), plan.features).find((x) => x.faceLabel === 'back')!;
    const mr = mirrored(f);
    expect([mr.edgeNames.left, mr.edgeNames.right]).toEqual([f.edgeNames.right, f.edgeNames.left]);
    expect(nums(dimensionsFor(mr)).sort()).toEqual(nums(dimensionsFor(f)).sort());
  });
  it('SVG: true mm size, every hole numbered, placeholder footnote, Figma pills', () => {
    const f = faceSheets(part('G2 Bok P'), plan.features).find((x) => x.faceLabel.startsWith('inner'))!;
    const svg = faceSvg(f, { scale: '1:5', measure: 'all' });
    expect(svg).toMatch(/^<svg[^>]+width="[\d.]+mm"/);
    expect((svg.match(/<circle data-n=/g) ?? []).length).toBe(f.holes.filter((h) => h.f.kind !== 'runner-line').length);
    expect(svg).toContain('zmierz na okuciu');
    expect(svg).toContain('url(#am)');
    const filtered = faceSvg(f, { scale: 'fit', kinds: new Set(['plate-screw']) });
    expect((filtered.match(/<circle data-n=/g) ?? []).length).toBe(4);
  });
  it('names are escaped', () => {
    expect(esc('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});
