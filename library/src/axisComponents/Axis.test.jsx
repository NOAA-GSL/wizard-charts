import { describe, expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { scaleLinear } from 'd3';
import { ChartContext } from '../context/ChartProvider';
import { defaultAxisOptions } from '../utilities/defaultOptions';
import { mergeDeep } from '../utilities/dataUtilities';
import { buildAxisLayout } from '../utilities/measurements';
import XAxis from './XAxis';
import YAxis from './YAxis';

function renderAxis(axisKey, ticks = {}) {
  const options = mergeDeep(defaultAxisOptions, {
    hasGridLines: true,
    ticks: { values: [0, 1, 2, 100], labels: ['A', 'B', 'C', 'D'], ...ticks },
  });
  const chartValues = {
    width: 200,
    height: 200,
    data: [],
    options: {
      axes: { [axisKey]: options },
      series: [
        {
          type: 'line',
          xKey: 'x',
          yKey: 'y',
          isSecondaryXAxis: axisKey === 'x2',
          isSecondaryYAxis: axisKey === 'y2',
        },
      ],
    },
  };
  const computedScales = Object.fromEntries(
    ['x', 'x2', 'y', 'y2'].map((key) => {
      const scale = scaleLinear()
        .domain([0, 100])
        .range(key.startsWith('x') ? [50, 150] : [150, 50]);
      return [key, { scale, domain: scale.domain() }];
    }),
  );
  chartValues.axisLayout = buildAxisLayout({ chartValues, computedScales });
  const markup = renderToStaticMarkup(
    createElement(
      ChartContext.Provider,
      { value: { chartValues, computedScales, accessorsBySeries: [] } },
      createElement(
        'svg',
        null,
        createElement(axisKey.startsWith('x') ? XAxis : YAxis, {
          options,
          axisKey,
        }),
      ),
    ),
  );
  return new JSDOM(markup, { contentType: 'image/svg+xml' }).window.document;
}

describe('axis SVG tick rendering', () => {
  test.each(['x', 'x2', 'y', 'y2'])(
    'keeps all %s marks and grid lines when labels collide',
    (axisKey) => {
      const document = renderAxis(axisKey);
      expect(document.querySelectorAll('.gsl-chart-tick-line')).toHaveLength(4);
      expect(document.querySelectorAll('.gsl-chart-grid-line')).toHaveLength(4);
      expect(document.querySelectorAll('.gsl-chart-tick-label')).toHaveLength(
        2,
      );
      expect(
        document
          .querySelector('.gsl-chart-tick-label')
          .getAttribute('transform'),
      ).toContain('rotate(0)');
    },
  );

  test.each(['x', 'x2', 'y', 'y2'])(
    'shows every requested %s label when reduction is disabled',
    (axisKey) => {
      const document = renderAxis(axisKey, { reduceLabels: false });
      expect(document.querySelectorAll('.gsl-chart-tick-label')).toHaveLength(
        4,
      );
    },
  );

  test.each([
    ['x', -45, 'end'],
    ['x', 45, 'start'],
    ['x2', -45, 'start'],
    ['x2', 45, 'end'],
    ['y', -90, 'end'],
    ['y2', 90, 'start'],
  ])('renders %s angle %s with the %s anchor', (axisKey, angle, anchor) => {
    const document = renderAxis(axisKey, { angle, reduceLabels: false });
    const label = document.querySelector('.gsl-chart-tick-label');
    expect(label.getAttribute('text-anchor')).toBe(anchor);
    expect(label.getAttribute('transform')).toContain(`rotate(${angle})`);
    expect(label.getAttribute('dominant-baseline')).toBe('central');
  });

  test.each([
    ['x', 0, 'middle'],
    ['x2', 45, 'end'],
    ['y', 0, 'end'],
    ['y2', 0, 'start'],
  ])(
    'renders multiline %s tick labels in reading order',
    (axisKey, angle, anchor) => {
      const document = renderAxis(axisKey, {
        values: [0, 100],
        labels: ['11/3\r\nSat', 'Single<br>line'],
        angle,
      });
      const [multiline, single] = document.querySelectorAll(
        '.gsl-chart-tick-label',
      );
      const [first, second] = multiline.querySelectorAll('tspan');
      expect([first.textContent, second.textContent]).toEqual(['11/3', 'Sat']);
      expect(first.getAttribute('x')).toBe('0');
      expect(second.getAttribute('x')).toBe('0');
      expect(Number(first.getAttribute('y'))).toBeLessThan(0);
      expect(Number(second.getAttribute('y'))).toBe(
        -Number(first.getAttribute('y')),
      );
      expect(multiline.getAttribute('text-anchor')).toBe(anchor);
      expect(multiline.getAttribute('transform')).toContain(`rotate(${angle})`);
      expect(single.querySelector('tspan')).toBeNull();
      expect(single.textContent).toBe('Single<br>line');
    },
  );

  test('uses formatter line breaks for generated ticks', () => {
    const document = renderAxis('x', {
      values: [],
      amount: 1,
      formatter: (value) => (value === 0 ? '\n' : `${value}\nSample`),
    });
    expect(document.querySelectorAll('.gsl-chart-tick-line')).toHaveLength(2);
    expect(document.querySelectorAll('.gsl-chart-tick-label')).toHaveLength(1);
    expect(
      Array.from(
        document.querySelectorAll('tspan'),
        (line) => line.textContent,
      ),
    ).toEqual(['100', 'Sample']);
  });

  test('keeps marks when all labels are intentionally empty', () => {
    const document = renderAxis('y', { labels: ['', '', '', ''] });
    expect(document.querySelectorAll('.gsl-chart-tick-label')).toHaveLength(0);
    expect(document.querySelectorAll('.gsl-chart-tick-line')).toHaveLength(4);
  });
});
