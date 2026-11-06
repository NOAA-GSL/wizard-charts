import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { pointer } from 'd3';
import { getChartControllerInternal } from './useChartController';
import { axisHasMappedSeries } from '../utilities/dataUtilities';
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
} from '../utilities/zoomUtilities';

function isZoomModifierPressed(event, modifierKey) {
  switch (modifierKey) {
    case 'shift':
      return event.shiftKey;
    case 'alt':
      return event.altKey;
    case 'meta':
      return event.metaKey;
    case 'ctrl':
    default:
      return event.ctrlKey;
  }
}

function isKeyboardModifierPressed(event, modifierKey) {
  if (!event) return false;

  const modifierKeyNames = {
    ctrl: 'Control',
    shift: 'Shift',
    alt: 'Alt',
    meta: 'Meta',
  };
  const expectedKey = modifierKeyNames[modifierKey] || 'Control';

  // Keyup for the configured modifier should always clear interaction state.
  if (event.type === 'keyup' && event.key === expectedKey) {
    return false;
  }

  switch (modifierKey) {
    case 'shift':
      return event.shiftKey;
    case 'alt':
      return event.altKey;
    case 'meta':
      return event.metaKey;
    case 'ctrl':
    default:
      return event.ctrlKey;
  }
}

export function useChartZoom({
  options,
  controller,
  svgRef,
  plotBoundsRef,
  xScaleRef,
  x2ScaleRef,
  hasMeasuredContentSize,
}) {
  const zoomBoundsRef = useRef({ x: null, x2: null });
  const xDomainOverridesRef = useRef({ x: null, x2: null });
  const panStateRef = useRef({ isActive: false, lastX: 0 });
  const dragZoomStateRef = useRef({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    plotTop: 0,
    plotBottom: 0,
  });
  const [xDomainOverrides, setXDomainOverrides] = useState({
    x: null,
    x2: null,
  });
  const [panState, setPanState] = useState({ isActive: false, lastX: 0 });
  const [dragZoomState, setDragZoomState] = useState({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    plotTop: 0,
    plotBottom: 0,
  });
  const [isPointerOverChart, setIsPointerOverChart] = useState(false);
  const [isPointerOverPlot, setIsPointerOverPlot] = useState(false);
  const [isModifierPressed, setIsModifierPressed] = useState(false);
  const controllerInternal = getChartControllerInternal(controller);

  const zoomOptions = useMemo(
    () => normalizeZoomOptions(options.zoom),
    [options.zoom],
  );

  const zoomableAxes = useMemo(() => {
    const axes = options.axes || {};
    const series = options.series || [];

    return {
      x:
        axisHasMappedSeries(series, 'x') &&
        isContinuousZoomAxisType(axes.x?.type || 'linear'),
      x2:
        axisHasMappedSeries(series, 'x2') &&
        isContinuousZoomAxisType(axes.x2?.type || 'linear'),
    };
  }, [options.axes, options.series]);

  const isWheelZoomActive =
    zoomOptions.enabled &&
    zoomOptions.wheelEnabled &&
    (zoomableAxes.x || zoomableAxes.x2);
  const isDragZoomActive =
    zoomOptions.enabled &&
    zoomOptions.dragEnabled &&
    (zoomableAxes.x || zoomableAxes.x2);
  const isPanZoomActive =
    zoomOptions.enabled &&
    zoomOptions.panEnabled &&
    (zoomableAxes.x || zoomableAxes.x2);
  const isRightClickResetActive =
    zoomOptions.enabled &&
    zoomOptions.rightClickResetEnabled &&
    (zoomableAxes.x || zoomableAxes.x2);
  const isZoomDomainOverrideActive =
    isWheelZoomActive || isDragZoomActive || isPanZoomActive;

  const publishZoomState = useCallback(
    (overrides, source) => {
      controllerInternal?.setZoomState(
        getZoomStateFromOverrides(overrides, zoomBoundsRef.current, source),
        { source },
      );
    },
    [controllerInternal],
  );

  const applyZoomOverrides = useCallback(
    (nextOverrides, source) => {
      const normalizedOverrides = normalizeZoomDomainOverrides(nextOverrides);
      // Returning to the starting extent restores the unzoomed rendering policy.
      for (const axisKey of ['x', 'x2']) {
        if (
          domainsEqual(
            normalizedOverrides[axisKey],
            zoomBoundsRef.current[axisKey],
          )
        ) {
          normalizedOverrides[axisKey] = null;
        }
      }
      const previousOverrides = xDomainOverridesRef.current;

      if (zoomDomainOverridesEqual(previousOverrides, normalizedOverrides)) {
        return false;
      }

      xDomainOverridesRef.current = normalizedOverrides;
      setXDomainOverrides(normalizedOverrides);
      publishZoomState(normalizedOverrides, source);
      return true;
    },
    [publishZoomState],
  );

  const appliedDomainOverrides = useMemo(
    () =>
      isZoomDomainOverrideActive ? xDomainOverrides : { x: null, x2: null },
    [isZoomDomainOverrideActive, xDomainOverrides],
  );

  const updateDragZoomState = useCallback((nextState) => {
    dragZoomStateRef.current = nextState;
    setDragZoomState(nextState);
  }, []);

  const cancelDragZoom = useCallback(() => {
    const dragState = dragZoomStateRef.current;
    if (!dragState.isActive) return;
    updateDragZoomState({ ...dragState, isActive: false });
  }, [updateDragZoomState]);

  useEffect(() => {
    panStateRef.current = panState;
  }, [panState]);

  useEffect(() => {
    xDomainOverridesRef.current = xDomainOverrides;
  }, [xDomainOverrides]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onModifierEvent = (event) => {
      const nextIsPressed = isKeyboardModifierPressed(
        event,
        zoomOptions.modifierKey,
      );
      setIsModifierPressed(nextIsPressed);

      if (!nextIsPressed) {
        setPanState((prev) => {
          if (!prev.isActive) return prev;
          return { ...prev, isActive: false };
        });
      }
    };

    window.addEventListener('keydown', onModifierEvent, true);
    window.addEventListener('keyup', onModifierEvent, true);

    return () => {
      window.removeEventListener('keydown', onModifierEvent, true);
      window.removeEventListener('keyup', onModifierEvent, true);
    };
  }, [zoomOptions.modifierKey]);

  const finalizePan = useCallback(() => {
    if (!panStateRef.current?.isActive) return;

    setPanState((prev) => {
      if (!prev.isActive) return prev;
      return { ...prev, isActive: false };
    });
  }, []);

  const getZoomBounds = useCallback((axisKey, scale) => {
    if (zoomBoundsRef.current[axisKey] == null) {
      const domain = scale?.domain?.();
      if (Array.isArray(domain) && domain.length === 2) {
        zoomBoundsRef.current[axisKey] = [domain[0], domain[1]];
      }
    }

    return zoomBoundsRef.current[axisKey];
  }, []);

  const setZoomWindow = useCallback(
    ({ center, windowSize } = {}) => {
      if (!zoomOptions.enabled) return false;

      const nextOverrides = { x: null, x2: null };

      if (zoomableAxes.x) {
        nextOverrides.x = buildDomainFromCenterWindow(
          xScaleRef.current,
          center,
          windowSize,
          zoomOptions.minWindow,
          getZoomBounds('x', xScaleRef.current),
        );
      }

      if (zoomableAxes.x2) {
        nextOverrides.x2 = buildDomainFromCenterWindow(
          x2ScaleRef.current,
          center,
          windowSize,
          zoomOptions.minWindow,
          getZoomBounds('x2', x2ScaleRef.current),
        );
      }

      if (nextOverrides.x == null && nextOverrides.x2 == null) return false;
      return applyZoomOverrides(nextOverrides, 'programmatic');
    },
    [
      applyZoomOverrides,
      getZoomBounds,
      xScaleRef,
      x2ScaleRef,
      zoomOptions.enabled,
      zoomOptions.minWindow,
      zoomableAxes.x,
      zoomableAxes.x2,
    ],
  );

  const setZoomCenter = useCallback(
    (center) => {
      const currentZoomState = getZoomStateFromOverrides(
        xDomainOverridesRef.current,
        zoomBoundsRef.current,
        null,
      );

      if (!Number.isFinite(currentZoomState.windowSize)) return false;
      return setZoomWindow({ center, windowSize: currentZoomState.windowSize });
    },
    [setZoomWindow],
  );

  const setZoomStart = useCallback(
    (start) => {
      const currentZoomState = getZoomStateFromOverrides(
        xDomainOverridesRef.current,
        zoomBoundsRef.current,
        null,
      );
      const startValue = toDomainNumber(start);

      if (!Number.isFinite(currentZoomState.windowSize)) return false;
      if (!Number.isFinite(startValue)) return false;

      return setZoomWindow({
        center: startValue + currentZoomState.windowSize / 2,
        windowSize: currentZoomState.windowSize,
      });
    },
    [setZoomWindow],
  );

  const setZoomEnd = useCallback(
    (end) => {
      const currentZoomState = getZoomStateFromOverrides(
        xDomainOverridesRef.current,
        zoomBoundsRef.current,
        null,
      );
      const endValue = toDomainNumber(end);

      if (!Number.isFinite(currentZoomState.windowSize)) return false;
      if (!Number.isFinite(endValue)) return false;

      return setZoomWindow({
        center: endValue - currentZoomState.windowSize / 2,
        windowSize: currentZoomState.windowSize,
      });
    },
    [setZoomWindow],
  );

  const resetZoom = useCallback(() => {
    finalizePan();
    cancelDragZoom();
    return applyZoomOverrides({ x: null, x2: null }, 'reset');
  }, [applyZoomOverrides, cancelDragZoom, finalizePan]);

  useEffect(() => {
    if (!controllerInternal) return;

    controllerInternal.bindApi({
      resetZoom,
      setZoomWindow,
      setZoomCenter,
      setZoomStart,
      setZoomEnd,
    });

    controllerInternal.setZoomState(
      getZoomStateFromOverrides(
        xDomainOverridesRef.current,
        zoomBoundsRef.current,
        null,
      ),
      { source: null },
    );

    return () => {
      controllerInternal.bindApi(null);
    };
  }, [
    controllerInternal,
    resetZoom,
    setZoomCenter,
    setZoomEnd,
    setZoomStart,
    setZoomWindow,
  ]);

  const finalizeDragZoom = useCallback(
    (event) => {
      const dragState = dragZoomStateRef.current;
      if (!dragState?.isActive) return;

      const svgNode = svgRef.current;
      const plotBounds = plotBoundsRef.current;

      if (!svgNode || !plotBounds || !isDragZoomActive) {
        cancelDragZoom();
        return;
      }

      const [releaseX, releaseY] = pointer(event, svgNode);
      const endX = Number.isFinite(releaseX) ? releaseX : dragState.currentX;
      const endY = Number.isFinite(releaseY) ? releaseY : dragState.currentY;

      const startX = clampToRange(
        dragState.startX,
        plotBounds.left,
        plotBounds.right,
      );
      const clampedEndX = clampToRange(endX, plotBounds.left, plotBounds.right);
      const selectedWidth = Math.abs(clampedEndX - startX);

      updateDragZoomState({
        ...dragState,
        isActive: false,
        currentX: clampedEndX,
        currentY: clampToRange(endY, plotBounds.top, plotBounds.bottom),
      });

      if (selectedWidth < zoomOptions.minDragPixels) return;

      const nextOverrides = { x: null, x2: null };

      if (zoomableAxes.x) {
        nextOverrides.x = buildDomainFromPixelWindow(
          xScaleRef.current,
          startX,
          clampedEndX,
          zoomOptions.minWindow,
          getZoomBounds('x', xScaleRef.current),
        );
      }

      if (zoomableAxes.x2) {
        nextOverrides.x2 = buildDomainFromPixelWindow(
          x2ScaleRef.current,
          startX,
          clampedEndX,
          zoomOptions.minWindow,
          getZoomBounds('x2', x2ScaleRef.current),
        );
      }

      if (nextOverrides.x == null && nextOverrides.x2 == null) return;
      applyZoomOverrides(nextOverrides, 'drag');
    },
    [
      applyZoomOverrides,
      cancelDragZoom,
      getZoomBounds,
      isDragZoomActive,
      plotBoundsRef,
      svgRef,
      updateDragZoomState,
      xScaleRef,
      x2ScaleRef,
      zoomOptions.minDragPixels,
      zoomOptions.minWindow,
      zoomableAxes.x,
      zoomableAxes.x2,
    ],
  );

  const handleMouseDown = useCallback(
    (event) => {
      const modifierPressed = isZoomModifierPressed(
        event,
        zoomOptions.modifierKey,
      );

      if (event.button !== 0 && event.button !== 2) return;

      const svgNode = svgRef.current;
      const plotBounds = plotBoundsRef.current;
      if (!svgNode || !plotBounds) return;

      const [localX, localY] = pointer(event, svgNode);
      const isInsidePlot =
        localX >= plotBounds.left &&
        localX <= plotBounds.right &&
        localY >= plotBounds.top &&
        localY <= plotBounds.bottom;
      if (!isInsidePlot) return;

      if (event.button === 2) {
        if (!isRightClickResetActive) return;

        event.preventDefault();
        event.stopPropagation();
        resetZoom();
        return;
      }

      if (modifierPressed) {
        if (!isPanZoomActive) return;

        const hasPannableXAxis =
          zoomableAxes.x &&
          isPanPossible(xScaleRef.current, zoomBoundsRef.current.x);
        const hasPannableX2Axis =
          zoomableAxes.x2 &&
          isPanPossible(x2ScaleRef.current, zoomBoundsRef.current.x2);
        if (!hasPannableXAxis && !hasPannableX2Axis) return;

        event.preventDefault();
        event.stopPropagation();
        setPanState({ isActive: true, lastX: localX });
        return;
      }

      if (event.button !== 0) return;
      if (!isDragZoomActive) return;

      event.preventDefault();
      event.stopPropagation();
      updateDragZoomState({
        isActive: true,
        startX: localX,
        startY: localY,
        currentX: localX,
        currentY: localY,
        plotTop: plotBounds.top,
        plotBottom: plotBounds.bottom,
      });
    },
    [
      isDragZoomActive,
      isPanZoomActive,
      isRightClickResetActive,
      plotBoundsRef,
      resetZoom,
      svgRef,
      updateDragZoomState,
      xScaleRef,
      x2ScaleRef,
      zoomOptions.modifierKey,
      zoomableAxes.x,
      zoomableAxes.x2,
    ],
  );

  const handleContextMenu = useCallback(
    (event) => {
      if (!zoomOptions.enabled) return;

      const svgNode = svgRef.current;
      if (!svgNode) return;

      const plotBounds = plotBoundsRef.current;
      if (plotBounds) {
        const [localX, localY] = pointer(event, svgNode);
        const isInsidePlot =
          localX >= plotBounds.left &&
          localX <= plotBounds.right &&
          localY >= plotBounds.top &&
          localY <= plotBounds.bottom;

        if (isInsidePlot && isRightClickResetActive) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      if (!isPanZoomActive) return;

      const rect = svgNode.getBoundingClientRect();
      const isInsideChart =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!isInsideChart) return;

      const modifierPressed = isZoomModifierPressed(
        event,
        zoomOptions.modifierKey,
      );
      if (!modifierPressed && !panStateRef.current?.isActive) return;

      event.preventDefault();
      event.stopPropagation();
    },
    [
      isPanZoomActive,
      isRightClickResetActive,
      plotBoundsRef,
      svgRef,
      zoomOptions.enabled,
      zoomOptions.modifierKey,
    ],
  );

  const updateDragZoom = useCallback(
    (event) => {
      const dragState = dragZoomStateRef.current;
      if (!dragState.isActive) return;

      if ((event.buttons & 1) === 0) {
        cancelDragZoom();
        return;
      }

      const svgNode = svgRef.current;
      const plotBounds = plotBoundsRef.current;
      if (!svgNode || !plotBounds) {
        cancelDragZoom();
        return;
      }

      const [dragX, dragY] = pointer(event, svgNode);
      if (!Number.isFinite(dragX) || !Number.isFinite(dragY)) return;

      setIsPointerOverPlot(
        dragX >= plotBounds.left &&
          dragX <= plotBounds.right &&
          dragY >= plotBounds.top &&
          dragY <= plotBounds.bottom,
      );
      const currentX = clampToRange(dragX, plotBounds.left, plotBounds.right);
      const currentY = clampToRange(dragY, plotBounds.top, plotBounds.bottom);
      if (currentX === dragState.currentX && currentY === dragState.currentY)
        return;

      updateDragZoomState({ ...dragState, currentX, currentY });
    },
    [cancelDragZoom, plotBoundsRef, svgRef, updateDragZoomState],
  );

  useEffect(() => {
    if (!dragZoomState.isActive) return;
    if (!isDragZoomActive) {
      cancelDragZoom();
      return;
    }
    if (typeof window === 'undefined') return;

    const handleWindowMouseUp = (event) => {
      if (event.button === 0) finalizeDragZoom(event);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') cancelDragZoom();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') cancelDragZoom();
    };

    window.addEventListener('mousemove', updateDragZoom, true);
    window.addEventListener('mouseup', handleWindowMouseUp, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', cancelDragZoom, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', updateDragZoom, true);
      window.removeEventListener('mouseup', handleWindowMouseUp, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', cancelDragZoom, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    cancelDragZoom,
    dragZoomState.isActive,
    finalizeDragZoom,
    isDragZoomActive,
    updateDragZoom,
  ]);

  useEffect(() => {
    if (!panState.isActive) return;
    if (typeof window === 'undefined') return;

    const handleWindowMouseUp = () => {
      finalizePan();
    };
    window.addEventListener('mouseup', handleWindowMouseUp, true);
    return () => {
      window.removeEventListener('mouseup', handleWindowMouseUp, true);
    };
  }, [panState.isActive, finalizePan]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBlur = () => {
      finalizePan();
    };
    window.addEventListener('blur', handleBlur, true);
    return () => {
      window.removeEventListener('blur', handleBlur, true);
    };
  }, [finalizePan]);

  const handleWheel = useCallback(
    (event) => {
      if (!zoomOptions.enabled || !zoomOptions.wheelEnabled) return;
      if (!isZoomModifierPressed(event, zoomOptions.modifierKey)) return;

      const svgNode = svgRef.current;
      if (!svgNode) return;

      const rect = svgNode.getBoundingClientRect();
      const isInsideChart =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!isInsideChart) return;

      // When modifier-wheel zoom is active over the chart, suppress page/browser wheel behavior.
      event.preventDefault();
      event.stopPropagation();

      if (!isWheelZoomActive) return;

      const plotBounds = plotBoundsRef.current;
      if (!plotBounds) return;

      const [localX, localY] = pointer(event, svgNode);
      const isInsidePlot =
        localX >= plotBounds.left &&
        localX <= plotBounds.right &&
        localY >= plotBounds.top &&
        localY <= plotBounds.bottom;
      if (!isInsidePlot) return;

      const deltaY = Number(event.deltaY);
      if (!Number.isFinite(deltaY) || deltaY === 0) return;
      const zoomFactor = Math.exp(
        (deltaY > 0 ? 1 : -1) * zoomOptions.wheelZoomSpeed,
      );
      const nextOverrides = { x: null, x2: null };

      if (zoomableAxes.x) {
        nextOverrides.x = buildZoomedDomain(
          xScaleRef.current,
          localX,
          zoomFactor,
          zoomOptions.minWindow,
          getZoomBounds('x', xScaleRef.current),
        );
      }

      if (zoomableAxes.x2) {
        nextOverrides.x2 = buildZoomedDomain(
          x2ScaleRef.current,
          localX,
          zoomFactor,
          zoomOptions.minWindow,
          getZoomBounds('x2', x2ScaleRef.current),
        );
      }

      if (nextOverrides.x == null && nextOverrides.x2 == null) return;
      applyZoomOverrides(nextOverrides, 'wheel');
    },
    [
      applyZoomOverrides,
      getZoomBounds,
      isWheelZoomActive,
      plotBoundsRef,
      svgRef,
      xScaleRef,
      x2ScaleRef,
      zoomOptions.enabled,
      zoomOptions.minWindow,
      zoomOptions.modifierKey,
      zoomOptions.wheelEnabled,
      zoomOptions.wheelZoomSpeed,
      zoomableAxes.x,
      zoomableAxes.x2,
    ],
  );

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true,
    });
    return () => {
      window.removeEventListener('wheel', handleWheel, true);
    };
  }, [handleWheel, hasMeasuredContentSize]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('contextmenu', handleContextMenu, true);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [handleContextMenu]);

  const handleMouseMove = (event) => {
    const svgNode = svgRef.current;
    if (!svgNode) return true;

    setIsModifierPressed(isZoomModifierPressed(event, zoomOptions.modifierKey));

    if (panState.isActive) {
      const [panX, panY] = pointer(event, svgNode);
      if (!Number.isFinite(panX)) return true;

      const plotBounds = plotBoundsRef.current;
      if (!plotBounds) return true;

      const isInsidePlot =
        panX >= plotBounds.left &&
        panX <= plotBounds.right &&
        panY >= plotBounds.top &&
        panY <= plotBounds.bottom;
      setIsPointerOverPlot(isInsidePlot);

      const clampedPanX = clampToRange(panX, plotBounds.left, plotBounds.right);
      const deltaX = clampedPanX - panState.lastX;
      setPanState((prev) => {
        if (!prev.isActive) return prev;
        return { ...prev, lastX: clampedPanX };
      });

      if (deltaX === 0) return true;
      const nextOverrides = { x: null, x2: null };

      if (zoomableAxes.x && zoomBoundsRef.current.x != null) {
        nextOverrides.x = buildPannedDomain(
          xScaleRef.current,
          deltaX,
          zoomBoundsRef.current.x,
        );
      }
      if (zoomableAxes.x2 && zoomBoundsRef.current.x2 != null) {
        nextOverrides.x2 = buildPannedDomain(
          x2ScaleRef.current,
          deltaX,
          zoomBoundsRef.current.x2,
        );
      }

      if (nextOverrides.x == null && nextOverrides.x2 == null) return true;
      applyZoomOverrides(nextOverrides, 'pan');
      return true;
    }

    if (dragZoomState.isActive) {
      return true;
    }

    const plotBounds = plotBoundsRef.current;
    if (plotBounds && plotBounds.width > 0 && plotBounds.height > 0) {
      const [localX, localY] = pointer(event, svgNode);
      setIsPointerOverPlot(
        localX >= plotBounds.left &&
          localX <= plotBounds.right &&
          localY >= plotBounds.top &&
          localY <= plotBounds.bottom,
      );
    }
    return false;
  };

  const handleMouseEnter = () => {
    setIsPointerOverChart(true);
  };

  const handleMouseLeave = () => {
    setIsPointerOverChart(false);
    setIsPointerOverPlot(false);
    setIsModifierPressed(false);
    finalizePan();
  };

  const dragSelectionRect = useMemo(() => {
    if (!dragZoomState.isActive || panState.isActive) return null;

    const x1 = Math.min(dragZoomState.startX, dragZoomState.currentX);
    const x2 = Math.max(dragZoomState.startX, dragZoomState.currentX);
    const y1 = Math.min(dragZoomState.plotTop, dragZoomState.plotBottom);
    const y2 = Math.max(dragZoomState.plotTop, dragZoomState.plotBottom);
    const rectWidth = Math.max(0, x2 - x1);
    const rectHeight = Math.max(0, y2 - y1);
    if (rectWidth <= 0 || rectHeight <= 0) return null;

    return { x: x1, y: y1, width: rectWidth, height: rectHeight };
  }, [
    dragZoomState.currentX,
    dragZoomState.isActive,
    dragZoomState.plotBottom,
    dragZoomState.plotTop,
    dragZoomState.startX,
    panState.isActive,
  ]);

  const shouldShowPanCursor =
    zoomOptions.enabled &&
    (zoomableAxes.x || zoomableAxes.x2) &&
    isPointerOverChart &&
    isPointerOverPlot &&
    isModifierPressed;

  return {
    domainOverrides: appliedDomainOverrides,
    isZoomed: Boolean(appliedDomainOverrides.x || appliedDomainOverrides.x2),
    dragSelectionRect,
    dragBox: zoomOptions.dragBox,
    cursor: shouldShowPanCursor ? zoomOptions.panCursor : undefined,
    handleMouseDown,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  };
}
