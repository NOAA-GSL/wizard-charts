import { describe, expect, test } from 'vitest';
import { scaleBand, scaleLinear, scaleLog, scaleTime } from 'd3';
import {
  buildAxisLayout,
  buildAxisTicks,
  getTickValueKey,
} from './measurements';
import { defaultAxisOptions } from './defaultOptions';
import { computeScales, mergeDeep } from './dataUtilities';

function ticksFor(
  scale,
  ticks = {},
  { axisKey = 'x', type = 'linear', series, data = [] } = {},
) {
  return buildAxisTicks({
    axisKey,
    axisOptions: { type, ticks },
    scale,
    domain: scale.domain(),
    chartValues: {
      data,
      options: { series: series || [{ type: 'line', xKey: 'x', yKey: 'y' }] },
    },
  });
}

function layoutFor(
  ticks = {},
  { axisKey = 'x', range = [0, 100], domain = [0, 100], axisOptions = {} } = {},
) {
  const scale = scaleLinear().domain(domain).range(range);
  const chartValues = {
    width: 200,
    height: 200,
    options: {
      axes: {
        [axisKey]: mergeDeep(defaultAxisOptions, { ...axisOptions, ticks }),
      },
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
  return buildAxisLayout({
    chartValues,
    computedScales: { [axisKey]: { scale, domain: scale.domain() } },
  })[axisKey];
}

describe('axis tick generation', () => {
  test('gives sub-second Date ticks unique stable render keys', () => {
    const values = [0, 1, 2].map((millisecond) => new Date(millisecond));
    expect(new Set(values.map(String)).size).toBe(1);
    expect(new Set(values.map(getTickValueKey)).size).toBe(3);
    expect(getTickValueKey(new Date(1))).toBe(getTickValueKey(values[1]));
  });

  test('uses the D3 count hint and scale-aware numeric formatter', () => {
    const scale = scaleLinear().domain([0, 0.00001]);
    const ticks = ticksFor(scale, { amount: 4 });
    expect(ticks.map((tick) => tick.value)).toEqual(scale.ticks(4));
    expect(ticks.map((tick) => tick.label)).toEqual(
      scale.ticks(4).map(scale.tickFormat(4)),
    );
  });

  test('regenerates ticks for the current time window', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const scale = scaleTime().domain([start, new Date(+start + 86400000 * 4)]);
    const original = ticksFor(scale, { amount: 8 }, { type: 'time' });
    scale.domain([start, new Date(+start + 14400000)]);
    const zoomed = ticksFor(scale, { amount: 8 }, { type: 'time' });
    expect(zoomed.map((tick) => tick.value)).toEqual(scale.ticks(8));
    expect(+zoomed[1].value - +zoomed[0].value).toBeLessThan(
      +original[1].value - +original[0].value,
    );
    expect(zoomed.map((tick) => tick.label)).toEqual(
      scale.ticks(8).map(scale.tickFormat(8)),
    );
  });

  test('pairs explicit labels before filtering, ignoring amount', () => {
    const scale = scaleLinear().domain([40, 60]);
    expect(
      ticksFor(scale, {
        amount: 1,
        values: [0, 40, 50, 60, 100],
        labels: ['outside', 'start', 'middle', 'end', 'outside'],
      }),
    ).toEqual([
      { value: 40, label: 'start' },
      { value: 50, label: 'middle' },
      { value: 60, label: 'end' },
    ]);
  });

  test('ignores indexed labels for generated ticks', () => {
    const scale = scaleLinear().domain([40, 60]);
    expect(ticksFor(scale, { amount: 4, labels: ['wrong'] })).toEqual(
      ticksFor(scale, { amount: 4 }),
    );
  });

  test.each(['x', 'y'])(
    'respects empty explicit and formatted labels on %s',
    (axisKey) => {
      const scale = scaleLinear().domain([0, 2]);
      expect(
        ticksFor(
          scale,
          {
            values: [0, 1, 2],
            labels: [''],
            formatter: (value) => (value === 1 ? '' : 'two'),
          },
          { axisKey },
        ).map((tick) => tick.label),
      ).toEqual(['', '', 'two']);
    },
  );

  test('filters invalid and duplicate values without changing label associations', () => {
    const scale = scaleLinear().domain([0, 10]);
    expect(
      ticksFor(scale, {
        values: [null, undefined, NaN, Infinity, 2, 2, 10],
        labels: ['', '', '', '', 'first', 'duplicate', 'last'],
      }),
    ).toEqual([
      { value: 2, label: 'first' },
      { value: 10, label: 'last' },
    ]);
  });

  test('filters Date values inclusively within a reversed domain', () => {
    const values = [0, 1, 2, 3].map(
      (day) => new Date(Date.UTC(2026, 0, day + 1)),
    );
    const scale = scaleTime().domain([values[2], values[1]]);
    expect(
      ticksFor(
        scale,
        {
          values: [...values, new Date(NaN)],
          labels: ['zero', 'one', 'two', 'three'],
        },
        { type: 'time' },
      ),
    ).toEqual([
      { value: values[1], label: 'one' },
      { value: values[2], label: 'two' },
    ]);
  });

  test('does not pass invalid or out-of-view values to a consumer formatter', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-02T00:00:00Z');
    const calls = [];
    const result = ticksFor(
      scaleTime().domain([start, end]),
      {
        values: [null, new Date(NaN), new Date(0), start, end],
        formatter: (value) => {
          calls.push(value);
          return value.toISOString();
        },
      },
      { type: 'time' },
    );
    expect(calls).toEqual([start, end]);
    expect(result.map((tick) => tick.label)).toEqual([
      start.toISOString(),
      end.toISOString(),
    ]);
  });

  test('uses the band domain and discards unknown explicit categories', () => {
    const scale = scaleBand().domain(['a', 'b', 'c']).range([0, 300]);
    expect(
      ticksFor(scale, { amount: 1 }, { type: 'band' }).map(
        (tick) => tick.value,
      ),
    ).toEqual(['a', 'b', 'c']);
    expect(
      ticksFor(scale, { values: ['b', 'unknown'] }, { type: 'band' }),
    ).toEqual([{ value: 'b', label: 'b' }]);
  });

  test('retains the matrix column source and filters it to the viewport', () => {
    const scale = scaleLinear().domain([20, 80]);
    const ticks = ticksFor(
      scale,
      { amount: 1 },
      {
        series: [{ type: 'matrix', xKey: 'column' }],
        data: [0, 20, 40, 60, 80, 100, 40].map((column) => ({ column })),
      },
    );
    expect(ticks.map((tick) => tick.value)).toEqual([20, 40, 60, 80]);
  });

  test('keeps D3 log formatting, including intentionally blank minor labels', () => {
    const scale = scaleLog().domain([1, 1000]);
    expect(
      ticksFor(scale, { amount: 5 }, { axisKey: 'y', type: 'log' }).map(
        (tick) => tick.label,
      ),
    ).toEqual(scale.ticks(5).map(scale.tickFormat(5)));
  });

  test('handles empty band domains and single-value continuous domains', () => {
    expect(ticksFor(scaleBand().domain([]), {}, { type: 'band' })).toEqual([]);
    expect(
      ticksFor(scaleLinear().domain([2, 2])).map((tick) => tick.value),
    ).toEqual([2]);
  });
});

