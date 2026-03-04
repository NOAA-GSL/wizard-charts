import { scaleLinear, scaleBand, scaleTime, scaleThreshold, extent } from 'd3';
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
      return [margin.left, innerWidth + margin.left];
    case 'y':
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
      if (v != null && !Number.isNaN(v)) values.push(v);
    });
  });

  return values.length ? extent(values) : [0, 1];
};

export const computeScales = (chartValues, axisConfig) => {
  const scales = {};
  const series = chartValues.options?.series || [];
  const data = chartValues.data || [];

  // loop through each axis in the config and compute the corresponding scale
  Object.entries(axisConfig).forEach(([axisKey, config]) => {
    const { type, domainMin, domainMax, nice } = config;
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

    // collect accessor keys for this axis. support boxplot-style multi-value keys
    const valueProps = isX ? seriesAccessorProps.x : seriesAccessorProps.y;

    const accessorKeys = matchingSeries.flatMap((s) =>
      valueProps.map((p) => s?.[p]).filter(Boolean),
    );

    const domain = combineNumericExtent(data, accessorKeys);
    if (domainMin != null) domain[0] = domainMin;
    if (domainMax != null) domain[1] = domainMax;

    const scaleType = type || 'linear';

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
