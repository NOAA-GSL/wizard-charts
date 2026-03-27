import { useRef } from 'react';
import { line } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultLineOptions } from '../utilities/defaultOptions';

function Line({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultLineOptions, options);
  const { stroke, strokeWidth, fill, className, sx } = finalOptions;

  const { chartValues, xScale, yScale, getAccessors } = useChartHelpers();

  const accessors = getAccessors(seriesIndex);

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
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
      style={sx}
    />
  );
}

export default Line;
