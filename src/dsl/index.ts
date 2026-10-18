// DSL for writing new furniture. Same coordinates as imported models: mm, Z up,
// furniture front facing −Y, wall on the +Y side.
import type { LayerId, Model, Part } from '../model/schema';
import type { V3 } from '../viewer/explode';

export const T = 18, HDF = 3;
export const MATERIALS = {
  'carcass-macadamia': { label: 'Macadamia K681 PD 18 (carcass)', color: '#d6caba' },
  'front-macadamia':   { label: 'Macadamia K681 PD 18 (front)', color: '#cdbfae' },
  'oak-hudson':        { label: 'Gold Hudson Oak K529 HU 18', color: '#a87c54' },
  'hdf':               { label: 'HDF Cashmere 5981 3', color: '#ebe6de' },
  'handle-black':      { label: 'Black handle', color: '#161618' },
  'leg':               { label: 'Adjustable leg', color: '#3c3c3e' },
} as const;
type Material = keyof typeof MATERIALS;

type Layout = 'sides-outside' | 'panels-outside' | 'base';
interface P { readonly parts: Part[]; readonly groups: Model['groups']; add(part: Omit<Part, 'id'>): Part }
interface C { readonly p: P; readonly id: string; readonly name: string;
              readonly w: number; readonly d: number; readonly h: number; readonly at: V3 }

// edges.raw as in imported models: only the narrow edges without banding (faces don't count)
const SIDE = ['y+', 'z+', 'z-'];                // side panel: banded at the front only
const HORIZONTAL = ['x-', 'x+', 'y+'];          // top/bottom panel, shelf, front rail: banded at the front only
const BACK_RAIL = ['x-', 'x+', 'y-', 'y+'];     // no banding
const BACK = ['x-', 'x+', 'z-', 'z+'];          // HDF, no banding
const r = (v: number) => Math.round(v * 10) / 10;

function board(c: C, o: { name: string; layer: LayerId; material: Material; min: V3; max: V3; raw: string[]; t?: number }): Part {
  return c.p.add({
    name: `${c.name} ${o.name}`, group: c.id, unit: c.id, layer: o.layer, material: o.material,
    shape: { type: 'box', min: o.min.map(r) as V3, max: o.max.map(r) as V3 },
    edges: { raw: o.raw }, meta: o.t === undefined ? {} : { thickness: o.t },
  });
}

export function project(o: { id: string; name: string; description?: string; build(p: P): void }): { toModel(): Model } {
  return {
    // rebuilt from scratch on every call – calling twice does not duplicate parts
    toModel() {
      const parts: Part[] = [];
      const groups: Model['groups'] = [];
      const p: P = {
        parts, groups,
        add(part) {
          const full = { ...part, id: `p${String(parts.length + 1).padStart(4, '0')}` } as Part;
          parts.push(full);
          return full;
        },
      };
      o.build(p);
      const used = new Set(parts.map((x) => x.material));
      const materials = Object.fromEntries(
        Object.entries(MATERIALS).filter(([id]) => used.has(id)).map(([id, m]) => [id, { ...m }]));
      return {
        format: 'furniture-model', version: 1, id: o.id, name: o.name, description: o.description ?? '',
        source: `dsl:projects/${o.id}/project.ts`, materials, groups, parts,
      };
    },
  };
}

