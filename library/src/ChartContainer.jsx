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
      case 'line':
        return <Line key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'bar':
        return <Bar key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'boxPlot':
        return <BoxPlot key={s.id ?? i} seriesIndex={i} options={s} />;
      default:
        return null;
    }
  });

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
          <XAxis options={initialValues.options.axes.x} />
          <YAxis options={initialValues.options.axes.y} />
          {seriesNodes}
          {children}
        </svg>
      </ErrorBoundary>
    </ChartProvider>
  );
}

export default ChartContainer;
