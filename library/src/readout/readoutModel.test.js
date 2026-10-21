import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { buildReadoutModel, placeReadout } from './readoutModel.js';
import {
  getSeriesXAvailability,
  getSeriesXExtent,
} from '../utilities/readoutEligibility.js';
import { resolveSeriesReadoutEntries } from '../utilities/readoutHelpers.js';

const bounds = { left: 100, top: 50, right: 500, bottom: 350 };

test('series readout participation uses the shared sampler and renderer', async (context) => {
  const { createServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { scaleLinear } = await import('d3');
  const server = await createServer({
    root: fileURLToPath(new URL('../../../', import.meta.url)),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  });
  context.after(() => server.close());

  const { ChartContext } = await server.ssrLoadModule(
    '/library/src/context/ChartProvider.jsx',
  );
  const { useHoverReadoutDebug } = await server.ssrLoadModule(
    '/library/src/hooks/useHoverReadoutDebug.jsx',
  );
  const { default: Readout } = await server.ssrLoadModule(
    '/library/src/readout/Readout.jsx',
  );
  const { defaultOptions, defaultSeriesOptions } = await server.ssrLoadModule(
    '/library/src/utilities/defaultOptions.js',
  );
  const data = [
    { x: 2, y: 3 },
    { x: 8, y: 7 },
  ];

  function sample(series, { mode = 'local', xValue = 2, options = {} } = {}) {
    const readoutOptions = { ...defaultOptions.readout, ...options };
    const hoverEvent = { xValue, localX: xValue * 10, localY: 70 };
    const value = {
      chartValues: {
        data,
        options: { series },
        margin: { left: 0, right: 0, top: 0, bottom: 0 },
        innerWidth: 100,
        innerHeight: 100,
      },
      computedScales: {
        x: { scale: scaleLinear().domain([0, 10]).range([0, 100]) },
        y: { scale: scaleLinear().domain([0, 10]).range([100, 0]) },
      },
      accessorsBySeries: series.map((entry, index) => ({
        id: entry.id ?? index,
        x: (datum) => datum.x,
        y: (datum) => datum.y,
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
    return { payload, model, markup };
  }

  await context.test(
    'only explicit false opts out; the default is true',
    () => {
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
    },
  );

  for (const mode of ['local', 'global']) {
    await context.test(
      `${mode} exclusion preserves series indices and markers`,
      () => {
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
      },
    );
  }

  await context.test(
    'opt-out never leaves an unavailable placeholder row',
    () => {
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
    },
  );

  await context.test(
    'hiding the tooltip still publishes included series',
    () => {
      const { model, markup } = sample([{ type: 'line' }], {
        options: { showTooltip: false },
      });
      assert.equal(model.rows.length, 1);
      assert.ok(markup.includes('wizard-charts-readout-vertical-line'));
      assert.equal((markup.match(/<circle /g) || []).length, 1);
    },
  );

  await context.test(
    'all supported series can opt out with no active readout',
    () => {
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
    },
  );
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
