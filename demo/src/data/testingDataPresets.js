import { timeFormatter } from '@noaa-gsl/wizard-charts';
import { testData } from './testData';

export const areaPlotDefaultOptions = {
  series: [
    {
      type: 'area',
      name: 'Uncertainty Interval (p10-p90)',
      xKey: 'date',
      q1YKey: 'series.p10',
      q3YKey: 'series.p90',
      fill: '#459fd388',
      stroke: '#459fd3',
      units: 'cfs',
      strokeWhisker: '#459fd3',
      readoutPrecision: 1,
    },
    {
      type: 'area',
      name: 'Likely Range (p25-p75)',
      xKey: 'date',
      q1YKey: 'series.p25',
      q3YKey: 'series.p75',
      fill: '#31b55f88',
      stroke: '#31b55f',
      strokeWidth: 2,
      strokeWhisker: '#31b55f',
      units: 'cfs',
      readoutPrecision: 1,
    },
  ],
  axes: {
    x: {
      type: 'time',
      label: { text: 'Time (UTC)', fontSize: 10 },
      ticks: { formatter: timeFormatter('%a %-m/%-d %Hz'), amount: 6 },
      hasGridLines: true,
    },
    y: {
      type: 'linear',
      nice: true,
      hasGridLines: true,
      label: { text: 'Flow (cfs)', fontSize: 10 },
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

export const testingDataPresets = {
  data: [
    {
      id: 'cfs-data',
      label: 'CFS data',
      value: testData,
      source: JSON.stringify(testData, null, 2),
    },
  ],
  options: [
    {
      id: 'area-plot',
      label: 'Area plot',
      value: areaPlotDefaultOptions,
      source: JSON.stringify(areaPlotDefaultOptions, null, 2),
    },
  ],
};
