/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  computeScales,
  mergeDeep,
  createAccessor,
} from '../utilities/dataUtilities';
import {
  defaultOptions,
  defaultSeriesOptions,
  defaultAxisOptions,
} from '../utilities/defaultOptions';

export const ChartContext = createContext();

// merge our default options and ensure that certain chart values are of the correct type
function buildChartValues(chartValues) {
  const baseOptions = mergeDeep(defaultOptions, chartValues.options || {});
  const mergedSeries = (baseOptions.series || []).map((series) =>
    mergeDeep(defaultSeriesOptions, series),
  );
  const mergedAxes = Object.keys(baseOptions.axes || {}).reduce((acc, key) => {
    acc[key] = mergeDeep(defaultAxisOptions, baseOptions.axes[key] || {});
    return acc;
  }, {});

  // prefer explicit top-level values (chartValues.height) but fall back to options
  const height = Number(chartValues.height ?? baseOptions.height) || 0;
  const width = Number(chartValues.width ?? baseOptions.width) || 0;
  const margin = {
    top: Number(chartValues.margin?.top ?? baseOptions.margin?.top) || 0,
    right: Number(chartValues.margin?.right ?? baseOptions.margin?.right) || 0,
    bottom:
      Number(chartValues.margin?.bottom ?? baseOptions.margin?.bottom) || 0,
    left: Number(chartValues.margin?.left ?? baseOptions.margin?.left) || 0,
  };
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);
  const innerWidth = Math.max(0, width - margin.left - margin.right);

  const options = { ...baseOptions, series: mergedSeries, axes: mergedAxes };

  return {
    ...chartValues,
    options,
    height,
    width,
    margin,
    innerHeight,
    innerWidth,
  };
}

/**
 * This provider is used to track the chart properties. Example usage:
 *
 * const { chartValues, updateChartValues } = useContext(ChartContext);
 *
 * Read values: chartValues.innerWidth, chartValues.xScaleType, etc.
 * Update values: updateChartValues({ innerWidth: newWidth });
 */
export function ChartProvider({ children, initialValues = {} }) {
  console.log('initialValues:', initialValues);
  const [chartValues, setChartValues] = useState(
    buildChartValues(initialValues),
  );

  // update function
  const updateChartValues = useCallback((updates) => {
    setChartValues((prev) => buildChartValues({ ...prev, ...updates }));
  }, []);

  // compute derived values like scales here if needed, and include them in the context value
  const computedScales = useMemo(() => {
    const series = chartValues.options?.series || [];
    // grab all axis information from options
    const axisConfig = chartValues.options?.axes || {};

    // we need one x (x or x2) and one y (y or y2) axis present
    const hasX = Boolean(axisConfig.x || axisConfig.x2);
    const hasY = Boolean(axisConfig.y || axisConfig.y2);
    if (series.length === 0 || !hasX || !hasY) return {};

    // helper function to get scales for each axis based on the data and options
    const scales = computeScales(chartValues, axisConfig);

    return scales;
  }, [chartValues]);
  console.log('computedScales:', computedScales);

  // this helps consumers get the correct x and y accessors for each series
  const accessorsBySeries = useMemo(() => {
    const series = chartValues.options?.series || [];
    return series.map((s, i) => {
      // build accessor functions from the series object xKey and yKey
      const xAccessor = createAccessor(s.xKey);
      const yAccessor = createAccessor(s.yKey);

      return {
        id: s.id ?? i,
        x: xAccessor,
        y: yAccessor,
        // store series meta for consumers
        meta: s,
      };
    });
  }, [chartValues.options?.series]);

  // values to be provided by the context, along with the update function
  const contextValue = useMemo(
    () => ({
      chartValues,
      computedScales,
      accessorsBySeries,
      updateChartValues,
    }),
    [chartValues, computedScales, accessorsBySeries, updateChartValues],
  );

  // Update state if initialValues change
  useEffect(() => {
    // I can assume that this setState call is safe because initialValues is a
    // a stable object created with useMemo in ChartContainer.jsx
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartValues((prev) => buildChartValues({ ...prev, ...initialValues }));
  }, [initialValues]);

  return (
    <ChartContext.Provider value={contextValue}>
      {children}
    </ChartContext.Provider>
  );
}
