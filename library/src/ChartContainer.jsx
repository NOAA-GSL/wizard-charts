import { useMemo } from 'react';
import { ChartProvider } from './context/ChartProvider';
import ErrorBoundary from './ErrorBoundary';

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
  sx = {},
}) {
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
    }),
    [height, width, margin, data, xScaleType, yScaleType, xNice, yNice],
  );
  return (
    <ChartProvider initialValues={initialValues}>
      <ErrorBoundary>
        <svg height={height} width={width} className={className} style={sx}>
          {children}
        </svg>
      </ErrorBoundary>
    </ChartProvider>
  );
}

export default ChartContainer;
