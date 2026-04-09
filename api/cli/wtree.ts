#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getRepoRoot } from '../core/git.js'
import { git, gitOrThrow } from '../core/git.js'
import { listWorktrees, parseWorktreePorcelain } from '../core/worktree.js'
import { openPath } from '../core/open.js'
import { readConfig, writeConfig, getConfigPaths } from '../core/config.js'
import { startUiDevServer } from '../ui/startUiDev.js'

type ParsedFlags = {
  ui: boolean
  noOpen: boolean
  repo: string
  port: number | undefined
  json: boolean
  yes: boolean
  force: boolean
  dir: string
  base: string
  editor: string | undefined
  noEditor: boolean
  noInstall: boolean
  version: boolean
}

type Ctx = {
  rootDir: string
  flags: ParsedFlags
}

type SourceSelection =
  | { type: 'recent'; branch: string }
  | { type: 'local' }
  | { type: 'remote' }
  | { type: 'default' }
  | { type: 'input' }

type SourceType = SourceSelection['type']
type CommandType = 'list' | 'create' | 'delete' | 'open' | 'config' | 'help' | 'interactive' | 'prune' | 'lock' | 'unlock'

function getVersion(): string {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    // 从 api/cli/ 或 dist-node/api/cli/ 向上查找 package.json
    let dir = __dirname
    for (let i = 0; i < 5; i++) {
      const pkgPath = path.join(dir, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        return pkg.version || 'unknown'
      }
      dir = path.dirname(dir)
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

function parseArgs(argv: string[]) {
  const args = [...argv]
  const flags: ParsedFlags = {
    ui: false,
    noOpen: false,
    repo: '',
    port: undefined as number | undefined,
    json: false,
    yes: false,
    force: false,
    dir: '',
    base: '',
    editor: undefined,
    noEditor: false,
    noInstall: false,
    version: false,
  }
  const positional: string[] = []

  while (args.length) {
    const a = args.shift() as string
    if (a === '--ui' || a === 'ui') {
      flags.ui = true
      continue
    }
    if (a === '--no-open') {
      flags.noOpen = true
      continue
    }
    if (a === '--repo') {
      flags.repo = String(args.shift() || '')
      continue
    }
    if (a === '--port') {
      const v = Number(args.shift())
      if (Number.isFinite(v)) flags.port = v
      continue
    }
    if (a === '--json') { flags.json = true; continue }
    if (a === '--yes' || a === '-y') { flags.yes = true; continue }
    if (a === '--force' || a === '-f') { flags.force = true; continue }
    if (a === '--dir') { flags.dir = String(args.shift() || ''); continue }
    if (a === '--base') { flags.base = String(args.shift() || ''); continue }
    if (a === '--editor') { flags.editor = String(args.shift() || ''); continue }
    if (a === '--no-editor') { flags.noEditor = true; continue }
    if (a === '--no-install') { flags.noInstall = true; continue }
    if (a === '--version' || a === '-v') { flags.version = true; continue }
    if (a.startsWith('--')) continue
    positional.push(a)
  }

  return { flags, positional }
}

function parseCommand(positional: string[]) {
  const first = positional[0]
  if (first === 'list' || first === 'ls') {
    return { command: 'list' as CommandType, rest: positional.slice(1) }
  }
  if (first === 'create' || first === 'add') {
    return { command: 'create' as CommandType, rest: positional.slice(1) }
  }
  if (first === 'delete' || first === 'remove' || first === 'rm') {
    return { command: 'delete' as CommandType, rest: positional.slice(1) }
  }
  if (first === 'open') {
    return { command: 'open' as CommandType, rest: positional.slice(1) }
  }
  if (first === 'config') {
    return { command: 'config' as CommandType, rest: positional.slice(1) }
  }
  if (first === 'help' || first === '--help' || first === '-h') {
    return { command: 'help' as CommandType, rest: positional.slice(1) }
  }
  if (first === 'prune') {
    return { command: 'prune' as CommandType, rest: positional.slice(1) }
  }
  if (first === 'lock') {
    return { command: 'lock' as CommandType, rest: positional.slice(1) }
  }
  if (first === 'unlock') {
    return { command: 'unlock' as CommandType, rest: positional.slice(1) }
  }
  return { command: 'interactive' as CommandType, rest: positional }
}

function printWorktreeList(rootDir: string, json = false) {
  const items = listWorktrees(rootDir)
  if (json) {
    console.info(JSON.stringify(items, null, 2))
    return
  }
  if (items.length === 0) {
    console.info('未读取到 worktree。')
    return
  }
  console.info('Worktrees:')
  for (const wt of items) {
    const flags = [wt.isMain ? 'Main' : null, wt.isLocked ? 'Locked' : null].filter(Boolean).join(',')
    const label = flags ? ` [${flags}]` : ''
    console.info(`- ${wt.branch || 'HEAD'}${label} ${wt.path}`)
  }
}

function printHelp() {
  console.info('wtree 命令:')
  console.info('  wtree')
  console.info('  wtree list')
  console.info('  wtree create [branch]')
  console.info('  wtree delete [branch|path ...]')
  console.info('  wtree open [path|branch]')
  console.info('  wtree lock [path|branch]')
  console.info('  wtree unlock [path|branch]')
  console.info('  wtree prune')
  console.info('  wtree config')
  console.info('  wtree config get <key>')
  console.info('  wtree config set <key> <value>')
  console.info('  wtree --ui [--repo <path>] [--no-open] [--port <number>]')
  console.info('  wtree --version, -v')
  console.info('')
  console.info('选项:')
  console.info('  --json          以 JSON 格式输出 (适合脚本/agent 使用)')
  console.info('  --yes, -y       自动确认所有提示')
  console.info('  --force, -f     强制操作 (如强制删除有未提交更改的 worktree)')
  console.info('  --dir <path>    指定 worktree 目录路径 (相对于 git 根目录)')
  console.info('  --base <ref>    创建新分支时的基准引用 (如 main, origin/main)')
  console.info('  --editor <name> 创建后使用指定编辑器打开 (trae, cursor, code, none)')
  console.info('  --no-editor     创建后不打开编辑器')
  console.info('  --no-install    创建后不自动安装依赖')
  console.info('')
  console.info('可用配置 key: baseDir, openCommand, editorCommand')
  console.info('')
  console.info('非交互示例:')
  console.info('  wtree list --json')
  console.info('  wtree create feat/x --yes --no-editor --no-install --json')
  console.info('  wtree create feat/new --base main --yes --dir worktrees/feat-new --json')
  console.info('  wtree delete feat/old --yes --force --json')
}

function resolveWorktree(rootDir: string, key: string) {
  const items = listWorktrees(rootDir)
  const byBranch = items.find((x) => x.branch === key)
  if (byBranch) return byBranch
  const resolved = path.isAbsolute(key) ? key : path.resolve(rootDir, key)
  const byPath = items.find((x) => path.resolve(x.path) === path.resolve(resolved))
  if (byPath) return byPath
  const byBase = items.find((x) => path.basename(x.path) === key)
  return byBase
}

async function openWorktree(rootDir: string, key?: string) {
  const items = listWorktrees(rootDir)
  if (items.length === 0) {
    console.info('未读取到 worktree。')
    return
  }

  let target = key ? resolveWorktree(rootDir, key) : undefined
  if (!target) {
    const { wt } = await inquirer.prompt([
      {
        type: 'list',
        name: 'wt',
        message: '请选择要打开的 Worktree:',
        choices: items.map((x) => ({
          name: `${x.branch || 'HEAD'} (${path.relative(rootDir, x.path)})`,
          value: x.id,
        })),
      },
    ])
    target = items.find((x) => x.id === wt)
  }

  if (!target) {
    console.error(chalk.red('未找到对应的 worktree。'))
    process.exit(1)
  }

  const cfg = readConfig()
  const ok = openPath(target.path, cfg.openCommand)
  if (!ok) {
    console.error(chalk.red('打开失败。'))
    process.exit(1)
  }
  console.info(chalk.green('已打开。'))
}

function printConfig() {
  const cfg = readConfig()
  const paths = getConfigPaths()
  console.info(`config: ${paths.path}`)
  console.info(JSON.stringify(cfg, null, 2))
}

function getConfigKeyValue(key: string) {
  const cfg = readConfig()
  const v = (cfg as Record<string, unknown>)[key]
  if (typeof v === 'undefined') {
    console.info('')
    return
  }
  console.info(String(v))
}

function setConfigKeyValue(key: string, value: string) {
  const allowed = new Set(['baseDir', 'openCommand', 'editorCommand'])
  if (!allowed.has(key)) {
    console.error(chalk.red(`不支持的配置项: ${key}`))
    process.exit(1)
  }
  const cfg = readConfig()
  const next = { ...cfg, [key]: value }
  writeConfig(next)
  console.info(chalk.green('已保存。'))
}

async function lockWorktree(rootDir: string, key?: string) {
  const items = listWorktrees(rootDir)
  if (items.length === 0) {
    console.info('未读取到 worktree。')
    return
  }

  let target = key ? resolveWorktree(rootDir, key) : undefined
  if (!target) {
    const { wt } = await inquirer.prompt([
      {
        type: 'list',
        name: 'wt',
        message: '请选择要锁定的 Worktree:',
        choices: items.filter(x => !x.isLocked && !x.isMain).map((x) => ({
          name: `${x.branch || 'HEAD'} (${path.relative(rootDir, x.path)})`,
          value: x.id,
        })),
      },
    ])
    target = items.find((x) => x.id === wt)
  }

  if (!target) {
    console.error(chalk.red('未找到可锁定的 worktree。'))
    process.exit(1)
  }

  try {
    gitOrThrow(rootDir, ['worktree', 'lock', target.path], 'WORKTREE_LOCK')
    console.info(chalk.green(`已锁定: ${target.path}`))
  } catch (e: unknown) {
    console.error(chalk.red(`锁定失败: ${errMsg(e)}`))
  }
}

async function unlockWorktree(rootDir: string, key?: string) {
  const items = listWorktrees(rootDir)
  if (items.length === 0) {
    console.info('未读取到 worktree。')
    return
  }

  let target = key ? resolveWorktree(rootDir, key) : undefined
  if (!target) {
    const { wt } = await inquirer.prompt([
      {
        type: 'list',
        name: 'wt',
        message: '请选择要解锁的 Worktree:',
        choices: items.filter(x => x.isLocked).map((x) => ({
          name: `${x.branch || 'HEAD'} (${path.relative(rootDir, x.path)})`,
          value: x.id,
        })),
      },
    ])
    target = items.find((x) => x.id === wt)
  }

  if (!target) {
    console.error(chalk.red('未找到可解锁的 worktree。'))
    process.exit(1)
  }

  try {
    gitOrThrow(rootDir, ['worktree', 'unlock', target.path], 'WORKTREE_UNLOCK')
    console.info(chalk.green(`已解锁: ${target.path}`))
  } catch (e: unknown) {
    console.error(chalk.red(`解锁失败: ${errMsg(e)}`))
  }
}

async function pruneWorktrees(rootDir: string) {
  try {
    gitOrThrow(rootDir, ['worktree', 'prune'], 'WORKTREE_PRUNE')
    console.info(chalk.green('已清理无效的 worktree 记录。'))
  } catch (e: unknown) {
    console.error(chalk.red(`清理失败: ${errMsg(e)}`))
  }
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2))

  if (flags.version || positional[0] === 'version') {
    console.info(getVersion())
    return
  }

  const cwd = flags.repo ? path.resolve(flags.repo) : process.cwd()
  const rootDir = getRepoRoot(cwd)

  if (flags.ui) {
    console.info(chalk.blue(`Repo: ${rootDir}`))
    const handle = await startUiDevServer({
      repoRoot: rootDir,
      uiPort: flags.port,
      open: !flags.noOpen,
    })
    console.info(chalk.green(`UI 已启动: ${handle.uiUrl}`))

    const close = async () => {
      await handle.close()
      process.exit(0)
    }
    process.on('SIGINT', close)
    process.on('SIGTERM', close)
    return
  }

  if (!flags.json) {
    console.info(chalk.blue(`检测到git repo根目录 ${rootDir}，将在这里运行git命令`))
  }

  const { command, rest } = parseCommand(positional)
  if (command === 'list') {
    printWorktreeList(rootDir, flags.json)
    return
  }

  if (command === 'create') {
    await createWorktree({ rootDir, flags }, rest[0])
    return
  }

  if (command === 'delete') {
    await deleteWorktree({ rootDir, flags }, rest)
    return
  }

  if (command === 'open') {
    await openWorktree(rootDir, rest[0])
    return
  }

  if (command === 'config') {
    const [sub, key, value] = rest
    if (!sub) {
      printConfig()
      return
    }
    if (sub === 'get' && key) {
      getConfigKeyValue(key)
      return
    }
    if (sub === 'set' && key && typeof value === 'string') {
      setConfigKeyValue(key, value)
      return
    }
    console.error(chalk.red('用法: wtree config | wtree config get <key> | wtree config set <key> <value>'))
    process.exit(1)
  }

  if (command === 'help') {
    printHelp()
    return
  }

  if (command === 'lock') {
    await lockWorktree(rootDir, rest[0])
    return
  }

  if (command === 'unlock') {
    await unlockWorktree(rootDir, rest[0])
    return
  }

  if (command === 'prune') {
    await pruneWorktrees(rootDir)
    return
  }

  const directBranch = rest[0]

  const action = await getUserAction(directBranch)
  const ctx: Ctx = { rootDir, flags }
  if (action === 'create') {
    await createWorktree(ctx, directBranch)
  } else if (action === 'delete') {
    await deleteWorktree(ctx)
  } else if (action === 'open') {
    await openWorktree(rootDir)
  } else if (action === 'lock') {
    await lockWorktree(rootDir)
  } else if (action === 'unlock') {
    await unlockWorktree(rootDir)
  } else if (action === 'prune') {
    await pruneWorktrees(rootDir)
  } else {
    printWorktreeList(rootDir)
  }
}

