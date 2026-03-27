import { timeFormatter, dataVizColors } from 'desi-charts';

export const demoOptions = {
  bar: {
    series: [
      {
        type: 'bar',
        xKey: 'date',
        yKey: 'series1.mean',
        yName: 'Temperature',
        isVisible: true,
        stroke: '',
        fill: dataVizColors['tropical-indigo'],
        alignment: 'right', // 'left', 'right' or 'center'
        paddingFactor: 0.8, // how much of the band to fill with the bar (0-1)
        cornerRadius: 2, // for rounded corners, in pixels
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: timeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
        nice: false,
        sx: {},
      },
      y: {
        type: 'linear',
        title: { text: 'Temperature (F)' },
        ticks: { values: [], labels: [], amount: 10 }, // default will print values, then labels if provided
        // default domain will compute max and min from data
        domainMin: 0, // optional
        domainMax: 100, // optional
        hasAxisLine: false,
        hasGridLines: true,
        sx: {},
      },
    },
    readout: {
      hoverMode: 'local', // or 'global'
    },
    animationDuration: 1000, // in ms
  },
  line: {
    series: [
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.mean',
        yName: 'Temperature',
        isVisible: true,
        stroke: dataVizColors.tangerine,
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: timeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
        nice: false,
      },
      y: {
        type: 'linear',
        title: { text: 'Temperature (F)' },
        ticks: { values: [], labels: [], amount: 10 }, // default will print values, then labels if provided
        nice: true,
        hasAxisLine: false,
        hasGridLines: true,
      },
    },
    readout: {
      hoverMode: 'local', // or 'global'
    },
    animationDuration: 1000, // in ms
  },
  multiLine: {
    series: [
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p10',
        yName: 'Temperature',
        isVisible: true,
        stroke: dataVizColors.violet,
      },
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p50',
        yName: 'Temperature',
        isVisible: true,
        stroke: dataVizColors.green,
      },
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p90',
        yName: 'Temperature',
        isVisible: true,
        stroke: dataVizColors.yellow,
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: timeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
        nice: false,
      },
      y: {
        type: 'linear',
        title: { text: 'Temperature (F)' },
        ticks: { values: [], labels: [], amount: 10 }, // default will print values, then labels if provided
        nice: true,
        hasAxisLine: false,
        hasGridLines: true,
      },
    },
    readout: {
      hoverMode: 'local', // or 'global'
    },
    animationDuration: 1000, // in ms
  },
  boxPlot: {
    series: [
      {
        type: 'boxPlot',
        xKey: 'date',
        minYKey: 'series1.p10',
        q1YKey: 'series1.p25',
        medianYKey: 'series1.p50',
        q3YKey: 'series1.p75',
        maxYKey: 'series1.p90',
        yName: 'Temperature',
        isVisible: true,
        fill: dataVizColors.magenta,
        strokeWhisker: dataVizColors.magenta,
        alignment: 'right',
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: timeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
        nice: false,
      },
      y: {
        type: 'linear',
        title: { text: 'Temperature (F)' },
        ticks: { values: [], labels: [], amount: 10 }, // default will print values, then labels if provided
        nice: true,
        hasAxisLine: false,
        hasGridLines: true,
      },
    },
    readout: {
      hoverMode: 'local', // or 'global'
    },
    animationDuration: 1000, // in ms
  },
};
