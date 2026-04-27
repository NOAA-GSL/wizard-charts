import { useRef } from 'react';
import { extent } from 'd3';
import { useChartHelpers } from '../hooks/useChartHelpers';
import useAnimation from '../hooks/useAnimation';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultMatrixOptions } from '../utilities/defaultOptions';

function toComparable(value) {
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeThresholds(thresholds) {
  if (!Array.isArray(thresholds)) return [];
  return thresholds
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
}

function resolveThresholds(inputThresholds, values, colors) {
  const normalized = normalizeThresholds(inputThresholds);
  if (normalized.length > 0) return normalized;

  const colorCount = Array.isArray(colors) ? colors.length : 0;
  const thresholdCount = Math.max(0, colorCount - 1);
  if (thresholdCount === 0) return [];

  const [minValue, maxValue] = extent(values);
  const min = Number(minValue);
  const max = Number(maxValue);

  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max <= min) return [min];

  const step = (max - min) / colorCount;
  return Array.from({ length: thresholdCount }, (_, i) => min + step * (i + 1));
}

function getColorForValue(value, thresholds, colors, fallbackFill) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallbackFill;

  if (!thresholds.length || !Array.isArray(colors) || colors.length === 0) {
    return fallbackFill;
  }

  const bucketIndex = thresholds.findIndex((threshold) => numeric <= threshold);
  const colorIndex = bucketIndex === -1 ? thresholds.length : bucketIndex;
  return colors[colorIndex] ?? colors[colors.length - 1] ?? fallbackFill;
}

function getBandRect(ordinalScale, value, padding = 0) {
  const start = ordinalScale(value);
  const bandwidth = ordinalScale.bandwidth();
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(bandwidth) ||
    bandwidth <= 0
  ) {
    return null;
  }

  const end = start + bandwidth;
  const min = Math.min(start, end);
  const max = Math.max(start, end);

  const pad = Math.max(0, Number(padding) || 0);
  const x = min + pad;
  const width = Math.max(0, max - min - 2 * pad);
  if (width <= 0) return null;

  return { start: x, size: width };
}

function buildContinuousXMap(seriesData, xAccessor, xScale) {
  const byComparable = new Map();

  seriesData.forEach((d) => {
    const raw = xAccessor(d);
    if (raw == null) return;
    const comparable = toComparable(raw);
    if (comparable == null || byComparable.has(comparable)) return;

    const center = xScale(raw);
    if (!Number.isFinite(center)) return;

    byComparable.set(comparable, { comparable, center });
  });

  const ordered = Array.from(byComparable.values()).sort(
    (a, b) => a.comparable - b.comparable,
  );

  const fallbackWidth =
    ordered.length > 0
      ? Math.max(
          1,
          Math.abs(xScale.range()[1] - xScale.range()[0]) / ordered.length,
        )
      : 1;

  const lookup = new Map();
  ordered.forEach((entry, index) => {
    const prev = ordered[index - 1]?.center;
    const next = ordered[index + 1]?.center;
    const prevGap = Number.isFinite(prev) ? Math.abs(entry.center - prev) : NaN;
    const nextGap = Number.isFinite(next) ? Math.abs(next - entry.center) : NaN;

    let fallbackGap = fallbackWidth;
    if (Number.isFinite(nextGap)) fallbackGap = nextGap;
    else if (Number.isFinite(prevGap)) fallbackGap = prevGap;

    const leftBound = Number.isFinite(prev)
      ? (prev + entry.center) / 2
      : entry.center - fallbackGap / 2;
    const rightBound = Number.isFinite(next)
      ? (entry.center + next) / 2
      : entry.center + fallbackGap / 2;

    lookup.set(entry.comparable, {
      center: entry.center,
      prevCenter: prev,
      nextCenter: next,
      prevGap,
      nextGap,
      fallbackGap,
      leftBound,
      rightBound,
    });
  });

  return lookup;
}

