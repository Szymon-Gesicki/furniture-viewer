import { LAYERS, type LayerId, type Model, type Part } from '../model/schema';
import { partDims, rawEdgesLabel } from './format';
import { shortLabel } from '../model/codes';

export interface LayerEdit { enabled: boolean; hint?: string; onChange(layer: LayerId): Promise<void> }

const layerLabel = (id: string) => LAYERS.find((l) => l.id === id)?.label ?? id;

export function infoPanel(el: HTMLElement, model: Model, onClose: () => void, onUnit: (unit: string) => void): { show(part: Part | null, edit?: LayerEdit): void } {
  el.className = 'info';
  el.hidden = true;
  el.setAttribute('aria-live', 'polite');
  let shown: Part | null = null;

  const layerControl = (part: Part, edit: LayerEdit): HTMLElement => {
    const wrap = document.createElement('div');
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', 'Layer');
    for (const l of LAYERS) {
      const o = document.createElement('option');
      o.value = l.id; o.textContent = l.label;
      sel.append(o);
    }
    sel.value = part.layer;
    sel.disabled = !edit.enabled;
    wrap.append(sel);
    const orig = part.meta.originalLayer;
    if (typeof orig === 'string') {
      const n = document.createElement('span');
      n.className = 'note';
      n.textContent = `changed, originally: ${layerLabel(orig)}`;
      wrap.append(n);
    }
    if (!edit.enabled) {
      const hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = edit.hint ?? 'Changing layers is disabled';
      wrap.append(hint);
    }
    const err = document.createElement('span');
    err.className = 'err';
    sel.addEventListener('change', () => {
      const prev = part.layer;
      sel.disabled = true;
      err.remove();
      edit.onChange(sel.value as LayerId)
        .then(() => { if (shown === part) show(part, edit); })   // the part may have been hidden or deselected while saving
        .catch((e: unknown) => {
          sel.value = prev;
          sel.disabled = false;
          err.textContent = e instanceof Error && e.message ? e.message : 'Could not save the change';
          wrap.append(err);
        });
    });
    return wrap;
  };

  const show = (part: Part | null, edit?: LayerEdit) => {
    shown = part;
    el.replaceChildren();
    el.hidden = !part;
    if (!part) return;
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'close'; close.textContent = '×';
    close.setAttribute('aria-label', 'Close');
    close.addEventListener('click', onClose);
    const title = document.createElement('h2');
    title.textContent = part.name;
    const head: HTMLElement[] = [];
    if (typeof part.meta.code === 'string') {
      const code = document.createElement('div');
      code.className = 'code-big';
      code.textContent = part.meta.code;
      head.push(code);
    }
    // id with a copy button (e.g. for an order note)
    const idBox = document.createElement('span');
    idBox.className = 'id-box';
    const copy = document.createElement('button');
    copy.type = 'button'; copy.className = 'btn-small'; copy.textContent = 'copy';
    copy.addEventListener('click', () => {
      navigator.clipboard?.writeText(part.id).then(() => { copy.textContent = 'copied'; }, () => {});
    });
    idBox.append(part.id, ' ', copy);
    // in the kitchen `unit` is often a group id such as "g7"; clicking selects the whole cabinet again
    const unitBtn = document.createElement('button');
    unitBtn.type = 'button'; unitBtn.className = 'btn-link inline';
    unitBtn.textContent = `${model.groups.find((g) => g.id === part.unit)?.name ?? part.unit} ←`;
    unitBtn.title = 'Select the whole cabinet';
    unitBtn.addEventListener('click', () => onUnit(part.unit));
    const rows: [string, string | HTMLElement][] = [
      ['ID', idBox],
      ['Label', shortLabel(model, part)],
      ['Layer', edit ? layerControl(part, edit) : layerLabel(part.layer)],
      ['Cabinet', unitBtn],
      ['Material', model.materials[part.material]?.label ?? part.material],
      ['Dimensions', partDims(part.shape)],
    ];
    if (part.shape.type !== 'mesh') rows.push(['Edge banding', rawEdgesLabel(part.edges.raw)]);
    if (typeof part.meta.tag === 'string' && part.meta.tag) rows.push(['Tag', part.meta.tag]);
    const dl = document.createElement('dl');
    for (const [k, v] of rows) {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.append(v);
      dl.append(dt, dd);
    }
    el.append(close, ...head, title, dl);
  };
  return { show };
}
