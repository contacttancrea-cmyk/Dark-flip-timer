const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktopApp: true,
  platform: process.platform,
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  setFullscreen: (value) => ipcRenderer.invoke('window:set-fullscreen', value),
  getFullscreen: () => ipcRenderer.invoke('window:get-fullscreen'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeOrRestoreWindow: () => ipcRenderer.invoke('window:maximize-or-restore'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  setTimerRunningState: (isRunning) => ipcRenderer.invoke('timer:set-running-state', isRunning),
  notifyTimerCompleted: (payload) => ipcRenderer.invoke('timer:notify-completed', payload),
  onFullscreenChanged: (callback) => {
    const listener = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on('window:fullscreen-changed', listener);
    return () => ipcRenderer.removeListener('window:fullscreen-changed', listener);
  },
});
