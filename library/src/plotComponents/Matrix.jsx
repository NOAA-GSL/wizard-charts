import { useMemo, useRef } from 'react';
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

    let width;
    if (Number.isFinite(prev) && Number.isFinite(next)) {
      width =
        (Math.abs(entry.center - prev) + Math.abs(next - entry.center)) / 2;
    } else if (Number.isFinite(prev)) {
      width = Math.abs(entry.center - prev);
    } else if (Number.isFinite(next)) {
      width = Math.abs(next - entry.center);
    } else {
      width = fallbackWidth;
    }

    lookup.set(entry.comparable, {
      center: entry.center,
      width: Math.max(1, width),
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

  const thresholdValues = useMemo(
    () => normalizeThresholds(finalOptions.thresholds),
    [finalOptions.thresholds],
  );

  const yIsBand = typeof yScale?.bandwidth === 'function';
  const xIsBand = typeof xScale?.bandwidth === 'function';
  const useContinuousX = !xIsBand;

  const continuousXMap = useMemo(() => {
    if (!useContinuousX || !xScale || typeof accessors?.x !== 'function') {
      return new Map();
    }
    return buildContinuousXMap(seriesData, accessors.x, xScale);
  }, [accessors, seriesData, useContinuousX, xScale]);

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
      {seriesData.map((d, idx) => {
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

          const centerAndWidth = continuousXMap.get(comparable);
          if (!centerAndWidth) return null;

          const width = Math.max(
            0,
            centerAndWidth.width * Math.max(0.05, Number(cellWidthFactor) || 1),
          );
          const pad = Math.max(0, Number(cellPadding) || 0);

          let xStart;
          if (timeAnchor === 'start') xStart = centerAndWidth.center;
          else if (timeAnchor === 'end') xStart = centerAndWidth.center - width;
          else xStart = centerAndWidth.center - width / 2;

          xRect = {
            start: xStart + pad,
            size: Math.max(0, width - 2 * pad),
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
          <g key={`${seriesIndex}-${idx}-${String(xValue)}-${String(yValue)}`}>
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
