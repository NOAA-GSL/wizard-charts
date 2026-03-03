import { dataVizColors } from './helperFunctions';
import { timeFormatter } from 'desi-charts';

export const demoOptions = {
  bar: {
    series: [
      {
        type: 'bar',
        xKey: 'date',
        yKey: 'series1.mean',
        xAxisKey: 'x',
        yAxisKey: 'y',
        yName: 'Temperature',
        isVisible: true,
        stroke: '',
        fill: dataVizColors['tropical-indigo'],
        className: '',
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: timeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
        // default domain will compute max and min from data
        // domainMin: 0, // optional
        // domainMax: 100, // optional
        nice: false,
        className: '',
        hasGridlines: true,
        sx: {},
      },
      y: {
        type: 'linear',
        title: { text: 'Temperature (F)' },
        ticks: { values: [], labels: [], amount: 10 }, // default will print values, then labels if provided
        // default domain will compute max and min from data
        // domainMin: 0, // optional
        // domainMax: 100, // optional
        nice: false,
        className: '',
        hasGridlines: true,
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
        xAxisKey: 'x', // default
        yAxisKey: 'y', // default
        yName: 'Temperature',
        isVisible: true,
        stroke: dataVizColors.tangerine,
        fill: '',
        className: '',
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: timeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
        // default domain will compute max and min from data
        // domainMin: 0, // optional
        // domainMax: 100, // optional
        nice: false,
        className: '',
        hasGridlines: true,
        sx: {},
      },
      y: {
        type: 'linear',
        title: { text: 'Temperature (F)' },
        ticks: { values: [], labels: [], amount: 10 }, // default will print values, then labels if provided
        // default domain will compute max and min from data
        // domainMin: 0, // optional
        // domainMax: 100, // optional
        nice: false,
        className: '',
        hasGridlines: true,
        sx: {},
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
        xAxisKey: 'x', // default
        yAxisKey: 'y', // default
        yName: 'Temperature',
        isVisible: true,
        stroke: dataVizColors.violet,
        fill: '',
        className: '',
      },
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p50',
        xAxisKey: 'x', // default
        yAxisKey: 'y', // default
        yName: 'Temperature',
        isVisible: true,
        stroke: dataVizColors.green,
        fill: '',
        className: '',
      },
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p90',
        xAxisKey: 'x', // default
        yAxisKey: 'y', // default
        yName: 'Temperature',
        isVisible: true,
        stroke: dataVizColors.yellow,
        fill: '',
        className: '',
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: timeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
        // default domain will compute max and min from data
        // domainMin: 0, // optional
        // domainMax: 100, // optional
        nice: false,
        className: '',
        hasGridlines: true,
        sx: {},
      },
      y: {
        type: 'linear',
        title: { text: 'Temperature (F)' },
        ticks: { values: [], labels: [], amount: 10 }, // default will print values, then labels if provided
        // default domain will compute max and min from data
        // domainMin: 0, // optional
        // domainMax: 100, // optional
        nice: false,
        className: '',
        hasGridlines: true,
        sx: {},
      },
    },
    readout: {
      hoverMode: 'local', // or 'global'
    },
    animationDuration: 1000, // in ms
  },
};
