const defaultOptions = {
  series: [],
  axes: {},
  readout: {
    hoverMode: 'local',
  },
};

const defaultSeriesOptions = {
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
};

const defaultAxisOptions = {
  type: 'linear', // band, linear, log, time
  // default domain will compute max and min from data
  domainMin: undefined, // optional
  domainMax: undefined, // optional
  label: { text: '', fontSize: 14, fontWeight: 700, fontFamily: 'sans-serif' },
  hasAxisLine: true,
  hasGridLines: false,
  nice: false,
  className: '',
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
const seriesAccessorProps = {
  x: ['xKey', 'minXKey', 'q1XKey', 'medianXKey', 'q3XKey', 'maxXKey'],
  y: ['yKey', 'minYKey', 'q1YKey', 'medianYKey', 'q3YKey', 'maxYKey'],
};

export {
  defaultOptions,
  defaultSeriesOptions,
  defaultAxisOptions,
  seriesAccessorProps,
};
