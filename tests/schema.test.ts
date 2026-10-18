import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { ModelSchema, LAYER_IDS } from '../src/model/schema';

const dirs = readdirSync('projects').filter((d) => existsSync(`projects/${d}/model.json`));

describe('model.json', () => {
  it('there are at least 6 projects', () => expect(dirs.length).toBeGreaterThanOrEqual(6));
  for (const d of dirs) {
    it(`${d} passes validation`, () => {
      const m = ModelSchema.parse(JSON.parse(readFileSync(`projects/${d}/model.json`, 'utf8')));
      expect(m.id).toBe(d);
      for (const p of m.parts) {
        expect(LAYER_IDS).toContain(p.layer);
        expect(m.materials[p.material]).toBeDefined();
      }
    });
  }
});
