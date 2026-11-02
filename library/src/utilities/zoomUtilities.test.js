import { describe, expect, test } from 'vitest';
import { scaleBand, scaleLinear, scaleTime } from 'd3';
import {
  buildDomainFromCenterWindow,
  buildDomainFromPixelWindow,
  buildPannedDomain,
  buildZoomedDomain,
  clampToRange,
  domainsEqual,
  getZoomStateFromOverrides,
  isContinuousZoomAxisType,
  isPanPossible,
  normalizeZoomDomainOverrides,
  normalizeZoomOptions,
  toDomainNumber,
  zoomDomainOverridesEqual,
} from './zoomUtilities';

describe('zoom option normalization', () => {
  const defaults = {
    enabled: true,
    wheelEnabled: true,
    dragEnabled: true,
    panEnabled: true,
    rightClickResetEnabled: true,
    modifierKey: 'ctrl',
    panCursor: 'move',
    wheelZoomSpeed: 0.1,
    minWindow: 0,
    minDragPixels: 4,
    dragBox: { fill: '#147AF333', stroke: '#147AF3', strokeWidth: 1 },
  };

  test('preserves defaults for missing and null options', () => {
    expect(normalizeZoomOptions()).toEqual(defaults);
    expect(normalizeZoomOptions(null)).toEqual(defaults);
  });

  test('retains explicit false toggles, numeric strings, and zero widths', () => {
    expect(
      normalizeZoomOptions({
        enabled: false,
        wheelEnabled: false,
        dragEnabled: false,
        panEnabled: false,
        rightClickResetEnabled: false,
        modifierKey: 'SHIFT',
        panCursor: 'grab',
        wheelZoomSpeed: '0.5',
        minWindow: '20',
        minDragPixels: 0,
        dragBox: { fill: 'red', stroke: 'blue', strokeWidth: 0 },
      }),
    ).toEqual({
      enabled: false,
      wheelEnabled: false,
      dragEnabled: false,
      panEnabled: false,
      rightClickResetEnabled: false,
      modifierKey: 'shift',
      panCursor: 'grab',
      wheelZoomSpeed: 0.5,
      minWindow: 20,
      minDragPixels: 0,
      dragBox: { fill: 'red', stroke: 'blue', strokeWidth: 0 },
    });
  });

  test('falls back for invalid values without mutating the input', () => {
    const options = Object.freeze({
      enabled: null,
      modifierKey: 'unsupported',
      panCursor: ' ',
      wheelZoomSpeed: Infinity,
      minWindow: -1,
      minDragPixels: -1,
      dragBox: Object.freeze({ fill: '', stroke: null, strokeWidth: NaN }),
    });

    expect(normalizeZoomOptions(options)).toEqual(defaults);
  });

  test.each(['ctrl', 'shift', 'alt', 'meta'])(
    'supports the %s modifier',
    (modifierKey) => {
      expect(normalizeZoomOptions({ modifierKey }).modifierKey).toBe(
        modifierKey,
      );
    },
  );

  test.each([
    ['linear', true],
    ['time', true],
    ['band', false],
    ['log', false],
    [undefined, false],
  ])('recognizes zoomable axis type %s', (type, expected) => {
    expect(isContinuousZoomAxisType(type)).toBe(expected);
  });

  test.each([
    [-1, 0],
    [5, 5],
    [11, 10],
  ])('clamps pixel %s to %s', (value, expected) => {
    expect(clampToRange(value, 0, 10)).toBe(expected);
  });
});

