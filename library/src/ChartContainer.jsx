import { useMemo } from 'react';
import { ChartProvider } from './context/ChartProvider';
// import {
// HoverPointContext,
// HoverUpdateContext,
// } from './context/HoverPointProvider';
import ErrorBoundary from './ErrorBoundary';
// import { pointer } from 'd3';
import { defaultOptions } from './utilities/defaultOptions';
import { axisHasMappedSeries, mergeDeep } from './utilities/dataUtilities';
import XAxis from './axisComponents/XAxis';
import YAxis from './axisComponents/YAxis';
import Legend from './axisComponents/Legend';
import Line from './plotComponents/Line';
import Bar from './plotComponents/Bar';
import BoxPlot from './plotComponents/BoxPlot';
import Circle from './plotComponents/Circle';
import Area from './plotComponents/Area';
import Matrix from './plotComponents/Matrix';
import Heatmap from './plotComponents/Heatmap';

function ChartContainer({
  height = 600,
  width = 800,
  margin = { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' },
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
      baseMargin: margin,
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
      case 'matrix':
        return <Matrix key={s.id ?? i} seriesIndex={i} options={s} />;
      case 'heatmap':
        return <Heatmap key={s.id ?? i} seriesIndex={i} options={s} />;
      default:
        return null;
    }
  });

  const axes = initialValues.options.axes || {};
  const series = initialValues.options.series || [];

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
          {axes.x && axisHasMappedSeries(series, 'x') && (
            <XAxis options={axes.x} axisKey="x" />
          )}
          {axes.x2 && axisHasMappedSeries(series, 'x2') && (
            <XAxis options={axes.x2} axisKey="x2" />
          )}
          {axes.y && axisHasMappedSeries(series, 'y') && (
            <YAxis options={axes.y} axisKey="y" />
          )}
          {axes.y2 && axisHasMappedSeries(series, 'y2') && (
            <YAxis options={axes.y2} axisKey="y2" />
          )}
          {seriesNodes}
          <Legend />
          {children}
        </svg>
      </ErrorBoundary>
    </ChartProvider>
  );
}

export default ChartContainer;
