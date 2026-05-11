import { PatchDiff } from '@pierre/diffs/react'
import { FileTree, useFileTree } from '@pierre/trees/react'
import { useTranslation } from 'react-i18next'
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { Copy, GitCommitHorizontal, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Modal from './Modal'
import Button from './Button'
import { useThemeStore } from '../stores/themeStore'
import type { FileChange, WorktreeDiffInfo } from '../../shared/wtui-types'

type Props = {
  open: boolean
  onClose: () => void
  worktreePath: string
  diffInfo: WorktreeDiffInfo | null
  loading?: boolean
}

function buildPatchMap(patch: string): Map<string, string> {
  const map = new Map<string, string>()
  if (!patch) return map
  const lines = patch.split('\n')
  let current: string[] = []
  let currentPath = ''
  const flush = () => {
    if (currentPath && current.length > 0) map.set(currentPath, current.join('\n'))
    current = []
    currentPath = ''
  }
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      flush()
      const match = line.match(/^diff --git a\/.+ b\/(.+)$/)
      currentPath = match?.[1] ?? ''
    }
    current.push(line)
  }
  flush()
  return map
}

const GIT_STATUS_MAP: Record<string, 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'> = {
  A: 'added', M: 'modified', D: 'deleted', R: 'renamed', C: 'added', U: 'untracked', '?': 'untracked',
}

const TREE_STYLES_LIGHT = {
  colorScheme: 'light' as const,
  '--trees-theme-sidebar-bg': '#ffffff',
  '--trees-theme-sidebar-fg': '#1e293b',
  '--trees-theme-sidebar-border': '#e2e8f0',
  '--trees-theme-list-hover-bg': '#f8fafc',
  '--trees-theme-list-active-selection-bg': '#eff6ff',
  '--trees-theme-list-active-selection-fg': '#1e293b',
  '--trees-theme-git-added-fg': '#16a34a',
  '--trees-theme-git-modified-fg': '#2563eb',
  '--trees-theme-git-deleted-fg': '#dc2626',
}

const TREE_STYLES_DARK = {
  colorScheme: 'dark' as const,
  '--trees-theme-sidebar-bg': '#0f172a',
  '--trees-theme-sidebar-fg': '#e2e8f0',
  '--trees-theme-sidebar-border': '#1e293b',
  '--trees-theme-list-hover-bg': 'rgba(15,23,42,0.4)',
  '--trees-theme-list-active-selection-bg': 'rgba(30,58,138,0.3)',
  '--trees-theme-list-active-selection-fg': '#e2e8f0',
  '--trees-theme-git-added-fg': '#4ade80',
  '--trees-theme-git-modified-fg': '#60a5fa',
  '--trees-theme-git-deleted-fg': '#f87171',
}

type SelectedFile = { path: string; group: 'staged' | 'unstaged' }

/* ── Collapsible section wrapper ── */

