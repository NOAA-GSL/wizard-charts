import { describe, expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { scaleLinear } from 'd3';
import { ChartContext } from '../context/ChartProvider';
import TextPlot from './TextPlot';

function renderLabels({
  textPlots = [],
  series = [{ id: 'line', type: 'line' }],
  data = [],
  secondary = false,
} = {}) {
  const chartValues = {
    width: 300,
    height: 200,
    innerWidth: 260,
    innerHeight: 160,
    margin: { left: 20, right: 20, top: 20, bottom: 20 },
    data,
    options: { series, textPlots, axes: { y2: { units: 'mph' } } },
  };
  const computedScales = {
    x: { scale: scaleLinear().domain([0, 10]).range([20, 280]) },
    y: { scale: scaleLinear().domain([0, 100]).range([180, 20]) },
    ...(secondary && {
      x2: { scale: scaleLinear().domain([0, 20]).range([20, 280]) },
      y2: { scale: scaleLinear().domain([0, 200]).range([180, 20]) },
    }),
  };
  const accessorsBySeries = series.map((entry) => ({
    x: (datum) => datum[entry.xKey || 'x'],
    y: (datum) => datum[entry.yKey || 'y'],
    meta: entry,
  }));
  const markup = renderToStaticMarkup(
    createElement(
      ChartContext.Provider,
      {
        value: { chartValues, computedScales, accessorsBySeries },
      },
      createElement('svg', null, createElement(TextPlot)),
    ),
  );
  return new JSDOM(markup, { contentType: 'image/svg+xml' }).window.document;
}

describe('persistent SVG text plots', () => {
  test('is opt-in and does not render for hidden or unsupported series or missing IDs', () => {
    expect(renderLabels().querySelectorAll('text')).toHaveLength(0);
    const document = renderLabels({
      data: [{ x: 5, y: 50 }],
      series: [
        { id: 'hidden', type: 'line', isVisible: false },
        { id: 'bar', type: 'bar' },
      ],
      textPlots: [
        { seriesId: 'missing' },
        { seriesId: 'hidden' },
        { seriesId: 'bar' },
        { seriesIndex: 99 },
      ],
    });
    expect(document.querySelectorAll('text')).toHaveLength(0);
  });
  test('uses series data, custom accessors, secondary scales and units independently of hover options', () => {
    const document = renderLabels({
      secondary: true,
      data: [{ x: 5, y: 999 }],
      series: [
        {
          id: 'wind',
          type: 'circle',
          isSecondaryXAxis: true,
          isSecondaryYAxis: true,
          showInReadout: false,
          xKey: 'time',
          yKey: 'speed',
          data: [{ time: 10, speed: 100 }],
        },
      ],
      textPlots: [
        {
          seriesId: 'wind',
          precision: 0,
          offset: [8, -12],
          className: 'wind-label',
        },
      ],
    });
    const label = document.querySelector('text');
    expect(label.textContent).toBe('100 mph');
    expect(label.getAttribute('x')).toBe('158');
    expect(label.getAttribute('y')).toBe('88');
    expect(label.classList.contains('wind-label')).toBe(true);
    expect(document.querySelector('g').getAttribute('pointer-events')).toBe(
      'none',
    );
  });
  test('uses one cross-group collision layout with manual labels first', () => {
    const document = renderLabels({
      data: [{ x: 5, y: 50 }],
      textPlots: [
        { seriesId: 'line' },
        { data: [{ x: 5, y: 50, text: 'Event' }] },
      ],
    });
    expect(
      [...document.querySelectorAll('text')].map((node) => node.textContent),
    ).toEqual(['Event']);
  });
  test('renders manual values on explicitly selected secondary axes', () => {
    const document = renderLabels({
      secondary: true,
      textPlots: [
        {
          axisKeys: { x: 'x2', y: 'y2' },
          data: [{ x: 10, y: 100, value: 0 }],
          offset: [0, 0],
        },
      ],
    });
    expect(document.querySelector('text').textContent).toBe('0');
    expect(document.querySelector('text').getAttribute('x')).toBe('150');
    expect(document.querySelector('text').getAttribute('y')).toBe('100');
  });
  test('formatter receives the source datum and a safe default including units', () => {
    const document = renderLabels({
      data: [{ x: 5, y: 12.34, note: 'High' }],
      series: [{ id: 'line', type: 'line', units: 'F' }],
      textPlots: [
        {
          valueFormatter: (value, context) =>
            `${context.datum.note}: ${context.defaultText}`,
          precision: 1,
        },
      ],
    });
    expect(document.querySelector('text').textContent).toBe('High: 12.3 F');
  });
});
