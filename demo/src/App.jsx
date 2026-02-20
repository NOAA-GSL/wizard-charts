import { useState } from 'react';
import { ChartContainer, HoverPointProvider } from 'desi-charts';
import InputSlider from './InputSlider';
import { generateRandomData, dataVizColors } from './helperFunctions';
import 'desi-charts/desi-charts.css';
import InputColor from './InputColor';

const margin = { top: 25, right: 50, bottom: 50, left: 50 };

function App() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [chartType, setChartType] = useState('line');
  const [chartColor, setChartColor] = useState(
    dataVizColors['tropical-indigo'],
  );
  const [data, setData] = useState(
    generateRandomData({ numPoints: 50, variance: 5 }),
  );

  const handleSliderChange = (dimension) => (event) => {
    const value = event.target.value;
    setDimensions((prev) => ({ ...prev, [dimension]: value }));
  };

  const options = {
    series: [
      {
        type: 'line',
        xKey: 'x', // support dot notation
        yKey: 'y',
        xAxisPosition: 'bottom', // default
        yAxisPosition: 'left', // default
        yName: 'Temperature',
        isVisible: true,
        stroke: '',
        fill: '',
        className: '',
      },
    ],
    axes: {
      // can also use the default x and y
      x: {
        type: 'band', // band, linear, log, time
        label: { fontSize: 15, fontWeight: 700, fontFamily: 'sans-serif' },
        ticks: { values: [], labels: [], amount: 10 }, // default will print values, then labels if provided
        // default domain will compute max and min from data
        domainMin: 0, // optional
        domainMax: 100, // optional
        nice: false,
        className: '',
        hasGridlines: true,
        sx: {},
      },
      y: {
        type: 'linear',
        title: { text: 'Temperature (F)' },
        ticks: { values: [], labels: [], amount: 10 }, // default will print values, then labels if provided
        // default domain will compute max and min from data
        domainMin: 0, // optional
        domainMax: 100, // optional
        nice: false,
        className: '',
        hasGridlines: true,
        sx: {},
      },
    },
    readout: {
      hoverMode: 'local', // or 'global'
    },
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
        <InputColor
          color={chartColor}
          onChange={setChartColor}
          id="chart-color"
        />
      </div>
      <HoverPointProvider>
        <ChartContainer
          height={dimensions.height}
          width={dimensions.width}
          margin={margin}
          data={data}
          options={options}
          animationDuration={1000}
          sx={{
            border: '1px solid #737373',
            borderRadius: '8px',
            background:
              'radial-gradient(122.88% 144.44% at 5.99% 6.25%, #292727 0%, #151414 100%)',
          }}
        />
      </HoverPointProvider>
    </div>
  );
}

export default App;
