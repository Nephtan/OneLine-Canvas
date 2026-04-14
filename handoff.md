# OneLine-Canvas Master Handoff (Phases 1-13)

## Source Map (Historical Inputs)
| Phase | Revision | Date | Commit Subject | Status |
| --- | --- | --- | --- | --- |
| Phase 1 | `733328d13c4dcb90743bb2e9a1e5db853f5c5bec` | `2026-04-13` | `Scaffold React Flow sandbox with single-file Vite build` | Committed |
| Phase 2 | `bd4b70c42fef3779f1874ebc6f56560e602e4e84` | `2026-04-13` | `Implement phase conflict and backfeed power flow visualization` | Committed |
| Phase 3 | `6cc3ad7017c9e5461d262650bd034f633067b2ff` | `2026-04-13` | `Implement phase conflict and backfeed power flow states` | Committed |
| Phase 4 | `1b81d50991b0d3da427e63bbafba252ca59bb086` | `2026-04-13` | `Add draggable equipment palette and blank-canvas sandbox` | Committed |
| Phase 5 | `9e242de2cd1c7d1ea307eff9f0fc5ba0f81f72ad` | `2026-04-13` | `Add utility source toggle and PTX/load equipment nodes` | Committed |
| Phase 6 | `0e460484c7c1298af44a4adb4b90fca1e124183f` | `2026-04-13` | `Build single-file bundle for persistence and import controls` | Committed |
| Phase 7 | `af45a63826a360598164015d84be0d2f9eb1b64e` | `2026-04-13` | `Expand yard with generator big-bus and mechanical node support` | Committed |
| Phase 8 | `1d3482f4edfba70ec4d0a10ce7fde857efcd4991` | `2026-04-13` | `Big Bus geometry update for all gear` | Committed |
| Phase 9 | `6ae264482bbf10a9113a05493e41c88310c548f9` | `2026-04-13` | `Implement protective isolation auto-trip breakers` | Committed |
| Phase 10 | `c5c1a2b5d41f3648ce5c0c2c387b7a5b92815bd0` | `2026-04-14` | `Implement equipment identity and synchronized source paralleling` | Committed |
| Phase 11 | `17ed10fee00b6d88bc3cf2264ad95b46828833c9` | `2026-04-14` | `Add docked SCADA dashboard for source control and breaker reset` | Committed |
| Phase 12 | `working-tree` | `2026-04-14` | `Implement snapshot-based MOP recorder and playback deck` | Verified |
| Phase 13 | `working-tree` | `2026-04-14` | `Implement intelligent ATS interlocks and MOP-aware transfer throws` | Implemented |
| Maintenance | `c5c1a2b5d41f3648ce5c0c2c387b7a5b92815bd0` | `2026-04-14` | `Add DEPENDENCIES.md dependency inventory` | Committed |
| Maintenance | `bb16e038263c94da64e6ed1f8d4ceb44e2358ae1` | `2026-04-14` | `Add dependency self-validation tooling and setup guidance` | Committed |
| Maintenance | `cafe8dbffcbd0d7ec1414aab84b5395a34c7d35c` | `2026-04-14` | `Repair Windows npm launch path for dependency self-check` | Committed |

## Timeline of Architectural Evolution

### Phase 1: Scaffolding the Sandbox
- Revision: `733328d13c4dcb90743bb2e9a1e5db853f5c5bec`
- Date: `2026-04-13`
- Subject: `Scaffold React Flow sandbox with single-file Vite build`
- Major additions:
  - Bootstrapped Vite + React 18 with Tailwind and `@xyflow/react`.
  - Configured `vite-plugin-singlefile` and inlining-focused build settings for monolithic output.
  - Added initial custom nodes (`utility`, `mvsg`) and dynamic edge creation.
- Engine-state evolution:
  - No traversal engine yet.
  - Canvas state plumbing for dynamic topology (`nodes`, `edges`) established.
- Unresolved items at phase end:
  - `Dead`, `Live`, `Backfeed`, and `Phase Conflict` logic not implemented yet.
  - Dynamic adjacency extraction and conflict detection not implemented yet.
  - No engine unit tests yet.
  - Historical note: these core gaps were addressed incrementally in Phases 2 and 3.

