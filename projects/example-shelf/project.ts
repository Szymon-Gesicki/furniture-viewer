import { project, cabinet, shelf, front, handle, legs } from '../../src/dsl';
export default project({
  id: 'example-shelf', name: 'Example cabinet 800', description: 'Example furniture written in the DSL',
  build: (p) => {
    const c = cabinet(p, { id: 'r1', name: 'R1', w: 800, d: 300, h: 1200, at: [0, 0, 100], layout: 'sides-outside' });
    shelf(c, { z: 400 }); shelf(c, { z: 800 });
    front(c, { name: 'Door L', x0: 2, x1: 398, z0: 2, z1: 1198 });
    front(c, { name: 'Door R', x0: 402, x1: 798, z0: 2, z1: 1198 });
    handle(c, { x: 370, z: 600, type: '32' }); handle(c, { x: 430, z: 600, type: '32' });
    legs(c);
  },
});
