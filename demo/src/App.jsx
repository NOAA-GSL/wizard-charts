import { useState } from 'react';
import { ChartContainer, XAxis, YAxis, Line } from 'desi-charts';
import InputSlider from './InputSlider';
import { generateRandomData } from './helperFunctions';
import { scaleLinear, extent } from 'd3';

import 'desi-charts/desi-charts.css';

const margin = { top: 40, right: 40, bottom: 40, left: 40 };

function App() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [data, setData] = useState(generateRandomData({ numPoints: 50, variance: 5 }));

  const handleSliderChange = (dimension) => (event) => {
    const value = event.target.value;
    setDimensions((prev) => ({ ...prev, [dimension]: value }));
  };

  console.log('data:', data);

  const xValue = (d) => d.x;
  const yValue = (d) => d.y;

  // Scales
  const innerWidth = Math.max(0, dimensions.width - margin.left - margin.right);
  const xScale = scaleLinear()
    .domain(extent(data, xValue))
    .range([margin.left, innerWidth + margin.left]);
  const innerHeight = Math.max(0, dimensions.height - margin.top - margin.bottom);
  const yScale = scaleLinear().domain(extent(data, yValue)).range([innerHeight, margin.top]).nice();

  console.log('xScale ticks:', xScale.ticks());
  console.log('xScale domain:', xScale.domain());
  console.log('yScale domain:', yScale.domain());

  return (
    <div className="app-container">
      <h1>DESI Charts!</h1>
      <div className="flex gap-10">
        <button onClick={() => setData(generateRandomData({ numPoints: 50, variance: 5 }))}>
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
        sx={{ border: '1px solid white' }}
      >
        <XAxis
          xScale={xScale}
          yScale={yScale}
          innerHeight={innerHeight}
          ticks={xScale.ticks().map((value) => ({ value, label: value.toString() }))}
        />
        <YAxis
          data={data}
          xScale={xScale}
          yScale={yScale}
          margin={margin}
          ticks={yScale.ticks().map((value) => ({ value, label: value.toString() }))}
        />
        <Line data={data} xScale={xScale} yScale={yScale} xValue={xValue} yValue={yValue} />
      </ChartContainer>
    </div>
  );
}

export default App;
