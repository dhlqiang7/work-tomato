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
| 前端 | Vue 3 (SPA) | 组合式 API + 响应式组件 |
| 样式 | 原生 CSS + CSS Variables | 自定义设计系统，支持主题切换 |
| 存储 | JSON 文件 | 本地文件系统，按模块拆分 |
| 构建 | Vite | 开发热更新 + 生产构建 |
| 打包 | electron-builder | 输出 .exe / .dmg / .AppImage |

### 2.2 项目结构

```
tomato/
├── electron/                  # Electron 主进程
│   ├── main.js                # 窗口创建、系统托盘、内嵌 Express
│   ├── preload.cjs            # 渲染进程 API 桥接（窗口控制）
│   ├── icon.ico               # Windows 图标
│   └── icon.png               # macOS/Linux 图标
├── server/                    # Express 后端
│   ├── index.js               # 服务器入口，初始化默认项目
│   ├── routes/
│   │   ├── tasks.js           # 任务 API（CRUD + 完成 + 提醒）
│   │   ├── projects.js        # 项目 API（CRUD + 删除迁移）
│   │   ├── pomodoros.js       # 番茄钟 API（开始/暂停/停止/历史）
│   │   └── stats.js           # 统计 API（仪表盘/回顾/导出导入）
│   └── store/
│       └── base.js            # JSON 数据存储层（读写锁 + 安全写入）
├── src/                       # Vue 前端
│   ├── index.html             # HTML 入口
│   ├── main.js                # Vue 应用入口
│   ├── App.vue                # 根组件（主题/路由/快捷键）
│   ├── assets/
│   │   └── main.css           # 全局样式（设计系统 + 组件样式）
│   ├── components/
│   │   ├── common/            # 通用组件
│   │   │   ├── Modal.vue      # 弹窗容器
│   │   │   ├── Toast.vue      # 消息通知
│   │   │   ├── ConfirmDialog.vue  # 确认对话框
│   │   │   └── ShortcutHelp.vue   # 快捷键帮助面板
│   │   └── layout/
│   │       ├── AppHeader.vue  # 顶栏（Logo + 主题切换 + 窗口控制）
│   │       └── Sidebar.vue    # 侧边栏（导航 + 提醒）
│   ├── composables/
│   │   ├── useApi.js          # HTTP 请求封装
│   │   └── useToast.js        # 消息通知组合式函数
│   └── views/
│       ├── TaskView.vue       # 任务管理页
│       ├── ProjectView.vue    # 项目管理页
│       ├── PomodoroView.vue   # 番茄钟页
│       ├── StatsView.vue      # 统计仪表盘页
│       └── ReviewView.vue     # 工作回顾页
├── data/                      # 用户数据（运行时自动生成，已 gitignore）
├── dist/                      # 前端构建产物（已 gitignore）
├── package.json
├── vite.config.js
├── README.md
├── LICENSE
├── .npmrc                     # 华为云镜像源配置
├── .gitignore
├── install.sh / install.bat   # 安装脚本
├── start.sh / start.bat       # 启动脚本
└── build.sh / build.bat       # 打包脚本
```

### 2.3 启动流程

**桌面模式（推荐）：**
```
用户执行 start.sh / start.bat
  → npm install（首次）
  → npx vite build（首次）
  → npx electron .
    → Electron 主进程启动
    → 内嵌启动 Express 服务器（localhost:3210）
    → BrowserWindow 加载 http://localhost:3210
    → 创建系统托盘图标
```

**浏览器模式：**
```
用户执行 node server/index.js
  → 启动 Express 服务器
  → 初始化默认项目
  → 自动打开浏览器访问 http://localhost:3210
```

---

## 3. 数据模型

### 3.1 任务 (Task)

