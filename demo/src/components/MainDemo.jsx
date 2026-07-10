import { useState } from 'react';
import { ChartContainer, HoverPointProvider } from '@noaa-gsl/wizard-charts';
import InputSlider from './InputSlider';
import { generateRandomData } from '../helperFunctions';
import '@noaa-gsl/wizard-charts/styles.css';
import { demoOptions } from '../demoOptions';

const localChartTypes = [
  'bar',
  'stackedBar',
  'multiLine',
  'boxPlot',
  'circle',
  'area',
  'matrix',
  'matrixTime',
  'heatmap',
  'heatmapTime',
  'contourGrid',
  'contourGridNearest',
  'windBarbs',
  'windBarbsContourGrid',
];

const globalChartTypes = ['bar', 'multiLine', 'boxPlot', 'circle', 'area'];

// final shape: [{ date, series1: { mean, p10, p25, p50, p75, p90 }, ... }, ...]
const makeFinalData = (numSeries, numPoints) => {
  const seriesData = {};
  const variance = 4;

  for (let s = 1; s <= numSeries; s++) {
    const meanArray = generateRandomData({ numPoints, variance }).map(
      (d) => d.value,
    );

    seriesData[`series${s}`] = meanArray.map((mean) => {
      const otherVariance = 2;
      return {
        mean,
        p10: mean - Math.random() * 2.5 * otherVariance,
        p25: mean - Math.random() * 1 * otherVariance,
        p50: mean + (Math.random() * 0.4 - 0.2) * Math.random() * otherVariance,
        p75: mean + Math.random() * 1 * otherVariance,
        p90: mean + Math.random() * 2.5 * otherVariance,
      };
    });
  }

  const data = [];
  const baseDate = new Date();
  for (let i = 0; i < numPoints; i++) {
    const date = new Date(baseDate.getTime() + i * 3600_000);
    const dataPoint = { date };
    for (let s = 1; s <= numSeries; s++) {
      dataPoint[`series${s}`] = { ...seriesData[`series${s}`][i] };
    }
    data.push(dataPoint);
  }

  return data;
};

function MainDemo() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [data, setData] = useState(makeFinalData(2, 30));

  const handleSliderChange = (dimension) => (event) => {
    const value = Number(event.target.value);
    setDimensions((prev) => ({ ...prev, [dimension]: value }));
  };

  const withGlobalHoverMode = (type) => ({
    ...demoOptions[type],
    readout: {
      ...(demoOptions[type].readout || {}),
      hoverMode: 'global',
    },
  });

  return (
    <div>
      <div className="flex gap-10">
        <button onClick={() => setData(makeFinalData(2, 30))}>
          Regenerate Data
        </button>
        <InputSlider
          dimensions={dimensions}
          handleSliderChange={handleSliderChange}
          label="Width"
          id="width"
        />
        <InputSlider
          dimensions={dimensions}
          handleSliderChange={handleSliderChange}
          label="Height"
          id="height"
        />
      </div>

      <h2>Local Hover Mode (No Provider)</h2>
      <div className="flex gap-10" style={{ flexWrap: 'wrap' }}>
        {localChartTypes.map((type) => (
          <div
            key={`local-${type}`}
            style={{ width: dimensions.width, height: dimensions.height }}
          >
            <ChartContainer
              data={data}
              options={demoOptions[type]}
              sx={{
                border: '1px solid #737373',
                borderRadius: '8px',
                background:
                  'radial-gradient(122.88% 144.44% at 5.99% 6.25%, #292727 0%, #151414 100%)',
                padding: '12px',
              }}
            />
          </div>
        ))}
      </div>

      <h2>Global Hover Mode (Shared Provider Group)</h2>
      <HoverPointProvider>
        <div className="flex gap-10" style={{ flexWrap: 'wrap' }}>
          {globalChartTypes.map((type) => (
            <ChartContainer
              key={`global-${type}`}
              height={dimensions.height}
              width={dimensions.width}
              data={data}
              options={withGlobalHoverMode(type)}
              sx={{
                border: '1px solid #737373',
                borderRadius: '8px',
                background:
                  'radial-gradient(122.88% 144.44% at 5.99% 6.25%, #292727 0%, #151414 100%)',
                padding: '12px',
              }}
            />
          ))}
        </div>
      </HoverPointProvider>
    </div>
  );
}

export default MainDemo;
