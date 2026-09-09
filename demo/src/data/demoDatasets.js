const demoStartDate = new Date('2026-08-01T00:00:00Z');

const buildPercentileSummary = (mean, spread) => ({
  mean: Math.round(mean * 10) / 10,
  p05: Math.round((mean - spread * 1.9) * 10) / 10,
  p10: Math.round((mean - spread * 1.45) * 10) / 10,
  p25: Math.round((mean - spread * 0.7) * 10) / 10,
  p50: Math.round((mean + spread * 0.05) * 10) / 10,
  p75: Math.round((mean + spread * 0.7) * 10) / 10,
  p90: Math.round((mean + spread * 1.45) * 10) / 10,
  p95: Math.round((mean + spread * 1.9) * 10) / 10,
});

export const timeSeriesDemoData = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(demoStartDate.getTime() + index * 3600_000);
  const dayCycle = (index / 24) * Math.PI * 2;
  const trend = index * 0.35;
  const temperatureMean = 42 + trend + Math.sin(dayCycle - 0.8) * 9;
  const windMean = 18 + Math.sin(dayCycle * 1.4 + 0.6) * 7 + index * 0.12;

  return {
    date,
    series1: buildPercentileSummary(
      temperatureMean,
      2.8 + Math.cos(dayCycle) * 0.8,
    ),
    series2: buildPercentileSummary(windMean, 3.5 + Math.sin(dayCycle) * 0.9),
  };
});

const matrixCategories = ['model1', 'model2', 'model3', 'model4'];
const matrixDates = Array.from(
  { length: 12 },
  (_, i) => new Date(demoStartDate.getTime() + i * 24 * 3600_000),
);

export const matrixData = matrixDates.flatMap((date, dateIndex) =>
  matrixCategories.map((category, categoryIndex) => {
    const base = 45 + dateIndex * 1.8 + categoryIndex * 5.5;
    const wave = Math.sin((dateIndex + categoryIndex) / 2) * 7;
    const value = Math.round((base + wave) * 10) / 10;
    return {
      date,
      category,
      value,
      label: `${value.toFixed(1)}F`,
    };
  }),
);

const heatmapLevels = Array.from({ length: 16 }, (_, i) => i * 400);
const heatmapTimeSteps = Array.from(
  { length: 42 },
  (_, i) => new Date(demoStartDate.getTime() + i * 6 * 3600_000),
);

function makeHeatValue(xNorm, yNorm) {
  const ridgeA = Math.exp(
    -((xNorm - 0.32) ** 2 / 0.018 + (yNorm - 0.55) ** 2 / 0.06),
  );
  const ridgeB = Math.exp(
    -((xNorm - 0.72) ** 2 / 0.03 + (yNorm - 0.28) ** 2 / 0.03),
  );
  const wave =
    0.4 * Math.sin(xNorm * Math.PI * 5.5) * Math.cos(yNorm * Math.PI * 2.2);
  return 15 + ridgeA * 32 + ridgeB * 22 + wave * 8;
}

export const heatmapData = heatmapTimeSteps.flatMap((timestamp, xi) => {
  const xNorm =
    heatmapTimeSteps.length > 1 ? xi / (heatmapTimeSteps.length - 1) : 0;
  return heatmapLevels.map((level, yi) => {
    const yNorm =
      heatmapLevels.length > 1 ? yi / (heatmapLevels.length - 1) : 0;
    return {
      time: timestamp,
      level,
      value: Math.round(makeHeatValue(xNorm, yNorm) * 10) / 10,
    };
  });
});

const windBarbPressureLevels = [850, 700, 500, 300, 200];
const windBarbStandaloneTimes = heatmapTimeSteps.filter((_, i) => i % 5 === 0);

export const windBarbStandaloneData = windBarbStandaloneTimes.flatMap(
  (timestamp, xi) => {
    const xNorm =
      windBarbStandaloneTimes.length > 1
        ? xi / (windBarbStandaloneTimes.length - 1)
        : 0;
    return windBarbPressureLevels.map((level, yi) => {
      const heightFactor = yi / (windBarbPressureLevels.length - 1);
      const speed =
        10 + heightFactor * 60 + 8 * Math.sin(xNorm * Math.PI * 2.5 + yi * 0.8);
      const direction = (200 + heightFactor * 110 + xNorm * 45) % 360;
      return {
        time: timestamp,
        level,
        speed: Math.max(0, Math.round(speed)),
        direction: Math.round(direction),
      };
    });
  },
);

const windBarbOverlayLevels = [400, 1600, 2800, 4000, 5200];
const windBarbOverlayTimes = heatmapTimeSteps.filter((_, i) => i % 5 === 0);

export const windBarbOverlayData = windBarbOverlayTimes.flatMap(
  (timestamp, xi) => {
    const xNorm =
      windBarbOverlayTimes.length > 1
        ? xi / (windBarbOverlayTimes.length - 1)
        : 0;
    return windBarbOverlayLevels.map((level, yi) => {
      const heightFactor = yi / (windBarbOverlayLevels.length - 1);
      const speed =
        5 + heightFactor * 40 + 10 * Math.sin(xNorm * Math.PI * 2 + yi);
      const direction = (180 + heightFactor * 120 + xNorm * 60) % 360;
      return {
        time: timestamp,
        level,
        speed: Math.max(0, Math.round(speed)),
        direction: Math.round(direction),
      };
    });
  },
);

const surfaceWindTimes = heatmapTimeSteps.filter((_, i) => i % 2 === 0);

export const surfaceWindData = surfaceWindTimes.map((timestamp, i) => {
  const t = i / (surfaceWindTimes.length - 1);
  const speed =
    18 +
    12 * Math.sin(t * Math.PI * 2.2) +
    5 * Math.sin(t * Math.PI * 7.5 + 1.2);
  const direction = (250 + 70 * Math.sin(t * Math.PI * 1.8)) % 360;
  return {
    time: timestamp,
    speed: Math.max(0, Math.round(speed)),
    direction: Math.round(((direction % 360) + 360) % 360),
  };
});
