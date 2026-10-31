// Building blocks shared by the board sheet and the assembly mode: hole table, montage notes, board note, placeholders
import type { FaceHole } from '../drilling/dims';
import { fmt } from '../drilling/dims';
import { itemById, itemLabel, notesFor } from '../drilling/catalog';
import { mergeParams, PLACEHOLDER_PARAMS } from '../drilling/params';
import type { DrillFeature } from '../drilling/schema';
import type { DrillSession } from './drillSession';

export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const STATUS_PL: Record<string, string> = { verified: 'sprawdzone', standard: 'standard', placeholder: 'do zmierzenia' };
export const statusBadge = (s: string) => el('span', `status status-${s}`, STATUS_PL[s] ?? s);

// error message under a control after a failed save
async function saving(host: HTMLElement, run: () => Promise<void>) {
  host.querySelector(':scope > .err')?.remove();
  try { await run(); } catch (e) { host.append(el('span', 'err', e instanceof Error && e.message ? e.message : 'Could not save the change')); }
}

export function holeTable(holes: FaceHole[], onHover?: (n: number | null) => void): HTMLElement {
  const t = el('table', 'holes sheet-table');
  const hr = el('tr');
  for (const c of ['#', 'Okucie', 'u', 'od', 'v', 'od', 'Ø × gł.', 'Status']) hr.append(el('th', undefined, c));
  t.append(hr);
  for (const h of holes) {
    const f = h.f, tr = el('tr'), line = f.kind === 'runner-line';
    const what = el('td');
    what.append(el('strong', undefined, itemLabel(f.item)), el('div', 'meta', `${f.hardware}${f.note ? ' – ' + f.note : ''}`));
    if (f.optional) what.append(' ', el('span', 'badge-opt', 'optional'));
    const st = el('td'); st.append(statusBadge(f.status));
    tr.append(el('td', 'num', String(h.n)), what, el('td', 'num', line ? '' : fmt(f.local.u)), el('td', undefined, line ? '' : f.local.u_from),
      el('td', 'num', fmt(f.local.runner_line_v ?? f.local.v)), el('td', undefined, f.kind === 'runner-screw' ? 'runner line' : f.local.v_from),
      el('td', 'num', line ? 'linia' : `Ø${fmt(f.dia)} × ${fmt(f.depth)}`), st);
    if (onHover && !line) {
      tr.addEventListener('mouseenter', () => onHover(h.n));
      tr.addEventListener('mouseleave', () => onHover(null));
    }
    t.append(tr);
  }
  return t;
}

// "Uwagi montażowe": catalogue + documentation notes per item, plus the user's own (pencil → textarea, saved in drilling.json)
export function notesBox(items: string[], session: DrillSession): HTMLElement | null {
  const uniq = [...new Set(items)].filter(Boolean);
  if (!uniq.length) return null;
  const box = el('section', 'notes-box');
  box.append(el('h3', undefined, 'Uwagi montażowe'));
  for (const item of uniq) {
    const blk = el('div', 'notes-item');
    const head = el('div', 'notes-head');
    head.append(el('strong', undefined, itemLabel(item)));
    const pen = el('button', 'btn-small no-print', '✎'); pen.type = 'button';
    pen.title = session.enabled ? 'Edytuj własne uwagi' : session.hint ?? '';
    pen.disabled = !session.enabled;
    head.append(pen);
    blk.append(head);
    const ul = el('ul');
    for (const n of notesFor(item, session.overrides.notes)) {
      const li = el('li', n.own ? 'own' : undefined, n.text);
      if (/placeholder|zmierz/i.test(n.text)) li.classList.add('ph');
      ul.append(li);
    }
    if (!ul.children.length) ul.append(el('li', 'meta', 'Brak uwag w katalogu – dodaj własne.'));
    blk.append(ul);
    pen.addEventListener('click', () => {
      if (blk.querySelector('textarea')) return;
      const ta = el('textarea'); ta.rows = 3; ta.value = session.overrides.notes[item] ?? '';
      ta.placeholder = 'Jedna uwaga w linii';
      const ok = el('button', 'btn btn-primary', 'Zapisz'); ok.type = 'button';
      const row = el('div', 'notes-edit no-print'); row.append(ta, ok);
      ok.addEventListener('click', () => { ok.disabled = true; void saving(row, () => session.save({ kind: 'notes', name: item, value: ta.value.trim() || null })).finally(() => { ok.disabled = false; }); });
      blk.append(row);
      ta.focus();
    });
    box.append(blk);
  }
  return box;
}

