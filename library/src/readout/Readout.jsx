import { useChartHelpers } from '../hooks/useChartHelpers';
import { getPlotBoundsFromChartValues } from '../utilities/measurements';

function Readout({ hoverEvent, options = {} }) {
  const { chartValues } = useChartHelpers();

  const showVerticalLine = Boolean(options?.showVerticalLine);
  if (!showVerticalLine || !hoverEvent) return null;

  const localX = Number(hoverEvent.localX);
  if (!Number.isFinite(localX)) return null;

  const { left, right, top, bottom, width, height } =
    getPlotBoundsFromChartValues(chartValues);

  if (width <= 0 || height <= 0) return null;

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
