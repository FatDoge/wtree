# wtree

English | [简体中文](https://github.com/FatDoge/wtree/blob/main/README.md)

`wtree` is a local tool for managing git worktrees. It runs in an interactive command-line mode by default, and also supports a one-click local UI (TreeLab) for visual management.

## Features

- Interactive creation and deletion of worktrees (supports force deletion of uncommitted changes)
- Local UI mode with a browser-based visual management interface, supporting Light/Dark mode and i18n (English/Chinese)
- Support for creating worktrees from new branches or existing branches/commits
- Open worktrees instantly in your system file manager or preferred IDEs (Trae, Cursor, VS Code)
- Support for Locking, Unlocking, and Pruning invalid worktrees
- Local API executes git commands securely on your machine, data never leaves your computer

## Screenshots

<p align="center">
  <img src="https://raw.githubusercontent.com/FatDoge/wtree/main/docs/screenshots/home.jpg" alt="Home" width="48%" />
  <img src="https://raw.githubusercontent.com/FatDoge/wtree/main/docs/screenshots/new.jpg" alt="Create" width="48%" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/FatDoge/wtree/main/docs/screenshots/settings.jpg" alt="Settings" width="48%" />
  <img src="https://raw.githubusercontent.com/FatDoge/wtree/main/docs/screenshots/help.jpg" alt="Help" width="48%" />
</p>

## Installation

Install globally via npm (specify the public registry if you are using a private one):

```bash
npm install -g @fatdoge/wtree --registry=https://registry.npmjs.org/
```

Or run directly using `npx`:

```bash
npx --registry=https://registry.npmjs.org/ @fatdoge/wtree
```

## Usage

### Interactive CLI

Run inside your git repository:

```bash
wtree
```

Specify a branch directly to skip selection:

```bash
wtree feature/my-branch
```

List all worktrees:

```bash
wtree list
```

### UI Mode (TreeLab)

```bash
wtree --ui
```

Optional arguments:

```bash
wtree --ui --repo /path/to/repo
wtree --ui --no-open
wtree --ui --port 0
```

## CLI Commands

- `wtree`: Interactive main menu (Create/Delete/List/Open/Lock/Unlock/Prune)
- `wtree list`: Print worktree list
- `wtree create [branch]`: Create a worktree (interactive selection supported)
- `wtree delete`: Delete a worktree (interactive selection, force deletion supported)
- `wtree open [path|branch]`: Open a worktree
- `wtree lock [path|branch]`: Lock a specific worktree to prevent it from being moved or deleted
- `wtree unlock [path|branch]`: Unlock a specific worktree
- `wtree prune`: Prune worktree records that no longer exist locally but are tracked by Git
- `wtree config`: View local configuration
- `wtree config get <key>`: Read a configuration item
- `wtree config set <key> <value>`: Set a configuration item
- `wtree help`: View help information

## Configuration

The UI settings page saves configuration to a local file:

- macOS/Linux: `~/.config/wtree/config.json`
- Windows: `%USERPROFILE%\.config\wtree\config.json`

Supported configuration keys:

- `baseDir`: Used by the UI to remember the default directory (currently not automatically appended to the creation path)
- `openCommand`: The command used when clicking "Folder" in the UI to open the system file manager (defaults to system commands based on OS, e.g., `open` on macOS)
- `editorCommand`: The command used when clicking "IDE" in the UI. If not set, the system will automatically detect installed editors like Trae, Cursor, or VS Code.

**Note**: The UI theme mode (Light/Dark/System) and language preferences are stored independently in the browser's `localStorage`.

## Development

Install dependencies:

```bash
pnpm install
```

Common scripts:

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