async function getUserAction(directBranch?: string) {
  if (directBranch) return 'create'
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '请选择操作:',
      choices: [
        { name: '创建 Worktree (Create)', value: 'create' },
        { name: '删除 Worktree (Delete)', value: 'delete' },
        { name: '查看 Worktree 列表 (List)', value: 'list' },
        { name: '打开 Worktree (Open)', value: 'open' },
        { name: '锁定 Worktree (Lock)', value: 'lock' },
        { name: '解锁 Worktree (Unlock)', value: 'unlock' },
        { name: '清理无效 Worktree (Prune)', value: 'prune' },
      ],
    },
  ])
  return action as 'create' | 'delete' | 'list' | 'open' | 'lock' | 'unlock' | 'prune'
}

async function createWorktree(ctx: Ctx, directBranch?: string) {
  const { rootDir, flags } = ctx
  const defaultBranch =
    git(rootDir, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).stdout
      .replace(/^origin\//, '')
      .trim() || 'master'

  const { sourceType, selection } = await selectSource(rootDir, directBranch, defaultBranch)
  const { targetBranch, baseRef, isNewBranch } = await resolveBranchInfo(
    rootDir,
    sourceType,
    selection,
    directBranch,
    defaultBranch,
    flags,
  )
  const { targetDir, dirName } = await selectTargetDir(rootDir, targetBranch, flags)

  if (!flags.json) {
    console.info(chalk.green(`\n准备创建 Worktree:`))
    console.info(`  分支: ${targetBranch}`)
    console.info(`  目录: ${targetDir}`)
    console.info(`  来源: ${baseRef || 'Existing Local'}`)
  }

  await createGitWorktree(
    rootDir,
    targetDir,
    targetBranch,
    baseRef,
    isNewBranch,
    sourceType,
    defaultBranch,
  )

  await setupWorktreeEnv(rootDir, targetDir, dirName)
  await installDependencies(targetDir, flags.noInstall)
  await openInIDE(targetDir, flags)

  if (flags.json) {
    const items = listWorktrees(rootDir)
    const created = items.find(x => path.resolve(x.path) === path.resolve(targetDir))
    console.info(JSON.stringify({ ok: true, data: created || null }))
  }
}

async function selectSource(rootDir: string, directBranch: string | undefined, defaultBranch: string) {
  let sourceType: SourceType
  let selection: SourceSelection = { type: 'input' }

  if (directBranch) {
    sourceType = 'input'
  } else {
    const recentBranches = gitOrThrow(rootDir, [
      'for-each-ref',
      '--sort=-committerdate',
      'refs/heads/',
      '--format=%(refname:short)',
      '--count=6',
    ]).stdout
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean)

    const choices = [
      new inquirer.Separator('--- 最近编辑 ---'),
      ...recentBranches.map((b) => ({ name: b, value: { type: 'recent', branch: b } })),
      new inquirer.Separator('--- 其他 ---'),
      { name: '更多本地分支', value: { type: 'local' } },
      { name: '远程分支', value: { type: 'remote' } },
      { name: `从默认分支 (${defaultBranch}) 创建新分支`, value: { type: 'default' } },
      { name: '手动输入分支名', value: { type: 'input' } },
    ]

    const { selection: userSelection } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selection',
        message: '请选择分支来源:',
        choices,
        pageSize: 15,
      },
    ])

    selection = userSelection as SourceSelection
    sourceType = selection.type
  }

  return { sourceType, selection }
}

