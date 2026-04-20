# OneLine-Canvas Master Handoff (Phases 1-15)

`handoff.md` is the historical architecture log. For the live backlog of unresolved modeling, workflow, testing, and documentation gaps, see `OUTSTANDING.md`.

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
| Phase 12 | `d1de6d1` | `2026-04-14` | `Implement snapshot-based MOP recorder and playback deck` | Committed |
| Phase 13 | `09bc204` | `2026-04-14` | `Implement intelligent ATS interlocks and MOP-aware transfer throws` | Committed |
| Phase 14 | `4e66668` | `2026-04-14` | `Add native visual deletion controls and explicit breaker vs wire draw modes` | Committed |
| Phase 15 | `9fe5e68` | `2026-04-17` | `Implement voltage-aware transformer propagation and properties modal` | Committed |
| Feature Update | `516637d` | `2026-04-17` | `Enable PTX primary-bus daisy-chain propagation` | Committed |
| Feature Update | `273fa4c` | `2026-04-17` | `Add dual-ended PTX primary terminals` | Committed |
| Working Tree | `working-tree` | `2026-04-17` | `Repair PTX top-edge terminal visuals` | Implemented |
| Working Tree | `working-tree` | `2026-04-17` | `Implement grid-snapped canvas routing and marquee selection` | Implemented |
| Maintenance | `c5c1a2b5d41f3648ce5c0c2c387b7a5b92815bd0` | `2026-04-14` | `Add DEPENDENCIES.md dependency inventory` | Committed |
| Maintenance | `bb16e038263c94da64e6ed1f8d4ceb44e2358ae1` | `2026-04-14` | `Add dependency self-validation tooling and setup guidance` | Committed |
| Maintenance | `cafe8dbffcbd0d7ec1414aab84b5395a34c7d35c` | `2026-04-14` | `Repair Windows npm launch path for dependency self-check` | Committed |
| Maintenance | `working-tree` | `2026-04-17` | `Rewrite README for accurate public repo presentation` | Implemented |

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
- Revision: `d1de6d1`
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
- Revision: `09bc204`
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

### Phase 14: Canvas Ergonomics
- Revision: `4e66668`
- Date: `2026-04-14`
- Subject: `Add native visual deletion controls and explicit breaker vs wire draw modes`
- Major additions:
  - Added a shared top-right delete button to every custom node and routed all node deletes through React Flow's native `deleteElements()` path so attached wires are pruned safely with the parent node.
  - Added a new `standard` custom edge renderer with an inline delete button and upgraded `breaker` edges with the same explicit wire eraser control.
  - Added a palette-level connection tool selector that lets operators choose between `Breaker` and `Solid Wire` draw modes before dragging a new connection.
  - Extended MOP capture so node deletes and edge deletes are recorded as snapshot keyframes with operator-facing `Deleted ...` action text.
- Engine-state evolution:
  - Dynamic adjacency now distinguishes `breaker` and `standard` edges: breakers conduct only when `closed`, while standard wires conduct continuously unless blocked by ATS interlocks.
  - Topology-key invalidation now includes edge type in addition to existing endpoint, handle, breaker-state, sync-group, and ATS signatures.
  - Conflict-driven `faultedEdgeIds` still target breakers only, so standard wires visualize energized/conflict state but are never auto-tripped.
- Unresolved items at phase end:
  - Visual delete controls and connection-mode ergonomics are not yet covered by automated UI tests.
  - Keyboard deletion remains enabled, but MOP capture is only guaranteed for the new explicit delete buttons.

### Phase 15: Voltage Reality Check
- Revision: `9fe5e68`
- Date: `2026-04-17`
- Subject: `Implement voltage-aware transformer propagation and properties modal`
- Major additions:
  - Replaced legacy display-only voltage strings with canonical numeric node metadata: `nominalVoltage` for standard gear and `primaryVoltage` / `secondaryVoltage` for PTXs.
  - Added a compact industrial properties modal, opened from a node-local gear button, for editing labels and voltage metadata without disturbing the existing inline rename flow.
  - Added backward-compatible graph normalization that preserves numeric voltage metadata and parses recognizable legacy voltage strings such as `34.5 kV`, `12.47 kV Bus`, `480 V Generator`, and `12.47 kV / 480 V`.
  - Added a new `Voltage Fault` node state with deep-purple pulsing visuals and explicit precedence over `Phase Conflict`, `Backfeed`, and `Live`.
