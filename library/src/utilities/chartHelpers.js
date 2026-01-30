import { getScale, getRange, getDomain, getAccessors } from './dataUtilities';

export function chartHelpers(chartValues) {
  const { xScaleType, yScaleType, xNice = false, yNice = false } = chartValues;

  // store scales to avoid conflicts or additional logic in components
  const xScale = getScale(
    xScaleType,
    getDomain(chartValues.data, (d) => d.x),
    getRange('x', chartValues),
    xNice,
  );
  const yScale = getScale(
    yScaleType,
    getDomain(chartValues.data, (d) => d.y),
    getRange('y', chartValues),
    yNice,
  );

  return {
    getChartValues: () => chartValues,
    getAccessors: () => getAccessors(),
    getXScale: () => xScale,
    getYScale: () => yScale,
  };
}
