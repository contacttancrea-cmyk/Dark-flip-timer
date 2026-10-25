import React from 'react';
import {
  X,
  Bell,
  BellRing,
  Sparkles,
  ShieldCheck,
  Check,
  Volume2,
  Monitor,
  Flame,
  Clock,
} from 'lucide-react';
import { sendDesktopNotification } from '../utils/desktopBridge';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  osNotificationsEnabled: boolean;
  onToggleOsNotifications: () => void;
  soundAlarmEnabled: boolean;
  onToggleSoundAlarm: () => void;
  checkUpdatesOnStartup: boolean;
  onToggleCheckUpdatesOnStartup: () => void;
  stopwatchTargetMinutes: number | null;
  onChangeStopwatchTarget: (minutes: number | null) => void;
  onOpenUpdateModal: () => void;
}

const STOPWATCH_TARGETS = [
  { minutes: null, label: 'None' },
  { minutes: 15, label: '15 min' },
  { minutes: 25, label: '25 min (Pomodoro)' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '60 min (1 hr)' },
];

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  osNotificationsEnabled,
  onToggleOsNotifications,
  soundAlarmEnabled,
  onToggleSoundAlarm,
  checkUpdatesOnStartup,
  onToggleCheckUpdatesOnStartup,
  stopwatchTargetMinutes,
  onChangeStopwatchTarget,
  onOpenUpdateModal,
}) => {
  if (!isOpen) return null;

  const handleTestNotification = () => {
    sendDesktopNotification(
      'Dark Flip Timer — Notification Test',
      'This is how you will be notified when your countdown finishes or an update is ready.'
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notification Center & Alerts"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-[#0F0F14] border border-[#272733] shadow-2xl text-zinc-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E28] bg-[#13131A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                Notification Center & Alerts
              </h2>
              <p className="text-xs text-zinc-400">
                Manage desktop alerts, completion chimes, and update notifications
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section 1: Completion Notifications */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-amber-400" />
              <span>Time Finished Alerts (Countdown & Stopwatch)</span>
            </label>

            {/* Toggle 1: Windows OS Desktop Notifications */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#14141B] border border-[#252532]">
              <div>
                <div className="text-xs font-semibold text-zinc-200">
                  Windows Desktop Banner & Taskbar Flash
                </div>
                <div className="text-[11px] text-zinc-400">
                  Alerts you even when Dark Flip Timer is minimized or in the background
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleOsNotifications}
                role="switch"
                aria-checked={osNotificationsEnabled}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  osNotificationsEnabled ? 'bg-amber-500 justify-end' : 'bg-[#262635] justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Toggle 2: Audio Chime Alarm */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#14141B] border border-[#252532]">
              <div>
                <div className="text-xs font-semibold text-zinc-200">
                  Braun Acoustic Chime Sound
                </div>
                <div className="text-[11px] text-zinc-400">
                  Plays harmonic completion chime when time reaches zero
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleSoundAlarm}
                role="switch"
                aria-checked={soundAlarmEnabled}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  soundAlarmEnabled ? 'bg-amber-500 justify-end' : 'bg-[#262635] justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Test Notification Button */}
            <button
              type="button"
              onClick={handleTestNotification}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 bg-[#171722] hover:bg-[#20202F] border border-[#2A2A3C] rounded-lg transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Send Test Notification Now</span>
            </button>
          </div>

          {/* Section 2: Stopwatch Target Duration Alert */}
          <div className="space-y-3 pt-2 border-t border-[#1E1E28]">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Stopwatch Target Alert (Optional)</span>
            </label>
            <p className="text-[11px] text-zinc-400">
              Trigger a notification automatically when stopwatch count-up reaches this duration:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STOPWATCH_TARGETS.map((target) => {
                const isSelected = stopwatchTargetMinutes === target.minutes;
                return (
                  <button
                    key={String(target.minutes)}
                    type="button"
                    onClick={() => onChangeStopwatchTarget(target.minutes)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
                        : 'bg-[#14141B] border-[#252532] text-zinc-400 hover:text-zinc-200 hover:bg-[#1A1A24]'
                    }`}
                  >
                    {target.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: App Update Alerts */}
          <div className="space-y-3 pt-2 border-t border-[#1E1E28]">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Software Update Notifications</span>
            </label>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#14141B] border border-[#252532]">
              <div>
                <div className="text-xs font-semibold text-zinc-200">
                  Notify on New GitHub Releases
                </div>
                <div className="text-[11px] text-zinc-400">
                  Silently checks for updates on startup and notifies when a new .exe is available
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleCheckUpdatesOnStartup}
                role="switch"
                aria-checked={checkUpdatesOnStartup}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  checkUpdatesOnStartup ? 'bg-amber-500 justify-end' : 'bg-[#262635] justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUpdateModal();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 rounded-lg transition-colors cursor-pointer"
            >
              <span>Check for Updates & Release Notes</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1E1E28] bg-[#111117] text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Quiet Mode Safe — Never interrupts fullscreens</span>
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
