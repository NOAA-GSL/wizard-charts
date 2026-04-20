import { useState } from 'react';
import { ChartContainer } from '@noaa-gsl/wizard-charts';
import InputSlider from './InputSlider';
import { generateRandomData } from './helperFunctions';
import '@noaa-gsl/wizard-charts/styles.css';
// import InputColor from './InputColor';
import { demoOptions } from './demoOptions';

const margin = { top: 25, right: 50, bottom: 50, left: 50 };
const chartTypes = [
  'bar',
  'stackedBar',
  'multiLine',
  'boxPlot',
  'circle',
  'area',
];

// use generateRandomData to create an array of objects
// each number series is nested under a key in the data object
// final shape: [{ date, series1: { mean, p10, p25, p50, p75, p90 }, ... }, ...]
const makeFinalData = (numSeries, numPoints) => {
  const seriesData = {};
  const variance = 4;

  // Build per-series arrays of percentile objects
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
        // p50 as a small random offset around the mean of -.25 to .25
        p50: mean + (Math.random() * 0.4 - 0.2) * Math.random() * otherVariance,
        p75: mean + Math.random() * 1 * otherVariance,
        p90: mean + Math.random() * 2.5 * otherVariance,
      };
    });
  }

  // Compose the final array of data points with timestamps
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

function App() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [data, setData] = useState(makeFinalData(2, 30));

  const handleSliderChange = (dimension) => (event) => {
    const value = event.target.value;
    setDimensions((prev) => ({ ...prev, [dimension]: value }));
  };

  return (
    <div className="app-container">
      <h1>WIZARD Charts!</h1>
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
      <div className="flex gap-10" style={{ flexWrap: 'wrap' }}>
        {/* <HoverPointProvider> */}
        {chartTypes.map((type) => (
          <ChartContainer
            key={type}
            height={dimensions.height}
            width={dimensions.width}
            margin={margin}
            data={data}
            options={demoOptions[type]}
            sx={{
              border: '1px solid #737373',
              borderRadius: '8px',
              background:
                'radial-gradient(122.88% 144.44% at 5.99% 6.25%, #292727 0%, #151414 100%)',
            }}
          />
        ))}
        {/* </HoverPointProvider> */}
      </div>
    </div>
  );
}

export default App;
