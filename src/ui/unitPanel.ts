import type { UnitPartGroup, UnitSummary } from '../viewer/focus';
import { partsCount } from './format';

export interface UnitPanelOptions {
  onDetails(unit: string): void;                 // "Details" → cabinet mode
  onPart(id: string): void;                      // click on a row of the part list
  onClose(): void;
}

export function unitPanel(el: HTMLElement, opts: UnitPanelOptions): { show(s: UnitSummary | null, groups?: UnitPartGroup[], inFocus?: boolean): void } {
  el.className = 'info';
  el.hidden = true;
  el.setAttribute('aria-live', 'polite');

  const show = (s: UnitSummary | null, groups: UnitPartGroup[] = [], inFocus = false) => {
    el.replaceChildren();
    el.hidden = !s;
    if (!s) return;
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'close'; close.textContent = '×';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', opts.onClose);
    const title = document.createElement('h2');
    title.textContent = s.name;
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = partsCount(s.count);

    // part list: groups by layer, clicking a row selects the part
    const list = document.createElement('div');
    list.className = 'part-list';
    for (const g of groups) {
      const h = document.createElement('h3');
      h.textContent = `${g.label} (${g.parts.length})`;
      list.append(h);
      for (const p of g.parts) {
        const row = document.createElement('button');
        row.type = 'button'; row.className = 'part-row';
        const code = document.createElement('span');
        code.className = 'code'; code.textContent = p.code ?? '';
        const label = document.createElement('span');
        label.textContent = p.label;
        row.append(code, label);
        row.addEventListener('click', () => opts.onPart(p.id));
        list.append(row);
      }
    }
    el.append(close, title, meta, list);

    if (!inFocus) {
      const actions = document.createElement('div');
      actions.className = 'actions';
      const details = document.createElement('button');
      details.type = 'button'; details.className = 'btn btn-primary'; details.textContent = 'Details';
      details.addEventListener('click', () => opts.onDetails(s.unit));
      actions.append(details);
      el.append(actions);
    }
  };
  return { show };
}
