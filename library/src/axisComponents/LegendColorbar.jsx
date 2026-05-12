function LegendColorbar({ item, legendOptions = {} }) {
  const {
    label,
    colors = [],
    minLabel,
    maxLabel,
    barWidth,
    barHeight,
    tickGap,
    labelTextHeight,
    labelGap,
    tickLabelHeight,
    width,
  } = item;

  const fontFamily = legendOptions.fontFamily ?? 'inherit';
  const fontSize = legendOptions.fontSize ?? 12;
  const fontWeight = legendOptions.fontWeight ?? 500;
  const fontColor = legendOptions.fontColor ?? 'currentColor';
  const tickFontSize = legendOptions?.colorbar?.tickFontSize ?? 10;
  const tickFontWeight = legendOptions?.colorbar?.tickFontWeight ?? 400;

  const safeBarWidth = Math.max(1, Number(barWidth) || 1);
  const safeBarHeight = Math.max(1, Number(barHeight) || 1);
  const safeWidth = Math.max(safeBarWidth, Number(width) || safeBarWidth);
  const barX = (safeWidth - safeBarWidth) / 2;

  let yCursor = 0;
  const labelY = yCursor;
  if (label) {
    yCursor += (Number(labelTextHeight) || fontSize) + (Number(labelGap) || 0);
  }

  const barY = yCursor;
  yCursor += safeBarHeight;

  const hasTickLabels = Boolean(minLabel || maxLabel);
  const ticksY =
    yCursor +
    (Number(tickGap) || 0) +
    Math.max(0, Number(tickLabelHeight) || 0);

  const barColors =
    Array.isArray(colors) && colors.length > 0 ? colors : ['#b8b8b8'];
  const segmentWidth = safeBarWidth / barColors.length;
  const segments = barColors.map((color, order) => {
    const colorCount = barColors
      .slice(0, order)
      .filter((entryColor) => entryColor === color).length;

    return {
      key: `${item.id}-segment-${color}-${colorCount}`,
      color,
      order,
    };
  });

  return (
    <g className="gsl-chart-legend-colorbar">
      {label && (
        <text
          x={safeWidth / 2}
          y={labelY}
          textAnchor="middle"
          alignmentBaseline="hanging"
          style={{
            fill: fontColor,
            fontFamily,
            fontSize: `${fontSize}px`,
            fontWeight,
            color: fontColor,
          }}
        >
          {label}
        </text>
      )}

      {segments.map((segment) => (
        <rect
          key={segment.key}
          x={barX + segmentWidth * segment.order}
          y={barY}
          width={segmentWidth}
          height={safeBarHeight}
          fill={segment.color}
          shapeRendering="crispEdges"
        />
      ))}

      <rect
        x={barX}
        y={barY}
        width={safeBarWidth}
        height={safeBarHeight}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeWidth={0.75}
        shapeRendering="crispEdges"
      />

      {hasTickLabels && (
        <g>
          {minLabel && (
            <text
              x={barX}
              y={ticksY}
              textAnchor="start"
              alignmentBaseline="baseline"
              style={{
                fill: fontColor,
                fontFamily,
                fontSize: `${tickFontSize}px`,
                fontWeight: tickFontWeight,
                color: fontColor,
              }}
            >
              {minLabel}
            </text>
          )}
          {maxLabel && (
            <text
              x={barX + safeBarWidth}
              y={ticksY}
              textAnchor="end"
              alignmentBaseline="baseline"
              style={{
                fill: fontColor,
                fontFamily,
                fontSize: `${tickFontSize}px`,
                fontWeight: tickFontWeight,
                color: fontColor,
              }}
            >
              {maxLabel}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

export default LegendColorbar;
