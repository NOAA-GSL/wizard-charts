import { useMemo, useContext, useRef } from 'react';
import { ChartProvider } from './context/ChartProvider';
import {
  HoverPointContext,
  HoverUpdateContext,
} from './context/HoverPointProvider';
import ErrorBoundary from './ErrorBoundary';
import { pointer } from 'd3';

function ChartContainer({
  height = 600,
  width = 800,
  margin = { top: 0, right: 0, bottom: 0, left: 0 },
  data = [],
  children,
  className = '',
  xScaleType = 'linear',
  yScaleType = 'linear',
  xNice = false,
  yNice = false,
  animationDuration = 1000,
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
      xScaleType,
      yScaleType,
      xNice,
      yNice,
      animationDuration,
    }),
    [
      height,
      width,
      margin,
      data,
      xScaleType,
      yScaleType,
      xNice,
      yNice,
      animationDuration,
    ],
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
        </svg>
      </ErrorBoundary>
    </ChartProvider>
  );
}

export default ChartContainer;