async function resolveBranchInfo(
  rootDir: string,
  sourceType: SourceType,
  selection: SourceSelection,
  directBranch: string | undefined,
  defaultBranch: string,
  flags: ParsedFlags,
) {
  let targetBranch = ''
  let baseRef = ''
  let isNewBranch = false

  if (sourceType === 'recent') {
    const b = (selection as { type: 'recent'; branch: string }).branch
    targetBranch = b
    baseRef = b
  } else if (sourceType === 'input') {
    let inputBranch = directBranch
    if (!inputBranch) {
      const r = await inquirer.prompt([
        {
          type: 'input',
          name: 'inputBranch',
          message: '请输入分支名称:',
          validate: (input: string) => (input ? true : '分支名不能为空'),
        },
      ])
      inputBranch = r.inputBranch
    }

    targetBranch = String(inputBranch).trim()
    const localExists = git(rootDir, ['rev-parse', '--verify', targetBranch]).ok
    if (localExists) {
      baseRef = targetBranch
    } else {
      try {
        execSync(`git fetch origin ${targetBranch}`, { cwd: rootDir, stdio: 'ignore' })
      } catch (e: unknown) {
        void e
      }
      const remoteExists = git(rootDir, ['rev-parse', '--verify', `origin/${targetBranch}`]).ok
      if (remoteExists) {
        baseRef = `origin/${targetBranch}`
        isNewBranch = true
      } else {
        if (flags.yes) {
          baseRef = flags.base || defaultBranch
          isNewBranch = true
        } else {
          const { createNew } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'createNew',
              message: `分支 ${targetBranch} 不存在。是否基于 ${defaultBranch} 创建新分支?`,
              default: true,
            },
          ])
          if (createNew) {
            baseRef = defaultBranch
            isNewBranch = true
          } else {
            process.exit(1)
          }
        }
      }
    }
  } else if (sourceType === 'default') {
    const { newBranchName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'newBranchName',
        message: `基于 ${defaultBranch} 创建新分支，请输入新分支名称:`,
        validate: (input: string) => (input ? true : '分支名不能为空'),
      },
    ])
    targetBranch = newBranchName
    baseRef = defaultBranch
    isNewBranch = true
  } else if (sourceType === 'local') {
    const branches = gitOrThrow(rootDir, ['branch', '--format=%(refname:short)']).stdout
      .split('\n')
      .map((b) => b.trim())
      .filter(Boolean)

    if (branches.length === 0) {
      process.exit(0)
    }

    const { branch } = await inquirer.prompt([
      { type: 'list', name: 'branch', message: '请选择本地分支:', choices: branches },
    ])
    targetBranch = branch
    baseRef = branch
  } else if (sourceType === 'remote') {
    try {
      execSync('git fetch origin', { stdio: 'ignore', cwd: rootDir })
    } catch (e: unknown) {
      void e
    }

    const branches = gitOrThrow(rootDir, ['branch', '-r', '--format=%(refname:short)']).stdout
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b && !b.includes('/HEAD'))
      .map((b) => b.replace(/^origin\//, ''))

    if (branches.length === 0) {
      process.exit(0)
    }

    const { branch } = await inquirer.prompt([
      { type: 'list', name: 'branch', message: '请选择远程分支:', choices: branches },
    ])
    targetBranch = branch
    baseRef = `origin/${branch}`
    isNewBranch = true
  }

  return { targetBranch, baseRef, isNewBranch }
}

