import { describe, expect, it } from 'vitest'
import { parseWorktreePorcelain } from './worktree.js'

describe('parseWorktreePorcelain', () => {
  it('parses multiple worktrees with branch and locked', () => {
    const output = [
      'worktree /repo',
      'HEAD 1111111111111111111111111111111111111111',
      'branch refs/heads/main',
      'worktree /repo/worktrees/feature-a',
      'HEAD 2222222222222222222222222222222222222222',
      'branch refs/heads/feature/a',
      'locked',
      '',
    ].join('\n')

    const items = parseWorktreePorcelain(output)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      path: '/repo',
      head: '1111111111111111111111111111111111111111',
      branch: 'main',
      isLocked: false,
    })
    expect(items[1]).toEqual({
      path: '/repo/worktrees/feature-a',
      head: '2222222222222222222222222222222222222222',
      branch: 'feature/a',
      isLocked: true,
    })
  })
})