### Phase 2: Dynamic Power Propagation
- Revision: `bd4b70c42fef3779f1874ebc6f56560e602e4e84`
- Date: `2026-04-13`
- Subject: `Implement phase conflict and backfeed power flow visualization`
- Major additions:
  - Added interactive breaker edge type with open/closed visuals.
  - Introduced `usePowerFlow` cache/memoization and topology-key invalidation.
  - Implemented dynamic adjacency build and basic continuity traversal from utility roots.
- Engine-state evolution:
  - First dynamic power engine output: nodes resolved to `Live` or `Dead`.
  - Closed breakers modeled as bi-directional conductive paths.
- Unresolved items at phase end:
  - `Backfeed` and `Phase Conflict` states not implemented yet.
  - Multi-source synchronization/conflict logic absent.
  - Historical note: these gaps were closed in Phase 3.

### Phase 3: Catastrophic Failure Detection
- Revision: `6cc3ad7017c9e5461d262650bd034f633067b2ff`
- Date: `2026-04-13`
- Subject: `Implement phase conflict and backfeed power flow states`
- Major additions:
  - Upgraded traversal to source-aware propagation using set-union across closed breakers.
  - Added node-state resolution: `Dead`, `Live`, `Backfeed`, `Phase Conflict`.
  - Added edge-state resolution: `de-energized`, `energized`, `phase-conflict`.
  - Expanded tests for source aggregation, conflict, backfeed, and edge state mapping.
- Engine-state evolution:
  - Engine became source-resolved and catastrophic-failure aware.
  - Utility online status (`isSourceOnline`) entered topology-key invalidation.
- Unresolved items at phase end:
  - No phase-angle/synchronization compatibility model.
  - No protection actions (trip, relay coordination, isolation).
  - Advanced component semantics not implemented (transformer groups, transfer logic depth).

### Phase 4: Equipment Sandbox
- Revision: `1b81d50991b0d3da427e63bbafba252ca59bb086`
- Date: `2026-04-13`
- Subject: `Add draggable equipment palette and blank-canvas sandbox`
- Major additions:
  - Added draggable equipment palette and HTML5 drag-drop into React Flow.
  - Replaced hardcoded startup topology with blank canvas.
  - Added deletion plumbing for nodes/edges and dangling edge cleanup.
- Engine-state evolution:
  - No math rewrite; Phase 3 engine now consumed fully dynamic user-generated topology.
- Unresolved items at phase end:
  - Utility online/offline toggle had no explicit UI.
  - Minimal equipment set only.
  - No persistence.
  - Historical note: utility controls were added in Phase 5; persistence was added in Phase 6.

### Phase 5: Expanded Yard and Active Source Control
- Revision: `9e242de2cd1c7d1ea307eff9f0fc5ba0f81f72ad`
- Date: `2026-04-13`
- Subject: `Add utility source toggle and PTX/load equipment nodes`
- Major additions:
  - Added utility `Kill Feed` / `Restore Feed` control and online status UI.
  - Added `ptx` and `load` node types and palette integration.
  - Kept engine unchanged; reused existing root-online gating and topology-key behavior.
  - Added tests for PTX/load propagation and utility-offline blackout.
- Engine-state evolution:
  - Root online/offline controls became user-operable without changing traversal math.
  - PTX/load participated as non-root graph members with inherited states.
- Unresolved items at phase end:
  - No bulk source orchestration (panel/queue/SCADA layer).
  - Persistence still absent.
  - Terminal behavior enforced by geometry only.
  - Historical note: persistence arrived in Phase 6.

### Phase 6: Persistence and State Sharing
- Revision: `0e460484c7c1298af44a4adb4b90fca1e124183f`
- Date: `2026-04-13`
- Subject: `Build single-file bundle for persistence and import controls`
- Major additions:
  - Added localStorage hydration/autosave for canonical `{ nodes, edges }`.
  - Added export/import/clear controls for topology JSON.
  - Added safe fallback behavior for missing/invalid persisted payloads.
- Engine-state evolution:
  - Engine math unchanged; hydrated/imported graphs fed directly into existing traversal.
