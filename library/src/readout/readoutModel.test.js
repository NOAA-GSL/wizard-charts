import { afterAll, beforeAll, describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { scaleLinear, scaleTime } from 'd3';
import { buildReadoutModel, placeReadout } from './readoutModel.js';
import {
  getSeriesXAvailability,
  getSeriesXExtent,
} from '../utilities/readoutEligibility.js';
import { resolveSeriesReadoutEntries } from '../utilities/readoutHelpers.js';

const bounds = { left: 100, top: 50, right: 500, bottom: 350 };

describe('series readout participation uses the shared sampler and renderer', () => {
  let server;
  let ChartContext;
  let useHoverReadoutDebug;
  let Readout;
  let BoxPlot;
  let defaultOptions;
  let defaultSeriesOptions;

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('../../../', import.meta.url)),
      configFile: false,
      plugins: [react()],
      server: { middlewareMode: true, hmr: false },
      optimizeDeps: { noDiscovery: true, include: [], entries: [] },
    });

    ({ ChartContext } = await server.ssrLoadModule(
      '/library/src/context/ChartProvider.jsx',
    ));
    ({ useHoverReadoutDebug } = await server.ssrLoadModule(
      '/library/src/hooks/useHoverReadoutDebug.jsx',
    ));
    ({ default: Readout } = await server.ssrLoadModule(
      '/library/src/readout/Readout.jsx',
    ));
    ({ default: BoxPlot } = await server.ssrLoadModule(
      '/library/src/plotComponents/BoxPlot.jsx',
    ));
    ({ defaultOptions, defaultSeriesOptions } = await server.ssrLoadModule(
      '/library/src/utilities/defaultOptions.js',
    ));
  });

  afterAll(async () => {
    await server?.close();
  });

  const data = [
    { x: 2, y: 3 },
    { x: 8, y: 7 },
  ];

  function sample(
    series,
    {
      mode = 'local',
      xValue = 2,
      options = {},
      xScale = scaleLinear().domain([0, 10]).range([0, 100]),
      x2Scale,
      innerWidth = 100,
      localX = (x2Scale || xScale)(xValue),
    } = {},
  ) {
    const readoutOptions = { ...defaultOptions.readout, ...options };
    const hoverEvent = { xValue, localX, localY: 70 };
    const value = {
      chartValues: {
        data,
        options: { series },
        margin: { left: 0, right: 0, top: 0, bottom: 0 },
        innerWidth,
        innerHeight: 100,
      },
      computedScales: {
        x: { scale: xScale },
        x2: { scale: x2Scale },
        y: { scale: scaleLinear().domain([0, 10]).range([100, 0]) },
      },
      accessorsBySeries: series.map((entry, index) => ({
        id: entry.id ?? index,
        x: (datum) => datum.x,
        y: (datum) => datum.y,
        ...Object.fromEntries(
          ['minYKey', 'q1YKey', 'medianYKey', 'q3YKey', 'maxYKey']
            .filter((key) => entry[key])
            .map((key) => [key, (datum) => datum[entry[key]]]),
        ),
        meta: entry,
      })),
    };
    function Probe() {
      const payload = useHoverReadoutDebug({
        chartId: 'test-chart',
        hoverEvent,
        mode,
        readoutOptions,
      });
      const model = buildReadoutModel({
        hoverEvent,
        readoutData: payload,
        options: readoutOptions,
        series,
        getSeriesData: (index) => series[index].data ?? data,
      });
      return createElement('script', {
        type: 'application/json',
        dangerouslySetInnerHTML: { __html: JSON.stringify({ payload, model }) },
      });
    }

    const serialized = renderToStaticMarkup(
      createElement(ChartContext.Provider, { value }, createElement(Probe)),
    );
    const { payload, model } = JSON.parse(
      serialized.slice(
        '<script type="application/json">'.length,
        -'</script>'.length,
      ),
    );
    const markup = renderToStaticMarkup(
      createElement(
        ChartContext.Provider,
        { value },
        createElement(Readout, { model, options: readoutOptions }),
      ),
    );
    const boxMarkup =
      series[0]?.type === 'boxPlot' && series[0]?.showInReadout !== false
        ? renderToStaticMarkup(
            createElement(
              ChartContext.Provider,
              { value },
              createElement(BoxPlot, { options: series[0] }),
            ),
          )
        : '';
    return { payload, model, markup, boxMarkup };
  }

  test('only explicit false opts out; the default is true', () => {
    assert.equal(defaultSeriesOptions.showInReadout, true);
    const { model } = sample(
      [undefined, true, null, 0].map((showInReadout) => ({
        type: 'line',
        showInReadout,
      })),
    );
    assert.deepEqual(
      model.rows.map((row) => row.seriesIndex),
      [0, 1, 2, 3],
    );
  });

  for (const mode of ['local', 'global']) {
    test(`${mode} exclusion preserves series indices and markers`, () => {
      const ownData = [{ x: 2, y: 9 }];
      const { model, markup } = sample(
        [
          { type: 'line', id: 'first', showInLegend: false },
          {
            type: 'heatmap',
            showInReadout: false,
            get data() {
              return assert.fail('opted-out series must not be sampled');
            },
          },
          { type: 'circle', id: 'third', data: ownData },
        ],
        { mode },
      );
      assert.deepEqual(
        model.rows.map((row) => row.seriesIndex),
        [0, 2],
      );
      assert.deepEqual(
        model.rows.map((row) => row.id),
        ['first', 'third'],
      );
      assert.deepEqual(model.rows[1].datum, ownData[0]);
      assert.equal((markup.match(/<circle /g) || []).length, 2);
      assert.ok(markup.includes('wizard-charts-readout-vertical-line'));
    });
  }

  test('opt-out never leaves an unavailable placeholder row', () => {
    const { model } = sample(
      [{ type: 'line' }, { type: 'line', showInReadout: false }],
      { xValue: 9, options: { missingSeries: 'placeholder' } },
    );
    assert.deepEqual(
      model.rows.map((row) => row.seriesIndex),
      [0],
    );
    assert.equal(model.rows[0].status, 'outOfRange');
    assert.equal(model.rows[0].text, '---');
  });

  test('hiding the tooltip still publishes included series', () => {
    const { model, markup } = sample([{ type: 'line' }], {
      options: { showTooltip: false },
    });
    assert.equal(model.rows.length, 1);
    assert.ok(markup.includes('wizard-charts-readout-vertical-line'));
    assert.equal((markup.match(/<circle /g) || []).length, 1);
  });

  test('all supported series can opt out with no active readout', () => {
    const series = [
      'area',
      'areaStacked',
      'bar',
      'boxPlot',
      'circle',
      'heatmap',
      'contourGrid',
      'line',
      'matrix',
      'windBarbs',
    ].map((type) => ({
      type,
      showInReadout: false,
      get data() {
        return assert.fail('opted-out series must not be sampled');
      },
    }));
    for (const mode of ['local', 'global']) {
      const { payload, model, markup } = sample(series, { mode });
      assert.equal(payload, null);
      assert.equal(model, null);
      assert.equal(markup, '');
    }
  });

  const boxData = [
    { x: 4, y: 4, q1: 3, median: 4, q3: 5 },
    { x: 6, y: 6, q1: 5, median: 6, q3: 7 },
  ];
  const boxSeries = {
    type: 'boxPlot',
    data: boxData,
    q1YKey: 'q1',
    medianYKey: 'median',
    q3YKey: 'q3',
    paddingFactor: 0.8,
  };
  const boxReadoutOptions = { boxPlotFields: ['q1', 'q3'] };

  function getRenderedBoxBounds(boxMarkup) {
    return [
      ...boxMarkup.matchAll(/<rect x="([^"]+)"[^>]* width="([^"]+)"/g),
    ].map(([, x, width]) => ({
      left: Number(x),
      right: Number(x) + Number(width),
    }));
  }

  for (const mode of ['local', 'global']) {
    for (const [alignment, expectedBounds] of [
      [
        'center',
        [
          { left: 32, right: 48 },
          { left: 52, right: 68 },
        ],
      ],
      [
        'left',
        [
          { left: 24, right: 40 },
          { left: 44, right: 60 },
        ],
      ],
      [
        'right',
        [
          { left: 40, right: 56 },
          { left: 60, right: 76 },
        ],
      ],
    ]) {
      test(`box-plot ${alignment} endpoint readouts include rendered edges in ${mode} mode`, () => {
        const series = [{ ...boxSeries, alignment }];
        const settings = { mode, options: boxReadoutOptions };
        const { boxMarkup } = sample(series, { ...settings, xValue: 4 });
        assert.deepEqual(getRenderedBoxBounds(boxMarkup), expectedBounds);

        for (const [dataIndex, edge, offset] of [
          [0, expectedBounds[0].left, 0],
          [0, expectedBounds[0].left, 0.01],
          [1, expectedBounds[1].right, 0],
          [1, expectedBounds[1].right, -0.01],
        ]) {
          const { model, markup } = sample(series, {
            ...settings,
            xValue: (edge + offset) / 10,
          });
          const row = model.rows[0];
          assert.equal(row.status, 'available');
          assert.equal(row.dataIndex, dataIndex);
          assert.deepEqual(row.datum, boxData[dataIndex]);
          assert.equal(row.values.q1, boxData[dataIndex].q1);
          assert.equal(row.values.q3, boxData[dataIndex].q3);
          assert.deepEqual(
            row.entries.map((entry) => entry.key),
            ['q1', 'q3'],
          );
          assert.equal(row.markerPoints.length, 2);
          assert.equal((markup.match(/<circle /g) || []).length, 2);
          assert.deepEqual(row.xExtent, { min: 4, max: 6 });
        }

        for (const xPixel of [
          expectedBounds[0].left - 0.01,
          expectedBounds[1].right + 0.01,
        ]) {
          const { model, markup } = sample(series, {
            ...settings,
            xValue: xPixel / 10,
          });
          assert.equal(model.rows[0].status, 'outOfRange');
          assert.equal(model.rows[0].text, '---');
          assert.equal((markup.match(/<circle /g) || []).length, 0);
        }

        const { model } = sample(series, { ...settings, xValue: 5 });
        assert.equal(model.rows[0].status, 'available');
      });
    }
  }

  test('box-plot bounds respect padding without extending other series eligibility', () => {
    const series = [
      { ...boxSeries, paddingFactor: 0.5 },
      { type: 'line', data: boxData },
    ];
    const { model, boxMarkup } = sample(series, { xValue: 3.5 });
    assert.deepEqual(getRenderedBoxBounds(boxMarkup), [
      { left: 35, right: 45 },
      { left: 55, right: 65 },
    ]);
    assert.deepEqual(
      model.rows.map((row) => row.status),
      ['available', 'outOfRange'],
    );
    assert.equal(
      sample(series, { xValue: 3.49 }).model.rows[0].status,
      'outOfRange',
    );
  });

  test('box-plot bounds preserve tolerance, per-series overrides, and missing-row policies', () => {
    for (const options of [
      {},
      { xEligibility: 'withinTolerance', xTolerance: 0 },
      { missingSeries: 'omit' },
    ]) {
      const { model } = sample([boxSeries], { xValue: 3.5, options });
      assert.equal(model.rows[0].status, 'available');
    }
    assert.equal(
      sample([{ ...boxSeries, readoutXEligibility: 'withinBounds' }], {
        xValue: 3.5,
        options: { xEligibility: 'withinTolerance', xTolerance: 0 },
      }).model.rows[0].status,
      'available',
    );
    assert.equal(
      sample([boxSeries], {
        xValue: 3,
        options: { xEligibility: 'withinTolerance', xTolerance: 1 },
      }).model.rows[0].status,
      'available',
    );
    assert.equal(
      sample([{ ...boxSeries, readoutXEligibility: 'anyDistance' }], {
        xValue: 0,
      }).model.rows[0].status,
      'available',
    );
    assert.equal(
      sample([boxSeries], { xValue: 3, options: { missingSeries: 'omit' } })
        .model,
      null,
    );
  });

  test('box-plot endpoint readouts use Date values and secondary x scales', () => {
    const start = Date.UTC(2026, 9, 20);
    const hour = 60 * 60 * 1000;
    const timeData = boxData.map((datum) => ({
      ...datum,
      x: new Date(start + datum.x * hour),
    }));
    const x2Scale = scaleTime()
      .domain([new Date(start), new Date(start + 10 * hour)])
      .range([0, 100]);
    for (const [hours, dataIndex] of [
      [3.5, 0],
      [6.5, 1],
    ]) {
      const { model } = sample(
        [{ ...boxSeries, data: timeData, isSecondaryXAxis: true }],
        { xValue: new Date(start + hours * hour), x2Scale },
      );
      assert.equal(model.rows[0].status, 'available');
      assert.equal(model.rows[0].dataIndex, dataIndex);
      assert.equal(model.rows[0].axisKeys.x, 'x2');
      assert.equal(model.rows[0].sampleX, timeData[dataIndex].x.toISOString());
      assert.equal(model.rows[0].xDistanceValue, hour / 2);
    }
  });

  test('box-plot bounds follow current resized, zoomed, and reversed scales', () => {
    for (const xScale of [
      scaleLinear().domain([0, 10]).range([0, 240]),
      scaleLinear().domain([2, 8]).range([0, 240]),
      scaleLinear().domain([0, 10]).range([240, 0]),
    ]) {
      const settings = { xScale, innerWidth: 240 };
      const { boxMarkup } = sample([boxSeries], { ...settings, xValue: 4 });
      const boxes = getRenderedBoxBounds(boxMarkup);
      assert.equal(boxes.length, 2);
      for (const [dataIndex, edge] of [
        [0, xScale(4) < xScale(6) ? boxes[0].left : boxes[0].right],
        [1, xScale(4) < xScale(6) ? boxes[1].right : boxes[1].left],
      ]) {
        const { model } = sample([boxSeries], {
          ...settings,
          localX: edge,
          xValue: xScale.invert(edge),
        });
        assert.equal(model.rows[0].status, 'available');
        assert.equal(model.rows[0].dataIndex, dataIndex);
      }
    }
  });

  test('single and duplicate box-plot x values retain the rendered fallback width', () => {
    for (const ownData of [
      [{ ...boxData[0], x: 5 }],
      boxData.map((datum) => ({ ...datum, x: 5 })),
    ]) {
      const series = [{ ...boxSeries, data: ownData }];
      const { boxMarkup } = sample(series, { xValue: 5 });
      const [{ left, right }] = getRenderedBoxBounds(boxMarkup);
      for (const localX of [left, right]) {
        assert.equal(
          sample(series, { xValue: localX / 10, localX }).model.rows[0].status,
          'available',
        );
      }
      assert.equal(
        sample(series, { xValue: (left - 0.01) / 10 }).model.rows[0].status,
        'outOfRange',
      );
    }
  });

  test('empty, invalid, or zero-width box geometry does not add eligibility', () => {
    for (const ownData of [[], [{ x: NaN, y: 4 }]]) {
      const { model, boxMarkup } = sample([{ ...boxSeries, data: ownData }], {
        xValue: 3.5,
      });
      assert.equal(model, null);
      assert.equal(getRenderedBoxBounds(boxMarkup).length, 0);
    }
    const { model, boxMarkup } = sample([{ ...boxSeries, paddingFactor: 0 }], {
      xValue: 3.5,
    });
    assert.equal(model.rows[0].status, 'outOfRange');
    assert.equal(getRenderedBoxBounds(boxMarkup).length, 0);
  });

  test('box-plot hover remains inactive outside the inner plot', () => {
    const series = [{ ...boxSeries, data: [{ ...boxData[0], x: 0 }] }];
    const { payload, model, boxMarkup } = sample(series, { xValue: -1 });
    assert.ok(getRenderedBoxBounds(boxMarkup)[0].left < -10);
    assert.equal(payload.isInsidePlot, false);
    assert.equal(model, null);
  });
});

