import { useChartHelpers } from '../hooks/useChartHelpers';
import { getPlotBoundsFromChartValues } from '../utilities/measurements';
import HtmlReadout from './HtmlReadout';

function Readout({ model, options = {}, svgRef, ReadoutComponent }) {
  const { chartValues } = useChartHelpers();
  if (!model) return null;

  const { left, right, top, bottom } =
    getPlotBoundsFromChartValues(chartValues);
  const markers = model.rows
    .flatMap((row) => {
      const points = row.markerPoints.length
        ? row.markerPoints
        : [{ id: 'primary', xPixel: row.xPixel, yPixel: row.yPixel }];
      return points.map((point, index) => ({
        ...point,
        id: `${row.seriesIndex}-${point.id ?? index}`,
      }));
    })
    .filter(
      (point) =>
        Number.isFinite(point.xPixel) &&
        Number.isFinite(point.yPixel) &&
        point.xPixel >= left &&
        point.xPixel <= right &&
        point.yPixel >= top &&
        point.yPixel <= bottom,
    );

  return (
    <>
      <g
        className={`wizard-charts-readout ${options.className || ''}`.trim()}
        style={options.sx}
        pointerEvents="none"
        aria-hidden="true"
      >
        {options.showVerticalLine && (
          <line
            className="wizard-charts-readout-vertical-line"
            x1={model.local.x}
            x2={model.local.x}
            y1={top}
            y2={bottom}
            stroke="#d4d4d4"
            strokeWidth={1}
            strokeOpacity={0.9}
            strokeDasharray="6 4"
          />
        )}
        {options.showPointMarkers &&
          markers.map((point) => (
            <circle
              key={point.id}
              cx={point.xPixel}
              cy={point.yPixel}
              r={Math.max(1, Number(options.markerRadius) || 4)}
              stroke={options.markerStroke || '#ffffff'}
              strokeWidth={Math.max(
                0.5,
                Number(options.markerStrokeWidth) || 1.25,
              )}
              fill={options.markerFill || 'none'}
            />
          ))}
      </g>
      {options.showTooltip && (
        <HtmlReadout
          model={model}
          options={options}
          svgRef={svgRef}
          ReadoutComponent={ReadoutComponent}
        />
      )}
    </>
  );
}

export default Readout;
