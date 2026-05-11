import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultAxisOptions } from '../utilities/defaultOptions';

function YAxis({ options = {}, axisKey = 'y' }) {
  const ticksGroupRef = useRef(null);

  const { chartValues, xScale, x2Scale, yScale, y2Scale } = useChartHelpers();
  const isSecondaryAxis = axisKey === 'y2';
  const xScaleToUse = isSecondaryAxis ? x2Scale || xScale : xScale;
  const yScaleToUse = isSecondaryAxis ? y2Scale || yScale : yScale;

  // map nested axisOptions to local variables with sensible defaults
  const finalOptions = mergeDeep(defaultAxisOptions, options);
  const layout = chartValues.axisLayout?.[axisKey];

  const hasAxisLine = layout?.hasAxisLine ?? finalOptions.hasAxisLine;
  const hasGridLines = layout?.hasGridLines ?? finalOptions.hasGridLines;
  const strokeAxis = layout?.strokeAxis ?? finalOptions.strokeAxis;
  const strokeGrid = layout?.strokeGrid ?? finalOptions.strokeGrid;
  const strokeWidth = layout?.strokeWidth ?? finalOptions.strokeWidth;

  const ticks = layout?.ticks || [];
  const tickDirection = layout?.tickDirection ?? (isSecondaryAxis ? 1 : -1);
  const tickLength =
    layout?.tickLength ?? (hasAxisLine ? finalOptions.ticks.length : 0);
  const tickLabelPadding =
    layout?.tickLabelPadding ?? finalOptions.ticks.labelPadding;
  const axisLabelText = layout?.axisLabel?.text || '';
  const axisLabelOffset =
    layout?.axisLabelOffset ??
    Math.max(0, tickLength) + Math.max(0, tickLabelPadding) + 6;

  const tickFontFamily =
    layout?.tickFontFamily ?? finalOptions.ticks.fontFamily;
  const tickFontSize = layout?.tickFontSize ?? finalOptions.ticks.fontSize;
  const tickFontWeight =
    layout?.tickFontWeight ?? finalOptions.ticks.fontWeight;
  const tickFontColor = layout?.tickFontColor ?? finalOptions.ticks.fontColor;

  const labelFontFamily =
    layout?.axisLabel?.fontFamily ?? finalOptions.label?.fontFamily;
  const labelFontSize =
    layout?.axisLabel?.fontSize ?? finalOptions.label?.fontSize;
  const labelFontWeight =
    layout?.axisLabel?.fontWeight ?? finalOptions.label?.fontWeight;

  const isYBandScale = typeof yScaleToUse?.bandwidth === 'function';
  const xRange =
    typeof xScaleToUse?.range === 'function' ? xScaleToUse.range() : [0, 0];
  const yRange =
    typeof yScaleToUse?.range === 'function' ? yScaleToUse.range() : [0, 0];

  const xStart = Math.min(...xRange);
  const xEnd = Math.max(...xRange);
  const yTop = Math.min(...yRange);
  const yBottom = Math.max(...yRange);

  const yMiddle = (yTop + yBottom) / 2;

  const xAxisLinePosition = isSecondaryAxis ? xEnd : xStart;
  const axisLabelX = xAxisLinePosition + tickDirection * axisLabelOffset;

  const textStyle = {
    alignmentBaseline: 'central', // central looks better than middle
    textAnchor: `${isSecondaryAxis ? 'start' : 'end'}`,
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
  if (!xScaleToUse || !yScaleToUse) {
    return null;
  }

  return (
    <g className={finalOptions.className}>
      {axisLabelText && (
        <text
          className="gsl-chart-axis-label"
          textAnchor="middle"
          alignmentBaseline="central"
          transform={`translate(${axisLabelX}, ${yMiddle}) rotate(-90)`}
          style={{
            fill: tickFontColor,
            fontFamily: labelFontFamily,
            fontSize: `${labelFontSize}px`,
            fontWeight: labelFontWeight,
            color: tickFontColor,
          }}
        >
          {axisLabelText}
        </text>
      )}
      <g ref={ticksGroupRef}>
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
                  x1={xAxisLinePosition}
                  x2={xAxisLinePosition + tickDirection * tickLength}
                  stroke={strokeAxis}
                  strokeWidth={strokeWidth}
                />
              )}
              {/* Tick Label */}
              <text
                style={textStyle}
                className="gsl-chart-tick-label"
                x={
                  xAxisLinePosition +
                  tickDirection * (tickLength + tickLabelPadding)
                }
              >
                {tick.label}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
}

export default YAxis;