test('readout placement flips and holds at chart edges', () => {
  const place = (x, y) =>
    placeReadout({ anchor: { x, y }, bounds, width: 120, height: 100 });
  assert.equal(place(120, 100).left, 132);
  assert.equal(place(480, 100).left, 348);
  assert.equal(place(200, 51).top, 50);
  assert.equal(place(200, 340).top, 250);
  assert.equal(place(200, 349).top, 250);
});

test('readout box stays contained across edges and oversized content', () => {
  for (const width of [20, 250, 400, 800]) {
    for (const height of [20, 200, 300, 900]) {
      for (const x of [50, 100, 250, 500, 600]) {
        for (const y of [0, 50, 200, 350, 400]) {
          const result = placeReadout({
            anchor: { x, y },
            bounds,
            width,
            height,
          });
          assert.ok(result.left >= bounds.left);
          assert.ok(result.top >= bounds.top);
          assert.ok(
            result.left + Math.min(width, result.maxWidth) <= bounds.right,
          );
          assert.ok(
            result.top + Math.min(height, result.maxHeight) <= bounds.bottom,
          );
        }
      }
    }
  }
  assert.equal(
    placeReadout({
      anchor: { x: 0, y: 0 },
      bounds: { ...bounds, right: 0 },
      width: 10,
      height: 10,
    }),
    null,
  );
});

