import { useId, useState } from 'react';
import {
  ChartContainer,
  useChartController,
  useChartReadoutState,
} from '@noaa-gsl/wizard-charts';

const data = Array.from({ length: 25 }, (_, index) => ({
  hour: index,
  temperature: 15 + 8 * Math.sin(index / 4),
  q10: 12 + 8 * Math.sin(index / 4),
  q90: 18 + 8 * Math.sin(index / 4),
}));

function CustomReadout({ readout }) {
  console.log('readout:', readout);
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="custom-forecast-readout">
      <strong style={{ borderBottom: '1px solid #ccc', fontStyle: 'italic' }}>
        This Is A Custom Readout
      </strong>
      <strong>T+{readout.xValue.toFixed(1)}hrs</strong>
      {readout.rows.map((row) => (
        <div key={row.seriesIndex}>
          <span style={{ color: row.color }}>{row.label}</span>
          <div>Median: {row.values.y.toFixed(1)}°C</div>
          <div>
            Range: {row.values.lower.toFixed(1)}°C to{' '}
            {row.values.upper.toFixed(1)}°C
          </div>
        </div>
      ))}
    </section>
  );
}

function ReadoutPanel({ controller }) {
  const readout = useChartReadoutState(controller);
  return (
    <div className="external-readout" data-hover-y={readout?.local.y ?? ''}>
      <strong>{readout?.title || 'Forecast'}</strong>
      <dl>
        {readout?.rows.map((row) => (
          <div key={row.seriesIndex}>
            <dt>{row.label}</dt>
            <dd>{row.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ReadoutChart({ mode, showTooltip }) {
  const { controller, zoomState } = useChartController();
  const options = {
    animationDuration: 0,
    series: [
      {
        id: 'temperature',
        type: 'area',
        name: 'Temperature',
        xKey: 'hour',
        yKey: 'temperature',
        q1YKey: 'q10',
        q3YKey: 'q90',
        fill: '#0fb5ae55',
        stroke: '#0fb5ae',
        units: 'C',
        readoutPrecision: 1,
      },
    ],
    axes: { x: { type: 'linear' }, y: { type: 'linear', nice: true } },
    readout: {
      hoverMode: 'local',
      showTooltip,
      areaFields: ['lower', 'y', 'upper'],
      titleFormatter: (value) => `Forecast hour ${Number(value).toFixed(1)}`,
      tooltip: {
        className: 'forecast-tooltip',
        sx: { color: '#f5f5f5', backgroundColor: '#202020' },
      },
    },
  };
  return (
    <section className="readout-demo-chart">
      <h2>Forecast Readout</h2>
      <div className="readout-demo-controls">
        <button
          type="button"
          onClick={() =>
            controller.setZoomWindow({ center: 12, windowSize: 8 })
          }
        >
          Zoom
        </button>
        <button
          type="button"
          disabled={!zoomState.isZoomed}
          onClick={() => controller.resetZoom()}
        >
          Reset Zoom
        </button>
      </div>
      <ChartContainer
        data={data}
        options={options}
        controller={controller}
        height={500}
        className="readout-demo-svg"
        sx={{
          border: '2px solid #737373',
          padding: 8,
          boxSizing: 'border-box',
        }}
        ReadoutComponent={mode === 'custom' ? CustomReadout : undefined}
      />
      <ReadoutPanel controller={controller} />
    </section>
  );
}

export default function ReadoutDemo() {
  const [mode, setMode] = useState('default');
  const [showTooltip, setShowTooltip] = useState(true);
  return (
    <>
      <div className="readout-demo-controls">
        <label>
          Readout{' '}
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="default">Default</option>
            <option value="custom">Custom HTML</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={showTooltip}
            onChange={(event) => setShowTooltip(event.target.checked)}
          />{' '}
          Tooltip
        </label>
      </div>
      <div className="readout-demo-grid">
        <ReadoutChart mode={mode} showTooltip={showTooltip} />
      </div>
    </>
  );
}
