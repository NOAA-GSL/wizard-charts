/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';

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
    typeCheckChartValues({
      height: 0,
      width: 0,
      xScaleType: null,
      yScaleType: null,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      data: [],
      ...initialValues,
    }),
  );

  // update function
  const updateChartValues = useCallback((updates) => {
    setChartValues((prev) => typeCheckChartValues({ ...prev, ...updates }));
  }, []);

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
