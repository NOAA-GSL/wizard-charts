import { useMemo } from 'react';
import { ChartProvider } from './context/ChartProvider';
// import {
// HoverPointContext,
// HoverUpdateContext,
// } from './context/HoverPointProvider';
import ErrorBoundary from './ErrorBoundary';
// import { pointer } from 'd3';
import { defaultOptions } from './utilities/defaultOptions';
import { mergeDeep } from './utilities/dataUtilities';
import XAxis from './axisComponents/XAxis';
import YAxis from './axisComponents/YAxis';
import Line from './plotComponents/Line';
import Bar from './plotComponents/Bar';
import BoxPlot from './plotComponents/BoxPlot';
import Circle from './plotComponents/Circle';
import Area from './plotComponents/Area';

function ChartContainer({
  height = 600,
  width = 800,
  margin = { top: 0, right: 0, bottom: 0, left: 0 },
  data = [],
  options = {},
  children,
  className = '',
  sx = {},
}) {
  // const updateHoverPoint = useContext(HoverUpdateContext);
  // const hoverPoint = useContext(HoverPointContext);
  // const svgReadoutRef = useRef(null);

  // useMemo to avoid unnecessary re-renders in the useEffect hook of ChartProvider
  const initialValues = useMemo(
    () => ({
      height,
      width,
      margin,
      data,
      options: mergeDeep(defaultOptions, options),
    }),
    [height, width, margin, data, options],
  );

  // switch statement to render different series types based on options
  const seriesNodes = initialValues.options.series.map((s, i) => {
    switch (s.type) {
      case 'area':
        return <Area key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'bar':
        return <Bar key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'boxPlot':
        return <BoxPlot key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'circle':
        return <Circle key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'line':
        return <Line key={s.id ?? i} seriesIndex={i} options={s} />;
      default:
        return null;
    }
  });

  const axes = initialValues.options.axes || {};
  const series = initialValues.options.series || [];

  const hasSeriesForAxis = (axisKey) => {
    const isX = axisKey === 'x' || axisKey === 'x2';
    const isSecondary = axisKey === 'x2' || axisKey === 'y2';

    return series.some((s) => {
      if (!s) return false;
      const usesSecondary = isX ? !!s.isSecondaryXAxis : !!s.isSecondaryYAxis;
      return usesSecondary === isSecondary;
    });
  };

  return (
    <ChartProvider initialValues={initialValues}>
      <ErrorBoundary>
        <svg
          height={height}
          width={width}
          className={className}
          style={sx}
          // onMouseMove={(e) =>
          //   updateHoverPoint(pointer(e, svgReadoutRef.current))
          // }
        >
          {axes.x && hasSeriesForAxis('x') && (
            <XAxis options={axes.x} axisKey="x" />
          )}
          {axes.x2 && hasSeriesForAxis('x2') && (
            <XAxis options={axes.x2} axisKey="x2" />
          )}
          {axes.y && hasSeriesForAxis('y') && (
            <YAxis options={axes.y} axisKey="y" />
          )}
          {axes.y2 && hasSeriesForAxis('y2') && (
            <YAxis options={axes.y2} axisKey="y2" />
          )}
          {seriesNodes}
          {children}
        </svg>
      </ErrorBoundary>
    </ChartProvider>
  );
}

export default ChartContainer;