```jsonc
{
  "id": "uuid",                   // 唯一标识
  "title": "string",              // 任务标题（必填，最多 200 字）
  "description": "string",        // 任务描述（最多 5000 字）
  "projectId": "string",          // 所属项目 ID，默认 "default"
  "priority": "P0|P1|P2|P3",      // 优先级，默认 P2
  "status": "pending|active|done|archived",
  "tags": ["string"],             // 标签列表（最多 20 个）
  "relatedPeople": ["string"],    // 关联人员（最多 20 个）
  "deadline": "ISO8601 | null",   // 截止时间
  "reminderDismissed": false,
  "reminderSnoozedUntil": null,
  "estimatedPomodoros": 0,        // 预估番茄数
  "completedPomodoros": 0,        // 已完成番茄数
  "totalFocusMinutes": 0,         // 累计专注分钟数
  "completedResult": "string",    // 完成成果描述
  "completedAt": "ISO8601 | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### 3.2 项目 (Project)

```jsonc
{
  "id": "uuid",
  "title": "string",              // 项目标题（必填，最多 100 字）
  "description": "string",        // 项目描述（最多 5000 字）
  "relatedPeople": ["string"],    // 关联人员
  "color": "#hex",                // 标识色（正则校验格式）
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
  "type": "work|break|longbreak", // 类型
  "plannedMinutes": 25,           // 计划时长（25/5/15）
  "actualMinutes": 0,             // 实际专注分钟数
  "pausedMs": 0,                  // 累计暂停毫秒数
  "lastPausedAt": "ISO8601 | null",
  "status": "running|paused|completed|cancelled",
  "startedAt": "ISO8601",
  "endedAt": "ISO8601 | null"
}
```

### 3.4 默认项目

系统启动时自动创建 ID 为 `"default"` 的默认项目（标题："日常工作"），未指定项目的任务自动归入此项目。

---

## 4. 功能设计

### 4.1 任务管理

**新建任务**：必填标题，选填描述、所属项目、优先级、截止时间、预估番茄数、标签、关联人员。

**任务列表**：
- 默认按优先级排序（P0 → P3），同优先级按截止时间升序
- 支持按状态、项目、优先级下拉筛选
- 支持关键词搜索（标题 + 描述，300ms 防抖）
- 过期任务红色高亮标记
- 任务描述在标题下方单行灰色预览
- 关联人员以橙色标签展示，与蓝色标签样式一致

**编辑 & 完成**：
- 点击任务卡片打开编辑弹窗（已完成的任务不可编辑）
- 完成任务弹出"工作成果"对话框
- 删除前弹出确认对话框

### 4.2 项目管理

- 卡片式展示，显示标题、任务统计、进度条
- 删除项目时自动迁移关联任务到默认项目
- 项目颜色格式校验

### 4.3 番茄钟

**经典模式（25/5/15）**：
- 工作阶段 25 分钟，短休息 5 分钟，长休息 15 分钟（每 4 个番茄后）
- 环形 SVG 进度条动画
- 侧栏显示今日番茄数、专注时长、完成数

**操作**：开始新番茄钟时自动取消前一个进行中的番茄钟；支持暂停/恢复（状态回滚保护）；放弃需确认。

**计时**：浏览器标签页标题实时显示倒计时和任务名。

### 4.4 统计仪表盘

- 今日/本周完成数、专注时长
- 连续工作天数（streak，当天无完成则从昨天起算）
- 本周每日专注时长柱状图
- 支持跳转回顾页

### 4.5 工作回顾

- 支持时段：今日/近7天/本月/近30天/半年/全年/自定义
- 统计摘要：完成任务数、番茄数、专注时长
- 完成任务列表（含成果描述和所属项目）

### 4.6 工作提醒

- 截止时间 1 小时内触发提醒
- 支持操作：开始工作、延迟提醒、不再提醒
- 侧边栏底部展示提醒列表

### 4.7 主题切换

- 浅色（Warm Studio 暖色调） / 深色（OLED Black）
- 跟随系统偏好或手动切换
- 主题偏好持久化到 localStorage

---

## 5. 界面设计

### 5.1 布局结构

```
┌──────────────────────────────────────────────────────┐
│  🍅 Tomato                              🌙  — □ ✕   │  ← 顶栏（可拖拽）
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│  📋 任务  │         主内容区域                         │
│  📁 项目  │   （任务列表/项目/番茄钟/统计/回顾）         │
│  🍅 专注  │                                           │
│  📊 统计  │                                           │
│  📝 回顾  │                                           │
│          │                                           │
│──────────│                                           │
│ 提醒区域  │                                           │
└──────────┴───────────────────────────────────────────┘
```

### 5.2 设计风格

- **整体风格**：圆角卡片式布局，磨砂纹理背景
- **配色方案**：
  - 浅色：米白背景 `#FBF8F4` + 白色卡片 + 番茄红 `#D94F3B`
  - 深色：纯黑背景 `#0A0A0A` + 深灰卡片 `#1C1C1C` + 亮红 `#E8634F`