describe('domain normalization', () => {
  test.each([
    [12, 12],
    ['12', 12],
    [new Date(12), 12],
    [null, 0],
    [undefined, null],
    ['invalid', null],
    [new Date(NaN), NaN],
    [NaN, null],
    [Infinity, null],
  ])(
    'converts %s to %s using the existing coercion rules',
    (value, expected) => {
      expect(toDomainNumber(value)).toBe(expected);
    },
  );

  test('compares Date endpoints by value and checks both axes', () => {
    expect(domainsEqual([new Date(0), new Date(10)], [0, 10])).toBe(true);
    expect(domainsEqual([0, 10], [0, 11])).toBe(false);
    expect(domainsEqual(null, undefined)).toBe(true);
    expect(domainsEqual([0, 10], null)).toBe(false);
    expect(zoomDomainOverridesEqual()).toBe(true);
    expect(zoomDomainOverridesEqual({ x: [0, 10] }, { x: [0, 10] })).toBe(true);
    expect(
      zoomDomainOverridesEqual(
        { x: [0, 10], x2: [20, 30] },
        { x: [0, 10], x2: [20, 31] },
      ),
    ).toBe(false);
  });

  test('copies domain arrays and normalizes absent or malformed overrides', () => {
    const overrides = { x: [0, 10], x2: [20, 30] };
    const normalized = normalizeZoomDomainOverrides(overrides);

    expect(normalized).toEqual(overrides);
    expect(normalized.x).not.toBe(overrides.x);
    expect(normalized.x2).not.toBe(overrides.x2);
    expect(normalizeZoomDomainOverrides()).toEqual({ x: null, x2: null });
    expect(normalizeZoomDomainOverrides({ x: [], x2: [1] })).toEqual({
      x: null,
      x2: null,
    });
  });
});

const axisCases = [
  ['linear', (value) => value, scaleLinear],
  ['time', (value) => new Date(Date.UTC(2026, 0, 1) + value * 1000), scaleTime],
];

describe.each(axisCases)('%s zoom domains', (_type, toValue, createScale) => {
  const domain = (start, end) => [toValue(start), toValue(end)];
  const makeScale = (start = 0, end = 100) =>
    createScale().domain(domain(start, end)).range([100, 500]);
  const unit = toValue(1).valueOf() - toValue(0).valueOf();

  test('wheel zoom preserves the anchor ratio without mutating the scale', () => {
    const scale = makeScale();

    expect(buildZoomedDomain(scale, 200, 0.5)).toEqual(domain(12.5, 62.5));
    expect(scale.domain()).toEqual(domain(0, 100));
    expect(scale.range()).toEqual([100, 500]);
  });

  test.each([
    [100, 0.5, 0, 0, 50],
    [500, 0.5, 0, 50, 100],
    [300, 4, 0, 0, 100],
    [300, 0.01, 20, 40, 60],
    [300, 0.01, 200, 0, 100],
  ])(
    'wheel zoom at pixel %s with factor %s and minimum %s respects bounds',
    (anchor, factor, minimum, start, end) => {
      expect(
        buildZoomedDomain(
          makeScale(),
          anchor,
          factor,
          minimum * unit,
          domain(0, 100),
        ),
      ).toEqual(domain(start, end));
    },
  );

  test.each([
    [200, 400, 0, 25, 75],
    [400, 200, 0, 25, 75],
    [-100, 700, 0, 0, 100],
    [100, 104, 40, 0, 40],
    [496, 500, 40, 60, 100],
    [200, 204, 200, 0, 100],
  ])(
    'drag selection from %s to %s with minimum %s respects bounds',
    (startPixel, endPixel, minimum, start, end) => {
      expect(
        buildDomainFromPixelWindow(
          makeScale(),
          startPixel,
          endPixel,
          minimum * unit,
          domain(0, 100),
        ),
      ).toEqual(domain(start, end));
    },
  );

  test.each([
    [50, 20, 0, 40, 60],
    [-10, 20, 0, 0, 20],
    [110, 20, 0, 80, 100],
    [50, 200, 0, 0, 100],
    [50, 1, 40, 30, 70],
  ])(
    'programmatic center %s, window %s, and minimum %s respect bounds',
    (center, windowSize, minimum, start, end) => {
      expect(
        buildDomainFromCenterWindow(
          makeScale(),
          toValue(center),
          windowSize * unit,
          minimum * unit,
          domain(0, 100),
        ),
      ).toEqual(domain(start, end));
    },
  );

  test('programmatic zoom accepts numeric centers and does not invent bounds', () => {
    expect(
      buildDomainFromCenterWindow(
        makeScale(),
        toValue(150).valueOf(),
        20 * unit,
      ),
    ).toEqual(domain(140, 160));
  });

  test.each([
    [100, 5, 65],
    [-100, 35, 95],
    [1000, 0, 60],
    [-1000, 40, 100],
    [0, 20, 80],
  ])(
    'pan by %s pixels preserves the window at the bounds',
    (delta, start, end) => {
      const scale = makeScale(20, 80);

      expect(buildPannedDomain(scale, delta, domain(0, 100))).toEqual(
        domain(start, end),
      );
      expect(scale.domain()).toEqual(domain(20, 80));
    },
  );

  test('only a smaller valid domain is pannable', () => {
    expect(isPanPossible(makeScale(20, 80), domain(0, 100))).toBe(true);
    expect(isPanPossible(makeScale(), domain(0, 100))).toBe(false);
    expect(isPanPossible(makeScale(-10, 110), domain(0, 100))).toBe(false);
    expect(isPanPossible(makeScale(), domain(0, 0))).toBe(false);
    expect(isPanPossible(makeScale(), null)).toBe(false);
    expect(isPanPossible(null, domain(0, 100))).toBe(false);
  });

  test('state preserves typed values, numeric fields, source, and independent axes', () => {
    const overrides = { x: domain(20, 80), x2: domain(30, 70) };
    const bounds = { x: domain(0, 100), x2: domain(10, 90) };
    const state = getZoomStateFromOverrides(overrides, bounds, 'wheel');

    expect(state).toEqual({
      domain: overrides,
      start: toValue(20),
      startValue: toValue(20).valueOf(),
      center: toValue(50),
      centerValue: toValue(50).valueOf(),
      end: toValue(80),
      endValue: toValue(80).valueOf(),
      windowSize: 60 * unit,
      bounds,
      isZoomed: true,
      source: 'wheel',
    });
    expect(state.domain.x).not.toBe(overrides.x);
    expect(state.bounds.x2).not.toBe(bounds.x2);
    expect(getZoomStateFromOverrides({ x2: domain(30, 70) }).start).toEqual(
      toValue(30),
    );
    expect(domainsEqual(domain(0, 100), makeScale().domain())).toBe(true);
  });
});

