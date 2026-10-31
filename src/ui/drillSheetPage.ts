import type { Model, Part } from '../model/schema';
import { findPart } from '../model/codes';
import { unitFrontNormal } from '../drilling/plan';
import { faceSheets, faceSvg, mirrored, type FaceSheet, type SheetScale } from '../drilling/sheet';
import { HW_GROUPS, groupOf, jigNote } from '../drilling/catalog';
import { mergeParams } from '../drilling/params';
import { thumbSvg } from '../drilling/thumb';
import { partCode } from '../drilling/steps';
import { partDims } from './format';
import { unitName } from '../viewer/focus';
import { drillSummary } from './drillSummary';
import { buildHash, projectHash, type DrillTarget } from './route';
import type { DrillSession } from './drillSession';
import { el, holeTable, notesBox, partNoteBox, placeholderBox } from './drillBlocks';

type Mode = 'figma' | 'iso' | 'both';
const KEY = 'fv:sheet';
interface SheetPrefs { scale: SheetScale; mode: Mode; mirror: boolean; group: string }
const loadPrefs = (): SheetPrefs => {
  const d: SheetPrefs = { scale: '1:5', mode: 'both', mirror: false, group: 'all' };
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return { ...d, ...(v && typeof v === 'object' ? v : {}) }; } catch { return d; }
};
const savePrefs = (p: SheetPrefs) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* optional */ } };

function select<T extends string>(label: string, opts: [T, string][], value: T, onChange: (v: T) => void): HTMLElement {
  const lab = el('label', 'bar-ctl');
  lab.append(el('span', undefined, label));
  const s = el('select');
  for (const [v, t] of opts) { const o = el('option', undefined, t); o.value = v; s.append(o); }
  s.value = value;
  s.addEventListener('change', () => onChange(s.value as T));
  lab.append(s);
  return lab;
}

