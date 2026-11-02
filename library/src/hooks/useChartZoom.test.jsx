// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, createElement, useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { scaleBand, scaleLinear, scaleTime } from 'd3';
import { useChartController } from './useChartController';
import { useChartZoom } from './useChartZoom';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const cleanups = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
});

function mountZoom({ axisType = 'linear', axisKeys = ['x'], zoom = {} } = {}) {
  const toValue = (value) =>
    axisType === 'time' ? new Date(Date.UTC(2026, 0, 1) + value * 1000) : value;
  const domain = (start, end) => [toValue(start), toValue(end)];
  const unit = toValue(1).valueOf() - toValue(0).valueOf();
  const makeScale = () =>
    (axisType === 'time'
      ? scaleTime()
      : axisType === 'band'
        ? scaleBand()
        : scaleLinear()
    )
      .domain(domain(0, 100))
      .range([100, 500]);
  const svgRef = { current: null };
  const plotBoundsRef = {
    current: {
      left: 100,
      right: 500,
      top: 50,
      bottom: 350,
      width: 400,
      height: 300,
    },
  };
  const xScaleRef = { current: axisKeys.includes('x') ? makeScale() : null };
  const x2ScaleRef = { current: axisKeys.includes('x2') ? makeScale() : null };
  const options = {
    zoom,
    axes: Object.fromEntries(axisKeys.map((key) => [key, { type: axisType }])),
    series: axisKeys.map((axisKey) => ({
      type: 'line',
      isSecondaryXAxis: axisKey === 'x2',
    })),
  };
  const onZoomStateChange = vi.fn();
  const hoverSuppressed = [];
  let latest;
  let mounted = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);

  function Harness() {
    const { controller } = useChartController({ onZoomStateChange });
    const result = useChartZoom({
      options,
      controller,
      svgRef,
      plotBoundsRef,
      xScaleRef,
      x2ScaleRef,
      hasMeasuredContentSize: true,
    });
    useLayoutEffect(() => {
      latest = { ...result, controller };
      if (xScaleRef.current)
        xScaleRef.current.domain(result.domainOverrides.x || domain(0, 100));
      if (x2ScaleRef.current)
        x2ScaleRef.current.domain(result.domainOverrides.x2 || domain(0, 100));
    });
    return createElement('svg', {
      ref: svgRef,
      onMouseDown: result.handleMouseDown,
      onMouseMove: (event) =>
        hoverSuppressed.push(result.handleMouseMove(event)),
      onMouseEnter: result.handleMouseEnter,
      onMouseLeave: result.handleMouseLeave,
      style: { cursor: result.cursor },
    });
  }

  act(() => root.render(createElement(Harness)));
  const svg = svgRef.current;
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 600,
    bottom: 400,
    width: 600,
    height: 400,
  });
  const unmount = () => {
    if (!mounted) return;
    act(() => root.unmount());
    host.remove();
    mounted = false;
  };
  cleanups.push(unmount);

  return {
    svg,
    domain,
    unit,
    toValue,
    onZoomStateChange,
    hoverSuppressed,
    unmount,
    current: () => latest,
  };
}

function dispatch(target, event) {
  act(() => target.dispatchEvent(event));
  return event;
}

function mouse(target, type, clientX = 300, extra = {}) {
  return dispatch(
    target,
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY: 150,
      ...extra,
    }),
  );
}

function wheel(target, extra = {}) {
  return dispatch(
    target,
    new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 300,
      clientY: 150,
      ctrlKey: true,
      deltaY: -100,
      ...extra,
    }),
  );
}

