import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultAxisOptions } from '../utilities/defaultOptions';

function XAxis({ options = {}, axisKey = 'x' }) {
  const ticksGroupRef = useRef(null);

  const {
    chartValues,
    xScale,
    x2Scale,
    yScale,
    y2Scale,
    xDomain,
    x2Domain,
    yDomain,
    y2Domain,
  } = useChartHelpers();

  const isSecondaryAxis = axisKey === 'x2';
  const xScaleToUse = isSecondaryAxis ? x2Scale || xScale : xScale;
  const yScaleToUse = isSecondaryAxis ? y2Scale || yScale : yScale;
  const xDomainToUse = isSecondaryAxis ? x2Domain || xDomain : xDomain;
  const yDomainToUse = isSecondaryAxis ? y2Domain || yDomain : yDomain;

  // map nested axisOptions to local variables with sensible defaults
  const finalOptions = mergeDeep(defaultAxisOptions, options);
  const ticksOpts = finalOptions.ticks;
  const { hasAxisLine, hasGridLines, strokeAxis, strokeGrid, strokeWidth } =
    finalOptions;
  const hasExplicitVerticalSide =
    finalOptions.isTopLocation != null || finalOptions.position != null;
  const isTopLocation = hasExplicitVerticalSide
    ? (finalOptions.isTopLocation ?? finalOptions.position === 'top')
    : isSecondaryAxis;
  const isAngledTicks = ticksOpts.isAngled;
  const tickLength = ticksOpts.length;
  const tickLabelPadding = ticksOpts.labelPadding;
  const tickFontFamily = ticksOpts.fontFamily;
  const tickFontSize = ticksOpts.fontSize;
  const tickFontWeight = ticksOpts.fontWeight;
  const tickFontColor = ticksOpts.fontColor;
  const tickFormatter = ticksOpts.formatter;

  const ticks = (
    typeof xScaleToUse?.ticks === 'function' ? xScaleToUse.ticks() : []
  ).map((value) => ({
    value,
    label: tickFormatter ? tickFormatter(value) : String(value),
  }));

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
  const baselineDomainValue = isTopLocation ? yDomainToUse[1] : yDomainToUse[0];
  const baselineY = yScaleToUse(baselineDomainValue);
  const tickDirection = isTopLocation ? -1 : 1;

  if (isAngledTicks) {
    textStyle.textAnchor = 'end';
    // remove y and place rotated labels relative to axis baseline
    textY = null;
    textTransform = `translate(0, ${baselineY + tickDirection * (finalTickLength + tickLabelPadding)}) rotate(-45)`;
  } else {
    textStyle.alignmentBaseline = isTopLocation ? 'auto' : 'hanging';
    textStyle.textAnchor = 'middle';
    textY = baselineY + tickDirection * (finalTickLength + tickLabelPadding);
  }

  useAnimation({
    type: 'fadeIn',
    ref: ticksGroupRef,
    trigger: chartValues.data,
  });

  // prevent rendering if scales aren't ready yet
  if (!xScaleToUse || !yScaleToUse || !xDomainToUse || !yDomainToUse) {
    return null;
  }

  return (
    <g className={`gsl-chart-axis ${finalOptions.className}`}>
      {/* horizontal line above the text for the x axis */}
      {hasAxisLine && (
        <line
          x1={xScaleToUse(xDomainToUse[0])}
          x2={xScaleToUse(xDomainToUse[1])}
          y1={baselineY}
          y2={baselineY}
          stroke={strokeAxis}
          strokeWidth={strokeWidth}
        />
      )}
      <g ref={ticksGroupRef}>
        {ticks.map((tick) => (
          <g
            key={String(tick.value)}
            transform={`translate(${xScaleToUse(tick.value)},0)`}
          >
            {/* Vertical grid line */}
            {hasGridLines && (
              <line
                y1={yScaleToUse(yDomainToUse[0])}
                y2={yScaleToUse(yDomainToUse[1])}
                stroke={strokeGrid}
                strokeWidth={strokeWidth}
              />
            )}
            {/* Tick Mark */}
            {hasAxisLine && (
              <line
                className="gsl-chart-tick-line"
                y1={baselineY}
                y2={baselineY + tickDirection * finalTickLength}
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