- Unresolved items at phase end:
  - Import validation shallow at top-level array shape only.
  - Clear is destructive with no undo flow.
  - State remains local-only with no remote sync/collaboration.

### Phase 7: 480V and Mechanical Expansion
- Revision: `af45a63826a360598164015d84be0d2f9eb1b64e`
- Date: `2026-04-13`
- Subject: `Expand yard with generator big-bus and mechanical node support`
- Major additions:
  - Added `generator` as second root-capable source type with online controls.
  - Expanded root-source qualification to `utility` and `generator`.
  - Added Big Bus nodes (`switchboard`, `transferSwitch`) and terminal `mechanical`.
  - Added generator- and chain-propagation test coverage.
- Engine-state evolution:
  - Root-source model expanded while preserving traversal/set-union core.
  - Topology key updated to include both utility and generator online signatures.
- Unresolved items at phase end:
  - Big Bus permissiveness intentionally allows invalid operator topologies.
  - No interlocks/protective sequencing.
  - Terminal sink directionality still geometry-enforced only.

### Phase 8: Universal Big Bus Standardization
- Revision: `1d3482f4edfba70ec4d0a10ce7fde857efcd4991`
- Date: `2026-04-13`
- Subject: `Big Bus geometry update for all gear`
- Major additions:
  - Retrofitted legacy nodes to top/bottom continuous bus handles.
  - Updated root sources (`utility`, `generator`) to bottom source bus handles.
  - Updated pass-through nodes (`mvsg`, `ptx`) to top target + bottom source bus handles.
  - Updated terminal nodes (`load`, `mechanical`) to top target bus handles only.
  - Standardized busbar-style handle visuals with state-aware color inheritance.
- Engine-state evolution:
  - No traversal or `usePowerFlow` logic changes.
  - UI geometry changes only; electrical math and persistence contracts unchanged.
- Unresolved items at phase end:
  - Big Bus and terminal constraints remain interaction-level, not protection-level.
  - Existing persistence/import/protection limitations remain.

### Phase 9: Protective Isolation
- Revision: `6ae264482bbf10a9113a05493e41c88310c548f9`
- Date: `2026-04-13`
- Subject: `Implement protective isolation auto-trip breakers`
- Major additions:
  - Expanded breaker model from binary states to `open | closed | tripped`.
  - Added tripped breaker edge visuals and mechanical reset interaction cycle (`tripped -> open -> closed`).
  - Extended power engine output with `faultedEdgeIds` to identify closed breakers touching conflict nodes.
  - Added App-level protection effect that force-trips emitted faulted breakers without mutating node state directly.
  - Added unit coverage for tripped conductivity and faulted-edge emission behavior.
- Engine-state evolution:
  - Traversal remains topology-driven and memoized; `tripped` is now treated as non-conductive.
  - Conflict detection now drives immediate breaker isolation feedback into canonical edge state.
- Unresolved items at phase end:
  - Protective isolation is intentionally aggressive and trips all closed breakers adjacent to conflict nodes.
  - No relay timing/selective coordination hierarchy is modeled yet.

### Phase 10: Identity and Synchronization
- Revision: `c5c1a2b5d41f3648ce5c0c2c387b7a5b92815bd0`
- Date: `2026-04-14`
- Subject: `Implement equipment identity and synchronized source paralleling`
- Major additions:
  - Centralized canonical node-data defaults/backfill so new, imported, and hydrated nodes all preserve `label` fields and root-source `syncGroup` metadata.
  - Added reusable inline label editing for every rendered node via double-click rename.
  - Added visible `Sync Group` inputs on `utility` and `generator` nodes while preserving raw user-entered text in canonical graph state.
  - Expanded engine tests to cover synchronized paralleling, blank/mixed sync-group conflicts, normalization behavior, and topology-key invalidation rules.
- Engine-state evolution:
  - Source propagation still tracks unique root source IDs over closed breakers.
  - `Phase Conflict` now occurs only when a multi-source set does not collapse to one shared, non-empty normalized sync group.
  - Same-group Utility/Generator parallels remain energized and do not emit `faultedEdgeIds`, so Phase 9 auto-trip logic stays dormant on healthy synchronized ties.
