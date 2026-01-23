import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';

function XAxis({
  isAngledTicks = false,
  className = null,
  tickLength = 5,
  tickOffset = 10,
}) {
  const ticksGroupRef = useRef(null);

  const { getChartValues, getXScale, getYScale } = useChartHelpers();

  const chartValues = getChartValues();
  const xScale = getXScale();
  const yScale = getYScale();
  const xDomain = xScale.domain();
  const yDomain = yScale.domain();

  const ticks = xScale
    .ticks()
    .map((value) => ({ value, label: value.toString() }));

  const textStyle = {
    alignmentBaseline: 'middle',
    textAnchor: 'end',
  };

  let textTransform;
  let textY;

  if (isAngledTicks) {
    textStyle.textAnchor = 'end';
    // have to remove the y value, then translate the text to the bottom
    // of the chart before rotating
    textY = null;
    textTransform = `translate(0, ${chartValues.innerHeight + tickOffset}) rotate(-45)`;
  } else {
    textStyle.alignmentBaseline = 'hanging'; // or middle for tilted?
    textStyle.textAnchor = 'middle';
    textY = yScale(yDomain[0]) + tickOffset;
  }

  useAnimation({
    type: 'fadeIn',
    ref: ticksGroupRef,
    trigger: chartValues.data,
  });

  return (
    <g className={`gsl-chart-axis ${className}`}>
      {/* horizontal line above the text for the x axis */}
      <line
        x1={xScale(xDomain[0])}
        x2={xScale(xDomain[1])}
        y1={yScale(yDomain[0])}
        y2={yScale(yDomain[0])}
      />
      <g ref={ticksGroupRef}>
        {ticks.map((tick) => (
          <g
            key={tick.value}
            transform={`translate(${xScale(tick.value)},0)`}
            className="gsl-chart-tick"
          >
            <line
              className="gsl-chart-tick-line"
              y2={yScale(yDomain[0])}
              y1={yScale(yDomain[0]) + tickLength}
            />
            <text
              className="gsl-chart-tick-label"
              style={textStyle}
              y={textY}
              transform={textTransform}
            >
              {tick.label}
            </text>
          </g>
        ))}
      </g>
    </g>
  );
}

export default XAxis;
