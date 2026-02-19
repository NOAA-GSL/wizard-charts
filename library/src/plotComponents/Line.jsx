import { useRef, useId, useEffect, useMemo } from 'react';
import { line } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { dataVizColors } from '../../../demo/src/helperFunctions';

function Line({ className = '', color = dataVizColors['tropical-indigo'] }) {
  const id = useId();
  const pathRef = useRef(null);
  const idRef = useRef(`line-${id}`);
  const { chartValues, registerSeries, unregisterSeries, xScale, yScale } =
    useChartHelpers();

  const accessors = useMemo(() => {
    return {
      x: (d) => d.x, // or prop-provided accessor
      y: (d) => d.y,
    };
  }, []);

  useEffect(() => {
    registerSeries({
      id: idRef.current,
      accessors,
      scaleHint: { x: 'linear', y: 'linear' }, // children hint if band/linear/time
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => unregisterSeries(idRef.current);
  }, [registerSeries, unregisterSeries, accessors]);

  useAnimation({
    type: 'drawLine',
    ref: pathRef,
    trigger: chartValues.data,
  });

  // return if we don't have scales yet
  if (!xScale || !yScale) return null;

  return (
    <path
      ref={pathRef}
      className={`gsl-chart-line ${className}`}
      style={{
        visibility: chartValues.animationsLocked ? 'hidden' : undefined,
      }}
      d={line()
        .x((d) => xScale(accessors.x(d)))
        .y((d) => yScale(accessors.y(d)))(chartValues.data)}
      stroke={color}
      fill="none"
    />
  );
}

export default Line;
