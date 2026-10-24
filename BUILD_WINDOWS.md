# Dark Flip Timer — Windows Desktop Application Guide
**Engineered by TanCreative**

**Dark Flip Timer** is a standalone, native-feeling Windows desktop application built with **Electron + React + TypeScript + Vite**. It packages all frontend assets, fonts, synthesized Web Audio sounds, authentic natural rain audio, and multi-resolution Windows icons (`build/icon.ico`) into an offline desktop executable.

---

## 1. Project Architecture & Desktop Configuration

| Path | Purpose |
| :--- | :--- |
| `electron/main.cjs` | Native Windows Electron main process (`BrowserWindow` with frameless dark chrome `#08080A`, native fullscreen IPC, `alwaysOnTop`, OS notifications, `powerSaveBlocker` to prevent screen sleep during countdowns, and offline `dist/index.html` loader). |
| `electron/preload.cjs` | Secure preload bridge (`contextBridge.exposeInMainWorld('electronAPI', ...)` with `contextIsolation: true` and `nodeIntegration: false`). |
| `electron-builder.json` | Windows packaging configuration for `electron-builder` targeting both **NSIS Installer (`.exe`)** (with Desktop & Start Menu shortcuts) and **Standalone Portable (`.exe`)**. |
| `scripts/generate-icons.mjs` | Zero-dependency Node script that generates multi-resolution Windows `.ico` (16×16 to 256×256), `.png`, and `.svg` icons. |
| `build/icon.ico` & `public/icon.ico` | Configured Windows application icon used for the `.exe` binary, installer header, taskbar, Desktop shortcut, and Start Menu entry. |

---

## 2. Running in Development Mode

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the local Vite renderer server**:
   ```bash
   npm run dev
   ```

3. **Launch the native Electron desktop window** (in a second terminal):
   ```bash
   npm run electron:dev
   ```
   Or build and launch the production offline desktop window directly:
   ```bash
   npm run electron:start
   ```

---

## 3. Building the Windows `.exe` Installer & Portable Executable

1. **Build both the Windows NSIS Installer (`.exe`) and Portable Executable (`.exe`)**:
   ```bash
   npm run dist:win
   ```
   This runs `node scripts/generate-icons.mjs && vite build` followed by `electron-builder --win --config electron-builder.json`.

2. **Build only the standalone Portable `.exe`**:
   ```bash
   npm run dist:win:portable
   ```

3. **Output Location**:
   - `release/Dark-Flip-Timer-1.0.0-nsis.exe` — Interactive Windows Setup Installer.
   - `release/Dark-Flip-Timer-1.0.0-Portable.exe` — Standalone zero-install portable Windows executable.
