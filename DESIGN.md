# Tomato - 个人工作跟踪与番茄钟系统 设计文档

## 1. 项目概述

### 1.1 定位

一款本地运行的**个人工作助理**，集成任务管理、番茄钟专注、工作回顾、数据统计四大核心能力，可打包为独立桌面应用。

### 1.2 核心原则

- **纯本地运行**：所有数据存储在本地 JSON 文件，不与任何网络服务交互
- **双模式启动**：支持浏览器模式和 Electron 桌面应用模式
- **界面优先**：现代化 UI，支持深色/浅色主题（Warm Studio 设计系统）
- **安全可控**：仅使用 MIT 许可证的开源依赖，输入校验完善

---

## 2. 技术架构

### 2.1 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 运行时 | Node.js >= 18 | 唯一运行时依赖 |
| 桌面端 | Electron 35 | 无边框窗口 + 系统托盘 |
| 后端 | Express.js | 轻量 HTTP 服务，内嵌于 Electron |
| 前端 | Vue 3 (SPA) | 组合式 API + 响应式组件，无 vue-router |
| 样式 | 原生 CSS + CSS Variables | 自定义设计系统，支持主题切换 |
| 存储 | JSON 文件 | 本地文件系统，按模块拆分 |
| 构建 | Vite | 开发热更新 + 生产构建 |
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
│   │   └── stats.js           # 统计 API
│   └── store/
│       └── base.js            # JSON 数据存储层（读写锁 + 安全写入）
├── src/                       # Vue 前端（Vite root）
│   ├── index.html             # HTML 入口
│   ├── main.js                # Vue 应用入口
│   ├── App.vue                # 根组件（主题/视图切换/快捷键）
│   ├── assets/
│   │   └── main.css           # 全局样式（设计系统 + 组件样式）
│   ├── components/
│   │   ├── common/            # 通用组件（Modal / Toast / ConfirmDialog / ShortcutHelp）
│   │   └── layout/            # 布局组件（AppHeader / Sidebar）
│   ├── composables/
│   │   ├── useApi.js          # HTTP 请求封装
│   │   └── useToast.js        # 消息通知组合式函数
│   └── views/
│       ├── TaskView.vue       # 任务管理
│       ├── ProjectView.vue    # 项目管理
│       ├── PomodoroView.vue   # 番茄钟
│       ├── StatsView.vue      # 统计仪表盘
│       └── ReviewView.vue     # 工作回顾
├── data/                      # 用户数据（运行时自动生成，已 gitignore）
├── dist/                      # 前端构建产物（已 gitignore）
├── package.json
├── vite.config.js
└── .npmrc                     # 华为云镜像源配置
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
  → 启动 Express 服务器
  → Vite middleware 模式（HMR，无需构建）
  → 初始化默认项目
  → 自动打开浏览器访问 http://localhost:3210