- Engine-state evolution:
  - Replaced the continuity-only source-set traversal with packet-based propagation that carries both source identity and propagating voltage.
  - PTXs now act as true electrical bridges: matched primary-side packets step down to the configured secondary voltage, matched secondary-side packets step back up to the configured primary voltage, and mismatched PTX arrivals fault and stop conduction through that direction.
  - Non-transformer gear now evaluates incoming propagating voltages against canonical `nominalVoltage`, allowing same-source overvoltage and cross-voltage operator errors to resolve as `Voltage Fault` instead of silently energizing.
  - The engine now emits `powerFlagsByNodeId` and `propagatingVoltagesByNodeId` so the UI can inspect latent `Phase Conflict` flags even when `Voltage Fault` wins visually.
- Unresolved items at phase end:
  - Voltage faults do not auto-trip breakers yet; only `Phase Conflict` continues to drive breaker trip isolation.
  - PTX behavior is still ideal-ratio only; there is no impedance, inrush, vector-group, tap, or protective relay model.

### Feature Update: PTX Primary Daisy-Chain
- Revision: `516637d`
- Date: `2026-04-17`
- Subject: `Enable PTX primary-bus daisy-chain propagation`
- Major additions:
  - Split the PTX primary side into explicit handle roles: `ptx-bus-in` for inbound MV feeders, `ptx-bus-loop` for MV continuation to the next PTX, and the existing `ptx-bus-out` secondary source handle for stepped-down output.
  - Updated `PTXNode.jsx` to render the top side as one labeled MV bus with distinct `In` and `Loop` connection points so operators can chain transformers input-to-input without loosening handle semantics app-wide.
  - Preserved existing saved-graph behavior by keeping legacy missing-handle PTX edges compatible with `ptx-bus-in` / `ptx-bus-out` fallback inference.
- Engine-state evolution:
  - PTX side detection now reads explicit handle roles from live edge handle IDs rather than inferring transformer side only from source-versus-target position.
  - A matched PTX primary or secondary arrival now energizes the whole internal primary bus, allowing MV packets to continue across chained PTX primary corridors while still transforming to the configured secondary voltage.
  - Reverse PTX backfeed now traverses the new primary daisy-chain path, while primary-voltage mismatches still fault the offending PTX and block onward MV continuation plus secondary output.
- Unresolved items at phase end:
  - PTX primary terminals remained asymmetric at this commit: operators could land an inbound source only on `ptx-bus-in`, not on the right-side `ptx-bus-loop` terminal.
  - PTX primary daisy-chain behavior is currently modeled as an always-continuous internal bus; explicit operator-controlled S1/S2-style MV switch states are not implemented yet.
  - PTX protection remains idealized; no fuse, relay, or sectionalizing-device behavior is attached to the new primary loop corridor.

### Feature Update: PTX Dual-Ended Primary Terminals
- Revision: `273fa4c`
- Date: `2026-04-17`
- Subject: `Add dual-ended PTX primary terminals`
- Major additions:
  - Expanded each PTX top terminal into a strict source/target pair so both primary-side connection points can accept an inbound feeder and continue an MV daisy-chain without enabling loose-mode wiring.
  - Added new companion handle IDs `ptx-bus-in-source` and `ptx-bus-loop-target` while preserving legacy `ptx-bus-in`, `ptx-bus-loop`, and `ptx-bus-out` IDs for saved-graph compatibility.
  - Updated the PTX renderer to expose neutral `A` and `B` primary-terminal labels with vertically separated source and target grab points at each top terminal.
- Engine-state evolution:
  - PTX handle interpretation is now terminal-aware as well as side-aware: both top terminals belong to the primary bus, but only the target half accepts inbound packets and only the source half emits onward MV packets.
  - A matched primary arrival on either top terminal energizes the full internal primary bus plus the stepped secondary output, allowing PTX corridors to be fed from either end while staying in strict React Flow connection mode and preserving legacy primary-target edge behavior.
  - Existing phase-conflict, backfeed, voltage-fault, and breaker-trip semantics remain unchanged; only PTX primary terminal connectivity is broadened.
