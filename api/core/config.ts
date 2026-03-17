import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import type { WtuiConfig } from '../../shared/wtui-types.js'

const CONFIG_DIR = path.join(os.homedir(), '.config', 'wtree')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

export function readConfig(): WtuiConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw) as WtuiConfig
  } catch {
    return {}
  }
}

export function writeConfig(next: WtuiConfig) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8')
}

export function getConfigPaths() {
  return { dir: CONFIG_DIR, path: CONFIG_PATH }
}
