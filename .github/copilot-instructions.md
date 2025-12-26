# Copilot / AI Agent Instructions for ifcjs-react

This file contains concise, actionable guidance for an AI coding agent to be immediately productive in this repository.

1. Big picture
- Project is a React + Vite single-page app whose source root is `src/` and static assets live in `public/`.
- The 3D IFC functionality is provided by `web-ifc-viewer` (see `package.json` dependencies).
- Viewer lifecycle and configuration live in `src/pages/Index.tsx` where an `IfcViewerAPI` is created and configured via `applyWebIfcConfig`.
- `src/components/IFCContainer/IfcContainer.tsx` contains the rendering container and event handlers (double-click selection, right-click clipping, prePick, etc.). `IfcContainer` is a `forwardRef` component used by the page.

2. Major components and responsibilities
- `src/pages/Index.tsx`: bootstraps `IfcViewerAPI`, sets global viewer options (axes, grid, shadow), and wires file-loading callbacks (`ifcOnLoad`). Primary place to change viewer-level configuration.
- `src/components/IFCContainer/IfcContainer.tsx`: handles DOM container, mouse events, and property popup UI. Look here for IFC selection logic and `IFC.getProperties` usage.
- `src/components/Drawer/*`, `src/components/Navibar/*`: UI controls (MUI) that provide file input, viewer controls and dialogs. Workflows that interact with viewer will pass `viewer` via props from `Index`.

3. Build / dev / CI workflows
- The repo uses a `Makefile` for developer tasks. Common commands:
  - `make setup` — installs dependencies and copies `.env.sample` => `.env.development` when not in CI.
  - `make build/serve` — builds (or serves) the app via Vite. See `Makefile` for `build/development` and `build/serve` variants.
  - `make fmt`, `make lint`, `make typecheck` — formatting, linting, and type checks.
- Vite config is in `vite.config.ts`: notable settings are `root: './src'`, `publicDir: '../public'`, and `build.outDir: '../dist'`. Dev server uses `port: 6500` and `open: true`. (Watch for `server.host` — currently set to the string `'0,0,0,0'`.)

4. Project-specific conventions and patterns
- Source root is `src/` (not project root); imports are relative to `src` files.
- The viewer instance is created and stored in React state in `Index.tsx` and passed down as a prop to consumer components. Follow this pattern rather than creating multiple viewers.
- IFC interaction pattern: call `viewer.IFC.selector.pickIfcItem()` → `viewer.IFC.getProperties(modelID, id)` → optional `viewer.IFC.loader.ifcManager.getIfcType(...)`. See `IfcContainer.tsx` for a direct example.
- UI pattern: MUI components + local state in `Index.tsx` to control dialogs, drawer, and snackbar. Prefer updating existing helpers (`Drawer/*`, `Dialog/*`) for UI changes.

5. Integration points & external dependencies
- Primary external library: `web-ifc-viewer` (see `package.json`). Interactions with the IFC loader/manager and the viewer API are central.
- Three.js is present (`three`) and used indirectly by the viewer. Colors and scene helpers are configured directly in `Index.tsx`.
- Environment variables: `vite.config.ts` defines `process.env.API_HOST` via `define`. `.env.development` is used by `Makefile` during build/serve.

6. What to look for when editing
- When changing viewer behavior, update `Index.tsx` (viewer creation/config) and `IfcContainer.tsx` (event handlers/UI) together.
- Adding new viewer controls should follow the pattern: add props to `DrawerContent` (or Drawer) in `src/components/Drawer/Drawer.tsx`, pass `viewer` down from `Index`, and operate on the single `IfcViewerAPI` instance.
- Keep the `src` root assumption in mind for file paths; `vite` root is `./src`.

7. Quick file reference (examples)
- Viewer bootstrap: `src/pages/Index.tsx`
- Viewer container & selection: `src/components/IFCContainer/IfcContainer.tsx`
- Top-level app: `src/App.tsx` and `src/main.tsx`
- Dev/build helpers: `Makefile`, `vite.config.ts`

If any part of the codebase is unclear or you'd like the instructions expanded (examples, tests, or a checklist for PRs), tell me which area to iterate on.
