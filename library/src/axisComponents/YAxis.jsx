import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultAxisOptions } from '../utilities/defaultOptions';

function YAxis({ options = {}, axisKey = 'y' }) {
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
  const isSecondaryAxis = axisKey === 'y2';
  const xScaleToUse = isSecondaryAxis ? x2Scale || xScale : xScale;
  const yScaleToUse = isSecondaryAxis ? y2Scale || yScale : yScale;
  const xDomainToUse = isSecondaryAxis ? x2Domain || xDomain : xDomain;
  const yDomainToUse = isSecondaryAxis ? y2Domain || yDomain : yDomain;
  // map nested axisOptions to local variables with sensible defaults
  const finalOptions = mergeDeep(defaultAxisOptions, options);
  const { hasAxisLine, hasGridLines, strokeAxis, strokeGrid, strokeWidth } =
    finalOptions;
  const ticksOpts = finalOptions.ticks;
  const hasExplicitSide =
    finalOptions.isLeftLocation != null || finalOptions.position != null;
  const isLeftLocation = hasExplicitSide
    ? (finalOptions.isLeftLocation ?? finalOptions.position === 'left')
    : !isSecondaryAxis;
  const tickLength = ticksOpts.length;
  const tickLabelPadding = ticksOpts.labelPadding;
  const tickFontFamily = ticksOpts.fontFamily;
  const tickFontSize = ticksOpts.fontSize;
  const tickFontWeight = ticksOpts.fontWeight;
  const tickFontColor = ticksOpts.fontColor;
  const tickFormatter = ticksOpts.formatter;

  const isYBandScale = typeof yScaleToUse?.bandwidth === 'function';
  const xRange =
    typeof xScaleToUse?.range === 'function' ? xScaleToUse.range() : [0, 0];
  const yRange =
    typeof yScaleToUse?.range === 'function' ? yScaleToUse.range() : [0, 0];

  const xStart = Math.min(...xRange);
  const xEnd = Math.max(...xRange);
  const yTop = Math.min(...yRange);
  const yBottom = Math.max(...yRange);

  const { data, margin } = chartValues;

  const tickValues = isYBandScale
    ? yDomainToUse || []
    : typeof yScaleToUse?.ticks === 'function'
      ? yScaleToUse.ticks()
      : [];

  const ticks = tickValues.map((value) => ({
    value,
    label: tickFormatter ? tickFormatter(value) : String(value),
  }));

  const yMiddle = (yTop + yBottom) / 2;

  // if there is no axis line, then there should be no tick length
  const finalTickLength = hasAxisLine ? tickLength : 0;

  // tick marks, labels and legend are offset in different directions based on location
  const locationTickOffset = isLeftLocation
    ? finalTickLength + tickLabelPadding
    : -finalTickLength - tickLabelPadding;
  // not enough padding on right side, so add 2 to the right side
  const legendTickOffset = isLeftLocation ? margin.left : -margin.right + 2;

  const xAxisLinePosition = isLeftLocation ? xStart : xEnd;

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
  if (!xScaleToUse || !yScaleToUse || !xDomainToUse || !yDomainToUse) {
    return null;
  }

  return (
    <g className={finalOptions.className}>
      {/* vertical line for y-axis, `location` will set the x values */}
      {hasAxisLine && (
        <line
          x1={xAxisLinePosition}
          x2={xAxisLinePosition}
          y1={yBottom}
          y2={yTop}
          stroke={strokeAxis}
          strokeWidth={strokeWidth}
        />
      )}
      {/* legend */}
      <text
        className="gsl-chart-axis-label"
        alignmentBaseline={`${isLeftLocation ? 'before-edge' : 'after-edge'}`}
        textAnchor="middle"
        transform={`translate(${xAxisLinePosition - legendTickOffset}, ${yMiddle}) rotate(-90)`}
      >
        {data.ylegend}
      </text>
      <g ref={ticksGroupRef}>
        {ticks.map((tick) => {
          const tickY = isYBandScale
            ? yScaleToUse(tick.value) + yScaleToUse.bandwidth() / 2
            : yScaleToUse(tick.value);
          if (!Number.isFinite(tickY)) return null;

          return (
            <g key={String(tick.value)} transform={`translate(0, ${tickY})`}>
              {/* Horizontal grid line */}
              {hasGridLines && (
                <line
                  x1={xStart}
                  x2={xEnd}
                  stroke={strokeGrid}
                  strokeWidth={strokeWidth}
                />
              )}
              {/* Tick Mark */}
              {hasAxisLine && (
                <line
                  // todo: well, this isn't using the tickLength prop...
                  x1={xAxisLinePosition - locationTickOffset / 2}
                  x2={xAxisLinePosition}
                  stroke={strokeAxis}
                  strokeWidth={strokeWidth}
                />
              )}
              {/* Tick Label */}
              <text
                style={textStyle}
                className="gsl-chart-tick-label"
                x={xAxisLinePosition - locationTickOffset}
              >
                {tick.label === '' ? tick.value : tick.label}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
}

export default YAxis;
