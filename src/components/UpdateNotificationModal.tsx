import React from 'react';
import {
  X,
  Sparkles,
  Download,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { UpdateInfo } from '../utils/updateChecker';
import { openExternalUrl } from '../utils/desktopBridge';

interface UpdateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  onCheckAgain: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  isChecking,
  onCheckAgain,
}) => {
  if (!isOpen) return null;

  const hasUpdate = Boolean(updateInfo?.hasUpdate);
  const currentVer = updateInfo?.currentVersion || '1.1.0';
  const latestVer = updateInfo?.latestVersion || `v${currentVer}`;

  const handleDownloadPortable = () => {
    const url =
      updateInfo?.portableAsset?.downloadUrl ||
      updateInfo?.releaseUrl ||
      'https://github.com/contacttancrea-cmyk/Dark-flip-timer/releases/latest';
    openExternalUrl(url);
  };

  const handleDownloadInstaller = () => {
    const url =
      updateInfo?.installerAsset?.downloadUrl ||
      updateInfo?.releaseUrl ||
      'https://github.com/contacttancrea-cmyk/Dark-flip-timer/releases/latest';
    openExternalUrl(url);
  };

  const handleViewOnGitHub = () => {
    const url =
      updateInfo?.releaseUrl ||
      'https://github.com/contacttancrea-cmyk/Dark-flip-timer/releases';
    openExternalUrl(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Software update status"
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
            <div
              className={`p-2 rounded-xl border ${
                hasUpdate
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {hasUpdate ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>{hasUpdate ? 'New Update Available' : 'Dark Flip Timer Up to Date'}</span>
                {hasUpdate && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full">
                    {latestVer}
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                Official releases by TanCreative
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Version Status Card */}
          <div className="p-4 rounded-xl bg-[#14141B] border border-[#252532] flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-zinc-400">Current Installed Version</div>
              <div className="text-sm font-mono font-bold text-zinc-200">
                v{currentVer}
              </div>
            </div>

            <div className="h-8 w-px bg-zinc-800" />

            <div className="space-y-1">
              <div className="text-xs text-zinc-400">Latest GitHub Release</div>
              <div
                className={`text-sm font-mono font-bold ${
                  hasUpdate ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {latestVer}
              </div>
            </div>

            <button
              type="button"
              onClick={onCheckAgain}
              disabled={isChecking}
              className="p-2 rounded-lg bg-[#1D1D27] hover:bg-[#252533] border border-[#2D2D3E] text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Check for updates again"
            >
              <RefreshCw
                className={`w-4 h-4 ${isChecking ? 'animate-spin text-amber-400' : ''}`}
              />
            </button>
          </div>

          {/* If Update Available: Highlights & Download Buttons */}
          {hasUpdate ? (
            <div className="space-y-4">
              {updateInfo?.releaseName && (
                <div className="text-sm font-semibold text-zinc-200">
                  {updateInfo.releaseName}
                </div>
              )}

              {updateInfo?.releaseNotes && (
                <div className="p-3.5 rounded-xl bg-[#121217] border border-[#22222D] text-xs text-zinc-300 max-h-44 overflow-y-auto space-y-1.5 leading-relaxed font-sans whitespace-pre-wrap">
                  {updateInfo.releaseNotes}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPortable}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Portable Executable (.exe)</span>
                </button>

                {updateInfo?.installerAsset && (
                  <button
                    type="button"
                    onClick={handleDownloadInstaller}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-zinc-200 bg-[#1A1A24] hover:bg-[#242433] border border-[#2E2E3E] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Windows Installer (.exe)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleViewOnGitHub}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <span>View Release Notes on GitHub</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-zinc-200">
                You are on the latest version!
              </div>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Dark Flip Timer v{currentVer} is up to date. You will be automatically notified whenever a new release is published.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1E1E28] bg-[#111117] text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Verified GitHub Release Source</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-200 bg-[#1C1C26] hover:bg-[#252533] border border-[#2B2B3A] rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
