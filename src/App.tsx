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
} from 'lucide-react';
import {
  QUICK_PRESETS,
  TimeUnitKey,
  TimerStatus,
  calculateProgressPercent,
  calculateRemainingFromTarget,
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
  triggerCompletionNotification,
} from './utils/desktopBridge';
import { FlipUnitCard } from './components/FlipUnitCard';
import { DesktopInfoModal } from './components/DesktopInfoModal';
import { FocusMusicModal } from './components/FocusMusicModal';

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

  // Absolute wall-clock target timestamp for drift-free countdown
  const targetEndTimeMsRef = useRef<number | null>(null);
  const lastDisplayedSecondRef = useRef<number>(DEFAULT_DURATION_SECONDS);
  const idleControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const formatted = formatReadableTime(remainingSeconds);
    if (status === 'running') {
      document.title = `${formatted} — Dark Flip Timer`;
    } else if (status === 'paused') {
      document.title = `${formatted} (Paused) — Dark Flip Timer`;
    } else if (status === 'completed') {
      document.title = `00:00:00 Time Up — Dark Flip Timer`;
    } else {
      document.title = 'Dark Flip Timer';
    }

    if (window.electronAPI?.setTimerRunningState) {
      window.electronAPI.setTimerRunningState(status === 'running').catch(() => {});
    }
  }, [remainingSeconds, status]);

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
      triggerCompletionNotification(
        'Dark Flip Timer — Time Up',
        `Your ${formatReadableTime(initialDurationSeconds)} countdown has finished.`
      );
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

      if (infoModalOpen || focusMusicModalOpen) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlayPause();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleToggleFocusMusicPlay();
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setSoundEnabled((prev) => !prev);
      } else if (e.key >= '1' && e.key <= '8' && status !== 'running') {
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
    focusMusicModalOpen,
    handleExitFullscreen,
    handleReset,
    handleSelectPreset,
    handleToggleFocusMusicPlay,
    handleToggleFullscreen,
    handleTogglePlayPause,
    infoModalOpen,
    isFullscreen,
    status,
    wakeControls,
  ]);

  const { hours, minutes, seconds } = secondsToTimeParts(remainingSeconds);
  const isEditable = status === 'idle' || status === 'paused';
  const progressPercent = calculateProgressPercent(
    initialDurationSeconds,
    remainingSeconds
  );

  const statusLabel =
    status === 'running'
      ? 'Counting Down'
      : status === 'paused'
      ? 'Paused'
      : status === 'completed'
      ? 'Time Up — Countdown Finished'
      : 'Ready';

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
      {/* Top Bar Contract: 3 Zones (Brand Wordmark — Preset Controls — Primary Action) */}
      <header
        className={`app-drag-region flex items-center justify-between gap-8 px-6 py-3.5 border-b border-[#191920] bg-[#0B0B0E] transition-opacity duration-200 z-30 ${chromeVisibilityClass}`}
      >
        {/* Zone 1: Single-line Brand Title */}
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

        {/* Zone 2: Quick Preset Selector Bar (1, 5, 10, 15, 25, 30, 45, 60 min) */}
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

        {/* Zone 3: Actions & Window Controls */}
        <div className="app-no-drag flex items-center gap-2 shrink-0">
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
        {/* Compact Preset Bar for smaller viewports */}
        <div
          className={`flex md:hidden items-center justify-center flex-wrap gap-1 mb-5 transition-opacity duration-200 ${chromeVisibilityClass}`}
        >
          {QUICK_PRESETS.map((preset) => (
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
          ))}
        </div>

        {/* Unboxed Metadata Status Strip (Zero-Pill Discipline) */}
        <div
          className={`flex items-center gap-2 text-xs text-zinc-400 mb-6 transition-opacity duration-200 ${chromeVisibilityClass}`}
        >
          <span
            className={
              status === 'completed'
                ? 'text-amber-400 font-semibold'
                : status === 'running'
                ? 'text-zinc-200 font-medium'
                : 'text-zinc-400'
            }
          >
            {statusLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span style={{ fontFamily: 'var(--font-mono)' }} className="tabular-nums">
            Set {formatReadableTime(initialDurationSeconds)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {isEditable
              ? 'Click any card or use arrows to edit time'
              : `${Math.round(progressPercent)}% elapsed`}
          </span>
        </div>

        {/* Split-Flap Assembly (Hours : Minutes : Seconds) */}
        <div
          role="timer"
          aria-label={`Countdown timer ${formatReadableTime(remainingSeconds)}`}
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
            isCompleted={status === 'completed'}
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
                status === 'running'
                  ? 'bg-zinc-400'
                  : status === 'completed'
                  ? 'bg-amber-400'
                  : 'bg-zinc-700'
              }`}
            />
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'running'
                  ? 'bg-zinc-400'
                  : status === 'completed'
                  ? 'bg-amber-400'
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
            isCompleted={status === 'completed'}
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
                status === 'running'
                  ? 'bg-zinc-400'
                  : status === 'completed'
                  ? 'bg-amber-400'
                  : 'bg-zinc-700'
              }`}
            />
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'running'
                  ? 'bg-zinc-400'
                  : status === 'completed'
                  ? 'bg-amber-400'
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
            isCompleted={status === 'completed'}
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
                status === 'completed' ? 'bg-amber-400' : 'bg-zinc-300'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Completion Alert Banner when Countdown Reaches 00:00:00 */}
        {status === 'completed' && (
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
      </main>

      {/* Bottom Primary Control Bar */}
      <footer
        className={`flex items-center justify-between gap-4 px-6 py-4 border-t border-[#18181F] bg-[#0B0B0E] transition-opacity duration-200 z-30 ${chromeVisibilityClass}`}
      >
        {/* Left: Mechanical Flip Tick Audio Option */}
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
          <span>Space: Start · C: Music</span>
        </div>

        {/* Center: Primary Timer Transport Controls */}
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

        {/* Right: Dedicated Fullscreen Control */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-400">
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
    </div>
  );
}
