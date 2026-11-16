# Yardwork

A playable first version of a browser lawn-mowing simulator. Built with Three.js, TypeScript, Vite, and Cloudflare Workers + Durable Objects. All scenery, equipment, textures and grass are generated locally; fonts are bundled. No paid asset or API key is required for local development.

## Run

Node.js 22.12+ or 24 is recommended.

```sh
npm ci
npm run build
npm run dev:cloud
```

Open the address printed by Wrangler (normally port 8787). This serves the production client and the real lobby service together. For hot reloading, keep Wrangler running and start `npm run dev` in a second terminal. Vite on port 5173 proxies `/api` and WebSockets to Wrangler on port 8787. Rebuild to refresh the client served directly by Wrangler.

In restricted writable environments use `npm ci --cache /workspace/.npm-cache`. Wrangler supports `XDG_CONFIG_HOME=/workspace/.config WRANGLER_SEND_METRICS=false npm run dev:cloud` for its local configuration and logs.

## Play

Choose **Start mowing**, press **F** to start the mower, and use **WASD** or arrow keys to move and steer. **Shift** moves faster, **C** cycles first-person, third-person and mower-follow camera positions. Click and drag to look; scroll or trackpad-scroll to zoom. **1–4** equip owned tools; **Escape** pauses. **E** also toggles the engine in this first version.

Settings change graphics quality, grass density, cutting height, wind, weather, and audio. The camera button changes view; the photo button downloads a screenshot. Finish a job for a coverage-based payment and experience. Reach 90% coverage for the full contract and bonus. Currency, equipment, business name and experience persist in localStorage; an active singleplayer lawn does not survive reloading.

For co-op, choose **Better together**, create a private lobby, then enter its six-character code in another browser/device. Up to four players share authoritative grass state. The server accepts quantized cutting widths/heights, bounds movement speed and lawn position, and broadcasts sparse cell deltas. Remote mower positions interpolate on clients. On disconnect, rejoin the code to restore the lawn. Co-op completion requires 90% coverage and divides earnings among currently connected players. The economy is a local prototype rather than an authenticated account system.

## What is implemented

- One replayable 360 m² Queensland suburban property, procedural brickwork and paving, pitched roofs, timber fences, garden beds, trees, garage and letterbox.
- 50,400 instanced blades in 48 spatial batches, seeded height/colour/curvature variation, shader wind and gust-like waves, coarse chunk frustum culling, and configurable draw density.
- 80 × 72 lawn grid, actual circular deck footprints, four cut heights, partial coverage, missed patches, persistent cuts within a job, quantized bend directions and camera-dependent stripe shading. A shared RGBA data texture updates cuts without rebuilding blades.
- A detailed push mower with wheels, deck, engine, handles and catcher; a separate line trimmer; two purchasable mower variants with different widths and speeds; wheel animation and pooled clipping particles.
- Fixed 60 Hz movement, eased acceleration, collision boundaries, terrain undulation, fuel usage and synthesised engine audio.
- Contracts, partial payment and coverage bonuses, experience, shop, garage, owned equipment, business naming, local career saves and results.
- Real Worker lobby routing, collision-checked private codes, four-player Durable Object rooms, authoritative cuts, shared snapshots/deltas, WebSocket movement, latency reporting and reconnect-by-code. Room lawn state is checkpointed in Durable Object storage. There is no matchmaking or fake simulated player.
- In-game FPS, draw-call and grass-chunk readout, plus geometry/texture and network counts in settings.

## Validation

```sh
npm test                    # grass footprint, overlap, full raster and boundary tests
npm run build               # client + Worker type checks and production build
node tests/multiplayer.mjs  # requires Wrangler on 8787; 4 connections, capacity, cuts, job gating
node tests/browser.mjs      # requires Vite + Wrangler and Chromium
```

`CHROMIUM_PATH` overrides the browser executable (default `/usr/bin/chromium`). `TEST_URL` and `TEST_API` override test addresses. Browser screenshots are generated in ignored `artifacts/`.

