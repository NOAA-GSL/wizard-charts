import { timeFormatter, dataVizColors } from '@noaa-gsl/wizard-charts';

const matrixCategories = ['model1', 'model2', 'model3', 'model4'];
const matrixStartDate = new Date('2026-01-01T00:00:00Z');
const matrixDates = Array.from(
  { length: 12 },
  (_, i) => new Date(matrixStartDate.getTime() + i * 24 * 3600_000),
);

const matrixData = matrixDates.flatMap((date, dateIndex) =>
  matrixCategories.map((category, categoryIndex) => {
    const base = 45 + dateIndex * 1.8 + categoryIndex * 5.5;
    const wave = Math.sin((dateIndex + categoryIndex) / 2) * 7;
    const value = Math.round((base + wave) * 10) / 10;
    return {
      date,
      category,
      value,
      label: `${value.toFixed(1)}F`,
    };
  }),
);

const heatmapLevels = Array.from({ length: 16 }, (_, i) => i * 400);
const heatmapLinearSteps = Array.from({ length: 42 }, (_, i) => i);
const heatmapTimeSteps = Array.from(
  { length: 42 },
  (_, i) => new Date(matrixStartDate.getTime() + i * 6 * 3600_000),
);

function makeHeatValue(xNorm, yNorm) {
  const ridgeA = Math.exp(
    -((xNorm - 0.32) ** 2 / 0.018 + (yNorm - 0.55) ** 2 / 0.06),
  );
  const ridgeB = Math.exp(
    -((xNorm - 0.72) ** 2 / 0.03 + (yNorm - 0.28) ** 2 / 0.03),
  );
  const wave =
    0.4 * Math.sin(xNorm * Math.PI * 5.5) * Math.cos(yNorm * Math.PI * 2.2);
  return 15 + ridgeA * 32 + ridgeB * 22 + wave * 8;
}

const heatmapLinearData = heatmapLinearSteps.flatMap((xStep, xi) => {
  const xNorm =
    heatmapLinearSteps.length > 1 ? xi / (heatmapLinearSteps.length - 1) : 0;
  return heatmapLevels.map((level, yi) => {
    const yNorm =
      heatmapLevels.length > 1 ? yi / (heatmapLevels.length - 1) : 0;
    return {
      step: xStep,
      level,
      value: Math.round(makeHeatValue(xNorm, yNorm) * 10) / 10,
    };
  });
});

const heatmapTimeData = heatmapTimeSteps.flatMap((timestamp, xi) => {
  const xNorm =
    heatmapTimeSteps.length > 1 ? xi / (heatmapTimeSteps.length - 1) : 0;
  return heatmapLevels.map((level, yi) => {
    const yNorm =
      heatmapLevels.length > 1 ? yi / (heatmapLevels.length - 1) : 0;
    return {
      time: timestamp,
      level,
      value: Math.round(makeHeatValue(xNorm, yNorm) * 10) / 10,
    };
  });
});

export const demoOptions = {
  bar: {
    series: [
      {
        type: 'bar',
        xKey: 'date',
        yKey: 'series1.mean',
        fill: dataVizColors.tropicalIndigo,
        alignment: 'left', // 'left', 'right' or 'center'
        paddingFactor: 0.8, // how much of the band to fill with the bar (0-1)
        cornerRadius: 2, // for rounded corners, in pixels
      },
      {
        type: 'line',
        xKey: 'date',
        yKey: 'series2.mean',
        stroke: dataVizColors.tangerine,
        isSecondaryYAxis: true,
        strokeWidth: 5,
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
        // domainMin: 0, // optional
        // domainMax: 100, // optional
        hasAxisLine: false,
        hasGridLines: true,
        sx: {},
      },
      y2: {
        type: 'linear',
        nice: true,
        hasAxisLine: false,
      },
    },
    readout: {
      hoverMode: 'local', // or 'global'
    },
    animationDuration: 1000, // in ms
  },
  stackedBar: {
    series: [
      {
        type: 'bar',
        xKey: 'date',
        yKey: 'series1.p90',
        yName: 'Series 1',
        fill: dataVizColors.seaGreen,
        stacked: true,
        isCumulative: false,
        alignment: 'right',
      },
      {
        type: 'bar',
        xKey: 'date',
        yKey: 'series1.p50',
        yName: 'Series 1',
        fill: dataVizColors.tangerine,
        stacked: true,
        isCumulative: false,
        alignment: 'right',
      },
      {
        type: 'bar',
        xKey: 'date',
        yKey: 'series1.p10',
        yName: 'Series 1',
        fill: dataVizColors.violet,
        stacked: true,
        isCumulative: false,
        alignment: 'right',
      },
    ],
    axes: {
      x: {
        type: 'linear',
        ticks: { formatter: timeFormatter('%m-%d %Hz') },
        nice: false,
      },
      y: {
        type: 'linear',
        title: { text: 'Temperature (F)' },
        ticks: { values: [], labels: [], amount: 10 },
        hasAxisLine: false,
        hasGridLines: true,
      },
    },
    readout: {
      hoverMode: 'local',
    },
    animationDuration: 1000,
  },
  multiLine: {
    series: [
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p10',
        yName: 'Temperature',
        stroke: dataVizColors.violet,
      },
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p50',
        yName: 'Temperature',
        stroke: dataVizColors.green,
      },
      {
        type: 'line', // or 'bar'
        xKey: 'date', // support dot notation
        yKey: 'series2.p90',
        yName: 'Temperature',
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
  circle: {
    series: [
      {
        type: 'circle',
        xKey: 'date',
        yKey: 'series1.p50',
        yName: 'Temperature',
        fill: `${dataVizColors.lime}88`, // with some transparency
        stroke: dataVizColors.yellow,
        radius: 4,
        isSecondaryYAxis: true,
      },
      {
        type: 'line',
        xKey: 'date',
        yKey: 'series2.p90',
        yName: 'Temperature',
        stroke: dataVizColors.violet,
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
      y2: {
        type: 'linear',
        nice: true,
        hasAxisLine: false,
      },
    },
    readout: {
      hoverMode: 'local', // or 'global'
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
        yName: 'Temperature',
        fill: `${dataVizColors.green}88`,
        stroke: dataVizColors.green,
        strokeWhisker: dataVizColors.green,
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
        ticks: { formatter: timeFormatter('%m-%d') },
      },
      y: {
        type: 'band',
      },
    },
    animationDuration: 750,
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
        ticks: { formatter: timeFormatter('%m-%d') },
      },
      y: {
        type: 'band',
      },
    },
    animationDuration: 750,
  },
  heatmap: {
    series: [
      {
        type: 'heatmap',
        data: heatmapLinearData,
        xKey: 'step',
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
        gridSize: [88, 44],
        showContourFill: true,
        showContourLines: true,
        contourLineWidth: 0.9,
      },
    ],
    axes: {
      x: {
        type: 'linear',
      },
      y: {
        type: 'linear',
      },
    },
    animationDuration: 600,
  },
  heatmapTime: {
    series: [
      {
        type: 'heatmap',
        data: heatmapTimeData,
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
        gridSize: [88, 44],
        showContourFill: true,
        showContourLines: true,
        contourLineWidth: 0.9,
      },
    ],
    axes: {
      x: {
        type: 'time',
        ticks: { formatter: timeFormatter('%m-%d %Hz') },
      },
      y: {
        type: 'linear',
      },
    },
    animationDuration: 600,
  },
};
