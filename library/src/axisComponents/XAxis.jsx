import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultAxisOptions } from '../utilities/defaultOptions';

function XAxis({ options = {}, axisKey = 'x' }) {
  const ticksGroupRef = useRef(null);

  const { chartValues, xScale, x2Scale, yScale, y2Scale } = useChartHelpers();

  const isSecondaryAxis = axisKey === 'x2';
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
  const isAngledTicks = layout?.isAngledTicks ?? finalOptions.ticks.isAngled;
  const tickLength =
    layout?.tickLength ?? (hasAxisLine ? finalOptions.ticks.length : 0);
  const tickDirection = layout?.tickDirection ?? (isSecondaryAxis ? -1 : 1);
  const tickLabelPadding =
    layout?.tickLabelPadding ?? finalOptions.ticks.labelPadding;
  const tickTextOutsideSize = layout?.tickTextOutsideSize ?? 0;
  const axisLabelText = layout?.axisLabel?.text || '';
  const axisLabelOffset =
    layout?.axisLabelOffset ??
    Math.max(0, tickLength) +
      Math.max(0, tickLabelPadding) +
      tickTextOutsideSize +
      6;

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
  const labelFontColor =
    layout?.axisLabel?.fontColor ??
    finalOptions.label?.fontColor ??
    tickFontColor;

  const isXBandScale = typeof xScaleToUse?.bandwidth === 'function';
  const xRange =
    typeof xScaleToUse?.range === 'function' ? xScaleToUse.range() : [0, 0];
  const yRange =
    typeof yScaleToUse?.range === 'function' ? yScaleToUse.range() : [0, 0];

  const xStart = Math.min(...xRange);
  const xEnd = Math.max(...xRange);
  const yTop = Math.min(...yRange);
  const yBottom = Math.max(...yRange);

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
  const baselineY = isSecondaryAxis ? yTop : yBottom;

  if (isAngledTicks) {
    textStyle.textAnchor = 'end';
    // remove y and place rotated labels relative to axis baseline
    textY = null;
    textTransform = `translate(0, ${baselineY + tickDirection * (tickLength + tickLabelPadding)}) rotate(-45)`;
  } else {
    textStyle.alignmentBaseline = isSecondaryAxis ? 'auto' : 'hanging';
    textStyle.textAnchor = 'middle';
    textY = baselineY + tickDirection * (tickLength + tickLabelPadding);
  }

  useAnimation({
    type: 'fadeIn',
    ref: ticksGroupRef,
    trigger: chartValues.data,
  });

  // prevent rendering if scales aren't ready yet
  if (!xScaleToUse || !yScaleToUse) {
    return null;
  }

  const axisLabelY = baselineY + tickDirection * axisLabelOffset;
  const axisLabelX = (xStart + xEnd) / 2;

  return (
    <g
      ref={ticksGroupRef}
      className={`gsl-chart-axis ${finalOptions.className}`}
    >
      {/* horizontal line above the text for the x axis */}
      {hasAxisLine && (
        <line
          x1={xStart}
          x2={xEnd}
          y1={baselineY}
          y2={baselineY}
          stroke={strokeAxis}
          strokeWidth={strokeWidth}
        />
      )}
      {ticks.map((tick) => {
        // Place band ticks at the center of each band.
        // Continuous scales keep the native coordinate.
        const tickX = isXBandScale
          ? xScaleToUse(tick.value) + xScaleToUse.bandwidth() / 2
          : xScaleToUse(tick.value);
        if (!Number.isFinite(tickX)) return null;

        return (
          <g key={String(tick.value)} transform={`translate(${tickX},0)`}>
            {/* Vertical grid line */}
            {hasGridLines && (
              <line
                y1={yBottom}
                y2={yTop}
                stroke={strokeGrid}
                strokeWidth={strokeWidth}
              />
            )}
            {/* Tick Mark */}
            {hasAxisLine && (
              <line
                className="gsl-chart-tick-line"
                y1={baselineY}
                y2={baselineY + tickDirection * tickLength}
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
        );
      })}
      {axisLabelText && (
        <text
          className="gsl-chart-axis-label"
          x={axisLabelX}
          y={axisLabelY}
          textAnchor="middle"
          alignmentBaseline={isSecondaryAxis ? 'auto' : 'hanging'}
          style={{
            fill: labelFontColor,
            fontFamily: labelFontFamily,
            fontSize: `${labelFontSize}px`,
            fontWeight: labelFontWeight,
            color: labelFontColor,
          }}
        >
          {axisLabelText}
        </text>
      )}
    </g>
  );
}

export default XAxis;
