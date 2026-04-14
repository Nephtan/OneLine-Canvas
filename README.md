# OneLine-Canvas

**A visual scripting simulator for mission-critical electrical topologies.**

Physics does not care about your deadlines, and electrons do not negotiate. OneLine-Canvas is an interactive node-graph simulator built for commissioning agents, MEP coordinators, and electrical engineers who need to test data center switching logic without turning a reserve electric room into a ten-million-dollar crater.

Think of it as a sandbox for high-voltage paranoia. You drag gear onto the canvas (MVSGs, PTXs, Utility Grids), snap your nodes together to establish the physical bus connections, and dictate your switching logic. 

The simulation engine continuously propagates power states across the directed graph. It does not grade on a curve. If your virtual main-tie-main logic backfeeds a live bus from a secondary utility loop, the graph will light up red and politely inform you that you’ve just engineered a catastrophic phase conflict.

Bastard-proof your MOPs before you ever step foot on the yard.

---

## Core Features

* **Node-Based Topology Mapping:** Drag and drop 12.47kV utility feeds, switchgear, and transformers. Wire up the DINs and breakers using intuitive visual scripting.
* **Live Power Propagation:** The engine evaluates circuit states in real-time. Close a breaker, and watch the flow of live voltage snake through your loops. 
* **Catastrophic Conflict Detection:** Instantly flags dead-bus conditions, accidental paralleling of out-of-phase sources, and backfeed vulnerabilities. 
* **Cx Sequencing Validation:** Step through your Commissioning (Cx) scripts and Lock-Out/Tag-Out (LOTO) procedures safely. Prove the logic works before an operator flips copper in the real world.

---

## Setup

OneLine-Canvas uses `npm`, with `package.json` and `package-lock.json` as the canonical install source.

### Prerequisites

Install a compatible Node.js release before doing anything else:

* Node `20.19+`
* Node `22.12+`

After installation, open a fresh terminal in `C:\JeremyDev\OneLine-Canvas` and verify both commands resolve:

```bash
node --version
npm --version
```

If Windows says `'node' is not recognized` or `'npm' is not recognized`, reopen the terminal and confirm the Node installer added Node to your `PATH`.

### Install Dependencies

Use the lockfile-backed install so the workspace matches the checked-in toolchain exactly:

```bash
npm ci
```

### Validate The Workspace

Run the dependency self-check any time you need to confirm the local environment is healthy:

```bash
npm run check:deps
```

The check verifies:

* your Node version satisfies the repo policy
* `node_modules` exists
* `package.json` and `package-lock.json` are in sync
* `DEPENDENCIES.md` matches the declared manifests
* top-level npm packages are installed without missing, invalid, or extraneous entries

If the dependency check reports missing install state or manifest drift, rerun `npm ci`.

### Normal Next Steps

```bash
npm run dev
npm test
npm run build
```

---

## Contributing

If you want to add new component types, refine the simulation loop, or build a better UI for tagging components, pull requests are welcome. Make sure your logic is sound. We do not accept code that breaks fundamental laws of thermodynamics, introduces phantom loads, or assumes a perfect physical world.

---

## License & Usage

This repository is licensed under the AGPLv3. This is an aggressively copyleft license, and it is infectious by design to enforce a twisted kind of honor among thieves.

You are free to use, modify, and distribute this software. However, the AGPL comes with a barbed hook: if you modify this codebase and distribute it—or crucially, if you let users interact with a modified version of this software over a network (like a web-hosted service)—you must make your complete underlying source code publicly available under the exact same AGPLv3 license.

There is no server-side loophole. If you want to leverage this logic to build a proprietary tool for your firm's internal coordination workflows, you either open-source your entire derivative project for the community to dissect, or you walk away.
