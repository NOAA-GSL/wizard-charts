# WIZARD Charts

WIZARD Charts is a React charting library built on top of D3 for weather and forecast-oriented visualizations.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [ChartContainer Props](#chartcontainer-props)
- [Data Model](#data-model)
- [Options Overview](#options-overview)
- [Series Configuration](#series-configuration)
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
  height={600}
  width={800}
  margin={{ left: 40, right: 40, top: 20, bottom: 20 }}
  data={data}
  options={options}
  sx={{ border: '1px solid #737373' }}
/>;
```

## ChartContainer Props

```tsx
type ChartContainerProps = {
  height: number;
  width: number;
  margin: { top: number; right: number; bottom: number; left: number };
  data: unknown[] | Record<string, unknown[]>;
  options: ChartOptions;
  children?: React.ReactNode;
  className?: string;
  sx?: React.CSSProperties;
};
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
    x: {},
    y: {},
    // optional secondary axes
    // x2: {},
    // y2: {},
  },
  readout: {
    hoverMode: 'local',
  },
  animationDuration: 1000, // ms (set 0 to disable animation)
}
```

## Series Configuration

Each entry in `options.series` renders one plot layer.

### Common Series Options

```js
{
  type: 'line', // 'line' | 'bar' | 'boxPlot' | 'circle' | 'area' | 'matrix' | 'heatmap'
  xKey: 'x',
  yKey: 'y',
  data: undefined, // optional per-series dataset
  // set true to map this series to x2 / y2 instead of x / y
  isSecondaryYAxis: false,
  isSecondaryXAxis: false,
  isVisible: true,
  stroke: null,
  fill: null,
  className: '',
  sx: {},
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
- You can mix `line`, `bar`, `boxPlot`, `area`, `circle`, `matrix`, and `heatmap` in the same chart.
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
  className: '',
  fill: `${dataVizColors.tropicalIndigo}88`,
  isVisible: true,
  stroke: 'none',
  strokeWhisker: dataVizColors.tropicalIndigo,
  strokeWidth: 2,
  sx: {},
}
```

### Bar

```js
{
  alignment: 'center',
  cornerRadius: 2,
  className: '',
  fill: dataVizColors.tropicalIndigo,
  isVisible: true,
  paddingFactor: 0.8,
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
  paddingFactor: 0.8,
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
  thresholds: [0.2, 0.4, 0.6, 0.8],
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
| `thresholds`      | `number[]`                     | `[0.2, 0.4, 0.6, 0.8]`                                    | Ascending threshold breakpoints. Values are normalized and sorted internally. Color bins use `value <= threshold`.                                               |
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

| Property              | Type                        | Default                                                   | Description                                                                              |
| --------------------- | --------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `xKey`                | `string \| (row) => any`    | `'x'`                                                     | Accessor for x coordinates. Supports dot notation.                                       |
| `yKey`                | `string \| (row) => any`    | `'y'`                                                     | Accessor for y coordinates. Supports dot notation.                                       |
| `valueKey`            | `string \| (row) => number` | `'value'`                                                 | Numeric value used for interpolation and contour thresholds.                             |
| `thresholds`          | `number[] \| undefined`     | `undefined`                                               | Optional contour levels. If omitted, thresholds are auto-generated from the value extent using `colors.length - 1` evenly spaced breaks. |
| `colors`              | `string[]`                  | `['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c']` | Color bins for threshold bands. Recommended length is `thresholds.length + 1`.           |
| `fill`                | `string`                    | `'#d6e6f2'`                                               | Fallback base fill color when bins/colors are insufficient.                              |
| `resolution`          | `number`                    | `16`                                                      | Interpolation grid resolution. Higher values produce smoother contours with higher cost. |
| `interpolationMethod` | `'idw'`                     | `'idw'`                                                   | Scattered-point interpolation method used before contour extraction.                     |
| `idwPower`            | `number`                    | `2`                                                       | IDW distance exponent. Larger values emphasize nearby points.                            |
| `idwNeighbors`        | `number`                    | `8`                                                       | Number of nearest points sampled for each interpolated grid node.                        |
| `showContourFill`     | `boolean`                   | `true`                                                    | Render filled contour bands.                                                             |
| `fillOpacity`         | `number`                    | `0.85`                                                    | Opacity applied to filled contour bands.                                                 |
| `showContourLines`    | `boolean`                   | `true`                                                    | Render contour line overlays on top of fills.                                            |
| `contourLineColor`    | `string \| null`            | `null`                                                    | Line color override. When null, each line uses its threshold-bin color.                  |
| `contourLineWidth`    | `number`                    | `1`                                                       | Contour line width in pixels.                                                            |
| `contourLineOpacity`  | `number`                    | `0.85`                                                    | Contour line opacity.                                                                    |
| `className`           | `string`                    | `''`                                                      | Class applied to the heatmap container `<g>`.                                            |
| `sx`                  | `object`                    | `{}`                                                      | Inline style object applied to the heatmap container `<g>`.                              |
| `isVisible`           | `boolean`                   | `true`                                                    | Toggles heatmap visibility while preserving layout/scales.                               |

Heatmap notes:

- Heatmap requires continuous x/y scales. Use `axes.x.type` of `linear` or `time`, and `axes.y.type` of `linear` (log may work if your data domain is strictly positive).
- Threshold color semantics match matrix: bins are interpreted in ascending order with `value <= threshold` for boundary inclusion.
- When `thresholds` is omitted, heatmap computes evenly spaced thresholds across the data value range based on `colors.length - 1`.
- For large datasets, start with moderate resolution values (for example `16`) and increase only when you need smoother contours.

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
  label: {
    text: '',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'sans-serif',
  },
  hasAxisLine: true,
  hasGridLines: false,
  nice: false,
  strokeAxis: '#404040',
  strokeGrid: '#404040',
  strokeWidth: 1,
  className: '',
  sx: {},
  ticks: {
    values: [],
    labels: [],
    amount: 10,
    isAngled: false,
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
- `circle`
- `matrix`
- `heatmap`

Axis rendering behavior:

- An axis only renders if it exists in `options.axes` and has at least one series mapped to it.
- Primary axis defaults: `x` renders on bottom, `y` renders on left.
- Secondary axis defaults: `x2` renders on top, `y2` renders on right.

You can override side placement using axis options:

- `position` (for example `'left'`, `'right'`, `'top'`, `'bottom'`)
- `isLeftLocation` on y-axes
- `isTopLocation` on x-axes

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
      // optional override; y2 defaults to right if not set
      position: 'right',
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
- Supported axis keys are `x`, `y`, `x2`, and `y2`; unknown keys are ignored.
- Set `animationDuration: 0` to disable animation.
