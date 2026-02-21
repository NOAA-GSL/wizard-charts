/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { computeScales } from '../utilities/dataUtilities';

export const ChartContext = createContext();

// ensure that certain chart values are of the correct type
function typeCheckChartValues(values) {
  return {
    ...values,
    height: Number(values.height) || 0,
    width: Number(values.width) || 0,
    margin: {
      top: Number(values.margin?.top) || 0,
      right: Number(values.margin?.right) || 0,
      bottom: Number(values.margin?.bottom) || 0,
      left: Number(values.margin?.left) || 0,
    },
    // inner dimensions are always derived from height/width and margins
    innerHeight: Math.max(
      0,
      Number(values.height) -
        Number(values.margin?.top || 0) -
        Number(values.margin?.bottom || 0),
    ),
    innerWidth: Math.max(
      0,
      Number(values.width) -
        Number(values.margin?.left || 0) -
        Number(values.margin?.right || 0),
    ),
    animationDuration: Number(values.animationDuration) || 0,
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
    typeCheckChartValues(initialValues),
  );

  // update function
  const updateChartValues = useCallback((updates) => {
    setChartValues((prev) => typeCheckChartValues({ ...prev, ...updates }));
  }, []);

  // compute derived values like scales here if needed, and include them in the context value
  const derivedValues = useMemo(() => {
    const series = chartValues.options?.series || [];
    // grab all axis information from options
    const axisConfig = chartValues.options?.axes || {};

    // we need one x (x or x2) and one y (y or y2) axis present
    const hasX = Boolean(axisConfig.x || axisConfig.x2);
    const hasY = Boolean(axisConfig.y || axisConfig.y2);
    if (series.length === 0 || !hasX || !hasY) return {};

    // helper function to get scales for each axis based on the data and options
    const scales = computeScales(chartValues, axisConfig);

    return {
      scales,
    };
  }, [chartValues]);
  console.log('derivedValues:', derivedValues);

  // values to be provided by the context, along with the update function
  const contextValue = useMemo(
    () => ({
      chartValues,
      updateChartValues,
    }),
    [chartValues, updateChartValues],
  );

  // Update state if initialValues change
  useEffect(() => {
    // I can assume that this setState call is safe because initialValues is a
    // a stable object created with useMemo in ChartContainer.jsx
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartValues((prev) =>
      typeCheckChartValues({ ...prev, ...initialValues }),
    );
  }, [initialValues]);

  return (
    <ChartContext.Provider value={contextValue}>
      {children}
    </ChartContext.Provider>
  );
}
