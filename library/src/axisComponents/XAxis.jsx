import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultAxisOptions } from '../utilities/defaultOptions';
import { getTickValueKey } from '../utilities/measurements';

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
    fill: tickFontColor,
    fontFamily: tickFontFamily,
    fontSize: `${tickFontSize}px`,
    fontWeight: tickFontWeight,
    color: tickFontColor,
  };

  const baselineY = isSecondaryAxis ? yTop : yBottom;
  const labelPivotY =
    baselineY + tickDirection * (Math.max(0, tickLength) + tickLabelPadding);

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
      data-axis={axisKey}
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
          <g
            key={getTickValueKey(tick.value)}
            transform={`translate(${tickX},0)`}
          >
            {/* Vertical grid line */}
            {hasGridLines && (
              <line
                className="gsl-chart-grid-line"
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
            {tick.showLabel && (
              <text
                className="gsl-chart-tick-label"
                style={textStyle}
                dominantBaseline="central"
                textAnchor={tick.labelGeometry.textAnchor}
                transform={`translate(${tick.labelGeometry.offsetX}, ${labelPivotY + tick.labelGeometry.offsetY}) rotate(${tick.labelGeometry.angle})`}
              >
                {tick.label}
              </text>
            )}
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
