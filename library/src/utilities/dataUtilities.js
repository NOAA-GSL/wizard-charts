import {
  scaleLinear,
  scaleBand,
  scaleTime,
  scaleThreshold,
  scaleLog,
  extent,
} from 'd3';
import { seriesAccessorProps } from './defaultOptions';

export function getDomain(data, accessor) {
  return extent(data, accessor);
}

export function getAccessors() {
  return {
    x: (d) => d.x,
    y: (d) => d.y,
    y2: (d) => d.y2,
  };
}

// create an accessor that supports dot-notation paths (e.g. 'series1.value')
export function createAccessor(key) {
  if (!key && key !== 0) return (d) => d;
  if (typeof key === 'function') return key;
  const path = String(key).split('.');
  return (d) => {
    let v = d;
    for (let i = 0; i < path.length; i += 1) {
      if (v == null) return undefined;
      v = v[path[i]];
    }
    return v;
  };
}

export function getRange(axis, chartValues) {
  const { margin, innerWidth, innerHeight } = chartValues;
  switch (axis) {
    case 'x':
    case 'x2':
      return [margin.left, innerWidth + margin.left];
    case 'y':
    case 'y2':
      return [innerHeight + margin.top, margin.top];
    default:
      throw new Error(`Unknown axis: ${axis}`);
  }
}

