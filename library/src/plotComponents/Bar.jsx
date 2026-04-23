import { useRef } from 'react';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultBarOptions } from '../utilities/defaultOptions';

function Bar({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultBarOptions, options);
  const {
    alignment,
    className,
    cornerRadius,
    fill,
    isVisible,
    paddingFactor,
    stacked,
    isCumulative,
    stroke,
    strokeWidth,
    sx,
  } = finalOptions;

  const { chartValues, getAccessors, getSeriesData, getSeriesScales } =
    useChartHelpers();

  const accessors = getAccessors(seriesIndex);
  const seriesData = getSeriesData(seriesIndex);
  const { xScale, yScale, yDomain } = getSeriesScales(seriesIndex);
  const series = chartValues.options?.series || [];
  const currentSeries = series[seriesIndex] || {};

  const rectGroupRef = useRef(null);

  const stackedPredecessorSeries = stacked
    ? series
        .map((s, i) => ({ s, i }))
        .filter(
          ({ s, i }) =>
            i < seriesIndex &&
            s?.type === 'bar' &&
            s?.stacked &&
            s?.isCumulative &&
            s?.xKey === currentSeries.xKey &&
            !!s?.isSecondaryXAxis === !!currentSeries.isSecondaryXAxis &&
            !!s?.isSecondaryYAxis === !!currentSeries.isSecondaryYAxis,
        )
        .map(({ i }) => ({
          accessors: getAccessors(i),
          data: getSeriesData(i),
        }))
    : [];

  const toNumberOrZero = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const toXKey = (value) => {
    if (value instanceof Date) return value.getTime();
    return value;
  };

  const predecessorSumsByX = stackedPredecessorSeries.map(
    ({ accessors: prevAccessors, data }) => {
      const sums = new Map();
      data.forEach((d) => {
        const xValue = prevAccessors.x(d);
        if (xValue == null) return;
        const key = toXKey(xValue);
        const next = (sums.get(key) || 0) + toNumberOrZero(prevAccessors.y(d));
        sums.set(key, next);
      });
      return sums;
    },
  );

  // get x positions in pixels of all bars to calculate step and bar width
  const positions = seriesData
    .map((d) => xScale(accessors.x(d)))
    .filter((p) => Number.isFinite(p))
    .sort((a, b) => a - b);

  // step is the pixel distance between neighboring points
  let step = 0;
  if (positions.length > 1) {
    // get difference between all points (remove first index)
    const diffs = positions.slice(1).map((value, i) => value - positions[i]);
    // set step to the smallest difference, but not less than 0
    // this ensures no overlap
    step = Math.max(0, Math.min(...diffs));
  }
  // if step fails, use this fallback that divides the width by the number of points
  const fallback = chartValues.innerWidth / Math.max(1, seriesData.length);
  // barWidth is shrunk by a padding factor to create space between bars
  const barWidth = (step || fallback) * paddingFactor;

  useAnimation({
    type: 'growBar',
    ref: rectGroupRef,
    trigger: seriesData,
  });

  if (!xScale || !yScale || !yDomain) return null;

  return (
    <g
      className={className}
      style={{ ...sx, visibility: isVisible ? 'visible' : 'hidden' }}
      ref={rectGroupRef}
    >
      {seriesData.map((dataPoint) => {
        const cx = xScale(accessors.x(dataPoint));
        const axisBaselineY = yScale(yDomain[0]);
        // default width uses computed barWidth; for band scales use bandwidth
        let width = barWidth;
        let x;

        // if bandwidth is available, use it instead of computed barWidth and apply alignment within the band
        if (typeof xScale.bandwidth === 'function') {
          const bandStart = xScale(accessors.x(dataPoint));
          const band = xScale.bandwidth();
          width = band * paddingFactor;
          if (alignment === 'left') {
            x = bandStart;
          } else if (alignment === 'right') {
            x = bandStart + (band - width);
          } else {
            x = bandStart + (band - width) / 2;
          }
        } else {
          if (!Number.isFinite(cx)) return null;
          if (alignment === 'right') x = cx;
          else if (alignment === 'left') x = cx - width;
          else x = cx - width / 2; // center
        }

        if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) {
          return null;
        }

        const yValue = toNumberOrZero(accessors.y(dataPoint));

        let y;
        let baseline;

        if (stacked && isCumulative) {
          const xValue = accessors.x(dataPoint);
          const xKey = toXKey(xValue);
          const start = predecessorSumsByX.reduce(
            (sum, sums) => sum + toNumberOrZero(sums.get(xKey)),
            0,
          );
          const end = start + yValue;
          y = yScale(Math.max(start, end));
          baseline = yScale(Math.min(start, end));
        } else {
          y = yScale(yValue); // top of the bar
          baseline = axisBaselineY; // bottom of the bar
        }

        const height = Math.max(0, baseline - y); // height from top to baseline
        const barBottom = y + height;
        const startTranslateY = axisBaselineY - barBottom;

        return (
          <rect
            key={`${seriesIndex}-${String(accessors.x(dataPoint))}`}
            x={x}
            y={y}
            width={width}
            height={height}
            rx={cornerRadius}
            ry={cornerRadius}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill={fill}
            shapeRendering="crispEdges"
            style={{
              '--bar-start-translate': `${startTranslateY}px`,
              transform:
                'translateY(var(--bar-start-translate, 0px)) scaleY(0)',
              transformOrigin: '50% 100%',
              transformBox: 'fill-box',
            }}
          />
        );
      })}
    </g>
  );
}

export default Bar;
