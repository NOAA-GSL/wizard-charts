import { extent } from 'd3';

export function toComparable(value) {
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function toTriggerPart(value) {
  if (value == null) return 'null';
  if (value instanceof Date) return `date:${value.getTime()}`;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? `num:${value}` : 'num:NaN';
  }

  if (typeof value === 'string') return `str:${value}`;
  if (typeof value === 'boolean') return `bool:${value}`;

  const numeric = Number(value);
  if (Number.isFinite(numeric)) return `num:${numeric}`;

  try {
    return `json:${JSON.stringify(value)}`;
  } catch {
    return `str:${String(value)}`;
  }
}

export function resolveThresholds(inputThresholds, values, colors) {
  const normalized = Array.isArray(inputThresholds)
    ? inputThresholds
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v))
        .sort((a, b) => a - b)
    : [];
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

export function getColorForThresholdIndex(
  index,
  thresholds,
  colors,
  fallbackFill,
) {
  if (!Array.isArray(colors) || colors.length === 0) return fallbackFill;
  const colorIndex = Math.max(0, Math.min(index, thresholds.length));
  return colors[colorIndex] ?? colors[colors.length - 1] ?? fallbackFill;
}

export function getColorForValue(value, thresholds, colors, fallbackFill) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallbackFill;

  if (!thresholds.length || !Array.isArray(colors) || colors.length === 0) {
    return fallbackFill;
  }

  const bucketIndex = thresholds.findIndex((threshold) => numeric <= threshold);
  const colorIndex = bucketIndex === -1 ? thresholds.length : bucketIndex;
  return colors[colorIndex] ?? colors[colors.length - 1] ?? fallbackFill;
}

export function getBandRect(ordinalScale, value, padding = 0) {
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

export function buildContinuousXMap(seriesData, xAccessor, xScale) {
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

export function getScaleRangeBounds(scale) {
  if (!scale || typeof scale.range !== 'function') return null;

  const range = scale.range();
  if (!Array.isArray(range) || range.length < 2) return null;

  const start = Number(range[0]);
  const end = Number(range[range.length - 1]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  return {
    min: Math.min(start, end),
    max: Math.max(start, end),
  };
}

export function isPointInsideScaleRanges(localX, localY, xScale, yScale) {
  const xBounds = getScaleRangeBounds(xScale);
  const yBounds = getScaleRangeBounds(yScale);

  if (!xBounds || !yBounds) return false;

  return (
    localX >= xBounds.min &&
    localX <= xBounds.max &&
    localY >= yBounds.min &&
    localY <= yBounds.max
  );
}

export function invertScaleAtPixel(scale, pixel) {
  if (!scale || typeof scale.invert !== 'function') return null;

  const value = scale.invert(pixel);
  return value == null ? null : value;
}

export function buildPreparedHeatmapPoints(
  seriesData,
  accessors,
  xScale,
  yScale,
) {
  if (!Array.isArray(seriesData)) return [];

  return seriesData
    .map((datum, dataIndex) => {
      const xRaw = accessors.x?.(datum);
      const yRaw = accessors.y?.(datum);
      const valueRaw = accessors.valueKey?.(datum);

      const x = toComparable(xRaw);
      const y = toComparable(yRaw);
      const value = Number(valueRaw);
      const xPixel = xScale?.(xRaw);
      const yPixel = yScale?.(yRaw);

      if (
        x == null ||
        y == null ||
        !Number.isFinite(value) ||
        !Number.isFinite(xPixel) ||
        !Number.isFinite(yPixel)
      ) {
        return null;
      }

      return {
        datum,
        dataIndex,
        x,
        y,
        xRaw,
        yRaw,
        xPixel,
        yPixel,
        value,
      };
    })
    .filter(Boolean);
}

export function interpolateIdwValueAtPoint({
  points,
  x,
  y,
  xSpan,
  ySpan,
  power = 2,
  neighbors = 16,
}) {
  if (!Array.isArray(points) || points.length === 0) return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const p = Number.isFinite(Number(power)) ? Math.max(0.5, Number(power)) : 2;
  const k = Number.isFinite(Number(neighbors))
    ? Math.max(1, Math.round(Number(neighbors)))
    : 16;
  const safeXSpan =
    Number.isFinite(Number(xSpan)) && Number(xSpan) > 0 ? Number(xSpan) : 1;
  const safeYSpan =
    Number.isFinite(Number(ySpan)) && Number(ySpan) > 0 ? Number(ySpan) : 1;

  const distances = [];

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const dx = (point.x - x) / safeXSpan;
    const dy = (point.y - y) / safeYSpan;
    const d2 = dx * dx + dy * dy;

    if (d2 === 0) return point.value;

    distances.push({ d2, value: point.value });
  }

  if (distances.length === 0) return null;

  distances.sort((a, b) => a.d2 - b.d2);
  const nearest = distances.slice(0, k);

  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < nearest.length; i += 1) {
    const candidate = nearest[i];
    const weight = 1 / Math.pow(Math.sqrt(candidate.d2), p);
    weightedSum += candidate.value * weight;
    weightTotal += weight;
  }

  if (!(weightTotal > 0)) return null;

  const interpolated = weightedSum / weightTotal;
  return Number.isFinite(interpolated) ? interpolated : null;
}

function normalizeMatrixAnchor(timeAnchor) {
  if (timeAnchor === 'left') return 'start';
  if (timeAnchor === 'right') return 'end';
  return timeAnchor;
}

export function getMatrixCellRect({
  xValue,
  yValue,
  xScale,
  yScale,
  xIsBand,
  useContinuousX,
  continuousXMap,
  timeAnchor,
  cellWidthFactor,
  cellPadding,
}) {
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

    const anchor = normalizeMatrixAnchor(timeAnchor || 'center');

    const xRange = typeof xScale.range === 'function' ? xScale.range() : [0, 0];
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

    const factor = Math.max(0.05, Math.min(1, Number(cellWidthFactor) || 1));
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

  return { xRect, yRect };
}

export function getDistanceToCellRect(localX, localY, cellRect) {
  if (!cellRect) return null;

  const xStart = cellRect.xRect.start;
  const xEnd = cellRect.xRect.start + cellRect.xRect.size;
  const yStart = cellRect.yRect.start;
  const yEnd = cellRect.yRect.start + cellRect.yRect.size;

  const xMin = Math.min(xStart, xEnd);
  const xMax = Math.max(xStart, xEnd);
  const yMin = Math.min(yStart, yEnd);
  const yMax = Math.max(yStart, yEnd);

  const containsX = localX >= xMin && localX <= xMax;
  const containsY = localY >= yMin && localY <= yMax;
  const containsPoint = containsX && containsY;

  const xDistancePx = containsX
    ? 0
    : Math.min(Math.abs(localX - xMin), Math.abs(localX - xMax));
  const yDistancePx = containsY
    ? 0
    : Math.min(Math.abs(localY - yMin), Math.abs(localY - yMax));
  const distancePx = Math.hypot(xDistancePx, yDistancePx);

  return {
    containsPoint,
    xDistancePx,
    yDistancePx,
    distancePx,
    xCenter: (xMin + xMax) / 2,
    yCenter: (yMin + yMax) / 2,
    bounds: {
      xStart: xMin,
      xEnd: xMax,
      yStart: yMin,
      yEnd: yMax,
    },
  };
}
