# wtui 页面设计说明（Desktop-first）

## 0. Global Styles
- 设计目标：信息密度高、操作快、错误提示清晰，适合桌面开发场景。
- Layout 基础：`max-w-screen-xl` 容器 + 12 列 Grid（主内容 8–9 列，右侧信息 3–4 列，视页面而定）；移动端退化为单列堆叠。
- 颜色（Tailwind tokens）：
  - Background: `slate-950/900`（深色优先，便于终端/IDE 环境）
  - Surface: `slate-900` / `slate-800`
  - Text: `slate-100` / `slate-300`
  - Accent: `sky-500`（主按钮/链接）
  - Danger: `rose-500`（删除/强制操作）
  - Success: `emerald-500`
- 字体与排版：
  - Base: `text-sm`，标题 `text-lg`/`text-xl`，关键数字/路径使用等宽字体 `font-mono`。
- 组件状态：
  - Button：默认 `bg-sky-500 hover:bg-sky-400 disabled:opacity-50`
  - Danger Button：`bg-rose-500 hover:bg-rose-400`
  - Input：`bg-slate-900 border border-slate-700 focus:border-sky-500`
  - Toast：右上角堆叠，成功/失败用不同色条。

## 1. UI 工作区总览页
### 1.1 Meta Information
- Title: wtui — Worktrees
- Description: 可视化管理当前仓库的 git worktree
- Open Graph: title/description 与页面一致（本地工具可保持最小化配置）

### 1.2 Page Structure
- 顶部：App Header（左：仓库路径；右：刷新、创建、设置/帮助）
- 主区：Worktree Table（高密度表格）
- 右侧（可选）：当前选中 worktree 详情卡片（路径、HEAD、分支、状态）

### 1.3 Sections & Components
1) App Header
- 左侧：RepoBadge（显示 repo root，支持“一键复制路径”）
- 右侧按钮：
  - Refresh（触发 `GET /api/worktrees`）
  - Create（跳转 `/create`）
  - Settings（跳转 `/settings`）
  - Help（跳转 `/help`）

2) Worktree Table
- 列建议：Name/Path、Branch/HEAD、Flags（Locked/Main/Dirty）、Actions
- 行操作（Actions 下拉或按钮组）：
  - Open（调用 `/api/worktrees/:id/open`）
  - Copy Path（复制到剪贴板）
  - Remove（打开确认弹窗；确认后 DELETE）
- 交互：点击行=选中并在右侧展示详情；双击行=Open（可选）。

3) Remove Confirm Modal
- 文案包含：将移除的 worktree 路径；风险提示；需要二次确认。
- 失败态：展示可复制错误详情（等宽文本框）。

### 1.4 Responsive
- >=1024px：表格 + 右侧详情卡双栏
- <1024px：隐藏右侧详情卡，改为 Drawer 或行展开

## 2. UI 创建/切换页
### 2.1 Meta Information
- Title: wtui — Create Worktree
- Description: 创建新的 worktree

### 2.2 Page Structure
- 顶部：返回按钮 + 页面标题
- 主区：创建表单（左）+ 执行预览/结果（右）

### 2.3 Sections & Components
1) Create Form
- Ref 输入：
  - 模式切换 Tab：现有分支 / 新分支 / 指定提交
  - 输入框 +（可选）下拉提示
- Path 输入：目标目录（带“使用默认 baseDir”快捷填充）
- Advanced（折叠）：如命名规则预览、是否强制等（仅当产品需要时展示最少项）
- Submit：Create

2) Command Preview Card
- 展示即将执行的命令摘要（只读）：如 `git worktree add ...`
- 目的：让你在 UI 里也能明确发生了什么。

3) Result Panel
- Loading：进度条/Spinner + “正在创建 worktree…”
- Success：展示新 worktree 信息 + 按钮（Open、Back to list）
- Error：错误标题 + 可复制详情 + “回到表单修改”

### 2.4 Responsive
- 桌面：左右两栏
- 窄屏：表单在上、结果在下

## 3. UI 设置与帮助页
（可分为两个路由 `/settings` 与 `/help`；也可做成一个页面内 Tabs）

### 3.1 Meta Information
- Title: wtui — Settings & Help
- Description: 配置 wtui 行为并查看命令速查

### 3.2 Page Structure
- 顶部：标题 + 返回
- 主区：Tabs（Settings / Help）

### 3.3 Sections & Components
1) Settings Tab
- baseDir：默认 worktree 根目录（输入框）
- openCommand：打开目录命令（如 macOS `open`）
- editorCommand：编辑器命令（如 `code`）
- Save/Reset：保存后 toast 提示；失败显示错误细节。

2) Help Tab
- Command Cheatsheet：
  - `wtui list` / `wtui add` / `wtui remove` / `wtui open` / `wtui ui` 的示例与参数说明
- Troubleshooting：
  - 非 git 仓库
  - 端口被占用
  - worktree 路径冲突/权限问题

## 4. Common Interaction Rules
- 所有写操作（create/remove/open）都必须：
  - 明确 loading 状态
  - 失败展示可复制 details（便于你贴到 issue）
- UI 不直接操作 git：只调用本地同源 API，确保逻辑一致且可复用 CLI 实现。
