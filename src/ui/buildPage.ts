// Assembly mode ("Tryb składania", PLAN 5b): step cards for the phone next to the board
import type { Model } from '../model/schema';
import { unitFrontNormal } from '../drilling/plan';
import { buildSteps, type Step } from '../drilling/steps';
import { faceSheets, faceSvg } from '../drilling/sheet';
import { itemLabel, jigNote, WORKSHOP_HINTS } from '../drilling/catalog';
import { fmt } from '../drilling/dims';
import { mergeParams } from '../drilling/params';
import { thumbSvg } from '../drilling/thumb';
import { unitName } from '../viewer/focus';
import { drillHash, projectHash } from './route';
import type { DrillSession } from './drillSession';
import { el, notesBox, placeholderBox, statusBadge } from './drillBlocks';

const posKey = (id: string, unit: string) => `fv:build:${id}:${unit}`;
const loadPos = (k: string) => { try { return Number(localStorage.getItem(k) ?? 0) || 0; } catch { return 0; } };
const savePos = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* optional */ } };

type WakeLock = { release(): Promise<void> };
type WakeNav = Navigator & { wakeLock?: { request(t: 'screen'): Promise<WakeLock> } };

export function buildPage(root0: HTMLElement, model: Model, session: DrillSession, unit: string): { dispose(): void } {
  const root = el('div', 'build');
  root0.append(root);
  const pk = posKey(model.id, unit);
  let i = loadPos(pk);
  let steps: Step[] = [];

  // screen stays on while working (Wake Lock API where available)
  let lock: WakeLock | null = null;
  const wake = () => { (navigator as WakeNav).wakeLock?.request('screen').then((l) => { lock = l; }, () => {}); };
  const onVis = () => { if (document.visibilityState === 'visible') wake(); };
  wake();
  document.addEventListener('visibilitychange', onVis);

  const go = (k: number) => { i = Math.max(0, Math.min(steps.length - 1, k)); savePos(pk, i); render(); window.scrollTo(0, 0); };

  function render() {
    steps = buildSteps(model, session.plan, unit);
    i = Math.max(0, Math.min(i, steps.length - 1));
    const done = session.overrides.done;
    const nDone = steps.filter((s) => done[s.id]).length;
    root.replaceChildren();

    const head = el('header', 'build-head');
    const back = el('a', 'back', '← Viewer'); back.href = projectHash(model.id, unit);
    const sheet = el('a', 'btn', 'Arkusz szafki'); sheet.href = drillHash(model.id, { kind: 'cab', unit });
    head.append(back, el('h1', undefined, `Składanie · ${unitName(model, unit)}`), sheet);
    const prog = el('div', 'progress');
    const bar = el('div', 'progress-bar'); bar.style.width = `${steps.length ? (100 * nDone) / steps.length : 0}%`;
    prog.append(bar);
    head.append(prog, el('p', 'meta', `${nDone} / ${steps.length} kroków zrobione${session.syncError ? ' · nie zapisano w repo: ' + session.syncError : session.enabled ? '' : ' · postęp tylko na tym urządzeniu'}`));
    root.append(head);
    if (!steps.length) { root.append(el('p', 'meta', 'Ta szafka nie ma otworów.')); return; }

    // step list (jump to any step)
    const list = el('details', 'step-list');
    list.append(el('summary', undefined, 'Wszystkie kroki'));
    const ol = el('ol');
    steps.forEach((s, k) => {
      const li = el('li', (done[s.id] ? 'done' : '') + (k === i ? ' cur' : ''));
      const b = el('button', 'btn-link inline', `${s.code} · ${itemLabel(s.item)} · ${s.faceLabel}`); b.type = 'button';
      b.addEventListener('click', () => go(k));
      li.append(b); ol.append(li);
    });
    list.append(ol);
    root.append(list);

    const s = steps[i]!;
    const card = el('article', 'step-card' + (done[s.id] ? ' is-done' : ''));
    card.append(el('div', 'step-no', `Krok ${i + 1} z ${steps.length}`));
    const title = el('h2', undefined, `${s.code} · ${s.part.name}`);
    card.append(title, el('p', 'step-face', `Ściana: ${s.faceLabel} (${s.face}) · ${itemLabel(s.item)}`));
    const thumb = el('div', 'thumb-box');
    thumb.innerHTML = thumbSvg(model.parts.filter((p) => p.unit === s.part.unit), new Set([s.part.id]), unitFrontNormal(model, s.part.unit), 180);
    card.append(thumb);

    // the board drawing with only this hardware's holes, Figma-style lines to the 4 edges
    const kinds = new Set(s.features.map((f) => f.kind));
    const face = faceSheets(s.part, session.plan.features.filter((f) => !f.optional)).find((f) => f.face === s.face);
    if (face) {
      const d = el('div', 'sheet-svg step-svg');
      d.innerHTML = faceSvg(face, { scale: 'fit', kinds, measure: 'all', showDims: false, box: { w: 150, h: 110 }, textScale: 2.6 });
      card.append(d);
    }
    // drill chips + tool hints (SPEC 4.11)
    const chips = el('div', 'chips');
    const sizes = new Map<string, number>();
    for (const f of s.features) if (f.kind !== 'runner-line') sizes.set(`Ø${fmt(f.dia)} × ${fmt(f.depth)}`, (sizes.get(`Ø${fmt(f.dia)} × ${fmt(f.depth)}`) ?? 0) + 1);
    for (const [t, c] of sizes) chips.append(el('span', 'chip big', `${c} × ${t}`));
    const st = [...new Set(s.features.map((f) => f.status))];
    for (const x of st) chips.append(statusBadge(x));
    card.append(chips);
    const hints: string[] = [];
    if (WORKSHOP_HINTS[s.item]) hints.push(WORKSHOP_HINTS[s.item]!);
    const hinge = session.plan.hinges.find((h) => h.door.id === s.part.id);
    if (hinge && s.item === 'blum-cliptop-71B3550') hints.push(jigNote(hinge, mergeParams(session.overrides.params).jig.cup_from_edge));
    for (const h of hints) card.append(el('p', 'tool-hint', h));
    // positions in words (u/v from the reference edges)
    const ul = el('ul', 'step-holes');
    for (const f of s.features) {
      if (f.kind === 'runner-line') { ul.append(el('li', undefined, `linia prowadnicy: ${fmt(f.local.v)} od ${f.local.v_from}`)); continue; }
      ul.append(el('li', f.status === 'placeholder' ? 'ph' : undefined, `${fmt(f.local.u)} od ${f.local.u_from} · ${fmt(f.local.runner_line_v ?? f.local.v)} od ${f.kind === 'runner-screw' ? 'linii prowadnicy (wkręt przez otwór prowadnicy)' : f.local.v_from}`));
    }
    card.append(ul);
    const ph = placeholderBox(s.features, session);
    if (ph) card.append(ph);
    const notes = notesBox([s.item], session);
    if (notes) card.append(notes);

    const doneLab = el('label', 'done-box');
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!done[s.id];
    cb.addEventListener('change', () => { void session.save({ kind: 'done', value: { [s.id]: cb.checked } }); if (cb.checked && i < steps.length - 1) go(i + 1); });
    doneLab.append(cb, el('span', undefined, 'Zrobione'));
    card.append(doneLab);
    root.append(card);

    const nav = el('nav', 'step-nav');
    const prev = el('button', 'btn big', '← Wstecz'); prev.type = 'button'; prev.disabled = i === 0;
    const next = el('button', 'btn btn-primary big', 'Dalej →'); next.type = 'button'; next.disabled = i === steps.length - 1;
    prev.addEventListener('click', () => go(i - 1));
    next.addEventListener('click', () => go(i + 1));
    nav.append(prev, next);
    root.append(nav);
  }

  // swipe left/right between steps
  let sx = 0, sy = 0;
  const onStart = (e: TouchEvent) => { sx = e.touches[0]!.clientX; sy = e.touches[0]!.clientY; };
  const onEnd = (e: TouchEvent) => {
    const dx = e.changedTouches[0]!.clientX - sx, dy = e.changedTouches[0]!.clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) go(i + (dx < 0 ? 1 : -1));
  };
  root.addEventListener('touchstart', onStart, { passive: true });
  root.addEventListener('touchend', onEnd);
  const off = session.onChange(render);
  render();
  return {
    dispose: () => {
      off(); document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => {});
      root.remove();
    },
  };
}
