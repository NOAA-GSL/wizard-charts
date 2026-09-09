import { timeFormatter } from '@noaa-gsl/wizard-charts';
import { demoOptions } from '../demoOptions';
import * as demoDatasets from './demoDatasets';
import { testDataCfs, testDataWind } from './testData';

const evaluatePresetSource = (source, sourceName) => {
  try {
    return new Function(
      'timeFormatter',
      'demoOptions',
      'demoDatasets',
      `'use strict'; return (${source});`,
    )(timeFormatter, demoOptions, demoDatasets);
  } catch (error) {
    throw new Error(
      `Failed to evaluate ${sourceName}: ${
        error instanceof Error ? error.message : 'Invalid preset source.'
      }`,
    );
  }
};

const createOptionsPreset = ({ id, label, source }) => ({
  id,
  label,
  source,
  value: evaluatePresetSource(source, `${label} options preset`),
});

const createDemoDatasetPreset = ({ id, label, exportName }) => ({
  id,
  label,
  source: `demoDatasets.${exportName}`,
  value: demoDatasets[exportName],
});

const formatDemoOptionLabel = (optionKey) =>
  optionKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (character) => character.toUpperCase());

const createDemoOptionsPreset = ([optionKey]) =>
  createOptionsPreset({
    id: `demo-${optionKey}`,
    label: `Demo ${formatDemoOptionLabel(optionKey)}`,
    source: `demoOptions.${optionKey}`,
  });

const areaPlotDefaultOptionsSource = `{
  "series": [
    {
      "type": "area",
      "name": "Uncertainty Interval (p10-p90)",
      "xKey": "date",
      "q1YKey": "series.p10",
      "q3YKey": "series.p90",
      "fill": "#459fd388",
      "stroke": "#459fd3",
      "units": "cfs",
      "strokeWhisker": "#459fd3",
      "readoutPrecision": 1
    },
    {
      "type": "area",
      "name": "Likely Range (p25-p75)",
      "xKey": "date",
      "q1YKey": "series.p25",
      "q3YKey": "series.p75",
      "fill": "#31b55f88",
      "stroke": "#31b55f",
      "strokeWidth": 2,
      "strokeWhisker": "#31b55f",
      "units": "cfs",
      "readoutPrecision": 1
    }
  ],
  "axes": {
    "x": {
      "type": "time",
      "label": {
        "text": "Time (UTC)",
        "fontSize": 10
      },
      "ticks": {
        "formatter": timeFormatter("%a %-m/%-d %Hz"),
        "amount": 6
      },
      "hasGridLines": true
    },
    "y": {
      "type": "linear",
      "nice": true,
      "hasGridLines": true,
      "label": {
        "text": "Flow (cfs)",
        "fontSize": 10
      }
    }
  },
  "readout": {
    "hoverMode": "local",
    "tooltip": {
      "strokeWidth": 1,
      "fillOpacity": 1
    },
    "areaFields": [
      "q1",
      "q3"
    ]
  }
}`;

const windBarbPresetSource = `{
  "series": [
    {
      "type": "windBarbs",
      "name": "Wind",
      "xKey": "date",
      "yKey": "series.speed",
      "speedKey": "series.speed",
      "directionKey": "series.direction",
      "color": "#459fd3",
      "units": "kts",
      "size": 30
    }
  ],
  "axes": {
    "x": {
      "type": "time",
      "nice": true,
      "label": {
        "text": "Time (UTC)",
        "fontSize": 10
      },
      "ticks": {
        "amount": 8,
        "formatter": timeFormatter("%m-%d %Hz")
      },
      "hasGridLines": true
    },
    "y": {
      "type": "linear",
      "nice": true,
      "hasGridLines": true,
      "label": {
        "text": "Wind Speed (kts)",
        "fontSize": 10
      }
    }
  },
  "readout": {
    "hoverMode": "local",
    "tooltip": {
      "strokeWidth": 1,
      "fillOpacity": 1
    }
  }
}`;

export const testingDataPresets = {
  data: [
    {
      id: 'cfs-data',
      label: 'CFS data',
      value: testDataCfs,
      source: JSON.stringify(testDataCfs, null, 2),
    },
    {
      id: 'wind-data',
      label: 'Wind data',
      value: testDataWind,
      source: JSON.stringify(testDataWind, null, 2),
    },
    createDemoDatasetPreset({
      id: 'demo-time-series-data',
      label: 'Demo time series data',
      exportName: 'timeSeriesDemoData',
    }),
    createDemoDatasetPreset({
      id: 'demo-matrix-data',
      label: 'Demo matrix data',
      exportName: 'matrixData',
    }),
    createDemoDatasetPreset({
      id: 'demo-heatmap-data',
      label: 'Demo heatmap data',
      exportName: 'heatmapData',
    }),
    createDemoDatasetPreset({
      id: 'demo-wind-barb-pressure-data',
      label: 'Demo wind barb pressure data',
      exportName: 'windBarbStandaloneData',
    }),
    createDemoDatasetPreset({
      id: 'demo-wind-barb-overlay-data',
      label: 'Demo wind barb overlay data',
      exportName: 'windBarbOverlayData',
    }),
    createDemoDatasetPreset({
      id: 'demo-surface-wind-data',
      label: 'Demo surface wind data',
      exportName: 'surfaceWindData',
    }),
  ],
  options: [
    createOptionsPreset({
      id: 'area-plot',
      label: 'Area plot',
      source: areaPlotDefaultOptionsSource,
    }),
    createOptionsPreset({
      id: 'wind-barb',
      label: 'Wind Barb',
      source: windBarbPresetSource,
    }),
    ...Object.entries(demoOptions).map(createDemoOptionsPreset),
  ],
};
