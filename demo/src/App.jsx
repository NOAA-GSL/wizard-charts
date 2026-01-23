import { useState } from 'react';
import { ChartContainer, XAxis, YAxis, Line, Bar } from 'desi-charts';
import InputSlider from './InputSlider';
import { generateRandomData } from './helperFunctions';

import 'desi-charts/desi-charts.css';

const margin = { top: 25, right: 50, bottom: 50, left: 50 };

function App() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [chartType, setChartType] = useState('line');
  const [data, setData] = useState(
    generateRandomData({ numPoints: 50, variance: 5 }),
  );

  const handleSliderChange = (dimension) => (event) => {
    const value = event.target.value;
    setDimensions((prev) => ({ ...prev, [dimension]: value }));
  };

  return (
    <div className="app-container">
      <h1>DESI Charts!</h1>
      <div className="flex gap-10">
        <button
          onClick={() =>
            setData(generateRandomData({ numPoints: 50, variance: 5 }))
          }
        >
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
      <div className="flex gap-10">
        <p>Chart Type:</p>
        <select
          name="chart-type"
          id="chart-type"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
        >
          <option value="line">Line</option>
          <option value="bar">Bar</option>
        </select>
      </div>
      <ChartContainer
        height={dimensions.height}
        width={dimensions.width}
        margin={margin}
        data={data}
        xScaleType="linear"
        yScaleType="linear"
        animationDuration={1000}
        sx={{
          border: '1px solid #737373',
          borderRadius: '8px',
          background:
            'radial-gradient(122.88% 144.44% at 5.99% 6.25%, #292727 0%, #151414 100%)',
        }}
      >
        <XAxis />
        <YAxis />
        {chartType === 'line' && <Line />}
        {chartType === 'bar' && <Bar />}
      </ChartContainer>
    </div>
  );
}

export default App;
