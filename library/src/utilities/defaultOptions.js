export const dataVizColors = {
  'sea-green': '#0FB5AE',
  'palatinate-blue': '#4046CA',
  tangerine: '#F68511',
  magenta: '#DE3D82',
  'tropical-indigo': '#7E84FA',
  malachite: '#72E06A',
  azure: '#147AF3',
  violet: '#7326D3',
  yellow: '#E8C600',
  'alloy-orange': '#CB5D00',
  green: '#008F5D',
  lime: '#BCE931',
};

export const defaultOptions = {
  series: [],
  axes: {},
  readout: {
    hoverMode: 'local',
  },
  animationDuration: 1000, // in ms
};

export const defaultSeriesOptions = {
  type: 'line', // 'bar' or 'boxPlot'
  xKey: 'x',
  yKey: 'y',
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

// this gets utilized by the getAccessors function in dataUtilities to determine
// which keys to pull from the data for each series
export const seriesAccessorProps = {
  x: ['xKey', 'minXKey', 'q1XKey', 'medianXKey', 'q3XKey', 'maxXKey'],
  y: ['yKey', 'minYKey', 'q1YKey', 'medianYKey', 'q3YKey', 'maxYKey'],
};

// defaults for the different plots ------------------------- //
export const defaultLineOptions = {
  className: '',
  fill: 'none',
  stroke: dataVizColors['tropical-indigo'],
  strokeWidth: 2,
  sx: {},
};

export const defaultBarOptions = {
  alignment: 'center',
  cornerRadius: 2,
  className: '',
  fill: dataVizColors['tropical-indigo'],
  paddingFactor: 0.8,
  stroke: 'none',
  strokeWidth: 2,
  sx: {},
};

export const defaultBoxPlotOptions = {
  alignment: 'center',
  cornerRadius: 2,
  className: '',
  fill: dataVizColors['tropical-indigo'],
  paddingFactor: 0.8,
  // stroke broken out for each plot element
  strokeBox: 'none',
  strokeMedian: '#ffffff88',
  strokeWhisker: dataVizColors['tropical-indigo'],
  strokeWidth: 2,
  sx: {},
};

export const defaultCircleOptions = {
  className: '',
  fill: dataVizColors['tropical-indigo'],
  stroke: 'none',
  radius: 4,
  sx: {},
};
