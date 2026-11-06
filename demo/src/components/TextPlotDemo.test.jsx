import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { ChartContainer, useChartController } from '@noaa-gsl/wizard-charts';
import TextPlotDemo from './TextPlotDemo';

vi.mock('@noaa-gsl/wizard-charts', () => ({
  ChartContainer: vi.fn(() => null),
  useChartController: vi.fn(() => ({
    controller: { setZoomWindow: vi.fn(), resetZoom: vi.fn() },
    zoomState: { isZoomed: false },
  })),
}));

let container;
let root;
function chart(className = 'text-plot-interactive') {
  return ChartContainer.mock.calls
    .map(([props]) => props)
    .findLast((props) => props.className === className);
}
function select(id, value) {
  act(() => {
    const element = container.querySelector(`#${id}`);
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(createElement(TextPlotDemo)));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('text plot demo', () => {
  test('starts with extrema priority, a manual annotation, and a uniform/extrema comparison', () => {
    expect(chart().options.textPlots[0].selection).toMatchObject({
      mode: 'auto',
      priority: 'extrema',
    });
    expect(chart().options.textPlots[1].data[0].text).toBe('Front arrives');
    for (const priority of ['uniform', 'extrema']) {
      const comparison = chart(`text-plot-comparison-${priority}`);
      expect(comparison.data).toBe(chart().data);
      expect(comparison.options.textPlots[0].selection.priority).toBe(priority);
    }
  });
  test('switches selection, cadence, collision policy, and dataset using actual options', () => {
    select('text-mode', 'everyNth');
    expect(chart().options.textPlots[0].selection).toMatchObject({
      mode: 'everyNth',
      every: 3,
    });
    expect(container.querySelector('#text-priority').disabled).toBe(true);
    select('text-mode', 'xValues');
    expect(chart().options.textPlots[0].selection.values).toHaveLength(10);
    select('text-collision', 'allow');
    expect(chart().options.textPlots[0].collision).toBe('allow');
    select('text-preset', 'plateaus');
    expect(
      chart().data.some((datum) => !Number.isFinite(datum.temperature)),
    ).toBe(true);
    select('text-preset', 'noisy');
    expect(
      chart().data.every((datum) => Number.isFinite(datum.temperature)),
    ).toBe(true);
  });
  test('removes manual annotations and offers a programmatic Date-based zoom', () => {
    act(() => container.querySelector('#text-manual').click());
    expect(chart().options.textPlots).toHaveLength(1);
    const controller = useChartController.mock.results.at(-1).value.controller;
    act(() =>
      container
        .querySelector('[aria-label="Zoom Extrema Priority to 24 hours"]')
        .click(),
    );
    expect(controller.setZoomWindow).toHaveBeenCalledWith({
      center: chart().data[54].time,
      windowSize: 24 * 3600_000,
    });
  });
});
