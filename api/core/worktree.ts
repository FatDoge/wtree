import path from 'node:path'
import { gitOrThrow } from './git.js'
import { idFromPath } from './id.js'
import type { WorktreeItem } from '../../shared/wtui-types.js'

export type WorktreeRaw = {
  path: string
  head: string
  branch?: string
  isLocked: boolean
}

export function parseWorktreePorcelain(output: string): WorktreeRaw[] {
  const lines = output.split('\n')
  const items: WorktreeRaw[] = []
  let current: Partial<WorktreeRaw> = {}

  const flush = () => {
    if (!current.path) return
    items.push({
      path: current.path,
      head: current.head || '',
      branch: current.branch,
      isLocked: Boolean(current.isLocked),
    })
    current = {}
  }

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      flush()
      current.path = line.slice('worktree '.length).trim()
      continue
    }
    if (line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length).trim()
      continue
    }
    if (line.startsWith('branch ')) {
      const b = line.slice('branch '.length).trim()
      current.branch = b.replace(/^refs\/heads\//, '')
      continue
    }
    if (line.startsWith('locked')) {
      current.isLocked = true
      continue
    }
  }
  flush()

  return items
}

export function listWorktrees(rootDir: string): WorktreeItem[] {
  const r = gitOrThrow(rootDir, ['worktree', 'list', '--porcelain'], 'WORKTREE_LIST')
  const raw = parseWorktreePorcelain(r.stdout)

  return raw
    .filter((wt) => wt.path)
    .map((wt) => {
      const normalized = path.resolve(wt.path)
      return {
        id: idFromPath(normalized),
        path: normalized,
        head: wt.head,
        branch: wt.branch,
        isMain: path.resolve(normalized) === path.resolve(rootDir),
        isLocked: wt.isLocked,
      }
    })
}

