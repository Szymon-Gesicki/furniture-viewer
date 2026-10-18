import type { LayerId } from '../model/schema';
import { defaultVisibility, type Visibility } from '../viewer/layers';

export type Walls = 'visible' | 'xray' | 'hidden';
export interface ViewState { visibility: Visibility; explode: number; walls: Walls }

const key = (id: string) => `fv:view:${id}`;

// {} when there is no data or on any error (private mode, blocked site data, broken JSON)
export function loadState(id: string): Partial<ViewState> {
  try {
    const raw = localStorage.getItem(key(id));
    if (!raw) return {};
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function saveState(id: string, s: ViewState): void {
  try {
    localStorage.setItem(key(id), JSON.stringify(s));
  } catch {
    // ignore silently
  }
}

const WALLS: Walls[] = ['visible', 'xray', 'hidden'];

// saved state + default layers; unknown layers and invalid values are dropped
export function restoreState(saved: Partial<ViewState>, present: LayerId[]): ViewState {
  const visibility = defaultVisibility(present);
  const sv = saved.visibility && typeof saved.visibility === 'object' ? saved.visibility : {};
  for (const l of present) if (typeof sv[l] === 'boolean') visibility[l] = sv[l];
  // x-ray by default: in closed rooms (bathroom) solid walls hide the furniture
  const walls = WALLS.includes(saved.walls as Walls) ? saved.walls! : 'xray';
  if (present.includes('room')) visibility.room = walls !== 'hidden';
  const e = Number(saved.explode);
  return { visibility, walls, explode: Number.isFinite(e) ? Math.min(100, Math.max(0, e)) : 0 };
}