Browser tests use actual UI/keyboard interactions, independent browser contexts, shared cuts and reconnects. Software-rendered headless Chromium is useful for functionality, not a desktop GPU benchmark. A 60 FPS target and Mac/Windows hardware compatibility remain to be profiled on real hardware.

## Deploy to Cloudflare

### Cloudflare Workers Builds (GitHub-connected)

The application files, including `package.json` and `wrangler.jsonc`, must be on the branch connected to Cloudflare. An environment snapshot alone does not push source to GitHub.

Set these values in your Worker’s **Settings → Build** configuration:

| Setting | Value |
| --- | --- |
| Repository | `ziggy751/lawn-mowing-game` |
| Production branch | `main` |
| Root directory | `/` (repository root) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | `24` (also pinned in `.node-version`) |

Cloudflare should detect `package-lock.json` and install dependencies with npm. If dependency auto-install is disabled, use `npm ci && npm run build` as the build command. Use `npm run build` for new build configurations. For compatibility with the previously configured `npm run dev:cloud` command, its wrapper detects Cloudflare’s `WORKERS_CI=1` marker and runs the production build instead of starting a development server. Outside Workers Builds it still starts local development. This project is a Worker with Durable Objects, not a static-only Pages site. The configured Worker name is `lawn-mowing-game`; if the dashboard Worker has a different name, align its name or set the deploy command to `npx wrangler deploy --name YOUR_WORKER_NAME`.

After saving the settings, retry the latest commit. The compatibility wrapper allows the existing `npm run dev:cloud` build setting to succeed; changing the dashboard setting to the explicit production build command is still recommended.

### Direct deployment

```sh
npm run build
npx wrangler login
npm run deploy
```

Authenticate to your own Cloudflare account. Wrangler uploads `dist/` static assets and creates the `Room` SQLite-backed Durable Object binding and migration from `wrangler.jsonc`. This needs **Workers with Durable Objects**, not a static-only Pages deployment. The app and API must share the same origin; production uses secure WebSockets automatically. No production deployment was performed during development.

For a custom domain, configure a Worker route in Cloudflare. Review pricing, account limits and room abuse controls before opening this prototype to public traffic. No secret values belong in this repository.

## Architecture

- `src/game/lawn.ts`: pure compact grid simulation shared by client and server.
- `src/game/grass.ts`: instanced blade geometry, wind/stripe shaders and grid texture.
- `src/game/world.ts`: procedural scenery, material batching and equipment builders; future GLB replacements can be added here.
- `src/game/engine.ts`: fixed timestep input, movement, cameras, rendering and audio.
- `src/game/clippings.ts`: fixed-size particle pool.
- `src/game/network.ts`: lobby client, remote state and connection lifecycle.
- `src/main.ts`, `src/style.css`: contract, gameplay HUD and menus.
- `worker/index.ts`: lobby coordination and authoritative room state.

## Scope and next stages

This is the first playable version, not the full ten-phase simulator. The original brief's photorealistic asset quality has not been reached: scenery is procedural, materials are basic PBR, grass lighting is an inexpensive custom approximation, and no imported reference imagery was supplied. Density presets and culling are implemented; distance-based grass LOD, sophisticated post-processing and hardware performance tuning remain.

Still to build: detailed ride-ons/zero-turn/stand-on equipment; hedge deformation, edging and leaf blowing; player bodies, clothing and holding animations; recorded positional environmental audio; repair and paint customization; account-backed economy; richer stripe/edge/damage scoring and before/after comparisons; additional maps, weather systems, key rebinding and full sandbox mode. Co-op has no automatic reconnect/backoff, stable reconnect identity, authentication or cross-player inventory validation yet. A reconnect restores the room's grass but allocates a new player ID. Room history currently persists without expiry.

Future tasks should use the existing checkout: cloud tasks are already isolated, so do not create a Git worktree unless explicitly requested.