// free note for one board (partNotes[partCode]); printed under the drawing
export function partNoteBox(code: string, session: DrillSession): HTMLElement {
  const box = el('section', 'part-note');
  const cur = session.overrides.partNotes[code] ?? '';
  box.append(el('h3', undefined, 'Notatka do płyty'));
  const print = el('p', 'print-only', cur);
  const ta = el('textarea', 'no-print'); ta.rows = 2; ta.value = cur; ta.disabled = !session.enabled;
  ta.placeholder = session.enabled ? 'np. sprawdzić prostokątność przed wierceniem' : session.hint ?? '';
  const ok = el('button', 'btn-small no-print', 'zapisz'); ok.type = 'button'; ok.disabled = !session.enabled;
  ok.addEventListener('click', () => void saving(box, () => session.save({ kind: 'partNotes', name: code, value: ta.value.trim() || null })));
  box.append(print, ta, ok);
  if (!cur && !session.enabled) box.classList.add('empty');
  return box;
}

// placeholder parameters used by these holes: orange box "Zmierz na okuciu" with inputs that write drilling.json → params
const PARAMS_FOR: Record<string, string[]> = {
  'hanger-dowel': ['camar801.first_dowel_from_back_edge', 'camar801.dowel_spacing'],
  'runner-screw': ['drawer.runner_screw_above_runner_bottom'],
};
export function placeholderBox(features: DrillFeature[], session: DrillSession): HTMLElement | null {
  const keys = new Set<string>();
  for (const f of features) {
    for (const k of PARAMS_FOR[f.kind] ?? []) keys.add(k);
    if (f.hardware === '71B3750') keys.add('hinge.inset_B');
  }
  if (!keys.size) return null;
  const P = mergeParams(session.overrides.params) as unknown as Record<string, Record<string, number>>;
  const box = el('section', 'ph-box');
  box.append(el('h3', undefined, 'Zmierz na okuciu'));
  for (const k of keys) {
    const [group, key] = k.split('.') as [string, string];
    const meta = PLACEHOLDER_PARAMS.find((p) => p.group === group && p.key === key);
    const lab = el('label', 'drill-ctl');
    lab.append(el('span', undefined, `${meta?.label ?? k} (teraz ${fmt(P[group]?.[key] ?? NaN)} mm)`));
    const row = el('span', 'drill-row');
    const inp = el('input'); inp.type = 'number'; inp.step = '0.5'; inp.inputMode = 'decimal';
    inp.value = String(session.overrides.params[group]?.[key] ?? ''); inp.placeholder = 'zmierzona wartość';
    inp.disabled = !session.enabled;
    const ok = el('button', 'btn-small', 'zapisz'); ok.type = 'button'; ok.disabled = !session.enabled;
    ok.addEventListener('click', () => {
      const v = inp.value.trim() === '' ? null : Number(inp.value.replace(',', '.'));
      if (v !== null && !Number.isFinite(v)) return;
      void saving(lab, () => session.save({ kind: 'param', group, key, value: v }));
    });
    row.append(inp, ok);
    lab.append(row);
    box.append(lab);
  }
  if (!session.enabled) box.append(el('span', 'hint', session.hint ?? ''));
  return box;
}

export const sourceOf = (item: string) => itemById(item)?.sources?.[0];
