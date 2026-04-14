# OneLine-Canvas Handoff (Phase 3: Catastrophic Failure Detection)

## 1. Completed Architectural Changes
- Upgraded `src/engine/powerFlow.js` from boolean continuity to source-aware propagation:
  - each node now tracks aggregated utility source IDs reaching it,
  - traversal uses queue-based set union across closed, bi-directional breakers,
  - node states now resolve as `Dead`, `Live`, `Backfeed`, or `Phase Conflict`.
- Implemented state precedence for utility nodes:
  - utility + multiple sources => `Phase Conflict`,
  - utility + single non-self source => `Backfeed`,
  - utility + only self source => `Live`,
  - no source => `Dead`.
- Added per-edge power state computation (`edgePowerStateByEdgeId`) in engine:
  - `de-energized`, `energized`, `phase-conflict`.
- Expanded `usePowerFlow` output and cache shape to expose:
  - `powerStateByNodeId`,
  - `sourceIdsByNodeId`,
  - `edgePowerStateByEdgeId`,
  - `adjacencyByNodeId` (debug view).
- Updated `App.jsx` rendering pipeline:
  - derives `renderNodes` with `powerState` + `sourceIds`,
  - derives `renderEdges` with computed edge power state,
  - keeps canonical node/edge state untouched by simulation paint logic.
- Updated the hardcoded startup topology in `App.jsx` for immediate conflict testing:
  - two independent live utility feeds,
  - multiple MVSG buses,
  - closed feeder breakers,
  - one normally open tie-breaker between live sections.
- Updated node visuals in `UtilityNode.jsx` and `MVSGNode.jsx`:
  - `Phase Conflict`: pulsing red fault presentation + warning glyph,
  - `Backfeed`: distinct orange warning presentation + warning glyph,
  - `Live` and `Dead` states preserved as distinct normal/idle visuals.
- Updated breaker conductor visuals in `BreakerEdge.jsx`:
  - open dashed slate,
  - closed energized yellow,
  - closed conflict corridor critical red with heavy glow.
- Extended engine-only unit tests in `src/engine/powerFlow.test.js` to cover source aggregation, conflict, backfeed, edge-state mapping, and topology-key behavior.

## 2. Current State of the Dynamic Graph Engine
- Engine is now topology-agnostic and source-resolved:
  - roots are utility nodes with `data.isSourceOnline !== false`,
  - connectivity is built dynamically from current `@xyflow/react` nodes/edges,
  - closed breakers are modeled as bi-directional conductive paths.
- Node output now represents operational and catastrophic states:
  - `Dead`, `Live`, `Backfeed`, `Phase Conflict`.
- Edge output now represents conductor condition:
  - `de-energized`, `energized`, `phase-conflict`.
- Recompute guard remains deterministic:
  - topology key includes node identity/type plus utility online status,
  - topology key includes edge source/target plus breaker state,
  - node drag/position-only changes do not trigger traversal recomputation.

## 3. Known Bugs / Unhandled Edge Cases
- Conflict model currently treats any multi-source overlap as immediate phase conflict; no utility synchronization or phase-angle compatibility model exists yet.
- Fault containment/protection behavior is not modeled (no breaker trip, relay coordination, arc-flash clearing time, or zone isolation).
- Backfeed is state-classified but does not yet drive automatic protective actions or lockout behavior.
- Advanced component semantics are not implemented yet (transformer vector groups, normally-closed protection relays, transfer schemes, reclosers).
- Node creation palette/drag-and-drop equipment library is still not implemented; startup topology remains hardcoded for verification.
