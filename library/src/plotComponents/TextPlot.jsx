import { useChartHelpers } from '../hooks/useChartHelpers';
import { mergeDeep } from '../utilities/dataUtilities';
import { defaultTextPlotOptions } from '../utilities/defaultOptions';
import { getPlotBoundsFromChartValues } from '../utilities/measurements';
import {
  buildManualTextCandidates,
  buildSeriesTextCandidates,
  layoutTextCandidates,
} from '../utilities/textPlot';

function TextPlot() {
  const {
    chartValues,
    computedScales,
    getAccessors,
    getSeriesData,
    getSeriesScales,
  } = useChartHelpers();
  const definitions = chartValues.options.textPlots;
  if (!Array.isArray(definitions) || !definitions.length) return null;

  const seriesList = chartValues.options.series || [];
  const candidates = definitions.flatMap((definition, groupId) => {
    if (!definition || definition.isVisible === false) return [];
    const options = mergeDeep(defaultTextPlotOptions, definition);
    if (Object.hasOwn(definition, 'data')) {
      const axisKeys = options.axisKeys || { x: 'x', y: 'y' };
      if (
        !['x', 'x2'].includes(axisKeys.x) ||
        !['y', 'y2'].includes(axisKeys.y)
      )
        return [];
      return buildManualTextCandidates({
        data: Array.isArray(options.data) ? options.data : [],
        xScale: computedScales[axisKeys.x]?.scale,
        yScale: computedScales[axisKeys.y]?.scale,
        options,
        groupId,
      });
    }
    const seriesIndex =
      options.seriesId != null
        ? seriesList.findIndex((series) => series.id === options.seriesId)
        : (options.seriesIndex ?? 0);
    const series = seriesList[seriesIndex];
    if (
      !Number.isInteger(seriesIndex) ||
      !series ||
      !['line', 'circle'].includes(series.type)
    )
      return [];
    const { xScale, yScale, axisKeys } = getSeriesScales(seriesIndex);
    return buildSeriesTextCandidates({
      data: getSeriesData(seriesIndex),
      accessors: getAccessors(seriesIndex),
      xScale,
      yScale,
      series: {
        ...series,
        units: series.units || chartValues.options.axes?.[axisKeys.y]?.units,
      },
      options,
      groupId,
    });
  });
  const labels = layoutTextCandidates({
    candidates,
    bounds: getPlotBoundsFromChartValues(chartValues),
  });
  if (!labels.length) return null;

  return (
    <g className="gsl-chart-text-plots" pointerEvents="none">
      {labels.map((label) => (
        <text
          key={label.id}
          className={`gsl-chart-text-plot-label ${label.options.className}`}
          data-text-plot={label.groupId}
          data-data-index={label.dataIndex}
          x={label.labelX}
          y={label.labelY}
          textAnchor="middle"
          dominantBaseline="text-after-edge"
          fontFamily={label.options.fontFamily}
          fontSize={label.fontSize}
          fontWeight={label.options.fontWeight}
          fill={label.options.fontColor}
          stroke={label.options.haloColor}
          strokeWidth={label.options.haloWidth}
          strokeLinejoin="round"
          paintOrder="stroke"
          style={label.options.sx}
        >
          {label.text}
        </text>
      ))}
    </g>
  );
}

export default TextPlot;
