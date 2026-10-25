import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Plus,
  Keyboard,
  Pin,
  BellRing,
  Minus,
  Square,
  X,
  Headphones,
  Power,
  Bell,
  Flag,
  Sparkles,
  Clock,
  ArrowUpRight,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  AppMode,
  QUICK_PRESETS,
  StopwatchLap,
  TimeUnitKey,
  TimerStatus,
  calculateProgressPercent,
  calculateRemainingFromTarget,
  calculateStopwatchElapsed,
  formatReadableTime,
  presetMinutesToSeconds,
  secondsToTimeParts,
  stepUnitValue,
  updateSingleUnit,
} from './utils/timerLogic';
import { soundEngine } from './utils/soundEngine';
import {
  focusAudio,
  FocusSoundType,
  FOCUS_SOUND_OPTIONS,
} from './utils/focusAudio';
import {
  isRunningInElectron,
  requestDesktopOrBrowserFullscreen,
  sendDesktopNotification,
  triggerCompletionNotification,
} from './utils/desktopBridge';
import { checkForAppUpdates, UpdateInfo } from './utils/updateChecker';
import { FlipUnitCard } from './components/FlipUnitCard';
import { DesktopInfoModal } from './components/DesktopInfoModal';
import { FocusMusicModal } from './components/FocusMusicModal';
import { UpdateNotificationModal } from './components/UpdateNotificationModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';

const DEFAULT_DURATION_SECONDS = 25 * 60; // 25:00 default focus timer
const FULLSCREEN_IDLE_HIDE_MS = 2600;