describe.each(['linear', 'time'])('%s zoom hook', (axisType) => {
  test('binds controller commands, preserves the window, and avoids duplicate notifications', () => {
    const chart = mountZoom({ axisType });
    const controller = chart.current().controller;
    const { toValue, domain, unit } = chart;
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    expect(controller.setZoomCenter(toValue(50))).toBe(false);
    act(() =>
      expect(
        controller.setZoomWindow({
          center: toValue(50),
          windowSize: 40 * unit,
        }),
      ).toBe(true),
    );
    expect(chart.current().domainOverrides.x).toEqual(domain(30, 70));
    expect(chart.current().isZoomed).toBe(true);
    expect(controller.getZoomState().bounds.x).toEqual(domain(0, 100));
    const notifications = listener.mock.calls.length;
    act(() =>
      expect(
        controller.setZoomWindow({
          center: toValue(50),
          windowSize: 40 * unit,
        }),
      ).toBe(false),
    );
    expect(listener).toHaveBeenCalledTimes(notifications);

    act(() => controller.setZoomCenter(toValue(60)));
    expect(chart.current().domainOverrides.x).toEqual(domain(40, 80));
    act(() => controller.setZoomStart(toValue(0)));
    expect(chart.current().domainOverrides.x).toEqual(domain(0, 40));
    act(() => controller.setZoomEnd(toValue(100)));
    expect(chart.current().domainOverrides.x).toEqual(domain(60, 100));
    expect(chart.onZoomStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        source: 'programmatic',
        windowSize: 40 * unit,
      }),
      expect.objectContaining({
        source: 'programmatic',
        previousZoomState: expect.any(Object),
      }),
    );
    act(() => expect(controller.resetZoom()).toBe(true));
    expect(chart.current().domainOverrides).toEqual({ x: null, x2: null });
    expect(chart.current().isZoomed).toBe(false);
    expect(controller.getZoomState().source).toBe('reset');
    expect(controller.resetZoom()).toBe(false);
    unsubscribe();
  });

  test('modifier wheel zooms and full-extent wheel zoom clears overrides', () => {
    const chart = mountZoom({ axisType });
    expect(wheel(chart.svg).defaultPrevented).toBe(true);
    expect(chart.current().isZoomed).toBe(true);
    expect(chart.current().controller.getZoomState().source).toBe('wheel');
    const span = chart.current().controller.getZoomState().windowSize;
    expect(span).toBeCloseTo(
      100 * chart.unit * Math.exp(-0.1),
      axisType === 'time' ? -1 : 5,
    );
    wheel(chart.svg, { deltaY: 100 });
    if (chart.current().isZoomed) wheel(chart.svg, { deltaY: 100 });
    expect(chart.current().domainOverrides).toEqual({ x: null, x2: null });
  });

  test('drag geometry spans the plot, suppresses hover, and commits on window release', () => {
    const chart = mountZoom({ axisType });
    mouse(chart.svg, 'mousemove');
    expect(chart.hoverSuppressed.at(-1)).toBe(false);
    mouse(chart.svg, 'mousedown', 200);
    mouse(chart.svg, 'mousemove', 400);
    expect(chart.hoverSuppressed.at(-1)).toBe(true);
    expect(chart.current().dragSelectionRect).toEqual({
      x: 200,
      y: 50,
      width: 200,
      height: 300,
    });
    mouse(window, 'mouseup', 400);
    expect(chart.current().domainOverrides.x).toEqual(chart.domain(25, 75));
    expect(chart.current().controller.getZoomState().source).toBe('drag');
    expect(chart.current().dragSelectionRect).toBeNull();
    mouse(chart.svg, 'mousemove', 350);
    expect(chart.hoverSuppressed.at(-1)).toBe(false);
  });

  test('modifier pan stays within starting bounds and right-click resets before panning', () => {
    const chart = mountZoom({ axisType });
    const controller = chart.current().controller;
    act(() =>
      controller.setZoomWindow({
        center: chart.toValue(50),
        windowSize: 40 * chart.unit,
      }),
    );
    mouse(chart.svg, 'mousedown', 300, { ctrlKey: true });
    mouse(chart.svg, 'mousemove', 500, { ctrlKey: true });
    expect(chart.hoverSuppressed.at(-1)).toBe(true);
    expect(chart.current().domainOverrides.x).toEqual(chart.domain(10, 50));
    mouse(chart.svg, 'mousemove', 100, { ctrlKey: true });
    expect(chart.current().domainOverrides.x).toEqual(chart.domain(50, 90));
    expect(controller.getZoomState().source).toBe('pan');
    mouse(window, 'mouseup', 100);
    mouse(chart.svg, 'mousedown', 300, { button: 2, ctrlKey: true });
    expect(chart.current().isZoomed).toBe(false);
    expect(controller.getZoomState().source).toBe('reset');
  });

  test('programmatic full extent restores the unzoomed clipping signal', () => {
    const chart = mountZoom({ axisType });
    const controller = chart.current().controller;
    act(() =>
      controller.setZoomWindow({
        center: chart.toValue(50),
        windowSize: 40 * chart.unit,
      }),
    );
    act(() =>
      controller.setZoomWindow({
        center: chart.toValue(50),
        windowSize: 100 * chart.unit,
      }),
    );
    expect(chart.current().isZoomed).toBe(false);
    expect(controller.getZoomState().domain).toEqual({ x: null, x2: null });
  });
});

