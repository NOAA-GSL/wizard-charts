import { useContext } from 'react';
import { ChartContext } from '../context/ChartProvider';

function XAxis({
  xScale,
  yScale,
  innerHeight,
  ticks,
  isAngledTicks = false,
  className = null,
  tickOffset = 10,
}) {
  const xDomain = xScale.domain();
  const yDomain = yScale.domain();

  const { chartValues } = useContext(ChartContext);
  console.log('chartValues in XAxis:', chartValues);

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
    textTransform = `translate(0, ${innerHeight + tickOffset}) rotate(-45)`;
  } else {
    textStyle.alignmentBaseline = 'hanging'; // or middle for tilted?
    textStyle.textAnchor = 'middle';
    textY = yScale(yDomain[0]) + tickOffset;
  }

  return (
    <g className={`gsl-chart-axis ${className}`}>
      {/* horizontal line above the text for the x axis */}
      <line
        x1={xScale(xDomain[0])}
        x2={xScale(xDomain[1])}
        y1={yScale(yDomain[0])}
        y2={yScale(yDomain[0])}
      />
      {ticks.map((tick) => (
        <g key={tick.value} transform={`translate(${xScale(tick.value)},0)`}>
          <line y2={yScale(yDomain[0])} y1={yScale(yDomain[0]) + 5} />

          <text style={textStyle} y={textY} transform={textTransform}>
            {tick.label}
          </text>
        </g>
      ))}
    </g>
  );
}

export default XAxis;
