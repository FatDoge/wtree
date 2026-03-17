import path from 'node:path'
import { exec, execOrThrow } from './exec.js'

const withSafeArgs = (args: string[]) => ['-c', 'safe.directory=*', ...args]

export function getRepoRoot(cwd: string) {
  const common = exec('git', withSafeArgs(['rev-parse', '--path-format=absolute', '--git-common-dir']), { cwd })
  if (common.ok && common.stdout.trim()) {
    return path.dirname(common.stdout.trim())
  }

  const top = exec('git', withSafeArgs(['rev-parse', '--show-toplevel']), { cwd })
  if (top.ok && top.stdout.trim()) {
    return top.stdout.trim()
  }

  throw new Error('无法确定 Git 根目录。请确保在 Git 仓库中运行。')
}

export function getGitDirAbsolute(rootDir: string) {
  const r = execOrThrow(
    'git',
    withSafeArgs(['rev-parse', '--path-format=absolute', '--git-dir']),
    { cwd: rootDir, errorCode: 'GIT_DIR' },
  )
  return r.stdout.trim()
}

export function git(rootDir: string, args: string[]) {
  return exec('git', withSafeArgs(args), { cwd: rootDir })
}

export function gitOrThrow(rootDir: string, args: string[], errorCode?: string) {
  return execOrThrow('git', withSafeArgs(args), { cwd: rootDir, errorCode })
}
