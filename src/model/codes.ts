import { z } from 'zod';
import { LAYERS, type LayerId, type Model, type Part } from './schema';
import { partDims } from '../ui/format';

// boards that get cut – only these get a short code for labelling
export const CUT_LAYERS: LayerId[] = ['carcass', 'back', 'front', 'drawers', 'fillers', 'cladding', 'worktop'];

// "kitchen" → "KIT", "éclair" → "ECL" (diacritics folded; ł handled explicitly)
export function projectPrefix(id: string): string {
  const ascii = id.replace(/ł/g, 'l').replace(/Ł/g, 'L').normalize('NFD').replace(/[^A-Za-z]/g, '');
  return ascii.slice(0, 3).toUpperCase() || 'P';
}

// stable number assignment; `next` never decreases, so numbers are never reused
export const CodeBookSchema = z.object({
  prefix: z.string().min(1),
  next: z.number().int().positive(),
  codes: z.record(z.object({ n: z.number().int().positive(), name: z.string() })),
});
export type CodeBook = z.infer<typeof CodeBookSchema>;
export const emptyCodeBook = (projectId: string): CodeBook => ({ prefix: projectPrefix(projectId), next: 1, codes: {} });

export function assignCodes(model: Model, input: CodeBook): { model: Model; book: CodeBook; changed: boolean } {
  const byId = new Map(model.parts.map((p) => [p.id, p]));
  const book: CodeBook = { prefix: input.prefix, next: input.next, codes: {} };

  // 1. entries whose id and name still match – in file order (byte-for-byte stable output)
  const pool = new Map<string, number[]>();     // name → free numbers (entries without a matching part)
  for (const [id, e] of Object.entries(input.codes)) {
    if (byId.get(id)?.name === e.name) book.codes[id] = e;
    else pool.set(e.name, [...(pool.get(e.name) ?? []), e.n].sort((a, b) => a - b));
  }
  // 2. a re-import renumbers ids – a part without an entry takes the number of a part with the same name
  for (const p of model.parts) {
    if (book.codes[p.id]) continue;
    const n = pool.get(p.name)?.shift();
    if (n !== undefined) book.codes[p.id] = { n, name: p.name };
  }

  // 3. new cut boards: cabinets in order of appearance, by layer within a cabinet, then model order
  const unitOrder = new Map<string, number>();
  model.parts.forEach((p) => { if (!unitOrder.has(p.unit)) unitOrder.set(p.unit, unitOrder.size); });
  const layerOrder = (l: LayerId) => LAYERS.findIndex((x) => x.id === l);
  const todo = model.parts
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => CUT_LAYERS.includes(p.layer) && !book.codes[p.id])
    .sort((a, b) => unitOrder.get(a.p.unit)! - unitOrder.get(b.p.unit)! || layerOrder(a.p.layer) - layerOrder(b.p.layer) || a.i - b.i);
  for (const { p } of todo) {
    book.codes[p.id] = { n: book.next, name: p.name };
    book.next += 1;
  }

  const changed = JSON.stringify(book) !== JSON.stringify(input);
  const parts = model.parts.map((p) => (book.codes[p.id] ? { ...p, meta: { ...p.meta, code: `${book.prefix}-${book.codes[p.id]!.n}` } } : p));
  return { model: { ...model, parts }, book, changed };
}

// codes stored in the model itself: meta.code on parts + model.codes (prefix, counter)
export function codeModel(model: Model): { model: Model; changed: boolean } {
  const prefix = model.codes?.prefix ?? projectPrefix(model.id);
  const codes: CodeBook['codes'] = {};
  let max = 0;
  for (const p of model.parts) {
    const m = typeof p.meta.code === 'string' ? p.meta.code.match(/-(\d+)$/) : null;
    if (m) { codes[p.id] = { n: Number(m[1]), name: p.name }; max = Math.max(max, Number(m[1])); }
  }
  // the counter never goes below the highest code (e.g. a hand-edited file)
  const r = assignCodes(model, { prefix, next: Math.max(model.codes?.next ?? 1, max + 1), codes });
  const out: Model = { ...r.model, codes: { prefix, next: r.book.next } };
  return { model: out, changed: JSON.stringify(out) !== JSON.stringify(model) };
}

const unitName = (model: Pick<Model, 'groups'>, unit: string) => model.groups.find((g) => g.id === unit)?.name ?? unit;

const DIMS = /\s\d+(?:[.,]\d+)?(?:x\d+(?:[.,]\d+)?)+/;

// part role: the name without the leading cabinet code and without dimensions ("B2 Door 396x700" → "Door")
export function partRole(model: Pick<Model, 'groups'>, part: Part): string {
  const un = unitName(model, part.unit);
  let name = part.name;
  for (const pre of [un, part.unit]) if (name.startsWith(pre + ' ')) { name = name.slice(pre.length + 1); break; }
  if (name === part.name) {
    const first = un.split(' ')[0];
    if (first && name.startsWith(first + ' ')) name = name.slice(first.length + 1);
  }
  return name.replace(DIMS, '').trim() || part.name;
}

export function shortLabel(model: Pick<Model, 'groups'>, part: Part): string {
  const code = typeof part.meta.code === 'string' ? part.meta.code : null;
  const dims = partDims(part.shape).replace(/ mm$/, '');
  return [code, unitName(model, part.unit), partRole(model, part), dims].filter((x) => x && x !== '—').join(' · ');
}

// exact code or id (case-insensitive), otherwise the first part whose name contains the text
export function findPart(model: Pick<Model, 'parts'>, q: string): Part | null {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  return model.parts.find((p) => String(p.meta.code ?? '').toLowerCase() === s || p.id.toLowerCase() === s)
    ?? model.parts.find((p) => p.name.toLowerCase().includes(s))
    ?? null;
}
