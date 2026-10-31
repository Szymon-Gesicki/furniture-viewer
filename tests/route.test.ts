import { it, expect } from 'vitest';
import { drillHash, parseRoute, projectHash } from '../src/ui/route';

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
it('drilling sheets: part code and cabinet', () => {
  expect(parseRoute('#/p/kitchen/drill/KIT-17')).toEqual({ kind: 'drill', id: 'kitchen', target: { kind: 'part', code: 'KIT-17' } });
  expect(parseRoute('#/p/kitchen/drill/cab/g7')).toEqual({ kind: 'drill', id: 'kitchen', target: { kind: 'cab', unit: 'g7' } });
  for (const t of [{ kind: 'cab' as const, unit: 'RTV K1' }, { kind: 'part' as const, code: 'p0012' }])
    expect(parseRoute(drillHash('rtv', t))).toEqual({ kind: 'drill', id: 'rtv', target: t });
});
it('assembly mode route', async () => {
  const { buildHash } = await import('../src/ui/route');
  expect(parseRoute(buildHash('kitchen', 'RTV K1'))).toEqual({ kind: 'build', id: 'kitchen', unit: 'RTV K1' });
});
