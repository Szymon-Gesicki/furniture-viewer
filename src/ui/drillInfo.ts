import type { Part } from '../model/schema';
import type { DrillFeature, DrillOverrides, DrillPlan } from '../drilling/schema';
import { parseHingeZ, type DrillEdit } from '../drilling/overrides';
import { kindLabel } from '../drilling/sheet';
import { hingeSummary, holeSize } from './drillFormat';

export interface DrillCtx {
  plan: DrillPlan; overrides: DrillOverrides;
  enabled: boolean; hint?: string;               // saving drilling.json (GitHub token)
  sheetHref(part: Part): string;
  save(edit: DrillEdit): Promise<void>;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// an override control: disabled while saving, error under the control
function saving(wrap: HTMLElement, ctrls: (HTMLInputElement | HTMLSelectElement | HTMLButtonElement)[], run: () => Promise<void>) {
  wrap.querySelector('.err')?.remove();
  ctrls.forEach((c) => { c.disabled = true; });
  run().catch((e: unknown) => {
    ctrls.forEach((c) => { c.disabled = false; });
    wrap.append(el('span', 'err', e instanceof Error && e.message ? e.message : 'Could not save the change'));
  });
}

function select(label: string, options: [string, string][], value: string, ctx: DrillCtx, onChange: (v: string) => DrillEdit): HTMLElement {
  const wrap = el('label', 'drill-ctl');
  wrap.append(el('span', undefined, label));
  const s = el('select');
  for (const [v, t] of options) { const o = el('option', undefined, t); o.value = v; s.append(o); }
  s.value = value;
  s.disabled = !ctx.enabled;
  s.addEventListener('change', () => saving(wrap, [s], () => ctx.save(onChange(s.value))));
  wrap.append(s);
  return wrap;
}

type SortKey = 'kind' | 'u' | 'v';
function holeTable(fs: DrillFeature[]): HTMLElement {
  const wrap = el('div');
  let key: SortKey = 'kind', dir = 1;
  const render = () => {
    const rows = [...fs].sort((a, b) => dir * (key === 'kind' ? a.kind.localeCompare(b.kind) || a.local.v - b.local.v : a.local[key] - b.local[key]));
    const t = el('table', 'holes');
    const head = el('tr');
    for (const [k, txt] of [['kind', 'Hole'], [null, 'Ø × depth'], ['u', 'u'], ['v', 'v']] as [SortKey | null, string][]) {
      const th = el('th');
      if (k) {
        const b = el('button', 'btn-link inline', txt + (key === k ? (dir > 0 ? ' ↑' : ' ↓') : ''));
        b.type = 'button';
        b.addEventListener('click', () => { dir = key === k ? -dir : 1; key = k; render(); });
        th.append(b);
      } else th.textContent = txt;
      head.append(th);
    }
    t.append(head);
    for (const f of rows) {
      const tr = el('tr');
      tr.title = [f.hardware, `u from ${f.local.u_from}`, `v from ${f.local.v_from}`, f.note].filter(Boolean).join('\n');
      const kind = el('td', undefined, kindLabel(f.kind));
      if (f.verify) kind.append(' ', el('span', 'badge-verify', 'verify'));
      if (f.optional) kind.append(' ', el('span', 'badge-opt', 'optional'));
      tr.append(kind, el('td', undefined, holeSize(f)), el('td', 'num', f.kind === 'runner-line' ? '' : String(f.local.u)), el('td', 'num', String(f.local.v)));
      t.append(tr);
    }
    wrap.replaceChildren(t);
  };
  render();
  return wrap;
}

// "Drilling" block of the part info panel: hinge/shelf summary and overrides, hole list, sheet link
export function drillPartSection(part: Part, ctx: DrillCtx): HTMLElement | null {
  const own = ctx.plan.features.filter((f) => f.part.id === part.id);
  const hinge = ctx.plan.hinges.find((h) => h.door.id === part.id);
  const shelf = ctx.plan.shelves.find((s) => s.shelf.id === part.id);
  const warnings = ctx.plan.warnings.filter((w) => w.text.startsWith(part.name + ':'));
  if (!own.length && !hinge && !shelf && !warnings.length) return null;
  const sec = el('section', 'drill-info');
  sec.append(el('h3', undefined, `Drilling (${own.filter((f) => f.kind !== 'runner-line').length} holes)`));
  for (const w of warnings) sec.append(el('p', 'drill-warn', w.text.slice(part.name.length + 2)));

  if (hinge) {
    sec.append(el('p', 'meta', `${hingeSummary(hinge)} · plates on ${hinge.side_panel.name}`));
    for (const m of hinge.moved) sec.append(el('p', 'meta', `hinge ${m.hinge} moved ${m.from} → ${m.to} (clear of ${m.because})`));
    if (hinge.inset) sec.append(el('p', 'drill-warn', 'Inset door – B and plate setback to verify before drilling'));
    if (!hinge.hinges_from_door_left) {
      const cur = ctx.overrides.hingeSide[part.name];
      sec.append(select('Hinge side', [['', cur ? 'auto (by rule)' : `auto (${hinge.hinge_side})`], ['L', 'L (left, from the front)'], ['P', 'P (right, from the front)']],
        cur ?? '', ctx, (v) => ({ kind: 'hingeSide', name: part.name, value: v === 'L' || v === 'P' ? v : null })));
      const wrap = el('label', 'drill-ctl');
      wrap.append(el('span', undefined, 'Hinge heights from the door bottom'));
      const row = el('span', 'drill-row');
      const inp = el('input');
      inp.value = (ctx.overrides.hingeZ[part.name] ?? hinge.hinges_from_door_bottom ?? []).join(', ');
      inp.disabled = !ctx.enabled;
      const ok = el('button', 'btn-small', 'save'); ok.type = 'button'; ok.disabled = !ctx.enabled;
      const auto = el('button', 'btn-small', 'auto'); auto.type = 'button';
      auto.disabled = !ctx.enabled || !ctx.overrides.hingeZ[part.name];
      ok.addEventListener('click', () => {
        const zs = parseHingeZ(inp.value);
        wrap.querySelector('.err')?.remove();
        if (!zs) { wrap.append(el('span', 'err', 'Enter heights in mm, e.g. 100, 600, 1012')); return; }
        saving(wrap, [inp, ok, auto], () => ctx.save({ kind: 'hingeZ', name: part.name, value: zs }));
      });
      auto.addEventListener('click', () => saving(wrap, [inp, ok, auto], () => ctx.save({ kind: 'hingeZ', name: part.name, value: null })));
      row.append(inp, ok, auto);
      wrap.append(row);
      sec.append(wrap);
    }
  }
  if (shelf) {
    const cur = ctx.overrides.shelfMode[part.name];
    sec.append(select('Shelf mounting', [['', cur ? 'auto (by rule)' : `auto (${shelf.fixed ? 'fixed – screws' : 'pins'})`], ['adjustable', 'adjustable – pins Ø5'], ['fixed', 'fixed – screws 4×50']],
      cur ?? '', ctx, (v) => ({ kind: 'shelfMode', name: part.name, value: v === 'fixed' || v === 'adjustable' ? v : null })));
    sec.append(el('p', 'meta', `holes in ${[...new Set(shelf.holes.map((h) => h.panel))].join(', ') || '—'}`));
  }
  if ((hinge || shelf) && !ctx.enabled) sec.append(el('span', 'hint', ctx.hint ?? 'Saving is disabled'));
  if (own.length) {
    sec.append(holeTable(own));
    const a = el('a', 'btn', 'Drilling sheet');
    a.href = ctx.sheetHref(part);
    sec.append(el('div', 'actions'));
    sec.lastElementChild!.append(a);
  }
  return sec;
}
