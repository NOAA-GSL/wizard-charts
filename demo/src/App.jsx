import { useState } from 'react';
import { ChartContainer, XAxis, YAxis, Line } from 'desi-charts';
import InputSlider from './InputSlider';
import { generateRandomData } from './helperFunctions';
import { scaleLinear, extent } from 'd3';

import 'desi-charts/desi-charts.css';

const margin = { top: 40, right: 40, bottom: 40, left: 40 };

function App() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
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
      <ChartContainer
        height={dimensions.height}
        width={dimensions.width}
        margin={margin}
        data={data}
        xScaleType="linear"
        yScaleType="linear"
        sx={{ border: '1px solid white' }}
      >
        <XAxis />
        <YAxis />
        <Line />
      </ChartContainer>
    </div>
  );
}

export default App;
