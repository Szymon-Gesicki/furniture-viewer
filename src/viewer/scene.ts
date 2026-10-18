import {
  Box3, GridHelper, Group, HemisphereLight, DirectionalLight, Material, Mesh, LineSegments,
  Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderer, Color,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { applyControlScheme, middleAction } from './controls';

export interface SceneCtx {
  renderer: WebGLRenderer; scene: Scene; camera: PerspectiveCamera; controls: OrbitControls;
  root: Group;                                   // rotation.x = −π/2: Z-up (SketchUp) → Y-up (three)
  onFrame(cb: (dtMs: number) => void): void;     // called every frame (e.g. slider animation)
  fit(objects: Object3D[]): void;                // fit the camera to the objects
  view(kind: 'iso' | 'front' | 'top'): void;
  setFloor(z: number): void;                     // floor grid height (model Z)
  onResize(cb: (w: number, h: number) => void): void;   // called immediately and on every canvas resize (CSS px)
  dispose(): void;
}

export function createScene(el: HTMLElement): SceneCtx {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(new Color('#f3f1ed'));
  el.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 10, 100000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  applyControlScheme(controls);
  const canvas = renderer.domElement;
  // before OrbitControls (capture): middle-button action depends on Shift; no middle-click autoscroll
  const onMiddleDown = (e: PointerEvent) => {
    if (e.button !== 1) return;
    e.preventDefault();
    controls.mouseButtons.MIDDLE = middleAction(e.shiftKey || e.ctrlKey || e.metaKey);
  };
  const onMouseDown = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };
  canvas.addEventListener('pointerdown', onMiddleDown, { capture: true });
  canvas.addEventListener('mousedown', onMouseDown);

  scene.add(new HemisphereLight(0xffffff, 0x8a8070, 1.0));
  const sun = new DirectionalLight(0xffffff, 1.2);
  sun.position.set(3000, 6000, 4000);
  scene.add(sun);

  const grid = new GridHelper(20000, 200, 0xc9c3b8, 0xe2ddd4);
  scene.add(grid);

  const root = new Group();
  root.rotation.x = -Math.PI / 2;
  scene.add(root);

  // last fitted box (centre and size) – used by the views
  const c = new Vector3();
  let r = 3000;

  // on a narrow screen (portrait phone) the camera moves back so the furniture fits horizontally
  const place = (dir: Vector3, dist: number) => {
    camera.position.copy(c).addScaledVector(dir, dist / Math.min(1, camera.aspect));
    controls.target.copy(c);
    camera.near = Math.max(1, r / 100);
    camera.far = r * 100;
    camera.updateProjectionMatrix();
    controls.update();
  };

  const fit = (objects: Object3D[]) => {
    root.updateMatrixWorld(true);
    const box = new Box3();
    for (const o of objects) box.expandByObject(o);
    if (box.isEmpty()) return;
    box.getCenter(c);
    const size = box.getSize(new Vector3());
    r = Math.max(size.x, size.y, size.z, 1);
    place(new Vector3(1, 0.8, 1).normalize(), 1.6 * r);
  };

  const view = (kind: 'iso' | 'front' | 'top') => {
    if (kind === 'iso') place(new Vector3(1, 0.8, 1).normalize(), 1.6 * r);
    else if (kind === 'front') place(new Vector3(0, 0, 1), 1.8 * r);
    else place(new Vector3(0, 1, 0.001).normalize(), 1.8 * r);
  };

  const frameCbs: ((dt: number) => void)[] = [];
  let last = performance.now();
  let raf = 0;
  const loop = (t: number) => {
    raf = requestAnimationFrame(loop);
    const dt = t - last; last = t;
    controls.update();
    for (const cb of frameCbs) cb(dt);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  const resizeCbs: ((w: number, h: number) => void)[] = [];
  const size = () => [el.clientWidth || 1, el.clientHeight || 1] as const;
  const resize = () => {
    const [w, h] = size();
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    for (const cb of resizeCbs) cb(w, h);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  return {
    renderer, scene, camera, controls, root,
    onFrame: (cb) => { frameCbs.push(cb); },
    fit, view,
    setFloor: (z) => { grid.position.y = z; },
    onResize: (cb) => { resizeCbs.push(cb); cb(...size()); },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onMiddleDown, { capture: true });
      canvas.removeEventListener('mousedown', onMouseDown);
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof Mesh || o instanceof LineSegments) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m: Material) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