export default function App() {
  const [initialDurationSeconds, setInitialDurationSeconds] = useState<number>(
    DEFAULT_DURATION_SECONDS
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    DEFAULT_DURATION_SECONDS
  );
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [activePresetMinutes, setActivePresetMinutes] = useState<number | null>(25);

  // Sound & Desktop Preferences
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [tickSoundEnabled, setTickSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);

  // Focus Concentration Music & Noise Masking
  const [focusMusicModalOpen, setFocusMusicModalOpen] = useState<boolean>(false);
  const [selectedFocusSound, setSelectedFocusSound] = useState<FocusSoundType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkFlipTimer_focusSound') as FocusSoundType | null;
      if (saved && (saved === 'brown' || saved === 'rain' || saved === 'alpha' || saved === 'pink')) {
        return saved;
      }
    }
    return 'rain';
  });
  const [isFocusMusicPlaying, setIsFocusMusicPlaying] = useState<boolean>(false);
  const [focusMusicVolume, setFocusMusicVolume] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkFlipTimer_focusVolume');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 0.6;
  });
  const [autoPlayMusicWithTimer, setAutoPlayMusicWithTimer] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkFlipTimer_focusAutoPlay') === 'true';
    }
    return false;
  });

  // Dual Mode: Countdown Timer vs Stopwatch (Count-up)
  const [appMode, setAppMode] = useState<AppMode>('timer');

  // Stopwatch Mode States
  const [stopwatchElapsedSeconds, setStopwatchElapsedSeconds] = useState<number>(0);
  const [stopwatchStatus, setStopwatchStatus] = useState<TimerStatus>('idle');
  const [stopwatchLaps, setStopwatchLaps] = useState<StopwatchLap[]>([]);
  const [stopwatchTargetMinutes, setStopwatchTargetMinutes] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkFlipTimer_swTarget');
      if (saved) {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? null : parsed;
      }
    }
    return null;
  });
  const [stopwatchTargetReached, setStopwatchTargetReached] = useState<boolean>(false);
  const [showLapsDrawer, setShowLapsDrawer] = useState<boolean>(false);

  // Notification System & Software Update States
  const [notificationCenterOpen, setNotificationCenterOpen] = useState<boolean>(false);
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [osNotificationsEnabled, setOsNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkFlipTimer_osNotif') !== 'false';
    }
    return true;
  });
  const [checkUpdatesOnStartup, setCheckUpdatesOnStartup] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkFlipTimer_checkUpdates') !== 'false';
    }
    return true;
  });
  const [inAppAlert, setInAppAlert] = useState<{
    title: string;
    message: string;
    type: 'timer' | 'stopwatch' | 'update';
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Absolute wall-clock target timestamp for drift-free countdown
  const targetEndTimeMsRef = useRef<number | null>(null);
  const lastDisplayedSecondRef = useRef<number>(DEFAULT_DURATION_SECONDS);
  const idleControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Absolute wall-clock refs for drift-free stopwatch count-up
  const stopwatchStartMsRef = useRef<number | null>(null);
  const stopwatchAccumulatedMsRef = useRef<number>(0);
  const lastStopwatchDisplayedSecondRef = useRef<number>(0);

  const isElectron = isRunningInElectron();

  // Wake fullscreen controls on user interaction
  const wakeControls = useCallback(() => {
    setControlsVisible(true);
    if (idleControlsTimeoutRef.current) {
      clearTimeout(idleControlsTimeoutRef.current);
    }
    if (isFullscreen) {
      idleControlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, FULLSCREEN_IDLE_HIDE_MS);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      if (idleControlsTimeoutRef.current) {
        clearTimeout(idleControlsTimeoutRef.current);
      }
      return;
    }
    wakeControls();
    return () => {
      if (idleControlsTimeoutRef.current) {
        clearTimeout(idleControlsTimeoutRef.current);
      }
    };
  }, [isFullscreen, wakeControls]);

  // Stop repeating alarm when leaving completed state
  useEffect(() => {
    if (status !== 'completed' && alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  }, [status]);

  // Synchronize running state with Electron powerSaveBlocker and document title
  useEffect(() => {
    let title = 'Dark Flip Timer';
    if (appMode === 'timer') {
      const formatted = formatReadableTime(remainingSeconds);
      if (status === 'running') {
        title = `${formatted} — Dark Flip Timer`;
      } else if (status === 'paused') {
        title = `${formatted} (Paused) — Dark Flip Timer`;
      } else if (status === 'completed') {
        title = `00:00:00 Time Up — Dark Flip Timer`;
      }
    } else {
      const formatted = formatReadableTime(stopwatchElapsedSeconds);
      if (stopwatchStatus === 'running') {
        title = `${formatted} [Stopwatch] — Dark Flip Timer`;
      } else if (stopwatchStatus === 'paused') {
        title = `${formatted} (Paused) — Dark Flip Timer`;
      } else {
        title = 'Stopwatch — Dark Flip Timer';
      }
    }

    document.title = title;

    const isRunning =
      (appMode === 'timer' && status === 'running') ||
      (appMode === 'stopwatch' && stopwatchStatus === 'running');

    if (window.electronAPI?.setTimerRunningState) {
      window.electronAPI.setTimerRunningState(isRunning).catch(() => {});
    }
  }, [appMode, remainingSeconds, status, stopwatchElapsedSeconds, stopwatchStatus]);

  // Drift-free wall-clock countdown loop
  const syncRemainingFromClock = useCallback(() => {
    if (status !== 'running' || targetEndTimeMsRef.current === null) return;

    const result = calculateRemainingFromTarget(
      targetEndTimeMsRef.current,
      Date.now()
    );

    if (result.remainingSeconds !== lastDisplayedSecondRef.current) {
      lastDisplayedSecondRef.current = result.remainingSeconds;
      setRemainingSeconds(result.remainingSeconds);
      if (result.remainingSeconds > 0) {
        soundEngine.playFlipTick(soundEnabled && tickSoundEnabled);
      }
    }

    if (result.isCompleted) {
      targetEndTimeMsRef.current = null;
      setRemainingSeconds(0);
      setStatus('completed');
      setControlsVisible(true);
      soundEngine.playCompletionAlarm(soundEnabled);

      if (osNotificationsEnabled) {
        sendDesktopNotification(
          'Countdown Finished — Dark Flip Timer',
          `Your ${formatReadableTime(initialDurationSeconds)} timer has completed.`
        );
      }

      setInAppAlert({
        title: 'Countdown Finished',
        message: `Your ${formatReadableTime(initialDurationSeconds)} countdown reached 00:00:00.`,
        type: 'timer',
      });

      if (soundEnabled) {
        alarmIntervalRef.current = setInterval(() => {
          soundEngine.playCompletionAlarm(true);
        }, 3200);
      }
      if (autoPlayMusicWithTimer && isFocusMusicPlaying) {
        focusAudio.stop();
        setIsFocusMusicPlaying(false);
      }
    }
  }, [
    autoPlayMusicWithTimer,
    initialDurationSeconds,
    isFocusMusicPlaying,
    osNotificationsEnabled,
    soundEnabled,
    status,
    tickSoundEnabled,
  ]);

  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(syncRemainingFromClock, 50);
    const handleVisibilityOrFocus = () => syncRemainingFromClock();

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [status, syncRemainingFromClock]);

  // Drift-free wall-clock stopwatch count-up loop
  const syncStopwatchFromClock = useCallback(() => {
    if (stopwatchStatus !== 'running' || stopwatchStartMsRef.current === null) return;

    const { elapsedSeconds } = calculateStopwatchElapsed(
      stopwatchStartMsRef.current,
      stopwatchAccumulatedMsRef.current,
      Date.now()
    );

    if (elapsedSeconds !== lastStopwatchDisplayedSecondRef.current) {
      lastStopwatchDisplayedSecondRef.current = elapsedSeconds;
      setStopwatchElapsedSeconds(elapsedSeconds);
      soundEngine.playFlipTick(soundEnabled && tickSoundEnabled);

      // Check target alert
      if (
        stopwatchTargetMinutes !== null &&
        elapsedSeconds >= stopwatchTargetMinutes * 60 &&
        !stopwatchTargetReached
      ) {
        setStopwatchTargetReached(true);
        soundEngine.playCompletionAlarm(soundEnabled);
        if (osNotificationsEnabled) {
          sendDesktopNotification(
            'Stopwatch Target Reached',
            `Stopwatch elapsed ${stopwatchTargetMinutes} minutes.`
          );
        }
        setInAppAlert({
          title: 'Target Time Reached',
          message: `Stopwatch reached target duration of ${stopwatchTargetMinutes}m.`,
          type: 'stopwatch',
        });
      }
    }
  }, [
    osNotificationsEnabled,
    soundEnabled,
    stopwatchStatus,
    stopwatchTargetMinutes,
    stopwatchTargetReached,
    tickSoundEnabled,
  ]);

  useEffect(() => {
    if (stopwatchStatus !== 'running') return;

    const interval = setInterval(syncStopwatchFromClock, 50);
    const handleVisibilityOrFocus = () => syncStopwatchFromClock();

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [stopwatchStatus, syncStopwatchFromClock]);

  // Background update check on startup & manual check handler
  const checkUpdates = useCallback(
    async (isManual: boolean = false) => {
      setIsCheckingUpdate(true);
      try {
        const info = await checkForAppUpdates('1.1.0', isManual);
        setUpdateInfo(info);
        if (info.hasUpdate) {
          if (isManual) {
            setUpdateModalOpen(true);
          } else if (osNotificationsEnabled) {
            sendDesktopNotification(
              'Software Update Available',
              `Dark Flip Timer ${info.latestVersion} by TanCreative is now available to download.`,
              true
            );
          }
        }
      } catch {
        // Ignore
      } finally {
        setIsCheckingUpdate(false);
      }
    },
    [osNotificationsEnabled]
  );

  useEffect(() => {
    if (!checkUpdatesOnStartup) return;
    const timeout = setTimeout(() => {
      checkUpdates(false);
    }, 2400);
    return () => clearTimeout(timeout);
  }, [checkUpdates, checkUpdatesOnStartup]);

  // Listen to native fullscreen changes (Electron IPC + Browser Fullscreen API)
  useEffect(() => {
    const handleBrowserFullscreenChange = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
      }
    };
    document.addEventListener('fullscreenchange', handleBrowserFullscreenChange);

    let unsubscribeElectron: (() => void) | undefined;
    if (window.electronAPI?.onFullscreenChanged) {
      unsubscribeElectron = window.electronAPI.onFullscreenChanged((fsState) => {
        setIsFullscreen(fsState);
      });
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleBrowserFullscreenChange);
      if (unsubscribeElectron) unsubscribeElectron();
    };
  }, []);

  // Focus Music Action Handlers
  const handleToggleFocusMusicPlay = useCallback(() => {
    if (isFocusMusicPlaying) {
      focusAudio.stop();
      setIsFocusMusicPlaying(false);
    } else {
      focusAudio.play(selectedFocusSound, focusMusicVolume);
      setIsFocusMusicPlaying(true);
    }
  }, [focusMusicVolume, isFocusMusicPlaying, selectedFocusSound]);

  const handleSelectFocusSound = useCallback(
    (sound: FocusSoundType) => {
      setSelectedFocusSound(sound);
      try {
        localStorage.setItem('darkFlipTimer_focusSound', sound);
      } catch {}
      if (isFocusMusicPlaying) {
        focusAudio.play(sound, focusMusicVolume);
      }
    },
    [focusMusicVolume, isFocusMusicPlaying]
  );

  const handleStopFocusMusic = useCallback(() => {
    focusAudio.stop();
    setIsFocusMusicPlaying(false);
  }, []);

  const handleChangeFocusVolume = useCallback((vol: number) => {
    setFocusMusicVolume(vol);
    focusAudio.setVolume(vol);
    try {
      localStorage.setItem('darkFlipTimer_focusVolume', vol.toString());
    } catch {}
  }, []);

  const handleToggleAutoPlayMusic = useCallback(() => {
    setAutoPlayMusicWithTimer((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('darkFlipTimer_focusAutoPlay', next.toString());
      } catch {}
      return next;
    });
  }, []);

  // Timer Action Handlers
  const handleStartOrResume = useCallback(() => {
    let baseSeconds = remainingSeconds;
    if (status === 'completed' || baseSeconds <= 0) {
      baseSeconds = initialDurationSeconds > 0 ? initialDurationSeconds : DEFAULT_DURATION_SECONDS;
      setRemainingSeconds(baseSeconds);
      if (initialDurationSeconds <= 0) {
        setInitialDurationSeconds(baseSeconds);
      }
    }
    targetEndTimeMsRef.current = Date.now() + baseSeconds * 1000;
    // Immediately flip into the first countdown second (e.g. 25:00 -> 24:59) so the mechanical flap drops right on click
    const firstTickSeconds = Math.max(0, baseSeconds - 1);
    if (baseSeconds > 1) {
      lastDisplayedSecondRef.current = firstTickSeconds;
      setRemainingSeconds(firstTickSeconds);
      targetEndTimeMsRef.current = Date.now() + firstTickSeconds * 1000;
      soundEngine.playFlipTick(soundEnabled && tickSoundEnabled);
    } else {
      lastDisplayedSecondRef.current = baseSeconds;
    }
    if (autoPlayMusicWithTimer && !isFocusMusicPlaying) {
      focusAudio.play(selectedFocusSound, focusMusicVolume);
      setIsFocusMusicPlaying(true);
    }
    setStatus('running');
  }, [
    autoPlayMusicWithTimer,
    focusMusicVolume,
    initialDurationSeconds,
    isFocusMusicPlaying,
    remainingSeconds,
    selectedFocusSound,
    soundEnabled,
    status,
    tickSoundEnabled,
  ]);

  const handlePause = useCallback(() => {
    if (status !== 'running') return;
    if (targetEndTimeMsRef.current !== null) {
      const { remainingSeconds: synced } = calculateRemainingFromTarget(
        targetEndTimeMsRef.current,
        Date.now()
      );
      setRemainingSeconds(synced);
      lastDisplayedSecondRef.current = synced;
    }
    targetEndTimeMsRef.current = null;
    if (autoPlayMusicWithTimer && isFocusMusicPlaying) {
      focusAudio.stop();
      setIsFocusMusicPlaying(false);
    }
    setStatus('paused');
  }, [autoPlayMusicWithTimer, isFocusMusicPlaying, status]);

  const handleTogglePlayPause = useCallback(() => {
    if (status === 'running') {
      handlePause();
    } else {
      handleStartOrResume();
    }
  }, [handlePause, handleStartOrResume, status]);

  const handleReset = useCallback(() => {
    targetEndTimeMsRef.current = null;
    const resetTarget = initialDurationSeconds > 0 ? initialDurationSeconds : DEFAULT_DURATION_SECONDS;
    lastDisplayedSecondRef.current = resetTarget;
    setRemainingSeconds(resetTarget);
    if (autoPlayMusicWithTimer && isFocusMusicPlaying) {
      focusAudio.stop();
      setIsFocusMusicPlaying(false);
    }
    setStatus('idle');
  }, [autoPlayMusicWithTimer, initialDurationSeconds, isFocusMusicPlaying]);

  const handleSelectPreset = useCallback((minutes: number) => {
    targetEndTimeMsRef.current = null;
    const secs = presetMinutesToSeconds(minutes);
    lastDisplayedSecondRef.current = secs;
    setInitialDurationSeconds(secs);
    setRemainingSeconds(secs);
    setActivePresetMinutes(minutes);
    setStatus('idle');
  }, []);

  const handleStepUnit = useCallback(
    (unit: TimeUnitKey, delta: number) => {
      if (status === 'running') return;
      const nextTotal = stepUnitValue(remainingSeconds, unit, delta);
      lastDisplayedSecondRef.current = nextTotal;
      setRemainingSeconds(nextTotal);
      setInitialDurationSeconds(nextTotal);
      setActivePresetMinutes(null);
      setStatus('idle');
    },
    [remainingSeconds, status]
  );

  const handleCommitUnitInput = useCallback(
    (unit: TimeUnitKey, rawValue: string) => {
      if (status === 'running') return;
      const nextTotal = updateSingleUnit(remainingSeconds, unit, rawValue);
      lastDisplayedSecondRef.current = nextTotal;
      setRemainingSeconds(nextTotal);
      setInitialDurationSeconds(nextTotal);
      setActivePresetMinutes(null);
      setStatus('idle');
    },
    [remainingSeconds, status]
  );

  const handleAddOneMinute = useCallback(() => {
    const nextRemaining = Math.min(99 * 3600 + 3599, remainingSeconds + 60);
    lastDisplayedSecondRef.current = nextRemaining;
    setRemainingSeconds(nextRemaining);
    if (status === 'running' && targetEndTimeMsRef.current !== null) {
      targetEndTimeMsRef.current += 60 * 1000;
      setInitialDurationSeconds((prev) => Math.max(prev + 60, nextRemaining));
    } else {
      setInitialDurationSeconds(nextRemaining);
      setActivePresetMinutes(null);
      if (status === 'completed') setStatus('idle');
    }
  }, [remainingSeconds, status]);

  // Stopwatch Action Handlers
  const handleStartOrResumeStopwatch = useCallback(() => {
    stopwatchStartMsRef.current = Date.now();
    setStopwatchStatus('running');
    if (autoPlayMusicWithTimer && !isFocusMusicPlaying) {
      focusAudio.play(selectedFocusSound, focusMusicVolume);
      setIsFocusMusicPlaying(true);
    }
  }, [autoPlayMusicWithTimer, focusMusicVolume, isFocusMusicPlaying, selectedFocusSound]);

  const handlePauseStopwatch = useCallback(() => {
    if (stopwatchStatus !== 'running') return;
    if (stopwatchStartMsRef.current !== null) {
      stopwatchAccumulatedMsRef.current += Date.now() - stopwatchStartMsRef.current;
      stopwatchStartMsRef.current = null;
    }
    setStopwatchStatus('paused');
    if (autoPlayMusicWithTimer && isFocusMusicPlaying) {
      focusAudio.stop();
      setIsFocusMusicPlaying(false);
    }
  }, [autoPlayMusicWithTimer, isFocusMusicPlaying, stopwatchStatus]);

  const handleResetStopwatch = useCallback(() => {
    stopwatchStartMsRef.current = null;
    stopwatchAccumulatedMsRef.current = 0;
    lastStopwatchDisplayedSecondRef.current = 0;
    setStopwatchElapsedSeconds(0);
    setStopwatchStatus('idle');
    setStopwatchTargetReached(false);
    setStopwatchLaps([]);
    if (autoPlayMusicWithTimer && isFocusMusicPlaying) {
      focusAudio.stop();
      setIsFocusMusicPlaying(false);
    }
  }, [autoPlayMusicWithTimer, isFocusMusicPlaying]);

  const handleToggleStopwatch = useCallback(() => {
    if (stopwatchStatus === 'running') {
      handlePauseStopwatch();
    } else {
      handleStartOrResumeStopwatch();
    }
  }, [handlePauseStopwatch, handleStartOrResumeStopwatch, stopwatchStatus]);

  const handleRecordLap = useCallback(() => {
    if (stopwatchStatus !== 'running' && stopwatchStatus !== 'paused') return;
    const currentTotal = stopwatchElapsedSeconds;
    const previousTotal = stopwatchLaps.length > 0 ? stopwatchLaps[0].totalTimeSeconds : 0;
    const lapTime = Math.max(0, currentTotal - previousTotal);

    const newLap: StopwatchLap = {
      id: stopwatchLaps.length + 1,
      lapTimeSeconds: lapTime,
      totalTimeSeconds: currentTotal,
      formattedLap: formatReadableTime(lapTime),
      formattedTotal: formatReadableTime(currentTotal),
    };

    setStopwatchLaps((prev) => [newLap, ...prev]);
    setShowLapsDrawer(true);
  }, [stopwatchElapsedSeconds, stopwatchLaps, stopwatchStatus]);

  const handleChangeStopwatchTarget = useCallback((minutes: number | null) => {
    setStopwatchTargetMinutes(minutes);
    setStopwatchTargetReached(false);
    try {
      if (minutes === null) {
        localStorage.removeItem('darkFlipTimer_swTarget');
      } else {
        localStorage.setItem('darkFlipTimer_swTarget', minutes.toString());
      }
    } catch {}
  }, []);

  const handleToggleOsNotifications = useCallback(() => {
    setOsNotificationsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('darkFlipTimer_osNotif', next.toString());
      } catch {}
      return next;
    });
  }, []);

  const handleToggleCheckUpdatesOnStartup = useCallback(() => {
    setCheckUpdatesOnStartup((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('darkFlipTimer_checkUpdates', next.toString());
      } catch {}
      return next;
    });
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const nextState = !isFullscreen;
    setIsFullscreen(nextState);
    await requestDesktopOrBrowserFullscreen(nextState);
  }, [isFullscreen]);

  const handleExitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    await requestDesktopOrBrowserFullscreen(false);
  }, []);

  const handleToggleAlwaysOnTop = useCallback(async () => {
    if (window.electronAPI?.toggleAlwaysOnTop) {
      const next = await window.electronAPI.toggleAlwaysOnTop();
      setIsAlwaysOnTop(next);
    } else {
      setIsAlwaysOnTop((prev) => !prev);
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      wakeControls();

      // Do not intercept keys when typing inside an input
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (inAppAlert) {
          setInAppAlert(null);
          return;
        }
        if (updateModalOpen) {
          setUpdateModalOpen(false);
          return;
        }
        if (notificationCenterOpen) {
          setNotificationCenterOpen(false);
          return;
        }
        if (focusMusicModalOpen) {
          setFocusMusicModalOpen(false);
          return;
        }
        if (infoModalOpen) {
          setInfoModalOpen(false);
          return;
        }
        if (isFullscreen) {
          e.preventDefault();
          handleExitFullscreen();
          return;
        }
      }

      if (
        infoModalOpen ||
        focusMusicModalOpen ||
        notificationCenterOpen ||
        updateModalOpen
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (appMode === 'timer') {
          handleTogglePlayPause();
        } else {
          handleToggleStopwatch();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (appMode === 'timer') {
          handleReset();
        } else {
          handleResetStopwatch();
        }
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setAppMode('timer');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setAppMode('stopwatch');
      } else if (e.key === 'l' || e.key === 'L') {
        if (appMode === 'stopwatch') {
          e.preventDefault();
          handleRecordLap();
        }
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setNotificationCenterOpen(true);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleToggleFocusMusicPlay();
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setSoundEnabled((prev) => !prev);
      } else if (
        appMode === 'timer' &&
        e.key >= '1' &&
        e.key <= '8' &&
        status !== 'running'
      ) {
        const idx = parseInt(e.key, 10) - 1;
        if (QUICK_PRESETS[idx]) {
          e.preventDefault();
          handleSelectPreset(QUICK_PRESETS[idx].minutes);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    appMode,
    focusMusicModalOpen,
    handleExitFullscreen,
    handleRecordLap,
    handleReset,
    handleResetStopwatch,
    handleSelectPreset,
    handleToggleFocusMusicPlay,
    handleToggleFullscreen,
    handleTogglePlayPause,
    handleToggleStopwatch,
    inAppAlert,
    infoModalOpen,
    isFullscreen,
    notificationCenterOpen,
    status,
    updateModalOpen,
    wakeControls,
  ]);

  const isTimerMode = appMode === 'timer';
  const displaySeconds = isTimerMode ? remainingSeconds : stopwatchElapsedSeconds;
  const { hours, minutes, seconds } = secondsToTimeParts(displaySeconds);
  const isEditable = isTimerMode && (status === 'idle' || status === 'paused');

  const progressPercent = isTimerMode
    ? calculateProgressPercent(initialDurationSeconds, remainingSeconds)
    : stopwatchTargetMinutes
    ? Math.min(100, (stopwatchElapsedSeconds / (stopwatchTargetMinutes * 60)) * 100)
    : 0;

  const currentDisplayStatus = isTimerMode ? status : stopwatchStatus;

  const statusLabel = isTimerMode
    ? status === 'running'
      ? 'Counting Down'
      : status === 'paused'
      ? 'Paused'
      : status === 'completed'
      ? 'Time Up — Countdown Finished'
      : 'Ready'
    : stopwatchStatus === 'running'
    ? 'Stopwatch Active'
    : stopwatchStatus === 'paused'
    ? 'Stopwatch Paused'
    : 'Stopwatch Ready';

  const chromeVisibilityClass =
    isFullscreen && !controlsVisible
      ? 'opacity-0 pointer-events-none'
      : 'opacity-100';

  return (
    <div
      data-state={status}
      data-fullscreen={isFullscreen ? 'true' : 'false'}
      onMouseMove={wakeControls}
      onClick={wakeControls}
      className="relative w-screen h-screen bg-[#08080A] text-[#F4F4F6] flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Top Bar Contract: 3 Zones (Brand Wordmark & Mode Switcher — Preset Controls — Primary Action) */}
      <header
        className={`app-drag-region flex items-center justify-between gap-6 px-6 py-3.5 border-b border-[#191920] bg-[#0B0B0E] transition-opacity duration-200 z-30 ${chromeVisibilityClass}`}
      >
        {/* Zone 1: Single-line Brand Title & Dual Mode Switcher */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="./icon.svg"
              alt="Dark Flip Timer logo"
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-md"
            />
            <span
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-base font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0"
            >
              Dark Flip Timer
            </span>
          </div>

          {/* Mode Switcher: Timer vs Stopwatch */}
          <div className="app-no-drag inline-flex items-center p-0.5 rounded-lg bg-[#121217] border border-[#22222B]">
            <button
              type="button"
              onClick={() => setAppMode('timer')}
              aria-label="Switch to Countdown Timer mode (T)"
              title="Countdown Timer (T)"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                isTimerMode
                  ? 'bg-[#252530] text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timer</span>
            </button>
            <button
              type="button"
              onClick={() => setAppMode('stopwatch')}
              aria-label="Switch to Stopwatch mode (S)"
              title="Stopwatch Count-up (S)"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                !isTimerMode
                  ? 'bg-[#252530] text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Stopwatch</span>
            </button>
          </div>
        </div>

        {/* Zone 2: Contextual Presets / Target Alert Controls */}
        {isTimerMode ? (
          <nav
            aria-label="Timer quick presets"
            className="app-no-drag hidden md:flex items-center gap-1 p-1 rounded-lg bg-[#121217] border border-[#22222B]"
          >
            {QUICK_PRESETS.map((preset) => {
              const isSelected =
                activePresetMinutes === preset.minutes &&
                initialDurationSeconds === preset.minutes * 60;
              return (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => handleSelectPreset(preset.minutes)}
                  aria-label={`Preset ${preset.minutes} minutes`}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-[#252530] text-zinc-100 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#191921]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </nav>
        ) : (
          <nav
            aria-label="Stopwatch target alert duration"
            className="app-no-drag hidden md:flex items-center gap-1 p-1 rounded-lg bg-[#121217] border border-[#22222B]"
          >
            <span className="px-2 text-[11px] font-semibold tracking-wider uppercase text-zinc-500">
              Target:
            </span>
            {[
              { val: null, label: 'Off' },
              { val: 15, label: '15m' },
              { val: 25, label: '25m' },
              { val: 30, label: '30m' },
              { val: 45, label: '45m' },
              { val: 60, label: '60m' },
            ].map((opt) => {
              const isSelected = stopwatchTargetMinutes === opt.val;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleChangeStopwatchTarget(opt.val)}
                  title={opt.val ? `Alert when stopwatch reaches ${opt.val}m` : 'No target alert'}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-[#252530] text-amber-300 font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#191921]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Zone 3: Actions & Window Controls */}
        <div className="app-no-drag flex items-center gap-2 shrink-0">
          {/* Software Update Alert Pill */}
          {updateInfo?.hasUpdate && (
            <button
              type="button"
              onClick={() => setUpdateModalOpen(true)}
              aria-label={`Update ${updateInfo.latestVersion} available`}
              title={`Download Dark Flip Timer ${updateInfo.latestVersion}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition-all cursor-pointer shadow-xs animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Update {updateInfo.latestVersion}</span>
              <span className="sm:hidden">Update</span>
            </button>
          )}

          {/* Notification Center Trigger */}
          <button
            type="button"
            onClick={() => setNotificationCenterOpen(true)}
            aria-label="Notification center and alerts"
            title="Notification Center & Alerts (N)"
            className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#17171E] transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {(osNotificationsEnabled || updateInfo?.hasUpdate) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0B0B0E]" />
            )}
          </button>

          {/* Concentration Music & Sound Masking Trigger */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFocusMusicModalOpen(true)}
              aria-label="Concentration music & noise masking options"
              title="Concentration Music & Sound Masking (C)"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                isFocusMusicPlaying
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/40 shadow-xs'
                  : 'bg-[#14141B] border-[#252532] text-zinc-400 hover:text-zinc-200 hover:bg-[#1A1A24]'
              }`}
            >
              <Headphones
                className={`w-3.5 h-3.5 ${
                  isFocusMusicPlaying ? 'text-amber-400 animate-pulse' : 'text-zinc-400'
                }`}
              />
              <span className="hidden sm:inline">
                {isFocusMusicPlaying
                  ? `${
                      FOCUS_SOUND_OPTIONS.find((s) => s.id === selectedFocusSound)?.name ||
                      'Sound'
                    }`
                  : 'Focus Sound'}
              </span>
              {isFocusMusicPlaying && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </button>

            {/* Quick 1-Click Fast Stop Button when music is playing */}
            {isFocusMusicPlaying && (
              <button
                type="button"
                onClick={handleStopFocusMusic}
                aria-label="Stop concentration audio"
                title="Stop Background Sound (OFF)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-600/90 hover:bg-red-600 text-white transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Power className="w-3 h-3" />
                <span>OFF</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            aria-label={soundEnabled ? 'Mute alarm sound' : 'Unmute alarm sound'}
            title={soundEnabled ? 'Alarm sound enabled (M)' : 'Alarm sound muted (M)'}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#17171E] transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-zinc-200" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleAlwaysOnTop}
            aria-label={isAlwaysOnTop ? 'Disable pin on top' : 'Pin window on top'}
            title="Pin window always on top"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isAlwaysOnTop
                ? 'text-amber-400 bg-[#1B1B24]'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#17171E]'
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setInfoModalOpen(true)}
            aria-label="Keyboard shortcuts and Windows desktop build info"
            title="Shortcuts & Windows Build Info"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#17171E] transition-colors cursor-pointer"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-100 bg-[#1B1B24] hover:bg-[#262632] border border-[#2E2E3C] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Fullscreen</span>
              </>
            )}
          </button>

          {/* Native Windows Window Controls when running inside frameless Electron */}
          {isElectron && (
            <div className="flex items-center ml-2 pl-2 border-l border-[#22222B]">
              <button
                type="button"
                onClick={() => window.electronAPI?.minimizeWindow()}
                aria-label="Minimize window"
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-[#1B1B22]"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => window.electronAPI?.maximizeOrRestoreWindow()}
                aria-label="Maximize window"
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-[#1B1B22]"
              >
                <Square className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => window.electronAPI?.closeWindow()}
                aria-label="Close application"
                className="p-2 text-zinc-400 hover:text-white hover:bg-red-600/90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Center Main Split-Flap Clock Stage */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 relative">
        {/* Floating In-App Alert Banner */}
        {inAppAlert && (
          <div
            role="alert"
            aria-live="assertive"
            className="absolute top-4 max-w-md w-[90%] mx-auto z-40 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#14141C] border border-[#2B2B3C] shadow-2xl text-zinc-100 animate-fade-in"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1.5 rounded-lg ${
                  inAppAlert.type === 'timer'
                    ? 'bg-amber-500/20 text-amber-400'
                    : inAppAlert.type === 'stopwatch'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}
              >
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-100">{inAppAlert.title}</p>
                <p className="text-[11px] text-zinc-400">{inAppAlert.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {inAppAlert.actionLabel && inAppAlert.onAction && (
                <button
                  type="button"
                  onClick={inAppAlert.onAction}
                  className="px-2.5 py-1 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {inAppAlert.actionLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => setInAppAlert(null)}
                aria-label="Dismiss alert"
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-[#1E1E28] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Compact Preset Bar for smaller viewports */}
        <div
          className={`flex md:hidden items-center justify-center flex-wrap gap-1 mb-5 transition-opacity duration-200 ${chromeVisibilityClass}`}
        >
          {isTimerMode
            ? QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => handleSelectPreset(preset.minutes)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                    activePresetMinutes === preset.minutes
                      ? 'bg-[#252530] text-zinc-100'
                      : 'bg-[#121217] text-zinc-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))
            : [
                { val: null, label: 'Off' },
                { val: 15, label: '15m' },
                { val: 25, label: '25m' },
                { val: 30, label: '30m' },
                { val: 45, label: '45m' },
                { val: 60, label: '60m' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleChangeStopwatchTarget(opt.val)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap shrink-0 ${
                    stopwatchTargetMinutes === opt.val
                      ? 'bg-[#252530] text-amber-300 font-semibold'
                      : 'bg-[#121217] text-zinc-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
        </div>

        {/* Unboxed Metadata Status Strip (Zero-Pill Discipline) */}
        <div
          className={`flex items-center gap-2 text-xs text-zinc-400 mb-6 transition-opacity duration-200 ${chromeVisibilityClass}`}
        >
          <span
            className={
              isTimerMode
                ? status === 'completed'
                  ? 'text-amber-400 font-semibold'
                  : status === 'running'
                  ? 'text-zinc-200 font-medium'
                  : 'text-zinc-400'
                : stopwatchTargetReached
                ? 'text-amber-400 font-semibold'
                : stopwatchStatus === 'running'
                ? 'text-emerald-400 font-medium'
                : 'text-zinc-400'
            }
          >
            {statusLabel}
          </span>
          <span aria-hidden="true">·</span>
          {isTimerMode ? (
            <>
              <span style={{ fontFamily: 'var(--font-mono)' }} className="tabular-nums">
                Set {formatReadableTime(initialDurationSeconds)}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {isEditable
                  ? 'Click any card or use arrows to edit time'
                  : `${Math.round(progressPercent)}% elapsed`}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-mono)' }} className="tabular-nums">
                Target: {stopwatchTargetMinutes ? `${stopwatchTargetMinutes} min` : 'None'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{stopwatchLaps.length} Laps recorded</span>
            </>
          )}
        </div>

        {/* Split-Flap Assembly (Hours : Minutes : Seconds) */}
        <div
          role={isTimerMode ? 'timer' : 'region'}
          aria-label={
            isTimerMode
              ? `Countdown timer ${formatReadableTime(remainingSeconds)}`
              : `Stopwatch ${formatReadableTime(stopwatchElapsedSeconds)}`
          }
          data-testid="flip-clock-display"
          className="flex items-center justify-center gap-3 sm:gap-5 md:gap-7"
        >
          <FlipUnitCard
            unit="hours"
            label="Hours"
            value={hours}
            isEditable={isEditable}
            isFullscreen={isFullscreen}
            controlsVisible={controlsVisible}
            isCompleted={isTimerMode ? status === 'completed' : stopwatchTargetReached}
            onStepUnit={handleStepUnit}
            onCommitUnitInput={handleCommitUnitInput}
          />

          {/* Colon Separator */}
          <div
            aria-hidden="true"
            className="flex flex-col items-center justify-center gap-4 pt-6"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                (isTimerMode && status === 'completed') || (!isTimerMode && stopwatchTargetReached)
                  ? 'bg-amber-400'
                  : currentDisplayStatus === 'running'
                  ? 'bg-zinc-400'
                  : 'bg-zinc-700'
              }`}
            />
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                (isTimerMode && status === 'completed') || (!isTimerMode && stopwatchTargetReached)
                  ? 'bg-amber-400'
                  : currentDisplayStatus === 'running'
                  ? 'bg-zinc-400'
                  : 'bg-zinc-700'
              }`}
            />
          </div>

          <FlipUnitCard
            unit="minutes"
            label="Minutes"
            value={minutes}
            isEditable={isEditable}
            isFullscreen={isFullscreen}
            controlsVisible={controlsVisible}
            isCompleted={isTimerMode ? status === 'completed' : stopwatchTargetReached}
            onStepUnit={handleStepUnit}
            onCommitUnitInput={handleCommitUnitInput}
          />

          {/* Colon Separator */}
          <div
            aria-hidden="true"
            className="flex flex-col items-center justify-center gap-4 pt-6"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                (isTimerMode && status === 'completed') || (!isTimerMode && stopwatchTargetReached)
                  ? 'bg-amber-400'
                  : currentDisplayStatus === 'running'
                  ? 'bg-zinc-400'
                  : 'bg-zinc-700'
              }`}
            />
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                (isTimerMode && status === 'completed') || (!isTimerMode && stopwatchTargetReached)
                  ? 'bg-amber-400'
                  : currentDisplayStatus === 'running'
                  ? 'bg-zinc-400'
                  : 'bg-zinc-700'
              }`}
            />
          </div>

          <FlipUnitCard
            unit="seconds"
            label="Seconds"
            value={seconds}
            isEditable={isEditable}
            isFullscreen={isFullscreen}
            controlsVisible={controlsVisible}
            isCompleted={isTimerMode ? status === 'completed' : stopwatchTargetReached}
            onStepUnit={handleStepUnit}
            onCommitUnitInput={handleCommitUnitInput}
          />
        </div>

        {/* Subtle Linear Progress Track */}
        <div
          className={`w-full max-w-3xl mt-8 px-4 transition-opacity duration-200 ${chromeVisibilityClass}`}
        >
          <div className="w-full h-1 bg-[#15151C] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                (isTimerMode && status === 'completed') || (!isTimerMode && stopwatchTargetReached)
                  ? 'bg-amber-400'
                  : 'bg-zinc-300'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stopwatch Recorded Laps Panel */}
        {!isTimerMode && stopwatchLaps.length > 0 && showLapsDrawer && (
          <div className="w-full max-w-lg mt-6 p-4 rounded-xl bg-[#0F0F14] border border-[#20202B] max-h-48 flex flex-col transition-all animate-fade-in shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A1A24] text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200">
                Recorded Laps ({stopwatchLaps.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStopwatchLaps([])}
                  className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLapsDrawer(false)}
                  className="text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer p-0.5"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto space-y-1.5 pr-1 text-xs">
              {stopwatchLaps.map((lap) => (
                <div
                  key={lap.id}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#14141B] border border-[#1A1A24]"
                >
                  <span className="font-medium text-zinc-400">Lap {lap.id}</span>
                  <span
                    style={{ fontFamily: 'var(--font-mono)' }}
                    className="font-semibold text-amber-300 tabular-nums"
                  >
                    +{lap.formattedLap}
                  </span>
                  <span
                    style={{ fontFamily: 'var(--font-mono)' }}
                    className="text-zinc-400 tabular-nums"
                  >
                    {lap.formattedTotal}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Alert Banner when Countdown Reaches 00:00:00 */}
        {isTimerMode && status === 'completed' && (
          <div
            role="status"
            aria-live="assertive"
            className="mt-6 flex items-center gap-4 px-5 py-3 rounded-xl bg-[#19150E] border border-amber-500/50 text-amber-200"
          >
            <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm font-medium">
              Countdown reached 00:00:00
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Dismiss & Reset
            </button>
          </div>
        )}

        {/* Target Alert Banner when Stopwatch Reaches Target Duration */}
        {!isTimerMode && stopwatchTargetReached && (
          <div
            role="status"
            aria-live="assertive"
            className="mt-6 flex items-center gap-4 px-5 py-3 rounded-xl bg-[#19150E] border border-amber-500/50 text-amber-200"
          >
            <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm font-medium">
              Target reached ({stopwatchTargetMinutes}m)
            </span>
            <button
              type="button"
              onClick={() => setStopwatchTargetReached(false)}
              className="px-3 py-1 text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Acknowledge
            </button>
          </div>
        )}
      </main>

      {/* Bottom Primary Control Bar */}
      <footer
        className={`flex items-center justify-between gap-4 px-6 py-4 border-t border-[#18181F] bg-[#0B0B0E] transition-opacity duration-200 z-30 ${chromeVisibilityClass}`}
      >
        {/* Left: Mechanical Flip Tick Audio Option & Shortcuts Info */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400">
          <button
            type="button"
            onClick={() => setTickSoundEnabled((prev) => !prev)}
            className="hover:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Mechanical Sound: {tickSoundEnabled ? 'On' : 'Off'}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setFocusMusicModalOpen(true)}
            className="hover:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span>Focus Music:</span>
            <span
              className={
                isFocusMusicPlaying ? 'text-amber-400 font-semibold' : 'text-zinc-400'
              }
            >
              {isFocusMusicPlaying ? 'Playing' : 'Off'}
            </span>
          </button>
          <span aria-hidden="true">·</span>
          <span>{isTimerMode ? 'Space: Start · C: Music' : 'Space: Start · L: Lap · R: Reset'}</span>
        </div>

        {/* Center: Primary Controls */}
        {isTimerMode ? (
          <div className="flex items-center justify-center gap-3 mx-auto sm:mx-0">
            {status === 'running' ? (
              <button
                type="button"
                onClick={handlePause}
                aria-label="Pause timer"
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartOrResume}
                aria-label={status === 'paused' ? 'Resume timer' : 'Start timer'}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-zinc-950 bg-[#F4F4F6] hover:bg-white rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{status === 'paused' ? 'Resume' : 'Start'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset timer"
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-zinc-200 bg-[#17171F] hover:bg-[#22222D] border border-[#282834] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleAddOneMinute}
              aria-label="Add 1 minute"
              className="flex items-center gap-1 px-3.5 py-2.5 text-sm font-medium text-zinc-300 bg-[#14141B] hover:bg-[#1F1F29] border border-[#252530] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>1m</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 mx-auto sm:mx-0">
            {stopwatchStatus === 'running' ? (
              <button
                type="button"
                onClick={handlePauseStopwatch}
                aria-label="Pause stopwatch"
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartOrResumeStopwatch}
                aria-label={stopwatchStatus === 'paused' ? 'Resume stopwatch' : 'Start stopwatch'}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-zinc-950 bg-[#F4F4F6] hover:bg-white rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{stopwatchStatus === 'paused' ? 'Resume' : 'Start'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRecordLap}
              disabled={stopwatchStatus === 'idle'}
              aria-label="Record lap time"
              title="Record Lap Time (L)"
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                stopwatchStatus === 'idle'
                  ? 'text-zinc-600 bg-[#14141A] border-[#1E1E26] cursor-not-allowed'
                  : 'text-zinc-200 bg-[#17171F] hover:bg-[#22222D] border-[#282834] cursor-pointer'
              }`}
            >
              <Flag className="w-4 h-4 text-amber-400" />
              <span>Lap</span>
            </button>

            <button
              type="button"
              onClick={handleResetStopwatch}
              aria-label="Reset stopwatch"
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-zinc-200 bg-[#17171F] hover:bg-[#22222D] border border-[#282834] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        )}

        {/* Right: Fullscreen / Laps Controls */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400">
          {!isTimerMode && stopwatchLaps.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLapsDrawer((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-zinc-300 hover:text-white bg-[#15151E] hover:bg-[#1E1E29] border border-[#242432] rounded-md transition-colors cursor-pointer"
            >
              <Flag className="w-3 h-3 text-amber-400" />
              <span>{showLapsDrawer ? 'Hide Laps' : `${stopwatchLaps.length} Laps`}</span>
              {showLapsDrawer ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}

          {isFullscreen ? (
            <button
              type="button"
              onClick={handleExitFullscreen}
              className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Exit Fullscreen (Esc)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setInfoModalOpen(true)}
              className="hover:text-zinc-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Desktop Build & Shortcuts
            </button>
          )}
        </div>
      </footer>

      {/* Desktop Packaging & Keyboard Shortcuts Modal */}
      <DesktopInfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />

      {/* Focus Music & Sound Masking Modal */}
      <FocusMusicModal
        isOpen={focusMusicModalOpen}
        onClose={() => setFocusMusicModalOpen(false)}
        selectedSound={selectedFocusSound}
        isPlaying={isFocusMusicPlaying}
        volume={focusMusicVolume}
        autoPlayWithTimer={autoPlayMusicWithTimer}
        onSelectSound={handleSelectFocusSound}
        onTogglePlay={handleToggleFocusMusicPlay}
        onStop={handleStopFocusMusic}
        onChangeVolume={handleChangeFocusVolume}
        onToggleAutoPlay={handleToggleAutoPlayMusic}
      />

      {/* Update Notification & Direct Download Modal */}
      <UpdateNotificationModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        updateInfo={updateInfo}
        isChecking={isCheckingUpdate}
        onCheckAgain={() => checkUpdates(true)}
      />

      {/* Notification Center & System Alerts Modal */}
      <NotificationCenterModal
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        osNotificationsEnabled={osNotificationsEnabled}
        onToggleOsNotifications={handleToggleOsNotifications}
        soundAlarmEnabled={soundEnabled}
        onToggleSoundAlarm={() => setSoundEnabled((prev) => !prev)}
        checkUpdatesOnStartup={checkUpdatesOnStartup}
        onToggleCheckUpdatesOnStartup={handleToggleCheckUpdatesOnStartup}
        stopwatchTargetMinutes={stopwatchTargetMinutes}
        onChangeStopwatchTarget={handleChangeStopwatchTarget}
        onOpenUpdateModal={() => {
          setNotificationCenterOpen(false);
          setUpdateModalOpen(true);
        }}
      />
    </div>
  );
}
