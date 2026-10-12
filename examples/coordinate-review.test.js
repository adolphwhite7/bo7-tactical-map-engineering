// Synthetic review examples for the unchanged application coordinate module.
// These dimensions and positions are invented; no game data or service is used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  rawToDisplay, displayToRaw, pixelToRaw, rawToPixel, calculateRenderedSize,
} = require('../scripts/map-coordinate-algorithm.js');

const border = { left: 10, right: 20, top: 5, bottom: 15 };

test('playable corners and center land inside asymmetric image margins', () => {
  assert.deepEqual(rawToDisplay(0, 0, border), { x: 10, y: 5 });
  assert.deepEqual(rawToDisplay(100, 100, border), { x: 80, y: 85 });
  assert.deepEqual(rawToDisplay(50, 50, border), { x: 45, y: 45 });
});

test('display coordinates recover stored positions with documented rounding', () => {
  assert.deepEqual(displayToRaw(27.5, 65, border), { x: 25, y: 75 });
  const raw = { x: 12.34, y: 87.65 };
  const displayed = rawToDisplay(raw.x, raw.y, border);
  assert.deepEqual(displayToRaw(displayed.x, displayed.y, border), raw);
});

test('synthetic image pixel and raw conversions agree at a known position', () => {
  assert.deepEqual(rawToPixel(25, 75, 1000, 800, border), { x: 275, y: 520 });
  assert.deepEqual(pixelToRaw(275, 520, 1000, 800, border), { x: 25, y: 75 });
});

test('wide viewport centers a portrait map without distorting its aspect ratio', () => {
  assert.deepEqual(calculateRenderedSize(1200, 800, 0.5), {
    width: 400, height: 800, offsetX: 400, offsetY: 0,
  });
});

test('tall viewport centers a landscape map with vertical margins', () => {
  assert.deepEqual(calculateRenderedSize(600, 1000, 2), {
    width: 600, height: 300, offsetX: 0, offsetY: 350,
  });
});

test('maps without border offsets preserve percentage coordinates', () => {
  assert.deepEqual(rawToDisplay(25, 75), { x: 25, y: 75 });
  assert.deepEqual(displayToRaw(25, 75), { x: 25, y: 75 });
});
