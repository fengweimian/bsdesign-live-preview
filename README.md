# BSDesign Live Preview

A real-time preview server for Bootstrap Studio `.bsdesign` files. Provides a visual dashboard with drag-and-drop file loading, live preview rendering, and WebSocket-based auto-reload when the file is modified externally (e.g., via the [BSDesign MCP Server](https://github.com/fengweimian/bootstrap-studio-mcp-server)).

## Features

- **Visual Dashboard** — Dark-themed web UI with drag-and-drop file selection
- **Live Preview** — Renders `.bsdesign` pages into full HTML using Bootstrap 5 CDN
- **Auto-Reload** — WebSocket pushes instant page refresh when the file changes
- **CSS Support** — Correctly parses Bootstrap Studio's structured CSS block format
- **Utility Class Mapping** — Auto-generates Bootstrap utility classes from component properties
- **Port Conflict Handling** — Auto-kills old processes on port 4400, falls back to 4401
- **Collapsible Panel** — Top drop-zone can be collapsed to maximize preview area
- **Chinese UI** — Full Chinese interface to avoid browser translation prompts
- **Standalone EXE** — Downloadable exe from GitHub Releases, no Node.js required
- **22 Component Types** — HTML, Body, Container, Row, Column, Heading, Paragraph, Badge, Button, Image, Div, Span, Link, Form, Input, Textarea, Select, Label, Card, CardBody, CustomCode, InlineCharacter

## Installation

```bash
git clone https://github.com/fengweimian/bsdesign-live-preview.git
cd bsdesign-live-preview
npm install
npm run build
```

## Usage

### With a file specified

```bash
node dist/index.js "C:\path\to\project.bsdesign"
```

### Without a file

```bash
node dist/index.js
```

Then open `http://localhost:4400` and drag a `.bsdesign` file onto the dashboard.

### Dashboard Controls

| Action | How |
|--------|-----|
| Load file | Drag `.bsdesign` onto the drop zone, or click to browse |
| Preview | Rendered page appears in the iframe automatically |
| Auto-reload | File changes trigger instant refresh (use with MCP server) |

### Standalone EXE

Download `bsdesign-live.exe` from [GitHub Releases](https://github.com/fengweimian/bsdesign-live-preview/releases). No Node.js or npm required — double-click, select a `.bsdesign` file, and preview opens automatically in your browser.

## Requirements

- Node.js >= 18
- npm >= 9

---

# BSDesign Live Preview（中文说明）

Bootstrap Studio `.bsdesign` 文件的实时预览服务器。提供可视化仪表盘，支持拖拽加载文件、实时预览渲染，以及通过 WebSocket 在文件被外部修改时自动刷新（例如配合 [BSDesign MCP Server](https://github.com/fengweimian/bootstrap-studio-mcp-server) 使用）。

## 功能

- **可视化仪表盘** — 暗色主题 Web 界面，支持拖拽选择文件
- **实时预览** — 使用 Bootstrap 5 CDN 将 `.bsdesign` 页面渲染为完整 HTML
- **自动刷新** — WebSocket 推送，文件变更时浏览器即时刷新
- **CSS 支持** — 正确解析 Bootstrap Studio 的结构化 CSS 块格式
- **工具类映射** — 从组件属性自动生成 Bootstrap 工具类（`margin-x` → `mx-auto`，`padding-y` → `py-4` 等）
- **22 种组件** — HTML、Body、Container、Row、Column、Heading、Paragraph、Badge、Button、Image、Div、Span、Link、Form、Input、Textarea、Select、Label、Card、CardBody、CustomCode、InlineCharacter

## 安装

```bash
git clone https://github.com/fengweimian/bsdesign-live-preview.git
cd bsdesign-live-preview
npm install
npm run build
```

## 使用方式

### 指定文件启动

```bash
node dist/index.js "C:\path\to\project.bsdesign"
```

### 不指定文件启动

```bash
node dist/index.js
```

然后打开 `http://localhost:4400`，将 `.bsdesign` 文件拖到仪表盘上。

### 仪表盘操作

| 操作 | 方式 |
|------|------|
| 加载文件 | 拖拽 `.bsdesign` 到虚线区域，或点击浏览 |
| 预览 | 渲染的页面自动出现在内嵌框架中 |
| 自动刷新 | 文件变更时触发即时刷新（配合 MCP 服务器使用） |

### 独立 EXE

从 [GitHub Releases](https://github.com/fengweimian/bsdesign-live-preview/releases) 下载 `bsdesign-live.exe`。无需安装 Node.js — 双击运行，选择 `.bsdesign` 文件即可自动打开浏览器预览。

## 环境要求

- Node.js >= 18
- npm >= 9
