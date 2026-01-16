import { useContext } from 'react';
import { ChartContext } from '../context/ChartProvider';
import { chartHelpers } from '../utilities/chartHelpers';

export function useChartHelpers() {
  const { chartValues } = useContext(ChartContext);
  return chartHelpers(chartValues);
}
