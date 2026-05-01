# OneLine-Canvas

**A browser-based one-line sandbox for building, switching, and stress-testing electrical topologies before the yard gets a vote.**

OneLine-Canvas is a React Flow-powered simulator for commissioning agents, MEP coordinators, and electrical engineers who want to rehearse switching logic without learning the hard way on live gear. You drag equipment into the canvas, wire the topology you actually want to test, and let the engine propagate source state, backfeed, and phase conflict across the graph.

This thing is not here to flatter bad assumptions. If you close the wrong tie, parallel unsynchronized sources, or backfeed gear you meant to isolate, the canvas will tell you exactly how ugly the result is.

## What It Does Today

- Build arbitrary topologies from live canvas state using `@xyflow/react`; no hardcoded adjacency list, no fixed yard model.
- Drop the current equipment set into the yard: utility feeds, generators, MVSG, PTX, switchboards, transfer switches, mechanical loads, and generic loads.
- Draw connections as either breakers or solid wires.
- Propagate source-aware and voltage-aware power state across the graph and resolve `Live`, `Dead`, `Backfeed`, `Phase Conflict`, and `Voltage Fault`.
- Detect unsynchronized source overlap and clear it through the current ideal-selective protection model.
- Control sources and reset tripped breakers from the docked command rail.
- Record and replay linear MOP sequences through snapshot-based playback.
- Export and import topology state, including recorded MOP snapshots.
- Stress the engine with deterministic large-topology tests and a repeatable benchmark harness.
- Build to a single self-contained `dist/index.html` for portable deployment.

## Current Status

OneLine-Canvas is **topology-aware, source-aware, conflict-aware, and nominal-voltage-aware today**. It already handles dynamic graph traversal, backfeed detection, phase-conflict detection, PTX step-down and reverse propagation, ATS source selection plus automatic source-fail sensing and timed transfer automation, UPS directional behavior, command-rail control, and MOP playback on arbitrary user-built topologies.

It is **not yet a full electrical-physics simulator**. Voltage-aware semantics, transformer behavior beyond metadata and labels, detailed breaker and switch ratings, richer relay coordination, and deeper protection logic are still in progress. If you want the live backlog instead of the cleaned-up sales pitch, read [OUTSTANDING.md](./OUTSTANDING.md).

## Stack

- React 18
- Vite
- Tailwind CSS
- `@xyflow/react`
- Vitest
- `vite-plugin-singlefile`

## Getting Started

OneLine-Canvas uses `npm`, with `package.json` and `package-lock.json` as the canonical install source.

### Prerequisites

Install a Node.js release that satisfies the repo policy:

- Node `^20.19.0`
- or Node `>=22.12.0`

Verify your toolchain:

```bash
node --version
npm --version
```

### Install

```bash
npm ci
```

### Run The App

```bash
npm run dev
```

This starts the local Vite dev server from the repo root.

### Run Engine Tests

```bash
npm test
```

The current automated suite focuses on the graph traversal, ATS automation controller, and power-flow engine rather than DOM-heavy UI coverage, including deterministic large-graph stress coverage for radial, main-tie-main, and mixed MV/LV corridors.

### Run Engine Benchmarks

```bash
npm run bench:engine
```

This prints repeatable local timings for `createTopologyKey`, `evaluatePowerFlow`, and `evaluateProtectionState` across three fixed large-topology scenarios.

### Build The Portable Artifact

```bash
npm run build
```

The production build emits a single inlined `dist/index.html`.

### Validate Dependencies

```bash
npm run check:deps
```

This command validates the Node version, manifest parity, lockfile parity, dependency inventory, and top-level install state.

Use it as a **clean-install validation step**. In the current repo, normal Vite activity can leave temporary directories such as `.vite` or `.vite-temp` in `node_modules`, and the checker currently treats those as extraneous top-level packages. If that happens, rerun `npm ci` before using `npm run check:deps` again.

## How To Use It

1. Drag equipment from the palette into the yard.
2. Choose whether new connections should be drawn as `Breaker` or `Solid Wire`.
3. Connect utility or generator sources to downstream gear.
4. Toggle source status and breaker state to energize, isolate, or intentionally abuse the topology.
5. Watch the engine resolve `Live`, `Dead`, `Backfeed`, and `Phase Conflict` in real time.
6. Use the SCADA panel for centralized source supervision, breaker reset, and MOP recording or playback.
7. Save the topology to JSON when you want to move the scenario or keep the evidence.

## Repo Docs

- [AGENTS.md](./AGENTS.md): project constraints, architecture contract, and implementation rules
- [handoff.md](./handoff.md): historical implementation narrative and system evolution log
- [OUTSTANDING.md](./OUTSTANDING.md): active backlog of simulation, modeling, testing, and documentation gaps
- [DEPENDENCIES.md](./DEPENDENCIES.md): declared package inventory and dependency notes

## Current Limitations

- The engine now enforces nominal-voltage compatibility across mixed 12.47 kV and 480 V corridors, but it still lacks richer voltage windows, permissives, and voltage-fault-to-protection coupling.
- PTX supports ideal voltage-ratio propagation and primary daisy-chains, but it does not yet model impedance, taps, vector groups, or current-based protection behavior.
- Breakers and switches do not yet model detailed ratings, permissives, or realistic protection coordination.
- ATS behavior now supports manual/auto control mode, source-fail sensing, timed transfer/retransfer, and per-device manual-return vs auto-return policy, but it still lacks richer STS/ATS permissives, neutral positions, and non-overlap timing windows.
- UI coverage is still behind engine coverage; the deepest automated tests live in `src/engine/powerFlow.test.js` and `src/engine/largeGraphPerformance.test.js`.

For the unabridged list, go straight to [OUTSTANDING.md](./OUTSTANDING.md).

## Contributing

Pull requests are welcome, but keep your feet on the floor:

- Respect the engine-first architecture. The simulation logic and the React Flow presentation layer are supposed to stay decoupled.
- Prefer improving deterministic graph behavior and test coverage before polishing the paint.
- Add or update engine tests when you change traversal, source resolution, fault behavior, ATS gating, or protection logic.
- Read [AGENTS.md](./AGENTS.md) before making structural changes. That file is the repo contract, not optional flavor text.

If your change assumes perfect operators, perfect gear, or a magically forgiving electrical system, it probably needs another pass.

## License

This repository is licensed under the AGPLv3. If you distribute a modified version, or run a modified version as a networked service, you are on the hook to provide the corresponding source code under the same license.

Read [LICENSE](./LICENSE) for the full text. If your plan depends on keeping derivatives proprietary, this repo is not going to cooperate.