```

---

## 3. 数据模型

### 3.1 任务 (Task)

```jsonc
{
  "id": "uuid",
  "title": "string",              // 必填，最多 200 字
  "description": "string",        // 最多 5000 字
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
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**状态流转**：`pending`（新建）→ `active`（开始番茄钟时自动切换）→ `done`（手动完成）

### 3.2 项目 (Project)

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

### 3.3 番茄钟记录 (Pomodoro)

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

### 3.4 默认项目

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
| POST | `/` | 创建任务（标题必填≤200字，状态初始为 pending） |
| PUT | `/:id` | 更新任务（白名单字段过滤，校验 status 合法值） |
| DELETE | `/:id` | 删除任务 |
| POST | `/:id/complete` | 完成任务（body: completedResult） |
| POST | `/:id/dismiss-reminder` | 屏蔽提醒（设置 reminderDismissed=true） |
| POST | `/:id/snooze-reminder` | 延迟提醒（body: until，必须在未来时间） |

### 4.2 项目 API — `/api/projects`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 项目列表（?status=），附带 taskCount / doneCount / progress（百分比） |
| POST | `/` | 创建项目（标题必填≤100字，颜色格式正则校验） |
| PUT | `/:id` | 更新项目（白名单字段过滤） |
| DELETE | `/:id` | 删除项目（不可删除默认项目，关联任务自动迁移到默认项目） |

### 4.3 番茄钟 API — `/api/pomodoros`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/start` | 开始番茄钟（body: taskId, type），自动取消前一个进行中的番茄钟 |
| PUT | `/:id/pause` | 暂停（服务器端计算实际分钟数） |
| PUT | `/:id/resume` | 继续（服务器端累加暂停时长） |
| PUT | `/:id/stop` | 停止（body: completed），完成时自动累加任务的番茄数和专注时长 |
| GET | `/current` | 获取当前番茄钟（running 或 paused） |
| GET | `/history` | 获取历史（?taskId=&date=），仅返回已完成的记录 |

### 4.4 统计 API — `/api/stats`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/dashboard` | 仪表盘：todayDoneCount / todayPendingCount / todayPomodoroCount / todayFocusMinutes / streak / weeklyFocus[7] |
| GET | `/review` | 回顾数据（?period=today\|week\|month\|month30\|halfyear\|year\|custom&start=&end=），含 byProject / byPriority 分组统计 |
| GET | `/export` | 导出全部数据为 JSON（Content-Disposition 触发下载） |
| POST | `/import` | 导入数据（body: mode=merge\|overwrite, data），校验 key 和数组格式 |

---

## 5. 数据存储层

`server/store/base.js` — `createStore(fileName)` 工厂函数：

- **读写**：`getAll` / `getById` / `create` / `update` / `delete` / `query(filterFn)` / `replaceAll`
- **并发安全**：`withLock(fileName, fn)` — Promise 链式锁，同一文件写操作串行化
- **原子写入**：`safeWrite` — 先写 `.tmp` 文件，再 rename（Windows 兼容：rename 失败时降级为 copyFile + unlink）
- **容灾**：JSON 解析失败时自动备份损坏文件为 `.bak`，返回默认值

---

## 6. 前端架构

### 6.1 视图切换

无 vue-router。`App.vue` 通过 `currentView` ref + `v-if` 切换 5 个视图。数字键 `1`-`5` 全局切换，输入框内自动忽略。`?` 打开快捷键帮助面板。

### 6.2 API 调用

`useApi()` 返回 `{ get, post, put, del }`，基于 fetch 封装。Vite dev 模式下通过 proxy 转发 `/api` 到 `localhost:3210`。响应有 `content-disposition` 头时返回原始 Response（用于文件下载）。

### 6.3 组件树

```
App.vue
├── AppHeader        # Logo、深色/浅色切换、Electron 窗口控制（─ □ ✕）
├── Sidebar          # 5 项导航 + 提醒列表（60s 轮询）+ 快捷键提示
├── Toast            # 全局消息通知（success/error/warning，3s 自动消失）
├── ShortcutHelp     # 快捷键帮助面板（? 键触发）
└── 当前视图 (v-if)
    ├── TaskView     # 含 Modal（新建/编辑）、ConfirmDialog
    ├── ProjectView  # 含 Modal（新建/编辑）、ColorPicker、ConfirmDialog
    ├── PomodoroView # 含 ConfirmDialog（放弃确认）
    ├── StatsView    # 无弹窗
    └── ReviewView   # 无弹窗
```

### 6.4 公共组件

- **Modal**：Teleport to body，v-model 控制显示，backdrop 模糊，scaleIn 动画，支持 title/width/footer slot
- **ConfirmDialog**：Promise 式 API，`ref.show(msg)` 返回 `Promise<boolean>`
- **Toast**：reactive 数组驱动，TransitionGroup 动画，4 种类型（info/success/error/warning）

### 6.5 主题系统

CSS Variables 定义在 `:root`（浅色）和 `.dark`（深色），覆盖颜色、阴影、间距等全套设计 token。`isDark` ref 驱动 `document.documentElement.classList.toggle('dark')`，偏好持久化到 `localStorage`，支持跟随系统 `prefers-color-scheme`。

---

## 7. 功能详情

### 7.1 任务管理

- 新建表单：标题(必填)、描述、项目、优先级、截止时间、预估番茄数(≤20)、标签(逗号分隔)、关联人员(逗号分隔)
- 列表过滤：关键词搜索(300ms 防抖)、状态/项目/优先级下拉
- 排序：P0→P1→P2→P3，同优先级按截止时间升序
- 卡片信息：标题、优先级徽标、描述预览(单行)、项目名、截止时间、番茄进度、标签(蓝)、人员(橙)
- 过期任务：红色左边框高亮
- 已完成任务：半透明、标题删除线、不可点击编辑
- 完成流程：勾选 → 弹出工作成果对话框 → 确认完成
- 删除需 ConfirmDialog 确认

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
- 侧栏统计：今日番茄数 🍅 点阵、今日专注分钟、今日完成数

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

### 7.6 工作提醒

- 截止时间 ≤ 1 小时且未完成/未屏蔽/未延迟的任务
- 侧栏底部展示，60 秒轮询刷新
- 操作：开始（跳转番茄钟并选中任务）、忽略（dismiss）

### 7.7 数据导出/导入

- 导出：GET `/api/stats/export`，返回包含 version/exportedAt/tasks/projects/pomodoros 的 JSON，触发浏览器下载
- 导入：POST `/api/stats/import`，支持 merge（按 ID 去重追加）和 overwrite（全量替换，保留默认项目）

---

## 8. 界面设计

### 8.1 布局

```
┌──────────────────────────────────────────────────────┐
│  🍅 Tomato                              🌙  — □ ✕   │  ← 顶栏 54px
├──────────┬───────────────────────────────────────────┤
│  📋 任务  │                                           │
│  📁 项目  │         主内容区域                         │
│  🍅 专注  │   （任务列表 / 项目 / 番茄钟 / 统计 / 回顾） │
│  📊 统计  │                                           │
│  📝 回顾  │                                           │
│──────────│                                           │
│ 提醒区域  │                                           │
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
- 输入校验：标题长度限制、标签/人员数量截断、颜色格式正则校验、状态白名单、搜索关键词截断
- 数据写入：临时文件 + rename 安全写入策略（Windows 兼容降级）
- 并发保护：`withLock` Promise 链式锁
- 数据备份：JSON 解析失败时自动备份 `.bak`
- 导入数据：仅允许 tasks/projects/pomodoros 三个 key，且必须为数组

---

## 10. 快捷键

| 快捷键 | 功能 |
|--------|------|
| `1` - `5` | 切换视图（任务/项目/专注/统计/回顾） |
| `?` | 显示快捷键帮助面板 |
| `Esc` | 关闭弹窗 / 关闭帮助面板 |

> 在 input/textarea/select/contentEditable 元素内按键不会触发快捷键。

---

## 11. 依赖清单

| 包名 | 用途 | 许可证 |
|------|------|--------|
| express | HTTP 服务框架 | MIT |
| vue | 前端框架 | MIT |
| vite | 前端构建工具 | MIT |
| uuid | UUID 生成 | MIT |
| @vitejs/plugin-vue | Vite Vue 插件 | MIT |
| electron | 桌面应用框架 | MIT |
| electron-builder | 应用打包工具 | MIT |

> 所有依赖均为 MIT 许可证。

---

## 12. 新功能规划

<!-- TODO: 在此填写新功能和设计 -->
