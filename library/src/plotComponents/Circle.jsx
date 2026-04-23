import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultCircleOptions } from '../utilities/defaultOptions';

function Circle({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultCircleOptions, options);
  const { fill, stroke, radius, className, sx } = finalOptions;

  const { getAccessors, getSeriesData, getSeriesScales } = useChartHelpers();

  const accessors = getAccessors(seriesIndex);
  const seriesData = getSeriesData(seriesIndex);
  const { xScale, yScale } = getSeriesScales(seriesIndex);

  const groupRef = useRef(null);

  useAnimation({
    type: 'growCircle',
    ref: groupRef,
    trigger: seriesData,
  });

  if (!xScale || !yScale) return null;

  return (
    <g ref={groupRef} className={`${className}`} style={sx}>
      {seriesData.map((d) => (
        <circle
          key={xScale(accessors.x(d))}
          cx={xScale(accessors.x(d))}
          cy={yScale(accessors.y(d))}
          r={radius}
          fill={fill}
          stroke={stroke}
        />
      ))}
    </g>
  );
}

export default Circle;
