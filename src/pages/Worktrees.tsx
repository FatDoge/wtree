import { Copy, ExternalLink, Plus, RefreshCw, Settings, Trash2, Lock, Unlock, Code, GitCompare } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/Button'
import Modal from '@/components/Modal'
import DiffPreviewModal from '@/components/DiffPreviewModal'
import { useWorktreeStore } from '@/stores/worktreeStore'
import { toast } from 'sonner'
import type { StagedFileChange } from '../../shared/wtui-types'

function truncatePath(p: string) {
  if (p.length <= 70) return p
  return `${p.slice(0, 28)}…${p.slice(-38)}`
}

export default function Worktrees() {
  const { t } = useTranslation()
  const loading = useWorktreeStore((s) => s.loading)
  const items = useWorktreeStore((s) => s.items)
  const selectedId = useWorktreeStore((s) => s.selectedId)
  const refresh = useWorktreeStore((s) => s.refresh)
  const select = useWorktreeStore((s) => s.select)
  const remove = useWorktreeStore((s) => s.remove)
  const open = useWorktreeStore((s) => s.open)
  const lock = useWorktreeStore((s) => s.lock)
  const unlock = useWorktreeStore((s) => s.unlock)

  const fetchStagedDiff = useWorktreeStore((s) => s.fetchStagedDiff)

  const [removeId, setRemoveId] = useState<string | null>(null)
  const [forceDelete, setForceDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [diffWorktreeId, setDiffWorktreeId] = useState<string | null>(null)
  const [diffFiles, setDiffFiles] = useState<StagedFileChange[]>([])
  const [diffContent, setDiffContent] = useState('')
  const [diffLoading, setDiffLoading] = useState(false)

  const selected = useMemo(() => items.find((x) => x.id === selectedId), [items, selectedId])
  const toRemove = useMemo(() => items.find((x) => x.id === removeId), [items, removeId])
  const diffWorktree = useMemo(() => items.find((x) => x.id === diffWorktreeId), [items, diffWorktreeId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const closeModal = () => {
    setRemoveId(null)
    setForceDelete(false)
    setIsDeleting(false)
  }

  const openDiff = async (id: string) => {
    setDiffWorktreeId(id)
    setDiffFiles([])
    setDiffContent('')
    setDiffLoading(true)
    try {
      const info = await fetchStagedDiff(id)
      if (info) {
        setDiffFiles(info.files)
        setDiffContent(info.diff)
      }
    } finally {
      setDiffLoading(false)
    }
  }

  const closeDiff = () => {
    setDiffWorktreeId(null)
    setDiffFiles([])
    setDiffContent('')
  }

  const handleDelete = async () => {
    if (!removeId) return
    setIsDeleting(true)
    try {
      const res = await remove(removeId, forceDelete)
      if (res.success) {
        toast.success(forceDelete ? t('worktrees.toast.forceDeleteSuccess') : t('worktrees.toast.deleteSuccess'))
        closeModal()
      } else {
        const msg = res.error || ''
        if (msg.toLowerCase().includes('force') || msg.includes('modified') || msg.includes('untracked')) {
          setForceDelete(true)
          toast.error(t('worktrees.toast.deleteFailed'), { description: t('worktrees.toast.deleteWarning') })
        } else {
          toast.error(t('worktrees.toast.deleteFailed'), { description: msg })
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(t('worktrees.toast.deleteFailed'), { description: msg })
    } finally {
      setIsDeleting(false)
    }
  }

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('worktrees.toast.copySuccess'))
    } catch {
      toast.error(t('worktrees.toast.copyFailed'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('worktrees.title')}</div>
          <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{t('worktrees.subtitle')}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <Link to="/create">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-9 order-2 lg:order-1">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="hidden md:grid grid-cols-12 gap-2 border-b border-slate-100 dark:border-slate-800 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="col-span-5">{t('worktrees.table.path')}</div>
              <div className="col-span-3">{t('worktrees.table.branch')}</div>
              <div className="col-span-2">{t('worktrees.table.flags')}</div>
              <div className="col-span-2 text-right">{t('worktrees.table.actions')}</div>
            </div>

            {loading ? (
              <div className="p-4">
                <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-900" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-300">{t('worktrees.empty')}</div>
            ) : (
              <div className="max-h-[520px] overflow-auto">
                {items.map((wt) => {
                  const active = wt.id === selectedId
                  const flags = [
                    wt.isMain ? 'Main' : null,
                    wt.isLocked ? 'Locked' : null,
                  ].filter(Boolean)

                  return (
                    <div
                      key={wt.id}
                      className={
                        active
                          ? 'flex flex-col md:grid md:grid-cols-12 gap-2 bg-slate-100 dark:bg-slate-900/60 px-3 py-3 md:py-2 text-sm border-b md:border-b-0 border-slate-100 dark:border-slate-800/50'
                          : 'flex flex-col md:grid md:grid-cols-12 gap-2 px-3 py-3 md:py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-900/40 border-b md:border-b-0 border-slate-100 dark:border-slate-800/50'
                      }
                      onClick={() => select(wt.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="col-span-5 min-w-0">
                        <div className="md:hidden text-xs text-slate-500 dark:text-slate-400 mb-0.5">{t('worktrees.table.path')}</div>
                        <div className="truncate font-mono text-xs text-slate-900 dark:text-slate-100" title={wt.path}>
                          {truncatePath(wt.path)}
                        </div>
                      </div>
                      <div className="col-span-3 min-w-0 mt-2 md:mt-0">
                        <div className="md:hidden flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{t('worktrees.table.branch')}</span>
                          <span className="font-mono text-xs text-slate-500">{wt.head.slice(0, 10)}</span>
                        </div>
                        <div className="truncate text-slate-900 dark:text-slate-100">
                          {wt.branch ? wt.branch : 'HEAD'}
                        </div>
                        <div className="hidden md:block truncate font-mono text-xs text-slate-500">{wt.head.slice(0, 10)}</div>
                      </div>
                      <div className="col-span-2 flex flex-wrap items-center gap-1 mt-2 md:mt-0">
                        {flags.length === 0 ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:inline">—</span>
                        ) : (
                          flags.map((f) => (
                            <span
                              key={f}
                              className="rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-600 dark:text-slate-300"
                            >
                              {f}
                            </span>
                          ))
                        )}
                      </div>
                      <div className="col-span-2 mt-3 md:mt-0 flex md:justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDiff(wt.id)
                          }}
                          title={t('diff.viewStaged')}
                        >
                          <GitCompare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            open(wt.id).then((ok) =>
                              ok
                                ? toast.success(t('worktrees.toast.folderSuccess'))
                                : toast.error(t('worktrees.toast.folderFailed')),
                            )
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCopy(wt.path)
                          }}
                          title={t('worktrees.actions.copy')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={wt.isMain}
                          onClick={(e) => {
                            e.stopPropagation()
                            setRemoveId(wt.id)
                          }}
                          title={t('worktrees.actions.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 order-1 lg:order-2 mb-4 lg:mb-0">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('worktrees.details')}</div>
            {selected ? (
              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <div className="text-slate-500 dark:text-slate-400">{t('worktrees.detailsPanel.path')}</div>
                  <div className="mt-1 break-all font-mono text-slate-900 dark:text-slate-100">{selected.path}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">{t('worktrees.detailsPanel.branch')}</div>
                    <div className="mt-1 truncate text-slate-900 dark:text-slate-100" title={selected.branch || 'HEAD'}>{selected.branch || 'HEAD'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">{t('worktrees.detailsPanel.main')}</div>
                    <div className="mt-1 text-slate-900 dark:text-slate-100">{selected.isMain ? t('worktrees.detailsPanel.yes') : t('worktrees.detailsPanel.no')}</div>
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">{t('worktrees.detailsPanel.head')}</div>
                  <div className="mt-1 break-all font-mono text-slate-900 dark:text-slate-100">{selected.head}</div>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
                  <Button className="w-full sm:w-auto" variant="secondary" size="sm" onClick={() => onCopy(selected.path)}>
                    <Copy className="h-4 w-4" />
                    {t('worktrees.actions.copy')}
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const action = selected.isLocked ? unlock : lock
                      const msg = selected.isLocked ? t('worktrees.toast.unlockSuccess') : t('worktrees.toast.lockSuccess')
                      const msgFail = selected.isLocked ? t('worktrees.toast.unlockFailed') : t('worktrees.toast.lockFailed')
                      action(selected.id).then((ok) =>
                        ok ? toast.success(msg) : toast.error(msgFail),
                      )
                    }}
                  >
                    {selected.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {selected.isLocked ? t('worktrees.actions.unlock') : t('worktrees.actions.lock')}
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      open(selected.id, 'editor').then((ok) =>
                        ok ? toast.success(t('worktrees.toast.ideSuccess')) : toast.error(t('worktrees.toast.ideFailed')),
                      )
                    }
                  >
                    <Code className="h-4 w-4" />
                    {t('worktrees.actions.ide')}
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      open(selected.id, 'folder').then((ok) =>
                        ok ? toast.success(t('worktrees.toast.folderSuccess')) : toast.error(t('worktrees.toast.folderFailed')),
                      )
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('worktrees.actions.folder')}
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    variant="secondary"
                    size="sm"
                    onClick={() => openDiff(selected.id)}
                  >
                    <GitCompare className="h-4 w-4" />
                    {t('diff.viewStaged')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('worktrees.selectToView')}</div>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('worktrees.help.title')}</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('worktrees.help.desc')}</div>
            <div className="mt-3">
              <Link to="/help">
                <Button variant="secondary" size="sm">{t('worktrees.help.viewCommands')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <DiffPreviewModal
        open={Boolean(diffWorktreeId)}
        onClose={closeDiff}
        worktreePath={diffWorktree?.path ?? ''}
        files={diffFiles}
        diff={diffContent}
        loading={diffLoading}
      />

      <Modal
        title={forceDelete ? t('worktrees.deleteModal.forceTitle') : t('worktrees.deleteModal.title')}
        open={Boolean(removeId)}
        onClose={closeModal}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={closeModal} disabled={isDeleting}>
              {t('worktrees.deleteModal.cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t('worktrees.deleteModal.deleting') : forceDelete ? t('worktrees.deleteModal.forceConfirm') : t('worktrees.deleteModal.confirm')}
            </Button>
          </>
        }
      >
        <div className="text-xs text-slate-600 dark:text-slate-300">{t('worktrees.deleteModal.desc')}</div>
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100">
          {toRemove ? toRemove.path : '—'}
        </div>
        {forceDelete ? (
          <div className="mt-2 rounded bg-rose-100 dark:bg-rose-500/10 px-2 py-1 text-xs text-rose-600 dark:text-rose-400">
            {t('worktrees.deleteModal.warning')}
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('worktrees.deleteModal.normalNote')}</div>
        )}
      </Modal>
    </div>
  )
}