describe('axis label visibility and geometry', () => {
  test('preserves every mark and uses screen space for irregular labels', () => {
    const layout = layoutFor({
      values: [0, 1, 2, 100],
      labels: ['A', 'B', 'C', 'D'],
    });
    expect(layout.ticks.map((tick) => tick.value)).toEqual([0, 1, 2, 100]);
    expect(
      layout.ticks.filter((tick) => tick.showLabel).map((tick) => tick.value),
    ).toEqual([0, 100]);
    expect(layout.tickAngle).toBe(0);
  });

  test('can disable reduction without changing mark positions', () => {
    const ticks = {
      values: [0, 1, 2, 100],
      labels: ['A', 'B', 'C', 'D'],
      reduceLabels: false,
    };
    expect(layoutFor(ticks).ticks.every((tick) => tick.showLabel)).toBe(true);
  });

  test('selects labels in screen order when the range is reversed', () => {
    const ticks = { values: [0, 1, 2, 100], labels: ['A', 'B', 'C', 'D'] };
    const visibleValues = (layout) =>
      layout.ticks.filter((tick) => tick.showLabel).map((tick) => tick.value);
    expect(visibleValues(layoutFor(ticks, { range: [100, 0] }))).toEqual([
      2, 100,
    ]);
  });

  test('uses the final formatted string and honors the pixel gap', () => {
    const ticks = {
      values: [0, 15, 30],
      formatter: () => 'A',
      collisionMinGap: 0,
    };
    expect(
      layoutFor(ticks).ticks.filter((tick) => tick.showLabel),
    ).toHaveLength(3);
    expect(
      layoutFor({ ...ticks, collisionMinGap: 10 }).ticks.filter(
        (tick) => tick.showLabel,
      ),
    ).toHaveLength(2);
    expect(
      layoutFor({ ...ticks, formatter: () => 'long label' }).ticks.filter(
        (tick) => tick.showLabel,
      ),
    ).toHaveLength(1);
  });

  test('does not reserve space for intentionally hidden labels', () => {
    const layout = layoutFor({ values: [0, 50, 100], formatter: () => '' });
    expect(layout.ticks).toHaveLength(3);
    expect(layout.ticks.every((tick) => !tick.showLabel)).toBe(true);
    expect(layout.tickTextOutsideSize).toBe(0);
    expect(layout.tickLabelPadding).toBe(0);
    expect(layout.requiredOutsideSpace).toBeGreaterThan(5);
  });

  test('hidden long labels do not inflate outside space', () => {
    const layout = layoutFor(
      {
        values: [0.1, 0, 100],
        labels: ['long long long label', 'A', 'B'],
      },
      { axisKey: 'y' },
    );
    expect(layout.ticks[0].showLabel).toBe(false);
    expect(layout.tickTextOutsideSize).toBeCloseTo(7.2);
  });

  test.each(['x', 'x2', 'y', 'y2'])(
    'keeps rotated labels outside the %s axis for every supported angle',
    (axisKey) => {
      for (const angle of [-90, -45, 0, 45, 90]) {
        const layout = layoutFor(
          { values: [50], labels: ['Sample label'], angle },
          { axisKey },
        );
        const geometry = layout.ticks[0].labelGeometry;
        expect(geometry.angle).toBe(angle);
        if (axisKey === 'x') expect(geometry.bounds.top).toBeCloseTo(0);
        if (axisKey === 'x2') expect(geometry.bounds.bottom).toBeCloseTo(0);
        if (axisKey === 'y') expect(geometry.bounds.right).toBeCloseTo(0);
        if (axisKey === 'y2') expect(geometry.bounds.left).toBeCloseTo(0);
        expect(layout.tickTextOutsideSize).toBeGreaterThan(0);
      }
    },
  );

  test.each([
    ['x', -45, 'end'],
    ['x', 45, 'start'],
    ['x', 0, 'middle'],
    ['x2', -45, 'start'],
    ['x2', 45, 'end'],
    ['x2', 0, 'middle'],
    ['y', 45, 'end'],
    ['y2', -45, 'start'],
  ])('anchors %s labels at angle %s to %s', (axisKey, angle, anchor) => {
    expect(
      layoutFor({ values: [50], angle }, { axisKey }).ticks[0].labelGeometry
        .textAnchor,
    ).toBe(anchor);
  });

  test.each([-91, 91, Infinity, NaN, '45', null])(
    'falls back to zero for invalid angle %s',
    (angle) => {
      expect(layoutFor({ values: [50], angle }).tickAngle).toBe(0);
    },
  );

  test('measures endpoint overflow from the rotated bounds', () => {
    const layout = layoutFor({
      values: [0],
      labels: ['A long label'],
      angle: -45,
    });
    expect(layout.edgeOverflow.left).toBeCloseTo(
      -layout.ticks[0].labelGeometry.bounds.left,
    );
    expect(layout.edgeOverflow.right).toBe(0);
  });
});

