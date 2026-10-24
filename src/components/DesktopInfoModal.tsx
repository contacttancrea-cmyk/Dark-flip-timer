import React, { useState } from 'react';
import { X, Download, Terminal, Keyboard, ShieldCheck, Check, Copy } from 'lucide-react';

interface DesktopInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'shortcuts' | 'windows-build';
}

export const DesktopInfoModal: React.FC<DesktopInfoModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'shortcuts',
}) => {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'windows-build'>(initialTab);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (cmd: string) => {
    navigator.clipboard?.writeText(cmd).catch(() => {});
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  const shortcuts = [
    { key: 'Space', action: 'Start, pause, or resume countdown' },
    { key: 'R', action: 'Reset timer to selected preset or custom time' },
    { key: 'C', action: 'Toggle background concentration sound / noise masking' },
    { key: 'F / F11', action: 'Toggle fullscreen mode' },
    { key: 'Esc', action: 'Exit fullscreen mode or close dialog' },
    { key: 'M', action: 'Toggle completion alarm & mechanical tick sound' },
    { key: '1 – 8', action: 'Select quick preset (1, 5, 10, 15, 25, 30, 45, 60 min)' },
    { key: 'Click Digit', action: 'Edit hours, minutes, or seconds directly when stopped' },
  ];

  const buildCommands = [
    {
      label: 'Run Native Desktop Window in Development',
      cmd: 'npm run electron:dev',
      desc: 'Launches the frameless Windows Electron window connected to the local Vite engine.',
    },
    {
      label: 'Build Windows NSIS Installer (.exe) + Portable (.exe)',
      cmd: 'npm run dist:win',
      desc: 'Bundles offline assets and packages Dark-Flip-Timer-1.0.0-nsis.exe (with Desktop & Start Menu shortcuts) and Portable.exe in /release.',
    },
    {
      label: 'Build Standalone Portable Windows Executable Only',
      cmd: 'npm run dist:win:portable',
      desc: 'Produces a zero-install standalone Dark-Flip-Timer-1.0.0-Portable.exe binary.',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-[#111115] border border-[#272732] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22222B]">
          <div className="flex items-center gap-3">
            <img
              src="./icon.svg"
              alt="Dark Flip Timer App Icon"
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-md"
            />
            <h2
              id="modal-title"
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-base font-semibold text-zinc-100"
            >
              Dark Flip Timer — Desktop Configuration & Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#1E1E26] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="px-6 pt-4 border-b border-[#1E1E26] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'shortcuts'
                ? 'border-amber-500 text-zinc-100 bg-[#18181F]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Keyboard Shortcuts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('windows-build')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'windows-build'
                ? 'border-amber-500 text-zinc-100 bg-[#18181F]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Windows Desktop Packaging (.exe & Icon)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto">
          {activeTab === 'shortcuts' ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400 mb-4">
                All keyboard shortcuts work in both windowed and fullscreen modes when not typing inside a digit field.
              </p>
              <div className="divide-y divide-[#1E1E26] border border-[#22222B] rounded-lg overflow-hidden">
                {shortcuts.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-4 py-2.5 bg-[#141419]"
                  >
                    <span className="text-xs text-zinc-300">{item.action}</span>
                    <kbd
                      style={{ fontFamily: 'var(--font-mono)' }}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-300 bg-[#1E1E26] border border-[#2E2E3A] rounded"
                    >
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* App Icon Asset Section */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-[#15151B] border border-[#24242E]">
                <div className="flex items-center gap-3.5">
                  <img
                    src="./icon.png"
                    alt="Dark Flip Timer Windows Icon"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl border border-[#2E2E3A]"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">
                      Windows Application Icon (build/icon.ico)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Multi-resolution 16px–256px Windows ICO & PNG configured for Desktop & Start Menu shortcuts.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="./icon.ico"
                    download="Dark-Flip-Timer.ico"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-100 bg-[#22222C] hover:bg-[#2C2C38] border border-[#323240] rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download .ico</span>
                  </a>
                </div>
              </div>

              {/* Build Commands */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-zinc-300">
                  Desktop Build & Packaging Commands
                </h3>
                {buildCommands.map((item) => (
                  <div
                    key={item.cmd}
                    className="p-3.5 rounded-lg bg-[#141419] border border-[#22222B]"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-zinc-200">{item.label}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.cmd)}
                        aria-label={`Copy command ${item.cmd}`}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-300 hover:text-white bg-[#1E1E26] rounded border border-[#2C2C38] cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {copiedCmd === item.cmd ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <code
                      style={{ fontFamily: 'var(--font-mono)' }}
                      className="block text-xs text-amber-300 mb-1"
                    >
                      {item.cmd}
                    </code>
                    <p className="text-[11px] text-zinc-400">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Security & Offline Guarantee */}
              <div className="flex items-start gap-2.5 text-xs text-zinc-400 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Configured with <code className="text-zinc-200">contextIsolation: true</code>,{' '}
                  <code className="text-zinc-200">nodeIntegration: false</code>, offline asset
                  bundling (<code className="text-zinc-200">base: &apos;./&apos;</code>), and{' '}
                  <code className="text-zinc-200">powerSaveBlocker</code> to prevent Windows sleep
                  during active countdowns.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