test('readout model preserves values, formatting, field ordering and source datum', () => {
  const datum = { x: 10, y: 12 };
  const summary = {
    seriesIndex: 0,
    seriesType: 'boxPlot',
    seriesName: 'Temperature',
    seriesUnits: 'F',
    seriesReadoutPrecision: 1,
    dataIndex: 0,
    values: { x: 10, median: 12, q1: 8, q3: 16 },
    distancePx: 20,
  };
  const model = buildReadoutModel({
    hoverEvent: { xValue: 10, localX: 100, localY: 120 },
    readoutData: { isInsidePlot: true, nearest: { bySeries: [summary] } },
    options: {
      boxPlotFields: ['q1', 'median', 'q3'],
      titleFormatter: (value) => `Hour ${value}`,
    },
    series: [{ id: 'temperature' }],
    getSeriesData: () => [datum],
  });
  assert.equal(model.title, 'Hour 10');
  assert.equal(model.rows[0].id, 'temperature');
  assert.equal(model.rows[0].datum, datum);
  assert.equal(model.rows[0].values, summary.values);
  assert.deepEqual(
    model.rows[0].detailLines.map((line) => line.key),
    ['q1', 'median', 'q3'],
  );
  assert.equal(model.rows[0].detailLines[1].text, '12.0 F');
  assert.equal(buildReadoutModel({ hoverEvent: null }), null);
});

