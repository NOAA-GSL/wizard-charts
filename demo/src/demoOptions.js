import { utcTimeFormatter, dataVizColors } from '@noaa-gsl/wizard-charts';
import {
  heatmapData,
  matrixData,
  surfaceWindData,
  windBarbOverlayData,
  windBarbStandaloneData,
} from './data/demoDatasets';

export const demoOptions = {
  bar: {
    series: [
      {
        type: 'bar',
        xKey: 'date',
        yKey: 'series1.mean',
        name: 'Mean Temperature',
        fill: dataVizColors.tropicalIndigo,
        alignment: 'left', // 'left', 'right' or 'center'
        paddingFactor: 0.8, // how much of the band to fill with the bar (0-1)
        cornerRadius: 2, // for rounded corners, in pixels
      },
      {
        type: 'line',
        xKey: 'date',
        yKey: 'series2.mean',
        name: 'Mean Wind Speed',
        stroke: dataVizColors.tangerine,
        isSecondaryYAxis: true,
        strokeWidth: 5,
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        label: { text: 'Date' },
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz'), amount: 4 }, // optional formatting function for ticks
        nice: false,
        hasGridLines: true,
        lineMarkers: [
          {
            value: new Date(new Date().getTime() + 60 * 60 * 24 * 1000), // 1 day from now
            label: 'T+24h',
            placement: 'top-right',
            padding: { edge: 8, line: 8 },
            stroke: '#147AF3',
            strokeWidth: 2,
            strokeDasharray: '4 2',
            fontColor: '#147AF3',
            fontWeight: 700,
          },
        ],
      },
      y: {
        type: 'linear',
        label: { text: 'Temperature' },
        nice: true,
        ticks: {
          values: [],
          labels: [],
          amount: 4,
        },
        hasAxisLine: false,
        hasGridLines: true,
        units: 'F',
      },
      y2: {
        type: 'linear',
        hasAxisLine: false,
        label: { text: 'Wind Speed' },
        units: 'mph',
        lineMarkers: [
          {
            value: 30,
            label: 'Wind Advisory',
            placement: 'top-left',
            labelPadding: 8,
            padding: 8,
            stroke: '#e38b1e',
            strokeWidth: 2,
            strokeDasharray: '3 3',
            fontColor: '#e38b1e',
            fontWeight: 700,
            includeInDomain: true,
            labelBackgroundFill: '#2d2d2d',
            labelBackgroundStroke: '#e38b1e',
          },
          {
            value: 40,
            label: 'High Wind Warning',
            placement: 'top-left',
            labelPadding: 8,
            padding: 8,
            stroke: '#f0562b',
            strokeWidth: 2,
            strokeDasharray: '3 3',
            fontColor: '#f0562b',
            fontWeight: 700,
            includeInDomain: true,
            labelBackgroundFill: '#2d2d2d',
            labelBackgroundStroke: '#f0562b',
          },
        ],
      },
    },
    legend: {
      markerSize: 20,
      gap: 5,
      itemGap: 20,
      fontSize: 20,
      fontColor: dataVizColors.malachite,
    },
    readout: {
      hoverMode: 'local', // or 'global'
      titleFormatter: (xValue) => `${utcTimeFormatter('%m-%d %Hz')(xValue)}`,
    },
    animationDuration: 1000, // in ms
  },
  stackedBar: {
    series: [
      {
        type: 'bar',
        xKey: 'date',
        yKey: 'series1.p90',
        name: '90th Percentile',
        fill: dataVizColors.seaGreen,
        stacked: true,
        isCumulative: false,
        alignment: 'right',
      },
      {
        type: 'bar',
        xKey: 'date',
        yKey: 'series1.p50',
        name: 'Median',
        fill: dataVizColors.tangerine,
        stacked: true,
        isCumulative: false,
        alignment: 'right',
      },
      {
        type: 'bar',
        xKey: 'date',
        yKey: 'series1.p10',
        name: '10th Percentile',
        fill: dataVizColors.violet,
        stacked: true,
        isCumulative: false,
        alignment: 'right',
      },
    ],
    axes: {
      x: {
        type: 'linear',
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') },
        nice: false,
        hasGridLines: true,
      },
      y: {
        type: 'linear',
        label: { text: 'Temperature' },
        ticks: { values: [], labels: [], amount: 10 },
        hasAxisLine: false,
        hasGridLines: true,
        units: 'F',
      },
    },
    readout: {
      hoverMode: 'local',
      titleFormatter: (xValue) => `${utcTimeFormatter('%m-%d %Hz')(xValue)}`,
    },
    animationDuration: 1000,
  },
  multiLine: {
    series: [
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p10',
        name: '10th Percentile',
        stroke: dataVizColors.violet,
      },
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p50',
        name: 'Median',
        stroke: dataVizColors.green,
      },
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p90',
        name: '90th Percentile',
        stroke: dataVizColors.yellow,
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
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
      titleFormatter: (xValue) => `${utcTimeFormatter('%m-%d %Hz')(xValue)}`,
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
        name: 'Temperature',
        fill: dataVizColors.magenta,
        strokeWhisker: dataVizColors.magenta,
        alignment: 'right',
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
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
      hoverMode: 'local', // or 'global',
      boxPlotFields: ['max', 'q3', 'median', 'q1', 'min'],
      titleFormatter: (xValue) => `${utcTimeFormatter('%m-%d %Hz')(xValue)}`,
    },
    animationDuration: 1000, // in ms
  },
  circle: {
    series: [
      {
        type: 'circle',
        xKey: 'date',
        yKey: 'series1.p50',
        name: 'Wind Speed',
        fill: `${dataVizColors.lime}88`, // with some transparency
        stroke: dataVizColors.yellow,
        radius: 4,
        isSecondaryYAxis: true,
      },
      {
        type: 'line',
        xKey: 'date',
        yKey: 'series2.p90',
        name: 'Temperature',
        stroke: dataVizColors.violet,
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
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
      y2: {
        type: 'linear',
        label: { text: 'Wind Speed' },
        nice: true,
        hasAxisLine: false,
        units: 'mph',
      },
    },
    readout: {
      hoverMode: 'local', // or 'global'
      titleFormatter: (xValue) => `${utcTimeFormatter('%m-%d %Hz')(xValue)}`,
    },
    animationDuration: 1000, // in ms
  },
  area: {
    series: [
      {
        type: 'area',
        xKey: 'date',
        minYKey: 'series1.p10',
        q1YKey: 'series1.p25',
        medianYKey: 'series1.p50',
        q3YKey: 'series1.p75',
        maxYKey: 'series1.p90',
        name: 'Temperature',
        fill: `${dataVizColors.green}88`,
        stroke: dataVizColors.green,
        strokeWhisker: dataVizColors.green,
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'linear', // band, linear, log, time
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') }, // optional formatting function for ticks
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
      titleFormatter: (xValue) => `${utcTimeFormatter('%m-%d %Hz')(xValue)}`,
    },
    animationDuration: 1000, // in ms
  },
  areaStacked: {
    series: [
      {
        type: 'areaStacked',
        xKey: 'date',
        name: 'Temperature Probability',
        bands: [
          {
            lowerKey: 'series1.p05',
            upperKey: 'series1.p95',
            lowerLabel: '5th',
            upperLabel: '95th',
            fill: `${dataVizColors.tangerine}55`,
          },
          {
            lowerKey: 'series1.p10',
            upperKey: 'series1.p90',
            lowerLabel: '10th',
            upperLabel: '90th',
            fill: dataVizColors.tangerine,
          },
          {
            lowerKey: 'series1.p25',
            upperKey: 'series1.p75',
            lowerLabel: '25th',
            upperLabel: '75th',
            fill: dataVizColors.alloyOrange,
          },
        ],
        medianKey: 'series1.p50',
        medianField: 'p50',
        medianLabel: '50th',
        medianStroke: dataVizColors.palatinateBlue,
        medianStrokeWidth: 2.5,
      },
    ],
    axes: {
      x: {
        type: 'linear',
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') },
        nice: false,
        hasGridLines: true,
      },
      y: {
        type: 'linear',
        label: { text: 'Temperature' },
        ticks: { values: [], labels: [], amount: 10 },
        nice: true,
        hasAxisLine: false,
        hasGridLines: true,
        units: 'F',
      },
    },
    readout: {
      hoverMode: 'local',
      areaFields: ['p05', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95'],
      titleFormatter: (xValue) => `${utcTimeFormatter('%m-%d %Hz')(xValue)}`,
    },
    animationDuration: 1000,
  },
  matrix: {
    series: [
      {
        type: 'matrix',
        data: matrixData,
        xKey: 'date',
        yKey: 'category',
        valueKey: 'value',
        labelKey: 'label',
        showLabels: true,
        thresholds: [50, 58, 66, 74],
        colors: ['#1f3b66', '#245f8f', '#2c8f9f', '#5ac18e', '#d4e77a'],
        timeAnchor: 'center',
      },
    ],
    axes: {
      x: {
        type: 'band',
        ticks: { formatter: utcTimeFormatter('%m-%d') },
      },
      y: {
        type: 'band',
      },
    },
    animationDuration: 1000,
  },
  matrixTime: {
    series: [
      {
        type: 'matrix',
        data: matrixData,
        xKey: 'date',
        yKey: 'category',
        valueKey: 'value',
        thresholds: [50, 58, 66, 74],
        colors: ['#1f3b66', '#245f8f', '#2c8f9f', '#5ac18e', '#d4e77a'],
        timeAnchor: 'end',
        cellWidthFactor: 1,
      },
    ],
    axes: {
      x: {
        type: 'time',
        ticks: { formatter: utcTimeFormatter('%m-%d') },
      },
      y: {
        type: 'band',
      },
    },
    animationDuration: 1000,
  },
  heatmap: {
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        xKey: 'time',
        yKey: 'level',
        valueKey: 'value',
        thresholds: [20, 26, 32, 38, 44],
        colors: [
          '#17324f',
          '#1f5f82',
          '#2f8f9d',
          '#5ebf9a',
          '#b7d77a',
          '#f2de85',
        ],
        showContourFill: false,
        showContourLines: true,
        contourLineWidth: 2,
      },
    ],
    axes: {
      x: {
        type: 'linear',
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') },
      },
      y: {
        type: 'linear',
      },
    },
    animationDuration: 1000,
  },
  heatmapTime: {
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        xKey: 'time',
        yKey: 'level',
        valueKey: 'value',
        thresholds: [20, 26, 32, 38, 44],
        colors: [
          '#17324f',
          '#1f5f82',
          '#2f8f9d',
          '#5ebf9a',
          '#b7d77a',
          '#f2de85',
        ],
        showContourFill: true,
        showContourLines: false,
      },
    ],
    axes: {
      x: {
        type: 'time',
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') },
      },
      y: {
        type: 'linear',
      },
    },
    animationDuration: 1000,
  },
  contourGridNearest: {
    series: [
      {
        type: 'contourGrid',
        name: 'Gridded Field (Nearest)',
        data: heatmapData,
        xKey: 'time',
        yKey: 'level',
        valueKey: 'value',
        thresholds: [20, 26, 32, 38, 44],
        colors: [
          '#17324f',
          '#1f5f82',
          '#2f8f9d',
          '#5ebf9a',
          '#b7d77a',
          '#f2de85',
        ],
        showContourFill: false,
        showContourLines: true,
        contourLineWidth: 2,
        readoutSamplingMode: 'nearest',
      },
    ],
    axes: {
      x: {
        type: 'time',
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') },
      },
      y: {
        type: 'linear',
      },
    },
    readout: {
      hoverMode: 'local',
    },
    animationDuration: 1000,
  },
  windBarbs: {
    series: [
      {
        type: 'windBarbs',
        data: windBarbStandaloneData,
        xKey: 'time',
        yKey: 'level',
        speedKey: 'speed',
        directionKey: 'direction',
        name: 'Wind',
        color: '#e8e8e8',
        readoutSamplingMode: 'nearest',
        size: 28,
        strokeWidth: 1.5,
        units: 'kt',
      },
    ],
    axes: {
      x: {
        type: 'time',
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') },
      },
      y: {
        type: 'linear',
        isReversed: true,
        label: { text: 'Pressure' },
        units: 'hPa',
        nice: true,
      },
    },
  },
  windBarbsContourGrid: {
    series: [
      {
        type: 'contourGrid',
        name: 'Scalar Field',
        data: heatmapData,
        xKey: 'time',
        yKey: 'level',
        valueKey: 'value',
        thresholds: [20, 26, 32, 38, 44],
        colors: [
          '#17324f',
          '#1f5f82',
          '#2f8f9d',
          '#5ebf9a',
          '#b7d77a',
          '#f2de85',
        ],
        showContourFill: true,
        showContourLines: true,
        contourLineWidth: 1,
        readoutSamplingMode: 'interpolate',
      },
      {
        type: 'windBarbs',
        data: windBarbOverlayData,
        xKey: 'time',
        yKey: 'level',
        speedKey: 'speed',
        directionKey: 'direction',
        name: 'Wind',
        color: '#578df1',
        size: 20,
        strokeWidth: 1.5,
        units: 'kt',
        readoutSamplingMode: 'interpolate',
      },
    ],
    axes: {
      x: {
        type: 'time',
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') },
      },
      y: {
        type: 'linear',
        label: { text: 'Altitude (m AGL)' },
      },
    },
    readout: {
      hoverMode: 'local',
    },
  },
  windBarbsSurface: {
    series: [
      {
        type: 'windBarbs',
        data: surfaceWindData,
        xKey: 'time',
        // yKey and speedKey both reference 'speed': each barb sits at its own
        // speed value on the y-axis so position, shape, and direction all
        // encode wind information simultaneously.
        yKey: 'speed',
        speedKey: 'speed',
        directionKey: 'direction',
        name: 'Surface Wind',
        color: '#e8e8e8',
        readoutSamplingMode: 'nearest',
        size: 24,
        strokeWidth: 1.5,
        units: 'kt',
      },
    ],
    axes: {
      x: {
        type: 'time',
        ticks: { formatter: utcTimeFormatter('%m-%d %Hz') },
      },
      y: {
        type: 'linear',
        label: { text: 'Wind Speed' },
        units: 'kt',
        nice: true,
        domainMin: 0,
      },
    },
    readout: {
      titleFormatter: (xValue) => `${utcTimeFormatter('%m-%d %Hz')(xValue)}`,
    },
  },
};
