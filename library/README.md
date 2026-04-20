# WIZARD Charts

A charting library built on top of D3 for displaying complex weather data.

### Installation

The library is built on top of `D3` and requires that package to be installed in addition to Wizard Charts

```bash
npm install @noaa-gsl/wizard-charts d3
```

<br>

## Usage

Import the CSS stylesheet in the `<App />` component or where you import your global CSS.

```jsx
import '@noaa-gsl/wizard-charts/styles.css';
```

Create the `<ChartContainer />` where you would like to render the chart

```jsx
import { ChartContainer } from '@noaa-gsl/wizard-charts';

<ChartContainer
  // required props
  height={height} // 600
  width={width} // 800
  margin={margin} // { left: 40, right: 40, top: 20, bottom: 20 }
  data={data} // [...]
  options={options} // { series: [...], axis: {...}, etc }
  // optional props
  sx={{
    border: '1px solid #737373',
  }}
>
  {/* you may render any SVG elements as children of ChartContainer */}
  {children}
</ChartContainer>;
```

<br>

## Data Configuration

The data should be arranged as an array of objects, with each array index representing a point on the x-axis for your dependent variable. Here is an example of one such object:

```js
[
  {
    "date": 1775075088409,
    "series1": {
      "mean": 31.451618078254917,
      "p10": 27.66429878923369,
      "p25": 30.604620527202997,
      "p50": 31.405882108075584,
      "p75": 31.828612758013502,
      "p90": 32.63097066315947
    },
    "series2": {
      "mean": 81.28298222199525,
      "p10": 81.18530113763336,
      "p25": 81.1763584330726,
      "p50": 81.50001057061314,
      "p75": 82.00724816412736,
      "p90": 81.69317918940664
    }
  },
  { ... }
]
```

You may structure this in any way that makes sense for your data. Each data point will be accessed with an `xKey` and a `yKey`. For example, in the series configuration, I may set `xKey: 'date'` and `yKey: 'series2.p50'`

<br>

## Options Configuration

Every `option` object requires information that constructs the series and axes. (WIP: Readout). This is the general structure:

```js
{
  series: [],
  axes: { x: {...}, y: {...} },
  readout: {
    hoverMode: 'local',
  },
  animationDuration: 1000, // in ms, set to 0 for no animation
};
```

The `series` array will accept one or multiple objects. Each object will determine what type of plot gets visualized on the chart.

```js
// series default options
{
  type: 'line', // determines type of chart: 'line', 'bar' or 'boxPlot'
  xKey: 'nameOfDataKey', // accessor for x data
  yKey: 'can.use.dot.notation', // accessory for y data
  stacked: false, // for bar series only: stack with other matching stacked bars
  isCumulative: false, // for stacked bars: sum values when true, overlay values when false
  // if these are true, it will pull from the secondary x2 or y2 axis options
  // instead of the primary x and y
  isSecondaryYAxis: false,
  isSecondaryXAxis: false,
  isVisible: true,
  stroke: null, // stroke color
  fill: null, // fill color
  className: '', // styles can also be defined by classes
  sx: {}, // styles can also be inlined
};
```

<br>

## Default Series Options For Each Plot Type

### Area

```js
{
  // note that yKeys are different to allow access to percentile data that builds the box plot
  xKey: 'date',
  minYKey: 'series1.p10',
  q1YKey: 'series1.p25',
  medianYKey: 'series1.p50',
  q3YKey: 'series1.p75',
  maxYKey: 'series1.p90',
  // styling
  className: '',
  fill: `${dataVizColors['tropical-indigo']}88`,
  isVisible: true,
  // `stroke` applies to outline of area
  stroke: 'none',
  strokeWhisker: dataVizColors['tropical-indigo'],
  strokeWidth: 2,
  sx: {},
};
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
};
```

### BoxPlot

```js
{
  // note that yKeys are different to allow access to percentile data that builds the box plot
  xKey: 'date',
  minYKey: 'series1.p10',
  q1YKey: 'series1.p25',
  medianYKey: 'series1.p50',
  q3YKey: 'series1.p75',
  maxYKey: 'series1.p90',
  // styling
  alignment: 'center',
  cornerRadius: 2,
  className: '',
  fill: dataVizColors['tropical-indigo'],
  isVisible: true,
  paddingFactor: 0.8,
  // `stroke` applies to the box outline
  stroke: 'none',
  strokeMedian: '#ffffff88',
  strokeWhisker: dataVizColors['tropical-indigo'],
  strokeWidth: 2,
  sx: {},
};
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
};
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
};
```

<br>

## Axis Configuration

Axis information is necessary for the x and y axis. Should be structured as:

```js
axes: { x: {}, y: {} }
```

Here are the relevant options for a particular axis:

```js
// axis default options
{

  // NOTE: `time` scale type must be provided as a number or Date Object
  type: 'linear', // band, linear, log, time
  // default domain will compute max and min from data
  domainMin: undefined, // optionally provide a min domain
  domainMax: undefined, // optionally provide a max domain
  label: { text: '', fontSize: 14, fontWeight: 700, fontFamily: 'sans-serif' },
  hasAxisLine: true, // show axis
  hasGridLines: false, // show grid
  nice: false, // round the data to nice intervals
  strokeAxis: '#404040', // color of the axis line
  strokeGrid: '#404040', // color of the grid
  strokeWidth: 1, // width of grid and axis lines
  className: '', // styles can be defined by classes
  sx: {}, // styles can be inlined
  // tick props
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
    formatter: null, // optional formatting function for ticks
  },
};
```
