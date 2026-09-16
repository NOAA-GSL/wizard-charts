import { Fragment, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  clamp,
  resolveReadoutFontOptions,
  resolveReadoutPadding,
} from '../utilities/readoutHelpers';
import { placeReadout } from './readoutModel';

const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function DefaultReadoutContent({ readout }) {
  return (
    <>
      <div className="wizard-charts-readout-title">{readout.title}</div>
      <div className="wizard-charts-readout-rows">
        {readout.rows.map((row) => (
          <Fragment key={row.seriesIndex}>
            <div className="wizard-charts-readout-row">
              <span
                className="wizard-charts-readout-dot"
                style={{ backgroundColor: row.color }}
              />
              <span>
                {row.detailLines.length
                  ? row.label
                  : `${row.label}: ${row.text}`}
              </span>
            </div>
            {row.detailLines.map((line) => (
              <Fragment key={line.key}>
                <div className="wizard-charts-readout-detail-label">
                  {line.label}:
                </div>
                <div className="wizard-charts-readout-detail-value">
                  {line.text}
                </div>
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
    </>
  );
}

function TooltipHost({ model, options, svgRef, ReadoutComponent }) {
  const boundaryRef = useRef(null);
  const boxRef = useRef(null);
  const tooltip = options.tooltip || {};
  const padding = resolveReadoutPadding(options.padding, { x: 8, y: 8 });
  const title = resolveReadoutFontOptions(options.title, {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'inherit',
    fontColor: 'currentColor',
  });
  const row = resolveReadoutFontOptions(options.row, {
    fontSize: 12,
    fontWeight: 400,
    fontFamily: 'inherit',
    fontColor: 'currentColor',
  });
  const Content = ReadoutComponent || DefaultReadoutContent;

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const boundary = boundaryRef.current;
    const box = boxRef.current;
    if (!svg || !boundary || !box) return undefined;
    boundary.setAttribute('inert', '');
    const view = svg.ownerDocument.defaultView;
    let frame = null;

    const update = () => {
      frame = null;
      const rect = svg.getBoundingClientRect();
      const viewport = view.visualViewport;
      const viewportLeft = viewport?.offsetLeft || 0;
      const viewportTop = viewport?.offsetTop || 0;
      const bounds = {
        left: Math.max(rect.left, viewportLeft),
        top: Math.max(rect.top, viewportTop),
        right: Math.min(
          rect.right,
          viewportLeft + (viewport?.width || view.innerWidth),
        ),
        bottom: Math.min(
          rect.bottom,
          viewportTop + (viewport?.height || view.innerHeight),
        ),
      };
      const matrix = svg.getScreenCTM();
      if (
        !matrix ||
        bounds.right <= bounds.left ||
        bounds.bottom <= bounds.top
      ) {
        boundary.style.visibility = 'hidden';
        return;
      }

      const point = svg.createSVGPoint();
      point.x = model.local.x;
      point.y = model.local.y;
      const anchor = point.matrixTransform(matrix);
      const inherited = view.getComputedStyle(svg);
      Object.assign(boundary.style, {
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${bounds.right - bounds.left}px`,
        height: `${bounds.bottom - bounds.top}px`,
        fontFamily: inherited.fontFamily,
        color: inherited.color,
      });
      const measured = box.getBoundingClientRect();
      const placement = placeReadout({
        anchor,
        bounds,
        width: measured.width,
        height: measured.height,
        offset: Number(options.tooltipOffset),
      });
      Object.assign(box.style, {
        left: `${placement.left - bounds.left}px`,
        top: `${placement.top - bounds.top}px`,
      });
      boundary.style.visibility = 'visible';
    };

    const schedule = () => {
      if (frame == null) frame = view.requestAnimationFrame(update);
    };
    update();
    const observer = new view.ResizeObserver(schedule);
    observer.observe(svg);
    observer.observe(box);
    const surface = box.firstElementChild;
    if (surface) observer.observe(surface);
    view.addEventListener('resize', schedule);
    view.addEventListener('scroll', schedule, true);
    view.visualViewport?.addEventListener('resize', schedule);
    view.visualViewport?.addEventListener('scroll', schedule);

    return () => {
      if (frame != null) view.cancelAnimationFrame(frame);
      observer.disconnect();
      view.removeEventListener('resize', schedule);
      view.removeEventListener('scroll', schedule, true);
      view.visualViewport?.removeEventListener('resize', schedule);
      view.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [model, options.tooltipOffset, svgRef]);

  return (
    <div
      ref={boundaryRef}
      className="wizard-charts-readout-boundary"
      data-chart-id={model.chartId}
      aria-hidden="true"
      style={{
        position: 'fixed',
        visibility: 'hidden',
        pointerEvents: 'none',
        overflow: 'hidden',
        contain: 'paint',
        zIndex: 1000,
      }}
    >
      <div
        ref={boxRef}
        className="wizard-charts-readout-box"
        style={{
          position: 'absolute',
          width: 'max-content',
          maxWidth: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
          contain: 'paint',
        }}
      >
        <div
          className={`wizard-charts-readout-tooltip ${tooltip.className || ''}`.trim()}
          style={{
            '--readout-background': tooltip.fill || '#171717',
            '--readout-background-opacity': clamp(
              Number(tooltip.fillOpacity ?? 0.95),
              0,
              1,
            ),
            '--readout-border': tooltip.stroke || '#404040',
            '--readout-border-width': `${Math.max(0, Number(tooltip.strokeWidth) || 0)}px`,
            '--readout-radius': `${Math.max(0, Number(tooltip.cornerRadius) || 0)}px`,
            '--readout-padding': `${padding.y}px ${padding.x}px`,
            '--readout-gap': `${Math.max(0, Number(options.rowGap) || 0)}px`,
            '--readout-title-size': `${title.fontSize}px`,
            '--readout-title-weight': title.fontWeight,
            '--readout-title-family': title.fontFamily,
            '--readout-title-color': title.fontColor,
            '--readout-row-size': `${row.fontSize}px`,
            '--readout-row-weight': row.fontWeight,
            '--readout-row-family': row.fontFamily,
            '--readout-row-color': row.fontColor,
            ...tooltip.sx,
          }}
        >
          <Content readout={model} options={options} />
        </div>
      </div>
    </div>
  );
}

export default function HtmlReadout(props) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  return isClient
    ? createPortal(<TooltipHost {...props} />, document.body)
    : null;
}
