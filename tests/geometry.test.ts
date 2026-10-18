import { it, expect } from 'vitest';
import { Box3 } from 'three';
import { shapeToGeometry } from '../src/viewer/geometry';

function bbox(g: ReturnType<typeof shapeToGeometry>) {
  g.computeBoundingBox(); const b = g.boundingBox as Box3;
  return [b.min.toArray().map(Math.round), b.max.toArray().map(Math.round)];
}
it('box', () => {
  expect(bbox(shapeToGeometry({ type: 'box', min: [0, 0, 100], max: [600, 18, 820] })))
    .toEqual([[0, 0, 100], [600, 18, 820]]);
});
it('extrude yz', () => {
  const g = shapeToGeometry({ type: 'extrude', plane: 'yz', from: 18, to: 36,
    outline: [[538, 100], [824, 100], [824, 820], [538, 820]] });
  expect(bbox(g)).toEqual([[18, 538, 100], [36, 824, 820]]);
});
it('extrude xz', () => {
  const g = shapeToGeometry({ type: 'extrude', plane: 'xz', from: 0, to: 122,
    outline: [[18, 1000], [432, 1000], [432, 1018], [18, 1018]] });
  expect(bbox(g)).toEqual([[18, 0, 1000], [432, 122, 1018]]);
});
it('mesh', () => {
  expect(bbox(shapeToGeometry({ type: 'mesh', positions: [0, 0, 0, 10, 0, 0, 0, 10, 5] })))
    .toEqual([[0, 0, 0], [10, 10, 5]]);
});
