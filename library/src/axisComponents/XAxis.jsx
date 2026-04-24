import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { createAccessor, mergeDeep } from '../utilities/dataUtilities';
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
  const explicitTickValues =
    Array.isArray(ticksOpts.values) && ticksOpts.values.length > 0
      ? ticksOpts.values
      : null;
  const explicitTickLabels =
    Array.isArray(ticksOpts.labels) && ticksOpts.labels.length > 0
      ? ticksOpts.labels
      : null;

  const isXBandScale = typeof xScaleToUse?.bandwidth === 'function';
  const xRange =
    typeof xScaleToUse?.range === 'function' ? xScaleToUse.range() : [0, 0];
  const yRange =
    typeof yScaleToUse?.range === 'function' ? yScaleToUse.range() : [0, 0];

  const xStart = Math.min(...xRange);
  const xEnd = Math.max(...xRange);
  const yTop = Math.min(...yRange);
  const yBottom = Math.max(...yRange);

  const series = chartValues.options?.series || [];
  const rootData = Array.isArray(chartValues.data) ? chartValues.data : [];
  const isSecondaryXAxis = axisKey === 'x2';

  const matrixTimeTickValues = [];
  if (
    !explicitTickValues &&
    (finalOptions.type === 'time' || finalOptions.type === 'linear')
  ) {
    const seen = new Set();
    series.forEach((s) => {
      if (!s || s.type !== 'matrix') return;

      const usesSecondary = Boolean(s.isSecondaryXAxis);
      if (usesSecondary !== isSecondaryXAxis) return;

      const getX = createAccessor(s.xKey);
      const seriesData = Array.isArray(s?.data) ? s.data : rootData;

      seriesData.forEach((d) => {
        const v = getX(d);
        if (v == null) return;

        const key = v instanceof Date ? `d:${v.getTime()}` : `v:${String(v)}`;
        if (seen.has(key)) return;
        seen.add(key);
        matrixTimeTickValues.push(v);
      });
    });
  }

  const generatedTickValues = isXBandScale
    ? xDomainToUse || []
    : matrixTimeTickValues.length > 0
      ? matrixTimeTickValues
      : typeof xScaleToUse?.ticks === 'function'
        ? xScaleToUse.ticks()
        : [];

  const tickValues = explicitTickValues || generatedTickValues;

  const ticks = tickValues.map((value, index) => ({
    value,
    label:
      explicitTickLabels?.[index] ??
      (tickFormatter ? tickFormatter(value) : String(value)),
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
  const baselineY = isTopLocation ? yTop : yBottom;
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
          x1={xStart}
          x2={xEnd}
          y1={baselineY}
          y2={baselineY}
          stroke={strokeAxis}
          strokeWidth={strokeWidth}
        />
      )}
      <g ref={ticksGroupRef}>
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
          );
        })}
      </g>
    </g>
  );
}

export default XAxis;