async function selectTargetDir(rootDir: string, targetBranch: string, flags: ParsedFlags) {
  const defaultDirName = `worktrees/${targetBranch.split('/').join('-')}`

  let dirName: string
  if (flags.dir) {
    dirName = flags.dir
  } else if (flags.yes) {
    dirName = defaultDirName
  } else {
    const result = await inquirer.prompt([
      {
        type: 'input',
        name: 'dirName',
        message: `请输入 Worktree 目录路径 (相对于 Git 根目录, 默认: ${defaultDirName}):`,
        default: defaultDirName,
      },
    ])
    dirName = result.dirName
  }

  const targetDir = path.resolve(rootDir, dirName)
  if (fs.existsSync(targetDir)) {
    console.error(chalk.red(`目录 ${targetDir} 已存在!`))
    process.exit(1)
  }

  return { targetDir, dirName }
}

async function createGitWorktree(
  rootDir: string,
  targetDir: string,
  targetBranch: string,
  baseRef: string,
  isNewBranch: boolean,
  sourceType: SourceType,
  defaultBranch: string,
) {
  const localExists = git(rootDir, ['rev-parse', '--verify', targetBranch]).ok

  if (!localExists && isNewBranch) {
    try {
      git(rootDir, ['fetch', 'origin', `${defaultBranch}:${defaultBranch}`])
    } catch (e: unknown) {
      void e
    }
    gitOrThrow(rootDir, ['branch', targetBranch, baseRef], 'BRANCH_CREATE')
  }

  if (!localExists && !isNewBranch) {
    console.error(chalk.red(`分支 ${targetBranch} 不存在!`))
    process.exit(1)
  }

  if (localExists && isNewBranch && (sourceType === 'default' || sourceType === 'remote')) {
    gitOrThrow(rootDir, ['worktree', 'add', targetDir, targetBranch], 'WORKTREE_ADD')
    return
  }

  gitOrThrow(rootDir, ['worktree', 'add', targetDir, targetBranch], 'WORKTREE_ADD')
}

