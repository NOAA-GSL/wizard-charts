import { contours as d3Contours, geoPath, geoTransform } from 'd3';

function toComparable(value) {
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function fromComparable(value, useDate) {
  return useDate ? new Date(value) : value;
}

export function normalizeThresholds(thresholds) {
  if (!Array.isArray(thresholds)) return [];

  const sorted = thresholds
    .map((d) => Number(d))
    .filter((d) => Number.isFinite(d))
    .sort((a, b) => a - b);

  return sorted.filter((d, i) => i === 0 || d !== sorted[i - 1]);
}

function resolveResolution(resolution) {
  if (Array.isArray(resolution) && resolution.length > 0) {
    const fallback = Math.max(4, Math.round(Number(resolution[0]) || 0));
    return fallback || 64;
  }

  const size = Math.max(4, Math.round(Number(resolution) || 0));
  return size || 64;
}

function interpolateIdw(
  points,
  gridXs,
  gridYs,
  xSpan,
  ySpan,
  power = 2,
  neighbors = 16,
) {
  const nx = gridXs.length;
  const ny = gridYs.length;
  const values = new Array(nx * ny).fill(NaN);
  const p = Number.isFinite(Number(power)) ? Math.max(0.5, Number(power)) : 2;
  const k = Number.isFinite(Number(neighbors))
    ? Math.max(1, Math.round(Number(neighbors)))
    : 16;
  const safeXSpan =
    Number.isFinite(Number(xSpan)) && Number(xSpan) > 0 ? Number(xSpan) : 1;
  const safeYSpan =
    Number.isFinite(Number(ySpan)) && Number(ySpan) > 0 ? Number(ySpan) : 1;

  for (let j = 0; j < ny; j += 1) {
    const y = gridYs[j];

    for (let i = 0; i < nx; i += 1) {
      const x = gridXs[i];
      const distances = [];

      for (let n = 0; n < points.length; n += 1) {
        const point = points[n];
        // Normalize by axis spans so mixed units (e.g., ms on x and meters on y)
        // contribute proportionally during IDW distance calculation.
        const dx = (point.x - x) / safeXSpan;
        const dy = (point.y - y) / safeYSpan;
        const d2 = dx * dx + dy * dy;

        if (d2 === 0) {
          distances.length = 0;
          distances.push({ d2: 0, value: point.value });
          break;
        }

        distances.push({ d2, value: point.value });
      }

      if (distances.length === 0) continue;

      if (distances[0].d2 !== 0) {
        distances.sort((a, b) => a.d2 - b.d2);
      }

      const nearest = distances.slice(0, k);

      if (nearest.length === 0) continue;
      if (nearest[0].d2 === 0) {
        values[j * nx + i] = nearest[0].value;
        continue;
      }

      let weightedSum = 0;
      let weightTotal = 0;

      for (let n = 0; n < nearest.length; n += 1) {
        const candidate = nearest[n];
        const weight = 1 / Math.pow(Math.sqrt(candidate.d2), p);
        weightedSum += candidate.value * weight;
        weightTotal += weight;
      }

      values[j * nx + i] = weightTotal > 0 ? weightedSum / weightTotal : NaN;
    }
  }

  return values;
}

function createPathGenerator({
  xScale,
  yScale,
  xMin,
  xMax,
  yMin,
  yMax,
  nx,
  ny,
  xIsDate,
  yIsDate,
}) {
  const xSpan = xMax - xMin;
  const ySpan = yMax - yMin;

  const transform = geoTransform({
    point(x, y) {
      const tx = nx > 1 ? x / (nx - 1) : 0;
      const ty = ny > 1 ? y / (ny - 1) : 0;

      const xComparable = xMin + tx * xSpan;
      const yComparable = yMax - ty * ySpan;

      const xValue = fromComparable(xComparable, xIsDate);
      const yValue = fromComparable(yComparable, yIsDate);

      const px = xScale(xValue);
      const py = yScale(yValue);

      this.stream.point(px, py);
    },
  });

  return geoPath(transform);
}

export function buildContourModel({
  points,
  xScale,
  yScale,
  thresholds,
  resolution,
  gridSize,
  interpolationMethod = 'idw',
  idwPower = 2,
  idwNeighbors = 16,
}) {
  const xDomain = xScale?.domain?.() || [];
  const yDomain = yScale?.domain?.() || [];

  if (xDomain.length < 2 || yDomain.length < 2 || points.length === 0) {
    return null;
  }

  const xMin = toComparable(xDomain[0]);
  const xMax = toComparable(xDomain[1]);
  const yMin = toComparable(yDomain[0]);
  const yMax = toComparable(yDomain[1]);

  if (
    !Number.isFinite(xMin) ||
    !Number.isFinite(xMax) ||
    !Number.isFinite(yMin) ||
    !Number.isFinite(yMax) ||
    xMin === xMax ||
    yMin === yMax
  ) {
    return null;
  }

  const finalResolution = resolveResolution(resolution ?? gridSize);
  const nx = finalResolution;
  const ny = finalResolution;
  const gridXs = Array.from(
    { length: nx },
    (_, i) => xMin + (i / (nx - 1)) * (xMax - xMin),
  );
  const gridYs = Array.from(
    { length: ny },
    (_, j) => yMax - (j / (ny - 1)) * (yMax - yMin),
  );

  let values;
  if (interpolationMethod === 'idw') {
    values = interpolateIdw(
      points,
      gridXs,
      gridYs,
      xMax - xMin,
      yMax - yMin,
      idwPower,
      idwNeighbors,
    );
  } else {
    values = interpolateIdw(
      points,
      gridXs,
      gridYs,
      xMax - xMin,
      yMax - yMin,
      idwPower,
      idwNeighbors,
    );
  }

  const safeValues = values.map((v) => (Number.isFinite(v) ? v : -Infinity));
  const contourBuilder = d3Contours().size([nx, ny]).thresholds(thresholds);
  const features = contourBuilder(safeValues);

  const pathGen = createPathGenerator({
    xScale,
    yScale,
    xMin,
    xMax,
    yMin,
    yMax,
    nx,
    ny,
    xIsDate: xDomain[0] instanceof Date || xDomain[1] instanceof Date,
    yIsDate: yDomain[0] instanceof Date || yDomain[1] instanceof Date,
  });

  return {
    features,
    pathForFeature: (feature) => pathGen(feature),
  };
}