function Matrix({ seriesIndex = 0, options = {} }) {
  const finalOptions = mergeDeep(defaultMatrixOptions, options);
  const {
    className,
    colors,
    fill,
    isVisible,
    cellPadding,
    cellWidthFactor,
    timeAnchor,
    stroke,
    strokeWidth,
    showLabels,
    labelFormatter,
    labelColor,
    labelFontSize,
    labelFontWeight,
    sx,
  } = finalOptions;

  const { getAccessors, getSeriesData, getSeriesScales } = useChartHelpers();

  const accessors = getAccessors(seriesIndex);
  const seriesData = getSeriesData(seriesIndex);
  const { xScale, yScale } = getSeriesScales(seriesIndex);

  const thresholdValues = resolveThresholds(
    finalOptions.thresholds,
    seriesData
      .map((d) => Number(accessors.valueKey?.(d)))
      .filter(Number.isFinite),
    colors,
  );

  const yIsBand = typeof yScale?.bandwidth === 'function';
  const xIsBand = typeof xScale?.bandwidth === 'function';
  const useContinuousX = !xIsBand;

  const continuousXMap = (() => {
    if (!useContinuousX || !xScale || typeof accessors?.x !== 'function') {
      return new Map();
    }
    return buildContinuousXMap(seriesData, accessors.x, xScale);
  })();

  const groupRef = useRef(null);

  useAnimation({
    type: 'fadeIn',
    ref: groupRef,
    trigger: seriesData,
  });

  if (!xScale || !yScale || !yIsBand) return null;

  return (
    <g
      ref={groupRef}
      className={className}
      style={{ ...sx, visibility: isVisible ? 'visible' : 'hidden' }}
    >
      {seriesData.map((d) => {
        const xValue = accessors.x(d);
        const yValue = accessors.y(d);
        const value = accessors.valueKey?.(d);

        if (xValue == null || yValue == null) return null;

        const yRect = getBandRect(yScale, yValue, cellPadding);
        if (!yRect) return null;

        let xRect;
        if (xIsBand) {
          xRect = getBandRect(xScale, xValue, cellPadding);
        } else if (useContinuousX) {
          const comparable = toComparable(xValue);
          if (comparable == null) return null;

          const centerInfo = continuousXMap.get(comparable);
          if (!centerInfo) return null;

          const anchor =
            timeAnchor === 'left'
              ? 'start'
              : timeAnchor === 'right'
                ? 'end'
                : timeAnchor;

          const xRange =
            typeof xScale.range === 'function' ? xScale.range() : [0, 0];
          const xMin = Math.min(...xRange);
          const xMax = Math.max(...xRange);

          let baseWidth;
          if (anchor === 'start') {
            baseWidth = Number.isFinite(centerInfo.nextGap)
              ? centerInfo.nextGap
              : centerInfo.fallbackGap;
          } else if (anchor === 'end') {
            baseWidth = Number.isFinite(centerInfo.prevGap)
              ? centerInfo.prevGap
              : centerInfo.fallbackGap;
          } else {
            const leftHalf = Number.isFinite(centerInfo.prevGap)
              ? centerInfo.prevGap / 2
              : centerInfo.fallbackGap / 2;
            const rightHalf = Number.isFinite(centerInfo.nextGap)
              ? centerInfo.nextGap / 2
              : centerInfo.fallbackGap / 2;
            baseWidth = leftHalf + rightHalf;
          }

          if (!Number.isFinite(baseWidth) || baseWidth <= 0) return null;

          const factor = Math.max(
            0.05,
            Math.min(1, Number(cellWidthFactor) || 1),
          );
          const width = Math.max(0, baseWidth * factor);
          const pad = Math.max(0, Number(cellPadding) || 0);

          let xStart;
          let xEnd;

          if (anchor === 'start') {
            xStart = centerInfo.center;
            xEnd = centerInfo.center + width;
          } else if (anchor === 'end') {
            xEnd = centerInfo.center;
            xStart = centerInfo.center - width;
          } else {
            xStart = centerInfo.center - width / 2;
            xEnd = centerInfo.center + width / 2;
          }

          xStart = Math.max(xMin, xStart);
          xEnd = Math.min(xMax, xEnd);

          xRect = {
            start: xStart + pad,
            size: Math.max(0, xEnd - xStart - 2 * pad),
          };
        } else {
          return null;
        }

        if (!xRect || xRect.size <= 0) return null;

        const cellColor = getColorForValue(
          value,
          thresholdValues,
          colors,
          fill,
        );
        const labelValue = accessors.labelKey ? accessors.labelKey(d) : value;

        return (
          <g
            key={`${seriesIndex}-${String(xValue)}-${String(yValue)}-${String(value)}`}
          >
            <rect
              x={xRect.start}
              y={yRect.start}
              width={xRect.size}
              height={yRect.size}
              fill={cellColor}
              stroke={stroke}
              strokeWidth={strokeWidth}
              shapeRendering="crispEdges"
            />
            {showLabels && (
              <text
                x={xRect.start + xRect.size / 2}
                y={yRect.start + yRect.size / 2}
                fill={labelColor}
                fontSize={labelFontSize}
                fontWeight={labelFontWeight}
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
              >
                {typeof labelFormatter === 'function'
                  ? labelFormatter(labelValue, d)
                  : labelValue}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default Matrix;