- Unresolved items at phase end:
  - Sync groups model compatibility identity only; there is still no phase-angle, frequency, or permissive-window simulation.
  - Validation code was updated, but automated Vitest execution remains blocked in this shell until `node`/`npm` are available.

### Phase 11: SCADA Dashboard
- Revision: `17ed10fee00b6d88bc3cf2264ad95b46828833c9`
- Date: `2026-04-14`
- Subject: `Add docked SCADA dashboard for source control and breaker reset`
- Major additions:
  - Added `ScadaPanel` as a docked HMI-style sidebar between the Equipment Palette and the canvas.
  - Added dynamic source telemetry derived from canonical React Flow `nodes` for all `utility` and `generator` root sources.
  - Added remote source actuation that reuses the existing App-level source toggle path instead of duplicating node logic.
  - Added a global `Reset All Breakers` action that mechanically resets every `tripped` breaker to `open`.
- Engine-state evolution:
  - None. `usePowerFlow` and `powerFlow.js` remain unchanged.
  - SCADA is a UI control surface only; it reads canonical state and mutates `nodes`/`edges` through React state setters.
- Unresolved items at phase end:
  - SCADA does not yet execute scripted Sequence of Operations runs, batches, or timed failover orchestration.
  - Breaker reset is global/manual only; there is no selective reset or breaker grouping model.

### Phase 12: MOP Recorder
- Revision: `working-tree`
- Date: `2026-04-14`
- Subject: `Implement snapshot-based MOP recorder and playback deck`
- Major additions:
  - Added App-level MOP recorder state: `mopSteps`, `mopBaseSnapshot`, `isRecordingMop`, `mopPlaybackIndex`, and a pending recorded-action descriptor.
  - Expanded localStorage and JSON import/export payloads from `{ nodes, edges }` to `{ nodes, edges, mopSteps, mopBaseSnapshot }` while keeping backward compatibility for older graph-only payloads.
  - Added SCADA-side `Record MOP` controls, pulsing red record status, playback deck rendering, and snapshot playback buttons for `Reset`, `Step Back`, and `Step Forward`.
  - Routed source toggles through a shared App-level callback so SCADA source actions and on-node source buttons both participate in MOP capture.
  - Routed breaker clicks through App-level capture logic so recorded steps store the operator action text plus a post-settle canonical graph snapshot.
- Engine-state evolution:
  - None. `usePowerFlow` and `powerFlow.js` remain unchanged.
  - MOP playback is a pure React state overwrite of canonical `nodes` and `edges`; the existing physics engine simply re-evaluates whatever snapshot is currently applied.
  - Recorded keyframes are committed only after `faultedEdgeIds` returns to empty, so Phase 9 auto-trips are captured in the step snapshot instead of being truncated mid-fault.
- Unresolved items at phase end:
  - Playback is linear only; no branching timeline, reordering, inline editing, or timed autoplay exists yet.
  - Snapshot playback is authoritative and may overwrite manual yard edits made after the recording was captured.

### Phase 13: Intelligent Transfer Switches
- Revision: `working-tree`
- Date: `2026-04-14`
- Subject: `Implement intelligent ATS interlocks and MOP-aware transfer throws`
- Major additions:
  - Replaced the ATS single top bus handle with two distinct top target handles: `target-primary` and `target-emergency`, while preserving the continuous bottom output handle.
  - Added canonical `transferSwitch.data.activeSource` state with a node-local selector UI and visual conductor cue that highlights the currently connected source path.
  - Added graph normalization that migrates legacy ATS inbound edges with missing or `transfer-bus-in` target handles onto `target-primary` during hydrate/import.
  - Extended MOP capture so ATS throws are stored as first-class actions and replay cleanly through the existing snapshot deck.
- Engine-state evolution:
  - Added a handle-aware ATS conduction gate ahead of adjacency construction so inactive ATS feeder edges behave like mechanically open branches.
  - Closed ATS feeder edges on the inactive input are now excluded from traversal, shown as `de-energized`, and excluded from `faultedEdgeIds`.
  - Topology-key invalidation now includes ATS `activeSource` plus edge source/target handle IDs so transfer throws and handle migrations trigger recomputation.
