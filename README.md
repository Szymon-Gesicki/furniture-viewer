# Furniture viewer

A browser-based 3D viewer for board furniture – kitchens, wardrobes, bathroom units, cabinets – built from
SketchUp scripts or a small TypeScript DSL, without needing SketchUp to look at them.

- **Project library** with thumbnails.
- **Orbit, pan, zoom** like SketchUp (left = orbit, middle / Shift / right = pan, wheel = zoom to cursor).
- **Layers** (carcasses, backs, fronts, handles, drawers, fillers, worktop, legs, appliances…) and walls
  shown solid, as x-ray or hidden.
- **Exploded view** of the whole project or of a single cabinet, to see how it goes together.
- **Cabinet mode**: click a cabinet, open *Details*, and only that cabinet is shown with its own explode slider
  and a clickable part list.
- **Part info**: name, short code (e.g. `BAT-7`), dimensions L × W × thickness, material, edge banding.
- **Stable part codes** to write on the boards, and a search box to find a part by code, id or name.
- **GitHub as the database**: layer fixes and new projects are saved from the browser as commits.

Stack: Vite, TypeScript, three.js, zod, vitest. Ruby is only used to import SketchUp scripts.

## How it works – GitHub as the database

- The repository is the database: every project is `projects/<id>/model.json` (or `project.ts`), and every
  change made in the app is a commit, so there is full history and every change can be reverted.
- The site runs on GitHub Pages. Every push to `main` runs GitHub Actions: it imports new or changed `.rb`
  scripts, runs the tests, builds and deploys (about 1–2 minutes).
- With a token (library → *Settings*) the app reads models straight from the repository, so layer changes show
  up immediately, and *Add project* uploads a `.rb`, `model.json` or `project.ts`.

### First-time setup