- Unresolved items at phase end:
  - This commit exposed an unintended PTX shell regression: all four logical primary handles were visually exposed and drifted into the node body instead of collapsing into two clean top-edge operator terminals.
  - PTX primary daisy-chains are still modeled as always-continuous internal buses; explicit operator-controlled S1/S2-style MV switch states are not implemented yet.
  - PTX protection remains idealized; no fuse, relay, or sectionalizing-device behavior is attached to the primary bus corridor.

### Working Tree Update: PTX Two-Terminal Visual Repair
- Revision: `working-tree`
- Date: `2026-04-17`
- Subject: `Repair PTX top-edge terminal visuals`
- Major additions:
  - Reworked the PTX shell so operators now see exactly two visible primary connection points, both flush on the top border of the transformer card instead of four exposed handles inside the node body.
  - Kept the four logical PTX primary handles intact under the hood by pairing each visible top-edge source terminal with a transparent companion target handle at the same location.
  - Removed the visible `A` / `B` terminal chrome and vertical handle stacks so the PTX returns to a clean two-terminal MV presentation without sacrificing strict source/target connectivity.
- Engine-state evolution:
  - None. PTX traversal, voltage-fault handling, backfeed modeling, breaker semantics, and handle-aware primary-bus continuity remain unchanged from `273fa4c`.
- Unresolved items at phase end:
  - PTX primary daisy-chains are still modeled as always-continuous internal buses; explicit operator-controlled S1/S2-style MV switch states are not implemented yet.
  - PTX protection remains idealized; no fuse, relay, or sectionalizing-device behavior is attached to the primary bus corridor.

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

### Maintenance Update: README Public Repo Refresh
- Revision: `working-tree`
- Date: `2026-04-17`
- Subject: `Rewrite README for accurate public repo presentation`
- Major additions:
  - Reworked `README.md` into a public-facing project overview with explicit current capabilities, setup commands, usage steps, supporting-doc links, and current limitations.
  - Removed repo-local path assumptions from the setup instructions and aligned the public command list with the actual `package.json` scripts.
  - Documented the current `npm run check:deps` clean-workspace caveat so the README does not overstate current dependency-check behavior.
- Engine-state evolution:
  - No graph traversal, protection, synchronization, or React Flow behavior changed.
- Unresolved items at phase end:
  - `npm run check:deps` still treats Vite temp directories such as `.vite` and `.vite-temp` as extraneous top-level packages after normal tool activity.

## Cumulative System State (Latest)

### Completed Architectural Changes
- Platform and deployment:
  - Vite + React 18 + Tailwind + `@xyflow/react` with `vite-plugin-singlefile` monolithic output strategy.
- Documentation and repo metadata:
  - Added `DEPENDENCIES.md` as a quick dependency inventory derived from the existing npm manifest and lockfile.
  - Added Windows-first setup guidance to `README.md` plus a repo-local dependency validation command.
  - Reworked `README.md` into an accurate public repo landing page with a docs map, current-status framing, command guidance, and an explicit limitations section.
- Dynamic canvas and equipment workflow:
  - Blank-canvas sandbox with drag-drop equipment palette, user-created edges, and deletion support.
- Canonical electrical metadata and editor workflow:
  - Every node now persists canonical numeric voltage metadata through create, hydrate, export/import, autosave, and MOP snapshots.
  - A node-local properties gear opens a shared industrial modal for editing `label`, `nominalVoltage`, or PTX `primaryVoltage` / `secondaryVoltage`.
- Source-aware dynamic power engine:
  - Topology extracted from live React Flow `nodes`/`edges`.
  - Only closed breakers (`edge.data.breakerState === "closed"`) are conductive and bi-directional.
  - Open and tripped breakers are non-conductive.
  - Root sources are `utility` and `generator` where `data.isSourceOnline !== false`, and they now seed traversal packets with their configured `nominalVoltage`.
