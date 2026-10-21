# Development Guidelines

## Project and architecture

Wizard Charts is a React/SVG charting library using D3 for scales, geometry, and
other chart calculations. This npm-workspaces repository contains:

- [library/](./library/): the published `@noaa-gsl/wizard-charts` package.
- [demo/](./demo/): examples and a place to verify rendering and interactions.
- [Library README](./library/README.md): public API, data formats, and usage.

Follow the existing division of responsibilities:

- [ChartProvider](./library/src/context/ChartProvider.jsx) normalizes data and
  options and provides accessors, scales, and layout through context.
- [ChartContainer](./library/src/ChartContainer.jsx) coordinates SVG composition,
  measurement, clipping, zoom, and readout interactions.
- Plot and axis components consume shared chart helpers. Preserve the existing
  React/SVG rendering model rather than introducing a separate D3 DOM lifecycle.
- [index.js](./library/src/index.js) defines public exports.

## Plan before substantive changes

Before implementing a feature, behavior change, or nontrivial refactor, propose a
concise plan and wait for approval. Identify affected components, shared code to
reuse, compatibility considerations, and automated/manual verification. An already
approved plan does not need another approval unless its scope materially changes.
Trivial documentation corrections do not require a separate planning cycle.

## Reuse first; keep changes small

- Search existing utilities, hooks, accessors, and neighboring components before
  adding logic, especially data processing, scale calculations, and interactions.
- Reuse existing helpers and established patterns whenever possible. If an
  existing helper almost fits, consider a small compatible extension rather than
  copying it or creating a parallel implementation.
- Put reusable chart behavior in the library, not only in a demo component.
- Extract shared logic when it removes meaningful duplication; do not introduce
  speculative abstractions or configuration for hypothetical future needs.
- Prefer the smallest complete change, including relevant tests and documentation.
  Avoid unrelated cleanup, new dependencies, and broad refactors.

## Human-readable code

Use clear names and straightforward control flow. Add concise comments where they
help a reviewer or future maintainer understand intent, assumptions, or non-obvious
behavior, especially chart mathematics, coordinate conversions, domain boundaries,
and performance-sensitive decisions. Explain why, not merely what the next line
does. Keep comments accurate when changing the associated code.

## Preserve public and interaction contracts

Preserve existing exports, props, option names, defaults, supported data shapes,
accessor behavior, and series-level data overrides unless a change is explicitly
approved. Call out intentional differences in the plan and update their docs.

Treat these as compatibility-sensitive:

- Linear and time scales, Date versus numeric domain values, and secondary axes.
- Zoom domains, controller state, reset behavior, and clipping.
- Local versus synchronized hover/readouts and provider requirements.
- Layout, margins, tick formatting, and resizing.

Reuse the existing controller and hover-store patterns; avoid making static chart
marks rerender on every pointer movement.

## Tests and verification

Automated coverage is currently limited. Add focused tests alongside new behavior
and regression tests for bug fixes whenever feasible; limited existing coverage is
not a reason to omit tests for new code. Follow common conventions using Vitest. An
example is found in [readoutModel.test.js](./library/src/readout/readoutModel.test.js).

Test observable behavior rather than implementation details. For relevant data or
scale changes, cover empty/missing/invalid values, boundaries, and Date versus
numeric inputs. Run affected tests first and widen validation when shared code or
public behavior is affected.

If a change needs testing infrastructure that does not exist, explain the gap and
propose the smallest appropriate addition in the plan rather than silently
skipping coverage or introducing a broad tooling change.

All commands below run from the repository root:

| Purpose                                    | Command                                      |
| ------------------------------------------ | -------------------------------------------- |
| Install workspace dependencies when needed | `npm install`                                |
| Build the library                          | `npm run build`                              |
| Build the demo                             | `npm run build --workspace=demo`             |
| Lint library source                        | `npm run lint --workspace=library`           |
| Lint demo source                           | `npm run lint --workspace=demo`              |
| Run existing library tests                 | `npm exec --workspace=library -- vitest run` |

For focused Vitest runs, append test paths relative to `library/`. Root `npm test`
is a failing placeholder; do not use it as the test workflow or imply that a
successful build proves behavioral correctness.

For manual verification, run `npm run build:dev` in one terminal and `npm run dev`
in another. The demo consumes the built library, so source changes need a library
build or its watcher. These are long-running commands; stop task-owned processes
when verification is complete unless asked to leave them running.

For rendering or interaction changes, verify the affected demo scenario in a
browser. As applicable, check resizing, tick/label collisions, secondary axes,
pointer coordinates, clipping, zoom/reset, and synchronized charts. Automated
tests and visual checks complement each other; neither replaces the other.
Report checks performed, results, and any checks that could not be completed.

## Documentation and examples

Update the [library README](./library/README.md) for changed public APIs, options,
data contracts, or interaction behavior. Add or update a relevant demo for new
user-facing capabilities. Record user-visible changes in the
[changelog](./library/CHANGELOG.md) following its existing conventions.

Keep this file concise and current when workflows or architectural boundaries
change. Link to detailed documentation instead of duplicating it here.
