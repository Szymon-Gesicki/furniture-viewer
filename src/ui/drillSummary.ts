import type { DrillPlan } from '../drilling/schema';
import { hardwareCount, type HardwareRow } from '../drilling/hardware';
import { hingeSummary } from './drillFormat';
import { jigNote } from '../drilling/catalog';
import { DRILL_PARAMS } from '../drilling/params';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const short = (name: string) => name.split(' (')[0]!;
const n = (v: number) => String(Math.round(v * 10) / 10);

export function hardwareTable(rows: HardwareRow[]): HTMLElement {
  const t = el('table', 'holes hardware');
  for (const r of rows) {
    const tr = el('tr');
    tr.append(el('td', 'mono', r.article), el('td', undefined, r.label), el('td', 'num', String(r.pcs)));
    t.append(tr);
  }
  return t;
}

// cabinet summary for the unit panel and the cabinet sheet: hinges, drawers, shelves, warnings, hardware
export function drillSummary(plan: DrillPlan, unit: string, sheetHref?: string, jigCup = DRILL_PARAMS.jig.cup_from_edge, buildHref?: string): HTMLElement | null {
  const hinges = plan.hinges.filter((h) => h.unit === unit);
  const drawers = plan.drawers.filter((d) => d.unit === unit);
  const shelves = plan.shelves.filter((s) => s.unit === unit);
  const warnings = plan.warnings.filter((w) => w.unit === unit);
  const features = plan.features.filter((f) => f.unit === unit);
  if (!hinges.length && !drawers.length && !shelves.length && !warnings.length && !features.length) return null;
  const sec = el('section', 'drill-summary');
  sec.append(el('h3', undefined, 'Drilling'));
  for (const w of warnings) sec.append(el('p', 'drill-warn', w.text));
  const uv = (part: string, kind: string) => {
    const fs = features.filter((f) => f.part.id === part && f.kind === kind);
    const set = (k: 'u' | 'v') => [...new Set(fs.map((f) => f.local[k]))].sort((a, b) => a - b).map(n).join(' / ');
    return `u ${set('u')}, v ${set('v')}`;
  };
  const list = (title: string, items: string[][]) => {
    if (!items.length) return;
    sec.append(el('h4', undefined, title));
    const ul = el('ul', 'drill-list');
    for (const [head, ...rest] of items) {
      const li = el('li');
      li.append(el('strong', undefined, head));
      for (const r of rest) li.append(el('span', r.startsWith('!') ? 'drill-warn' : 'meta', r.replace(/^!/, '')));
      ul.append(li);
    }
    sec.append(ul);
  };
  list('Doors and hinges', hinges.map((h) => [
    short(h.door.name), hingeSummary(h),
    h.plates_from_side_bottom ? `plates on ${short(h.side_panel.name)}: ${h.plates_from_side_bottom.map(n).join(', ')} from the panel bottom (setback ${n(h.plate_setback)})`
      : `plates on the top face of ${short(h.side_panel.name)}, ${n(h.plate_setback)} from the front edge`,
    ...h.moved.map((m) => `hinge ${m.hinge} moved ${n(m.from)} → ${n(m.to)} (clear of ${short(m.because)})`),
    ...(h.inset ? ['!inset door – B and setback to verify (Blum chart / E-SERVICES)'] : []),
    ...(h.hinges_from_door_left ? [] : [`Wolfcraft: ${jigNote(h, jigCup)}`]),
  ]));
  list('Drawers (MERIVOBOX NL 500)', drawers.map((d) => [
    short(d.front.name),
    `type ${d.type} · inner width ${n(d.inner_width)} · runner bottom line ${d.runner_bottom_from_side_bottom.map(n).join(' / ')} from the side bottom`,
    `INSERTA Ø10×12 ${uv(d.front.id, 'front-fixing')} · stabiliser ${uv(d.front.id, 'front-stabiliser')}`,
    `bottom ${n(d.bottom_panel[0])}×${d.bottom_panel[1]}, back ${n(d.back_panel[0])}×${d.back_panel[1] ?? '?'} (stabiliser position 256 on the bottom – no hole)`,
  ]));
  list('Shelves', shelves.map((s) => [short(s.shelf.name),
    `${s.fixed ? 'fixed – screws Spax 4×50 from outside' : 'adjustable – pins Ø5×10'} (${s.mode_reason})`]));
  list('TIP-ON 956A1006 – Ø10 × 76 w przedniej krawędzi', features.filter((f) => f.kind === 'tipon-bore').map((f) => [short(f.part.name),
    f.local.u_from.startsWith('inner') ? `v ${n(f.local.v)} od dołu płyty, 7,5 od wewnętrznej powierzchni` : `u ${n(f.local.u)} od lewego końca płyty, 7,5 od wewnętrznej powierzchni`]));
  const camar = [...new Set(features.filter((f) => f.kind === 'hanger-dowel').map((f) => f.part.name))];
  list('Zawieszki Camar 801', camar.map((name) => {
    const fs = features.filter((f) => f.kind === 'hanger-dowel' && f.part.name === name);
    return [short(name), `2 × Ø10 × 10,5 na wysokości ${n(fs[0]!.local.v)} od dołu boku`, `!u ${fs.map((f) => n(f.local.u)).join(' / ')} od tylnej krawędzi – placeholder, zmierz zawieszkę`];
  }));
  const hw = hardwareCount({ features, drawers });
  if (hw.length) { sec.append(el('h4', undefined, 'Hardware')); sec.append(hardwareTable(hw)); }
  const act = el('div', 'actions no-print');
  if (sheetHref) { const a = el('a', 'btn', 'Cabinet drilling sheet'); a.href = sheetHref; act.append(a); }
  if (buildHref) { const a = el('a', 'btn btn-primary', 'Składanie'); a.href = buildHref; act.append(a); }
  if (act.children.length) sec.append(act);
  return sec;
}
