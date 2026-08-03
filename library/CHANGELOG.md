# Changelog

All notable user-facing changes to this package are documented in this file.

## Unreleased

### Added

- Plot rendering now applies an inner-chart SVG clip area so series layers and axis line markers are visually constrained to the plot region.

### Changed

- `bar` and `boxPlot` `paddingFactor` is now clamped to the range `0..1`.
- When an out-of-range or non-numeric `paddingFactor` is provided, the chart logs a `console.warn` message and uses the clamped/fallback value.
- Internal x-domain padding and hover readout bar/box center calculations now use the same normalized `paddingFactor` behavior as plot rendering.

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
