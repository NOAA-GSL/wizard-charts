import { ChartContainer, timeFormatter } from '@noaa-gsl/wizard-charts';
import '@noaa-gsl/wizard-charts/styles.css';
import { testData } from '../data/testData';

const testOptions = {
  series: [
    {
      type: 'area',
      xKey: 'date',
      q1YKey: 'series.p25',
      q3YKey: 'series.p75',
      name: 'Temperature',
      fill: `#fafe8888`,
      stroke: '#fafe88',
    },
  ],
  axes: {
    // can also use the default x and y
    x: {
      type: 'linear', // band, linear, log, time
      ticks: { formatter: timeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
      nice: false,
      hasGridLines: true,
    },
    y: {
      type: 'linear',
      label: { text: 'Temperature' },
      ticks: { values: [], labels: [], amount: 10 }, // default will print values, then labels if provided
      nice: true,
      hasAxisLine: false,
      hasGridLines: true,
      units: 'F',
    },
  },
  readout: {
    hoverMode: 'local', // or 'global'
    areaFields: ['max', 'q1', 'min'], // which fields to show in the readout for area charts
    titleFormatter: (xValue) => `${timeFormatter('%m-%d %Hz')(xValue)}`,
  },
  animationDuration: 1000, // in ms
};

const userOptions = {
  series: [
    {
      type: 'area',
      name: 'Uncertainty Interval (p10-p90)',
      xKey: 'date',
      q1YKey: 'series.p10',
      q3YKey: 'series.p90',
      fill: '#0186c4',
      stroke: 'none',
      units: 'cfs',
      strokeWhisker: '#0186c4',
      isVisible: 'true',
      readoutPrecision: 1,
    },
    {
      type: 'area',
      name: 'Likely Range (p25-p75)',
      xKey: 'date',
      q1YKey: 'series.p25',
      q3YKey: 'series.p75',
      fill: '#019601',
      stroke: 'none',
      strokeWidth: 2,
      strokeWhisker: '#019601',
      isVisible: 'true',
      units: 'cfs',
      readoutPrecision: 1,
    },
  ],
  axes: {
    x: {
      type: 'time',
      label: { text: 'Time (UTC)', fontSize: 10 },
      ticks: { formatter: timeFormatter('%a %-m/%-d %Hz'), amount: 4 },
      hasGridLines: true,
      // strokeGrid: 'var(--border)',
    },
    y: {
      type: 'linear',
      nice: true,
      hasGridLines: true,
      label: { text: `Flow (cfs)`, fontSize: 10 },
      // strokeGrid: 'var(--border)',
    },
  },
  readout: {
    hoverMode: 'local',
    tooltip: {
      strokeWidth: 1,
      fillOpacity: 1,
    },
    areaFields: ['q1', 'q3'],
  },
};

function TestingData() {
  return (
    <ChartContainer
      height={600}
      width={1200}
      data={testData}
      options={userOptions}
    />
  );
}

export default TestingData;
