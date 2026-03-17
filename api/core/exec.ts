import { spawnSync } from 'node:child_process'

export type ExecResult = {
  ok: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

export type ExecError = Error & {
  exec?: {
    command: string
    args: string[]
    ok: boolean
    stdout: string
    stderr: string
    exitCode: number | null
  }
}

export function exec(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): ExecResult {
  const r = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf-8',
  })

  const stdout = (r.stdout || '').toString()
  const stderr = (r.stderr || '').toString()
  const ok = r.status === 0

  return {
    ok,
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    exitCode: r.status,
  }
}

export function execOrThrow(
  command: string,
  args: string[],
  options: { cwd?: string; errorCode?: string } = {},
) {
  const r = exec(command, args, { cwd: options.cwd })
  if (r.ok) return r
  const error: ExecError = new Error(
    `${options.errorCode ? `[${options.errorCode}] ` : ''}${command} ${args.join(' ')}\n${r.stderr || r.stdout}`,
  )
  error.exec = { command, args, ...r }
  throw error
}
