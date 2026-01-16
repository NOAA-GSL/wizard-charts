import { getScale, getRange, getDomain, getAccessors } from './dataUtilities';

export function chartHelpers(chartValues) {
  const { xScaleType, yScaleType } = chartValues;
  return {
    getChartValues: () => chartValues,
    getAccessors: () => getAccessors(),
    getXScale: () =>
      getScale(
        xScaleType,
        getDomain(chartValues.data, (d) => d.x),
        getRange('x', chartValues),
      ),
    getYScale: () =>
      getScale(
        yScaleType,
        getDomain(chartValues.data, (d) => d.y),
        getRange('y', chartValues),
      ),
  };
}
