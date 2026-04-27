export const dataVizColors = {
  seaGreen: '#0FB5AE',
  palatinateBlue: '#4046CA',
  tangerine: '#F68511',
  magenta: '#DE3D82',
  tropicalIndigo: '#7E84FA',
  malachite: '#72E06A',
  azure: '#147AF3',
  violet: '#7326D3',
  yellow: '#E8C600',
  alloyOrange: '#CB5D00',
  green: '#008F5D',
  lime: '#BCE931',
};

export const defaultAxisOptions = {
  type: 'linear', // band, linear, log, time
  // default domain will compute max and min from data
  domainMin: undefined, // optionally provide a min domain
  domainMax: undefined, // optionally provide a max domain
  label: { text: '', fontSize: 14, fontWeight: 700, fontFamily: 'sans-serif' },
  hasAxisLine: true,
  hasGridLines: false,
  nice: false,
  className: '',
  strokeAxis: '#404040',
  strokeGrid: '#404040',
  strokeWidth: 1,
  sx: {},
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

export const defaultOptions = {
  series: [],
  axes: {
    x: defaultAxisOptions,
    y: defaultAxisOptions,
    x2: defaultAxisOptions,
    y2: defaultAxisOptions,
  },
  readout: {
    hoverMode: 'local',
  },
  animationDuration: 1000, // in ms
};

export const defaultSeriesOptions = {
  type: 'line', // line, bar, boxPlot, circle, area, matrix, heatmap
  xKey: 'x',
  yKey: 'y',
  // optional per-series dataset; falls back to root-level data when omitted
  data: undefined,
  // if these are true, it will pull from the secondary x2 or y2 axis options
  // instead of the primary x and y
  isSecondaryYAxis: false,
  isSecondaryXAxis: false,
  isVisible: true,
  stroke: null,
  fill: null,
  className: '',
  sx: {},
};

// this gets utilized by the getAccessors function in dataUtilities to determine
// which keys to pull from the data for each series
export const seriesAccessorProps = {
  x: ['xKey', 'minXKey', 'q1XKey', 'medianXKey', 'q3XKey', 'maxXKey'],
  y: ['yKey', 'minYKey', 'q1YKey', 'medianYKey', 'q3YKey', 'maxYKey'],
  value: ['valueKey', 'labelKey'],
};

/**
 * defaults for the different plots -----------------------------------
 * These get options get appended to the default series options
 */
export const defaultLineOptions = {
  className: '',
  fill: 'none',
  isVisible: true,
  stroke: dataVizColors.tropicalIndigo,
  strokeWidth: 2,
  sx: {},
};

export const defaultBarOptions = {
  alignment: 'center',
  cornerRadius: 2,
  className: '',
  fill: dataVizColors.tropicalIndigo,
  isVisible: true,
  paddingFactor: 0.8,
  // set true to stack bars that share the same x values
  stacked: false,
  // when stacked=true, set true to cumulatively sum bar values
  isCumulative: false,
  stroke: 'none',
  strokeWidth: 2,
  sx: {},
};

export const defaultBoxPlotOptions = {
  alignment: 'center',
  cornerRadius: 2,
  className: '',
  fill: dataVizColors.tropicalIndigo,
  isVisible: true,
  paddingFactor: 0.8,
  // `stroke` applies to the box outline
  stroke: 'none',
  strokeMedian: '#ffffff88',
  strokeWhisker: dataVizColors.tropicalIndigo,
  strokeWidth: 2,
  sx: {},
};

export const defaultCircleOptions = {
  className: '',
  fill: dataVizColors.tropicalIndigo,
  isVisible: true,
  stroke: 'none',
  radius: 4,
  sx: {},
};

export const defaultAreaOptions = {
  className: '',
  fill: `${dataVizColors.tropicalIndigo}88`,
  isVisible: true,
  // `stroke` applies to outline of area
  stroke: 'none',
  strokeWhisker: dataVizColors.tropicalIndigo,
  strokeWidth: 2,
  sx: {},
};

export const defaultMatrixOptions = {
  className: '',
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
};

export const defaultHeatmapOptions = {
  className: '',
  xKey: 'x',
  yKey: 'y',
  valueKey: 'value',
  thresholds: undefined,
  colors: ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'],
  fill: '#d6e6f2',
  resolution: 16,
  interpolationMethod: 'idw',
  idwPower: 2,
  idwNeighbors: 8,
  showContourFill: true,
  fillOpacity: 0.85,
  showContourLines: true,
  contourLineColor: null,
  contourLineWidth: 1,
  contourLineOpacity: 0.85,
  isVisible: true,
  sx: {},
};
