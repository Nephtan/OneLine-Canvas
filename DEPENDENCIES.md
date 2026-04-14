# Dependencies

OneLine-Canvas uses `npm` for package management. The canonical install manifests are `package.json` and `package-lock.json`; this file is a quick inventory of the declared packages currently used by the repo.

## Runtime Dependencies

| Package | Version | Purpose |
| --- | --- | --- |
| `@xyflow/react` | `^12.9.0` | React Flow canvas, node rendering, and edge/viewport handling |
| `react` | `^18.3.1` | React application runtime |
| `react-dom` | `^18.3.1` | DOM renderer for the React app |

## Development Dependencies

| Package | Version | Purpose |
| --- | --- | --- |
| `@vitejs/plugin-react` | `^5.0.0` | React transform support for the Vite toolchain |
| `autoprefixer` | `^10.4.21` | Vendor prefixing in the PostCSS pipeline |
| `postcss` | `^8.5.6` | CSS processing for Tailwind |
| `tailwindcss` | `^3.4.17` | Utility-first styling framework |
| `vite` | `^7.1.12` | Dev server and production build system |
| `vite-plugin-singlefile` | `^2.3.0` | Monolithic single-file `index.html` build output |
| `vitest` | `^3.2.4` | Unit test runner for the simulation engine |

## Install

```bash
npm install
```
