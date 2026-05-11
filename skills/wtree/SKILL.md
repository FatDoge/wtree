---
name: wtree
description: "Manage git worktrees using the wtree CLI. Use when the user wants to create, list, delete, open, lock, unlock, or prune git worktrees, or work with multiple branches simultaneously."
allowed-tools: Bash
user-invocable: true
---

# wtree - Git Worktree Manager

You manage git worktrees using the `wtree` CLI tool. Always use non-interactive flags so commands complete without user input.

## Environment Setup (MUST do first)

Before running any wtree command, you MUST check if wtree is installed locally. Run this check once at the start:

```bash
wtree --version 2>/dev/null
```

- **If it outputs a version number** (e.g., `0.3.0`): wtree is installed, proceed with commands directly using `wtree`.
- **If it fails or outputs nothing**: wtree is NOT installed. Install it globally first:

```bash
npm install -g @fatdoge/wtree --registry=https://registry.npmjs.org/
```

Then verify the installation:

```bash
wtree --version
```

**Do NOT use `npx` to run wtree** — it is significantly slower. Always ensure wtree is installed globally first.

## Important Rules

1. **Always use `--json` flag** when you need to parse output programmatically
2. **Always use `--yes`** to skip all confirmation prompts
3. **Always use `--no-editor`** unless the user explicitly asks to open an editor
4. **Always use `--no-install`** unless the user explicitly asks to install dependencies
5. **Use `--repo <path>`** if the current working directory is not inside the target git repository
6. **Never run `wtree` without a subcommand** — that enters interactive mode

## Commands Reference

### List Worktrees

```bash
wtree list --json
# With specific repo:
wtree list --json --repo /path/to/repo
```

Returns a JSON array of worktree objects:
```json
[
  {
    "id": "<base64url-encoded-path>",
    "path": "/absolute/path/to/worktree",
    "head": "<commit-sha>",
    "branch": "branch-name",
    "isMain": true,
    "isLocked": false
  }
]
```

### Create Worktree

For an **existing** local or remote branch:
```bash
wtree create <branch-name> --yes --no-editor --no-install --json
```

For a **new branch** based on a reference:
```bash
wtree create <new-branch-name> --base <base-ref> --yes --no-editor --no-install --json
```

With a specific target directory:
```bash
wtree create <branch> --dir <relative-path> --yes --no-editor --no-install --json
```

Parameters:
- `<branch-name>` (positional, required): The branch to check out or create
- `--dir <path>`: Worktree directory, relative to repo root (default: `worktrees/<branch-sanitized>`)
- `--base <ref>`: Base reference for new branch creation (e.g., `main`, `origin/main`)
- `--yes`: Auto-confirm new branch creation and accept default directory
- `--editor <name>`: Open in specific editor after creation (`trae`, `cursor`, `code`)
- `--no-editor`: Do not open any editor
- `--no-install`: Skip automatic dependency installation
- `--json`: Output result as JSON

Returns on success:
```json
{"ok": true, "data": {"id": "...", "path": "...", "head": "...", "branch": "...", "isMain": false, "isLocked": false}}
```

### Delete Worktree

Delete one or more worktrees by branch name or path:
```bash
wtree delete <branch-or-path> --yes --json
wtree delete <branch1> <branch2> --yes --json
```

Force delete (even with uncommitted changes):
```bash
wtree delete <branch> --yes --force --json
```

Parameters:
- Positional args: Worktree identifiers (branch name, path, or directory basename)
- `--yes`: Skip deletion confirmation
- `--force`: Force-delete even if there are uncommitted changes
- `--json`: Output result as JSON

### Open Worktree

```bash
wtree open <branch-or-path>
```

Opens the worktree directory in the system file manager.

### Lock / Unlock Worktree

```bash
wtree lock <branch-or-path>
wtree unlock <branch-or-path>
```

### Prune Invalid Worktrees

```bash
wtree prune
```

Removes worktree records for directories that no longer exist.

### Configuration

```bash
wtree config                       # Show all config as JSON
wtree config get <key>            # Get a single config value
wtree config set <key> <value>    # Set a config value
```

Available config keys: `baseDir`, `openCommand`, `editorCommand`

## Workflow Examples

### Create a worktree for a new feature branch

```bash
# 1. List existing worktrees
wtree list --json

# 2. Create worktree with new branch from main
wtree create feature/my-feature --base main --yes --no-editor --no-install --json
```

### Clean up old worktrees

```bash
# 1. List all worktrees
wtree list --json

# 2. Delete unwanted ones
wtree delete feature/old-branch --yes --json

# 3. Prune stale records
wtree prune
```

### Create worktree for an existing remote branch

```bash
wtree create feature/existing-branch --yes --no-editor --no-install --json
```
