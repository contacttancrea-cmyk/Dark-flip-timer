import React from 'react';
import {
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Power,
  ShieldCheck,
  Headphones,
  Check,
  Flame,
  CloudRain,
  Activity,
  Wind,
} from 'lucide-react';
import {
  FOCUS_SOUND_OPTIONS,
  FocusSoundType,
} from '../utils/focusAudio';

interface FocusMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSound: FocusSoundType;
  isPlaying: boolean;
  volume: number;
  autoPlayWithTimer: boolean;
  onSelectSound: (sound: FocusSoundType) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onChangeVolume: (volume: number) => void;
  onToggleAutoPlay: () => void;
}

export const FocusMusicModal: React.FC<FocusMusicModalProps> = ({
  isOpen,
  onClose,
  selectedSound,
  isPlaying,
  volume,
  autoPlayWithTimer,
  onSelectSound,
  onTogglePlay,
  onStop,
  onChangeVolume,
  onToggleAutoPlay,
}) => {
  if (!isOpen) return null;

  const getSoundIcon = (id: FocusSoundType) => {
    switch (id) {
      case 'brown':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'rain':
        return <CloudRain className="w-5 h-5 text-sky-400" />;
      case 'alpha':
        return <Activity className="w-5 h-5 text-purple-400" />;
      case 'pink':
        return <Wind className="w-5 h-5 text-pink-400" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus Audio and Sound Masking settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0F0F14] border border-[#272733] shadow-2xl text-zinc-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E28] bg-[#13131A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Focus Audio & Sound Masking</span>
                {isPlaying && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    PLAYING
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                Acoustic isolation sounds engineered to block external distractions and sustain flow
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#1E1E28] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Power ON / OFF Master Bar */}
          <div
            className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
              isPlaying
                ? 'bg-[#181C17] border-emerald-500/40 text-emerald-100 shadow-sm'
                : 'bg-[#14141B] border-[#252532] text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isPlaying
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                <Power className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span>Audio Status:</span>
                  <span
                    className={
                      isPlaying ? 'text-emerald-400 font-bold' : 'text-zinc-400 font-medium'
                    }
                  >
                    {isPlaying ? 'ACTIVE (ON)' : 'MUTED (OFF)'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isPlaying
                    ? 'Background sound is running — click to turn off anytime'
                    : 'Click button to enable concentration sound'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isPlaying ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600/90 hover:bg-red-600 rounded-lg shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Turn Off (OFF)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="px-4 py-2 text-xs font-bold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Turn On (ON)</span>
                </button>
              )}
            </div>
          </div>

          {/* Sound Choice Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Select Sound Profile</span>
              </label>
              <span className="text-[11px] text-zinc-400">
                Click any profile to switch instantly
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FOCUS_SOUND_OPTIONS.map((opt) => {
                const isSelected = selectedSound === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectSound(opt.id)}
                    className={`relative text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#1C1A14] border-amber-500/70 shadow-md ring-1 ring-amber-500/40'
                        : 'bg-[#13131A] border-[#22222E] hover:border-[#323242] hover:bg-[#161622]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-2 rounded-lg bg-[#1B1B25] border border-[#2B2B3A]"
                          style={{ color: opt.color }}
                        >
                          {getSoundIcon(opt.id)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                            <span>{opt.name}</span>
                          </div>
                          <div className="text-[11px] text-zinc-400 font-medium">
                            {opt.tagline}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume Control */}
          <div className="p-4 rounded-xl bg-[#13131A] border border-[#22222E] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                {volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-zinc-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-zinc-300" />
                )}
                <span>Output Volume</span>
              </span>
              <span className="font-mono text-zinc-200 font-bold">
                {Math.round(volume * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                aria-label="Sound volume"
                className="w-full h-2 bg-[#22222E] rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          </div>

          {/* Preferences: Auto-Play with Timer */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#13131A] border border-[#22222E]">
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                Auto-play with Countdown
              </div>
              <div className="text-[11px] text-zinc-400">
                Start audio automatically when countdown begins, and pause when timer is stopped
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleAutoPlay}
              role="switch"
              aria-checked={autoPlayWithTimer}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                autoPlayWithTimer ? 'bg-amber-500 justify-end' : 'bg-[#262635] justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

        {/* Footer info & close */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1E1E28] bg-[#111117] text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>100% Offline synthesized Web Audio — zero network requests</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-200 bg-[#1C1C26] hover:bg-[#252533] border border-[#2B2B3A] rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
