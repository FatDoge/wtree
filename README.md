# wtree

[English](https://github.com/FatDoge/wtree/blob/main/README.en.md) | 简体中文

`wtree` 是一个本地工具，用于管理 git worktree。默认是交互式命令行模式，也支持一键启动 UI 页面 (TreeLab) 进行可视化操作。

## 特性

- 交互式创建与删除 worktree (支持强制删除未提交更改)
- UI 模式本地启动，浏览器可视化管理，支持浅色/深色模式切换以及中英文国际化
- IDE 风格 Diff 预览：左右分栏布局，左侧文件树（@pierre/trees）+ 右侧单文件 diff（@pierre/diffs），支持已暂存 / 未暂存分组展示
- 左侧底部集成 Git 提交记录图（git log --graph），可折叠查看
- 可拖拽分割线自由调整左右面板宽度
- 支持创建新分支、从已有分支/提交创建 worktree
- 支持在系统文件管理器或常用 IDE (Trae, Cursor, VS Code) 中一键打开
- 支持锁定 (Lock) / 解锁 (Unlock) 以及清理 (Prune) 无效的 worktree
- 非交互模式：支持通过命令行参数完全自动化操作，适合脚本和 AI Agent 调用
- 提供 Agent Skill，可被 Trae / Cursor / Claude Code 等 AI 编码工具直接使用
- 本地 API 执行 git 命令，数据不出机器

## UI 截图

<p align="center">
  <img src="https://raw.githubusercontent.com/FatDoge/wtree/main/docs/screenshots/home.jpg" alt="首页" width="48%" />
  <img src="https://raw.githubusercontent.com/FatDoge/wtree/main/docs/screenshots/new.jpg" alt="创建页面" width="48%" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/FatDoge/wtree/main/docs/screenshots/settings.jpg" alt="设置页面" width="48%" />
  <img src="https://raw.githubusercontent.com/FatDoge/wtree/main/docs/screenshots/help.jpg" alt="帮助页面" width="48%" />
</p>

## 安装

可以通过 npm 全局安装（如果使用了私有源，请指定官方源）：

```bash
npm install -g @fatdoge/wtree --registry=https://registry.npmjs.org/
```

或者直接使用 `npx` 运行：

```bash
npx --registry=https://registry.npmjs.org/ @fatdoge/wtree
```

## 运行与使用

### 交互式 CLI

在 git 仓库目录中运行：

```bash
wtree
```

直接指定分支名跳过选择：

```bash
wtree feature/my-branch
```

查看 worktree 列表：

```bash
wtree list
```

### UI 模式 (TreeLab)

```bash
wtree --ui
```

可选参数：

```bash
wtree --ui --repo /path/to/repo
wtree --ui --no-open
wtree --ui --port 0
```

## CLI 参数

- `--ui`：启动本地 UI
- `--repo <path>`：指定仓库路径（默认使用当前目录）
- `--no-open`：不自动打开浏览器
- `--port <number>`：指定 UI 端口（`0` 表示自动分配）
- `--json`：以 JSON 格式输出（适合脚本和 Agent 使用）
- `--yes, -y`：自动确认所有提示
- `--force, -f`：强制操作（如强制删除有未提交更改的 worktree）
- `--dir <path>`：指定 worktree 目录路径（相对于 git 根目录）
- `--base <ref>`：创建新分支时的基准引用（如 `main`、`origin/main`）
- `--editor <name>`：创建后使用指定编辑器打开（`trae`、`cursor`、`code`、`none`）
- `--no-editor`：创建后不打开编辑器
- `--no-install`：创建后不自动安装依赖

## CLI 命令

- `wtree`：交互式主菜单 (创建/删除/列表/打开/锁定/解锁/清理)
- `wtree list`：打印 worktree 列表
- `wtree create [branch]`：创建 worktree（支持交互式选择）
- `wtree delete [branch|path ...]`：删除 worktree（支持交互式选择和直接指定目标，支持强制删除）
- `wtree open [path|branch]`：打开 worktree
- `wtree lock [path|branch]`：锁定指定的 worktree，防止被移动或删除
- `wtree unlock [path|branch]`：解锁指定的 worktree
- `wtree prune`：清理本地不存在记录但被 Git 记录的无效 worktree
- `wtree config`：查看本地配置
- `wtree config get <key>`：读取配置项
- `wtree config set <key> <value>`：设置配置项
- `wtree help`：查看帮助

## 非交互模式

所有命令都支持通过参数完全非交互地执行，适合在脚本或 AI Agent 中使用：

```bash
# 查看 worktree 列表（JSON 输出）
wtree list --json

# 为已有分支创建 worktree
wtree create feature/my-branch --yes --no-editor --no-install --json

# 基于 main 创建新分支的 worktree
wtree create feature/new-thing --base main --yes --dir worktrees/new-thing --no-editor --no-install --json

# 删除指定 worktree
wtree delete feature/old-branch --yes --json

# 强制删除（即使有未提交更改）
wtree delete feature/dirty --yes --force --json
```

## Agent Skill

`wtree` 提供了 Agent Skill，可以让 AI 编码工具（Trae、Cursor、Claude Code 等）直接管理 git worktree。

### 安装 Skill

```bash
# 安装到当前项目
npx skills add FatDoge/wtree --skill wtree

# 全局安装（所有项目可用）
npx skills add FatDoge/wtree --skill wtree -g
```

安装后，AI Agent 会自动识别 `wtree` skill，在你需要管理 worktree 时自动调用。

## 配置

UI 设置页会将配置写入本地文件：

- macOS/Linux：`~/.config/wtree/config.json`
- Windows：`%USERPROFILE%\.config\wtree\config.json`

配置字段：

```json
{
  "baseDir": "worktrees",
  "openCommand": "open",
  "editorCommand": "code"
}
```

- `baseDir`：用于 UI 记录默认目录，当前不会自动拼接到创建路径
- `openCommand`：UI 点击“Folder”打开系统文件管理器时使用的命令（默认按平台使用系统命令，如 macOS 的 `open`）
- `editorCommand`：UI 点击“IDE”打开编辑器时使用的命令。若不设置，则会自动检测系统中是否安装了 Trae、Cursor 或 VS Code。

**注意**：UI 的主题模式（浅色/深色/跟随系统）和语言偏好独立存储在浏览器的 `localStorage` 中。

## 开发

```bash
pnpm install
```

常用脚本：

```bash
pnpm run wtree
pnpm run dev
pnpm run client:dev
pnpm run server:dev
pnpm run build
pnpm run lint
pnpm run test
pnpm run check
```

环境变量：

- `WTUI_REPO_ROOT`：本地 API 服务器运行时使用的 repo 根目录
- `PORT`：本地 API 服务器端口（默认 `3001`）

## 项目结构

- `api/`：CLI + 本地 API（git 执行与配置读写）
- `src/`：UI（React + Vite + Tailwind）
- `shared/`：前后端共享类型
- `skills/`：Agent Skill 定义
