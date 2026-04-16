# Tomato - 个人工作助理

一款基于番茄工作法的本地桌面应用，集任务管理、项目跟踪、专注计时、数据统计于一体。

## 功能特性

- **任务管理** — 创建、编辑、删除任务，支持优先级（P0-P3）、截止时间、标签、关联人员
- **项目管理** — 按项目归组任务，查看进度和统计
- **番茄钟** — 25 分钟专注 + 5 分钟休息，自动统计专注时长
- **数据统计** — 仪表盘展示今日/本周完成数、专注时长、连续天数
- **周期回顾** — 按日/周/月/自定义区间回顾已完成工作
- **深色模式** — 浅色/深色主题切换，支持跟随系统
- **桌面应用** — Electron 打包为独立窗口，支持系统托盘

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite |
| 后端 | Express.js (Node.js) |
| 存储 | JSON 文件（本地存储，无需数据库） |
| 桌面端 | Electron 35 |
| 构建 | Vite + electron-builder |

## 环境要求

- **Node.js** >= 18
- **npm** >= 8
- Windows / macOS / Linux

## 快速开始

### 方式一：脚本安装（推荐）

**Linux / macOS：**

```bash
chmod +x install.sh start.sh
./install.sh
./start.sh
```

**Windows：**

双击 `install.bat` 完成安装，然后双击 `start.bat` 启动应用。

### 方式二：手动安装

```bash
# 安装依赖（含 Electron，首次约 80MB）
npm install

# 构建前端
npx vite build

# 启动桌面应用
npm run start:electron
```

### 方式三：仅浏览器模式（无需 Electron）

```bash
npm install
npx vite build
node server/index.js
# 浏览器打开 http://localhost:3210
```

## 常用命令

```bash
npm run dev            # 开发模式，启动 Express 服务器
npm run build          # 构建前端资源
npm run start:electron # 启动 Electron 桌面应用
npm run electron:dev   # 构建并启动桌面应用
npm run electron:build # 打包为安装包（.exe / .dmg / .AppImage）
```

## 打包发布

```bash
npm run electron:build
```

产物输出到 `dist-electron/` 目录：

- Windows → `Tomato Setup x.x.x.exe`
- macOS → `Tomato-x.x.x.dmg`
- Linux → `Tomato-x.x.x.AppImage`

## 数据存储

所有数据以 JSON 文件保存在 `data/` 目录下：

```
data/
├── tasks.json        # 任务数据
├── projects.json     # 项目数据
└── pomodoros.json    # 番茄钟记录
```

数据完全本地存储，不上传任何服务器。首次运行会自动创建。

## 快捷键

| 按键 | 功能 |
|------|------|
| `1` - `5` | 切换页面（任务/项目/专注/统计/回顾） |
| `?` | 打开快捷键帮助 |
| `Esc` | 关闭弹窗 |

> 在输入框内按键不会触发快捷键。

## 项目结构

```
tomato/
├── electron/          # Electron 主进程
│   ├── main.js        # 窗口创建、系统托盘
│   └── preload.js     # 渲染进程 API 桥接
├── server/            # Express 后端
│   ├── index.js       # 服务器入口
│   ├── store/         # JSON 数据存储层
│   └── routes/        # API 路由（tasks/projects/pomodoros/stats）
├── src/               # Vue 前端
│   ├── assets/        # 全局样式
│   ├── components/    # 公共组件（Modal/Toast/ConfirmDialog）
│   ├── composables/   # 组合式函数（useApi/useToast）
│   ├── views/         # 页面视图
│   └── App.vue        # 根组件
├── data/              # 用户数据（自动生成）
├── dist/              # 构建产物（自动生成）
├── vite.config.js     # Vite 配置
└── package.json       # 项目配置
```

## License

MIT
