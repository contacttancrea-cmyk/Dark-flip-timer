const { app, BrowserWindow, ipcMain, Notification, powerSaveBlocker, shell } = require('electron');
const path = require('node:path');

// Enable GPU hardware rasterization for high-performance 60fps/120fps CSS 3D transforms
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow = null;
let powerSaveId = null;

function createMainWindow() {
  const iconPath = path.join(__dirname, '../build/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 640,
    minHeight: 460,
    title: 'Dark Flip Timer',
    backgroundColor: '#08080A',
    icon: iconPath,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('enter-full-screen', () => {
    if (mainWindow) {
      mainWindow.webContents.send('window:fullscreen-changed', true);
    }
  });

  mainWindow.on('leave-full-screen', () => {
    if (mainWindow) {
      mainWindow.webContents.send('window:fullscreen-changed', false);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.setAppUserModelId('com.darkfliptimer.desktop');

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (powerSaveId !== null && powerSaveBlocker.isStarted(powerSaveId)) {
    powerSaveBlocker.stop(powerSaveId);
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Secure IPC Handlers for Native Desktop Window & OS Integration
ipcMain.handle('window:toggle-fullscreen', () => {
  if (!mainWindow) return false;
  const nextState = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(nextState);
  return nextState;
});

ipcMain.handle('window:set-fullscreen', (_event, value) => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(Boolean(value));
  return mainWindow.isFullScreen();
});

ipcMain.handle('window:get-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

ipcMain.handle('window:toggle-always-on-top', () => {
  if (!mainWindow) return false;
  const next = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(next, 'screen-saver');
  return next;
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize-or-restore', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('timer:set-running-state', (_event, isRunning) => {
  if (isRunning) {
    if (powerSaveId === null || !powerSaveBlocker.isStarted(powerSaveId)) {
      powerSaveId = powerSaveBlocker.start('prevent-display-sleep');
    }
  } else if (powerSaveId !== null && powerSaveBlocker.isStarted(powerSaveId)) {
    powerSaveBlocker.stop(powerSaveId);
    powerSaveId = null;
  }
  return true;
});

ipcMain.handle('timer:notify-completed', (_event, payload) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: payload?.title || 'Dark Flip Timer',
      body: payload?.body || 'Countdown reached 00:00:00.',
      icon: path.join(__dirname, '../build/icon.ico'),
      silent: false,
    });
    notification.show();
  }
  if (mainWindow && !mainWindow.isFocused()) {
    mainWindow.flashFrame(true);
  }
  return true;
});

ipcMain.handle('shell:open-external', async (_event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('notification:send', (_event, payload) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: payload?.title || 'Dark Flip Timer',
      body: payload?.body || '',
      icon: path.join(__dirname, '../build/icon.ico'),
      silent: Boolean(payload?.silent),
    });
    notification.show();
  }
  if (mainWindow && !mainWindow.isFocused()) {
    mainWindow.flashFrame(true);
  }
  return true;
});
