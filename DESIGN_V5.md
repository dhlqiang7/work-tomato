# Tomato V5 — 个人工作助理 设计文档

## 1. 项目概述

### 1.1 定位

一款本地运行的**个人工作助理**，集成任务管理、番茄钟专注、工作回顾、数据统计、计划调度、工作台流程、笔记知识库七大核心能力，可打包为独立桌面应用。

### 1.2 核心原则

- **纯本地运行**：所有数据存储在本地 JSON 文件，不与任何网络服务交互
- **双模式启动**：支持浏览器模式和 Electron 桌面应用模式
- **界面优先**：现代化 UI，支持深色/浅色主题（Warm Studio 设计系统），笔记模块独立支持 4 套 Markdown 渲染主题
- **安全可控**：仅使用 MIT 许可证的开源依赖，输入校验完善

### 1.3 版本演进

| 版本 | 模块 |
|------|------|
| V1 | 任务管理、项目管理、番茄钟、统计仪表盘、工作回顾 |
| V5 | + 计划表（周/月视图时间调度）、工作台（泳道流程图）、笔记（Markdown + Mermaid + 主题）、全局配置 |

---

## 2. 技术架构

### 2.1 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 运行时 | Node.js >= 18 | 唯一运行时依赖 |
| 桌面端 | Electron 35 | 无边框窗口 + 系统托盘 |
| 后端 | Express.js | 轻量 HTTP 服务，内嵌于 Electron |
| 前端 | Vue 3 (SPA) | 组合式 API + 响应式组件，无 vue-router |
| 样式 | 原生 CSS + CSS Variables | Warm Studio 设计系统 + 笔记独立主题 |
| 存储 | JSON 文件 | 本地文件系统，按模块拆分 |
| Markdown | marked >= 17.0.6 | 笔记渲染引擎 |
| 图表 | mermaid >= 10.0.0 | 笔记/Markdown 内嵌图表 |
| 构建 | Vite 5/6 | 开发热更新 + 生产构建 |
| 打包 | electron-builder | 输出 .exe / .dmg / .AppImage |

### 2.2 项目结构

```
tomato/
├── electron/                  # Electron 主进程
│   ├── main.js                # 窗口创建、系统托盘、内嵌 Express
│   └── preload.cjs            # 渲染进程 API 桥接（窗口控制，必须 CommonJS）
├── server/                    # Express 后端
│   ├── index.js               # 服务器入口，支持独立运行和被 Electron import
│   ├── routes/
│   │   ├── tasks.js           # 任务 API
│   │   ├── projects.js        # 项目 API
│   │   ├── pomodoros.js       # 番茄钟 API
│   │   ├── stats.js           # 统计 API
│   │   ├── steps.js           # 步骤 API（任务拆解）
│   │   ├── schedule.js        # 计划表 API（时间调度）
│   │   ├── notes.js           # 笔记 API
│   │   ├── note_categories.js # 笔记分类 API
│   │   └── config.js          # 全局配置 API
│   └── store/
│       └── base.js            # JSON 数据存储层（读写锁 + 安全写入）
├── src/                       # Vue 前端（Vite root）
│   ├── index.html             # HTML 入口
│   ├── main.js                # Vue 应用入口
│   ├── App.vue                # 根组件（主题/8 视图切换/快捷键/provide 注入）
│   ├── assets/
│   │   └── main.css           # 全局样式（Warm Studio 设计系统）
│   ├── components/
│   │   ├── common/            # 通用组件（13 个）
│   │   │   ├── Modal.vue          # 通用弹窗（Teleport + 动画）
│   │   │   ├── ConfirmDialog.vue  # Promise 式确认框
│   │   │   ├── Toast.vue          # 全局消息通知
│   │   │   ├── ShortcutHelp.vue   # 快捷键帮助面板
│   │   │   ├── TaskCreateModal.vue # 任务创建/编辑弹窗
│   │   │   ├── MarkdownViewer.vue # Markdown 渲染组件
│   │   │   ├── ThemeConfigModal.vue # 笔记主题配置弹窗
│   │   │   ├── StepNode.vue       # 步骤流程图节点
│   │   │   └── ContextMenu.vue    # 右键上下文菜单
│   │   ├── layout/            # 布局组件
│   │   │   ├── AppHeader.vue  # 顶栏（主题切换 + Electron 窗口控制）
│   │   │   └── Sidebar.vue    # 8 项侧栏导航 + 提醒列表
│   │   ├── task/              # 任务相关子组件
│   │   ├── project/           # 项目相关子组件
│   │   ├── pomodoro/          # 番茄钟相关子组件
│   │   └── review/            # 回顾相关子组件
│   ├── composables/
│   │   ├── useApi.js          # HTTP 请求封装（get/post/put/del）
│   │   └── useToast.js        # 消息通知组合式函数
│   └── views/
│       ├── TaskView.vue       # 任务管理
│       ├── ProjectView.vue    # 项目管理
│       ├── PomodoroView.vue   # 番茄钟
│       ├── StatsView.vue      # 统计仪表盘
│       ├── ReviewView.vue     # 工作回顾
│       ├── WorkbenchView.vue  # 工作台（泳道流程图）
│       ├── ScheduleView.vue   # 计划表（周/月视图时间调度）
│       └── NoteView.vue       # 笔记（Markdown + 双栏编辑预览）
├── data/                      # 用户数据（运行时自动生成，已 gitignore）
│   ├── tasks.json
│   ├── projects.json
│   ├── pomodoros.json
│   ├── notes.json
│   ├── note_categories.json
│   ├── schedule_items.json
│   ├── steps.json
│   └── config.json
├── vendor/                    # Electron 离线依赖（无网络运行时使用）
├── dist/                      # 前端构建产物（已 gitignore）
├── DESIGN.md                  # 本设计文档
├── package.json
└── vite.config.js
```

