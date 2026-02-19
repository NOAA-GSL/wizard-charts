import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';

function YAxis({
  isLeftLocation = true,
  className = null,
  hasAxisLine = false,
  hasGridLines = false,
  // tick props
  tickLength = 5,
  tickLabelPadding = 5,
  tickFontFamily = 'inherit',
  tickFontSize = 12,
  tickFontWeight = 400,
  tickFontColor = 'currentColor',
}) {
  const ticksGroupRef = useRef(null);

  const { chartValues, xScale, yScale, domains } = useChartHelpers();

  useAnimation({
    type: 'fadeIn',
    ref: ticksGroupRef,
    trigger: chartValues.data,
  });

  const { data, margin } = chartValues;

  // early return if we don't have scales yet
  if (!xScale || !yScale) return null;

  const ticks = yScale
    .ticks()
    .map((value) => ({ value, label: value.toString() }));

  const yMiddle =
    yScale(domains.y[0]) + (yScale(domains.y[1]) - yScale(domains.y[0])) / 2;

  // if there is no axis line, then there should be no tick length
  const finalTickLength = hasAxisLine ? tickLength : 0;

  // tick marks, labels and legend are offset in different directions based on location
  const locationTickOffset = isLeftLocation
    ? finalTickLength + tickLabelPadding
    : -finalTickLength - tickLabelPadding;
  // not enough padding on right side, so add 2 to the right side
  const legendTickOffset = isLeftLocation ? margin.left : -margin.right + 2;

  // this determines whether the x value is the left or right side of the chart
  const xDomainPosition = isLeftLocation ? 0 : 1;

  const textStyle = {
    alignmentBaseline: 'central', // central looks better than middle
    textAnchor: `${isLeftLocation ? 'end' : 'start'}`,
    fill: tickFontColor,
    fontFamily: tickFontFamily,
    fontSize: `${tickFontSize}px`,
    fontWeight: tickFontWeight,
    color: tickFontColor,
  };

  return (
    <g
      className={`gsl-chart-axis ${className}`}
      style={{
        visibility: chartValues.animationsLocked ? 'hidden' : undefined,
      }}
    >
      {/* vertical line for y-axis, `location` will set the x values */}
      {hasAxisLine && (
        <line
          x1={xScale(domains.x[xDomainPosition])}
          x2={xScale(domains.x[xDomainPosition])}
          y1={yScale(domains.y[0])}
          y2={yScale(domains.y[1])}
        />
      )}
      {/* legend */}
      <text
        className="gsl-chart-axis-label"
        alignmentBaseline={`${isLeftLocation ? 'before-edge' : 'after-edge'}`}
        textAnchor="middle"
        transform={`translate(${xScale(domains.x[xDomainPosition]) - legendTickOffset}, ${yMiddle}) rotate(-90)`}
      >
        {data.ylegend}
      </text>
      <g ref={ticksGroupRef}>
        {ticks.map((tick) => (
          <g
            key={tick.value}
            transform={`translate(0, ${yScale(tick.value)})`}
            className="gsl-chart-tick"
          >
            {/* Horizontal grid line */}
            {hasGridLines && (
              <line x1={xScale(domains.x[0])} x2={xScale(domains.x[1])} />
            )}
            {/* Tick Mark */}
            {hasAxisLine && (
              <line
                // todo: well, this isn't using the tickLength prop...
                x1={xScale(domains.x[xDomainPosition]) - locationTickOffset / 2}
                x2={xScale(domains.x[xDomainPosition])}
                className="gsl-chart-tick-line"
              />
            )}
            {/* Tick Label */}
            <text
              style={textStyle}
              className="gsl-chart-tick-label"
              x={xScale(domains.x[xDomainPosition]) - locationTickOffset}
            >
              {tick.label === '' ? tick.value : tick.label}
            </text>
          </g>
        ))}
      </g>
    </g>
  );
}

export default YAxis;
