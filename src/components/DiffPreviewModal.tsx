import '@pierre/diffs/dist/components/web-components.js'
import { PatchDiff } from '@pierre/diffs/react'
import { useTranslation } from 'react-i18next'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import Modal from './Modal'
import Button from './Button'
import type { StagedFileChange } from '../../shared/wtui-types'

type Props = {
  open: boolean
  onClose: () => void
  worktreePath: string
  files: StagedFileChange[]
  diff: string
  loading?: boolean
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  A: { label: 'A', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  M: { label: 'M', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  D: { label: 'D', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' },
  R: { label: 'R', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  C: { label: 'C', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
}

function statusMeta(s: string) {
  return (
    STATUS_LABELS[s[0]?.toUpperCase()] ?? {
      label: s,
      cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    }
  )
}

export default function DiffPreviewModal({ open, onClose, worktreePath, files, diff, loading }: Props) {
  const { t } = useTranslation()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diff)
      toast.success(t('diff.toast.copied'))
    } catch {
      toast.error(t('diff.toast.copyFailed'))
    }
  }

  const handleOpenDiffscom = () => {
    navigator.clipboard.writeText(diff).catch(() => {})
    window.open('https://diffs.com', '_blank', 'noopener,noreferrer')
    toast.info(t('diff.toast.openedDiffscom'))
  }

  return (
    <Modal
      title={t('diff.title')}
      open={open}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!diff}>
            <Copy className="h-4 w-4" />
            {t('diff.copyDiff')}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleOpenDiffscom} disabled={!diff}>
            <ExternalLink className="h-4 w-4" />
            {t('diff.openDiffscom')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('diff.close')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{worktreePath}</div>

        {loading ? (
          <div className="space-y-2">
            <div className="h-5 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
            <div className="h-5 animate-pulse rounded bg-slate-100 dark:bg-slate-900 w-3/4" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('diff.noChanges')}</div>
        ) : (
          <>
            <div>
              <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                {t('diff.stagedFiles')} ({files.length})
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                {files.map((f, i) => {
                  const meta = statusMeta(f.status)
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 border-b last:border-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                    >
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.cls}`}>
                        {meta.label}
                      </span>
                      <span className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate">{f.path}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {diff ? (
              <div>
                <div className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t('diff.diffPreview')}</div>
                <div className="max-h-96 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <PatchDiff
                    patch={diff}
                    disableWorkerPool
                    options={{
                      theme: { dark: 'github-dark', light: 'github-light' },
                      themeType: 'system',
                    }}
                  />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  )
}