async function setupWorktreeEnv(rootDir: string, targetDir: string, dirName: string) {
  const copyFiles = ['.env', 'apps/platform-node/.development.env']
  for (const file of copyFiles) {
    const src = path.join(rootDir, file)
    const dest = path.join(targetDir, file)
    if (fs.existsSync(src)) {
      try {
        fs.mkdirSync(path.dirname(dest), { recursive: true })
        fs.copyFileSync(src, dest)
        console.info(`复制文件 ${file} -> ${dirName}/${file}`)
      } catch (e: unknown) {
        void e
      }
    }
  }
}

async function installDependencies(targetDir: string, skip = false) {
  if (skip) return
  if (!fs.existsSync(path.join(targetDir, 'package.json'))) return
  try {
    execSync('pnpm --version', { stdio: 'ignore' })
    console.info(chalk.blue('检测到 pnpm，正在安装依赖...'))
    execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' })
  } catch {
    console.warn(chalk.yellow('未检测到 pnpm 或安装失败，跳过依赖安装。'))
  }
}

function hasCommand(cmd: string) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function openInIDE(targetDir: string, flags: ParsedFlags) {
  if (flags.noEditor) return
  if (flags.editor !== undefined) {
    if (flags.editor === 'none' || flags.editor === '') return
    try {
      execSync(`${flags.editor} "${targetDir}"`, { stdio: 'ignore' })
    } catch (e: unknown) {
      void e
    }
    return
  }

  const editors: { name: string; value: string }[] = []
  if (hasCommand('trae')) editors.push({ name: `在 Trae 中打开 （trae ${targetDir}）`, value: 'trae' })
  if (hasCommand('cursor')) editors.push({ name: `在 Cursor 中打开 （cursor ${targetDir}）`, value: 'cursor' })
  if (hasCommand('code')) editors.push({ name: `在 VS Code 中打开 （code ${targetDir}）`, value: 'code' })

  if (editors.length === 0) return
  editors.unshift({ name: '暂不打开', value: 'none' })

  const { openWith } = await inquirer.prompt([
    {
      type: 'list',
      name: 'openWith',
      message: 'Worktree 创建成功，是否在 IDE 中打开?',
      choices: editors,
      default: editors[0]?.value,
    },
  ])

  if (openWith === 'none') return
  try {
    execSync(`${openWith} "${targetDir}"`, { stdio: 'ignore' })
  } catch (e: unknown) {
    void e
  }
}