export function cabinet(p: P, o: { id: string; name: string; w: number; d: number; h: number; at: V3; layout: Layout; back?: boolean }): C {
  const c: C = { p, id: o.id, name: o.name, w: o.w, d: o.d, h: o.h, at: o.at };
  p.groups.push({ id: o.id, name: o.name, parent: null });
  const [x, y, z] = o.at;
  const { w, d, h } = o;
  const y0 = y - d;
  const cp = (name: string, min: V3, max: V3, raw = HORIZONTAL) =>
    board(c, { name, layer: 'carcass', material: 'carcass-macadamia', min, max, raw, t: T });

  if (o.layout === 'sides-outside') {
    cp(`Side L ${h}x${d}`, [x, y0, z], [x + T, y, z + h], SIDE);
    cp(`Side R ${h}x${d}`, [x + w - T, y0, z], [x + w, y, z + h], SIDE);
    cp(`Top panel ${w - 2 * T}x${d}`, [x + T, y0, z + h - T], [x + w - T, y, z + h]);
    cp(`Bottom panel ${w - 2 * T}x${d}`, [x + T, y0, z], [x + w - T, y, z + T]);
  } else if (o.layout === 'panels-outside') {
    cp(`Top panel ${w}x${d}`, [x, y0, z + h - T], [x + w, y, z + h]);
    cp(`Bottom panel ${w}x${d}`, [x, y0, z], [x + w, y, z + T]);
    cp(`Side L ${h - 2 * T}x${d}`, [x, y0, z + T], [x + T, y, z + h - T], SIDE);
    cp(`Side R ${h - 2 * T}x${d}`, [x + w - T, y0, z + T], [x + w, y, z + h - T], SIDE);
  } else {
    cp(`Bottom panel ${w}x${d}`, [x, y0, z], [x + w, y, z + T]);
    cp(`Side L ${h - T}x${d}`, [x, y0, z + T], [x + T, y, z + h], SIDE);
    cp(`Side R ${h - T}x${d}`, [x + w - T, y0, z + T], [x + w, y, z + h], SIDE);
    cp(`Front rail ${w - 2 * T}x100`, [x + T, y0, z + h - T], [x + w - T, y0 + 100, z + h]);
    cp(`Back rail ${w - 2 * T}x100`, [x + T, y - 100, z + h - T], [x + w - T, y, z + h], BACK_RAIL);
  }
  if (o.back !== false) {
    board(c, { name: `Back HDF ${w}x${h}`, layer: 'back', material: 'hdf',
               min: [x, y, z], max: [x + w, y + HDF, z + h], raw: BACK, t: HDF });
  }
  return c;
}

// z = underside of the shelf from the bottom of the box; setback from the front
export function shelf(c: C, o: { z: number; setback?: number }): Part {
  const [x, y, z] = c.at;
  const dd = c.d - (o.setback ?? 0);
  return board(c, { name: `Shelf ${c.w - 2 * T}x${dd}`, layer: 'carcass', material: 'carcass-macadamia',
    min: [x + T, y - dd, z + o.z], max: [x + c.w - T, y, z + o.z + T], raw: HORIZONTAL, t: T });
}

export function front(c: C, o: { name: string; x0: number; x1: number; z0: number; z1: number }): Part {
  const [x, y, z] = c.at;
  const y0 = y - c.d;
  return board(c, { name: `${o.name} ${r(o.x1 - o.x0)}x${r(o.z1 - o.z0)}`, layer: 'front', material: 'front-macadamia',
    min: [x + o.x0, y0 - T, z + o.z0], max: [x + o.x1, y0, z + o.z1], raw: [], t: T });
}

// box 190×12×10 (bar) or 32×12×25 (knob) in front of the front; x, z = centre of the handle
export function handle(c: C, o: { x: number; z: number; type: '190' | '32' }): Part {
  const [x, y, z] = c.at;
  const [lw, lh] = o.type === '190' ? [190, 10] : [32, 25];
  const yf = y - c.d - T;
  return board(c, { name: `Handle ${o.type}`, layer: 'handles', material: 'handle-black',
    min: [x + o.x - lw / 2, yf - 12, z + o.z - lh / 2], max: [x + o.x + lw / 2, yf, z + o.z + lh / 2], raw: [] });
}

// 4 legs 34×34 under the box, 50 mm from the corners
export function legs(c: C, o?: { h?: number }): Part[] {
  const [x, y, z] = c.at;
  const h = o?.h ?? 100, s = 34, e = 50;
  const xs = [x + e, x + c.w - e - s], ys = [y - c.d + e, y - e - s];
  return xs.flatMap((nx) => ys.map((ny) => board(c, { name: `Leg ${h}`, layer: 'legs', material: 'leg',
    min: [nx, ny, z - h], max: [nx + s, ny + s, z], raw: [] })));
}
