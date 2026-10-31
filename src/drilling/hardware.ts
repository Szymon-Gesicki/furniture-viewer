import type { DrillFeature, DrillPlan } from './schema';

export interface HardwareRow { article: string; label: string; pcs: number }

const count = (fs: DrillFeature[], pred: (f: DrillFeature) => boolean) => fs.filter(pred).length;

// hardware totals from a plan (SPEC section 8); optional shelf-pin rows are not counted
export function hardwareCount(plan: Pick<DrillPlan, 'features' | 'drawers'>): HardwareRow[] {
  const fs = plan.features.filter((f) => !f.optional);
  const cups = fs.filter((f) => f.kind === 'hinge-cup');
  const rows: HardwareRow[] = [
    { article: '71B3550', label: 'Hinge 110°, overlay, BLUMOTION', pcs: count(cups, (f) => f.hardware === '71B3550') },
    { article: '71B7550', label: 'Hinge 155°, zero protrusion, BLUMOTION', pcs: count(cups, (f) => f.hardware === '71B7550') },
    { article: '71B3750', label: 'Hinge 110°, inset, BLUMOTION', pcs: count(cups, (f) => f.hardware === '71B3750') },
    { article: '173L6100', label: 'Cruciform mounting plate 0 mm', pcs: cups.length },
    { article: '609.1500', label: 'Screws 3.5×15 (hinges and plates)', pcs: count(fs, (f) => f.kind === 'hinge-screw' || f.kind === 'plate-screw') },
    { article: 'ZF4.10I2', label: 'INSERTA front fixing', pcs: count(fs, (f) => f.kind === 'front-fixing') / 2 },
    { article: 'ZF4.50I2', label: 'INSERTA upper fixing (gallery rail)', pcs: count(fs, (f) => f.kind === 'front-fixing-top') },
    { article: 'Z96.10E1', label: 'Front stabiliser', pcs: count(fs, (f) => f.kind === 'front-stabiliser') / 2 },
    { article: '450.5001B', label: 'MERIVOBOX runner (pair)', pcs: plan.drawers.length },
    { article: '4×15', label: 'Runner screws (chipboard)', pcs: count(fs, (f) => f.kind === 'runner-screw') },
    { article: 'Ø5 pin', label: 'Shelf pins', pcs: count(fs, (f) => f.kind === 'shelf-pin') },
    { article: 'Spax 4×50', label: 'Fixed shelf screws', pcs: count(fs, (f) => f.kind === 'shelf-screw') },
    { article: 'C-1149-320.P61', label: 'Nomet TECHNO 320', pcs: count(fs, (f) => f.kind === 'handle-hole' && f.hardware.includes('320')) / 2 },
    { article: 'C-1149-128.P61', label: 'Nomet TECHNO 128 (code to verify)', pcs: count(fs, (f) => f.kind === 'handle-hole' && f.hardware.includes('128')) / 2 },
    { article: 'M4×25', label: 'Handle screws', pcs: count(fs, (f) => f.kind === 'handle-hole') },
    { article: '956A1006', label: 'TIP-ON for BLUMOTION', pcs: count(fs, (f) => f.kind === 'tipon-bore') },
    { article: 'Camar 801', label: 'Wall-cabinet hanger (2 dowels each)', pcs: count(fs, (f) => f.kind === 'hanger-dowel') / 2 },
  ];
  return rows.filter((r) => r.pcs > 0);
}
