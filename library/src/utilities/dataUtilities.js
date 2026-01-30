import { scaleLinear, scaleBand, scaleTime, scaleThreshold, extent } from 'd3';

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