test('interpolated samples do not claim an original datum', () => {
  const model = buildReadoutModel({
    hoverEvent: { xValue: new Date(0), localX: 100, localY: 120 },
    readoutData: {
      isInsidePlot: true,
      nearest: {
        bySeries: [
          {
            seriesIndex: 0,
            seriesType: 'heatmap',
            dataIndex: 4,
            values: { value: 2.5 },
            distancePx: 0,
          },
        ],
      },
    },
  });
  assert.ok(model.xValue instanceof Date);
  assert.equal(model.rows[0].sampling, 'interpolate');
  assert.equal(model.rows[0].datum, null);
  assert.equal(model.rows[0].dataIndex, null);
});

test('placeholder samples keep rows stable without markers or datum ownership', () => {
  const model = buildReadoutModel({
    hoverEvent: { xValue: 40, localX: 400, localY: 120 },
    readoutData: {
      isInsidePlot: true,
      nearest: {
        bySeries: [
          {
            status: 'outOfRange',
            seriesIndex: 0,
            seriesType: 'line',
            seriesName: 'Short forecast',
            dataIndex: 12,
            values: { x: 12, y: 10 },
            distancePx: 280,
            xDistanceValue: 28,
            xExtent: { min: 0, max: 12 },
            xPixel: 120,
            yPixel: 50,
            markerPoints: [{ id: 'primary', xPixel: 120, yPixel: 50 }],
          },
        ],
      },
    },
    options: { missingText: '---' },
    getSeriesData: () => [{ x: 12, y: 10 }],
  });

  assert.equal(model.rows[0].status, 'outOfRange');
  assert.equal(model.rows[0].text, '---');
  assert.equal(model.rows[0].datum, null);
  assert.equal(model.rows[0].dataIndex, null);
  assert.deepEqual(model.rows[0].markerPoints, []);
  assert.deepEqual(model.rows[0].xExtent, { min: 0, max: 12 });
});

