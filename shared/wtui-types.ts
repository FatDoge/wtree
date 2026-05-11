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

export type FileChange = {
  status: string
  path: string
}

export type CommitInfo = {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
  parents: string[]
}

export type WorktreeDiffInfo = {
  staged: { files: FileChange[]; diff: string }
  unstaged: { files: FileChange[]; diff: string }
  commitGraph: string
}

export type ApiError = {
  code: string
  message: string
  details?: string
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError }
