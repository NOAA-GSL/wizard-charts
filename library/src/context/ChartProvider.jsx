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
  normalizeDataShape,
} from '../utilities/dataUtilities';
import {
  buildAxisLayout,
  getAutoMarginFromAxisLayout,
  getProvisionalNumericMargin,
  normalizeMarginInput,
  resolveMargin,
} from '../utilities/measurements';
import {
  defaultOptions,
  defaultSeriesOptions,
  defaultAxisOptions,
  seriesAccessorProps,
} from '../utilities/defaultOptions';

export const ChartContext = createContext();

const SUPPORTED_AXIS_KEYS = new Set(['x', 'y', 'x2', 'y2']);
const warnedUnsupportedAxisKeys = new Set();

function warnUnsupportedAxisKey(axisKey) {
  if (warnedUnsupportedAxisKeys.has(axisKey)) return;
  warnedUnsupportedAxisKeys.add(axisKey);

  if (typeof console === 'undefined' || typeof console.debug !== 'function') {
    return;
  }

  console.debug(
    `[wizard-charts] Unsupported axis key "${axisKey}" was ignored. Supported axis keys are: x, y, x2, y2.`,
  );
}

function computeChartScales(chartValues, axisConfig) {
  const series = chartValues.options?.series || [];
  const hasX = Boolean(axisConfig.x || axisConfig.x2);
  const hasY = Boolean(axisConfig.y || axisConfig.y2);

  if (series.length === 0 || !hasX || !hasY) return {};
  return computeScales(chartValues, axisConfig);
}

// merge our default options and ensure that certain chart values are of the correct type
function buildChartValues(chartValues) {
  const baseOptions = mergeDeep(defaultOptions, chartValues.options || {});
  const mergedSeries = (baseOptions.series || []).map((series) => {
    const merged = mergeDeep(defaultSeriesOptions, series);
    if (merged.data != null) {
      merged.data = normalizeDataShape(merged.data);
    }
    return merged;
  });
  const mergedAxes = Object.keys(baseOptions.axes || {}).reduce((acc, key) => {
    if (!SUPPORTED_AXIS_KEYS.has(key)) {
      warnUnsupportedAxisKey(key);
      return acc;
    }

    acc[key] = mergeDeep(defaultAxisOptions, baseOptions.axes[key] || {});
    return acc;
  }, {});

  // prefer explicit top-level values (chartValues.height) but fall back to options
  const height = Number(chartValues.height ?? baseOptions.height) || 0;
  const width = Number(chartValues.width ?? baseOptions.width) || 0;
  const options = { ...baseOptions, series: mergedSeries, axes: mergedAxes };
  const data = normalizeDataShape(chartValues.data);

  const baseMarginInput =
    chartValues.baseMargin ?? chartValues.margin ?? baseOptions.margin ?? {};
  const baseMargin = normalizeMarginInput(baseMarginInput);

  const makeChartValues = (margin) => {
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);
    const innerWidth = Math.max(0, width - margin.left - margin.right);

    return {
      ...chartValues,
      data,
      options,
      height,
      width,
      baseMargin,
      margin,
      innerHeight,
      innerWidth,
    };
  };

  const provisionalMargin = getProvisionalNumericMargin(baseMargin);
  const provisionalValues = makeChartValues(provisionalMargin);
  const provisionalScales = computeChartScales(provisionalValues, mergedAxes);
  const provisionalAxisLayout = buildAxisLayout({
    chartValues: provisionalValues,
    computedScales: provisionalScales,
  });

  const measuredAutoMargin = getAutoMarginFromAxisLayout(provisionalAxisLayout);
  const resolvedMargin = resolveMargin(baseMargin, measuredAutoMargin);

  const finalValues = makeChartValues(resolvedMargin);
  const computedScales = computeChartScales(finalValues, mergedAxes);
  const axisLayout = buildAxisLayout({
    chartValues: finalValues,
    computedScales,
  });
  const autoMargin = getAutoMarginFromAxisLayout(axisLayout);

  return {
    ...finalValues,
    autoMargin,
    computedScales,
    axisLayout,
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
  const [chartValues, setChartValues] = useState(
    buildChartValues(initialValues),
  );

  const computedScales = useMemo(
    () => chartValues.computedScales || {},
    [chartValues.computedScales],
  );

  // update function
  const updateChartValues = useCallback((updates) => {
    setChartValues((prev) => {
      const nextValues = { ...prev, ...updates };

      if (
        Object.prototype.hasOwnProperty.call(updates, 'margin') &&
        !Object.prototype.hasOwnProperty.call(updates, 'baseMargin')
      ) {
        nextValues.baseMargin = updates.margin;
      }

      return buildChartValues(nextValues);
    });
  }, []);

  // this helps consumers get the correct x and y accessors for each series
  const accessorsBySeries = useMemo(() => {
    const series = chartValues.options?.series || [];
    return series.map((s, i) => {
      const accessors = {};

      // build accessors for each configured series prop (x/y groups)
      Object.entries(seriesAccessorProps).forEach(([, props]) => {
        props.forEach((prop) => {
          if (s?.[prop]) accessors[prop] = createAccessor(s[prop]);
        });
      });

      // convenience primary accessors (`x` and `y`) always point to the canonical keys
      accessors.x = createAccessor(s.xKey);
      accessors.y = createAccessor(s.yKey);

      return {
        id: s.id ?? i,
        // x: accessors.x,
        // y: accessors.y,
        ...accessors,
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
    setChartValues((prev) =>
      buildChartValues({
        ...prev,
        ...initialValues,
        baseMargin: initialValues.baseMargin ?? initialValues.margin,
      }),
    );
  }, [initialValues]);

  return (
    <ChartContext.Provider value={contextValue}>
      {children}
    </ChartContext.Provider>
  );
}