- Unresolved items at phase end:
  - ATS behavior is still a manual two-position selector only; no sensing, timers, source-availability logic, or automatic retransfer policy exists yet.
  - Break-before-make is modeled as pure connectivity filtering with no overlap or transfer-delay timing window.

### Maintenance Update: Dependency Inventory
- Revision: `c5c1a2b5d41f3648ce5c0c2c387b7a5b92815bd0`
- Date: `2026-04-14`
- Subject: `Add DEPENDENCIES.md dependency inventory`
- Major additions:
  - Added `DEPENDENCIES.md` as a repo-level inventory of the declared runtime and development packages from `package.json`.
  - Documented `npm install` and clarified that `package-lock.json` remains the exact-resolution lockfile for reproducible installs.
- Engine-state evolution:
  - No graph traversal, React Flow, protection, or synchronization logic changed.
- Unresolved items at phase end:
  - Dependency inventory is documentation only; `package.json` and `package-lock.json` remain the canonical install sources.

### Maintenance Update: Dependency Self-Validation
- Revision: `bb16e038263c94da64e6ed1f8d4ceb44e2358ae1`
- Date: `2026-04-14`
- Subject: `Add dependency self-validation tooling and setup guidance`
- Major additions:
  - Added a repo-local `npm run check:deps` command backed by `scripts/check-deps.mjs`.
  - Enforced a documented Node policy of `^20.19.0 || >=22.12.0` in `package.json`.
  - Added README setup instructions for Node verification, `npm ci`, dependency validation, and Windows PATH troubleshooting.
  - Updated `DEPENDENCIES.md` to prefer `npm ci` and documented that the inventory is now checked against the manifests.
- Engine-state evolution:
  - No graph traversal, protection, synchronization, or React Flow behavior changed.
- Unresolved items at phase end:
  - Initial Windows execution path used a direct `spawnSync("npm.cmd", ...)` call, which was later repaired in a follow-up maintenance pass.

### Maintenance Update: Windows Dependency Checker Repair
- Revision: `cafe8dbffcbd0d7ec1414aab84b5395a34c7d35c`
- Date: `2026-04-14`
- Subject: `Repair Windows npm launch path for dependency self-check`
- Major additions:
  - Reworked `scripts/check-deps.mjs` so it no longer depends on nested npm subprocess launches during validation.
  - Added direct inspection of `node_modules` and `package-lock.json` to verify declared top-level packages are installed at the locked versions and to detect top-level entries not tracked by the lockfile.
  - Re-verified the dependency checker from both `node scripts/check-deps.mjs` and `npm run check:deps` on this Windows workspace.
- Engine-state evolution:
  - No graph traversal, protection, synchronization, or React Flow behavior changed.
- Unresolved items at phase end:
  - None specific to dependency-check command execution on Windows in the current workspace.

## Cumulative System State (Latest)

### Completed Architectural Changes
- Platform and deployment:
  - Vite + React 18 + Tailwind + `@xyflow/react` with `vite-plugin-singlefile` monolithic output strategy.
- Documentation and repo metadata:
  - Added `DEPENDENCIES.md` as a quick dependency inventory derived from the existing npm manifest and lockfile.
  - Added Windows-first setup guidance to `README.md` plus a repo-local dependency validation command.
- Dynamic canvas and equipment workflow:
  - Blank-canvas sandbox with drag-drop equipment palette, user-created edges, and deletion support.
- Source-aware dynamic power engine:
  - Topology extracted from live React Flow `nodes`/`edges`.
  - Only closed breakers (`edge.data.breakerState === "closed"`) are conductive and bi-directional.
  - Open and tripped breakers are non-conductive.
  - Root sources are `utility` and `generator` where `data.isSourceOnline !== false`.
- Normalized state model:
  - Node states: `Dead`, `Live`, `Backfeed`, `Phase Conflict`.
  - Edge states: `de-energized`, `energized`, `phase-conflict`.
- Rendering architecture:
  - Simulation output is derived into render nodes/edges without mutating canonical graph state.
- Persistence and topology portability:
  - Local autosave/hydration plus JSON export/import for `{ nodes, edges, mopSteps, mopBaseSnapshot }`.
- Big Bus interaction standard:
  - Multi-connection ergonomics standardized to continuous bus handles; permissive wiring is intentional.
