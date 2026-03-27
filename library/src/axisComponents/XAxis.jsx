import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultAxisOptions } from '../utilities/defaultOptions';

function XAxis({ options = {} }) {
  const ticksGroupRef = useRef(null);

  const { chartValues, xScale, yScale, xDomain, yDomain } = useChartHelpers();

  // map nested axisOptions to local variables with sensible defaults
  const finalOptions = mergeDeep(defaultAxisOptions, options);
  const ticksOpts = finalOptions.ticks;
  const { hasAxisLine, hasGridLines, strokeAxis, strokeGrid, strokeWidth } =
    finalOptions;
  const isAngledTicks = ticksOpts.isAngled;
  const tickLength = ticksOpts.length;
  const tickLabelPadding = ticksOpts.labelPadding;
  const tickFontFamily = ticksOpts.fontFamily;
  const tickFontSize = ticksOpts.fontSize;
  const tickFontWeight = ticksOpts.fontWeight;
  const tickFontColor = ticksOpts.fontColor;
  const tickFormatter = ticksOpts.formatter;

  const ticks = (typeof xScale.ticks === 'function' ? xScale.ticks() : []).map(
    (value) => ({
      value,
      label: tickFormatter ? tickFormatter(value) : String(value),
    }),
  );

  const textStyle = {
    alignmentBaseline: 'middle',
    textAnchor: 'end',
    fill: tickFontColor,
    fontFamily: tickFontFamily,
    fontSize: `${tickFontSize}px`,
    fontWeight: tickFontWeight,
    color: tickFontColor,
  };

  let textTransform;
  let textY;
  // if there is no axis line, then there should be no tick length
  const finalTickLength = hasAxisLine ? tickLength : 0;

  if (isAngledTicks) {
    textStyle.textAnchor = 'end';
    // have to remove the y value, then translate the text to the bottom
    // of the chart before rotating
    textY = null;
    textTransform = `translate(0, ${chartValues.innerHeight + finalTickLength + tickLabelPadding}) rotate(-45)`;
  } else {
    textStyle.alignmentBaseline = 'hanging'; // or middle for tilted?
    textStyle.textAnchor = 'middle';
    textY = yScale(yDomain[0]) + finalTickLength + tickLabelPadding;
  }

  useAnimation({
    type: 'fadeIn',
    ref: ticksGroupRef,
    trigger: chartValues.data,
  });

  // prevent rendering if scales aren't ready yet
  if (!xScale || !yScale) return null;

  return (
    <g className={`gsl-chart-axis ${finalOptions.className}`}>
      {/* horizontal line above the text for the x axis */}
      {hasAxisLine && (
        <line
          x1={xScale(xDomain[0])}
          x2={xScale(xDomain[1])}
          y1={yScale(yDomain[0])}
          y2={yScale(yDomain[0])}
          stroke={strokeAxis}
          strokeWidth={strokeWidth}
        />
      )}
      <g ref={ticksGroupRef}>
        {ticks.map((tick) => (
          <g key={tick.value} transform={`translate(${xScale(tick.value)},0)`}>
            {/* Vertical grid line */}
            {hasGridLines && (
              <line
                y1={yScale(yDomain[0])}
                y2={yScale(yDomain[1])}
                stroke={strokeGrid}
                strokeWidth={strokeWidth}
              />
            )}
            {/* Tick Mark */}
            {hasAxisLine && (
              <line
                className="gsl-chart-tick-line"
                y2={yScale(yDomain[0])}
                y1={yScale(yDomain[0]) + finalTickLength}
                stroke={strokeAxis}
                strokeWidth={strokeWidth}
              />
            )}
            {/* Tick Label */}
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