- Normalized state model:
  - Node states: `Dead`, `Live`, `Backfeed`, `Phase Conflict`, `Voltage Fault`.
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
- Voltage-aware electrical modeling:
  - All non-PTX gear now compares incoming propagated voltage against `nominalVoltage` and resolves any mismatch as `Voltage Fault`.
  - PTXs now expose explicit dual-ended primary-bus handle roles (`ptx-bus-in`, `ptx-bus-in-source`, `ptx-bus-loop-target`, `ptx-bus-loop`) plus the existing `ptx-bus-out` secondary handle so MV daisy-chains can be modeled directly on either transformer input terminal.
  - PTX shells now collapse those four logical primary handles into two visible top-edge operator terminals, keeping the MV presentation clean while strict React Flow source/target wiring remains fully supported underneath.
  - PTXs now transform matched primary packets to `secondaryVoltage` and matched secondary packets to `primaryVoltage`, while a live primary bus can continue the same MV voltage onward through chained PTX corridors.
  - Visual precedence is now locked to `Voltage Fault > Phase Conflict > Backfeed > Live > Dead`; latent phase-conflict flags remain available in engine output even when the node renders purple.
- Tooling guardrails:
  - `package.json` now declares a Node engine policy of `^20.19.0 || >=22.12.0`.
  - `scripts/check-deps.mjs` validates Node version, manifest/lockfile parity, `DEPENDENCIES.md` parity, `node_modules` presence, and top-level npm install health.
  - Dependency validation no longer relies on nested npm process launches, allowing `npm run check:deps` to work in this repo environment.

### Current Dynamic Graph Engine Behavior
- Traversal:
  - Queue-based packet propagation over dynamically built adjacency from the current canvas graph.
  - Each packet carries `{ sourceId, voltage }`, so energized state and propagated voltage are evaluated together instead of as separate post-processing steps.
  - Conductive edges are added to adjacency only after edge-type and ATS-handle evaluation: `breaker` edges must be `closed`, while `standard` wires conduct unless an ATS interlock blocks that branch.
- Voltage handling:
  - Root sources inject their own `nominalVoltage` into the traversal when online.
  - Non-transformer nodes conduct packets unchanged and mark `Voltage Fault` whenever any incoming packet voltage differs from their `nominalVoltage`.
  - PTX side detection is now explicit-handle-aware: `ptx-bus-in` and `ptx-bus-loop-target` are primary targets, `ptx-bus-in-source` and `ptx-bus-loop` are primary MV sources, and `ptx-bus-out` is the stepped secondary source.
  - PTXs evaluate packets by arrival side: matched primary arrivals on either top terminal energize the full internal primary bus, matched secondary arrivals step back up to `primaryVoltage`, and either matched path can propagate MV packets across chained PTX primary corridors while keeping legacy primary-target edges electrically tied to that bus.
  - A PTX voltage mismatch blocks conduction through that direction only, leaving the far side dark while the PTX itself renders as `Voltage Fault`.
- Conflict and backfeed:
  - Multi-source overlap resolves to `Phase Conflict` only when the contributing source IDs do not all map to one shared, non-empty normalized sync group.
  - Blank sync groups are treated as unsynchronized/unknown and never safely parallel.
  - Root fed by synchronized foreign sources without its own source ID resolves to `Backfeed`.
- Fault precedence and protection:
  - Node render state is derived from flags with strict precedence: `Voltage Fault > Phase Conflict > Backfeed > Live > Dead`.
  - Breaker auto-trip remains phase-conflict-only and keys off the latent `hasPhaseConflict` flag rather than the dominant rendered node state.
- Protection feedback:
  - Conflict evaluation emits a deterministic fault-hit list of closed breaker edges connected to conflicted nodes.
  - The hit list is consumed by `App.jsx` to trip breakers and clear active faults in the next recompute.
- SCADA interaction:
  - The control-room panel reads canonical `nodes` and `edges` only.
  - Remote source actuation and breaker reset are App-level state mutations layered on top of the existing engine output.
  - The MOP recorder also remains App/UI-only: it records operator actions, stores canonical snapshots, and replays them by overwriting `nodes`/`edges` without duplicating any engine calculations.
