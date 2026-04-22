import { useRef } from 'react';
import { line } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultLineOptions } from '../utilities/defaultOptions';

function Line({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultLineOptions, options);
  const { isVisible, stroke, strokeWidth, fill, className, sx } = finalOptions;

  const { chartValues, xScale, yScale, getAccessors } = useChartHelpers();

  const accessors = getAccessors(seriesIndex);
  const lineData = (chartValues.data || []).filter((d) => {
    const xValue = accessors.x(d);
    const yValue = accessors.y(d);
    return xValue != null && Number.isFinite(Number(yValue));
  });

  const pathRef = useRef(null);

  useAnimation({
    type: 'drawLine',
    ref: pathRef,
    trigger: chartValues.data,
  });

  return (
    <path
      ref={pathRef}
      className={`${className}`}
      d={line()
        .x((d) => xScale(accessors.x(d)))
        .y((d) => yScale(accessors.y(d)))(lineData)}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
      style={{ ...sx, visibility: isVisible ? 'visible' : 'hidden' }}
    />
  );
}

export default Line;
