import { describe, expect, test } from 'vitest';
import { scaleBand, scaleLinear, scaleTime } from 'd3';
import {
  buildManualTextCandidates,
  buildSeriesTextCandidates,
  layoutTextCandidates,
} from './textPlot';

const bounds = { left: 0, right: 200, top: 0, bottom: 120 };
const accessors = { x: (datum) => datum.x, y: (datum) => datum.y };
const measureText = (text) => ({ width: text.length * 8, height: 12 });
function candidates(
  values,
  options = {},
  xScale = scaleLinear()
    .domain([0, values.length - 1])
    .range([10, 190]),
) {
  return buildSeriesTextCandidates({
    data: values.map((y, x) => ({ x, y })),
    accessors,
    xScale,
    yScale: scaleLinear().domain([0, 100]).range([110, 30]),
    options,
  });
}
function layout(points, nextBounds = bounds) {
  return layoutTextCandidates({
    candidates: points,
    bounds: nextBounds,
    measureText,
  });
}

describe('text plot candidates', () => {
  test('skips missing/nonfinite values but preserves zero and original cadence indices', () => {
    expect(
      candidates([0, null, NaN, 30, undefined, Infinity, 60], {
        selection: { mode: 'everyNth', every: 3 },
      }).map((point) => point.dataIndex),
    ).toEqual([0, 3, 6]);
    expect(candidates([])).toEqual([]);
  });
  test('detects one representative per plateau and does not cross gaps', () => {
    const points = candidates([0, 20, 20, 20, 0, null, 50, 40]);
    expect(
      points.filter((point) => point.extremum).map((point) => point.dataIndex),
    ).toEqual([2]);
  });
  test('ranks substantial turns above small fluctuations using neighboring turns', () => {
    const points = candidates([0, 50, 0, 2, 1, 3, 0]);
    expect(points.find((point) => point.dataIndex === 1).strength).toBeCloseTo(
      40,
    );
    expect(points.find((point) => point.dataIndex === 3).strength).toBeCloseTo(
      0.8,
    );
  });
  test('matches requested x values without extrapolation, deduplicates, and respects tolerance', () => {
    const options = {
      selection: {
        mode: 'xValues',
        values: [-1, 0.1, 0.2, 1.8, 3],
        xTolerance: 0.15,
      },
    };
    expect(
      candidates([10, 20, 30], options).map((point) => point.dataIndex),
    ).toEqual([0]);
    options.selection.xTolerance = 1;
    expect(
      candidates([10, 20, 30], options).map((point) => point.dataIndex),
    ).toEqual([0, 2]);
    options.selection.sampling = 'exact';
    expect(candidates([10, 20, 30], options)).toEqual([]);
  });
  test('supports Date matching, duplicate x ties, custom accessors, and series visibility', () => {
    const data = [
      { time: new Date(0), value: 10 },
      { time: new Date(0), value: 20 },
      { time: new Date(1000), value: 30 },
    ];
    const input = {
      data,
      accessors: { x: (datum) => datum.time, y: (datum) => datum.value },
      xScale: scaleTime()
        .domain([new Date(0), new Date(1000)])
        .range([10, 190]),
      yScale: scaleLinear().domain([0, 40]).range([110, 30]),
      options: { selection: { mode: 'xValues', values: [new Date(10)] } },
    };
    expect(buildSeriesTextCandidates(input)[0]).toMatchObject({
      dataIndex: 0,
      xValue: new Date(0),
    });
    expect(
      buildSeriesTextCandidates({ ...input, series: { isVisible: false } }),
    ).toEqual([]);
  });
  test('centers categorical positions and matches explicit categories', () => {
    const xScale = scaleBand().domain(['cold', 'warm']).range([0, 200]);
    const points = buildSeriesTextCandidates({
      data: [
        { x: 'cold', y: 1 },
        { x: 'warm', y: 2 },
      ],
      accessors,
      xScale,
      yScale: scaleLinear(),
      options: { selection: { mode: 'xValues', values: ['warm', 'missing'] } },
    });
    expect(points).toHaveLength(1);
    expect(points[0].x).toBe(150);
  });
});

