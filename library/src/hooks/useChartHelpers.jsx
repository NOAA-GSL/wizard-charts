import { useContext } from 'react';
import { ChartContext } from '../context/ChartProvider';

// simple hook to access chart values and scales from the context
export function useChartHelpers() {
  const { chartValues, computedScales, updateChartValues, accessorsBySeries } =
    useContext(ChartContext);

  const xScale = computedScales.x?.scale;
  const x2Scale = computedScales.x2?.scale;
  const yScale = computedScales.y?.scale;
  const y2Scale = computedScales.y2?.scale;
  const xDomain = xScale?.domain();
  const yDomain = yScale?.domain();
  const x2Domain = x2Scale?.domain();
  const y2Domain = y2Scale?.domain();

  // helper function to get the correct accessors (x and y) for a given series
  // defaults to the first one if not found
  const getAccessors = (idOrIndex = 0) => {
    if (typeof idOrIndex === 'string') {
      return (
        accessorsBySeries.find((a) => a.id === idOrIndex) ||
        accessorsBySeries[0]
      );
    }
    return accessorsBySeries[idOrIndex] || accessorsBySeries[0];
  };

  const getSeriesData = (idOrIndex = 0) => {
    const seriesAccessors = getAccessors(idOrIndex);
    const seriesData = seriesAccessors?.meta?.data;
    return Array.isArray(seriesData) ? seriesData : chartValues.data || [];
  };

  // resolve the effective scale/domain pair for a specific series
  const getSeriesScales = (idOrIndex = 0) => {
    const seriesAccessors = getAccessors(idOrIndex);
    const seriesMeta = seriesAccessors?.meta || {};

    const useSecondaryX = Boolean(seriesMeta.isSecondaryXAxis && x2Scale);
    const useSecondaryY = Boolean(seriesMeta.isSecondaryYAxis && y2Scale);

    return {
      xScale: useSecondaryX ? x2Scale : xScale,
      yScale: useSecondaryY ? y2Scale : yScale,
      xDomain: useSecondaryX ? x2Domain : xDomain,
      yDomain: useSecondaryY ? y2Domain : yDomain,
      axisKeys: {
        x: useSecondaryX ? 'x2' : 'x',
        y: useSecondaryY ? 'y2' : 'y',
      },
    };
  };

  return {
    chartValues,
    updateChartValues,
    computedScales,
    accessorsBySeries,
    getAccessors,
    getSeriesData,
    getSeriesScales,
    xScale,
    x2Scale,
    yScale,
    y2Scale,
    xDomain,
    x2Domain,
    yDomain,
    y2Domain,
  };
}
