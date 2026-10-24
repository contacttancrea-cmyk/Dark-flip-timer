import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUICK_PRESETS,
  clampTimeParts,
  timePartsToSeconds,
  secondsToTimeParts,
  presetMinutesToSeconds,
  formatTwoDigits,
  formatReadableTime,
  calculateRemainingFromTarget,
  stepUnitValue,
  updateSingleUnit,
  calculateProgressPercent,
} from './timerLogic';

test('QUICK_PRESETS includes all 8 required preset minute values', () => {
  const minutesList = QUICK_PRESETS.map((p) => p.minutes);
  assert.deepEqual(minutesList, [1, 5, 10, 15, 25, 30, 45, 60]);
});

test('timePartsToSeconds and secondsToTimeParts round-trip accurately', () => {
  const total = timePartsToSeconds({ hours: 1, minutes: 25, seconds: 45 });
  assert.equal(total, 5145);
  assert.deepEqual(secondsToTimeParts(total), { hours: 1, minutes: 25, seconds: 45 });
});

test('presetMinutesToSeconds converts 60 minutes to 1 hour (3600s)', () => {
  const secs = presetMinutesToSeconds(60);
  assert.equal(secs, 3600);
  assert.deepEqual(secondsToTimeParts(secs), { hours: 1, minutes: 0, seconds: 0 });
});

test('clampTimeParts restricts hours to 0..99 and minutes/seconds to 0..59', () => {
  const clamped = clampTimeParts({ hours: 140, minutes: 75, seconds: -5 });
  assert.deepEqual(clamped, { hours: 99, minutes: 59, seconds: 0 });
});

test('calculateRemainingFromTarget prevents drift and detects completion accurately', () => {
  const startMs = 1_700_000_000_000;
  const targetEndMs = startMs + 25 * 60 * 1000; // 25 minutes

  // After 10 minutes and 200ms in background
  const check1 = calculateRemainingFromTarget(targetEndMs, startMs + 10 * 60 * 1000 + 200);
  assert.equal(check1.isCompleted, false);
  assert.equal(check1.remainingSeconds, 15 * 60); // ceil(14m 59.8s) = 15m 00s

  // Exactly at target end time
  const check2 = calculateRemainingFromTarget(targetEndMs, targetEndMs);
  assert.equal(check2.isCompleted, true);
  assert.equal(check2.remainingSeconds, 0);
  assert.equal(check2.remainingMs, 0);
});

test('stepUnitValue wraps minutes and seconds cleanly within 0..59', () => {
  const initial = timePartsToSeconds({ hours: 0, minutes: 0, seconds: 0 });
  const steppedDownSec = stepUnitValue(initial, 'seconds', -1);
  assert.deepEqual(secondsToTimeParts(steppedDownSec), { hours: 0, minutes: 0, seconds: 59 });

  const steppedUpMin = stepUnitValue(steppedDownSec, 'minutes', 25);
  assert.deepEqual(secondsToTimeParts(steppedUpMin), { hours: 0, minutes: 25, seconds: 59 });
});

test('updateSingleUnit parses and clamps direct user digit input', () => {
  const base = timePartsToSeconds({ hours: 0, minutes: 25, seconds: 0 });
  const updatedHours = updateSingleUnit(base, 'hours', '02');
  assert.equal(formatReadableTime(updatedHours), '02:25:00');

  const clampedSeconds = updateSingleUnit(updatedHours, 'seconds', '88');
  assert.equal(formatReadableTime(clampedSeconds), '02:25:59');
});

test('calculateProgressPercent computes accurate completion ratio', () => {
  assert.equal(calculateProgressPercent(100, 100), 0);
  assert.equal(calculateProgressPercent(100, 25), 75);
  assert.equal(calculateProgressPercent(100, 0), 100);
  assert.equal(formatTwoDigits(7), '07');
});
