import { useChartHelpers } from '../hooks/useChartHelpers';

function Readout({ hoverEvent, options = {} }) {
  const { chartValues } = useChartHelpers();

  const showVerticalLine = Boolean(options?.showVerticalLine);
  if (!showVerticalLine || !hoverEvent) return null;

  const localX = Number(hoverEvent.localX);
  if (!Number.isFinite(localX)) return null;

  const margin = chartValues.margin || {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const innerWidth = Number(chartValues.innerWidth) || 0;
  const innerHeight = Number(chartValues.innerHeight) || 0;

  if (innerWidth <= 0 || innerHeight <= 0) return null;

  const left = margin.left;
  const right = margin.left + innerWidth;
  const top = margin.top;
  const bottom = margin.top + innerHeight;

  if (localX < left || localX > right) return null;

  return (
    <g className="gsl-chart-readout" pointerEvents="none" aria-hidden="true">
      <line
        className="gsl-chart-readout-vertical-line"
        x1={localX}
        x2={localX}
        y1={top}
        y2={bottom}
        stroke="#d4d4d4"
        strokeWidth={1}
        strokeOpacity={0.9}
        strokeDasharray="6 4"
      />
    </g>
  );
}

export default Readout;
