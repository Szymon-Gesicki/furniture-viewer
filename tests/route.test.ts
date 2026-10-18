import { it, expect } from 'vitest';
import { parseRoute, projectHash } from '../src/ui/route';

it('library', () => {
  for (const h of ['', '#', '#/', '#/cos', '#/p/', '#/p/a b']) expect(parseRoute(h)).toEqual({ kind: 'library' });
});
it('project and cabinet', () => {
  expect(parseRoute('#/p/kitchen')).toEqual({ kind: 'project', id: 'kitchen', unit: null });
  expect(parseRoute('#/p/kitchen/c/g7')).toEqual({ kind: 'project', id: 'kitchen', unit: 'g7' });
});
it('cabinet codes with spaces and non-ASCII characters round trip', () => {
  for (const u of ['RTV K1', 'Cabinet é/2', 'g7']) {
    expect(parseRoute(projectHash('rtv', u))).toEqual({ kind: 'project', id: 'rtv', unit: u });
  }
  expect(projectHash('rtv')).toBe('#/p/rtv');
  expect(projectHash('rtv', null)).toBe('#/p/rtv');
});
it('broken encoding → project without a cabinet', () => {
  expect(parseRoute('#/p/kitchen/c/%E0%A4')).toEqual({ kind: 'project', id: 'kitchen', unit: null });
});
