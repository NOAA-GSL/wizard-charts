import { useChartHelpers } from '../hooks/useChartHelpers';
import {
  getPlotBoundsFromChartValues,
  getTextDimensions,
} from '../utilities/measurements';
import {
  clamp,
  formatSeriesReadoutText,
  resolveSeriesReadoutDetailLines,
  resolveReadoutFontOptions,
  resolveReadoutPadding,
  toFontString,
  formatReadoutXValue,
} from '../utilities/readoutHelpers';

function Readout({ hoverEvent, readoutData, options = {} }) {
  const { chartValues } = useChartHelpers();

  if (!hoverEvent) return null;

  const localX = Number(hoverEvent.localX);
  const localY = Number(hoverEvent.localY);
  if (!Number.isFinite(localX) || !Number.isFinite(localY)) return null;

  const { left, right, top, bottom, width, height } =
    getPlotBoundsFromChartValues(chartValues);
  if (width <= 0 || height <= 0) return null;

  const insidePlotArea =
    localX >= left && localX <= right && localY >= top && localY <= bottom;
  if (!insidePlotArea) return null;

  const showVerticalLine = Boolean(options?.showVerticalLine);
  const showTooltip = Boolean(options?.showTooltip);
  const rowOrder =
    options?.rowOrder === 'distance' ? 'distance' : 'seriesIndex';
  const showPointMarkers = Boolean(options?.showPointMarkers);

  const bySeries = readoutData?.nearest?.bySeries;
  const rows = Array.isArray(bySeries)
    ? bySeries.map((summary, index) => ({
        id: `${summary.seriesIndex ?? index}-${summary.dataIndex ?? 'na'}`,
        label: summary.seriesName || `Series ${index + 1}`,
        text: formatSeriesReadoutText(summary, options),
        detailLines: resolveSeriesReadoutDetailLines(summary, options),
        color: summary.readoutColor || '#d4d4d4',
        seriesIndex: Number.isFinite(Number(summary.seriesIndex))
          ? Number(summary.seriesIndex)
          : index,
        distancePx: Number.isFinite(Number(summary.distancePx))
          ? Number(summary.distancePx)
          : Infinity,
        xPixel: Number(summary.xPixel),
        yPixel: Number(summary.yPixel),
        markerPoints: Array.isArray(summary.markerPoints)
          ? summary.markerPoints
          : [],
      }))
    : [];

  const orderedRows = rows.slice().sort((a, b) => {
    if (rowOrder === 'distance' && a.distancePx !== b.distancePx) {
      return a.distancePx - b.distancePx;
    }

    if (a.seriesIndex !== b.seriesIndex) {
      return a.seriesIndex - b.seriesIndex;
    }

    return a.distancePx - b.distancePx;
  });

  const titleText = `x: ${formatReadoutXValue(hoverEvent.xValue)}`;
  const svgWidth = Number(chartValues.width) || 0;
  const svgHeight = Number(chartValues.height) || 0;

  const markerRadius = Math.max(1, Number(options?.markerRadius) || 4);
  const markerStrokeWidth = Math.max(
    0.5,
    Number(options?.markerStrokeWidth) || 1.25,
  );
  const markerStroke =
    typeof options?.markerStroke === 'string'
      ? options.markerStroke
      : '#ffffff';
  const markerFill =
    typeof options?.markerFill === 'string' ? options.markerFill : 'none';
  const tooltipOffset = Number.isFinite(Number(options?.tooltipOffset))
    ? Number(options.tooltipOffset)
    : 12;

  const titleFontOptions = resolveReadoutFontOptions(options?.title, {
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'sans-serif',
    fontColor: 'currentColor',
  });
  const rowFontOptions = resolveReadoutFontOptions(options?.row, {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'sans-serif',
    fontColor: 'currentColor',
  });

  const titleFont = toFontString(titleFontOptions);
  const rowFont = toFontString(rowFontOptions);

  const readoutPadding = resolveReadoutPadding(options?.padding, {
    x: 8,
    y: 8,
  });
  const paddingX = readoutPadding.x;
  const paddingY = readoutPadding.y;
  const rowGap = Number.isFinite(Number(options?.rowGap))
    ? Math.max(0, Number(options.rowGap))
    : 4;
  const detailLineGap = 2;
  const titleGap = orderedRows.length > 0 ? rowGap : 0;
  const dotSize = 6;
  const dotGap = 6;

  const titleMetrics = getTextDimensions(titleText, titleFont);
  const rowLineHeight = Math.max(
    dotSize,
    Math.ceil(getTextDimensions('Ag', rowFont).height),
  );
  const rowLayouts = orderedRows.map((row) => {
    const hasDetailLines =
      Array.isArray(row.detailLines) && row.detailLines.length > 0;

    const primaryText = hasDetailLines
      ? row.label
      : `${row.label}: ${row.text}`;
    const detailLines = hasDetailLines
      ? row.detailLines.map((line) => ({
          key: line.key,
          text: `${line.label}: ${line.text}`,
        }))
      : [];

    const lineTexts = [primaryText, ...detailLines.map((line) => line.text)];
    const maxLineWidth = lineTexts.reduce((maxWidth, lineText) => {
      const textMetrics = getTextDimensions(lineText, rowFont);
      return Math.max(maxWidth, dotSize + dotGap + textMetrics.width);
    }, 0);

    const blockHeight =
      lineTexts.length * rowLineHeight +
      Math.max(0, lineTexts.length - 1) * detailLineGap;

    return {
      ...row,
      primaryText,
      detailLines,
      blockHeight,
      width: maxLineWidth,
    };
  });
  const rowWidths = rowLayouts.map((row) => row.width);
  const rowsTotalHeight =
    rowLayouts.reduce((sum, row) => sum + row.blockHeight, 0) +
    Math.max(0, rowLayouts.length - 1) * rowGap;

  const tooltipContentWidth = Math.max(titleMetrics.width, ...rowWidths, 0);
  const tooltipWidth = Math.ceil(paddingX * 2 + tooltipContentWidth);
  const tooltipHeight = Math.ceil(
    paddingY * 2 + titleMetrics.height + titleGap + rowsTotalHeight,
  );
  const titleCenterY = paddingY + titleMetrics.height / 2;

  const rowTopOffsets = [];
  let nextRowTop = paddingY + titleMetrics.height + titleGap;
  rowLayouts.forEach((row) => {
    rowTopOffsets.push(nextRowTop);
    nextRowTop += row.blockHeight + rowGap;
  });

  let tooltipLeft = localX + tooltipOffset;
  if (tooltipLeft + tooltipWidth > svgWidth) {
    tooltipLeft = localX - tooltipWidth - tooltipOffset;
  }
  tooltipLeft = clamp(tooltipLeft, 0, Math.max(0, svgWidth - tooltipWidth));

  let tooltipTop = localY - tooltipHeight / 2;
  tooltipTop = clamp(tooltipTop, 0, Math.max(0, svgHeight - tooltipHeight));

  const markerRows = rows
    .flatMap((row) => {
      const points =
        Array.isArray(row.markerPoints) && row.markerPoints.length > 0
          ? row.markerPoints
          : [{ id: 'primary', xPixel: row.xPixel, yPixel: row.yPixel }];

      return points.map((point, pointIndex) => ({
        id: `${row.id}-${point?.id ?? pointIndex}`,
        xPixel: Number(point?.xPixel),
        yPixel: Number(point?.yPixel),
      }));
    })
    .filter(
      (row) =>
        Number.isFinite(row.xPixel) &&
        Number.isFinite(row.yPixel) &&
        row.xPixel >= left &&
        row.xPixel <= right &&
        row.yPixel >= top &&
        row.yPixel <= bottom,
    );

  return (
    <g className="gsl-chart-readout" pointerEvents="none" aria-hidden="true">
      {showVerticalLine && (
        <line
          className="gsl-chart-readout-vertical-line"
          x1={localX}
          x2={localX}
          y1={top}
          y2={bottom}
          stroke="#d4d4d4"
          strokeWidth={1}
          strokeOpacity={0.9}
          strokeDasharray="6 4"
        />
      )}

      {showPointMarkers &&
        markerRows.map((row) => (
          <circle
            key={`marker-${row.id}`}
            cx={row.xPixel}
            cy={row.yPixel}
            r={markerRadius}
            stroke={markerStroke}
            strokeWidth={markerStrokeWidth}
            fill={markerFill}
          />
        ))}

      {showTooltip && orderedRows.length > 0 && (
        <g
          className="gsl-chart-readout-tooltip"
          transform={`translate(${tooltipLeft}, ${tooltipTop})`}
          style={{ color: '#f9fafb' }}
        >
          <rect
            width={tooltipWidth}
            height={tooltipHeight}
            rx={6}
            ry={6}
            fill="#111827"
            fillOpacity={0.95}
            stroke="#374151"
            strokeWidth={1}
          />
          <text
            x={paddingX}
            y={titleCenterY}
            dominantBaseline="middle"
            fill={titleFontOptions.fontColor}
            fontSize={titleFontOptions.fontSize}
            fontWeight={titleFontOptions.fontWeight}
            fontFamily={titleFontOptions.fontFamily}
          >
            {titleText}
          </text>

          {rowLayouts.map((row, index) => {
            const rowTop = rowTopOffsets[index];
            const primaryTextY = rowLineHeight / 2;

            return (
              <g key={row.id} transform={`translate(${paddingX}, ${rowTop})`}>
                <circle
                  cx={dotSize / 2}
                  cy={rowLineHeight / 2}
                  r={dotSize / 2}
                  fill={row.color}
                />
                <text
                  x={dotSize + dotGap}
                  y={primaryTextY}
                  dominantBaseline="middle"
                  fill={rowFontOptions.fontColor}
                  fontSize={rowFontOptions.fontSize}
                  fontWeight={rowFontOptions.fontWeight}
                  fontFamily={rowFontOptions.fontFamily}
                >
                  {row.primaryText}
                </text>

                {row.detailLines.map((detailLine, detailIndex) => {
                  const detailTextY =
                    rowLineHeight / 2 +
                    (detailIndex + 1) * (rowLineHeight + detailLineGap);

                  return (
                    <text
                      key={`${row.id}-${detailLine.key}`}
                      x={dotSize + dotGap}
                      y={detailTextY}
                      dominantBaseline="middle"
                      fill={rowFontOptions.fontColor}
                      fontSize={rowFontOptions.fontSize}
                      fontWeight={rowFontOptions.fontWeight}
                      fontFamily={rowFontOptions.fontFamily}
                    >
                      {detailLine.text}
                    </text>
                  );
                })}
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
}

export default Readout;