1. Use a **public** repository (free GitHub Pages only serves public repositories) and push `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Actions → General → Workflow permissions: **Read and write**.
4. Token for the app: your account Settings → Developer settings → Personal access tokens →
   **Fine-grained** → Repository access: only this repository → Permissions: **Contents: Read and write**.
   Paste it in the app (library → *Settings*). It is stored only in that browser – never commit it.
   All `<user>.github.io` sites share one origin, so keep the token scoped to this single repository.

### Password login on other devices

Paste the token once (library → *Settings*), then in the same dialog set a **login password**. The app encrypts
the token with that password (PBKDF2-SHA256, 600 000 rounds → AES-256-GCM) and commits it as
`public/login.json`. After the next deploy every device shows **Log in** – enter the password and you can save
changes; *Log out on this device* forgets it again.

Only the encrypted token is published, so its safety depends on the password: any password is accepted,
but a longer one (e.g. 4–5 random words) is much harder to guess. When the token expires, paste a new one in *Settings* and save the password again.

## Running locally

Requires Node 20+.

```bash
npm i
npm run dev        # builds the models and starts Vite → http://localhost:5173
```

`npm run build` produces the static site in `dist/` (and type-checks).

## Adding furniture in code (DSL)

1. Copy `projects/example-shelf/` to `projects/<new-id>/`.
2. In `project.ts` change `id` (it must match the folder name), `name`, `description` and `build`.
3. `npm run dev` – the furniture appears in the library.

```ts
import { project, cabinet, shelf, front, handle, legs } from '../../src/dsl';
export default project({
  id: 'example-shelf', name: 'Example cabinet 800', description: 'Example furniture written in the DSL',
  build: (p) => {
    const c = cabinet(p, { id: 'r1', name: 'R1', w: 800, d: 300, h: 1200, at: [0, 0, 100], layout: 'sides-outside' });
    shelf(c, { z: 400 });
    front(c, { name: 'Door L', x0: 2, x1: 398, z0: 2, z1: 1198 });
    handle(c, { x: 370, z: 600, type: '32' });
    legs(c);
  },
});
```

Coordinates: millimetres, Z up, the front of the furniture faces −Y. `at` is the left-back-bottom corner of the
cabinet box (without legs). Positions in `shelf`, `front` and `handle` are measured from the left-bottom corner
of the box.

| Helper | What it does |
|---|---|
| `cabinet(p, { …, layout })` | sides, top/bottom panels (or rails) and, by default, an HDF back (`back: false` turns it off). Layouts: `sides-outside`, `panels-outside`, `base` (bottom panel under the sides, front and back rails 100 mm) |
| `shelf(c, { z, setback? })` | shelf between the sides; `z` = underside of the shelf |
| `front(c, { name, x0, x1, z0, z1 })` | 18 mm front in front of the box |
| `handle(c, { x, z, type })` | `'190'` bar or `'32'` knob; `x`, `z` = centre |
| `legs(c, { h? })` | 4 legs 34×34 under the box (100 mm by default) |

## Importing SketchUp scripts (`.rb`)

SketchUp scripts live in `sources/sketchup/` or `projects/<id>/source.rb`; `projects/<id>/import.json` says which
script belongs to a project. Import (Ruby 3+, no SketchUp needed – the scripts run against a small mock of the
SketchUp API):

```bash
npm run import:rb              # all projects with an import.json
npm run import:rb -- --changed # only new ones or those whose .rb changed (what GitHub Actions does)
```

Re-importing does not lose your work: manually changed layers and part codes carry over to the new
`model.json` by part name.

## Layers

| id | Label | What goes there |
|---|---|---|
| `carcass` | Carcasses | sides, top/bottom panels, rails, shelves, dividers |
| `back` | Back panels (HDF) | HDF backs |
| `front` | Fronts | doors, drawer fronts, flaps, dishwasher front |
| `handles` | Handles | handles |
| `drawers` | Drawer boxes | drawer bottoms, backs, metal drawer sides |
| `fillers` | Fillers and plinths | fillers, plinths, panels above/behind the worktop |
| `cladding` | Cladding and casings | wood-decor casings, wall cladding, alcove side panels |
| `worktop` | Worktop | 38 mm worktops |
| `legs` | Legs and clips | legs, feet, plinth clips |
| `assembly` | Battens, blocks, markers | mounting blocks, rails, hinge markers (hidden by default) |
| `appliances` | Appliances and services | fridge, dishwasher, oven, hob, sink, tap, pipes, TV |
| `room` | Room | walls, floor, ceiling – controlled by the *Walls* switch (visible / x-ray / hidden) |

Layer visibility, the explode slider and the walls mode are remembered per project; edge contrast and width
(*Appearance*) are global.

## Viewing

| Gesture | Action |
|---|---|
| left button + drag | orbit |
| middle button + drag, Shift + left, right button | pan |
| wheel | zoom towards the cursor |
| click on furniture | selects the whole cabinet with its part list → *Details* shows only that cabinet |
| double click | selects a single part (code, id, label, layer change) |
| *Find part* box | code (`BAT-7`), id (`p0018`) or part of a name + Enter |
| Esc | deselects; pressed again, returns to the whole project |

## Changing a part's layer

If the importer put a part on the wrong layer: select the part (in cabinet mode or with a double click) and pick a
layer from the list. The change is saved immediately as a commit to `projects/<id>/model.json` (the part gets
`meta.originalLayer` – the layer from the import). Choosing that layer again removes the marker.
This needs a GitHub token (see above). For furniture written in code (`project.ts`), change the layer in the code.

## Part codes

Every board that gets cut (carcasses, backs, fronts, drawers, fillers, cladding, worktop) has a short code:
three letters of the project id + a number, e.g. `BAT-7`, `KIT-112`, `TVC-13`. The code is shown in the part
panel and in the cabinet's part list – write it on the board or on a label. Numbers are assigned cabinet by
cabinet.

Codes are stable and stored in `projects/<id>/model.json` itself (`meta.code` on each part, the counter in
`codes`); for furniture written in code (`project.ts`) in `projects/<id>/codes.json`. A new part gets the next
free number, the number of a removed part is never reused, and changing a layer does not change codes.
If a part is renamed in the SketchUp script, it gets a new code on the next import.

## Tests

```bash
npm test           # vitest: model schema, geometry, layers, explode, DSL, codes, GitHub client, import merge
npm run test:ruby  # SketchUp importer (minitest)
```
