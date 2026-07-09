import { contours as d3Contours, geoPath, geoTransform } from 'd3';
import { toComparable } from './valueUtilities';

function fromComparable(value, useDate) {
  return useDate ? new Date(value) : value;
}

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function interpolateComparableAtIndex(values, index) {
  if (!Array.isArray(values) || values.length === 0) return null;

  if (values.length === 1) return values[0];

  const clamped = Math.max(0, Math.min(values.length - 1, Number(index) || 0));
  const lowerIndex = Math.floor(clamped);
  const upperIndex = Math.min(values.length - 1, lowerIndex + 1);
  const lowerValue = values[lowerIndex];
  const upperValue = values[upperIndex];

  if (lowerIndex === upperIndex) return lowerValue;

  const fraction = clamped - lowerIndex;
  return lowerValue + (upperValue - lowerValue) * fraction;
}

function findBracketIndices(values, target) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (values.length === 1) return { lower: 0, upper: 0, fraction: 0 };

  if (target <= values[0]) return { lower: 0, upper: 0, fraction: 0 };

  const lastIndex = values.length - 1;
  if (target >= values[lastIndex]) {
    return { lower: lastIndex, upper: lastIndex, fraction: 0 };
  }

  let low = 0;
  let high = lastIndex;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midValue = values[mid];

    if (midValue === target) {
      return { lower: mid, upper: mid, fraction: 0 };
    }

    if (midValue < target) low = mid + 1;
    else high = mid - 1;
  }

  const lower = Math.max(0, high);
  const upper = Math.min(lastIndex, low);
  const lowerValue = values[lower];
  const upperValue = values[upper];

  if (lower === upper || upperValue === lowerValue) {
    return { lower, upper, fraction: 0 };
  }

  const fraction = (target - lowerValue) / (upperValue - lowerValue);
  return {
    lower,
    upper,
    fraction: Math.max(0, Math.min(1, fraction)),
  };
}

function getRasterValue(grid, xComparable, yComparable) {
  const xIndex = grid.xIndexByComparable.get(xComparable);
  const yIndex = grid.yIndexByComparable.get(yComparable);
  if (!Number.isFinite(xIndex) || !Number.isFinite(yIndex)) return NaN;

  const value = grid.values[yIndex * grid.xComparables.length + xIndex];
  return Number.isFinite(value) ? value : NaN;
}

function reorderComparablesByScale(comparables, rawByComparable, scale) {
  return comparables.slice().sort((a, b) => {
    const rawA = rawByComparable.get(a) ?? fromComparable(a, false);
    const rawB = rawByComparable.get(b) ?? fromComparable(b, false);

    const pixelA = Number(scale(rawA));
    const pixelB = Number(scale(rawB));

    if (Number.isFinite(pixelA) && Number.isFinite(pixelB)) {
      return pixelA - pixelB;
    }

    return a - b;
  });
}

function buildContourRaster(grid, orderedXComparables, orderedYComparables) {
  const nx = orderedXComparables.length;
  const ny = orderedYComparables.length;

  const raster = new Array(nx * ny).fill(-Infinity);

  for (let row = 0; row < ny; row += 1) {
    const yComparable = orderedYComparables[row];

    for (let col = 0; col < nx; col += 1) {
      const xComparable = orderedXComparables[col];
      const value = getRasterValue(grid, xComparable, yComparable);

      raster[row * nx + col] = Number.isFinite(value) ? value : -Infinity;
    }
  }

  return raster;
}

export function buildStructuredGrid({ seriesData, accessors }) {
  if (!Array.isArray(seriesData) || seriesData.length === 0) return null;

  const xSet = new Set();
  const ySet = new Set();
  const xRawByComparable = new Map();
  const yRawByComparable = new Map();
  const rows = [];

  seriesData.forEach((datum, dataIndex) => {
    const xRaw = accessors.x?.(datum);
    const yRaw = accessors.y?.(datum);
    const valueRaw = accessors.valueKey?.(datum);

    const xComparable = toComparable(xRaw);
    const yComparable = toComparable(yRaw);
    const value = toFiniteNumber(valueRaw);

    if (xComparable == null || yComparable == null || !Number.isFinite(value)) {
      return;
    }

    xSet.add(xComparable);
    ySet.add(yComparable);

    if (!xRawByComparable.has(xComparable)) {
      xRawByComparable.set(xComparable, xRaw);
    }
    if (!yRawByComparable.has(yComparable)) {
      yRawByComparable.set(yComparable, yRaw);
    }

    rows.push({
      dataIndex,
      datum,
      xComparable,
      yComparable,
      value,
      xRaw,
      yRaw,
    });
  });

  const xComparables = Array.from(xSet).sort((a, b) => a - b);
  const yComparables = Array.from(ySet).sort((a, b) => a - b);

  if (xComparables.length < 2 || yComparables.length < 2) return null;

  const xIndexByComparable = new Map(
    xComparables.map((value, index) => [value, index]),
  );
  const yIndexByComparable = new Map(
    yComparables.map((value, index) => [value, index]),
  );

  const values = new Float64Array(xComparables.length * yComparables.length);
  values.fill(NaN);

  rows.forEach((entry) => {
    const xIndex = xIndexByComparable.get(entry.xComparable);
    const yIndex = yIndexByComparable.get(entry.yComparable);

    if (!Number.isFinite(xIndex) || !Number.isFinite(yIndex)) return;

    values[yIndex * xComparables.length + xIndex] = entry.value;
  });

  const xIsDate =
    xRawByComparable.get(xComparables[0]) instanceof Date ||
    xRawByComparable.get(xComparables[xComparables.length - 1]) instanceof Date;
  const yIsDate =
    yRawByComparable.get(yComparables[0]) instanceof Date ||
    yRawByComparable.get(yComparables[yComparables.length - 1]) instanceof Date;

  return {
    xComparables,
    yComparables,
    xIndexByComparable,
    yIndexByComparable,
    xRawByComparable,
    yRawByComparable,
    xIsDate,
    yIsDate,
    values,
    rows,
  };
}

