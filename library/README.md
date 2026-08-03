# WIZARD Charts

WIZARD Charts is a React charting library built on top of D3 for weather and forecast-oriented visualizations.

## Table of Contents

- [Installation](#installation)
- [Release Notes](#release-notes)
- [Quick Start](#quick-start)
- [ChartContainer Props](#chartcontainer-props)
- [Dynamic Margins](#dynamic-margins)
- [Data Model](#data-model)
- [Options Overview](#options-overview)
- [Hover Readout](#hover-readout)
- [Series Configuration](#series-configuration)
- [Legend](#legend)
- [Combining Multiple Plot Types](#combining-multiple-plot-types)
- [Per-Plot Defaults](#per-plot-defaults)
- [Axis Configuration](#axis-configuration)
- [Secondary Axes](#secondary-axes)
- [Utility Exports](#utility-exports)
- [Notes and Gotchas](#notes-and-gotchas)

## Installation

`d3` is a peer dependency and must be installed alongside WIZARD Charts.

```bash
npm install @noaa-gsl/wizard-charts d3
```

## Release Notes

See [CHANGELOG.md](https://github.com/NOAA-GSL/wizard-charts/blob/main/library/CHANGELOG.md) for user-facing updates by release.

## Quick Start

Import the stylesheet once in your app entrypoint or global styles location:

```jsx
import '@noaa-gsl/wizard-charts/styles.css';
```

Render a `ChartContainer` with `data` and `options`:

```jsx
import { ChartContainer } from '@noaa-gsl/wizard-charts';

const data = [
  {
    date: new Date('2026-01-01'),
    temp: { mean: 30, p90: 38 },
  },
  {
    date: new Date('2026-01-02'),
    temp: { mean: 27, p90: 35 },
  },
];

const options = {
  series: [
    {
      type: 'line',
      xKey: 'date',
      yKey: 'temp.mean',
      stroke: '#147AF3',
    },
  ],
  axes: {
    x: { type: 'time' },
    y: { type: 'linear', nice: true },
  },
};

<ChartContainer
  margin={{ left: 40, top: 'auto', right: 'auto', bottom: 'auto' }}
  data={data}
  options={options}
  sx={{ border: '1px solid #737373' }}
/>;
```

## ChartContainer Props

```tsx
type ChartContainerProps = {
  height?: number | 'auto';
  width?: number | 'auto';
  margin?: {
    top?: number | 'auto';
    right?: number | 'auto';
    bottom?: number | 'auto';
    left?: number | 'auto';
  };
  data: unknown[] | Record<string, unknown[]>;
  options: ChartOptions;
  children?: React.ReactNode;
  className?: string;
  sx?: React.CSSProperties;
};
```

`margin` defaults to `{ top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' }`.

`width` and `height` default to `'auto'` (100% of the parent container on that dimension). If you provide one or both as numbers, only those dimensions are fixed.

`width` and `height` define the chart's outer SVG box. Internal chart layout (scales, axes, and plot area) is measured from the SVG content box, so `box-sizing: border-box` with `border` and/or `padding` in `sx` is accounted for automatically.

Series rendering inside `ChartContainer` is clipped to the computed inner plot area (inside margins). This prevents plot layers from visually spilling into axis/legend space.

## Dynamic Margins

Each margin side can be either:

- a number: fixed pixel margin for that side
- `'auto'`: measured from axis rendering requirements

Auto margins are computed independently per side (`top`, `right`, `bottom`, `left`) using the axis mapped to that side:

- axis line width (when `hasAxisLine` is enabled)
- outward tick length (negative tick length is treated as inward and does not add outside space)
- tick label padding
- measured tick label text bounds
- measured axis label text bounds from `axes.*.label`

When `options.legend.enabled` is true and at least one visible series is eligible for the legend, bottom auto-margin also reserves space for the legend block below the primary x-axis.

Axis labels are sourced from `axes.x.label`, `axes.x2.label`, `axes.y.label`, and `axes.y2.label`.

Default behavior (all auto):

```jsx
<ChartContainer data={data} options={options} />
```

Mixed overrides (fixed left margin, other sides auto):

```jsx
<ChartContainer
  width={800}
  margin={{ left: 48, top: 'auto', right: 'auto', bottom: 'auto' }}
  data={data}
  options={options}
/>
```

## Data Model

WIZARD Charts supports two input data shapes:

1. Row-based arrays (default)
2. Columnar object-of-arrays (auto-normalized)

### Row-Based Data (Default)

Each array element maps to one position on the x-axis.

```js
[
  {
    date: 1775075088409,
    series1: {
      mean: 31.45,
      p10: 27.66,
      p25: 30.6,
      p50: 31.4,
      p75: 31.82,
      p90: 32.63,
    },
    series2: {
      mean: 81.28,
      p10: 81.18,
      p25: 81.17,
      p50: 81.5,
      p75: 82.0,
      p90: 81.69,
    },
  },
];
```

### Accessors and Dot Notation

Series values are read with keys like `xKey`, `yKey`, `minYKey`, etc.
Dot notation is supported:

- `xKey: 'date'`
- `yKey: 'series2.p50'`

### Columnar Data (Per-Series Override)

You can provide `data` directly on a series as an object-of-arrays. This overrides root-level `data` for that series.

```js
{
  type: 'line',
  xKey: 'date',
  yKey: 'mean',
  data: {
    date: [
      new Date('2024-01-01'),
      new Date('2024-01-02'),
      new Date('2024-01-03'),
    ],
    mean: [10, 20, 15],
  },
}
```

All column arrays must be the same length.

## Options Overview

`options` drives how series and axes are rendered:

```js
{
  series: [],
  axes: {
    x: {
      // optional reference lines for this axis
      lineMarkers: [],
    },
    y: {
      // optional reference lines for this axis
      lineMarkers: [],
    },
    // optional secondary axes
    // x2: {},
    // y2: {},
  },
  legend: {
    enabled: true,
    gap: 8, // space above the legend
    rowGap: 8, // space between rows when the legend wraps
    itemGap: 16, // space between items
    markerSize: 12, // size of shaded line, square or circle identifier
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 500,
    fontColor: 'currentColor',
    colorbar: {
      width: 120,
      height: 10,
      tickGap: 4,
      tickFontSize: 10,
      tickFontWeight: 400,
    },
    className: '',
    sx: {},
  },
  readout: {
    hoverMode: 'local',
    showVerticalLine: true,
    showTooltip: true,
    className: '',
    sx: {},
    tooltip: {
      fill: '#111827',
      fillOpacity: 0.95,
      stroke: '#374151',
      strokeWidth: 1,
      cornerRadius: 6,
      className: '',
      sx: {},
    },
    displayUnits: true,
    rowOrder: 'seriesIndex', // 'seriesIndex' | 'distance'
    boxPlotFields: 'auto', // 'auto' | key | key[]
    areaFields: 'auto', // 'auto' | key | key[]
    titleFormatter: null, // (value, context?) => string
    valueFormatter: null, // (numericValue, context?) => string
    padding: { x: 8, y: 8 }, // number | { x, y }
    rowGap: 4,
    title: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: 'inherit',
      fontColor: 'currentColor',
    },
    row: {
      fontSize: 12,
      fontWeight: 400,
      fontFamily: 'inherit',
      fontColor: 'currentColor',
    },
    showPointMarkers: true,
    tooltipOffset: 12,
    markerRadius: 4,
    markerStroke: '#ffffff',
    markerStrokeWidth: 1.25,
    markerFill: 'none',
    debug: false,
  },
  animationDuration: 1000, // ms (set 0 to disable animation)
}
```

## Hover Readout

`options.readout.hoverMode` supports two modes:

- `'local'` (default): hover tracking is local to each chart and does not require any wrapper.
- `'global'`: charts synchronize hover readout events through `HoverPointProvider`.

`options.readout.showVerticalLine` controls whether a dashed vertical guide line renders at the hovered x position.

- `true` (default): show vertical guide line.
- `false`: hide vertical guide line.

`options.readout.showTooltip` controls whether a tooltip box renders with readout values.

- `true` (default): show tooltip.
- `false`: hide tooltip.

`options.readout.className` and `options.readout.sx` apply to the readout overlay root `<g>` element.

- Use `className` for CSS-based overrides.
- Use `sx` for inline style overrides.

`options.readout.tooltip` controls tooltip wrapper/box styling.

- `fill`: tooltip rectangle fill color.
- `fillOpacity`: tooltip rectangle fill opacity (`0..1`).
- `stroke`: tooltip rectangle stroke color.
- `strokeWidth`: tooltip rectangle stroke width in pixels.
- `cornerRadius`: tooltip rectangle corner radius in pixels.
- `className`: class applied to the tooltip `<g>` wrapper.
- `sx`: inline style object applied to the tooltip `<g>` wrapper.

`options.readout.displayUnits` controls whether series units are appended to readout values.

- `true` (default): append units when available.
- `false`: suppress unit suffixes in readout rows.
- Readout units use series `units` first.
- If a series `units` is empty, axis-linked series (`line`, `bar`, `boxPlot`, `area`, `areaStacked`, `circle`) fall back to their mapped y-axis `axes.y.units` or `axes.y2.units`.
- `matrix`, `heatmap`, and `contourGrid` values do not fall back to axis units; provide `series.units` when you want value units in those readouts.
- Units only render when both `readout.displayUnits` and `series.displayUnits` are true.
- If no series units are provided, nothing is appended.

`options.readout.rowOrder` controls tooltip row ordering.

- `'seriesIndex'` (default): order rows by series index in `options.series`.
- `'distance'`: order rows by distance from the hover pointer.

`options.readout.rowGap` controls vertical spacing in pixels between tooltip rows and between the title and first row.

- `4` (default).

`options.readout.boxPlotFields` controls which box-plot values render in the readout row.

- `'auto'` (default): uses median when available, then falls back to box midpoint.
- `string` or `string[]`: choose from `'median'`, `'q1'`, `'q3'`, `'min'`, `'max'`.
- aliases: `'lower'` -> `'q1'`, `'upper'` -> `'q3'`.

`options.readout.areaFields` controls which area values render in the readout row.

- `'auto'` (default): uses `y` when available, then falls back to band midpoint.
- `string` or `string[]`: accepts field ids.
- built-in aliases: `'median'` -> `'y'`, `'q1'` -> `'lower'`, `'q3'` -> `'upper'`.
- for plain `area`, you can keep using legacy ids (`'y'`, `'lower'`, `'upper'`, `'min'`, `'max'`) or define custom ids/labels on the series via `lowerField`, `lowerLabel`, `medianField`, `medianLabel`, `upperField`, `upperLabel`, `minField`, `minLabel`, `maxField`, `maxLabel`.
- for custom area ids derived from data keys, full accessor keys are accepted as aliases (for example `series1.p25`).

For `areaStacked`, `areaFields` accepts field ids derived from each band key plus optional `medianField`.

- Band field ids are inferred from key suffixes: `series1.p05` -> `p05`, `series1.p95` -> `p95`.
- Full keys are also accepted as aliases in `areaFields` (for example `series1.p05`).

- `'auto'` (default): orders fields as lower bounds in configured band order, then median, then upper bounds in reverse order.
- `string` or `string[]`: explicit field id order (for example `['p05', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95']`).

When multiple fields are configured for `boxPlot`/`area`/`areaStacked`, the tooltip renders labeled values on indented sub-lines with an aligned value column.
The first valid configured field also drives marker y-position and distance ranking.

`options.readout.titleFormatter` optionally formats the x-value shown in the tooltip title.

- `null` (default): uses built-in formatting.
- `(value, context) => string`: custom formatter.
- `context`: `{ axisKey: 'x' | 'x2', isDate: boolean }`.

Series readout controls:

- `series.readoutPrecision`: optional fixed decimal precision used by default readout formatting.
- `series.units`: optional unit suffix for readout values.
- `series.displayUnits`: per-series unit toggle in readout (`true` by default).

`options.readout.valueFormatter` optionally formats numeric values shown in tooltip rows.

- `null` (default): uses built-in numeric formatting.
- `(value, context) => string`: custom formatter.
- `value`: numeric value after parsing.
- `context`: `{ seriesType, fieldKey, fieldLabel, variant, units, displayUnits, readoutDisplayUnits, seriesDisplayUnits, readoutPrecision, defaultText, summary }` where `variant` is `'row'` or `'detail'`.
- If a formatter throws or returns `null`/`undefined`, readout falls back to default formatting.

Default readout formatting uses `series.readoutPrecision` when provided; otherwise it uses the built-in adaptive formatter.

Example formatter usage:

```js
{
  readout: {
    titleFormatter: timeFormatter('%m-%d %Hz'),
    valueFormatter: (value, { fieldKey, defaultText }) => {
      if (fieldKey === 'value') {
        return `${value.toFixed(0)}%`;
      }
      return defaultText;
    },
  },
}
```

`options.readout.padding` controls outer padding around the tooltip title and rows.

- `number`: applies same padding to x and y.
- `{ x, y }`: sets horizontal and vertical padding independently.
- default: `{ x: 8, y: 8 }`.

`options.readout.title` and `options.readout.row` controls tooltip title and row text styling.

- `fontSize`
- `fontWeight`
- `fontFamily`
- `fontColor`

Row labels and values share the same `row` font settings.

`options.readout.showPointMarkers` controls point marker circles at readout points.

- `true` (default): show marker circles.
- `false`: hide marker circles.
- For `boxPlot`, `area`, and `areaStacked`, markers follow configured readout fields: when multiple fields are selected (for example `['q1', 'q3']`), one marker is rendered per field.
- For `area` and `line` series on continuous x-scales, marker x-position follows the raw x-scale value.
- For `bar`/`boxPlot` series, marker x-position follows the rendered rectangle center (including alignment and width).

`options.readout.tooltipOffset` sets the horizontal pixel distance from pointer to tooltip anchor.

Marker style options:

- `markerRadius`
- `markerStroke`
- `markerStrokeWidth`
- `markerFill`

Readout overlays are constrained to chart/SVG bounds:

- Readout rendering only occurs while the pointer is inside the plot area.
- Tooltip is positioned to the right of the pointer by default, flips left when needed, and clamps to available SVG width/height.

`options.readout.debug` controls console debug payload logging.

- `false` (default): no readout debug logging.
- `true`: emit throttled `console.debug` payloads (roughly every 100ms while hovering).

### Local Mode

```jsx
<ChartContainer
  data={data}
  options={{ ...options, readout: { hoverMode: 'local' } }}
/>
```

### Global Mode

Wrap charts that should share hover state in one `HoverPointProvider` group:

```jsx
import { ChartContainer, HoverPointProvider } from '@noaa-gsl/wizard-charts';

<HoverPointProvider>
  <ChartContainer
    data={dataA}
    options={{ ...optionsA, readout: { hoverMode: 'global' } }}
  />
  <ChartContainer
    data={dataB}
    options={{ ...optionsB, readout: { hoverMode: 'global' } }}
  />
</HoverPointProvider>;
```

If `hoverMode` is `'global'` but no provider is present, charts fall back to local mode.

When `readout.debug` is enabled, debug payloads include hover coordinates plus nearest values per chart. Supported series for nearest-value debug output are `line`, `bar`, `circle`, `area`, `areaStacked`, `boxPlot`, `matrix`, `heatmap`, `contourGrid`, and `windBarbs`.

## Series Configuration

Each entry in `options.series` renders one plot layer.

### Common Series Options

```js
{
  type: 'line', // 'line' | 'bar' | 'boxPlot' | 'circle' | 'area' | 'areaStacked' | 'matrix' | 'heatmap' | 'contourGrid' | 'windBarbs'
  name: undefined, // legend label; falls back to yKey
  xKey: 'x',
  yKey: 'y',
  units: '', // optional readout unit suffix for this series
  displayUnits: true, // toggle unit suffix in readout for this series
  readoutPrecision: undefined, // optional fixed decimal precision for readout values
  data: undefined, // optional per-series dataset
  // set true to map this series to x2 / y2 instead of x / y
  isSecondaryYAxis: false,
  isSecondaryXAxis: false,
  isVisible: true,
  showInLegend: true,
  stroke: null,
  fill: null,
  className: '',
  sx: {},
}
```

## Legend

Legend behavior is enabled by default.

- The legend renders beneath the primary x-axis when at least one series is visible and `showInLegend` is not false.
- Set `options.legend.enabled: false` to hide legend rendering and skip legend auto-margin reservation.
- Set `series.showInLegend: false` to hide a single series from legend output.
- Series labels use `name` first, then fall back to `yKey`.
- Matrix, heatmap, and contourGrid series render a per-series colorbar legend entry instead of a marker.

Example:

```js
{
  legend: {
    enabled: true,
  },
  series: [
    {
      type: 'line',
      name: 'Mean Temperature',
      xKey: 'date',
      yKey: 'temp.mean',
    },
  ],
}
```

### Matrix Data Shape (Long Form)

Use one row per cell for matrix charts.

```js
[
  { date: new Date('2026-01-01'), category: 'model1', value: 62.3 },
  { date: new Date('2026-01-01'), category: 'model2', value: 58.1 },
  { date: new Date('2026-01-02'), category: 'model1', value: 64.8 },
];
```

Suggested matrix series config:

```js
{
  type: 'matrix',
  xKey: 'date',
  yKey: 'category',
  valueKey: 'value',
  thresholds: [50, 58, 66, 74],
  colors: ['#1f3b66', '#245f8f', '#2c8f9f', '#5ac18e', '#d4e77a'],
}
```

Threshold bins are applied in ascending order using `value <= threshold`.
The color array should usually contain `thresholds.length + 1` colors.

### Stacked Bar Behavior

For bar series:

- `stacked: true` enables stacking with compatible bar series.
- `isCumulative: true` sums stacked values on the y-domain.
- Stacking is computed by matching x positions and compatible bar-series settings.

```js
{
  type: 'bar',
  xKey: 'date',
  yKey: 'precip',
  stacked: true,
  isCumulative: true,
}
```

## Combining Multiple Plot Types

You can render multiple plot types in one chart by adding multiple entries to `options.series`.

- Each series entry renders one layer.
- You can mix `line`, `bar`, `boxPlot`, `area`, `areaStacked`, `circle`, `matrix`, and `heatmap` in the same chart.
- `contourGrid` is currently validated for mixing with `line`, `area`, `areaStacked`, `circle`, and `windBarbs` in v1.
- Render order follows array order: later series draw on top of earlier series.

Example:

```js
const options = {
  series: [
    {
      type: 'bar',
      xKey: 'date',
      yKey: 'hourlyPrecip.mean',
      fill: '#72E06A88',
      alignment: 'center',
    },
    {
      type: 'line',
      xKey: 'date',
      yKey: 'accumulatedPrecip.mean',
      fill: '#71da6e',
      strokeWidth: 4,
    },
    {
      type: 'circle',
      xKey: 'date',
      yKey: 'windDir.mean',
      stroke: '#147AF3',
      isSecondaryYAxis: true,
    },
  ],
  axes: {
    x: { type: 'time' },
    y: { type: 'linear' },
    y2: { type: 'linear' },
  },
};
```

Tip: if mixed series use very different units, map one group to `y2` using `isSecondaryYAxis: true`.

## Per-Plot Defaults

Use these as references when building options.

### Area

```js
{
  xKey: 'date',
  minYKey: 'series1.p10',
  q1YKey: 'series1.p25',
  medianYKey: 'series1.p50',
  q3YKey: 'series1.p75',
  maxYKey: 'series1.p90',
  lowerField: 'p25',
  lowerLabel: '25th',
  medianField: 'p50',
  medianLabel: '50th',
  upperField: 'p75',
  upperLabel: '75th',
  minField: 'p10',
  minLabel: '10th',
  maxField: 'p90',
  maxLabel: '90th',
  className: '',
  fill: `${dataVizColors.tropicalIndigo}88`,
  isVisible: true,
  stroke: 'none',
  strokeWhisker: dataVizColors.tropicalIndigo,
  strokeWidth: 2,
  sx: {},
}
```

### AreaStacked

`areaStacked` is designed for layered probabilistic bands in a single series.

```js
{
  xKey: 'date',
  bands: [
    {
      lowerKey: 'series1.p05',
      upperKey: 'series1.p95',
      lowerLabel: '5th',
      upperLabel: '95th',
      fill: '#F6851122',
    },
    {
      lowerKey: 'series1.p10',
      upperKey: 'series1.p90',
      lowerLabel: '10th',
      upperLabel: '90th',
      fill: '#F6851133',
    },
    {
      lowerKey: 'series1.p25',
      upperKey: 'series1.p75',
      lowerLabel: '25th',
      upperLabel: '75th',
      fill: '#F6851155',
    },
  ],
  medianKey: 'series1.p50',
  medianField: 'p50',
  medianLabel: '50th',
  medianStroke: dataVizColors.palatinateBlue,
  medianStrokeWidth: 2,
  medianIsVisible: true,
  className: '',
  isVisible: true,
  fill: `${dataVizColors.tropicalIndigo}33`, // can also be per-band array
  stroke: 'none', // can also be per-band array
  strokeWidth: 1,
  sx: {},
}
```

Recommended band order is outer-to-inner (for example `5-95`, `10-90`, `25-75`) so the smallest interval renders on top.

### Bar

```js
{
  alignment: 'center',
  cornerRadius: 2,
  className: '',
  fill: dataVizColors.tropicalIndigo,
  isVisible: true,
  paddingFactor: 0.8, // 0-1
  stacked: false,
  isCumulative: false,
  stroke: 'none',
  strokeWidth: 2,
  sx: {},
}
```

### BoxPlot

```js
{
  xKey: 'date',
  minYKey: 'series1.p10',
  q1YKey: 'series1.p25',
  medianYKey: 'series1.p50',
  q3YKey: 'series1.p75',
  maxYKey: 'series1.p90',
  alignment: 'center',
  cornerRadius: 2,
  className: '',
  fill: dataVizColors.tropicalIndigo,
  isVisible: true,
  paddingFactor: 0.8, // 0-1
  stroke: 'none',
  strokeMedian: '#ffffff88',
  strokeWhisker: dataVizColors.tropicalIndigo,
  strokeWidth: 2,
  sx: {},
}
```

### Circle

```js
{
  className: '',
  fill: dataVizColors.tropicalIndigo,
  isVisible: true,
  stroke: 'none',
  radius: 4,
  sx: {},
}
```

### Matrix

```js
{
  xKey: 'x',
  yKey: 'y',
  valueKey: 'value',
  labelKey: undefined,
  // optional; auto-generated from data range and colors.length when omitted
  thresholds: undefined,
  colors: ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'],
  timeAnchor: 'center', // 'start' | 'center' | 'end'
  cellPadding: 1,
  cellWidthFactor: 1,
  fill: dataVizColors.tropicalIndigo,
  stroke: '#20202055',
  strokeWidth: 0,
  showLabels: false,
  labelFormatter: null,
  labelColor: '#f2f2f2',
  labelFontSize: 10,
  labelFontWeight: 600,
  missingCellMode: 'sparse',
  isVisible: true,
  sx: {},
}
```

Matrix placement is inferred from the resolved x-scale:

- `axes.x.type: 'band'` => band cells
- non-band x scales (`time`, `linear`) => continuous placement

Matrix option details:

| Property          | Type                           | Default                                                   | Description                                                                                                                                                      |
| ----------------- | ------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `xKey`            | `string \| (row) => any`       | `'x'`                                                     | Accessor for x position. Supports dot notation (for example `forecast.validTime`).                                                                               |
| `yKey`            | `string \| (row) => any`       | `'y'`                                                     | Accessor for matrix row/category. Use categorical values when `axes.y.type` is `band`.                                                                           |
| `valueKey`        | `string \| (row) => number`    | `'value'`                                                 | Numeric value used for threshold binning and color selection.                                                                                                    |
| `labelKey`        | `string \| (row) => any`       | `undefined`                                               | Optional accessor for label text. Falls back to `valueKey` when omitted.                                                                                         |
| `thresholds`      | `number[] \| undefined`        | `undefined`                                               | Optional threshold breakpoints. If omitted, thresholds are auto-generated from the matrix value extent using `colors.length - 1` evenly spaced breaks.           |
| `colors`          | `string[]`                     | `['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c']` | Fill colors for threshold bins. Recommended length is `thresholds.length + 1`.                                                                                   |
| `fill`            | `string`                       | `dataVizColors.tropicalIndigo`                            | Fallback fill color when value is non-numeric or colors/thresholds are not usable.                                                                               |
| `timeAnchor`      | `'start' \| 'center' \| 'end'` | `'center'`                                                | Anchor for non-band x scales. `start`: tick at left edge of cell. `center`: tick at center. `end`: tick at right edge. Aliases `left`/`right` are also accepted. |
| `cellPadding`     | `number`                       | `1`                                                       | Inner pixel padding on each side of each cell. Larger values create visible gaps between cells.                                                                  |
| `cellWidthFactor` | `number`                       | `1`                                                       | Width multiplier for non-band x cells. Effective range is clamped to `0.05..1`.                                                                                  |
| `stroke`          | `string`                       | `'#20202055'`                                             | Cell border color.                                                                                                                                               |
| `strokeWidth`     | `number`                       | `0`                                                       | Cell border width in pixels.                                                                                                                                     |
| `showLabels`      | `boolean`                      | `false`                                                   | Whether to render text labels centered in each cell.                                                                                                             |
| `labelFormatter`  | `(labelValue, row) => string`  | `null`                                                    | Optional formatter for label text. Ignored when `showLabels` is `false`.                                                                                         |
| `labelColor`      | `string`                       | `'#f2f2f2'`                                               | Label text color.                                                                                                                                                |
| `labelFontSize`   | `number`                       | `10`                                                      | Label text size in pixels.                                                                                                                                       |
| `labelFontWeight` | `number \| string`             | `600`                                                     | Label text weight.                                                                                                                                               |
| `className`       | `string`                       | `''`                                                      | Class applied to the matrix `<g>` container.                                                                                                                     |
| `sx`              | `object`                       | `{}`                                                      | Inline style object applied to the matrix `<g>` container.                                                                                                       |
| `isVisible`       | `boolean`                      | `true`                                                    | Toggles matrix visibility while preserving layout/scales.                                                                                                        |
| `missingCellMode` | `string`                       | `'sparse'`                                                | Reserved for future behavior. Current implementation renders only cells present in data.                                                                         |

Additional notes:

- Matrix currently requires a band y-axis (`axes.y.type: 'band'`) for uniform row heights.
- For non-band x scales, cell widths are based on local spacing between neighboring x-values and then adjusted by `timeAnchor` and `cellWidthFactor`.
- Matrix x-axis ticks for `time` and `linear` scales use matrix data x-values by default unless `axes.x.ticks.values` is explicitly provided.
- When `thresholds` is omitted, matrix computes evenly spaced thresholds across the data value range based on `colors.length - 1`.

### Heatmap

Heatmap renders continuous contour bands plus optional contour lines from scattered x/y/value points.

```js
{
  xKey: 'x',
  yKey: 'y',
  valueKey: 'value',
  // optional; auto-generated from data range and colors.length when omitted
  thresholds: undefined,
  colors: ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'],
  fill: '#d6e6f2',
  resolution: 64,
  interpolationMethod: 'idw',
  idwPower: 2,
  idwNeighbors: 16,
  showContourFill: true,
  fillOpacity: 0.85,
  showContourLines: true,
  contourLineColor: null,
  contourLineWidth: 1,
  contourLineOpacity: 0.85,
  isVisible: true,
  sx: {},
}
```

Heatmap option details:

| Property              | Type                        | Default                                                   | Description                                                                                                                              |
| --------------------- | --------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `xKey`                | `string \| (row) => any`    | `'x'`                                                     | Accessor for x coordinates. Supports dot notation.                                                                                       |
| `yKey`                | `string \| (row) => any`    | `'y'`                                                     | Accessor for y coordinates. Supports dot notation.                                                                                       |
| `valueKey`            | `string \| (row) => number` | `'value'`                                                 | Numeric value used for interpolation and contour thresholds.                                                                             |
| `thresholds`          | `number[] \| undefined`     | `undefined`                                               | Optional contour levels. If omitted, thresholds are auto-generated from the value extent using `colors.length - 1` evenly spaced breaks. |
| `colors`              | `string[]`                  | `['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c']` | Color bins for threshold bands. Recommended length is `thresholds.length + 1`.                                                           |
| `fill`                | `string`                    | `'#d6e6f2'`                                               | Fallback base fill color when bins/colors are insufficient.                                                                              |
| `resolution`          | `number`                    | `16`                                                      | Interpolation grid resolution. Higher values produce smoother contours with higher cost.                                                 |
| `interpolationMethod` | `'idw'`                     | `'idw'`                                                   | Scattered-point interpolation method used before contour extraction.                                                                     |
| `idwPower`            | `number`                    | `2`                                                       | IDW distance exponent. Larger values emphasize nearby points.                                                                            |
| `idwNeighbors`        | `number`                    | `8`                                                       | Number of nearest points sampled for each interpolated grid node.                                                                        |
| `showContourFill`     | `boolean`                   | `true`                                                    | Render filled contour bands.                                                                                                             |
| `fillOpacity`         | `number`                    | `0.85`                                                    | Opacity applied to filled contour bands.                                                                                                 |
| `showContourLines`    | `boolean`                   | `true`                                                    | Render contour line overlays on top of fills.                                                                                            |
| `contourLineColor`    | `string \| null`            | `null`                                                    | Line color override. When null, each line uses its threshold-bin color.                                                                  |
| `contourLineWidth`    | `number`                    | `1`                                                       | Contour line width in pixels.                                                                                                            |
| `contourLineOpacity`  | `number`                    | `0.85`                                                    | Contour line opacity.                                                                                                                    |
| `className`           | `string`                    | `''`                                                      | Class applied to the heatmap container `<g>`.                                                                                            |
| `sx`                  | `object`                    | `{}`                                                      | Inline style object applied to the heatmap container `<g>`.                                                                              |
| `isVisible`           | `boolean`                   | `true`                                                    | Toggles heatmap visibility while preserving layout/scales.                                                                               |

Heatmap notes:

- Heatmap requires continuous x/y scales. Use `axes.x.type` of `linear` or `time`, and `axes.y.type` of `linear` (log may work if your data domain is strictly positive).
- Threshold color semantics match matrix: bins are interpreted in ascending order with `value <= threshold` for boundary inclusion.
- When `thresholds` is omitted, heatmap computes evenly spaced thresholds across the data value range based on `colors.length - 1`.
- For large datasets, start with moderate resolution values (for example `16`) and increase only when you need smoother contours.

### ContourGrid

ContourGrid renders contour fills/lines from structured gridded x/y/value data. Unlike `heatmap`, it does not run scattered-point IDW interpolation and is intended for fast, spatially consistent contouring on regular grids.

```js
{
  xKey: 'x',
  yKey: 'y',
  valueKey: 'value',
  thresholds: undefined,
  colors: ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'],
  fill: '#d6e6f2',
  showContourFill: true,
  fillOpacity: 0.85,
  showContourLines: true,
  contourLineColor: null,
  contourLineWidth: 1,
  contourLineOpacity: 0.85,
  readoutSamplingMode: 'interpolate', // 'interpolate' | 'nearest'
  isVisible: true,
  sx: {},
}
```

ContourGrid option details:

| Property              | Type                         | Default                                                   | Description                                                                                                                              |
| --------------------- | ---------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `xKey`                | `string \| (row) => any`     | `'x'`                                                     | Accessor for x coordinates. Supports dot notation.                                                                                       |
| `yKey`                | `string \| (row) => any`     | `'y'`                                                     | Accessor for y coordinates. Supports dot notation.                                                                                       |
| `valueKey`            | `string \| (row) => number`  | `'value'`                                                 | Numeric field used for contour thresholds and readout values.                                                                            |
| `thresholds`          | `number[] \| undefined`      | `undefined`                                               | Optional contour levels. If omitted, thresholds are auto-generated from the value extent using `colors.length - 1` evenly spaced breaks. |
| `colors`              | `string[]`                   | `['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c']` | Color bins for threshold bands. Recommended length is `thresholds.length + 1`.                                                           |
| `fill`                | `string`                     | `'#d6e6f2'`                                               | Fallback base fill color when bins/colors are insufficient.                                                                              |
| `showContourFill`     | `boolean`                    | `true`                                                    | Render filled contour bands.                                                                                                             |
| `fillOpacity`         | `number`                     | `0.85`                                                    | Opacity applied to filled contour bands.                                                                                                 |
| `showContourLines`    | `boolean`                    | `true`                                                    | Render contour line overlays on top of fills.                                                                                            |
| `contourLineColor`    | `string \| null`             | `null`                                                    | Line color override. When null, each line uses its threshold-bin color.                                                                  |
| `contourLineWidth`    | `number`                     | `1`                                                       | Contour line width in pixels.                                                                                                            |
| `contourLineOpacity`  | `number`                     | `0.85`                                                    | Contour line opacity.                                                                                                                    |
| `readoutSamplingMode` | `'interpolate' \| 'nearest'` | `'interpolate'`                                           | Hover sampling mode for readout value lookup at pointer x/y.                                                                             |
| `className`           | `string`                     | `''`                                                      | Class applied to the contourGrid container `<g>`.                                                                                        |
| `sx`                  | `object`                     | `{}`                                                      | Inline style object applied to the contourGrid container `<g>`.                                                                          |
| `isVisible`           | `boolean`                    | `true`                                                    | Toggles contourGrid visibility while preserving layout/scales.                                                                           |

ContourGrid notes:

- ContourGrid assumes structured gridded data and currently supports continuous axes only (`linear`, `log`, `time`).
- Band scales are not supported for contourGrid.
- In mixed charts, contourGrid is currently validated for `line`, `area`, `circle`, and `windBarbs` overlays in v1.

### WindBarbs

WindBarbs renders meteorological wind barbs at each data point. It works both as a standalone scatter-style overlay (like `circle`) and as a gridded overlay paired with `contourGrid`.

Each datum requires an x position, a y position, a speed value, and a direction value. Speed maps to the barb shape in 5-unit buckets (unit-agnostic — the chart does not interpret or convert values; provide `series.units` for readout display).

Barb shapes are drawn as inline SVG paths. The `color` option controls the stroke and fill of all barb elements, so any valid CSS color value produces correctly colored barbs.

```js
{
  xKey: 'x',
  yKey: 'y',
  speedKey: 'speed',
  directionKey: 'direction',
  color: '#404040',
  size: 20,         // staff length in pixels
  strokeWidth: 1.5,
  isVisible: true,
  className: '',
  sx: {},
}
```

WindBarbs option details:

| Property       | Type                        | Default       | Description                                                                                                                             |
| -------------- | --------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `xKey`         | `string \| (row) => any`    | `'x'`         | Accessor for x position. Supports dot notation.                                                                                         |
| `yKey`         | `string \| (row) => any`    | `'y'`         | Accessor for y position. Supports dot notation.                                                                                         |
| `speedKey`     | `string \| (row) => number` | `'speed'`     | Numeric wind speed. Maps to barb shape in 5-unit buckets: each 5 units adds one flag feature. Values below 2.5 render as a calm circle. |
| `directionKey` | `string \| (row) => number` | `'direction'` | Wind direction in meteorological degrees (wind comes FROM this direction, clockwise from north). Controls the rotation of each barb.    |
| `color`        | `string`                    | `'#404040'`   | Stroke color for the staff and barb lines, and fill color for pennant triangles. Accepts any CSS color value.                           |
| `size`         | `number`                    | `20`          | Pixel length of the barb staff. All other barb geometry scales proportionally.                                                          |
| `strokeWidth`  | `number`                    | `1.5`         | Stroke width in pixels for the staff, barb lines, and pennant outlines.                                                                 |
| `isVisible`    | `boolean`                   | `true`        | Toggles barb visibility while preserving layout and scales.                                                                             |
| `className`    | `string`                    | `''`          | Class applied to the WindBarbs `<g>` container.                                                                                         |
| `sx`           | `object`                    | `{}`          | Inline style object applied to the WindBarbs `<g>` container.                                                                           |

WindBarbs data shape example:

```js
[
  {
    validTime: new Date('2026-01-01T00:00Z'),
    pressure: 500,
    speed: 35,
    direction: 270,
  },
  {
    validTime: new Date('2026-01-01T00:00Z'),
    pressure: 700,
    speed: 20,
    direction: 225,
  },
  {
    validTime: new Date('2026-01-01T06:00Z'),
    pressure: 500,
    speed: 45,
    direction: 260,
  },
];
```

Suggested series config:

```js
{
  type: 'windBarbs',
  xKey: 'validTime',
  yKey: 'pressure',
  speedKey: 'speed',
  directionKey: 'direction',
  color: '#1a1a2e',
  size: 24,
  units: 'kt',
}
```

WindBarbs notes:

- Speed values are unit-agnostic: every 5 units adds one barb feature. Use `series.units` (for example `'kt'`) if you want units shown in the hover readout.
- Calm wind (speed below 2.5) renders as a small circle at the data point instead of a staff.
- `size` is a fixed pixel value. In dense gridded charts, choose a size that keeps barbs from overlapping.
- When used with `contourGrid`, place `windBarbs` after the contourGrid entry in `series` so it renders on top.
- Hover readout shows speed on the primary row and direction (rounded to nearest degree) as an indented detail line.
- Secondary axes are supported: use `isSecondaryXAxis` and `isSecondaryYAxis` as with other series types.

### WindBarbs with ContourGrid

Pair `windBarbs` with `contourGrid` to overlay barbs on a contoured scalar field. List `contourGrid` first so the fill renders beneath the barbs:

```js
const options = {
  series: [
    {
      type: 'contourGrid',
      xKey: 'validTime',
      yKey: 'pressure',
      valueKey: 'temperature',
      colors: ['#313695', '#74add1', '#fed976', '#f46d43', '#a50026'],
    },
    {
      type: 'windBarbs',
      xKey: 'validTime',
      yKey: 'pressure',
      speedKey: 'windSpeed',
      directionKey: 'windDir',
      color: '#1a1a2e',
      size: 20,
      units: 'kt',
    },
  ],
  axes: {
    x: { type: 'time' },
    y: { type: 'linear', isReversed: true }, // pressure decreases upward
  },
};
```

### Line

```js
{
  className: '',
  fill: 'none',
  isVisible: true,
  stroke: dataVizColors.tropicalIndigo,
  strokeWidth: 2,
  sx: {},
}
```

## Axis Configuration

At minimum, configure `axes.x` and `axes.y`:

```js
axes: { x: {}, y: {} }
```

Axis defaults:

```js
{
  // for `time`, values must be Date objects or numeric timestamps
  type: 'linear', // 'band' | 'linear' | 'time' | 'threshold'
  domainMin: undefined,
  domainMax: undefined,
  isReversed: false,
  displayUnits: true,
  units: '',
  label: {
    text: '',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'inherit',
    fontColor: 'currentColor',
  },
  hasAxisLine: true,
  hasGridLines: false,
  includeLineMarkersInDomain: false,
  nice: false,
  strokeAxis: '#404040',
  strokeGrid: '#404040',
  strokeWidth: 1,
  className: '',
  sx: {},
  lineMarkers: [
    {
      value: 32,
      label: 'Freezing Point',
      placement: 'top-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
      padding: 8, // number | { edge, line }
      includeInDomain: false,
      isVisible: true,
      stroke: '#404040',
      strokeWidth: 1,
      strokeDasharray: null,
      fontFamily: 'inherit',
      fontSize: 12,
      fontWeight: 700,
      fontColor: 'currentColor',
      labelBackgroundFill: '',
      labelBackgroundOpacity: 1,
      labelBackgroundStroke: '',
      labelBackgroundStrokeWidth: 1,
      labelCornerRadius: 4,
      labelPadding: 4,
      className: '',
      sx: {},
    },
  ],
  ticks: {
    values: [],
    labels: [],
    amount: 10,
    isAngled: false,
    collisionStrategy: 'auto',
    collisionMinGap: 5,
    length: 5,
    labelPadding: 5,
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 400,
    fontColor: 'currentColor',
    formatter: null,
  },
}
```

Label behavior:

- Use `axes.*.label` for axis label text and font settings.
- `label.text` is rendered on all supported axes (`x`, `x2`, `y`, `y2`) when non-empty.
- Use `axes.*.units` to provide optional axis unit text.
- `axes.*.displayUnits` controls whether axis units are appended to label text (`true` by default).
- If `label.text` is empty and units are enabled, the axis label renders just the units.
- Use `label.fontColor` to control axis label color independently of tick label color.
- Legacy `axes.*.title` is not used by axis rendering.

`axes.*.isReversed` reverses the direction of the scale for that axis.

- `false` (default): x axes ascend left-to-right; y axes ascend bottom-to-top.
- `true`: x axes ascend right-to-left; y axes ascend top-to-bottom.
- Works with all scale types: `linear`, `time`, `log`, `band`, and `threshold`.
- Applies independently per axis, so you can reverse only `y` while keeping `x` in its default direction.

Tick behavior:

- Leave `ticks.values` empty to use the axis' generated ticks. Continuous axes (`linear`, `time`) use D3 `scale.ticks(count)` generation, with `ticks.amount` as the count hint. Band axes use the resolved domain.
- Provide `ticks.values` to render only those tick positions.
- `ticks.amount` is a hint, not an exact count. For `linear` and `time` axes, D3 adjusts the count to produce evenly spaced ticks that span the full domain. The actual number of ticks may differ slightly from the requested amount. It is ignored entirely when `ticks.values` is provided.
- Provide `ticks.labels` to override labels by index. If a label is missing for a given tick value, the axis falls back to `ticks.formatter(value)`, then `String(value)`.
- `ticks.collisionStrategy` controls overlap handling:
  - `'auto'` (default): x/x2 try 45-degree rotation first, then reduce ticks if needed; y/y2 reduce ticks.
  - `'rotate'`: x/x2 rotate to 45 degrees but do not reduce tick count.
  - `'reduce'`: keep orientation and reduce tick count.
  - `'none'`: disable automatic collision handling.
- `ticks.collisionMinGap` sets the minimum pixel gap between adjacent label bounds before labels are considered colliding.

Line marker behavior:

- Add axis-level marker lines with `axes.*.lineMarkers`.
- `x`/`x2` markers render vertical lines; `y`/`y2` markers render horizontal lines.
- Markers render across the plot area from one side of the chart to the other.
- `label` draws text inside the plot area using `placement` (`'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'`).
- `padding` controls label offset from the plot edge and from the marker line (`number` or `{ edge, line }`).
- Label text can be rendered in a boxed annotation using `labelBackgroundFill`, `labelBackgroundOpacity`, `labelBackgroundStroke`, `labelBackgroundStrokeWidth`, `labelCornerRadius`, and `labelPadding`.
- Out-of-domain markers are hidden by default.
- Set `axes.*.includeLineMarkersInDomain: true` to include all line marker values in domain calculation.
- Set `lineMarkers[].includeInDomain` to override domain inclusion for a single marker.

Example:

```js
axes: {
  x: {
    type: 'time',
    label: { text: 'Date', fontColor: '#404040' },
  },
  y: {
    type: 'linear',
    label: { text: 'Temperature', fontColor: '#147AF3' },
    units: 'F',
    ticks: {
      values: [0, 15, 30],
      labels: ['Calm', 'Breezy', 'Windy'],
    },
  },
}
```

Supported axis keys are `x`, `y`, `x2`, and `y2`.

If an unsupported axis key is provided (for example `y1`), it is ignored to avoid runtime crashes.

## Secondary Axes

Secondary axis usage is series-driven:

- Set `isSecondaryXAxis: true` on a series to use `axes.x2`.
- Set `isSecondaryYAxis: true` on a series to use `axes.y2`.
- If these flags are `false`, the series uses primary `axes.x` and `axes.y`.

All plot types support secondary-axis mapping:

- `line`
- `bar`
- `boxPlot`
- `area`
- `areaStacked`
- `circle`
- `matrix`
- `heatmap`
- `windBarbs`

Axis rendering behavior:

- An axis only renders if it exists in `options.axes` and has at least one series mapped to it.
- Primary axis defaults: `x` renders on bottom, `y` renders on left.
- Secondary axis defaults: `x2` renders on top, `y2` renders on right.

Example:

```js
const options = {
  series: [
    {
      type: 'line',
      xKey: 'date',
      yKey: 'temperature.mean',
      stroke: '#147AF3',
    },
    {
      type: 'line',
      xKey: 'date',
      yKey: 'windspeed.mean',
      stroke: '#CB5D00',
      isSecondaryYAxis: true,
    },
  ],
  axes: {
    x: { type: 'time' },
    y: { type: 'linear', label: { text: 'Temperature (F)' } },
    y2: {
      type: 'linear',
      label: { text: 'Wind (mph)' },
    },
  },
};
```

## Utility Exports

In addition to chart components, the package exports color tokens and tick-format helpers.

### dataVizColors

`dataVizColors` is an object of named hex values you can reuse across chart styles.

```js
import { dataVizColors } from '@noaa-gsl/wizard-charts';

const options = {
  series: [
    {
      type: 'line',
      xKey: 'date',
      yKey: 'temp.mean',
      stroke: dataVizColors.azure,
    },
    {
      type: 'line',
      xKey: 'date',
      yKey: 'temp.p90',
      stroke: dataVizColors.tropicalIndigo,
    },
  ],
};
```

Available keys:

- `seaGreen`
- `palatinateBlue`
- `tangerine`
- `magenta`
- `tropicalIndigo`
- `malachite`
- `azure`
- `violet`
- `yellow`
- `alloyOrange`
- `green`
- `lime`

### Tick-Format Utilities

Tick-format utilities are exported from the package root:

```js
import {
  timeFormatter,
  numberFormatter,
  simpleDateHour,
} from '@noaa-gsl/wizard-charts';
```

Helpers:

- `timeFormatter(spec)` returns a D3 `timeFormat` formatter function.
- `numberFormatter(specifier)` returns a D3 numeric formatter function.
- `simpleDateHour()` returns a preset formatter using `%Y-%m-%d %H`.

Example usage in axis config:

```js
const options = {
  axes: {
    x: {
      type: 'time',
      ticks: {
        formatter: simpleDateHour(),
      },
    },
    y: {
      type: 'linear',
      ticks: {
        formatter: numberFormatter('.1f'),
      },
    },
  },
};
```

## Notes and Gotchas

- For `type: 'time'`, provide `Date` instances or numeric timestamps.
- Dot-notation keys are supported for nested values (for example `forecast.p50`).
- If using per-series columnar `data`, keep all arrays the same length.
- `bar` and `boxPlot` `paddingFactor` values are clamped to `0-1`; out-of-range values emit a `console.warn` message.
- Plot layers are clipped to the computed inner plot area.
- Supported axis keys are `x`, `y`, `x2`, and `y2`; unknown keys are ignored.
- Set `animationDuration: 0` to disable animation.