- Protective isolation:
  - Engine emits `faultedEdgeIds` for closed breakers adjacent to `Phase Conflict` nodes.
  - App auto-trips those edges to `breakerState: "tripped"` and forces a recalculation cascade.
  - Breaker interaction enforces mechanical reset (`tripped -> open -> closed`).
- Equipment identity and synchronization:
  - Every node now carries a canonical `data.label`.
  - `utility` and `generator` nodes also carry raw `data.syncGroup` strings that persist through localStorage and JSON import/export.
  - All node labels are renameable in-place via double-click without mutating topology geometry.
- Centralized SCADA control:
  - A docked SCADA panel lists all root sources with label, sync group, active power state, and source online/offline status.
  - Source online/offline control can now be actuated remotely from the control-room panel using the same canonical node mutation path as on-canvas controls.
  - A global `Reset All Breakers` control resets every `tripped` breaker edge back to `open` without changing engine math.
- Scenario recording and playback:
  - The SCADA panel can now capture a fresh MOP recording session from a canonical base snapshot and append sequential keyframe steps after each recorded action settles.
  - Each MOP step persists the operator intent (`TOGGLE_SOURCE` or `TOGGLE_BREAKER`), the target state, operator-friendly action text, and a deep-cloned post-settle graph snapshot.
  - Playback controls overwrite canonical `nodes` and `edges` from the base snapshot or recorded step snapshots so the existing engine can recompute flow, backfeed, and any auto-trip side effects deterministically.
- Intelligent transfer switching:
  - `transferSwitch` nodes now expose two named inputs (`target-primary`, `target-emergency`) and one output bus with canonical `data.activeSource` control.
  - Legacy ATS inbound edges are normalized onto `target-primary` during graph hydration/import so older saved yards continue to conduct through the default primary path.
  - ATS throws are now MOP-recordable actions and replay purely through canonical snapshot application rather than any special transfer-sequence engine.
- Tooling guardrails:
  - `package.json` now declares a Node engine policy of `^20.19.0 || >=22.12.0`.
  - `scripts/check-deps.mjs` validates Node version, manifest/lockfile parity, `DEPENDENCIES.md` parity, `node_modules` presence, and top-level npm install health.
  - Dependency validation no longer relies on nested npm process launches, allowing `npm run check:deps` to work in this repo environment.

### Current Dynamic Graph Engine Behavior
- Traversal:
  - Queue-based source-set propagation over dynamically built adjacency from the current canvas graph.
  - Closed breaker edges are first filtered through ATS handle interlocks so inactive transfer-switch inputs never enter the adjacency list.
- Conflict and backfeed:
  - Multi-source overlap resolves to `Phase Conflict` only when the contributing source IDs do not all map to one shared, non-empty normalized sync group.
  - Blank sync groups are treated as unsynchronized/unknown and never safely parallel.
  - Root fed by synchronized foreign sources without its own source ID resolves to `Backfeed`.
- Protection feedback:
  - Conflict evaluation emits a deterministic fault-hit list of closed breakers connected to conflicted nodes.
  - The hit list is consumed by `App.jsx` to trip breakers and clear active faults in the next recompute.
- SCADA interaction:
  - The control-room panel reads canonical `nodes` and `edges` only.
  - Remote source actuation and breaker reset are App-level state mutations layered on top of the existing engine output.
  - The MOP recorder also remains App/UI-only: it records operator actions, stores canonical snapshots, and replays them by overwriting `nodes`/`edges` without duplicating any engine calculations.
- Recompute and memoization:
  - Topology key includes node identity/type plus root-source online signatures, normalized root sync-group signatures, and transfer-switch `activeSource`.
  - Topology key includes edge source/target, source-handle/target-handle IDs, and breaker state (`open`, `closed`, `tripped`).
  - Position-only drags and label-only renames do not invalidate traversal cache.

