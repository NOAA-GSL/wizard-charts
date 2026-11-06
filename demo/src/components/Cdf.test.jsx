import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ChartContainer } from '@noaa-gsl/wizard-charts';
import tempData from '../data/tempData';
import Cdf from './Cdf';

vi.mock('@noaa-gsl/wizard-charts', () => ({
  ChartContainer: vi.fn(() => null),
}));

let container;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(createElement(Cdf)));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('CDF demo', () => {
  test.each([0, 1, 2, 3])(
    'preserves every percentile and duplicate amount for forecast %s',
    (forecastIndex) => {
      const selector = container.querySelector('select');
      act(() => {
        selector.value = String(forecastIndex);
        selector.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const { data, options } = ChartContainer.mock.lastCall[0];
      const variableName = 'precipitation_accumulation_6_hour_percentiles';
      const amounts = tempData.data_vars[variableName].data[forecastIndex];
      const percentiles = tempData.coords[`percentile_${variableName}`].data;

      expect(data).toHaveLength(21);
      expect(data.map((point) => point.amount)).toEqual(amounts);
      expect(data.map((point) => point.percentile)).toEqual(percentiles);
      expect(data.filter((point) => point.amount === 0)).toHaveLength(
        amounts.filter((amount) => amount === 0).length,
      );
      expect(options.series[0]).toMatchObject({
        type: 'line',
        xKey: 'amount',
        yKey: 'percentile',
        units: '%',
      });
      expect(options.axes.y).toMatchObject({ domainMin: 0, domainMax: 100 });
      expect(options.readout.hoverMode).toBe('local');
      expect(options.readout.snapTo).toBe('nearestPoint');
    },
  );

  test('labels all four forecast times in UTC and starts with the first', () => {
    const selector = container.querySelector('select');
    expect(container.querySelector('label').htmlFor).toBe(selector.id);
    expect(selector.value).toBe('0');
    expect(Array.from(selector.options, (option) => option.text)).toEqual([
      '2026-11-04 00:00',
      '2026-11-04 18:00',
      '2026-11-05 00:00',
      '2026-11-05 06:00',
    ]);
  });

  test('switches between snapped and pointer-following readouts without changing data', () => {
    const originalData = ChartContainer.mock.lastCall[0].data;
    const selector = container.querySelector('#cdf-snap-to');
    for (const mode of ['none', 'nearestPoint']) {
      act(() => {
        selector.value = mode;
        selector.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const { data, options } = ChartContainer.mock.lastCall[0];
      expect(options.readout.snapTo).toBe(mode);
      expect(data).toBe(originalData);
    }
  });
});
