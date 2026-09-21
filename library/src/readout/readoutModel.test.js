import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadoutModel, placeReadout } from './readoutModel.js';
import {
  getSeriesXAvailability,
  getSeriesXExtent,
} from '../utilities/readoutEligibility.js';
import { resolveSeriesReadoutEntries } from '../utilities/readoutHelpers.js';

const bounds = { left: 100, top: 50, right: 500, bottom: 350 };

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
