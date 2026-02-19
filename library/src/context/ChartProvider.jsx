/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { scaleLinear, scaleBand, extent } from 'd3';

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
    // controls whether child components should be visible/animate yet
    animationsLocked: values.animationsLocked ?? true,
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

  // series registry: { id: { accessors: { x, y }, scaleHint: { x, y } } }
  const [seriesMap, setSeriesMap] = useState({});

  const registerSeries = useCallback((metaData) => {
    setSeriesMap((prev) => ({ ...prev, [metaData.id]: metaData }));
  }, []);
  const unregisterSeries = useCallback((id) => {
    setSeriesMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  // compute domains from registered series + data, with explicit overrides preferred
  const computed = useMemo(() => {
    const {
      data,
      margin,
      width,
      height,
      // xScaleType,
      // yScaleType,
      xDomain: explicitX,
      yDomain: explicitY,
      fixedZeroY,
      xNice,
      yNice,
    } = chartValues;

    const innerWidth = Math.max(
      0,
      width - (margin.left || 0) - (margin.right || 0),
    );
    const innerHeight = Math.max(
      0,
      height - (margin.top || 0) - (margin.bottom || 0),
    );

    // helper to gather combined numeric extent
    const combineNumericExtent = (getValue) => {
      const all = [];
      Object.values(seriesMap).forEach((series) => {
        if (!series.accessors || !series.accessors.x) return;
        // assume each series uses same global data array
        data.forEach((d) => {
          const v = getValue(d, series);
          if (v != null && !Number.isNaN(v)) all.push(v);
        });
      });
      return all.length ? extent(all) : [0, 0];
    };

    // X domain
    let xDomain;
    if (explicitX) {
      xDomain = explicitX;
    } else {
      // if any series requests a band scale for X, derive categorical domain
      const anyBand = Object.values(seriesMap).some(
        (series) => series.scaleHint?.x === 'band',
      );
      if (anyBand) {
        // unique values from accessors.x across data
        const set = new Set();
        Object.values(seriesMap).forEach((series) => {
          const ax = series.accessors?.x;
          if (!ax) return;
          data.forEach((d) => set.add(ax(d)));
        });
        xDomain = Array.from(set);
      } else {
        // numeric/time continuous domain
        // take extents across series' x accessors
        // if no series have registered yet, fall back to deriving domain directly from the data
        let ext;
        if (Object.values(seriesMap).length > 0) {
          ext = combineNumericExtent((d, series) => series.accessors.x(d));
        } else {
          ext = extent(data, (d) => d.x);
        }
        xDomain = [ext[0] ?? 0, ext[1] ?? 1];
      }
    }

    // Y domain
    let yDomain;
    if (explicitY) {
      yDomain = explicitY;
    } else {
      // derive y extent from registered series if available, otherwise derive from data
      let ext;
      if (Object.values(seriesMap).length > 0) {
        ext = combineNumericExtent((d, series) => series.accessors.y(d));
      } else {
        ext = extent(data, (d) => d.y);
      }
      let min = ext[0] ?? 0;
      let max = ext[1] ?? 0;

      // if min === max, add a small padding
      if (min === max) {
        const pad = Math.abs(min) * 0.1 || 1;
        min = min - pad;
        max = max + pad;
      }

      if (fixedZeroY) {
        min = Math.min(min, 0);
        max = Math.max(max, 0);
      }

      yDomain = [min, max];
    }

    // Create scales
    let xScale;
    if (Array.isArray(xDomain) && typeof xDomain[0] !== 'number') {
      // categorical -> band
      xScale = scaleBand()
        .domain(xDomain)
        .range([margin.left, margin.left + innerWidth])
        .padding(0.1);
    } else {
      // continuous
      xScale = scaleLinear()
        .domain(xDomain)
        .range([margin.left, margin.left + innerWidth]);
      if (xNice) xScale.nice();
    }

    let yScale = scaleLinear()
      .domain([yDomain[0], yDomain[1]])
      .range([margin.top + innerHeight, margin.top]);
    if (yNice) yScale.nice();

    return { xScale, yScale, xDomain, yDomain, innerWidth, innerHeight };
  }, [chartValues, seriesMap]);

  // Update state if initialValues change
  useEffect(() => {
    // I can assume that this setState call is safe because initialValues is a
    // a stable object created with useMemo in ChartContainer.jsx
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartValues((prev) =>
      typeCheckChartValues({ ...prev, ...initialValues }),
    );
  }, [initialValues]);

  // unlock animations after computed scales/layout stabilizes
  useEffect(() => {
    // when computed changes, unlock animations on next frame so children
    // render with final layout before being revealed/animated
    let raf = null;
    // if animations are currently locked, schedule an unlock
    if (chartValues.animationsLocked) {
      raf = requestAnimationFrame(() => {
        setChartValues((prev) => ({ ...prev, animationsLocked: false }));
      });
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [
    computed.xScale,
    computed.yScale,
    computed.innerWidth,
    computed.innerHeight,
  ]);

  // API given to children
  const api = useMemo(
    () => ({
      chartValues,
      updateChartValues: (update) =>
        setChartValues((prev) => typeCheckChartValues({ ...prev, ...update })),
      registerSeries,
      unregisterSeries,
      xScale: computed.xScale,
      yScale: computed.yScale,
      domains: {
        x: computed.xScale?.domain(),
        y: computed.yScale?.domain(),
      },
      scalesReady: !!(
        computed.xScale &&
        computed.yScale &&
        chartValues.innerWidth &&
        chartValues.innerHeight
      ),
      // or we might need to track this in a better way
      getAccessors: () => ({ x: (d) => d.x, y: (d) => d.y }),
    }),
    [chartValues, registerSeries, unregisterSeries, computed],
  );

  return (
    <ChartContext.Provider value={api}>
      {api.scalesReady ? children : null}
    </ChartContext.Provider>
  );
}
