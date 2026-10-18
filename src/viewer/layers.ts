import type { LayerId } from '../model/schema';
export type Visibility = Partial<Record<LayerId, boolean>>;
const HIDDEN_BY_DEFAULT: LayerId[] = ['assembly'];
export const defaultVisibility = (present: LayerId[]): Visibility =>
  Object.fromEntries(present.map((l) => [l, !HIDDEN_BY_DEFAULT.includes(l)]));
export const toggle = (v: Visibility, l: LayerId): Visibility => ({ ...v, [l]: !v[l] });
export const solo = (v: Visibility, l: LayerId): Visibility =>
  Object.fromEntries(Object.keys(v).map((k) => [k, k === l])) as Visibility;
