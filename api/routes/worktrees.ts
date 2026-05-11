import express, { type Request, type Response } from 'express'
import path from 'node:path'
import { getGitDirAbsolute, git } from '../core/git.js'
import { listWorktrees } from '../core/worktree.js'
import { gitOrThrow } from '../core/git.js'
import { pathFromId } from '../core/id.js'
import { openPath, openEditor } from '../core/open.js'
import { readConfig, writeConfig } from '../core/config.js'
import type {
  ApiResult,
  CreateWorktreeRequest,
  RepoInfo,
  WtuiConfig,
  WorktreeItem,
  WorktreeDiffInfo,
  FileChange,
} from '../../shared/wtui-types.js'

export function createWorktreeRouter(getRepoRoot: () => string) {
  const router = express.Router()

  const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

  router.get('/repo', (req: Request, res: Response<ApiResult<RepoInfo>>) => {
    try {
      const rootPath = getRepoRoot()
      const gitDirPath = getGitDirAbsolute(rootPath)
      res.json({ ok: true, data: { rootPath, gitDirPath } })
    } catch (e: unknown) {
      res.status(400).json({
        ok: false,
        error: { code: 'REPO_NOT_FOUND', message: errMsg(e) || 'Repo not found' },
      })
    }
  })

  router.get(
    '/worktrees',
    (req: Request, res: Response<ApiResult<WorktreeItem[]>>) => {
      try {
        const root = getRepoRoot()
        const items = listWorktrees(root)
        res.json({ ok: true, data: items })
      } catch (e: unknown) {
        res.status(500).json({
          ok: false,
          error: { code: 'WORKTREE_LIST_FAILED', message: errMsg(e) || 'List failed' },
        })
      }
    },
  )

  router.post(
    '/worktrees',
    (
      req: Request<Record<string, never>, ApiResult<WorktreeItem>, CreateWorktreeRequest>,
      res: Response<ApiResult<WorktreeItem>>,
    ) => {
      try {
        const root = getRepoRoot()
        const body = req.body

        if (!body || !body.ref || !body.path) {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_INPUT', message: 'ref 与 path 不能为空' },
          })
          return
        }

        const targetDir = path.isAbsolute(body.path)
          ? body.path
          : path.resolve(root, body.path)

        if (body.newBranch && body.newBranch.trim()) {
          gitOrThrow(root, ['branch', body.newBranch.trim(), body.ref.trim()], 'BRANCH_CREATE')
          gitOrThrow(root, ['worktree', 'add', targetDir, body.newBranch.trim()], 'WORKTREE_ADD')
        } else {
          gitOrThrow(root, ['worktree', 'add', targetDir, body.ref.trim()], 'WORKTREE_ADD')
        }

        const items = listWorktrees(root)
        const created = items.find((x) => path.resolve(x.path) === path.resolve(targetDir))
        if (!created) {
          res.json({
            ok: false,
            error: { code: 'WORKTREE_CREATE_UNKNOWN', message: 'Worktree 创建成功但未能读取到列表' },
          })
          return
        }
        res.json({ ok: true, data: created })
      } catch (e: unknown) {
        res.status(500).json({
          ok: false,
          error: {
            code: 'WORKTREE_CREATE_FAILED',
            message: '创建失败',
            details: errMsg(e),
          },
        })
      }
    },
  )

  router.delete(
    '/worktrees/:id',
    (req: Request<{ id: string }>, res: Response<ApiResult<{ removed: true }>>) => {
      const force = req.query.force === '1' || req.query.force === 'true'
      try {
        const root = getRepoRoot()
        const p = pathFromId(req.params.id)
        const args = force ? ['worktree', 'remove', '--force', p] : ['worktree', 'remove', p]
        gitOrThrow(root, args, 'WORKTREE_REMOVE')
        res.json({ ok: true, data: { removed: true } })
      } catch (e: unknown) {
        res.status(500).json({
          ok: false,
          error: {
            code: 'WORKTREE_REMOVE_FAILED',
            message: '删除失败',
            details: errMsg(e),
          },
        })
      }
    },
  )

  router.post(
    '/worktrees/:id/open',
    (req: Request<{ id: string }, ApiResult<{ launched: true }>, { type?: 'folder' | 'editor' }>, res: Response<ApiResult<{ launched: true }>>) => {
      try {
        const p = pathFromId(req.params.id)
        const cfg = readConfig()
        const type = req.body.type || 'folder'

        let ok = false
        if (type === 'editor') {
          ok = openEditor(p, cfg.editorCommand)
        } else {
          ok = openPath(p, cfg.openCommand)
        }

        if (!ok) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'OPEN_FAILED',
              message:
                type === 'editor'
                  ? '无法打开编辑器 (未找到 Trae/Cursor/VSCode，请在设置中配置 editorCommand)'
                  : '打开失败',
            },
          })
          return
        }
        res.json({ ok: true, data: { launched: true } })
      } catch (e: unknown) {
        res.status(500).json({
          ok: false,
          error: { code: 'OPEN_FAILED', message: errMsg(e) || '打开失败' },
        })
      }
    },
  )

  router.post(
    '/worktrees/:id/lock',
    (req: Request<{ id: string }>, res: Response<ApiResult<{ locked: true }>>) => {
      try {
        const root = getRepoRoot()
        const p = pathFromId(req.params.id)
        gitOrThrow(root, ['worktree', 'lock', p], 'WORKTREE_LOCK')
        res.json({ ok: true, data: { locked: true } })
      } catch (e: unknown) {
        res.status(500).json({
          ok: false,
          error: { code: 'LOCK_FAILED', message: errMsg(e) || 'Lock failed' },
        })
      }
    },
  )

  router.post(
    '/worktrees/:id/unlock',
    (req: Request<{ id: string }>, res: Response<ApiResult<{ unlocked: true }>>) => {
      try {
        const root = getRepoRoot()
        const p = pathFromId(req.params.id)
        gitOrThrow(root, ['worktree', 'unlock', p], 'WORKTREE_UNLOCK')
        res.json({ ok: true, data: { unlocked: true } })
      } catch (e: unknown) {
        res.status(500).json({
          ok: false,
          error: { code: 'UNLOCK_FAILED', message: errMsg(e) || 'Unlock failed' },
        })
      }
    },
  )

  router.get(
    '/worktrees/:id/staged',
    (req: Request<{ id: string }>, res: Response<ApiResult<WorktreeDiffInfo>>) => {
      try {
        const wtPath = pathFromId(req.params.id)

        const parseNameStatus = (stdout: string): FileChange[] =>
          stdout
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const tab = line.indexOf('\t')
              if (tab === -1) return { status: '?', path: line }
              return { status: line.slice(0, tab).trim(), path: line.slice(tab + 1).trim() }
            })

        const stagedStatus = git(wtPath, ['diff', '--cached', '--name-status'])
        const stagedFiles = stagedStatus.ok ? parseNameStatus(stagedStatus.stdout) : []
        const stagedDiffResult = git(wtPath, ['diff', '--cached'])
        const stagedDiff = stagedDiffResult.ok ? stagedDiffResult.stdout : ''

        const unstagedStatus = git(wtPath, ['diff', '--name-status'])
        const unstagedFiles = unstagedStatus.ok ? parseNameStatus(unstagedStatus.stdout) : []
        const unstagedDiffResult = git(wtPath, ['diff'])
        const unstagedDiff = unstagedDiffResult.ok ? unstagedDiffResult.stdout : ''

        const graphResult = git(wtPath, ['log', '--graph', '--abbrev-commit', '--format=%h %s (%an, %ar)', '-20'])
        const commitGraph = graphResult.ok ? graphResult.stdout : ''

        res.json({
          ok: true,
          data: {
            staged: { files: stagedFiles, diff: stagedDiff },
            unstaged: { files: unstagedFiles, diff: unstagedDiff },
            commitGraph,
          },
        })
      } catch (e: unknown) {
        res.status(500).json({
          ok: false,
          error: { code: 'DIFF_FAILED', message: errMsg(e) || 'Failed to get diff' },
        })
      }
    },
  )

  router.post('/worktrees/prune', (req: Request, res: Response<ApiResult<{ pruned: true }>>) => {
    try {
      const root = getRepoRoot()
      gitOrThrow(root, ['worktree', 'prune'], 'WORKTREE_PRUNE')
      res.json({ ok: true, data: { pruned: true } })
    } catch (e: unknown) {
      res.status(500).json({
        ok: false,
        error: { code: 'PRUNE_FAILED', message: errMsg(e) || 'Prune failed' },
      })
    }
  })

  router.get('/branches', (req: Request, res: Response<ApiResult<string[]>>) => {
    try {
      const root = getRepoRoot()
      const local = gitOrThrow(root, ['branch', '--format=%(refname:short)']).stdout
        .split('\n')
        .map((b) => b.trim())
        .filter(Boolean)

      const remote = gitOrThrow(root, ['branch', '-r', '--format=%(refname:short)']).stdout
        .split('\n')
        .map((b) => b.trim())
        .filter((b) => b && !b.includes('/HEAD'))

      const all = Array.from(new Set([...local, ...remote])).sort()
      res.json({ ok: true, data: all })
    } catch (e: unknown) {
      res.status(500).json({
        ok: false,
        error: { code: 'BRANCH_LIST_FAILED', message: errMsg(e) || 'List branches failed' },
      })
    }
  })

  router.get('/config', (req: Request, res: Response<ApiResult<WtuiConfig>>) => {
    res.json({ ok: true, data: readConfig() })
  })

  router.put(
    '/config',
    (req: Request<Record<string, never>, ApiResult<WtuiConfig>, WtuiConfig>, res: Response<ApiResult<WtuiConfig>>) => {
      try {
        const next = req.body || {}
        writeConfig(next)
        res.json({ ok: true, data: readConfig() })
      } catch (e: unknown) {
        res.status(500).json({
          ok: false,
          error: { code: 'CONFIG_WRITE_FAILED', message: '保存失败', details: errMsg(e) },
        })
      }
    },
  )

  return router
}
