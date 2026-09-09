import { useState } from 'react';
import { ChartContainer, HoverPointProvider } from '@noaa-gsl/wizard-charts';
import InputSlider from './InputSlider';
import '@noaa-gsl/wizard-charts/styles.css';
import { demoOptions } from '../demoOptions';
import { timeSeriesDemoData } from '../data/demoDatasets';

const localChartTypes = [
  'bar',
  'stackedBar',
  'multiLine',
  'boxPlot',
  'circle',
  'area',
  'areaStacked',
  'matrix',
  'matrixTime',
  'contourGridNearest',
  'windBarbsContourGrid',
  'windBarbsSurface',
];

const globalChartTypes = ['bar', 'multiLine', 'boxPlot', 'circle', 'area'];

function MainDemo() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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
              data={timeSeriesDemoData}
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
              data={timeSeriesDemoData}
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