test('x eligibility defaults to bounds and supports tolerance and any distance', () => {
  const seriesData = [{ x: 0 }, { x: 6 }, { x: 12 }];
  const xExtent = getSeriesXExtent({
    accessors: { x: (datum) => datum.x },
    seriesData,
  });
  const nearest = { values: { x: 12 } };

  assert.deepEqual(xExtent.raw, { min: 0, max: 12 });
  assert.equal(
    getSeriesXAvailability({
      hoverXValue: 10,
      nearest,
      policy: 'withinBounds',
      tolerance: null,
      xExtent,
    }).status,
    'available',
  );
  assert.equal(
    getSeriesXAvailability({
      hoverXValue: 20,
      nearest,
      policy: 'withinBounds',
      tolerance: null,
      xExtent,
    }).status,
    'outOfRange',
  );
  assert.equal(
    getSeriesXAvailability({
      hoverXValue: 14,
      nearest,
      policy: 'withinTolerance',
      tolerance: 2,
      xExtent,
    }).status,
    'available',
  );
  assert.equal(
    getSeriesXAvailability({
      hoverXValue: 20,
      nearest,
      policy: 'withinTolerance',
      tolerance: 2,
      xExtent,
    }).status,
    'outOfRange',
  );
  assert.equal(
    getSeriesXAvailability({
      hoverXValue: 40,
      nearest,
      policy: 'anyDistance',
      tolerance: null,
      xExtent,
    }).status,
    'available',
  );
});

