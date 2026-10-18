// tests/fixtures.ts – a small shared model (separate file: importing a *.test.ts file would duplicate its tests)
import { ModelSchema, type Model } from '../src/model/schema';

const box = { type: 'box' as const, min: [0, 0, 0] as [number, number, number], max: [1, 1, 1] as [number, number, number] };
export const testModel = (): Model => ModelSchema.parse({
  format: 'furniture-model', version: 1, id: 'a', name: 'A', materials: { m: { label: 'M', color: '#ffffff' } }, groups: [],
  parts: [
    { id: 'p1', name: 'Side', group: null, unit: 'k', layer: 'carcass', material: 'm', shape: box },
    { id: 'p2', name: 'Door', group: null, unit: 'k', layer: 'front', material: 'm', shape: box },
  ],
});
