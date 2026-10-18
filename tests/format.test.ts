import { it, expect } from 'vitest';
import { partDims, rawEdgesLabel } from '../src/ui/format';
it('dimensions sorted L × W × thickness', () => {
  expect(partDims({ type: 'box', min: [0, 0, 0], max: [18, 510, 702] })).toBe('702 × 510 × 18 mm');
});
it('label for edges without banding', () => {
  expect(rawEdgesLabel([])).toBe('all visible edges banded');
  expect(rawEdgesLabel(['z-', 'y+'])).toBe('no banding: bottom, back');
});
import { partsCount } from '../src/ui/format';
it('part count label', () => {
  expect([0, 1, 2, 251].map(partsCount)).toEqual(['0 parts', '1 part', '2 parts', '251 parts']);
});
