# Changelog

All notable user-facing changes to this package are documented in this file.

## Unreleased

### Added

- New `utcTimeFormatter` and `simpleDateHourUTC` utility exports for UTC date/time tick and readout formatting.
- Plot rendering now applies an inner-chart SVG clip area so series layers and axis line markers are visually constrained to the plot region.
- New stage-1 chart zoom support via `options.zoom`.
- Wheel zoom is now supported with configurable controls:
  - `enabled`
  - `wheelEnabled`
  - `dragEnabled`
  - `panEnabled`
  - `rightClickResetEnabled`
  - `modifierKey` (`ctrl` default)
  - `panCursor`
  - `wheelZoomSpeed`
  - `minWindow`
- Drag-select zoom-in is now supported with configurable controls:
  - `minDragPixels`
  - `dragBox.fill`
  - `dragBox.stroke`
  - `dragBox.strokeWidth`
- Wheel zoom focuses around the pointer position on the x-axis and updates x-domains only (`y`/`y2` remain fixed).
- Drag-select zoom applies the selected horizontal window to x-domains (`y`/`y2` remain fixed).
- Modifier-drag panning is now supported on the x-axis using the same `modifierKey` as wheel zoom.
- Right-click inside the inner plot area now resets zoom to the starting x-domain extent (x/x2).
- Zoom interaction is gated to continuous x-axis types (`linear` and `time`).
- New `useChartController` and `useChartZoomState` hooks expose external zoom controls and reactive zoom state for consuming applications.
- Chart zoom can now be reset or positioned programmatically with `controller.resetZoom()`, `controller.setZoomWindow({ center, windowSize })`, and `controller.setZoomCenter(center)`.
- Zoom state changes now publish telemetry context through `useChartController({ onZoomStateChange })`.

### Changed

- `axes.*.ticks.amount` is now treated as a hint rather than an exact count for `linear` and `time` axes. D3 tick generation uses the value as a target and will adjust the count to produce evenly spaced ticks that span the full axis domain. Labels that still collide after generation are rotated or reduced using the configured `collisionStrategy`.
- README documentation now clarifies local versus UTC date display for time-axis tick and readout formatters.
- `bar` and `boxPlot` `paddingFactor` is now clamped to the range `0..1`.
- When an out-of-range or non-numeric `paddingFactor` is provided, the chart logs a `console.warn` message and uses the clamped/fallback value.
- Internal x-domain padding and hover readout bar/box center calculations now use the same normalized `paddingFactor` behavior as plot rendering.
- While modifier-wheel zoom is active over a chart, the chart now captures wheel events to prevent page/document scrolling.
- Wheel zoom domain expansion is now clamped to the chart's starting x-domain extent, preventing zoom-out beyond the initial data window.
- X-axis panning is clamped to the chart's starting x-domain extent and cannot pan beyond data bounds.

## 1.1.0

### Added

- New `areaStacked` chart added. This allows multiple area charts to be layered for displaying percentile data. Only requires one series, where previous creation of this chart required multiple `area` series.
- Area readout now supports custom field ids and labels to align with areaStacked patterns.
- New optional `area` series options for readout metadata:
  - `lowerField`, `lowerLabel`
  - `medianField`, `medianLabel`
  - `upperField`, `upperLabel`
  - `minField`, `minLabel`
  - `maxField`, `maxLabel`

### Changed

- `readout.areaFields` now accepts flexible field ids for both `area` and `areaStacked`.
- `readout.areaFields` remains backward compatible with existing `area` aliases (`y`, `q1`, `q3`, `lower`, `upper`, `min`, `max`, `median`).
- Area readout value selection now uses `medianYKey` when `yKey` is not present.

### Migration Notes

- No migration required for existing configs.
- If you want percentile-style readout naming in `area`, define field ids/labels on the series and reference those ids in `readout.areaFields`.
