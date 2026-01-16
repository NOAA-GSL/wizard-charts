import { line } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';

function Line({ className = '' }) {
  const { getChartValues, getXScale, getYScale, getAccessors } =
    useChartHelpers();

  const chartValues = getChartValues();
  const xScale = getXScale();
  const yScale = getYScale();
  const accessors = getAccessors();

  return (
    <path
      className={`gsl-chart-line ${className}`}
      d={line()
        .x((d) => xScale(accessors.x(d)))
        .y((d) => yScale(accessors.y(d)))(chartValues.data)}
    />
  );
}

export default Line;
