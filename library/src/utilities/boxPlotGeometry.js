import { normalizePaddingFactor } from './dataUtilities';

export function getBoxPlotWidth({
  xAccessor,
  innerWidth,
  paddingFactor,
  seriesData,
  seriesIndex,
  xScale,
}) {
  const safePaddingFactor = normalizePaddingFactor(paddingFactor, {
    context: `boxPlot series at index ${seriesIndex} paddingFactor`,
  });
  const positions = seriesData
    .map((datum) => xScale(xAccessor(datum)))
    .filter((pixel) => Number.isFinite(pixel))
    .sort((a, b) => a - b);

  let step = 0;
  if (positions.length > 1) {
    const diffs = positions
      .slice(1)
      .map((value, index) => value - positions[index]);
    step = Math.max(0, Math.min(...diffs));
  }

  // Preserve the rendering fallback for single points and duplicate x values.
  const fallback = innerWidth / Math.max(1, seriesData.length);
  return (step || fallback) * safePaddingFactor;
}

export function getBoxPlotBounds({ x, width, alignment = 'center' }) {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) {
    return null;
  }

  let left = x - width / 2;
  if (alignment === 'right') left = x;
  else if (alignment === 'left') left = x - width;

  return { left, right: left + width, center: left + width / 2 };
}
