export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export type AppMode = 'timer' | 'stopwatch';

export interface StopwatchLap {
  id: number;
  lapTimeSeconds: number;
  totalTimeSeconds: number;
  formattedLap: string;
  formattedTotal: string;
}

export type TimeUnitKey = 'hours' | 'minutes' | 'seconds';

export interface TimeParts {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface PresetOption {
  minutes: number;
  label: string;
  tag: string;
}

export const QUICK_PRESETS: PresetOption[] = [
  { minutes: 1, label: '1m', tag: 'Quick' },
  { minutes: 5, label: '5m', tag: 'Break' },
  { minutes: 10, label: '10m', tag: 'Sprint' },
  { minutes: 15, label: '15m', tag: 'Standup' },
  { minutes: 25, label: '25m', tag: 'Focus' },
  { minutes: 30, label: '30m', tag: 'Half Hour' },
  { minutes: 45, label: '45m', tag: 'Deep Work' },
  { minutes: 60, label: '60m', tag: 'Full Hour' },
];

export const MAX_HOURS = 99;
export const MAX_MINUTES = 59;
export const MAX_SECONDS = 59;

export function clampInt(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.floor(val)));
}

export function clampTimeParts(parts: Partial<TimeParts>): TimeParts {
  return {
    hours: clampInt(parts.hours ?? 0, 0, MAX_HOURS),
    minutes: clampInt(parts.minutes ?? 0, 0, MAX_MINUTES),
    seconds: clampInt(parts.seconds ?? 0, 0, MAX_SECONDS),
  };
}

export function timePartsToSeconds(parts: TimeParts): number {
  const clean = clampTimeParts(parts);
  return clean.hours * 3600 + clean.minutes * 60 + clean.seconds;
}

export function secondsToTimeParts(totalSeconds: number): TimeParts {
  const safeSeconds = Math.max(0, Math.min(MAX_HOURS * 3600 + 3599, Math.floor(totalSeconds)));
  const hours = Math.floor(safeSeconds / 3600);
  const remainder = safeSeconds % 3600;
  const minutes = Math.floor(remainder / 60);
  const seconds = remainder % 60;
  return { hours, minutes, seconds };
}

export function presetMinutesToSeconds(minutes: number): number {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  return Math.min(MAX_HOURS * 3600 + 3599, safeMinutes * 60);
}

export function formatTwoDigits(value: number): string {
  const clamped = clampInt(value, 0, 99);
  return clamped < 10 ? `0${clamped}` : `${clamped}`;
}

export function formatReadableTime(totalSeconds: number): string {
  const { hours, minutes, seconds } = secondsToTimeParts(totalSeconds);
  return `${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}:${formatTwoDigits(seconds)}`;
}

/**
 * Drift-free countdown calculation based on absolute wall-clock target timestamp.
 * Even if the application window is minimized or loses focus, comparing against
 * Date.now() prevents cumulative setInterval drift.
 */
export function calculateRemainingFromTarget(
  targetEndTimeMs: number,
  nowMs: number
): {
  remainingMs: number;
  remainingSeconds: number;
  isCompleted: boolean;
} {
  const rawRemainingMs = targetEndTimeMs - nowMs;
  if (rawRemainingMs <= 0) {
    return {
      remainingMs: 0,
      remainingSeconds: 0,
      isCompleted: true,
    };
  }
  const remainingSeconds = Math.ceil(rawRemainingMs / 1000);
  return {
    remainingMs: rawRemainingMs,
    remainingSeconds,
    isCompleted: false,
  };
}

export function stepUnitValue(
  currentTotalSeconds: number,
  unit: TimeUnitKey,
  delta: number
): number {
  const parts = secondsToTimeParts(currentTotalSeconds);
  if (unit === 'hours') {
    const nextHours = (parts.hours + delta + (MAX_HOURS + 1)) % (MAX_HOURS + 1);
    return timePartsToSeconds({ ...parts, hours: nextHours });
  }
  if (unit === 'minutes') {
    const nextMinutes = (parts.minutes + delta + 60) % 60;
    return timePartsToSeconds({ ...parts, minutes: nextMinutes });
  }
  const nextSeconds = (parts.seconds + delta + 60) % 60;
  return timePartsToSeconds({ ...parts, seconds: nextSeconds });
}

export function updateSingleUnit(
  currentTotalSeconds: number,
  unit: TimeUnitKey,
  rawNumericInput: string
): number {
  const digitsOnly = rawNumericInput.replace(/\D/g, '').slice(-2);
  const parsed = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
  const parts = secondsToTimeParts(currentTotalSeconds);

  if (unit === 'hours') {
    return timePartsToSeconds({ ...parts, hours: clampInt(parsed, 0, MAX_HOURS) });
  }
  if (unit === 'minutes') {
    return timePartsToSeconds({ ...parts, minutes: clampInt(parsed, 0, MAX_MINUTES) });
  }
  return timePartsToSeconds({ ...parts, seconds: clampInt(parsed, 0, MAX_SECONDS) });
}

export function calculateProgressPercent(
  initialDurationSeconds: number,
  remainingSeconds: number
): number {
  if (initialDurationSeconds <= 0) return 0;
  const elapsed = Math.max(0, initialDurationSeconds - remainingSeconds);
  return Math.min(100, Math.max(0, (elapsed / initialDurationSeconds) * 100));
}

/**
 * Drift-free Stopwatch count-up calculation based on hardware wall-clock timestamp.
 */
export function calculateStopwatchElapsed(
  startTimeMs: number,
  accumulatedMs: number,
  nowMs: number
): {
  elapsedMs: number;
  elapsedSeconds: number;
} {
  const currentRunMs = Math.max(0, nowMs - startTimeMs);
  const totalMs = accumulatedMs + currentRunMs;
  const elapsedSeconds = Math.floor(totalMs / 1000);
  return {
    elapsedMs: totalMs,
    elapsedSeconds: Math.min(MAX_HOURS * 3600 + 3599, elapsedSeconds),
  };
}
