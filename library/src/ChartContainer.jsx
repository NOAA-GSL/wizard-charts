import { useMemo } from 'react';
import { ChartProvider } from './context/ChartProvider';

function ChartContainer({
  height = 600,
  width = 800,
  margin = { top: 0, right: 0, bottom: 0, left: 0 },
  data = [],
  children,
  className = '',
  xScaleType = 'linear',
  yScaleType = 'linear',
  sx = {},
}) {
  // useMemo to avoid unnecessary re-renders in the useEffect hook of ChartProvider
  const initialValues = useMemo(
    () => ({ height, width, margin, data, xScaleType, yScaleType }),
    [height, width, margin, data, xScaleType, yScaleType],
  );
  return (
    <ChartProvider initialValues={initialValues}>
      <svg height={height} width={width} className={className} style={sx}>
        {children}
      </svg>
    </ChartProvider>
  );
}

export default ChartContainer;