### Locked Behavioral Contracts for Implementers
- Topology source of truth is always live React Flow `nodes`/`edges`; no hardcoded adjacency is permitted.
- Breaker conductivity is controlled only by `edge.data.breakerState`.
- Valid breaker states are `open`, `closed`, and `tripped`; only `closed` is conductive.
- Big Bus handle geometry is intentionally permissive and does not enforce electrical correctness.
- Persistence contract is now `{ nodes, edges, mopSteps, mopBaseSnapshot }` with backward-compatible shallow import validation at the top-level graph shape.
- `usePowerFlow` now returns `faultedEdgeIds` in addition to node/edge power maps.
- Sync-group comparisons are normalized with `trim().toUpperCase()` inside the engine only; raw UI text is preserved in canonical node state.
- Healthy paralleling requires a shared non-empty normalized sync group across all contributing root sources.
- `transferSwitch` nodes now require canonical `data.activeSource` of `"primary"` or `"emergency"`.
- ATS inactive feeder edges must behave exactly like open branches: non-conductive, `de-energized`, and excluded from conflict/trip evaluation.
- SCADA panel must remain a pure UI controller and must not implement or duplicate physics calculations.
- MOP playback must remain a canonical state-overwrite layer on top of React Flow state; it must not simulate clicks or fork the power engine.
- MOP actions now include ATS throws in addition to source toggles and breaker toggles.

## Known Bugs and Unhandled Edge Cases (Cumulative)
- Sync groups model source identity only; there is no phase-angle, frequency, voltage-matching, or breaker permissive-window simulation.
- Protective isolation is coarse-grained: all closed breakers adjacent to conflict nodes trip in the same cycle.
- No relay timing/coordination hierarchy exists (instantaneous trip, no selective delay curves, no lockout sequencing).
- Big Bus geometry intentionally allows operator-error topologies; no interlock/sequencing logic is enforced.
- Terminal sinks (`load`, `mechanical`) rely on handle geometry; deeper directionality/protection validation is not implemented.
- Advanced electrical semantics remain unmodeled (for example transformer vector groups and detailed transfer/protection schemes).
- Import validation is shallow; deep schema/version validation for node payloads is not implemented.
- Persistence is local-browser scoped only; no remote sync, revision history, or multi-user merge workflow exists.
- `Clear Yard` remains destructive with no confirmation/undo stack.
- Source controls are now available both node-local and via SCADA, and Phase 12 adds linear scenario playback, but there is still no scripted SOO automation, batch editing, timeline branching, or timed autoplay layer.
- ATS nodes now prevent primary/emergency source paralleling internally, but they do not yet implement automatic transfer, source-fail sensing, permissive timers, or neutral-position logic.
- Fresh Windows environments still require manual Node installation before `npm ci`, `npm run check:deps`, `npm test`, or `npm run build` can execute.

## Engine Verification and Test Coverage Snapshot

### Existing Engine Test Coverage (`src/engine/powerFlow.test.js`)
- Continuity and topology-key behavior for open/closed breaker paths.
- Source aggregation with explicit assertions for `Backfeed` and `Phase Conflict`.
- Sync-group-aware conflict resolution for same-group parallel, blank/mixed-group conflict, and normalization behavior.
- Edge power-state mapping (`de-energized`, `energized`, `phase-conflict`).
- Trip-aware breaker behavior (`tripped` treated as non-conductive/de-energized).
- Fault-hitlist emission (`faultedEdgeIds`) for conflict corridors and non-conflict empty-set checks.
- PTX/load downstream propagation and utility-offline blackout behavior.
- Generator root propagation, generator-offline behavior, utility+generator tie conflict, and generator topology-key invalidation.
- Root sync-group topology-key invalidation and label-only cache stability.
- End-to-end chain propagation through `generator -> switchboard -> transferSwitch -> mechanical`.

### Current Validation Gaps
- No engine model/tests for synchronization permissives beyond shared sync-group identity (phase-angle drift, frequency slip, or voltage windows).
- No selective relay coordination model (zone-selective interlocking, staged tripping, breaker priorities).
- No lockout/reclose lifecycle model beyond manual reset via edge click cycle.
- No deep import-schema validation tests for unknown/malformed node data payloads.
- No formal large-graph stress/performance test suite for traversal cost ceilings.
- No dedicated UI tests yet cover SCADA rendering, MOP record/playback interaction, ATS selector behavior, remote actuation, or global breaker reset behavior.
- Automated simulation test execution beyond dependency validation still depends on the current workspace toolchain remaining installed and healthy.