export function getScale(type, domain, range, isNice = false) {
  let scale;
  switch (type) {
    case 'linear':
      scale = scaleLinear().domain(domain).range(range);
      break;
    case 'log':
      scale = scaleLog().domain(domain).range(range);
      break;
    case 'band':
      scale = scaleBand().domain(domain).range(range);
      break;
    case 'time':
      scale = scaleTime().domain(domain).range(range);
      break;
    case 'threshold':
      scale = scaleThreshold().domain(domain).range(range);
      break;
    default:
      throw new Error(`Unknown scale type: ${type}`);
  }
  if (isNice && typeof scale.nice === 'function') {
    scale.nice();
  }
  return scale;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isArrayLike(value) {
  return Array.isArray(value) || ArrayBuffer.isView(value);
}

/**
 * Normalize supported input data shapes into an array-of-rows shape.
 *
 * Supported:
 * - Row shape: [{ x: 1, y: 2 }, ...]
 * - Column shape: { x: [...], y: [...], q1: [...] }
 */
export function normalizeDataShape(inputData) {
  if (Array.isArray(inputData)) return inputData;
  if (!isPlainObject(inputData)) return [];

  const keys = Object.keys(inputData).filter((key) =>
    isArrayLike(inputData[key]),
  );
  if (keys.length === 0) return [];

  const length = inputData[keys[0]].length;
  const hasMismatchedLengths = keys.some(
    (key) => inputData[key].length !== length,
  );
  if (hasMismatchedLengths) {
    throw new Error(
      'Columnar data arrays must all be the same length for conversion.',
    );
  }

  return Array.from({ length }, (_, i) => {
    const row = {};
    keys.forEach((key) => {
      row[key] = inputData[key][i];
    });
    return row;
  });
}

/**
 * Deeply merges two objects or arrays.
 * @param {*} target - The target object or array.
 * @param {*} source - The source object or array.
 * @returns {*} - The merged object or array.
 */
export const mergeDeep = (target = {}, source = {}) => {
  if (Array.isArray(source)) return source.slice();

  const output = isPlainObject(target) ? { ...target } : {};

  Object.keys(source).forEach((key) => {
    const srcVal = source[key];
    const tgtVal = target ? target[key] : undefined;

    if (isPlainObject(srcVal) && isPlainObject(tgtVal)) {
      output[key] = mergeDeep(tgtVal, srcVal);
    } else if (Array.isArray(srcVal)) {
      output[key] = srcVal.slice();
    } else {
      output[key] = srcVal;
    }
  });

  return output;
};

export const combineNumericExtent = (data = [], accessorKeys = []) => {
  const values = [];

  if (
    !Array.isArray(data) ||
    data.length === 0 ||
    !Array.isArray(accessorKeys) ||
    accessorKeys.length === 0
  ) {
    return [0, 1];
  }

  accessorKeys.forEach((key) => {
    if (!key) return;
    const path = key.split('.');
    data.forEach((d) => {
      let v = d;
      for (let i = 0; i < path.length; i += 1) {
        if (v == null) {
          v = undefined;
          break;
        }
        v = v[path[i]];
      }
      if (v instanceof Date) {
        values.push(v);
      } else {
        const numeric = Number(v);
        if (Number.isFinite(numeric)) values.push(numeric);
      }
    });
  });

  return values.length ? extent(values) : [0, 1];
};

function toStackXKey(value) {
  if (value instanceof Date) return value.getTime();
  return value;
}

function computeStackedExtent(data = [], series = []) {
  const stackedBarSeries = series.filter(
    (s) =>
      s?.type === 'bar' && s?.stacked && s?.isCumulative && s?.xKey && s?.yKey,
  );
  if (stackedBarSeries.length === 0) return null;

  const totals = [];

  const sumByX = new Map();

  stackedBarSeries.forEach((s) => {
    const seriesData = Array.isArray(s?.data) ? s.data : data;
    const getX = createAccessor(s.xKey);
    const getY = createAccessor(s.yKey);

    seriesData.forEach((d) => {
      const rawX = getX(d);
      const yValue = Number(getY(d));
      if (rawX == null || !Number.isFinite(yValue)) return;

      const xKey = toStackXKey(rawX);
      const current = sumByX.get(xKey) || { pos: 0, neg: 0 };

      if (yValue >= 0) current.pos += yValue;
      else current.neg += yValue;

      sumByX.set(xKey, current);
    });
  });

  sumByX.forEach(({ pos, neg }) => {
    totals.push(pos, neg);
  });

  if (totals.length === 0) return null;
  return extent(totals);
}

function getContinuousXDomainPadding(series = [], domain = []) {
  const [domainStart, domainEnd] = domain;
  const toComparableNumber = (value) => {
    if (value instanceof Date) return value.getTime();
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const domainStartNum = toComparableNumber(domainStart);
  const domainEndNum = toComparableNumber(domainEnd);
  if (domainStartNum == null || domainEndNum == null) {
    return { start: 0, end: 0 };
  }

  const getSortedUniqueXValues = (s) => {
    if (!s?.xKey) return [];
    const getX = createAccessor(s.xKey);
    const seriesData = Array.isArray(s?.data) ? s.data : [];
    const xs = seriesData
      .map((d) => toComparableNumber(getX(d)))
      .filter((v) => v != null)
      .sort((a, b) => a - b);

    return xs.filter((v, i) => i === 0 || v !== xs[i - 1]);
  };

  const getEdgeGaps = (xs) => {
    if (!Array.isArray(xs) || xs.length < 2) {
      return { firstGap: null, lastGap: null, minGap: null };
    }

    let minGap = Infinity;
    for (let i = 1; i < xs.length; i += 1) {
      const step = xs[i] - xs[i - 1];
      if (step > 0 && step < minGap) minGap = step;
    }

    const firstGapRaw = xs[1] - xs[0];
    const lastGapRaw = xs[xs.length - 1] - xs[xs.length - 2];

    return {
      firstGap: firstGapRaw > 0 ? firstGapRaw : null,
      lastGap: lastGapRaw > 0 ? lastGapRaw : null,
      minGap: Number.isFinite(minGap) ? minGap : null,
    };
  };

  let minStep = Infinity;
  series.forEach((s) => {
    if (
      !s ||
      (s.type !== 'bar' && s.type !== 'boxPlot' && s.type !== 'matrix')
    ) {
      return;
    }

    const xs = getSortedUniqueXValues(s);
    const { minGap } = getEdgeGaps(xs);
    if (Number.isFinite(minGap) && minGap > 0 && minGap < minStep) {
      minStep = minGap;
    }
  });

  if (!Number.isFinite(minStep) || minStep <= 0) {
    const span = domainEndNum - domainStartNum;
    minStep = span > 0 ? span : 1;
  }

  let padStart = 0;
  let padEnd = 0;

  series.forEach((s) => {
    if (!s) return;

    if (s.type === 'matrix') {
      const xs = getSortedUniqueXValues(s);
      const { firstGap, lastGap } = getEdgeGaps(xs);

      const gapStart = Number.isFinite(firstGap) ? firstGap : minStep;
      const gapEnd = Number.isFinite(lastGap) ? lastGap : minStep;

      const factorRaw = Number(s.cellWidthFactor);
      const factor = Number.isFinite(factorRaw)
        ? Math.max(0.05, Math.min(1, factorRaw))
        : 0.95;

      const anchorRaw = s.timeAnchor || 'center';
      const anchor =
        anchorRaw === 'left'
          ? 'start'
          : anchorRaw === 'right'
            ? 'end'
            : anchorRaw;

      if (anchor === 'start') {
        padEnd = Math.max(padEnd, gapEnd * factor);
      } else if (anchor === 'end') {
        padStart = Math.max(padStart, gapStart * factor);
      } else {
        padStart = Math.max(padStart, (gapStart * factor) / 2);
        padEnd = Math.max(padEnd, (gapEnd * factor) / 2);
      }

      return;
    }

    if (s.type !== 'bar' && s.type !== 'boxPlot') return;

    const alignment = s.alignment || 'center';
    const paddingFactor = Number.isFinite(Number(s.paddingFactor))
      ? Number(s.paddingFactor)
      : 0.8;
    const barDomainWidth = minStep * paddingFactor;

    if (alignment === 'left') {
      padStart = Math.max(padStart, barDomainWidth);
    } else if (alignment === 'right') {
      padEnd = Math.max(padEnd, barDomainWidth);
    } else {
      const halfWidth = barDomainWidth / 2;
      padStart = Math.max(padStart, halfWidth);
      padEnd = Math.max(padEnd, halfWidth);
    }
  });

  return { start: padStart, end: padEnd };
}

export const computeScales = (chartValues, axisConfig) => {
  const scales = {};
  const series = chartValues.options?.series || [];
  const data = chartValues.data || [];
  const rootData = Array.isArray(data) ? data : [];
  const validAxisKeys = new Set(['x', 'x2', 'y', 'y2']);

  // loop through each axis in the config and compute the corresponding scale
  Object.entries(axisConfig).forEach(([axisKey, config]) => {
    if (!validAxisKeys.has(axisKey)) return;

    const axisOptions = config && typeof config === 'object' ? config : {};
    const { type, domainMin, domainMax, nice } = axisOptions;
    // determine whether this is an x or y axis
    const isX = axisKey === 'x' || axisKey === 'x2';

    // filter matching series that use this axis and return the objects
    // only support the boolean flags `isSecondaryXAxis` / `isSecondaryYAxis`
    // primary axes: axisKey without trailing '2' (e.g., 'x' or 'y')
    const isSecondaryAxis = String(axisKey).endsWith('2');
    const matchingSeries = series.filter((s) => {
      if (!s) return false;
      const isSecondaryFlag = isX ? !!s.isSecondaryXAxis : !!s.isSecondaryYAxis;
      return isSecondaryAxis ? isSecondaryFlag : !isSecondaryFlag;
    });

    const getSeriesData = (s) => (Array.isArray(s?.data) ? s.data : rootData);

    // collect accessor keys for this axis. support boxplot-style multi-value keys
    const valueProps = isX ? seriesAccessorProps.x : seriesAccessorProps.y;

    let domain;
    const scaleType = type || 'linear';

    const toComparableNumber = (value) => {
      if (value instanceof Date) return value.getTime();
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    if (scaleType === 'band') {
      // For band scales we need an array of categorical values (preserve order, unique)
      const vals = [];
      matchingSeries.forEach((s) => {
        const seriesData = getSeriesData(s);
        const accessorKeys = valueProps.map((p) => s?.[p]).filter(Boolean);
        accessorKeys.forEach((key) => {
          if (!key) return;
          const accessor = createAccessor(key);
          seriesData.forEach((d) => {
            const v = accessor(d);
            if (v != null && !vals.includes(v)) vals.push(v);
          });
        });
      });
      domain = vals.length ? vals : [];
    } else {
      let minComparable = Infinity;
      let maxComparable = -Infinity;
      let minValue;
      let maxValue;

      matchingSeries.forEach((s) => {
        const seriesData = getSeriesData(s);
        const accessorKeys = valueProps.map((p) => s?.[p]).filter(Boolean);
        if (accessorKeys.length === 0) return;
        const [seriesMin, seriesMax] = combineNumericExtent(
          seriesData,
          accessorKeys,
        );
        const seriesMinComparable = toComparableNumber(seriesMin);
        const seriesMaxComparable = toComparableNumber(seriesMax);
        if (seriesMinComparable == null || seriesMaxComparable == null) return;

        if (seriesMinComparable < minComparable) {
          minComparable = seriesMinComparable;
          minValue = seriesMin;
        }
        if (seriesMaxComparable > maxComparable) {
          maxComparable = seriesMaxComparable;
          maxValue = seriesMax;
        }
      });

      domain =
        Number.isFinite(minComparable) && Number.isFinite(maxComparable)
          ? [minValue, maxValue]
          : [0, 1];

      // include cumulative totals for stacked bars so bars are not clipped
      if (!isX) {
        const stackedExtent = computeStackedExtent(data, matchingSeries);
        if (stackedExtent) {
          domain = [
            Math.min(domain[0], stackedExtent[0], 0),
            Math.max(domain[1], stackedExtent[1], 0),
          ];
        }
      }

      if (isX && (scaleType === 'linear' || scaleType === 'time')) {
        // Add side-specific domain padding for bar-like glyph widths.
        // This avoids edge clipping while preserving spacing/alignment.
        const paddedSeries = matchingSeries.map((s) => ({
          ...s,
          data: getSeriesData(s),
        }));
        const domainPadding = getContinuousXDomainPadding(paddedSeries, domain);

        if (domainMin == null) {
          if (domain[0] instanceof Date) {
            const startMs = domain[0].getTime() - domainPadding.start;
            domain[0] = new Date(startMs);
          } else {
            domain[0] = Number(domain[0]) - domainPadding.start;
          }
        }

        if (domainMax == null) {
          if (domain[1] instanceof Date) {
            const endMs = domain[1].getTime() + domainPadding.end;
            domain[1] = new Date(endMs);
          } else {
            domain[1] = Number(domain[1]) + domainPadding.end;
          }
        }
      }

      if (domainMin != null) domain[0] = domainMin;
      if (domainMax != null) domain[1] = domainMax;

      if (scaleType === 'log') {
        const minValue = Number(domain[0]);
        const maxValue = Number(domain[1]);
        const safeMin =
          Number.isFinite(minValue) && minValue > 0 ? minValue : 1;
        const safeMax =
          Number.isFinite(maxValue) && maxValue > safeMin
            ? maxValue
            : safeMin * 10;

        domain = [safeMin, safeMax];
      }
    }
    const scale = getScale(
      scaleType,
      domain,
      getRange(axisKey, chartValues),
      nice,
    );
    const finalDomain = scale.domain();
    const range = scale.range();
    scales[axisKey] = { scale, domain: finalDomain, range };
  });
  return scales;
};