export function sampleStructuredGridValue({
  grid,
  xComparable,
  yComparable,
  mode = 'interpolate',
}) {
  if (!grid || xComparable == null || yComparable == null) return null;

  const xBrackets = findBracketIndices(grid.xComparables, xComparable);
  const yBrackets = findBracketIndices(grid.yComparables, yComparable);

  if (!xBrackets || !yBrackets) return null;

  const nearestXIndex =
    Math.abs(grid.xComparables[xBrackets.lower] - xComparable) <=
    Math.abs(grid.xComparables[xBrackets.upper] - xComparable)
      ? xBrackets.lower
      : xBrackets.upper;
  const nearestYIndex =
    Math.abs(grid.yComparables[yBrackets.lower] - yComparable) <=
    Math.abs(grid.yComparables[yBrackets.upper] - yComparable)
      ? yBrackets.lower
      : yBrackets.upper;

  const nearestXComparable = grid.xComparables[nearestXIndex];
  const nearestYComparable = grid.yComparables[nearestYIndex];
  const nearestValue = getRasterValue(
    grid,
    nearestXComparable,
    nearestYComparable,
  );

  if (mode === 'nearest') {
    return Number.isFinite(nearestValue)
      ? {
          value: nearestValue,
          nearestNode: {
            xComparable: nearestXComparable,
            yComparable: nearestYComparable,
          },
        }
      : null;
  }

  const x0Comparable = grid.xComparables[xBrackets.lower];
  const x1Comparable = grid.xComparables[xBrackets.upper];
  const y0Comparable = grid.yComparables[yBrackets.lower];
  const y1Comparable = grid.yComparables[yBrackets.upper];

  const q11 = getRasterValue(grid, x0Comparable, y0Comparable);
  const q21 = getRasterValue(grid, x1Comparable, y0Comparable);
  const q12 = getRasterValue(grid, x0Comparable, y1Comparable);
  const q22 = getRasterValue(grid, x1Comparable, y1Comparable);

  const corners = [
    {
      value: q11,
      distance: Math.hypot(xBrackets.fraction, yBrackets.fraction),
    },
    {
      value: q21,
      distance: Math.hypot(1 - xBrackets.fraction, yBrackets.fraction),
    },
    {
      value: q12,
      distance: Math.hypot(xBrackets.fraction, 1 - yBrackets.fraction),
    },
    {
      value: q22,
      distance: Math.hypot(1 - xBrackets.fraction, 1 - yBrackets.fraction),
    },
  ].filter((corner) => Number.isFinite(corner.value));

  let interpolated = null;

  const hasFullCorners =
    Number.isFinite(q11) &&
    Number.isFinite(q21) &&
    Number.isFinite(q12) &&
    Number.isFinite(q22);

  if (hasFullCorners) {
    const xWeight = xBrackets.fraction;
    const yWeight = yBrackets.fraction;

    const top = q11 * (1 - xWeight) + q21 * xWeight;
    const bottom = q12 * (1 - xWeight) + q22 * xWeight;
    interpolated = top * (1 - yWeight) + bottom * yWeight;
  } else if (corners.length > 0) {
    corners.sort((a, b) => a.distance - b.distance);
    interpolated = corners[0].value;
  }

  if (!Number.isFinite(interpolated)) {
    if (!Number.isFinite(nearestValue)) return null;

    return {
      value: nearestValue,
      nearestNode: {
        xComparable: nearestXComparable,
        yComparable: nearestYComparable,
      },
    };
  }

  return {
    value: interpolated,
    nearestNode: {
      xComparable: nearestXComparable,
      yComparable: nearestYComparable,
    },
  };
}

export function buildStructuredContourModel({
  grid,
  xScale,
  yScale,
  thresholds,
}) {
  if (!grid || !xScale || !yScale) return null;

  const orderedXComparables = reorderComparablesByScale(
    grid.xComparables,
    grid.xRawByComparable,
    xScale,
  );
  const orderedYComparables = reorderComparablesByScale(
    grid.yComparables,
    grid.yRawByComparable,
    yScale,
  );

  const nx = orderedXComparables.length;
  const ny = orderedYComparables.length;

  if (nx < 2 || ny < 2) return null;

  const values = buildContourRaster(
    grid,
    orderedXComparables,
    orderedYComparables,
  );
  const contourBuilder = d3Contours().size([nx, ny]).thresholds(thresholds);
  const features = contourBuilder(values);

  const transform = geoTransform({
    point(x, y) {
      const xComparable = interpolateComparableAtIndex(orderedXComparables, x);
      const yComparable = interpolateComparableAtIndex(orderedYComparables, y);

      if (xComparable == null || yComparable == null) return;

      const xRaw =
        grid.xRawByComparable.get(xComparable) ??
        fromComparable(xComparable, grid.xIsDate);
      const yRaw =
        grid.yRawByComparable.get(yComparable) ??
        fromComparable(yComparable, grid.yIsDate);

      const px = xScale(xRaw);
      const py = yScale(yRaw);

      if (!Number.isFinite(px) || !Number.isFinite(py)) return;

      this.stream.point(px, py);
    },
  });

  const pathGen = geoPath(transform);

  return {
    features,
    pathForFeature: (feature) => pathGen(feature),
  };
}
