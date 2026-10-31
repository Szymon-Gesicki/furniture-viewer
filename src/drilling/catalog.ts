// Hardware catalogue (docs/drilling/hardware-catalog.json, HARDWARE.md): items, status per hole, filter groups, notes
import raw from '../../docs/drilling/hardware-catalog.json';
import type { DrillFeature, DrillKindId } from './schema';

export type HoleStatus = 'verified' | 'standard' | 'placeholder';
export interface TemplateHole { name?: string; u: number | string; v: number | string; dia: number; depth: number; status: string }
export interface HardwareItem {
  id: string; label: string; group: string; articles?: string[];
  template: { part: string; face: string; origin: string; holes: TemplateHole[]; line?: { name: string; v: number }; params?: Record<string, unknown> };
  sources?: string[]; notes_pl?: string[];
}
export const CATALOG = raw as unknown as { items: HardwareItem[]; kind_to_item: Record<string, string> };
export const itemById = (id: string) => CATALOG.items.find((i) => i.id === id);

// placeholder-u / placeholder-height → placeholder
export const normStatus = (s: string): HoleStatus => (s.startsWith('placeholder') ? 'placeholder' : s === 'verified' ? 'verified' : 'standard');

// catalogue item and hole status of a feature (handles by hardware code, hinge holes by template hole name)
export function itemFor(kind: DrillKindId, hardware: string): string {
  if (kind === 'handle-hole') return hardware.includes('320') ? 'nomet-techno-320' : 'nomet-techno-128';
  if (kind === 'shelf-screw') return 'fixed-shelf';
  if (kind === 'runner-line') return 'blum-merivobox-runner-NL500';
  return CATALOG.kind_to_item[kind] ?? '';
}
export function statusFor(kind: DrillKindId, item: string, inset = false): HoleStatus {
  if (inset) return 'placeholder';                       // 71B3750: B and setback not verified
  if (kind === 'shelf-screw') return 'standard';          // design rule
  if (kind === 'runner-line') return 'verified';          // FA bottom 16 (configurator)
  const holes = itemById(item)?.template.holes ?? [];
  const named = kind === 'hinge-cup' ? holes.find((h) => h.name === 'cup') : kind === 'hinge-screw' ? holes.find((h) => h.name?.startsWith('screw')) : undefined;
  const st = (named ?? holes[0])?.status;
  return st ? normStatus(st) : 'standard';
}

// filter groups of the "Okucia" panel (PLAN section 5)
export const HW_GROUPS: { id: string; label: string; kinds: DrillKindId[] }[] = [
  { id: 'hinge', label: 'Zawiasy (puszki + wkręty)', kinds: ['hinge-cup', 'hinge-screw'] },
  { id: 'plate', label: 'Prowadniki (płytki 173L6100)', kinds: ['plate-screw'] },
  { id: 'drawer', label: 'Szuflady (prowadnice, INSERTA, stabilizacja)', kinds: ['runner-screw', 'runner-line', 'front-fixing', 'front-fixing-top', 'front-stabiliser'] },
  { id: 'tipon', label: 'TIP-ON', kinds: ['tipon-bore'] },
  { id: 'hanger', label: 'Zawieszki Camar 801', kinds: ['hanger-dowel'] },
  { id: 'handle', label: 'Uchwyty', kinds: ['handle-hole'] },
  { id: 'shelf', label: 'Podpórki półek', kinds: ['shelf-pin'] },
  { id: 'fixed', label: 'Półki stałe', kinds: ['shelf-screw'] },
];
export const groupOf = (kind: DrillKindId) => HW_GROUPS.find((g) => g.kinds.includes(kind))?.id ?? 'other';

// montage notes from the documentation (PLAN 5a, SPEC 4.7–4.12, HARDWARE.md); the catalogue's own notes_pl come first
const DOC_NOTES: Record<string, string[]> = {
  'blum-cliptop-71B3550': [
    'Ustaw ogranicznik głębokości wiertła Forstnera na 13 mm (SPEC 4.11).',
    'Otwory na wkręty obok puszki zaznacz przez zawias wiertłem centrującym Ø2,5 (HARDWARE.md 1).',
  ],
  'blum-plate-173L6100': ['Prowadnik 37/32: wkręty na linii 37 od przedniej krawędzi boku, 32 mm rozstawu (inset L6: 56,5).'],
  'blum-merivobox-runner-NL500': ['Postaw dolną krawędź prowadnicy na linii prowadnicy i wierć przez otwory prowadnicy – wysokość wkrętów wyznacza prowadnica.'],
  'blum-inserta-ZF4.10I2': ['INSERTA wciskane w otwory Ø10 (+0,2/−0,1) × 12.'],
  'blum-inserta-ZF4.50I2': ['Tylko szuflady E z relingiem: górny otwór 128 nad górnym otworem dolnego mocowania.'],
  'blum-tipon-956A1006': ['Wiercenie w PRZEDNIEJ krawędzi płyty, środek 7,5 od wewnętrznej powierzchni (szablon Blum 65.5010); wysokość dowolna ±300 mm.'],
  'camar-801': ['Zawieszka ma się stykać górą ze spodem wieńca górnego i tyłem z tylną krawędzią boku.'],
  'nomet-techno-320': ['Otwory przelotowe Ø5 od frontu, z podkładką z tyłu; wkręty M4 × 25.'],
  'nomet-techno-128': ['Otwory przelotowe Ø5 od frontu, z podkładką z tyłu; wkręty M4 × 25.'],
  'shelf-pin-5': ['Wiertło Ø5, głębokość 10 (SPEC 4.11).'],
  'fixed-shelf': ['Spax 4×50 od zewnątrz, Ø4 przelotowo + pogłębienie; w krawędzi półki pilot Ø2,5.'],
};
export function notesFor(item: string, user: Record<string, string> = {}): { text: string; own: boolean }[] {
  const base = [...(itemById(item)?.notes_pl ?? []), ...(DOC_NOTES[item] ?? [])].map((text) => ({ text, own: false }));
  const mine = user[item]?.trim();
  return mine ? [...base, ...mine.split('\n').filter(Boolean).map((text) => ({ text, own: true }))] : base;
}
export const itemLabel = (item: string) => itemById(item)?.label ?? (item === 'fixed-shelf' ? 'Fixed shelf (Spax 4×50)' : item);
export const featureItemLabel = (f: Pick<DrillFeature, 'item'>) => itemLabel(f.item);

// SPEC 4.11: Wolfcraft 4656000 template – spacer under the stop so the cup lands at B + 17.5
export function jigNote(h: { inset: boolean; cup_from_edge: number; hinges_from_door_left?: number[] }, jigCup: number): string {
  if (h.inset) return 'Drzwi wpuszczane – nie używaj szablonu, zaznacz ręcznie.';
  const sp = Math.round((h.cup_from_edge - jigCup) * 10) / 10;
  if (sp === 0) return 'Szablon Wolfcraft bez podkładki.';
  if (sp > 0) return `Podłóż ${String(sp).replace('.', ',')} mm pod ogranicznik szablonu Wolfcraft.`;
  return `Puszka bliżej krawędzi niż ogranicznik szablonu (${String(sp).replace('.', ',')} mm) – zaznacz ręcznie.`;
}
export const WORKSHOP_HINTS: Record<string, string> = {
  'blum-cliptop-71B3550': 'Forstner Ø35, ogranicznik głębokości 13 mm; wkręty: zaznacz przez zawias wiertłem Ø2,5.',
  'shelf-pin-5': 'Wiertło Ø5, głębokość 10.',
};