describe('zoom domains and tick generation', () => {
  test.each([
    ['x', 'linear'],
    ['x2', 'linear'],
    ['x', 'time'],
    ['x2', 'time'],
  ])(
    'preserves the exact %s %s zoom domain even with nice enabled',
    (axisKey, type) => {
      const asValue = (value) =>
        type === 'time' ? new Date(value * 3600000) : value;
      const override = [asValue(41.3), asValue(58.7)];
      const values = {
        margin: { left: 20, right: 20, top: 20, bottom: 20 },
        innerWidth: 200,
        innerHeight: 100,
        data: [
          { x: asValue(0.3), y: 1 },
          { x: asValue(99.7), y: 9 },
        ],
        options: {
          series: [
            {
              type: 'line',
              xKey: 'x',
              yKey: 'y',
              isSecondaryXAxis: axisKey === 'x2',
            },
          ],
        },
        domainOverrides: { [axisKey]: override },
      };
      const axes = { [axisKey]: { type, nice: true, isReversed: true } };
      const zoomed = computeScales(values, axes)[axisKey];
      expect(zoomed.domain).toEqual(override);
      expect(zoomed.range).toEqual([220, 20]);
      const base = computeScales({ ...values, domainOverrides: {} }, axes)[
        axisKey
      ];
      expect(+base.domain[0]).toBeLessThan(+asValue(0.3));
      expect(+base.domain[1]).toBeGreaterThan(+asValue(99.7));
      const ticks = ticksFor(zoomed.scale, { amount: 5 }, { axisKey, type });
      expect(ticks.map((tick) => tick.value)).toEqual(zoomed.scale.ticks(5));
      expect(
        ticks.every(
          (tick) => +tick.value >= +override[0] && +tick.value <= +override[1],
        ),
      ).toBe(true);
    },
  );

  test('retains base-domain nicening when an override is invalid', () => {
    const values = {
      margin: { left: 0, right: 0, top: 0, bottom: 0 },
      innerWidth: 100,
      innerHeight: 100,
      data: [
        { x: 0.3, y: 1 },
        { x: 99.7, y: 2 },
      ],
      options: { series: [{ type: 'line', xKey: 'x', yKey: 'y' }] },
      domainOverrides: { x: [60, 40] },
    };
    expect(
      computeScales(values, { x: { type: 'linear', nice: true } }).x.domain,
    ).toEqual([0, 100]);
  });
});
