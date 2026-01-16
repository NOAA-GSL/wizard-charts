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

// todo: should I add a way to set nice() on the scales?
export function getScale(type, domain, range) {
  switch (type) {
    case 'linear':
      return scaleLinear().domain(domain).range(range);
    case 'band':
      return scaleBand().domain(domain).range(range);
    case 'time':
      return scaleTime().domain(domain).range(range);
    case 'threshold':
      return scaleThreshold().domain(domain).range(range);
    default:
      throw new Error(`Unknown scale type: ${type}`);
  }
}