// printable board sheet (one part) or cabinet sheet (every drilled board of a cabinet), A4 landscape
export function drillSheetPage(root0: HTMLElement, model: Model, session: DrillSession, target: DrillTarget): { dispose(): void } {
  const prefs = loadPrefs();
  const byId = new Map(model.parts.map((p) => [p.id, p]));
  const root = el('div', 'sheet');
  root0.append(root);

  const render = () => {
    const plan = session.plan, ov = session.overrides;
    const features = plan.features.filter((f) => !f.optional || ov.extraShelfRows !== false);   // SPEC 4.8: extra rows on in the sheet
    let parts: Part[] = [], title = '', unit: string | null = null;
    if (target.kind === 'part') {
      const p = findPart(model, target.code);
      if (p) { parts = [p]; title = `${partCode(p)} · ${p.name}`; unit = p.unit; } else title = `Part ${target.code} not found`;
    } else {
      unit = target.unit;
      const ids = new Set(features.filter((f) => f.unit === unit || byId.get(f.part.id)?.unit === unit).map((f) => f.part.id));
      parts = model.parts.filter((p) => ids.has(p.id));
      title = `Szafka ${unitName(model, unit)}`;
    }
    const kinds = prefs.group === 'all' ? undefined : new Set(HW_GROUPS.find((g) => g.id === prefs.group)?.kinds ?? []);
    const present = HW_GROUPS.filter((g) => features.some((f) => parts.some((p) => p.id === f.part.id) && groupOf(f.kind) === g.id));

    root.replaceChildren();
    const bar = el('header', 'sheet-bar no-print');
    const back = el('a', 'back', '← Viewer'); back.href = projectHash(model.id, unit);
    bar.append(back,
      select<Mode>('Wymiary', [['both', 'Warsztatowe + Figma po najechaniu'], ['figma', 'Figma (każdy otwór do 4 krawędzi)'], ['iso', 'Warsztatowe (od krawędzi bazowych)']], prefs.mode, (v) => { prefs.mode = v; savePrefs(prefs); render(); }),
      select<SheetScale>('Skala', [['1:5', '1:5'], ['fit', 'Dopasuj do strony']], prefs.scale, (v) => { prefs.scale = v; savePrefs(prefs); render(); }),
      select<string>('Okucia', [['all', 'wszystkie'], ...present.map((g) => [g.id, g.label] as [string, string])], present.some((g) => g.id === prefs.group) ? prefs.group : 'all',
        (v) => { prefs.group = v; savePrefs(prefs); render(); }));
    const mir = el('label', 'bar-ctl check');
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = prefs.mirror;
    cb.addEventListener('change', () => { prefs.mirror = cb.checked; savePrefs(prefs); render(); });
    mir.append(cb, el('span', undefined, 'widok od drugiej strony (lustro)'));
    bar.append(mir);
    if (target.kind === 'cab') { const a = el('a', 'btn', 'Składanie'); a.href = buildHash(model.id, target.unit); bar.append(a); }
    const print = el('button', 'btn btn-primary', target.kind === 'cab' ? 'Drukuj szafkę' : 'Drukuj'); print.type = 'button';
    print.addEventListener('click', () => window.print());
    bar.append(print);
    root.append(bar);

    const head = el('div', 'sheet-head');
    head.append(el('h1', undefined, `Arkusz wierceń · ${title}`), el('p', 'meta', `${model.name} · wymiary w mm · u/v od nazwanych krawędzi ściany · `
      + `${prefs.scale === '1:5' ? 'skala 1:5 (drukuj w 100 %)' : 'bez skali (dopasowane)'}${prefs.mirror ? ' · widok od drugiej strony' : ''}`));
    root.append(head);
    if (target.kind === 'cab' && unit) {
      const top = el('div', 'cab-top');
      const th = el('div', 'thumb-box');
      th.innerHTML = thumbSvg(model.parts.filter((p) => p.unit === unit), new Set(parts.map((p) => p.id)), unitFrontNormal(model, unit), 260,
        new Map(parts.map((p) => [p.id, partCode(p)])));
      top.append(th);
      const s = drillSummary(plan, unit, undefined, mergeParams(ov.params).jig.cup_from_edge);
      if (s) top.append(s);
      root.append(top);
    }
    if (!parts.length) { root.append(el('p', 'meta', 'Brak otworów.')); return; }

    const P = mergeParams(ov.params);
    for (const p of parts) {
      const sec = el('section', 'sheet-part');
      const faces = faceSheets(p, features).filter((f) => !kinds || f.holes.some((h) => kinds.has(h.f.kind)));
      // title block
      const tb = el('div', 'title-block');
      const thumb = el('div', 'thumb-box');
      thumb.innerHTML = thumbSvg(model.parts.filter((q) => q.unit === p.unit), new Set([p.id]), unitFrontNormal(model, p.unit), 120);
      const dl = el('dl');
      const rows: [string, string][] = [['Projekt', model.name], ['Szafka', unitName(model, p.unit)], ['Kod', partCode(p)], ['Płyta', p.name],
        ['Wymiar', partDims(p.shape)], ['Materiał', model.materials[p.material]?.label ?? p.material], ['Skala', prefs.scale === '1:5' ? '1:5' : '—'],
        ['Data', new Date().toISOString().slice(0, 10)]];
      for (const [k, v] of rows) dl.append(el('dt', undefined, k), el('dd', undefined, v));
      tb.append(dl, thumb);
      sec.append(tb);
      // jig note (SPEC 4.11) for doors
      const hinge = plan.hinges.find((h) => h.door.id === p.id);
      if (hinge) sec.append(el('p', 'jig-note', `Szablon: ${jigNote(hinge, P.jig.cup_from_edge)} Puszka ${String(hinge.cup_from_edge).replace('.', ',')} od krawędzi (B ${hinge.B}).`));
      if (!faces.length) sec.append(el('p', 'meta', 'Brak otworów dla wybranego filtra.'));
      // face tabs (screen); print shows every face on its own page
      const tabs = el('div', 'face-tabs no-print');
      const panes: HTMLElement[] = [];
      faces.forEach((f0, i) => {
        const f: FaceSheet = prefs.mirror ? mirrored(f0) : f0;
        const t = el('button', 'face-tab' + (i === 0 ? ' on' : ''), `${f.faceLabel} (${f.face})`); t.type = 'button';
        const pane = el('figure', 'sheet-face' + (i === 0 ? ' on' : ''));
        pane.append(el('figcaption', undefined, `Ściana: ${f.faceLabel} (${f.face}) – ${prefs.mirror ? 'widok od drugiej strony' : 'widok od strony wiercenia'} · ${partCode(p)}`));
        const draw = el('div', 'sheet-svg');
        const svg = (n: number | null) => {
          draw.innerHTML = faceSvg(f, { scale: prefs.scale, kinds, showDims: prefs.mode !== 'figma',
            measure: n ?? (prefs.mode === 'figma' ? 'all' : 'none') });   // built from escaped strings only
        };
        svg(null);
        // hover a hole (drawing or table): Figma-style lines from that hole to the 4 edges
        draw.addEventListener('mouseover', (e) => { const n = (e.target as Element).getAttribute?.('data-n'); if (n) svg(Number(n)); });
        draw.addEventListener('mouseleave', () => svg(null));
        pane.append(draw, holeTable(f.holes.filter((h) => !kinds || kinds.has(h.f.kind)), (n) => svg(n)));
        const items = f.holes.filter((h) => !kinds || kinds.has(h.f.kind)).map((h) => h.f.item);
        const notes = notesBox(items, session);
        if (notes) pane.append(notes);
        const ph = placeholderBox(f.holes.map((h) => h.f), session);
        if (ph) pane.append(ph);
        t.addEventListener('click', () => {
          tabs.querySelectorAll('.face-tab').forEach((x) => x.classList.toggle('on', x === t));
          panes.forEach((x) => x.classList.toggle('on', x === pane));
        });
        tabs.append(t); panes.push(pane);
      });
      if (faces.length > 1) sec.append(tabs);
      sec.append(...panes, partNoteBox(partCode(p), session));
      root.append(sec);
    }
  };
  const off = session.onChange(render);
  render();
  document.body.classList.add('printing-sheet');
  return { dispose: () => { off(); root.remove(); document.body.classList.remove('printing-sheet'); } };
}
