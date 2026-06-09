# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tomato is a personal productivity desktop app combining task management, Pomodoro timer, work review, statistics, schedule planning, and note-taking. It runs as either a browser-based SPA or an Electron desktop app. All data is stored locally in JSON files — no database or network services.

完整设计文档见 `DESIGN.md`。

## Commands

```bash
npm run dev              # 浏览器开发模式（Express + Vite middleware，HMR，传递 --dev 标志）
npm run build            # 构建前端 Vite → dist/
npm run start:electron   # 启动 Electron 桌面应用（需先 build）
npm run electron:dev     # 构建 + 启动 Electron（一键桌面开发）
npm run electron:build   # 打包安装包 (.exe/.dmg/.AppImage) → dist-electron/
```

一键脚本（开发/构建/环境安装）：
```bash
./install.sh   # 安装依赖（Linux/macOS）
./start.sh     # 构建 + 启动桌面应用（Linux/macOS）
./build.sh     # 仅构建前端（Linux/macOS）
./env-setup.sh # 安装 Node.js 18+ 环境（Linux/macOS）
```
Windows 对应 `.bat` 版本。

No test framework is configured. No linter is configured.

## Architecture

**Dual-mode startup**: The Express server (`server/index.js`) can run standalone (opens browser) or embedded inside Electron (`electron/main.js`, passes `{ silent: true }`). The server always binds to `localhost:3210`. Dev mode passes `--dev` flag which enables Vite middleware (HMR); production serves static files from `dist/`.

**Frontend routing**: No vue-router — `App.vue` uses a `currentView` ref with `v-if` to switch between 8 views: tasks/projects/pomodoro/stats/review/workbench/schedule/notes. Keyboard shortcuts `1-8` switch views. `?` opens shortcut help.

**Cross-component communication**: `App.vue` uses `provide('openTaskCreate', ...)` and `provide('navigateToNote', ...)` to expose global actions to descendant components. Components consume these via `inject()`.

**Data layer** (`server/store/base.js`): Generic `createStore(fileName)` returns CRUD helpers (`getAll`, `getById`, `create`, `update`, `delete`, `query`, `replaceAll`) over JSON files in `data/`. Uses `withLock` for write concurrency safety and `safeWrite` (tmp file + rename) for atomic writes. Corrupt JSON is auto-backed up to `.bak`.

**API layer** (`server/routes/`): Nine Express routers — tasks, projects, pomodoros, stats, steps, schedule, notes, note_categories, config — each mounted at `/api/<resource>`. Input validation is inline in route handlers (title length limits, color regex, tag count caps).

**Frontend API calls**: `src/composables/useApi.js` provides a thin `fetch` wrapper returning `{ get, post, put, del }`. All views call it directly — no state management library. When the response has a `content-disposition` header (file export), the raw `Response` object is returned instead of parsed JSON.

**Theming**: CSS variables in `src/assets/main.css` define a "Warm Studio" design system. Dark/light toggle via `isDark` ref in `App.vue`, persisted to `localStorage`. Note view has its own markdown theme system with 4 themes configurable via `ThemeConfigModal`.

**Notes feature**: NoteView supports markdown editing with live preview (two-column layout), Mermaid diagram rendering, tags, categories, and 4 markdown themes. Uses `marked` for markdown parsing and `mermaid` for diagram rendering. Data stored in `data/notes.json`, categories in `data/note_categories.json`.

**Schedule feature**: ScheduleView provides calendar-based planning with step-based workflow items. Data stored in `data/schedule_items.json` and `data/steps.json`.

**Electron specifics**: Frameless window (`frame: false`), custom titlebar in `AppHeader.vue`, window controls via IPC (`preload.cjs` exposes `window:minimize/maximize/close`). Close hides to system tray instead of quitting. `vendor/` contains offline dependencies for Electron packaging (no CDN, no network at runtime).

## Key Conventions

- ESM throughout (`"type": "module"` in package.json), except `preload.cjs` which must be CommonJS for Electron
- Vue 3 Composition API (`<script setup>`) — no Options API
- No TypeScript
- Vite `@` alias maps to `src/` directory
- Data files in `data/`: tasks.json, projects.json, pomodoros.json, notes.json, note_categories.json, schedule_items.json, steps.json, config.json (gitignored, auto-created)
- Default project (id `"default"`) is auto-created on server startup via `initDefaultProject()`
- Vite root is `src/`, output goes to `dist/` (project root level)
- `.npmrc.example` 为华为云镜像源参考，需要时复制为 `.npmrc`。`.npmrc` 和 `package-lock.json` 不纳入版本控制
