import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createElement, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { defaultOptions } from '../utilities/defaultOptions';
import HtmlReadout from './HtmlReadout';

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal()),
  useSyncExternalStore: vi.fn(),
}));

vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  createPortal: vi.fn((children) => children),
}));

const model = { chartId: 'test-chart', title: 'Forecast', rows: [] };

function renderReadout(tooltip, ReadoutComponent) {
  return renderToStaticMarkup(
    createElement(HtmlReadout, {
      model,
      options: { tooltip },
      svgRef: { current: null },
      ReadoutComponent,
    }),
  );
}

function getBoundaryMarkup(markup) {
  return markup.slice(0, markup.indexOf('>') + 1);
}

describe('HTML tooltip portal layering', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { body: {} });
    useSyncExternalStore.mockImplementation((_subscribe, getSnapshot) =>
      getSnapshot(),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('retains the default portal z-index of 1000', () => {
    expect(defaultOptions.readout.tooltip.zIndex).toBe(1000);
    expect(
      getBoundaryMarkup(renderReadout(defaultOptions.readout.tooltip)),
    ).toContain('z-index:1000');
  });

  test.each([
    [undefined, 1000],
    [null, 1000],
    [0, 0],
    [30, 30],
    [-1, -1],
  ])('applies zIndex %s to the portal boundary as %s', (zIndex, expected) => {
    const markup = renderReadout({ zIndex });
    const boundary = getBoundaryMarkup(markup);

    expect(boundary).toContain('class="wizard-charts-readout-boundary"');
    expect(boundary).toContain(`z-index:${expected}`);
    expect(createPortal).toHaveBeenCalledWith(expect.anything(), document.body);
  });

  test('keeps tooltip.sx and className scoped to the content surface', () => {
    const markup = renderReadout({
      zIndex: 30,
      className: 'consumer-tooltip',
      sx: { zIndex: 9999, color: 'red' },
    });
    const boundary = getBoundaryMarkup(markup);

    expect(boundary).toContain('z-index:30');
    expect(boundary).not.toContain('z-index:9999');
    expect(boundary).not.toContain('consumer-tooltip');
    expect(markup).toMatch(
      /class="wizard-charts-readout-tooltip consumer-tooltip" style="[^"]*z-index:9999;color:red/,
    );
  });

  test('a surface-only z-index does not change the default portal layer', () => {
    expect(getBoundaryMarkup(renderReadout({ sx: { zIndex: 30 } }))).toContain(
      'z-index:1000',
    );
  });

  test('uses the same portal layer for custom tooltip content', () => {
    function CustomReadout({ readout }) {
      return createElement('strong', null, readout.title);
    }

    const markup = renderReadout({ zIndex: 30 }, CustomReadout);

    expect(getBoundaryMarkup(markup)).toContain('z-index:30');
    expect(markup).toContain('<strong>Forecast</strong>');
  });

  test('remains absent during server rendering without a document', () => {
    vi.unstubAllGlobals();
    useSyncExternalStore.mockImplementation(
      (_subscribe, _getSnapshot, getServerSnapshot) => getServerSnapshot(),
    );

    expect(renderReadout({ zIndex: 30 })).toBe('');
    expect(createPortal).not.toHaveBeenCalled();
  });
});
