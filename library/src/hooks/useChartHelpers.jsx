import { useContext } from 'react';
import { ChartContext } from '../context/ChartProvider';

export function useChartHelpers() {
  return useContext(ChartContext);
}
