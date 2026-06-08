# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tomato is a personal productivity desktop app combining task management, Pomodoro timer, work review, and statistics. It runs as either a browser-based SPA or an Electron desktop app. All data is stored locally in JSON files — no database or network services.

## Commands

```bash
npm run dev              # Browser dev mode (Express starts Vite in middleware mode, HMR enabled)
npm run build            # Build frontend with Vite → dist/
npm run start:electron   # Launch Electron desktop app (requires prior build)
npm run electron:dev     # Build + launch Electron (one-step desktop dev)
npm run electron:build   # Package as installer (.exe / .dmg / .AppImage) → dist-electron/
```

No test framework is configured. No linter is configured.

## Architecture

**Dual-mode startup**: The Express server (`server/index.js`) can run standalone (opens browser) or embedded inside Electron (`electron/main.js`, passes `{ silent: true }`). The server always binds to `localhost:3210`.

**Frontend routing**: No vue-router — `App.vue` uses a `currentView` ref with `v-if` to switch between 5 views (tasks/projects/pomodoro/stats/review). Keyboard shortcuts `1-5` switch views.

**Data layer** (`server/store/base.js`): Generic `createStore(fileName)` returns CRUD helpers (`getAll`, `getById`, `create`, `update`, `delete`, `query`, `replaceAll`) over JSON files in `data/`. Uses `withLock` for write concurrency safety and `safeWrite` (tmp file + rename) for atomic writes. Corrupt JSON is auto-backed up to `.bak`.

**API layer** (`server/routes/`): Four Express routers — tasks, projects, pomodoros, stats — each mounted at `/api/<resource>`. Input validation is inline in route handlers (title length limits, color regex, tag count caps).

**Frontend API calls**: `src/composables/useApi.js` provides a thin `fetch` wrapper returning `{ get, post, put, del }`. All views call it directly — no state management library. When the response has a `content-disposition` header (file export), the raw `Response` object is returned instead of parsed JSON.

**Theming**: CSS variables in `src/assets/main.css` define a "Warm Studio" design system. Dark/light toggle via `isDark` ref in `App.vue`, persisted to `localStorage`.

**Electron specifics**: Frameless window (`frame: false`), custom titlebar in `AppHeader.vue`, window controls via IPC (`preload.cjs` exposes `window:minimize/maximize/close`). Close hides to system tray instead of quitting.

## Key Conventions

- ESM throughout (`"type": "module"` in package.json), except `preload.cjs` which must be CommonJS for Electron
- Vue 3 Composition API (`<script setup>`) — no Options API
- No TypeScript
- Data files: `data/tasks.json`, `data/projects.json`, `data/pomodoros.json` (gitignored, auto-created)
- Default project (id `"default"`) is auto-created on server startup via `initDefaultProject()`
- Vite root is `src/`, output goes to `dist/` (project root level)
- `.npmrc.example` 为华为云镜像源参考，需要时复制为 `.npmrc`。`.npmrc` 和 `package-lock.json` 不纳入版本控制
