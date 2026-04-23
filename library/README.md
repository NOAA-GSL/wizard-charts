# WIZARD Charts

WIZARD Charts is a React charting library built on top of D3 for weather and forecast-oriented visualizations.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [ChartContainer Props](#chartcontainer-props)
- [Data Model](#data-model)
- [Options Overview](#options-overview)
- [Series Configuration](#series-configuration)
- [Per-Plot Defaults](#per-plot-defaults)
- [Axis Configuration](#axis-configuration)
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
  type: 'line', // 'line' | 'bar' | 'boxPlot' | 'circle' | 'area'
  xKey: 'x',
  yKey: 'y',
  data: undefined, // optional per-series dataset
  isSecondaryYAxis: false,
  isSecondaryXAxis: false,
  isVisible: true,
  stroke: null,
  fill: null,
  className: '',
  sx: {},
}
```

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
  fill: `${dataVizColors['tropical-indigo']}88`,
  isVisible: true,
  stroke: 'none',
  strokeWhisker: dataVizColors['tropical-indigo'],
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
  fill: dataVizColors['tropical-indigo'],
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
  fill: dataVizColors['tropical-indigo'],
  isVisible: true,
  paddingFactor: 0.8,
  stroke: 'none',
  strokeMedian: '#ffffff88',
  strokeWhisker: dataVizColors['tropical-indigo'],
  strokeWidth: 2,
  sx: {},
}
```

### Circle

```js
{
  className: '',
  fill: dataVizColors['tropical-indigo'],
  isVisible: true,
  stroke: 'none',
  radius: 4,
  sx: {},
}
```

### Line

```js
{
  className: '',
  fill: 'none',
  isVisible: true,
  stroke: dataVizColors['tropical-indigo'],
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
      stroke: dataVizColors['tropical-indigo'],
    },
  ],
};
```

Available keys:

- `sea-green`
- `palatinate-blue`
- `tangerine`
- `magenta`
- `tropical-indigo`
- `malachite`
- `azure`
- `violet`
- `yellow`
- `alloy-orange`
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
- Set `animationDuration: 0` to disable animation.
