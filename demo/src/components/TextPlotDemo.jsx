import { useState } from 'react';
import { ChartContainer, useChartController } from '@noaa-gsl/wizard-charts';
import { textPlotDemoDatasets } from '../data/demoDatasets';

const hour = 3600_000;
const axisOptions = {
  x: {
    type: 'time',
    hasGridLines: true,
    strokeGrid: '#363636',
    ticks: { amount: 6 },
  },
  y: {
    domainMin: 50,
    domainMax: 100,
    hasGridLines: true,
    strokeGrid: '#363636',
    units: 'F',
    label: { text: 'Temperature' },
    ticks: { amount: 5 },
  },
};

function ForecastChart({ title, data, textPlots, className }) {
  const { controller, zoomState } = useChartController();
  return (
    <section className="readout-demo-chart">
      <div className="text-plot-chart-heading">
        <h2>{title}</h2>
        <div className="text-plot-zoom-controls">
          <button
            type="button"
            className="secondary-button"
            aria-label={`Zoom ${title} to 24 hours`}
            onClick={() =>
              controller.setZoomWindow({
                center: data[54].time,
                windowSize: 24 * hour,
              })
            }
          >
            Zoom to 24 Hours
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={!zoomState.isZoomed}
            aria-label={`Reset ${title} zoom`}
            onClick={() => controller.resetZoom()}
          >
            Reset Zoom
          </button>
        </div>
      </div>
      <ChartContainer
        data={data}
        controller={controller}
        height={330}
        className={className}
        options={{
          animationDuration: 0,
          legend: { enabled: false },
          axes: axisOptions,
          series: [
            {
              id: 'temperature',
              type: 'line',
              name: 'Temperature',
              xKey: 'time',
              yKey: 'temperature',
              units: 'F',
              stroke: '#e9b64e',
              strokeWidth: 2,
            },
            {
              type: 'circle',
              xKey: 'time',
              yKey: 'temperature',
              data: data.filter((datum) => Number.isFinite(datum.temperature)),
              radius: 2.5,
              fill: '#e9b64e',
              showInReadout: false,
            },
          ],
          textPlots,
          readout: { snapTo: 'nearestPoint', showVerticalLine: false },
        }}
      />
    </section>
  );
}

export default function TextPlotDemo() {
  const [preset, setPreset] = useState('forecast');
  const [mode, setMode] = useState('auto');
  const [priority, setPriority] = useState('extrema');
  const [collision, setCollision] = useState('hide');
  const [minGap, setMinGap] = useState(12);
  const [precision, setPrecision] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(-12);
  const [manual, setManual] = useState(true);
  const data = textPlotDemoDatasets[preset];
  const appearance = {
    displayUnits: false,
    haloColor: '#171717',
    fontColor: '#efefef',
  };
  const textPlots = [
    {
      ...appearance,
      seriesId: 'temperature',
      selection: {
        mode,
        priority,
        every: 3,
        values: data
          .filter((datum, index) => index % 12 === 6)
          .map((datum) => datum.time),
        sampling: 'nearest',
      },
      collision,
      minGap,
      precision,
      offset: [offsetX, offsetY],
    },
  ];
  if (manual)
    textPlots.push({
      ...appearance,
      data: [
        { x: data[54].time, y: 92, text: 'Front arrives', offset: [0, -6] },
      ],
    });

  return (
    <main className="text-plot-demo">
      <h2>Text Plots</h2>
      <div className="text-plot-demo-controls">
        <label htmlFor="text-preset">
          Dataset
          <select
            id="text-preset"
            value={preset}
            onChange={(event) => setPreset(event.target.value)}
          >
            <option value="forecast">Regional Forecast</option>
            <option value="noisy">Noisy Forecast</option>
            <option value="plateaus">Plateaus and Gaps</option>
          </select>
        </label>
        <label htmlFor="text-mode">
          Selection
          <select
            id="text-mode"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="auto">Automatic</option>
            <option value="all">Every Point</option>
            <option value="everyNth">Every Third Point</option>
            <option value="xValues">Requested Times</option>
          </select>
        </label>
        <label htmlFor="text-priority">
          Priority
          <select
            id="text-priority"
            value={priority}
            disabled={mode !== 'auto'}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="extrema">Extrema</option>
            <option value="uniform">Uniform</option>
          </select>
        </label>
        <label htmlFor="text-collision">
          Collisions
          <select
            id="text-collision"
            value={collision}
            onChange={(event) => setCollision(event.target.value)}
          >
            <option value="hide">Hide Overlaps</option>
            <option value="allow">Allow Overlaps</option>
          </select>
        </label>
        <label htmlFor="text-gap">
          Minimum Gap: {minGap}
          <input
            id="text-gap"
            type="range"
            min="0"
            max="40"
            value={minGap}
            onChange={(event) => setMinGap(Number(event.target.value))}
          />
        </label>
        <label htmlFor="text-offset-x">
          X Offset: {offsetX}
          <input
            id="text-offset-x"
            type="range"
            min="-40"
            max="40"
            value={offsetX}
            onChange={(event) => setOffsetX(Number(event.target.value))}
          />
        </label>
        <label htmlFor="text-offset-y">
          Y Offset: {offsetY}
          <input
            id="text-offset-y"
            type="range"
            min="-40"
            max="40"
            value={offsetY}
            onChange={(event) => setOffsetY(Number(event.target.value))}
          />
        </label>
        <label htmlFor="text-precision">
          Decimal Places
          <input
            id="text-precision"
            type="number"
            min="0"
            max="3"
            value={precision}
            onChange={(event) =>
              setPrecision(Math.max(0, Math.min(3, Number(event.target.value))))
            }
          />
        </label>
        <label className="text-plot-checkbox" htmlFor="text-manual">
          <input
            id="text-manual"
            type="checkbox"
            checked={manual}
            onChange={(event) => setManual(event.target.checked)}
          />
          Manual Annotation
        </label>
      </div>
      <ForecastChart
        title="Regional Temperature Forecast"
        data={data}
        textPlots={textPlots}
        className="text-plot-interactive"
      />
      <div className="readout-demo-grid">
        {['uniform', 'extrema'].map((strategy) => (
          <ForecastChart
            key={strategy}
            title={
              strategy === 'uniform' ? 'Uniform Coverage' : 'Extrema Priority'
            }
            data={data}
            className={`text-plot-comparison-${strategy}`}
            textPlots={[
              {
                ...appearance,
                seriesId: 'temperature',
                selection: { mode: 'auto', priority: strategy },
                minGap: 18,
                precision: 0,
                offset: [0, -12],
              },
            ]}
          />
        ))}
      </div>
    </main>
  );
}
