import { HW_GROUPS } from '../drilling/catalog';
import type { HardwareRow } from '../drilling/hardware';
import type { DrillView } from './drillState';
import { hardwareTable } from './drillSummary';
import { el } from './drillBlocks';

export type ExtraRows = 'auto' | 'on' | 'off';
export interface DrillPanelProps {
  view: DrillView; counts: Record<string, number>;          // holes per hardware group (in scope)
  extraRows: ExtraRows; editEnabled: boolean; hint?: string;
  hardware: HardwareRow[];                                  // per article, for the selected groups
  warnings: string[];
  onView(v: DrillView): void;
  onExtraRows(v: ExtraRows): Promise<void>;
  onParams(): void;                                         // "Parametry okuć…" dialog
}

// "Okucia" section of the left panel (PLAN 5): show holes, filter by hardware group, counts per article
export function drillPanel(host: HTMLElement, p: DrillPanelProps): void {
  host.replaceChildren();
  let view = p.view;
  const set = (v: DrillView) => { view = v; p.onView(v); sync(); };
  const ul = el('ul', 'layers');
  const master = el('input'); master.type = 'checkbox';
  master.addEventListener('change', () => set({ ...view, on: master.checked }));
  const total = Object.values(p.counts).reduce((a, b) => a + b, 0);
  const li = el('li'); const lab = el('label');
  lab.append(master, el('span', 'layer-name', 'Pokaż otwory'), el('span', 'layer-count', String(total)));
  li.append(lab); ul.append(li);

  const groups = el('div', 'drill-groups');
  const list = el('ul', 'layers drill-kinds');
  const boxes = new Map<string, HTMLInputElement>();
  for (const g of HW_GROUPS) {
    const c = p.counts[g.id];
    if (!c) continue;
    const row = el('li'); const l = el('label');
    const cb = el('input'); cb.type = 'checkbox';
    cb.addEventListener('change', () => set({ ...view, groups: { ...view.groups, [g.id]: cb.checked } }));
    l.append(cb, el('span', 'layer-name', g.label), el('span', 'layer-count', String(c)));
    const only = el('button', 'btn-small', 'tylko'); only.type = 'button';
    only.addEventListener('click', () => set({ ...view, groups: Object.fromEntries(HW_GROUPS.map((x) => [x.id, x.id === g.id])) }));
    row.append(l, only); list.append(row);
    boxes.set(g.id, cb);
  }
  const all = el('button', 'btn-link', 'wszystko'); all.type = 'button';
  all.addEventListener('click', () => set({ ...view, groups: Object.fromEntries(HW_GROUPS.map((x) => [x.id, true])) }));
  const xray = el('label', 'check-row');
  const xcb = el('input'); xcb.type = 'checkbox';
  xcb.addEventListener('change', () => set({ ...view, xray: xcb.checked }));
  xray.append(xcb, el('span', undefined, 'Fronty przezroczyste (x-ray)'));
  groups.append(list, all, xray);

  const rows = el('label', 'drill-ctl');
  rows.append(el('span', undefined, 'Dodatkowe rzędy podpórek ±32 / ±64'));
  const sel = el('select');
  for (const [v, t] of [['auto', 'auto (tylko arkusz)'], ['on', 'wł. (3D i arkusz)'], ['off', 'wył.']] as [ExtraRows, string][]) {
    const o = el('option', undefined, t); o.value = v; sel.append(o);
  }
  sel.value = p.extraRows;
  sel.disabled = !p.editEnabled;
  sel.title = p.editEnabled ? 'Zapisywane w drilling.json' : p.hint ?? '';
  sel.addEventListener('change', () => {
    sel.disabled = true;
    rows.querySelector('.err')?.remove();
    p.onExtraRows(sel.value as ExtraRows).catch((e: unknown) => {
      sel.value = p.extraRows; sel.disabled = false;
      rows.append(el('span', 'err', e instanceof Error && e.message ? e.message : 'Could not save the change'));
    });
  });
  rows.append(sel);
  const params = el('button', 'btn-link', 'Parametry okuć (placeholdery)…'); params.type = 'button';
  params.addEventListener('click', p.onParams);

  host.append(ul, groups, rows, params);
  if (p.warnings.length) {
    const d = el('details', 'drill-warnings');
    d.append(el('summary', 'drill-warn', `${p.warnings.length} ostrzeż${p.warnings.length === 1 ? 'enie' : 'eń'}`));
    for (const w of p.warnings) d.append(el('p', 'drill-warn', w));
    host.append(d);
  }
  if (p.hardware.length) {
    const d = el('details');
    d.append(el('summary', undefined, 'Okucia – sztuki (wybrane grupy)'), hardwareTable(p.hardware));
    host.append(d);
  }
  const sync = () => {
    master.checked = view.on;
    groups.hidden = !view.on;
    xcb.checked = view.xray;
    for (const [id, cb] of boxes) cb.checked = view.groups[id] !== false;
  };
  sync();
}