test('x eligibility handles Date domain values in milliseconds', () => {
  const seriesData = [
    { x: new Date('2026-09-17T00:00:00Z') },
    { x: new Date('2026-09-17T12:00:00Z') },
  ];
  const xExtent = getSeriesXExtent({
    accessors: { x: (datum) => datum.x },
    seriesData,
  });
  const nearest = { values: { x: seriesData[1].x } };
  const oneHour = 60 * 60 * 1000;

  const availability = getSeriesXAvailability({
    hoverXValue: new Date('2026-09-17T13:00:00Z'),
    nearest,
    policy: 'withinTolerance',
    tolerance: oneHour,
    xExtent,
  });

  assert.equal(availability.status, 'available');
  assert.equal(availability.xDistanceValue, oneHour);
});

test('areaStacked auto fields read from high to low', () => {
  const entries = resolveSeriesReadoutEntries(
    {
      seriesType: 'areaStacked',
      values: {
        areaStackedFields: [
          { key: 'p05', label: '5th', value: 5 },
          { key: 'p95', label: '95th', value: 95 },
          { key: 'p10', label: '10th', value: 10 },
          { key: 'p90', label: '90th', value: 90 },
          { key: 'p25', label: '25th', value: 25 },
          { key: 'p75', label: '75th', value: 75 },
          { key: 'p50', label: '50th', value: 50 },
        ],
        areaStackedLowerOrder: ['p05', 'p10', 'p25'],
        areaStackedUpperOrder: ['p95', 'p90', 'p75'],
        medianField: 'p50',
      },
    },
    { areaFields: 'auto' },
  );

  assert.deepEqual(
    entries.map((entry) => entry.key),
    ['p95', 'p90', 'p75', 'p50', 'p25', 'p10', 'p05'],
  );
});
