import { useMemo, useContext, useRef } from 'react';
import { ChartProvider } from './context/ChartProvider';
import {
  HoverPointContext,
  HoverUpdateContext,
} from './context/HoverPointProvider';
import ErrorBoundary from './ErrorBoundary';
import { pointer } from 'd3';
import { defaultOptions } from './utilities/defaultOptions';
import { mergeDeep } from './utilities/dataUtilities';
import XAxis from './axisComponents/XAxis';
import YAxis from './axisComponents/YAxis';

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
  const updateHoverPoint = useContext(HoverUpdateContext);
  const hoverPoint = useContext(HoverPointContext);
  console.log('hoverPoint:', hoverPoint);
  const svgReadoutRef = useRef(null);

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
  return (
    <ChartProvider initialValues={initialValues}>
      <ErrorBoundary>
        <svg
          height={height}
          width={width}
          className={className}
          style={sx}
          onMouseMove={(e) =>
            updateHoverPoint(pointer(e, svgReadoutRef.current))
          }
        >
          {children}
          <XAxis axisOptions={initialValues.options.axes.x} />
          <YAxis axisOptions={initialValues.options.axes.y} />
        </svg>
      </ErrorBoundary>
    </ChartProvider>
  );
}

export default ChartContainer;