### 2.3 启动流程

**桌面模式：**
```
用户执行 start.sh / start.bat
  → npm install（首次）
  → npx vite build（首次）
  → npx electron .
    → Electron 主进程启动
    → 内嵌启动 Express 服务器（localhost:3210, silent 模式）
    → BrowserWindow 加载 http://localhost:3210
    → 创建系统托盘图标（关闭窗口 = 隐藏到托盘）
```

**浏览器开发模式：**
```
npm run dev
  → 启动 Express 服务器（--dev 标志）
  → Vite middleware 模式（HMR，无需构建）
  → 初始化默认项目
  → 自动打开浏览器访问 http://localhost:3210
```

### 2.4 依赖清单

| 包名 | 用途 | 许可证 |
|------|------|--------|
| express | HTTP 服务框架 | MIT |
| vue | 前端框架 | MIT |
| vite | 前端构建工具 | MIT |
| @vitejs/plugin-vue | Vite Vue 插件 | MIT |
| uuid | UUID 生成 | MIT |
| marked | Markdown 渲染 | MIT |
| mermaid | 图表渲染 | MIT |
| electron | 桌面应用框架 | MIT |
| electron-builder | 应用打包工具 | MIT |

---

## 3. 数据模型

### 3.1 任务 (Task) — tasks.json