- Canvas ergonomics:
  - Node and edge deletion now flows through native React Flow `deleteElements()` so topology pruning invalidates the graph naturally without manual dangling-edge cleanup logic.
  - New user-drawn connections always carry an explicit custom edge type (`breaker` or `standard`); React Flow fallback edges are no longer part of the supported topology contract.
  - Canvas placement and node dragging are now locked to a visible 24 px grid, while empty-pane left drag performs marquee node selection and panning is reserved for `Space` drag or middle mouse.
  - Breaker and wire edges now persist visual-only orthogonal waypoint layouts in canonical edge data, and selected edges expose manual add/drag/remove waypoint controls without changing any electrical semantics.
  - Routed edge waypoints translate with multi-node moves only when both edge endpoints are inside the dragged node set; otherwise waypoints remain fixed in canvas space and only the endpoint legs recompute.
- Recompute and memoization:
  - Topology key includes node identity/type plus root-source online signatures, normalized root sync-group signatures, and transfer-switch `activeSource`.
  - Topology key includes edge type, source/target, source-handle/target-handle IDs, and breaker state (`open`, `closed`, `tripped`) where applicable.
  - Position-only drags, label-only renames, and visual-only edge waypoint reroutes do not invalidate traversal cache.

### Locked Behavioral Contracts for Implementers
- Topology source of truth is always live React Flow `nodes`/`edges`; no hardcoded adjacency is permitted.
- Edge conductivity is controlled by normalized edge type plus edge data: `breaker` edges use `edge.data.breakerState`, while `standard` edges are always conductive unless blocked by ATS logic.
- Valid breaker states are `open`, `closed`, and `tripped`; only `closed` is conductive.
- Big Bus handle geometry is intentionally permissive and does not enforce electrical correctness.
- Persistence contract is now `{ nodes, edges, mopSteps, mopBaseSnapshot }` with backward-compatible shallow import validation at the top-level graph shape.
- `usePowerFlow` now returns `faultedEdgeIds` in addition to node/edge power maps.
- Canonical voltage metadata must remain numeric in volts: standard gear uses `nominalVoltage`, while PTXs use `primaryVoltage` and `secondaryVoltage`.
- Voltage-aware traversal packets must preserve both `sourceId` and propagated voltage all the way through memoized evaluation.
- Sync-group comparisons are normalized with `trim().toUpperCase()` inside the engine only; raw UI text is preserved in canonical node state.
- Healthy paralleling requires a shared non-empty normalized sync group across all contributing root sources.
- PTX handle semantics are deterministic: `ptx-bus-in` and `ptx-bus-loop-target` are primary targets, `ptx-bus-in-source` and `ptx-bus-loop` are primary MV sources, and `ptx-bus-out` remains the stepped secondary source.
- PTX rendering must expose only two visible top-edge operator terminals even though four logical primary handles exist internally for strict source/target connectivity.
- PTX conduction is side-aware and idealized: matched primary or secondary arrivals energize the internal primary bus, any primary-side edge tied to that bus can then conduct for compatibility, matched primary paths still transform to `secondaryVoltage`, matched secondary paths still step back up to `primaryVoltage`, and mismatched arrivals block that direction.
- Visual state precedence is locked to `Voltage Fault > Phase Conflict > Backfeed > Live > Dead`, but phase-conflict flags must remain available for breaker trip logic and future diagnostics.
- `transferSwitch` nodes now require canonical `data.activeSource` of `"primary"` or `"emergency"`.
- ATS inactive feeder edges must behave exactly like open branches: non-conductive, `de-energized`, and excluded from conflict/trip evaluation.
- SCADA panel must remain a pure UI controller and must not implement or duplicate physics calculations.
- MOP playback must remain a canonical state-overwrite layer on top of React Flow state; it must not simulate clicks or fork the power engine.
- MOP actions now include ATS throws plus explicit node/edge delete keyframes in addition to source toggles and breaker toggles.