describe('unavailable zoom windows', () => {
  test.each([null, {}, scaleBand(), scaleLinear().domain([])])(
    'rejects missing or unsupported scales: %s',
    (scale) => {
      expect(buildZoomedDomain(scale, 50, 0.5)).toBeNull();
      expect(buildDomainFromPixelWindow(scale, 20, 80)).toBeNull();
      expect(buildDomainFromCenterWindow(scale, 50, 20)).toBeNull();
      expect(buildPannedDomain(scale, 10)).toBeNull();
    },
  );

  test('rejects invalid wheel, drag, and programmatic inputs', () => {
    const scale = scaleLinear().domain([0, 100]).range([0, 100]);

    expect(buildZoomedDomain(scale, NaN, 0.5)).toBeNull();
    expect(buildZoomedDomain(scale, 50, 0)).toBeNull();
    expect(buildZoomedDomain(scale, 50, Infinity)).toBeNull();
    expect(buildZoomedDomain(scale.copy().domain([0, 0]), 50, 0.5)).toBeNull();
    expect(buildDomainFromPixelWindow(scale, 50, 50)).toBeNull();
    expect(buildDomainFromPixelWindow(scale, NaN, 80)).toBeNull();
    expect(buildDomainFromCenterWindow(scale, 'invalid', 20)).toBeNull();
    expect(buildDomainFromCenterWindow(scale, 50, NaN)).toBeNull();
    expect(buildDomainFromCenterWindow(scale, 50, 0)).toBeNull();
    expect(buildPannedDomain(scale, NaN)).toBeNull();
  });

  test('unzoomed state clears the window while retaining bounds and source', () => {
    const bounds = { x: [0, 100], x2: null };

    expect(getZoomStateFromOverrides({}, bounds, 'reset')).toEqual({
      domain: { x: null, x2: null },
      start: null,
      startValue: null,
      center: null,
      centerValue: null,
      end: null,
      endValue: null,
      windowSize: null,
      bounds,
      isZoomed: false,
      source: 'reset',
    });
    expect(getZoomStateFromOverrides().source).toBeNull();
    expect(getZoomStateFromOverrides().bounds).toEqual({ x: null, x2: null });
  });
});
