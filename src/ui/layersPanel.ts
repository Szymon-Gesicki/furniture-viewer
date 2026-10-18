import { LAYERS, type LayerId } from '../model/schema';
import { solo, toggle, type Visibility } from '../viewer/layers';

export interface LayersPanelProps {
  present: LayerId[]; counts: Record<string, number>;
  visibility: Visibility; onChange(v: Visibility): void;
}

// layer list without `room` – walls have their own switch
export function layersPanel(el: HTMLElement, props: LayersPanelProps): { update(v: Visibility): void } {
  let vis = props.visibility;
  const rows = LAYERS.filter((l) => l.id !== 'room' && props.present.includes(l.id));
  const set = (v: Visibility) => { vis = v; props.onChange(v); };

  el.replaceChildren();
  const list = document.createElement('ul');
  list.className = 'layers';
  const boxes = new Map<LayerId, HTMLInputElement>();
  for (const l of rows) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.addEventListener('change', () => set(toggle(vis, l.id)));
    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = l.label;
    const count = document.createElement('span');
    count.className = 'layer-count';
    count.textContent = String(props.counts[l.id] ?? 0);
    label.append(cb, name, count);
    const only = document.createElement('button');
    only.type = 'button';
    only.className = 'btn-small';
    only.textContent = 'only';
    only.title = `Show only: ${l.label}`;
    // solo does not touch the walls
    only.addEventListener('click', () => set({ ...solo(vis, l.id), room: vis.room }));
    li.append(label, only);
    list.append(li);
    boxes.set(l.id, cb);
  }
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'btn-link';
  all.textContent = 'Show all';
  all.addEventListener('click', () =>
    set(Object.fromEntries(Object.keys(vis).map((k) => [k, k === 'room' ? vis.room : true])) as Visibility));
  el.append(list, all);

  const update = (v: Visibility) => {
    vis = v;
    for (const [id, cb] of boxes) cb.checked = !!v[id];
  };
  update(vis);
  return { update };
}
