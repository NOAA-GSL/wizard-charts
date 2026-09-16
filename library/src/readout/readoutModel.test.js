import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadoutModel, placeReadout } from './readoutModel.js';

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
