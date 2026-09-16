import { useId, useState } from 'react';
import {
  ChartContainer,
  HoverPointProvider,
  useChartController,
  useChartReadoutState,
} from '@noaa-gsl/wizard-charts';

const data = Array.from({ length: 25 }, (_, index) => ({
  hour: index,
  temperature: 15 + 8 * Math.sin(index / 4),
  low: 12 + 8 * Math.sin(index / 4),
  high: 18 + 8 * Math.sin(index / 4),
}));

function CustomReadout({ readout }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="custom-forecast-readout">
      <strong id={headingId}>{readout.title}</strong>
      {readout.rows.map((row) => (
        <div key={row.seriesIndex}>
          <span style={{ color: row.color }}>{row.label}</span>
          <div>{row.text}</div>
        </div>
      ))}
    </section>
  );
}

function OversizedReadout({ readout }) {
  return (
    <div style={{ width: 900 }}>
      <strong>{readout.title}</strong>
      {Array.from({ length: 40 }, (_, index) => (
        <div key={index}>
          Forecast period {index + 1}: {readout.rows[0]?.text}
        </div>
      ))}
    </div>
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

function ReadoutChart({ mode, global, secondary = false, showTooltip }) {
  const { controller, zoomState } = useChartController();
  const axisKey = secondary ? 'x2' : 'x';
  const options = {
    animationDuration: 0,
    series: [
      {
        id: 'temperature',
        type: 'area',
        name: 'Temperature',
        xKey: 'hour',
        yKey: 'temperature',
        q1YKey: 'low',
        q3YKey: 'high',
        isSecondaryXAxis: secondary,
        fill: '#0fb5ae55',
        units: 'C',
        readoutPrecision: 1,
      },
    ],
    axes: { [axisKey]: { type: 'linear' }, y: { type: 'linear' } },
    readout: {
      hoverMode: global ? 'global' : 'local',
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
      <h2>{secondary ? 'Secondary Axis' : 'Primary Axis'}</h2>
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
        height={280}
        className="readout-demo-svg"
        sx={{
          border: '2px solid #737373',
          padding: 8,
          boxSizing: 'border-box',
        }}
        ReadoutComponent={
          mode === 'custom'
            ? CustomReadout
            : mode === 'oversized'
              ? OversizedReadout
              : undefined
        }
      />
      <ReadoutPanel controller={controller} />
    </section>
  );
}

export default function ReadoutDemo() {
  const [mode, setMode] = useState('default');
  const [global, setGlobal] = useState(false);
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
            <option value="oversized">Oversized HTML</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={global}
            onChange={(event) => setGlobal(event.target.checked)}
          />{' '}
          Synchronized
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
      <HoverPointProvider>
        <div className="readout-demo-grid">
          <ReadoutChart mode={mode} global={global} showTooltip={showTooltip} />
          <ReadoutChart
            mode={mode}
            global={global}
            showTooltip={showTooltip}
            secondary
          />
        </div>
      </HoverPointProvider>
    </>
  );
}
