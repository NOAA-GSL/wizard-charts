import { useRef } from 'react';
import { scaleBand } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { getRange } from '../utilities/dataUtilities';

function Bar({ cornerRadius = 2, className = '' }) {
  const { getChartValues, getXScale, getYScale, getAccessors } =
    useChartHelpers();

  const chartValues = getChartValues();
  // const xScale = getXScale();
  const yScale = getYScale();
  const yDomain = yScale.domain();
  const accessors = getAccessors();

  const rectGroupRef = useRef(null);

  // todo: I probably don't want to appy band scale like this, but this
  // todo: was intended to get things started quickly
  const xScale = scaleBand()
    .domain(chartValues.data.map((d) => accessors.x(d)))
    .range(getRange('x', chartValues))
    .paddingInner(0.2)
    .paddingOuter(0.2);

  useAnimation({
    type: 'growBar',
    ref: rectGroupRef,
    trigger: chartValues.data,
  });

  return (
    <g className={`gsl-chart-bar ${className}`} ref={rectGroupRef}>
      {chartValues.data.map((dataPoint) => {
        const x = xScale(accessors.x(dataPoint));
        const y = yScale(accessors.y(dataPoint)); // top of the bar
        const baselineY = yScale(yDomain[0]);
        const width = xScale.bandwidth();
        const height = baselineY - y; // height from top to baseline

        return (
          <rect
            key={accessors.x(dataPoint)}
            x={x}
            y={y}
            width={width}
            height={height}
            rx={cornerRadius}
            ry={cornerRadius}
            style={{
              transform: 'scaleY(0)',
              transformOrigin: `center ${baselineY}px`,
              // animation: 'growBar 1s forwards',
            }}
          />
        );
      })}
    </g>
  );
}

export default Bar;