## Known Bugs and Unhandled Edge Cases (Cumulative)
- Sync groups still model source identity only; there is no phase-angle, frequency, or breaker permissive-window simulation beyond the new node/PTX voltage matching rules.
- Protective isolation is coarse-grained: all closed breakers adjacent to conflict nodes trip in the same cycle.
- Voltage faults are visualized and preserved in engine flags, but they do not yet trigger automatic protective isolation or selective breaker operations.
- No relay timing/coordination hierarchy exists (instantaneous trip, no selective delay curves, no lockout sequencing).
- Big Bus geometry intentionally allows operator-error topologies; no interlock/sequencing logic is enforced.
- Terminal sinks (`load`, `mechanical`) rely on handle geometry; deeper directionality/protection validation is not implemented.
- Advanced electrical semantics remain unmodeled (for example transformer vector groups, impedance, tap settings, and detailed transfer/protection schemes).
- Import validation is shallow; deep schema/version validation for node payloads is not implemented.
- Persistence is local-browser scoped only; no remote sync, revision history, or multi-user merge workflow exists.
- `Clear Yard` remains destructive with no confirmation/undo stack.
- Source controls are now available both node-local and via SCADA, and Phase 12 adds linear scenario playback, but there is still no scripted SOO automation, batch editing, timeline branching, or timed autoplay layer.
- ATS nodes now prevent primary/emergency source paralleling internally, but they do not yet implement automatic transfer, source-fail sensing, permissive timers, or neutral-position logic.
- PTX primary daisy-chains are currently modeled as always-continuous internal buses; explicit S1/S2-style MV switch states or isolation points are not yet operator-editable.
- Fresh Windows environments still require manual Node installation before `npm ci`, `npm run check:deps`, `npm test`, or `npm run build` can execute.
- `npm run check:deps` currently assumes a clean `node_modules`; Vite temp directories such as `.vite` and `.vite-temp` can trigger false-positive extraneous-package failures after normal dev/build/test activity.
- Visual delete controls and connection draw-mode ergonomics are now present, but there is still no automated UI coverage for these operator workflows.
- Orthogonal edge routing is operator-driven only; there is no obstacle-avoidance, autorouter, or route-cleanup pass beyond the manual snapped waypoint editor.

## Engine Verification and Test Coverage Snapshot

### Existing Engine Test Coverage (`src/engine/powerFlow.test.js`)
- Continuity and topology-key behavior for open/closed breaker paths.
- Standard-wire continuity, mixed breaker/wire corridors, and edge-type topology-key invalidation.
- Source aggregation with explicit assertions for `Backfeed` and `Phase Conflict`.
- Sync-group-aware conflict resolution for same-group parallel, blank/mixed-group conflict, and normalization behavior.
- Edge power-state mapping (`de-energized`, `energized`, `phase-conflict`).
- Trip-aware breaker behavior (`tripped` treated as non-conductive/de-energized).
- Fault-hitlist emission (`faultedEdgeIds`) for conflict corridors and non-conflict empty-set checks.
- Voltage-fault detection for direct MV-to-LV feeds, PTX step-down success paths, PTX primary mismatch firewall behavior, dual-ended PTX primary daisy-chain continuation, opposite-end feeder isolation/conflict behavior, and reverse PTX backfeed across chained primary buses.
- Generator root propagation, generator-offline behavior, utility+generator tie conflict, and generator topology-key invalidation.
- Root sync-group topology-key invalidation and label-only cache stability.
- ATS interlock behavior on both breaker and standard-wire feeders plus end-to-end chain propagation through `generator -> switchboard -> transferSwitch -> mechanical`.
- Graph normalization coverage for numeric voltage metadata and recognizable legacy voltage-string imports.

### Current Validation Gaps
- No engine model/tests for synchronization permissives beyond shared sync-group identity (phase-angle drift, frequency slip, or voltage windows).
- No selective relay coordination model (zone-selective interlocking, staged tripping, breaker priorities).
- No lockout/reclose lifecycle model beyond manual reset via edge click cycle.
- No deep import-schema validation tests for unknown/malformed node data payloads.
- No formal large-graph stress/performance test suite for traversal cost ceilings.
- No dedicated UI tests yet cover SCADA rendering, MOP record/playback interaction, ATS selector behavior, remote actuation, delete-button workflows, breaker vs solid-wire connection tool selection, grid snapping, orthogonal edge rerouting, or marquee node selection.
- Automated simulation test execution beyond dependency validation still depends on the current workspace toolchain remaining installed and healthy.