- **字体**：标题用衬线体（Georgia），正文用系统字体栈
- **动画**：页面切换淡入、卡片列表交错入场、番茄钟脉冲发光
- **间距**：4px 基础栅格，统一 CSS Variables

---

## 6. API 设计

### 6.1 任务 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 获取任务列表（?status=&projectId=&priority=&keyword=） |
| GET | `/api/tasks/reminders/list` | 获取需要提醒的任务 |
| GET | `/api/tasks/:id` | 获取单个任务 |
| POST | `/api/tasks` | 创建任务（标题必填，最多 200 字） |
| PUT | `/api/tasks/:id` | 更新任务（白名单字段过滤） |
| DELETE | `/api/tasks/:id` | 删除任务 |
| POST | `/api/tasks/:id/complete` | 完成任务（body: completedResult） |
| POST | `/api/tasks/:id/dismiss-reminder` | 屏蔽提醒 |
| POST | `/api/tasks/:id/snooze-reminder` | 延迟提醒（body: until） |

### 6.2 项目 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取项目列表（含任务统计） |
| POST | `/api/projects` | 创建项目（标题必填，颜色格式校验） |
| PUT | `/api/projects/:id` | 更新项目（白名单字段过滤） |
| DELETE | `/api/projects/:id` | 删除项目（关联任务迁移到默认项目） |

### 6.3 番茄钟 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/pomodoros/start` | 开始番茄钟（body: taskId, type） |
| PUT | `/api/pomodoros/:id/pause` | 暂停 |
| PUT | `/api/pomodoros/:id/resume` | 继续（服务器端计算暂停时长） |
| PUT | `/api/pomodoros/:id/stop` | 停止（body: completed） |
| GET | `/api/pomodoros/current` | 获取当前番茄钟 |
| GET | `/api/pomodoros/history` | 获取历史（?taskId=&date=） |

### 6.4 统计 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/dashboard` | 仪表盘数据 |
| GET | `/api/stats/review` | 回顾数据（?period=&start=&end=） |
| GET | `/api/stats/export` | 导出全部数据为 JSON |
| POST | `/api/stats/import` | 导入数据（body: data, mode: merge/overwrite） |

---

## 7. 安全设计

- 仅监听 `localhost:3210`，不暴露到局域网
- 安全响应头：`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`
- 输入校验：标题长度限制、标签/人员数量限制、颜色格式正则校验、搜索关键词截断
- 数据写入：临时文件 + rename 安全写入策略
- 并发保护：`withLock` 写锁机制，防止并发写入数据损坏
- 数据备份：JSON 解析失败时自动读取 `.bak` 备份文件

---

## 8. 快捷键

| 快捷键 | 功能 |
|--------|------|
| `1` - `5` | 切换页面（任务/项目/专注/统计/回顾） |
| `?` | 显示快捷键帮助 |
| `Esc` | 关闭弹窗 |

> 在输入框内按键不会触发快捷键。

---

## 9. 依赖清单

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
