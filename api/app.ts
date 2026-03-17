import dotenv from 'dotenv'
import { createApiApp } from './createApiApp.js'
import { getRepoRoot } from './core/git.js'

dotenv.config()

const repoRoot = (() => {
  const fromEnv = process.env.WTUI_REPO_ROOT
  if (fromEnv) return fromEnv
  try {
    return getRepoRoot(process.cwd())
  } catch {
    return process.cwd()
  }
})()

const app = createApiApp(() => repoRoot)

export default app
