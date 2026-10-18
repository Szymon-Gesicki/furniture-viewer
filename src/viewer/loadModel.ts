import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { LayerId, Model, Part } from '../model/schema';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { shapeToGeometry } from './geometry';
import { DEFAULT_EDGE_STYLE, EdgeMaterials, edgeLines, type EdgeStyle } from './edges';
import type { Item, V3 } from './explode';

export interface Built {
  group: Group;                                  // add to ctx.root
  partsById: Map<string, Mesh>;                  // mesh.userData.part = Part
  items: Item[];                                 // for explodeOffsets (centre from the geometry bbox)
  wallMaterials: MeshStandardMaterial[];         // materials of the room layer (for x-ray)
  minZ: number;                                  // lowest point of furniture and floor – for setFloor
  edges: EdgeMaterials;                          // edge materials (Appearance sliders)
  setPartLayer(id: string, layer: LayerId): void; // manual layer change without rebuilding the scene
}

const GLOSSY = new Set(['handles', 'legs']);

export function buildModel(model: Model, edgeStyle: EdgeStyle = DEFAULT_EDGE_STYLE): Built {
  const group = new Group();
  const partsById = new Map<string, Mesh>();
  const items: Item[] = [];
  const mats = new Map<string, MeshStandardMaterial>();
  const wallMaterials: MeshStandardMaterial[] = [];
  const edges = new EdgeMaterials(edgeStyle);
  const bounds = new Box3();

  const colorOf = (material: string) => model.materials[material]?.color ?? '#999999';
  // layer in the key: wall x-ray never touches furniture materials
  const materialFor = (layer: LayerId, material: string) => {
    const key = `${layer}|${material}`;
    let mat = mats.get(key);
    if (!mat) {
      mat = new MeshStandardMaterial({ color: colorOf(material), roughness: GLOSSY.has(layer) ? 0.4 : 0.85, metalness: 0 });
      mats.set(key, mat);
      if (layer === 'room') wallMaterials.push(mat);
    }
    return mat;
  };

  for (const part of model.parts) {
    const geom = shapeToGeometry(part.shape);
    geom.computeBoundingBox();
    const mesh = new Mesh(geom, materialFor(part.layer, part.material));
    mesh.userData.part = part;
    mesh.name = part.name;
    const lineMat = edges.get(`${part.layer}|${part.material}`, colorOf(part.material));
    mesh.add(edgeLines(geom, part.shape.type === 'mesh' ? 30 : 20, lineMat));
    group.add(mesh);
    partsById.set(part.id, mesh);

    const bb = geom.boundingBox!;
    bounds.union(bb);
    items.push({ id: part.id, unit: part.unit, layer: part.layer, center: bb.getCenter(new Vector3()).toArray() as V3 });
  }

  const setPartLayer = (id: string, layer: LayerId) => {
    const mesh = partsById.get(id);
    if (!mesh) return;
    const part = mesh.userData.part as Part;     // the same object as in model.parts
    part.layer = layer;
    mesh.material = materialFor(layer, part.material);
    (mesh.children[0] as LineSegments2).material = edges.get(`${layer}|${part.material}`, colorOf(part.material));
    const item = items.find((i) => i.id === id);
    if (item) item.layer = layer;
  };

  return { group, partsById, items, wallMaterials, minZ: bounds.isEmpty() ? 0 : bounds.min.z, edges, setPartLayer };
}
