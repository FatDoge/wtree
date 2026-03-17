import { spawnSync } from 'node:child_process'
import process from 'node:process'

function hasCommand(cmd: string) {
  try {
    const checkCmd = process.platform === 'win32' ? 'where' : 'which'
    const r = spawnSync(checkCmd, [cmd], { stdio: 'ignore' })
    return r.status === 0
  } catch {
    return false
  }
}

export function openPath(targetPath: string, openCommand?: string) {
  const platform = process.platform
  if (openCommand) {
    const r = spawnSync(openCommand, [targetPath], { stdio: 'ignore' })
    return r.status === 0
  }

  if (platform === 'darwin') {
    const r = spawnSync('open', [targetPath], { stdio: 'ignore' })
    return r.status === 0
  }

  if (platform === 'win32') {
    const r = spawnSync('cmd', ['/c', 'start', '', targetPath], {
      stdio: 'ignore',
      windowsVerbatimArguments: true,
    })
    return r.status === 0
  }

  const r = spawnSync('xdg-open', [targetPath], { stdio: 'ignore' })
  return r.status === 0
}

export function openEditor(targetPath: string, editorCommand?: string) {
  if (editorCommand) {
    // Split command and args? For now assume command is single word or handled by spawnSync if passed as array.
    // Actually spawnSync(cmd, args) expects cmd to be executable.
    // If editorCommand is "code -r", it might fail if passed as cmd.
    // We should probably split by space if user provided args, but let's keep it simple: assume user provides executable name.
    // Or we can use shell: true for custom commands.
    const r = spawnSync(editorCommand, [targetPath], { stdio: 'ignore', shell: true })
    return r.status === 0
  }

  const editors = ['trae', 'cursor', 'code']
  for (const ed of editors) {
    if (hasCommand(ed)) {
      const r = spawnSync(ed, [targetPath], { stdio: 'ignore' })
      return r.status === 0
    }
  }
  return false
}