describe('zoom event boundaries and lifecycle', () => {
  test('wheel interception remains chart-scoped while zoom activation is plot-scoped', () => {
    const chart = mountZoom();
    expect(wheel(chart.svg, { ctrlKey: false }).defaultPrevented).toBe(false);
    expect(wheel(window, { clientX: 700 }).defaultPrevented).toBe(false);
    expect(wheel(chart.svg, { clientX: 20 }).defaultPrevented).toBe(true);
    expect(chart.current().isZoomed).toBe(false);
    expect(mouse(chart.svg, 'mousedown', 20).defaultPrevented).toBe(false);
    expect(mouse(chart.svg, 'contextmenu', 20).defaultPrevented).toBe(false);
    expect(mouse(chart.svg, 'contextmenu', 300).defaultPrevented).toBe(true);
  });

  test.each(['x2', 'both'])('supports %s axis mapping', (mapping) => {
    const chart = mountZoom({
      axisKeys: mapping === 'both' ? ['x', 'x2'] : ['x2'],
    });
    wheel(chart.svg);
    expect(chart.current().domainOverrides.x2).not.toBeNull();
    expect(chart.current().domainOverrides.x === null).toBe(mapping !== 'both');
    expect(chart.current().controller.getZoomState().bounds.x2).toEqual([
      0, 100,
    ]);
    act(() => chart.current().controller.resetZoom());
    expect(chart.current().domainOverrides).toEqual({ x: null, x2: null });
  });

  test('ignores small drags and cancels selections on mouse leave', () => {
    const chart = mountZoom();
    mouse(chart.svg, 'mousedown', 200);
    mouse(window, 'mouseup', 202);
    expect(chart.current().isZoomed).toBe(false);
    mouse(chart.svg, 'mousedown', 200);
    mouse(chart.svg, 'mousemove', 400);
    mouse(chart.svg, 'mouseout', 400, { relatedTarget: document.body });
    expect(chart.current().dragSelectionRect).toBeNull();
    mouse(window, 'mouseup', 400);
    expect(chart.current().isZoomed).toBe(false);
  });

  test.each(['keyup', 'blur', 'mouseup', 'mouseleave'])(
    'stops pan on %s',
    (endEvent) => {
      const chart = mountZoom();
      act(() =>
        chart
          .current()
          .controller.setZoomWindow({ center: 50, windowSize: 40 }),
      );
      mouse(chart.svg, 'mouseover', 300, { relatedTarget: document.body });
      mouse(chart.svg, 'mousemove', 300, { ctrlKey: true });
      expect(chart.current().cursor).toBe('move');
      mouse(chart.svg, 'mousedown', 300, { ctrlKey: true });
      mouse(chart.svg, 'mousemove', 320, { ctrlKey: true });
      const before = chart.current().domainOverrides;
      if (endEvent === 'keyup') {
        dispatch(
          window,
          new KeyboardEvent('keyup', { key: 'Control', ctrlKey: true }),
        );
        expect(chart.current().cursor).toBeUndefined();
      } else if (endEvent === 'mouseleave') {
        mouse(chart.svg, 'mouseout', 320, { relatedTarget: document.body });
        expect(chart.current().cursor).toBeUndefined();
      } else if (endEvent === 'blur') {
        dispatch(window, new Event('blur'));
      } else {
        mouse(window, 'mouseup', 320);
      }
      mouse(chart.svg, 'mousemove', 400);
      expect(chart.hoverSuppressed.at(-1)).toBe(false);
      expect(chart.current().domainOverrides).toEqual(before);
    },
  );

  test.each([
    { enabled: false },
    {
      wheelEnabled: false,
      dragEnabled: false,
      panEnabled: false,
      rightClickResetEnabled: false,
    },
  ])('respects disabled interaction options: %s', (zoom) => {
    const chart = mountZoom({ zoom });
    expect(wheel(chart.svg).defaultPrevented).toBe(false);
    expect(mouse(chart.svg, 'mousedown').defaultPrevented).toBe(false);
    expect(mouse(chart.svg, 'contextmenu').defaultPrevented).toBe(false);
    expect(chart.current().isZoomed).toBe(false);
  });

  test('does not zoom band axes', () => {
    const chart = mountZoom({ axisType: 'band' });
    wheel(chart.svg);
    mouse(chart.svg, 'mousedown', 200);
    mouse(chart.svg, 'mousemove', 400);
    mouse(window, 'mouseup', 400);
    act(() =>
      expect(
        chart
          .current()
          .controller.setZoomWindow({ center: 50, windowSize: 20 }),
      ).toBe(false),
    );
    expect(chart.current().isZoomed).toBe(false);
  });

  test('removes all native listeners and unbinds controller commands on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const chart = mountZoom();
    const controller = chart.current().controller;
    mouse(chart.svg, 'mousedown', 200);
    chart.unmount();
    const types = new Set([
      'wheel',
      'contextmenu',
      'keydown',
      'keyup',
      'blur',
      'mouseup',
    ]);
    const capture = (options) =>
      typeof options === 'object' ? options.capture : options;
    for (const [type, listener, options] of add.mock.calls.filter(([type]) =>
      types.has(type),
    )) {
      expect(
        remove.mock.calls.some(
          ([removedType, removedListener, removedOptions]) =>
            removedType === type &&
            removedListener === listener &&
            capture(removedOptions) === capture(options),
        ),
      ).toBe(true);
    }
    expect(controller.setZoomWindow({ center: 50, windowSize: 20 })).toBe(
      false,
    );
    expect(controller.resetZoom()).toBe(false);
  });
});
