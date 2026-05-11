export type RepoInfo = {
  rootPath: string
  gitDirPath: string
}

export type WorktreeItem = {
  id: string
  path: string
  head: string
  branch?: string
  isMain: boolean
  isLocked: boolean
  hasChanges?: boolean
}

export type CreateWorktreeRequest = {
  ref: string
  newBranch?: string
  path: string
}

export type WtuiConfig = {
  baseDir?: string
  openCommand?: string
  editorCommand?: string
}

export type StagedFileChange = {
  status: string
  path: string
}

export type WorktreeStagedInfo = {
  files: StagedFileChange[]
  diff: string
}

export type ApiError = {
  code: string
  message: string
  details?: string
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError }
