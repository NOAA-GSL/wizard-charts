import { useRef } from 'react';
import { line } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { dataVizColors } from '../../../demo/src/helperFunctions';

function Line({ className = '', color = dataVizColors['tropical-indigo'] }) {
  const { getChartValues, getXScale, getYScale, getAccessors } =
    useChartHelpers();

  const chartValues = getChartValues();
  const xScale = getXScale();
  const yScale = getYScale();
  const accessors = getAccessors();

  const pathRef = useRef(null);

  useAnimation({
    type: 'drawLine',
    ref: pathRef,
    trigger: chartValues.data,
  });

  return (
    <path
      ref={pathRef}
      className={`gsl-chart-line ${className}`}
      d={line()
        .x((d) => xScale(accessors.x(d)))
        .y((d) => yScale(accessors.y(d)))(chartValues.data)}
      stroke={color}
      fill="none"
    />
  );
}

export default Line;