```jsonc
{
  "id": "uuid",
  "title": "string",              // 必填，最多 200 字
  "description": "string",        // 最多 5000 字
  "background": "string",         // 工作背景/环境描述，最多 500 字
  "projectId": "string",          // 所属项目 ID，默认 "default"
  "priority": "P0|P1|P2|P3",      // 优先级，默认 P2
  "status": "pending|active|done|archived",
  "tags": ["string"],             // 最多 20 个
  "relatedPeople": ["string"],    // 最多 20 个
  "deadline": "ISO8601 | null",
  "reminderDismissed": false,
  "reminderSnoozedUntil": null,
  "estimatedPomodoros": 0,        // 预估番茄数，前端限制 ≤20
  "completedPomodoros": 0,        // 已完成番茄数，番茄钟完成时自动 +1
  "totalFocusMinutes": 0,         // 累计专注分钟数，番茄钟完成时自动累加
  "completedResult": "",          // 完成成果描述
  "completedAt": "ISO8601 | null",
  "inWorkbench": false,           // V5 新增：是否加入工作台
  "noteId": "string | null",      // V5 新增：关联笔记 ID
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**状态流转**：`pending`（新建）→ `active`（开始番茄钟时自动切换）→ `done`（手动完成）

### 3.2 项目 (Project) — projects.json

```jsonc
{
  "id": "uuid",
  "title": "string",              // 必填，最多 100 字
  "description": "string",        // 最多 5000 字
  "relatedPeople": ["string"],    // 最多 20 个
  "color": "#hex",                // 标识色（正则校验格式），前端 8 色预设
  "status": "active|archived",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### 3.3 番茄钟记录 (Pomodoro) — pomodoros.json

```jsonc
{
  "id": "uuid",
  "taskId": "string | null",      // 关联任务（可选）
  "type": "work|break|longbreak",
  "plannedMinutes": 25,           // work=25, break=5, longbreak=15
  "actualMinutes": 0,             // 实际分钟数（扣除暂停时间）
  "pausedMs": 0,                  // 累计暂停毫秒数
  "lastPausedAt": "ISO8601 | null",
  "status": "running|paused|completed|cancelled",
  "startedAt": "ISO8601",
  "endedAt": "ISO8601 | null"
}
```

### 3.4 步骤 (Step) — steps.json

```jsonc
{
  "id": "uuid",
  "taskId": "string",             // 所属任务 ID，必填
  "title": "string",              // 步骤标题，必填，最多 200 字
  "type": "start|step|branch|end", // 步骤类型，默认 "step"
  "status": "pending|active|done", // 状态，默认 "pending"
  "order": 0,                     // 排序序号，自动取最大值 +1
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

步骤类型说明：
- `start`：起始节点（锁定不可拖拽）
- `step`：普通步骤（可拖拽排序）
- `branch`：分支节点，其后续同 order 步骤并排显示
- `end`：结束节点（锁定不可拖拽）

### 3.5 计划条目 (ScheduleItem) — schedule_items.json

```jsonc
{
  "id": "uuid",
  "taskId": "string | null",      // 关联的任务 ID
  "title": "string",              // 计划标题，必填
  "description": "string",        // 描述，最多 500 字
  "date": "YYYY-MM-DD",           // 日期，必填
  "startHour": 9,                 // 开始小时
  "startMinute": 0,               // 开始分钟
  "endHour": 10,                  // 结束小时
  "endMinute": 0,                 // 结束分钟
  "color": "string | null",       // 颜色标识
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### 3.6 笔记 (Note) — notes.json

```jsonc
{
  "id": "uuid",
  "title": "string",              // 笔记标题，默认 "未命名笔记"
  "content": "string",            // Markdown 正文
  "categoryId": "string | null",  // 所属分类 ID
  "linkedTaskIds": ["string"],    // 关联任务 ID 数组（双向关联）
  "pinned": false,                // 是否置顶
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### 3.7 笔记分类 (NoteCategory) — note_categories.json

```jsonc
{
  "id": "uuid",
  "title": "string",              // 分类名称，必填
  "color": "#4A8FBF",             // 分类颜色
  "order": 0,                     // 排序序号
  "createdAt": "ISO8601"
}
```

### 3.8 全局配置 (Config) — config.json

```jsonc
{
  "workStartHour": 9,             // 工作日开始时间（0-23，clamped）
  "workEndHour": 22,              // 工作日结束时间（0-24，clamped）
  "restPeriods": [                // 休息时段
    { "start": 12, "end": 14 },   // 午休
    { "start": 18, "end": 19 }   // 晚餐
  ]
}
```

### 3.9 默认项目

系统启动时自动创建 ID 为 `"default"` 的默认项目（标题："日常工作"）。未指定项目的任务自动归入此项目。默认项目不可删除。

---

## 4. API 设计

所有接口返回 JSON，错误时返回 `{ error: "message" }`，HTTP 状态码 400/404/500。

### 4.1 任务 API — `/api/tasks`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 任务列表（?status=&projectId=&priority=&keyword=），按优先级→截止时间排序 |
| GET | `/reminders/list` | 获取需要提醒的任务（截止时间 ≤ 1 小时后，未完成/未归档/未屏蔽） |
| GET | `/:id` | 获取单个任务 |
| POST | `/` | 创建任务（标题必填≤200字），支持 background、inWorkbench 等新字段 |
| PUT | `/:id` | 更新任务（白名单字段过滤，含 inWorkbench、noteId） |
| DELETE | `/:id` | 删除任务 |
| POST | `/:id/complete` | 完成任务（body: completedResult） |
| POST | `/:id/dismiss-reminder` | 屏蔽提醒 |
| POST | `/:id/snooze-reminder` | 延迟提醒（body: until） |

更新白名单：`title, description, background, projectId, priority, status, tags, relatedPeople, deadline, reminderDismissed, reminderSnoozedUntil, estimatedPomodoros, completedPomodoros, totalFocusMinutes, inWorkbench, noteId`

### 4.2 项目 API — `/api/projects`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 项目列表（?status=），附带 taskCount / doneCount / progress |
| POST | `/` | 创建项目（标题必填≤100字，颜色格式正则校验） |
| PUT | `/:id` | 更新项目（白名单字段过滤） |
| DELETE | `/:id` | 删除项目（默认项目不可删，关联任务迁移到默认项目） |

### 4.3 番茄钟 API — `/api/pomodoros`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/start` | 开始番茄钟（body: taskId, type），自动取消前一个进行中的 |
| PUT | `/:id/pause` | 暂停（服务器端计算实际分钟数） |
| PUT | `/:id/resume` | 继续（服务器端累加暂停时长） |
| PUT | `/:id/stop` | 停止（body: completed），完成时自动累加任务的番茄数和专注时长 |
| GET | `/current` | 获取当前番茄钟（running 或 paused） |
| GET | `/history` | 获取历史（?taskId=&date=），仅已完成的记录 |

### 4.4 统计 API — `/api/stats`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/dashboard` | 仪表盘：todayDoneCount / todayPendingCount / todayPomodoroCount / todayFocusMinutes / streak / weeklyFocus[7] |
| GET | `/review` | 回顾数据（?period=today\|week\|month\|month30\|halfyear\|year\|custom&start=&end=），含 byProject / byPriority 分组 |
| GET | `/export` | 导出全部数据为 JSON（Content-Disposition 触发下载） |
| POST | `/import` | 导入数据（body: mode=merge\|overwrite, data），校验 key 和数组格式 |

### 4.5 步骤 API — `/api/steps`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取某任务的步骤列表，`?taskId=` 必填，按 order 排序 |
| POST | `/` | 创建步骤（body: taskId, title, type?, status?, order?），类型/状态校验枚举值 |
| PUT | `/:id` | 更新步骤（白名单: title, type, status, order） |
| DELETE | `/:id` | 删除步骤 |
| PUT | `/reorder/batch` | 批量更新排序（body: { items: [{ id, order }] }） |

### 4.6 计划表 API — `/api/schedule`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 按日期范围查询，`?start=&end=` 过滤，按日期 + startHour 排序 |
| POST | `/` | 创建计划条目 |
| PUT | `/:id` | 更新计划条目（白名单: title, description, taskId, date, startHour, startMinute, endHour, endMinute, color） |
| POST | `/copy-week` | 复制上周计划到本周（body: fromWeekStart, toWeekStart），先删除目标周数据再复制 |
| DELETE | `/:id` | 删除计划条目 |

### 4.7 笔记 API — `/api/notes`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 列表查询（?categoryId=&keyword=），置顶优先 + 更新时间倒序 |
| GET | `/:id` | 获取单条笔记 |
| POST | `/` | 新建笔记（body: title, content, categoryId, linkedTaskIds, pinned） |
| PUT | `/:id` | 更新笔记（白名单: title, content, categoryId, linkedTaskIds, pinned） |
| DELETE | `/:id` | 删除笔记，同时清理关联任务中的 noteId |

### 4.8 笔记分类 API — `/api/note-categories`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取所有分类，按 order 排序 |
| POST | `/` | 新建分类（body: title, color?, order?），order 自动取最大值 +1 |
| PUT | `/:id` | 更新分类（白名单: title, color, order） |
| DELETE | `/:id` | 删除分类，该分类下所有笔记的 categoryId 置 null |

### 4.9 全局配置 API — `/api/config`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 获取配置，未初始化时返回默认值 |
| PUT | `/` | 更新配置（workStartHour/workEndHour clamped，restPeriods 过滤无效项） |

---

## 5. 数据存储层

`server/store/base.js` — `createStore(fileName)` 工厂函数：

- **读写**：`getAll` / `getById` / `create` / `update` / `delete` / `query(filterFn)` / `replaceAll`
- **并发安全**：`withLock(fileName, fn)` — Promise 链式锁，同一文件写操作串行化
- **原子写入**：`safeWrite` — 先写 `.tmp` 文件，再 rename（Windows 兼容：rename 失败时降级为 copyFile + unlink）
- **容灾**：JSON 解析失败时自动备份损坏文件为 `.bak`，返回默认值

> 注：config.js 路由直接读写 `config.json`，不走 `createStore` 抽象层。

---

## 6. 前端架构

### 6.1 视图切换

无 vue-router。`App.vue` 通过 `currentView` ref + `v-if` 切换 8 个视图。数字键 `1`-`8` 全局切换，输入框内自动忽略。`?` 打开快捷键帮助面板，`Esc` 关闭弹窗。

**视图映射表**：

| 快捷键 | 视图 | 说明 |
|--------|------|------|
| `1` | tasks | 任务管理 |
| `2` | projects | 项目管理 |
| `3` | pomodoro | 番茄钟 |
| `4` | stats | 统计仪表盘 |
| `5` | review | 工作回顾 |
| `6` | workbench | 工作台（泳道流程图） |
| `7` | schedule | 计划表（周/月视图） |
| `8` | notes | 笔记（Markdown 编辑器） |

### 6.2 跨组件通信

`App.vue` 使用 Vue 3 `provide/inject` 暴露全局操作：

- `provide('openTaskCreate', opts)` — 打开任务创建弹窗（支持预填字段）
- `provide('navigateToNote', noteId)` — 跳转到笔记页并打开指定笔记

子组件通过 `inject()` 获取这些方法。

### 6.3 API 调用

`useApi()` 返回 `{ get, post, put, del }`，基于 fetch 封装。Vite dev 模式下通过 proxy 转发 `/api` 到 `localhost:3210`。响应有 `content-disposition` 头时返回原始 Response（用于文件下载）。

### 6.4 组件树

```
App.vue
├── AppHeader         # Logo、深色/浅色切换、Electron 窗口控制（─ □ ✕）
├── Sidebar           # 8 项导航 + 提醒列表（60s 轮询）+ 快捷键提示
├── Toast             # 全局消息通知（4 种类型，3s 自动消失）
├── ShortcutHelp      # 快捷键帮助面板（? 键触发）
├── TaskCreateModal   # 全局任务创建弹窗（provide 暴露）
└── 当前视图 (v-if)
    ├── TaskView      # 含 Modal、ConfirmDialog、筛选/排序
    ├── ProjectView   # 含 Modal、8 色选择器、ConfirmDialog
    ├── PomodoroView  # SVG 环形进度条、ConfirmDialog
    ├── StatsView     # 5 张数据卡片 + 7 天柱状图
    ├── ReviewView    # 7 时段 Tab + 自定义日期
    ├── WorkbenchView # 泳道布局 + StepNode 流程图 + ContextMenu
    ├── ScheduleView  # 周/月视图 + 拖拽调度 + 配置弹窗
    └── NoteView      # 双栏 Markdown 编辑/预览 + CategoryTabs + MarkdownViewer + ThemeConfigModal
```

### 6.5 公共组件

| 组件 | 说明 |
|------|------|
| **Modal** | Teleport to body，v-model 控制，backdrop 模糊，scaleIn 动画，支持 title/width/footer slot |
| **ConfirmDialog** | Promise 式 API，`ref.show(msg)` 返回 `Promise<boolean>` |
| **Toast** | reactive 数组驱动，TransitionGroup 动画，4 种类型（info/success/error/warning） |
| **ShortcutHelp** | 快捷键帮助面板，`?` 键触发，v-model 控制显示 |
| **TaskCreateModal** | 任务创建/编辑弹窗，含全部字段表单，通过 `inject('openTaskCreate')` 暴露 |
| **MarkdownViewer** | Markdown 渲染组件，支持 marked 渲染 + 自定义主题 CSS |
| **ThemeConfigModal** | 笔记主题配置弹窗，4 套预设主题 + 自定义主题编辑器 |
| **StepNode** | 步骤流程节点组件，支持拖拽排序、状态切换、内联编辑 |
| **ContextMenu** | 右键菜单组件，Teleport 渲染，自动屏幕边界检测，Promise 式 API |

### 6.6 主题系统

- **全局主题**：CSS Variables 在 `:root`（浅色）和 `.dark`（深色）定义全套设计 token
- **切换机制**：`isDark` ref 驱动 `document.documentElement.classList.toggle('dark')`
- **持久化**：偏好存储到 `localStorage`，支持跟随系统 `prefers-color-scheme`
- **笔记主题**：独立于全局主题，4 套预设（暖色工作室 / GitHub 风格 / 极简黑白 / 深色沉浸）+ 自定义主题（字体、字号、行高、标题/代码/引用样式），存储在 localStorage

---

## 7. 功能详情

### 7.1 任务管理

- 新建表单：标题(必填)、描述、工作背景、项目、优先级(P0-P3)、截止时间、预估番茄数(≤20)、标签(逗号分隔)、关联人员(逗号分隔)、关联笔记
- 列表过滤：关键词搜索(300ms 防抖)、状态/项目/优先级下拉
- 排序：P0→P1→P2→P3，同优先级按截止时间升序
- 卡片信息：标题、优先级徽标、描述预览(单行)、项目名、截止时间、番茄进度、标签(蓝)、人员(橙)
- 过期任务：红色左边框高亮
- 已完成任务：半透明、标题删除线、不可点击编辑
- 完成流程：勾选 → 弹出工作成果对话框 → 确认完成
- 删除需 ConfirmDialog 确认
- **V5 新增**：可设置工作背景字段，可加入工作台，可关联笔记

### 7.2 项目管理

- 卡片网格：顶部色条、标题、编辑/删除按钮(hover 显示)、描述(最多 2 行)、进度条、任务统计(N/M)
- 新建/编辑含 8 色选择器
- 删除时提示关联任务将迁移到默认项目
- 默认项目不可删除

### 7.3 番茄钟

- 经典模式：work 25min → break 5min（每 4 个 → longbreak 15min）
- SVG 环形进度条，线性 stroke-dashoffset 动画
- 运行中：页面标题实时同步倒计时和任务名
- 开始新番茄钟时自动取消前一个进行中的
- 暂停/恢复：暂停时在服务器端计算实际时长，恢复时累加暂停时长，失败回滚 UI 状态
- 放弃需 ConfirmDialog 确认
- 完成时自动累加关联任务的 completedPomodoros 和 totalFocusMinutes
- 关联任务状态自动从 pending 切换为 active
- 侧栏统计：今日番茄数点阵、今日专注分钟、今日完成数

### 7.4 统计仪表盘

- 5 张数据卡片：今日完成、待办任务、今日番茄、今日专注(分钟)、连续天数(上限365)
- streak 计算：当天无完成从昨天起算，逐日回溯
- 最近 7 天专注时长柱状图（渐变色柱体，无数据时显示空状态提示）
- 底部快速跳转回顾页

### 7.5 工作回顾

- 7 个时段 Tab：今日/近7天/本月/近30天/半年/全年/自定义
- 自定义：起止日期选择器，前端校验（开始≤结束，非空）
- 摘要：完成任务数、番茄数、专注时长
- 完成列表：每项显示标题、工作成果、所属项目、完成时间、专注分钟
- 分组统计：按项目/按优先级

### 7.6 工作提醒

- 截止时间 ≤ 1 小时且未完成/未屏蔽/未延迟的任务
- 侧栏底部展示，60 秒轮询刷新
- 操作：开始（跳转番茄钟并选中任务）、忽略（dismiss）、延迟（snooze）

### 7.7 数据导出/导入

- 导出：GET `/api/stats/export`，返回含 version/exportedAt/tasks/projects/pomodoros 的 JSON，触发浏览器下载
- 导入：POST `/api/stats/import`，支持 merge（按 ID 去重追加）和 overwrite（全量替换，保留默认项目）

### 7.8 工作台（V5 新增）

泳道式并行工作台，将任务拆解为步骤流程图。

**任务管理**：
- 添加/移除：从所有任务列表选择加入工作台（设置 `inWorkbench: true`），或移出
- 右键菜单：编辑任务、移出工作台、关联笔记跳转

**步骤流程图**：
- 四种节点类型：`start`（起始，锁定）、`step`（普通步骤）、`branch`（分支，子步骤并排）、`end`（结束，锁定）
- 节点渲染：拖拽手柄（⠿，start/end 显示锁图标）、类型标签（不同颜色 badge）、状态切换按钮、行内编辑标题
- 流程块：同类型连续步骤组成一个流程块，分支步骤展开为并行行
- 已完成折叠：连续多个 `done` 步骤折叠为 "N 步已完成，点击展开"

**拖拽交互**：
- 步骤节点间拖拽重排顺序
- 连接线区域拖放插入新步骤（整行宽拖放目标）
- 分支行内也可拖放
- 拖拽过程有视觉反馈（drag-over/drag-leave 样式）

**状态管理**：
- 点击切换 done/pending
- `active` 状态自动标记第一个未完成的步骤
- 一键全部完成：任务所有步骤标记为 done
- 快速添加：在末尾前（end 前）快速插入新步骤
- 折叠已完成：全局开关或单任务独立折叠

### 7.9 计划表（V5 新增）

基于日历的时间调度，支持周视图和月视图。

**周视图**：
- 7 列时间网格：时间轴（左侧）+ 每天一列
- 可视范围：`workStartHour` 到 `workEndHour`（从全局配置读取）
- 休息时段遮罩：灰色半透明覆盖层（从 `restPeriods` 读取）
- 条目渲染：按起止时间计算 top 和 height 定位
- 冲突检测：多条目同时间段自动计算列宽，并排显示
- 拖拽调度：条目可在同天/跨天拖拽移动，底部手柄拖拽调整时长（30 分钟步进）
- 关联任务：有关联任务的条目显示 `has-task` 样式

**月视图**：
- 标准 42 格日历
- 每天分三个区域：上午（<12点）/ 下午（12-18点）/ 晚上（≥18点）
- 点击单元格或区域快速新增

**工具栏**：
- 周/月切换、当前时间显示、周/月前后导航
- 复制上周：一键将上周全部计划按日期偏移（+7天）复制到本周，先清空本周数据
- 配置：设置工作起止时间和休息时段
- 新增计划：打开创建弹窗

### 7.10 笔记（V5 新增）

Markdown 知识库，支持分类管理和富文本编辑。

**双栏布局**：
- 左侧：笔记列表卡片 + 分类标签栏
- 右侧：Markdown 编辑器

**分类管理**：
- 顶部标签栏按分类筛选，支持"全部"/"未分类"视图
- 右键菜单：编辑分类名称/颜色、重排顺序、删除
- 新建分类弹窗
- 删除分类时联级清空笔记归属

**编辑器功能**：
- 标题输入（变更自动保存）
- Markdown 源码编辑（防抖自动保存）
- 阅读/编辑模式切换
- 双栏实时预览（源码 + MarkdownViewer 同步渲染）
- Mermaid 图表渲染
- 格式化功能：自动格式化 Markdown 源码
- 空白字符可视化：显示空格/换行标记
- 操作栏：置顶、关联任务、删除

**关联任务**：
- 弹窗搜索并勾选任务双向关联
- 笔记卡片显示关联任务数
- 点击任务 badge 可跳转到任务视图
- 删除笔记时清理所有关联任务的 noteId

**主题配置**（ThemeConfigModal）：
- 4 套预设主题：暖色工作室、GitHub 风格、极简黑白、深色沉浸
- 自定义主题：可配置字体、字号、行高、标题颜色/字号、代码块背景/字体、引用块样式、链接颜色等
- 实时预览编辑效果
- 主题设置存储在 localStorage

---

## 8. 界面设计

### 8.1 布局

```
┌──────────────────────────────────────────────────────┐
│  🍅 Tomato                              🌙  — □ ✕   │  ← 顶栏 54px
├──────────┬───────────────────────────────────────────┤
│  📋 任务  │                                           │
│  📁 项目  │                                           │
│  🍅 专注  │         主内容区域                         │
│  📊 统计  │   （8 个视图按需切换）                       │
│  📝 回顾  │                                           │
│  🖥️ 工作台│                                           │
│  📅 计划表│                                           │
│  📒 笔记  │                                           │
│──────────│                                           │
│ ⚠️ 提醒  │                                           │
└──────────┴───────────────────────────────────────────┘
  侧栏 236px
```

### 8.2 Warm Studio 设计系统

- **浅色**：背景 `#FBF8F4`，卡片 `#FFFFFF`，主色 `#D94F3B`（番茄红）
- **深色**：背景 `#0A0A0A`，卡片 `#1C1C1C`，主色 `#E8634F`（亮红）
- **字体**：标题 Georgia 衬线体，正文系统字体栈，等宽 SF Mono
- **圆角**：6px(sm) / 10px(md) / 14px(lg) / 20px(xl)
- **间距**：4px 基础栅格（sp-1=4px ~ sp-16=64px）
- **动画**：fadeIn / slideUp / scaleIn / toastIn/Out，spring 缓动
- **质感**：全局面包屑纹理 overlay（SVG noise filter）
- **响应式**：≤768px 时侧栏缩窄至 60px

---

## 9. 安全设计

- 仅监听 `localhost:3210`，不暴露到局域网
- 安全响应头：`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`
- 输入校验：标题长度限制、标签/人员数量截断、颜色格式正则校验、状态白名单、步骤类型/状态枚举校验、搜索关键词截断
- 数据写入：临时文件 + rename 安全写入策略（Windows 兼容降级）
- 并发保护：`withLock` Promise 链式锁
- 数据备份：JSON 解析失败时自动备份 `.bak`
- 导入数据：仅允许 tasks/projects/pomodoros 三个 key，且必须为数组
- Electron 离线运行：vendor 目录存放离线依赖，不请求任何 CDN

---

## 10. 快捷键

| 快捷键 | 功能 |
|--------|------|
| `1` - `8` | 切换视图（任务/项目/专注/统计/回顾/工作台/计划表/笔记） |
| `?` | 显示快捷键帮助面板 |
| `Esc` | 关闭弹窗 / 关闭帮助面板 |

> 在 input/textarea/select/contentEditable 元素内按键不会触发快捷键。

---

## 11. 模块间关联关系

```
Config (config.json)
  │
  └──→ ScheduleView (工作时段/休息时段)
        │
        └──→ schedule_items ──→ taskId ──→ Task (tasks.json)
                                              │
              ┌───────────────────────────────┤
              │                               │
              ▼                               ▼
        WorkbenchView                    PomodoroView
              │                               │
              └──→ steps (steps.json)         └──→ pomodoros (pomodoros.json)
              │
              └──→ Task.inWorkbench ◄──────── Task.background
                                               Task.noteId
                                                   │
                                                   ▼
                                              NoteView
                                                   │
                                                   ├──→ notes (notes.json)
                                                   │     └──→ linkedTaskIds
                                                   │
                                                   └──→ note_categories (note_categories.json)

TaskView ──→ TaskCreateModal (全局弹窗，provide 注入)
         ──→ projects (projects.json)
         ──→ NoteView (navigateToNote，关联跳转)

StatsView ←── tasks + pomodoros (数据聚合)
ReviewView ←── tasks + pomodoros (按日期范围查询)
```

---

## 12. 一键脚本

| 脚本 | 平台 | 说明 |
|------|------|------|
| `install.sh` / `install.bat` | 全平台 | npm install 安装依赖 |
| `start.sh` / `start.bat` | 全平台 | 构建 + 启动 Electron 桌面应用 |
| `build.sh` / `build.bat` | 全平台 | 仅构建前端资源 |
| `start.vbs` | Windows | VBS 无黑窗启动 |
| `env-setup.sh` / `env-setup.bat` | 全平台 | 一键安装 Node.js 18+ 环境 |