describe('text plot layout', () => {
  test('keeps an extremum instead of the leftmost label when only one label fits', () => {
    const values = [40, 41, 43, 41, 40, 41, 42, 41, 40];
    const render = (priority) =>
      layoutTextCandidates({
        candidates: candidates(values, {
          selection: { mode: 'auto', priority },
          overflow: 'allow',
          minGap: 0,
        }),
        bounds,
        measureText: () => ({ width: 200, height: 20 }),
      });
    expect(render('uniform').map((point) => point.dataIndex)).toEqual([0]);
    expect(render('extrema').map((point) => point.dataIndex)).toEqual([2]);
  });

  test('detects source turns before zoom filtering without promoting cropped endpoints to local turns', () => {
    const points = candidates(
      [0, 100, 90, 80, 70, 60],
      {
        selection: { mode: 'auto', priority: 'extrema' },
      },
      scaleLinear().domain([1.5, 4.5]).range([10, 190]),
    );
    expect(
      points.filter((point) => point.extremum).map((point) => point.dataIndex),
    ).toEqual([1]);
    const visible = layout(points);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((point) => !point.extremum)).toBe(true);
  });

  test('reveals more labels as zoom increases spacing without changing everyNth membership', () => {
    const values = Array.from({ length: 31 }, () => 40);
    const options = { selection: { mode: 'everyNth', every: 3 } };
    const original = candidates(values, options);
    const zoomed = candidates(
      values,
      options,
      scaleLinear().domain([9, 15]).range([10, 190]),
    );
    expect(zoomed.map((point) => point.dataIndex)).toEqual(
      original.map((point) => point.dataIndex),
    );
    expect(layout(zoomed).every((point) => point.dataIndex % 3 === 0)).toBe(
      true,
    );
    const originalIntervalLabels = layout(candidates(values)).filter(
      (point) => point.dataIndex >= 9 && point.dataIndex <= 15,
    );
    const zoomedIntervalLabels = layout(
      candidates(values, {}, scaleLinear().domain([9, 15]).range([10, 190])),
    );
    expect(zoomedIntervalLabels.length).toBeGreaterThan(
      originalIntervalLabels.length,
    );
  });
  test('extrema win collisions and viewport edges do not invent local turns', () => {
    const points = candidates([10, 20, 80, 20, 10], {
      selection: { mode: 'auto', priority: 'extrema' },
    });
    expect(layout(points)[0].dataIndex).toBe(2);
    expect(
      points.find((point) => point.dataIndex === 1).extremum,
    ).toBeUndefined();
    const cropped = layout(points, { ...bounds, left: 40, right: 100 });
    expect(cropped.every((point) => point.x >= 40 && point.x <= 100)).toBe(
      true,
    );
  });
  test('manual labels take priority across groups and collision allow remains available', () => {
    const points = candidates([50, 50, 50]);
    const manual = buildManualTextCandidates({
      data: [{ x: 1, y: 50, text: 'Event' }],
      xScale: scaleLinear().domain([0, 2]).range([10, 190]),
      yScale: scaleLinear().domain([0, 100]).range([110, 30]),
      groupId: 'manual',
    });
    const result = layout([...points, ...manual]);
    expect(result[0].text).toBe('Event');
    expect(
      result.some((point) => point.groupId === 0 && point.dataIndex === 1),
    ).toBe(false);
    points.forEach((point) => {
      point.options = { collision: 'allow', overflow: 'allow' };
    });
    expect(layout([...points, ...manual])).toHaveLength(4);
  });
  test('applies offsets, formatting, units, per-label overrides, and boundary policies', () => {
    const points = buildManualTextCandidates({
      data: [
        { x: 100, y: 50, value: 12.34, offset: [8, 4] },
        { x: 0, y: 50, text: 'edge' },
      ],
      xScale: scaleLinear().domain([0, 200]).range([0, 200]),
      yScale: scaleLinear().domain([0, 120]).range([0, 120]),
      options: { precision: 1, units: 'mph' },
    });
    expect(layout(points)[0]).toMatchObject({
      text: '12.3 mph',
      labelX: 108,
      labelY: 54,
    });
    expect(layout(points)).toHaveLength(1);
    points[1].options.overflow = 'allow';
    expect(layout(points)).toHaveLength(2);
  });
  test('skips invalid manual anchors and supports zero text and values', () => {
    const points = buildManualTextCandidates({
      data: [
        { x: null, y: 20, text: 'bad' },
        { x: 100, y: 50, text: 0 },
        { x: 50, y: 50, value: 0 },
      ],
      xScale: scaleLinear(),
      yScale: scaleLinear(),
    });
    expect(points).toHaveLength(2);
    expect(layout(points).map((point) => point.text)).toEqual(['0', '0']);
  });
});
