<div align="center">

# ⏱️ Dark Flip Timer
### Standalone Dark-Themed Split-Flap Countdown Timer & Acoustic Focus Desktop Application
**Crafted by TanCreative**

[![Release](https://img.shields.io/badge/Release-v1.0.0-amber.svg?style=flat-square)](https://github.com/tancreative/dark-flip-timer/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-blue.svg?style=flat-square)](https://github.com/tancreative/dark-flip-timer/releases)
[![License](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](./LICENSE)
[![Built by](https://img.shields.io/badge/Author-TanCreative-purple.svg?style=flat-square)](https://github.com/tancreative)
[![Architecture](https://img.shields.io/badge/Stack-Electron%20%7C%20React%20%7C%20TypeScript%20%7C%20Vite-orange.svg?style=flat-square)](https://github.com/tancreative/dark-flip-timer)

<br />

<p align="center">
  A distraction-free, precision desktop countdown timer built for developers, designers, and deep thinkers. Combining vintage mechanical split-flap physics with genuine acoustic sound masking to effortlessly block outside noise and maintain unbroken focus.
</p>

</div>

---

## ⚡ Direct Download for Non-Developers (Ready-to-Run)

You **do not** need any coding knowledge, Node.js, or programming tools to use Dark Flip Timer. Simply download the Windows executable and run it:

| Download Type | Binary File | Description |
| :--- | :--- | :--- |
| **Zero-Install (Portable)** | [**Dark-Flip-Timer-1.0.0-Portable.exe**](https://github.com/tancreative/dark-flip-timer/releases/latest) | Standalone executable. Download, double-click, and start immediately without installing anything. Perfect for flash drives or quick use. |
| **Windows Setup Installer** | [**Dark-Flip-Timer-1.0.0-nsis.exe**](https://github.com/tancreative/dark-flip-timer/releases/latest) | Standard Windows setup installer. Adds **Dark Flip Timer** to your Desktop and Windows Start Menu. |

---

## ✨ Key Features

### 1. 🎴 Vintage Split-Flap Mechanical Aesthetics
- Realistic mechanical card flap physics with 3D drop animation.
- Subtle tactile card-drop sound with synthesized offline Braun acoustic tone.
- Unboxed typography with high-contrast digits readable from across the room.

### 2. 🌧️ Authentic Acoustic Noise Masking (Distraction Blocker)
- **Natural Rain & Drops:** Genuine recorded rainfall with organic droplet textures, soothing wind, and zero ear fatigue.
- **Deep Brown Noise:** Heavy low-frequency curtain engineered to drown out conversations, traffic, and background chatter.
- **Alpha Focus Drone:** 10Hz binaural concentration tone designed to induce and sustain calm cognitive flow.
- **Smooth Pink Noise:** Balanced 1/f noise spectrum for peaceful reading and long writing sessions.
- **Instant Control:** 1-click `OFF` button in the header, volume slider, and keyboard shortcut (`C`) to silence or trigger anytime.

### 3. 🎯 Precision Drift-Free Timing
- Synchronized against hardware wall-clock timestamps (`Date.now()`).
- Immune to background tab throttling, OS power suspensions, or system sleep.
- Built-in `powerSaveBlocker` prevents Windows from sleeping during active countdowns.

### 4. 🖥️ Native Windows Integration
- Frameless dark chrome `#08080A` with customized titlebar window controls (minimize, maximize, close).
- Fullscreen focus mode (`F` or `F11`) with auto-hiding controls during idle countdowns.
- Always-On-Top window pinning (`Pin` icon) to keep the timer floating above editors and browsers.
- Native Windows toast notifications upon countdown completion.

### 5. 🛡️ 100% Offline & Private
- Zero cloud servers, zero telemetry, zero analytics, zero external network requests.
- All audio and visual assets are completely self-contained within the executable.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Start, Pause, or Resume countdown |
| <kbd>R</kbd> | Reset countdown to preset or custom duration |
| <kbd>C</kbd> | Toggle concentration audio & noise masking On / Off |
| <kbd>F</kbd> / <kbd>F11</kbd> | Toggle immersive fullscreen mode |
| <kbd>Esc</kbd> | Exit fullscreen or dismiss open dialogs |
| <kbd>M</kbd> | Toggle completion alarm & mechanical flap sound |
| <kbd>1</kbd> – <kbd>8</kbd> | Quick preset jump (1, 5, 10, 15, 25, 30, 45, 60 min) |
| **Click Digit** | Direct inline numerical edit of hours, minutes, or seconds |

---

## 🛠️ Developer Guide (Building from Source)

If you are a developer and wish to customize or build the software from source:

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- `npm`

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/tancreative/dark-flip-timer.git
cd dark-flip-timer

# Install dependencies
npm install

# Start Vite renderer in development
npm run dev

# Launch frameless native Electron window (in second terminal)
npm run electron:dev
```

### Packaging Windows Executables
```bash
# Build both the NSIS Setup Installer and Portable Executable (.exe)
npm run dist:win

# Build only the Portable Executable (.exe)
npm run dist:win:portable
```
Compiled output binaries will be placed in the `release/` directory.

---

## ⚖️ License & Attribution

Distributed under the **MIT License**. Created and maintained by **TanCreative**.

```
Copyright (c) 2026 TanCreative

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

> **Notice:** Users and contributors are welcome to modify, improve, and fork this project. However, under the terms of the MIT License, **the original copyright notice and attribution to TanCreative must be preserved** in all copies or substantial portions of the software. You may not rebrand or claim this software as your own original creation.
