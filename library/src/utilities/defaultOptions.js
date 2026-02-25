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
  xAxisPosition: 'bottom',
  yAxisPosition: 'left',
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
  },
};

export { defaultOptions, defaultSeriesOptions, defaultAxisOptions };
