import {
  Box3, GridHelper, Group, HemisphereLight, DirectionalLight, Material, Mesh, LineSegments,
  Object3D, OrthographicCamera, PerspectiveCamera, Scene, Vector3, WebGLRenderer, Color,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { applyControlScheme, middleAction } from './controls';

// orthographic views relative to the cabinet front (PLAN 4.1); '3d' = the free perspective camera
export type ViewDir = '3d' | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export interface SceneCtx {
  renderer: WebGLRenderer; scene: Scene; readonly camera: PerspectiveCamera | OrthographicCamera; controls: OrbitControls;
  root: Group;                                   // rotation.x = −π/2: Z-up (SketchUp) → Y-up (three)
  onFrame(cb: (dtMs: number) => void): void;     // called every frame (e.g. slider animation)
  fit(objects: Object3D[]): void;                // fit the camera to the objects
  view(kind: 'iso' | 'front' | 'top'): void;
  // orthographic view along the front normal frontN (model coordinates), fitted to the objects; '3d' returns to perspective
  setView(kind: ViewDir, frontN: [number, number, number], objects: Object3D[]): void;
  readonly viewDir: ViewDir;
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
  const ortho = new OrthographicCamera(-1, 1, 1, -1, 1, 100000);
  let active: PerspectiveCamera | OrthographicCamera = camera;
  let viewDir: ViewDir = '3d';
  let halfH = 1000;                               // orthographic frustum half height (mm)
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

  // smooth camera move between orthographic views
  let tween: { from: Vector3; to: Vector3; upFrom: Vector3; upTo: Vector3; t: number } | null = null;
  let lastN: [number, number, number] = [0, -1, 0];
  const setView = (kind: ViewDir, n: [number, number, number], objects: Object3D[]) => {
    viewDir = kind; lastN = n;
    if (kind === '3d') {
      tween = null;
      active = camera; controls.object = camera; camera.up.set(0, 1, 0);
      fit(objects);
      return;
    }
    root.updateMatrixWorld(true);
    const box = new Box3();
    for (const o of objects) box.expandByObject(o);
    if (box.isEmpty()) return;
    box.getCenter(c);
    const size = box.getSize(new Vector3());
    r = Math.max(size.x, size.y, size.z, 1);
    // model (x, y, z) → three (x, z, −y)
    const fwd = new Vector3(n[0], n[2], -n[1]).normalize();
    const right = new Vector3().crossVectors(new Vector3(0, 1, 0), fwd).normalize();   // viewer's right in the front view
    const dirs: Record<Exclude<ViewDir, '3d'>, [Vector3, Vector3]> = {
      front: [fwd, new Vector3(0, 1, 0)], back: [fwd.clone().negate(), new Vector3(0, 1, 0)],
      left: [right.clone().negate(), new Vector3(0, 1, 0)], right: [right, new Vector3(0, 1, 0)],
      top: [new Vector3(0, 1, 0), fwd.clone().negate()], bottom: [new Vector3(0, -1, 0), fwd],
    };
    const [dir, up] = dirs[kind];
    // frustum fitted to the box seen along dir
    const sideV = new Vector3().crossVectors(up, dir).normalize();
    const ext = (axis: Vector3) => Math.abs(axis.x) * size.x + Math.abs(axis.y) * size.y + Math.abs(axis.z) * size.z;
    const aspect = camera.aspect;
    halfH = Math.max(ext(up) / 2, ext(sideV) / 2 / aspect) * 1.3;   // room for the top bar and the toolbar
    const was = active === ortho ? ortho.position.clone().sub(controls.target).normalize() : null;
    active = ortho; controls.object = ortho;
    ortho.zoom = 1;
    ortho.near = 1; ortho.far = r * 20;
    const dist = r * 4;
    controls.target.copy(c);
    if (was && was.angleTo(dir) > 1e-3 && was.angleTo(dir) < Math.PI - 1e-3) {
      tween = { from: was, to: dir.clone(), upFrom: ortho.up.clone(), upTo: up.clone(), t: 0 };
    } else {
      tween = null;
      ortho.up.copy(up);
      ortho.position.copy(c).addScaledVector(dir, dist);
    }
    applyOrtho();
    controls.update();
  };
  const applyOrtho = () => {
    ortho.top = halfH; ortho.bottom = -halfH;
    ortho.left = -halfH * camera.aspect; ortho.right = halfH * camera.aspect;
    ortho.updateProjectionMatrix();
  };

  const fit = (objects: Object3D[]) => {
    if (active === ortho) { setView(viewDir, lastN, objects); return; }
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
    if (active !== camera) { active = camera; controls.object = camera; viewDir = '3d'; }
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
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 300);
      const e = tween.t * tween.t * (3 - 2 * tween.t);
      const d = tween.from.clone().lerp(tween.to, e).normalize();
      ortho.up.copy(tween.upFrom.clone().lerp(tween.upTo, e).normalize());
      ortho.position.copy(controls.target).addScaledVector(d, r * 4);
      ortho.lookAt(controls.target);
      if (tween.t >= 1) tween = null;
    }
    controls.update();
    for (const cb of frameCbs) cb(dt);
    renderer.render(scene, active);
  };
  raf = requestAnimationFrame(loop);

  const resizeCbs: ((w: number, h: number) => void)[] = [];
  const size = () => [el.clientWidth || 1, el.clientHeight || 1] as const;
  const resize = () => {
    const [w, h] = size();
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyOrtho();
    for (const cb of resizeCbs) cb(w, h);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  return {
    renderer, scene, controls, root,
    get camera() { return active; },
    get viewDir() { return viewDir; },
    setView,
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
