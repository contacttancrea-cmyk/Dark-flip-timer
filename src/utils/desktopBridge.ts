export interface ElectronDesktopAPI {
  isDesktopApp: boolean;
  platform: string;
  toggleFullscreen: () => Promise<boolean>;
  setFullscreen: (value: boolean) => Promise<boolean>;
  getFullscreen: () => Promise<boolean>;
  toggleAlwaysOnTop: () => Promise<boolean>;
  minimizeWindow: () => Promise<void>;
  maximizeOrRestoreWindow: () => Promise<boolean>;
  closeWindow: () => Promise<void>;
  setTimerRunningState: (isRunning: boolean) => Promise<boolean>;
  notifyTimerCompleted: (payload: { title: string; body: string }) => Promise<boolean>;
  onFullscreenChanged: (callback: (isFullscreen: boolean) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronDesktopAPI;
  }
}

export function isRunningInElectron(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isDesktopApp);
}

export async function requestDesktopOrBrowserFullscreen(targetState: boolean): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Native Electron Fullscreen IPC if running inside Electron Windows binary
  if (window.electronAPI?.setFullscreen) {
    try {
      return await window.electronAPI.setFullscreen(targetState);
    } catch {
      // Fall through to standard Fullscreen API
    }
  }

  // 2. Standard HTML5 Fullscreen API
  try {
    if (targetState) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      return true;
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
      return false;
    }
  } catch {
    // In headless browsers or restricted containers where requestFullscreen rejects,
    // we still return targetState so the app's viewport-filling fullscreen mode works reliably.
    return targetState;
  }
}

export function triggerCompletionNotification(title: string, body: string): void {
  if (typeof window === 'undefined') return;

  if (window.electronAPI?.notifyTimerCompleted) {
    window.electronAPI.notifyTimerCompleted({ title, body }).catch(() => {});
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: './icon.png' });
    } catch {
      // Ignore notification errors in restricted environments
    }
  }
}
