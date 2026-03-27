import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultAxisOptions } from '../utilities/defaultOptions';

function YAxis({ options = {} }) {
  const ticksGroupRef = useRef(null);

  const { chartValues, xScale, yScale, xDomain, yDomain } = useChartHelpers();
  // map nested axisOptions to local variables with sensible defaults
  const finalOptions = mergeDeep(defaultAxisOptions, options);
  const { hasAxisLine, hasGridLines, strokeAxis, strokeGrid, strokeWidth } =
    finalOptions;
  const ticksOpts = finalOptions.ticks;
  const isLeftLocation =
    finalOptions.isLeftLocation ??
    (finalOptions.position ? finalOptions.position === 'left' : true);
  const tickLength = ticksOpts.length;
  const tickLabelPadding = ticksOpts.labelPadding;
  const tickFontFamily = ticksOpts.fontFamily;
  const tickFontSize = ticksOpts.fontSize;
  const tickFontWeight = ticksOpts.fontWeight;
  const tickFontColor = ticksOpts.fontColor;

  const { data, margin } = chartValues;

  const ticks = (typeof yScale.ticks === 'function' ? yScale.ticks() : []).map(
    (value) => ({ value, label: String(value) }),
  );

  const xDomainFinal =
    xDomain || (typeof xScale.domain === 'function' ? xScale.domain() : []);
  const yDomainFinal =
    yDomain || (typeof yScale.domain === 'function' ? yScale.domain() : []);

  const yMiddle =
    yScale(yDomainFinal[0]) +
    (yScale(yDomainFinal[1]) - yScale(yDomainFinal[0])) / 2;

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

  useAnimation({
    type: 'fadeIn',
    ref: ticksGroupRef,
    trigger: chartValues.data,
  });

  // prevent rendering if scales aren't ready yet
  if (!xScale || !yScale) return null;

  return (
    <g className={finalOptions.className}>
      {/* vertical line for y-axis, `location` will set the x values */}
      {hasAxisLine && (
        <line
          x1={xScale(xDomain[xDomainPosition])}
          x2={xScale(xDomain[xDomainPosition])}
          y1={yScale(yDomain[0])}
          y2={yScale(yDomain[1])}
          stroke={strokeAxis}
          strokeWidth={strokeWidth}
        />
      )}
      {/* legend */}
      <text
        className="gsl-chart-axis-label"
        alignmentBaseline={`${isLeftLocation ? 'before-edge' : 'after-edge'}`}
        textAnchor="middle"
        transform={`translate(${xScale(xDomain[xDomainPosition]) - legendTickOffset}, ${yMiddle}) rotate(-90)`}
      >
        {data.ylegend}
      </text>
      <g ref={ticksGroupRef}>
        {ticks.map((tick) => (
          <g key={tick.value} transform={`translate(0, ${yScale(tick.value)})`}>
            {/* Horizontal grid line */}
            {hasGridLines && (
              <line
                x1={xScale(xDomainFinal[0])}
                x2={xScale(xDomainFinal[1])}
                stroke={strokeGrid}
                strokeWidth={strokeWidth}
              />
            )}
            {/* Tick Mark */}
            {hasAxisLine && (
              <line
                // todo: well, this isn't using the tickLength prop...
                x1={
                  xScale(xDomainFinal[xDomainPosition]) - locationTickOffset / 2
                }
                x2={xScale(xDomainFinal[xDomainPosition])}
                stroke={strokeAxis}
                strokeWidth={strokeWidth}
              />
            )}
            {/* Tick Label */}
            <text
              style={textStyle}
              className="gsl-chart-tick-label"
              x={xScale(xDomainFinal[xDomainPosition]) - locationTickOffset}
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
