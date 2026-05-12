import LegendColorbar from './LegendColorbar';
import { useChartHelpers } from '../hooks/useChartHelpers';

function renderMarker(item) {
  const markerCenterY = item.height / 2;
  const markerHalf = item.markerSize / 2;

  switch (item.markerShape) {
    case 'line':
      return (
        <line
          x1={0}
          x2={item.markerSize}
          y1={markerCenterY}
          y2={markerCenterY}
          stroke={item.color}
          strokeWidth={3}
          strokeLinecap="round"
        />
      );
    case 'circle':
      return (
        <circle
          cx={markerHalf}
          cy={markerCenterY}
          r={markerHalf}
          fill={item.color}
        />
      );
    default:
      return (
        <rect
          x={0}
          y={markerCenterY - markerHalf}
          width={item.markerSize}
          height={item.markerSize}
          rx={1}
          ry={1}
          fill={item.color}
          shapeRendering="crispEdges"
        />
      );
  }
}

function Legend() {
  const { chartValues } = useChartHelpers();

  const legendLayout = chartValues.legendLayout;
  if (!legendLayout?.enabled || !Array.isArray(legendLayout.items)) return null;

  const legendOptions = chartValues.options?.legend || {};
  const fontFamily = legendOptions.fontFamily ?? 'inherit';
  const fontSize = legendOptions.fontSize ?? 12;
  const fontWeight = legendOptions.fontWeight ?? 500;
  const fontColor = legendOptions.fontColor ?? 'currentColor';

  const baselineY = chartValues.margin.top + chartValues.innerHeight;
  const legendOriginX = chartValues.margin.left;
  const legendOriginY = baselineY + legendLayout.axisOffset + legendLayout.gap;

  return (
    <g
      className={`gsl-chart-legend ${legendOptions.className || ''}`.trim()}
      style={legendOptions.sx}
    >
      {legendLayout.items.map((item, index) => {
        const itemKey = `${item.id}-${item.rowIndex}-${index}`;

        return (
          <g
            key={itemKey}
            transform={`translate(${legendOriginX + item.x}, ${legendOriginY + item.y})`}
          >
            {item.kind === 'colorbar' ? (
              <LegendColorbar item={item} legendOptions={legendOptions} />
            ) : (
              <g className="gsl-chart-legend-item">
                {renderMarker(item)}
                <text
                  x={item.markerSize + 6}
                  y={item.height / 2}
                  textAnchor="start"
                  alignmentBaseline="central"
                  style={{
                    fill: fontColor,
                    fontFamily,
                    fontSize: `${fontSize}px`,
                    fontWeight,
                    color: fontColor,
                  }}
                >
                  {item.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default Legend;
