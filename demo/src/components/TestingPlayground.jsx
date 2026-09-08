import { useMemo, useState } from 'react';
import {
  ChartContainer,
  timeFormatter,
  useChartController,
} from '@noaa-gsl/wizard-charts';
import '@noaa-gsl/wizard-charts/styles.css';
import { testingDataPresets } from '../data/testingDataPresets';

const getValueByPath = (row, key) => {
  if (typeof key === 'function') return key(row);
  if (!key && key !== 0) return undefined;

  return String(key)
    .split('.')
    .reduce((value, pathPart) => value?.[pathPart], row);
};

const toNumericValue = (value) => {
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getZoomDemoExtent = (data, options) => {
  const series = options?.series?.[0] || {};
  const xKey = series.xKey || 'x';
  const values = (data || [])
    .map((row) => toNumericValue(getValueByPath(row, xKey)))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return null;

  return {
    min,
    max,
    center: min + span / 2,
    windowSize: span / 4,
    step: Math.max(1, span / 100),
    isTime: options?.axes?.x?.type === 'time',
  };
};

const formatZoomDemoValue = (value, isTime) => {
  if (!Number.isFinite(value)) return 'None';
  return isTime ? new Date(value).toISOString() : value.toFixed(2);
};

const evaluateUserCode = (code, expectedType, sourceName) => {
  const result = new Function(
    'timeFormatter',
    `'use strict'; return (${code});`,
  )(timeFormatter);

  if (expectedType === 'array' && !Array.isArray(result)) {
    throw new Error(`${sourceName} must evaluate to an array.`);
  }

  if (
    expectedType === 'object' &&
    (Array.isArray(result) || typeof result !== 'object' || result === null)
  ) {
    throw new Error(`${sourceName} must evaluate to an object.`);
  }

  return result;
};

function TestingPlayground() {
  const initialDataPreset = testingDataPresets.data[0];
  const initialOptionsPreset = testingDataPresets.options[0];

  const [selectedDataPresetId, setSelectedDataPresetId] = useState(
    initialDataPreset.id,
  );
  const [selectedOptionsPresetId, setSelectedOptionsPresetId] = useState(
    initialOptionsPreset.id,
  );
  const [dataCode, setDataCode] = useState(initialDataPreset.source);
  const [optionsCode, setOptionsCode] = useState(initialOptionsPreset.source);
  const [chartData, setChartData] = useState(initialDataPreset.value);
  const [chartOptions, setChartOptions] = useState(initialOptionsPreset.value);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastZoomSource, setLastZoomSource] = useState('none');
  const { controller, zoomState } = useChartController({
    onZoomStateChange: (nextZoomState, context) => {
      setLastZoomSource(context?.source || nextZoomState.source || 'none');
    },
  });

  const zoomDemoExtent = useMemo(
    () => getZoomDemoExtent(chartData, chartOptions),
    [chartData, chartOptions],
  );
  const sliderCenterValue = Number.isFinite(zoomState.centerValue)
    ? zoomState.centerValue
    : zoomDemoExtent?.center;

  const handleApply = () => {
    try {
      const parsedData = evaluateUserCode(dataCode, 'array', 'Data code');
      const parsedOptions = evaluateUserCode(
        optionsCode,
        'object',
        'Options code',
      );
      setChartData(parsedData);
      setChartOptions(parsedOptions);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Invalid code.');
    }
  };

  const handleReset = () => {
    const activeDataPreset = testingDataPresets.data.find(
      (preset) => preset.id === selectedDataPresetId,
    );
    const activeOptionsPreset = testingDataPresets.options.find(
      (preset) => preset.id === selectedOptionsPresetId,
    );

    if (!activeDataPreset || !activeOptionsPreset) {
      return;
    }

    setDataCode(activeDataPreset.source);
    setOptionsCode(activeOptionsPreset.source);
    setChartData(activeDataPreset.value);
    setChartOptions(activeOptionsPreset.value);
    setErrorMessage('');
    controller.resetZoom();
  };

  const handleDataPresetChange = (event) => {
    const nextPresetId = event.target.value;
    const nextPreset = testingDataPresets.data.find(
      (preset) => preset.id === nextPresetId,
    );

    if (!nextPreset) {
      return;
    }

    setSelectedDataPresetId(nextPresetId);
    setDataCode(nextPreset.source);
    setChartData(nextPreset.value);
    setErrorMessage('');
    controller.resetZoom();
  };

  const handleOptionsPresetChange = (event) => {
    const nextPresetId = event.target.value;
    const nextPreset = testingDataPresets.options.find(
      (preset) => preset.id === nextPresetId,
    );

    if (!nextPreset) {
      return;
    }

    setSelectedOptionsPresetId(nextPresetId);
    setOptionsCode(nextPreset.source);
    setChartOptions(nextPreset.value);
    setErrorMessage('');
    controller.resetZoom();
  };

  const handleCenterWindow = () => {
    if (!zoomDemoExtent) return;

    controller.setZoomWindow({
      center: zoomDemoExtent.center,
      windowSize: zoomDemoExtent.windowSize,
    });
  };

  const handleCenterSliderChange = (event) => {
    if (!zoomDemoExtent) return;

    const nextCenter = Number(event.target.value);
    const windowSize = Number.isFinite(zoomState.windowSize)
      ? zoomState.windowSize
      : zoomDemoExtent.windowSize;

    controller.setZoomWindow({
      center: nextCenter,
      windowSize,
    });
  };

  return (
    <div className="testing-data-layout">
      <div className="testing-data-controls">
        <div className="testing-data-controls-header">
          <h2>Testing Playground</h2>
          <p>Select a default, edit code, then apply changes to the chart.</p>
        </div>

        <div className="testing-data-actions">
          <button type="button" onClick={handleApply}>
            Apply Changes
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={handleReset}
          >
            Reset To Presets
          </button>
        </div>

        {errorMessage ? (
          <p className="testing-data-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="testing-data-zoom-controls">
          <div className="testing-data-zoom-header">
            <strong>Zoom Controller</strong>
            <span>{zoomState.isZoomed ? 'Zoomed' : 'Full extent'}</span>
          </div>

          <div className="testing-data-actions">
            <button type="button" onClick={() => controller.resetZoom()}>
              Reset Zoom
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!zoomDemoExtent}
              onClick={handleCenterWindow}
            >
              Center Window
            </button>
          </div>

          {zoomDemoExtent ? (
            <label className="testing-data-zoom-slider">
              <span>Center</span>
              <input
                type="range"
                min={zoomDemoExtent.min}
                max={zoomDemoExtent.max}
                step={zoomDemoExtent.step}
                value={sliderCenterValue ?? zoomDemoExtent.center}
                onChange={handleCenterSliderChange}
              />
            </label>
          ) : null}

          <dl className="testing-data-zoom-readout">
            <div>
              <dt>Center</dt>
              <dd>
                {formatZoomDemoValue(
                  zoomState.centerValue,
                  zoomDemoExtent?.isTime,
                )}
              </dd>
            </div>
            <div>
              <dt>Window</dt>
              <dd>
                {Number.isFinite(zoomState.windowSize)
                  ? zoomState.windowSize.toFixed(0)
                  : 'None'}
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{lastZoomSource}</dd>
            </div>
          </dl>
        </div>

        <div className="testing-data-editor-group">
          <div className="testing-data-editor-header">
            <label htmlFor="data-presets">Data Preset</label>
            <select
              id="data-presets"
              value={selectedDataPresetId}
              onChange={handleDataPresetChange}
            >
              {testingDataPresets.data.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="testing-data-textarea"
            spellCheck={false}
            value={dataCode}
            onChange={(event) => setDataCode(event.target.value)}
            aria-label="Data array editor"
          />
        </div>

        <div className="testing-data-editor-group">
          <div className="testing-data-editor-header">
            <label htmlFor="options-presets">Options Preset</label>
            <select
              id="options-presets"
              value={selectedOptionsPresetId}
              onChange={handleOptionsPresetChange}
            >
              {testingDataPresets.options.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="testing-data-textarea"
            spellCheck={false}
            value={optionsCode}
            onChange={(event) => setOptionsCode(event.target.value)}
            aria-label="Options object editor"
          />
        </div>
      </div>

      <div className="testing-data-chart">
        <ChartContainer
          height={600}
          // width={1200}
          controller={controller}
          data={chartData}
          options={chartOptions}
        />
      </div>
    </div>
  );
}

export default TestingPlayground;
