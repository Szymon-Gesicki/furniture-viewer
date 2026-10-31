import type { DrillFeature, DrillPlan, HingeRecord } from '../drilling/schema';
import { kindLabel } from '../drilling/sheet';

const n = (v: number) => String(Math.round(v * 10) / 10);
export const holeSize = (f: DrillFeature) =>
  f.kind === 'runner-line' ? 'line' : `Ø${n(f.dia)} × ${n(f.depth)}`;
export const uvText = (f: DrillFeature) =>
  f.kind === 'runner-line' ? `v ${n(f.local.v)} from ${f.local.v_from}`
    : `u ${n(f.local.u)} from ${f.local.u_from} · v ${n(f.local.v)} from ${f.local.v_from}`;

// tooltip / hole list text: kind, size, hardware, position, note
export function featureLines(f: DrillFeature): string[] {
  const out = [`${kindLabel(f.kind)} · ${holeSize(f)}`, f.hardware, uvText(f), `face: ${f.local.face}`];
  if (f.local.runner_line_v !== undefined && f.kind === 'runner-screw') out.push(`runner line v ${n(f.local.runner_line_v)}`);
  if (f.note) out.push(f.note);
  return out;
}

export function hingeSummary(h: HingeRecord): string {
  const zs = h.hinges_from_door_bottom ?? h.hinges_from_door_left ?? [];
  const where = h.hinges_from_door_left ? 'from the left edge' : 'from the door bottom';
  return `${h.hinge_side} · ${h.hardware} · overlay ${n(h.overlay)} → B ${n(h.B)} · cups ${zs.map(n).join(', ')} ${where}`;
}

export const featuresOfUnit = (plan: DrillPlan, unit: string, partUnit: (id: string) => string | undefined) =>
  plan.features.filter((f) => f.unit === unit || partUnit(f.part.id) === unit);