function CollapsibleSection({
  title,
  titleColor,
  icon,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  titleColor: string
  icon?: React.ReactNode
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${titleColor} hover:bg-slate-50 dark:hover:bg-slate-900/40 shrink-0`}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {icon}
        {title}
        {count != null && <span className="ml-auto font-normal text-slate-400 dark:text-slate-500 normal-case">{count}</span>}
      </button>
      {open && children}
    </div>
  )
}

/* ── File tree section ── */

function SidebarTree({
  files,
  isDark,
  onSelect,
  group,
}: {
  files: FileChange[]
  isDark: boolean
  onSelect: (file: SelectedFile) => void
  group: 'staged' | 'unstaged'
}) {
  const paths = useMemo(() => files.map((f) => f.path), [files])
  const gitStatus = useMemo(
    () => files.map((f) => ({
      path: f.path,
      status: GIT_STATUS_MAP[f.status[0]?.toUpperCase()] ?? ('modified' as const),
    })),
    [files],
  )

  const { model } = useFileTree({
    paths,
    gitStatus,
    initialExpansion: 'open',
    flattenEmptyDirectories: true,
    density: 'compact',
    icons: { set: 'standard', colored: true },
    initialVisibleRowCount: paths.length + 10,
    onSelectionChange: useCallback(
      (selected: string[]) => {
        const filePath = selected[0]
        if (filePath && files.some((f) => f.path === filePath)) {
          onSelect({ path: filePath, group })
        }
      },
      [files, onSelect, group],
    ),
  })

  // compact density itemHeight=24. Count files + unique parent dirs for row estimate.
  const dirCount = new Set(files.map((f) => f.path.substring(0, f.path.lastIndexOf('/'))).filter(Boolean)).size
  const treeHeight = Math.max((files.length + dirCount) * 24, 48)

  return (
    <FileTree
      model={model}
      style={{
        height: `${treeHeight}px`,
        ...(isDark ? TREE_STYLES_DARK : TREE_STYLES_LIGHT),
      }}
    />
  )
}

/* ── Commit graph (ASCII from git log --graph) ── */

function CommitGraphView({ graphText }: { graphText: string }) {
  if (!graphText) return null
  const lines = graphText.split('\n').filter((l) => l.length > 0)
  return (
    <pre className="font-mono text-[11px] leading-5 px-1 py-1 text-slate-700 dark:text-slate-300 whitespace-pre overflow-x-auto">
      {lines.map((line, i) => {
        // Split line into graph prefix (*/|/\ chars) and commit text
        const match = line.match(/^([* |/\\]+?)(\s[a-f0-9]{7,}.*)$/i)
        if (match) {
          return (
            <div key={i}>
              <span className="text-blue-400 dark:text-blue-500">{match[1]}</span>
              <span>{match[2]}</span>
            </div>
          )
        }
        // Pure graph lines (like |\ or |/)
        return (
          <div key={i} className="text-blue-400 dark:text-blue-500">{line}</div>
        )
      })}
    </pre>
  )
}

/* ── Draggable vertical divider ── */

function useDragResize(initialWidth: number, minWidth: number, maxWidth: number) {
  const [width, setWidth] = useState(initialWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startW.current = width

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = ev.clientX - startX.current
      setWidth(Math.max(minWidth, Math.min(maxWidth, startW.current + delta)))
    }
    const onMouseUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [width, minWidth, maxWidth])

  return { width, onMouseDown }
}

/* ── Main component ── */

export default function DiffPreviewModal({ open, onClose, worktreePath, diffInfo, loading }: Props) {
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.theme)
  const [selected, setSelected] = useState<SelectedFile | null>(null)
  const { width: sidebarWidth, onMouseDown: onDividerMouseDown } = useDragResize(260, 160, 640)

  const resolvedThemeType = theme === 'system' ? 'system' : theme === 'dark' ? 'dark' : 'light'
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const staged = diffInfo?.staged
  const unstaged = diffInfo?.unstaged
  const commitGraph = diffInfo?.commitGraph ?? ''
  const allDiff = [staged?.diff, unstaged?.diff].filter(Boolean).join('\n')
  const hasChanges = (staged?.files.length ?? 0) > 0 || (unstaged?.files.length ?? 0) > 0

  const stagedPatchMap = useMemo(() => buildPatchMap(staged?.diff ?? ''), [staged?.diff])
  const unstagedPatchMap = useMemo(() => buildPatchMap(unstaged?.diff ?? ''), [unstaged?.diff])

  useEffect(() => {
    if (!diffInfo) { setSelected(null); return }
    const first = diffInfo.staged.files[0] ?? diffInfo.unstaged.files[0]
    if (first) {
      setSelected({ path: first.path, group: diffInfo.staged.files[0] ? 'staged' : 'unstaged' })
    } else {
      setSelected(null)
    }
  }, [diffInfo])

  const selectedPatch = useMemo(() => {
    if (!selected) return null
    const map = selected.group === 'staged' ? stagedPatchMap : unstagedPatchMap
    return map.get(selected.path) ?? null
  }, [selected, stagedPatchMap, unstagedPatchMap])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedPatch || allDiff)
      toast.success(t('diff.toast.copied'))
    } catch {
      toast.error(t('diff.toast.copyFailed'))
    }
  }

  return (
    <Modal
      title={t('diff.title')}
      open={open}
      onClose={onClose}
      size="full"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!allDiff}>
            <Copy className="h-4 w-4" />
            {t('diff.copyDiff')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('diff.close')}
          </Button>
        </>
      }
    >
      <div className="max-h-[75vh]">
        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate mb-2">{worktreePath}</div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-5 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            <div className="h-5 animate-pulse rounded bg-slate-100 dark:bg-slate-900 w-3/4" />
          </div>
        ) : !hasChanges && !commitGraph ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('diff.noChanges')}</div>
        ) : (
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ height: 'calc(75vh - 40px)' }}>
            {/* Left sidebar */}
            <div className="shrink-0 flex flex-col bg-white dark:bg-slate-950" style={{ width: `${sidebarWidth}px` }}>
              {/* File trees + commits — scrollable as a whole */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {staged && staged.files.length > 0 && (
                  <CollapsibleSection
                    title={t('diff.stagedFiles')}
                    titleColor="text-emerald-600 dark:text-emerald-400"
                    count={staged.files.length}
                  >
                    <SidebarTree files={staged.files} isDark={isDark} onSelect={setSelected} group="staged" />
                  </CollapsibleSection>
                )}

                {unstaged && unstaged.files.length > 0 && (
                  <>
                    {staged && staged.files.length > 0 && <div className="border-t border-slate-200 dark:border-slate-800" />}
                    <CollapsibleSection
                      title={t('diff.unstagedFiles')}
                      titleColor="text-amber-600 dark:text-amber-400"
                      count={unstaged.files.length}
                    >
                      <SidebarTree files={unstaged.files} isDark={isDark} onSelect={setSelected} group="unstaged" />
                    </CollapsibleSection>
                  </>
                )}
              </div>

              {/* Commits — pinned to bottom */}
              {commitGraph && (
                <div className="shrink-0 border-t border-slate-200 dark:border-slate-800">
                  <CollapsibleSection
                    title={t('diff.commits')}
                    titleColor="text-slate-500 dark:text-slate-400"
                    icon={<GitCommitHorizontal className="h-3 w-3" />}
                    defaultOpen={!hasChanges}
                  >
                    <div className="max-h-64 overflow-auto">
                      <CommitGraphView graphText={commitGraph} />
                    </div>
                  </CollapsibleSection>
                </div>
              )}
            </div>

            {/* Draggable divider */}
            <div
              className="w-1 shrink-0 cursor-col-resize bg-slate-200 dark:bg-slate-800 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors"
              onMouseDown={onDividerMouseDown}
            />

            {/* Right panel — diff viewer */}
            <div className="flex-1 min-w-0 overflow-auto bg-white dark:bg-slate-950">
              {selectedPatch ? (
                <PatchDiff
                  patch={selectedPatch}
                  disableWorkerPool
                  options={{
                    theme: { dark: 'github-dark', light: 'github-light' },
                    themeType: resolvedThemeType,
                  }}
                />
              ) : selected ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400 dark:text-slate-500">
                  {t('diff.noDiffContent')}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-slate-400 dark:text-slate-500">
                  {t('diff.selectFile')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