async function deleteWorktree(ctx: Ctx, targets: string[] = []) {
  const { rootDir, flags } = ctx
  const worktrees = getWorktreeList(rootDir)
  const choices = getDeletableWorktrees(rootDir, worktrees)
  if (choices.length === 0) {
    if (flags.json) {
      console.info(JSON.stringify({ ok: true, data: [], message: 'No deletable worktrees' }))
    } else {
      console.warn(chalk.yellow('没有可删除的 Worktree (除了主 Worktree)'))
    }
    return
  }

  let targetPaths: string[]

  if (targets.length > 0) {
    // Non-interactive: resolve each target to a worktree path
    targetPaths = []
    for (const key of targets) {
      const wt = resolveWorktree(rootDir, key)
      if (!wt) {
        console.error(chalk.red(`未找到 worktree: ${key}`))
        process.exit(1)
      }
      if (path.resolve(wt.path) === path.resolve(rootDir)) {
        console.error(chalk.red(`不能删除主 worktree: ${key}`))
        process.exit(1)
      }
      targetPaths.push(wt.path)
    }
  } else {
    // Interactive: checkbox prompt
    const result = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'targetPaths',
        message: '请选择要删除的 Worktree:',
        choices,
        validate: (answer: string[]) => (answer.length > 0 ? true : '请至少选择一个'),
      },
    ])
    targetPaths = result.targetPaths
  }

  if (!flags.yes) {
    const { confirmDelete } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: `确定要删除这 ${targetPaths.length} 个 Worktree 吗?`,
        default: false,
      },
    ])
    if (!confirmDelete) return
  }

  for (const targetPath of targetPaths) {
    await deleteSingleWorktree(rootDir, targetPath, flags)
  }
}

function getWorktreeList(rootDir: string) {
  const output = gitOrThrow(rootDir, ['worktree', 'list', '--porcelain'], 'WORKTREE_LIST').stdout
  const raw = parseWorktreePorcelain(output)
  return raw.map((r) => ({
    path: r.path,
    branch: r.branch,
  }))
}

function getDeletableWorktrees(rootDir: string, worktrees: { path: string; branch?: string }[]) {
  return worktrees
    .filter((wt) => path.resolve(wt.path) !== path.resolve(rootDir))
    .map((wt) => {
      const relativePath = path.relative(rootDir, wt.path)
      return { name: `${wt.branch || 'HEAD'} (${relativePath})`, value: wt.path }
    })
}

async function deleteSingleWorktree(rootDir: string, targetPath: string, flags: ParsedFlags) {
  try {
    gitOrThrow(rootDir, ['worktree', 'remove', targetPath], 'WORKTREE_REMOVE')
    if (flags.json) {
      console.info(JSON.stringify({ ok: true, removed: targetPath }))
    } else {
      console.info(chalk.green(`成功删除: ${targetPath}`))
    }
  } catch (e: unknown) {
    if (flags.force) {
      try {
        gitOrThrow(rootDir, ['worktree', 'remove', '--force', targetPath], 'WORKTREE_REMOVE_FORCE')
        if (flags.json) {
          console.info(JSON.stringify({ ok: true, removed: targetPath, forced: true }))
        } else {
          console.info(chalk.green(`成功强制删除: ${targetPath}`))
        }
      } catch (forceErr: unknown) {
        if (flags.json) {
          console.error(JSON.stringify({ ok: false, error: errMsg(forceErr), path: targetPath }))
        } else {
          console.error(chalk.red(`强制删除也失败了: ${errMsg(forceErr)}`))
        }
      }
    } else {
      console.error(chalk.red(`删除失败: ${errMsg(e)}`))
      const { force } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'force',
          message: '删除失败 (可能有未提交的更改). 强制删除吗?',
          default: false,
        },
      ])
      if (!force) return
      try {
        gitOrThrow(rootDir, ['worktree', 'remove', '--force', targetPath], 'WORKTREE_REMOVE_FORCE')
        console.info(chalk.green(`成功强制删除: ${targetPath}`))
      } catch (forceErr: unknown) {
        console.error(chalk.red(`强制删除也失败了: ${errMsg(forceErr)}`))
      }
    }
  }
}

main().catch((e: unknown) => {
  console.error(chalk.red(errMsg(e)))
  process.exit(1)
})
