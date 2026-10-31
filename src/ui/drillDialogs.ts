import { CATALOG, itemById, notesFor, normStatus, type HardwareItem } from '../drilling/catalog';
import { mergeParams, PLACEHOLDER_PARAMS } from '../drilling/params';
import { faceSvg, type FaceSheet } from '../drilling/sheet';
import { fmt, type FaceHole } from '../drilling/dims';
import type { DrillFeature, DrillKindId } from '../drilling/schema';
import type { DrillSession } from './drillSession';
import { el, statusBadge } from './drillBlocks';

function dialog(title: string): { d: HTMLDialogElement; body: HTMLElement } {
  const d = el('dialog', 'dialog wide');
  const close = el('button', 'close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => d.close());
  d.addEventListener('close', () => d.remove());
  const body = el('div');
  d.append(close, el('h2', undefined, title), body);
  document.body.append(d);
  return { d, body };
}

// template value: number, or a formula from the catalogue evaluated with sample values (B = 5, shelf depth 300)
function evalTpl(v: number | string, vars: Record<string, number>): number {
  if (typeof v === 'number') return v;
  const m = v.match(/^(B|depth)\s*([+-])\s*([\d.]+)$/);
  if (m) return (vars[m[1]!] ?? 0) + (m[2] === '+' ? 1 : -1) * Number(m[3]);
  return 0;                                        // free text ("handle height ±300") → origin
}

// template drawing of a catalogue item ("karta okucia"): the same dims engine on a sample board around the origin
export function templateSheet(item: HardwareItem): FaceSheet {
  const kind = (Object.entries(CATALOG.kind_to_item).find(([, v]) => v === item.id)?.[0] ?? 'shelf-pin') as DrillKindId;
  const vars = { B: 5, depth: 300 };
  const pts = item.template.holes.map((h) => ({ h, u: evalTpl(h.u, vars), v: evalTpl(h.v, vars) }));
  const minU = Math.min(0, ...pts.map((p) => p.u)), maxU = Math.max(...pts.map((p) => p.u));
  const minV = Math.min(0, ...pts.map((p) => p.v)), maxV = Math.max(...pts.map((p) => p.v));
  const ox = minU < 0 ? -minU + 40 : 0, oy = -minV + 40;
  const w = Math.max(120, maxU + ox + 60), h = Math.max(100, maxV + oy + 40);
  const holes: FaceHole[] = pts.map((p, i) => {
    const f: DrillFeature = {
      id: `t${i}`, cabinet: '', kind, hardware: item.articles?.[0] ?? item.id, part: { id: 't', name: item.label }, face: 'y-',
      world: { p: [0, 0, 0], dir: [0, 1, 0] }, dia: p.h.dia, depth: p.h.depth, note: p.h.name ?? '', verify: false, unit: '', optional: false,
      item: item.id, status: normStatus(p.h.status),
      local: { u: p.u + ox, v: p.v + oy, u_from: 'origin edge', v_from: 'origin line', face: item.template.face },
    };
    return { n: i + 1, f, x: p.u + ox, y: p.v + oy };
  });
  return { face: 'y-', faceLabel: item.template.face, w, h, holes,
    refs: [{ axis: 'x', atMax: false, label: 'origin edge' }, { axis: 'y', atMax: false, label: 'origin line' }],
    edgeNames: { left: `origin: ${item.template.origin}`, right: '', bottom: '', top: item.template.part } };
}

export function openDatasheet(itemId: string, session: DrillSession): void {
  const item = itemById(itemId);
  if (!item) return;
  const { d, body } = dialog(item.label);
  if (item.articles?.length) body.append(el('p', 'meta', `Artykuły: ${item.articles.join(', ')}`));
  body.append(el('p', 'meta', `Część: ${item.template.part} · ściana: ${item.template.face} · początek: ${item.template.origin}`));
  const draw = el('div', 'sheet-svg');
  draw.innerHTML = faceSvg(templateSheet(item), { scale: 'fit', measure: 'all', showDims: true });
  body.append(draw);
  const t = el('table', 'holes');
  for (const h of item.template.holes) {
    const tr = el('tr'); const st = el('td'); st.append(statusBadge(normStatus(h.status)));
    tr.append(el('td', undefined, h.name ?? ''), el('td', 'num', `u ${h.u}`), el('td', 'num', `v ${h.v}`), el('td', 'num', `Ø${fmt(h.dia)} × ${fmt(h.depth)}`), st);
    t.append(tr);
  }
  body.append(t);
  const notes = notesFor(item.id, session.overrides.notes);
  if (notes.length) {
    body.append(el('h3', undefined, 'Uwagi montażowe'));
    const ul = el('ul'); for (const n of notes) ul.append(el('li', n.own ? 'own' : undefined, n.text)); body.append(ul);
  }
  for (const s of item.sources ?? []) {
    const a = el('a', undefined, s.startsWith('http') ? new URL(s).hostname + ' – źródło' : s);
    if (s.startsWith('http')) { a.href = s; a.target = '_blank'; a.rel = 'noopener'; }
    const p = el('p', 'meta'); p.append(a); body.append(p);
  }
  d.showModal();
}

// "Parametry okuć": placeholder values measured on the real hardware → drilling.json params, plan recomputed
export function openParams(session: DrillSession): void {
  const { d, body } = dialog('Parametry okuć (placeholdery)');
  body.append(el('p', 'lead', 'Wartości, których nie podaje producent – zmierz okucie i wpisz. Puste pole = wartość domyślna.'));
  const P = mergeParams(session.overrides.params) as unknown as Record<string, Record<string, number>>;
  for (const p of PLACEHOLDER_PARAMS) {
    const lab = el('label', 'field');
    lab.append(el('span', undefined, p.label), el('small', undefined, `teraz ${fmt(P[p.group]?.[p.key] ?? NaN)} mm`));
    const row = el('span', 'drill-row');
    const inp = el('input'); inp.type = 'number'; inp.step = '0.5';
    inp.value = String(session.overrides.params[p.group]?.[p.key] ?? '');
    inp.disabled = !session.enabled;
    const ok = el('button', 'btn-small', 'zapisz'); ok.type = 'button'; ok.disabled = !session.enabled;
    ok.addEventListener('click', () => {
      lab.querySelector('.err')?.remove();
      const v = inp.value.trim() === '' ? null : Number(inp.value);
      ok.disabled = true;
      session.save({ kind: 'param', group: p.group, key: p.key, value: v })
        .then(() => { lab.querySelector('small')!.textContent = `zapisane: ${v ?? 'domyślna'}`; })
        .catch((e: unknown) => lab.append(el('span', 'err', e instanceof Error ? e.message : String(e))))
        .finally(() => { ok.disabled = false; });
    });
    row.append(inp, ok);
    lab.append(row);
    body.append(lab);
  }
  if (!session.enabled) body.append(el('p', 'hint', session.hint ?? ''));
  d.showModal();
}
