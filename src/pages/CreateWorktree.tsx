import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { useWorktreeStore } from '@/stores/worktreeStore'
import type { CreateWorktreeRequest } from '../../shared/wtui-types'
import { toast } from 'sonner'

type Mode = 'existing' | 'new'

export default function CreateWorktree() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const create = useWorktreeStore((s) => s.create)
  const branches = useWorktreeStore((s) => s.branches)
  const fetchBranches = useWorktreeStore((s) => s.fetchBranches)

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  const [mode, setMode] = useState<Mode>('existing')
  const [ref, setRef] = useState('')
  const [newBranch, setNewBranch] = useState('')
  const [p, setP] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resultPath, setResultPath] = useState<string | null>(null)

  const preview = useMemo(() => {
    const target = p.trim() ? p.trim() : '<path>'
    if (mode === 'new' && newBranch.trim()) {
      return `git branch ${newBranch.trim()} ${ref.trim() || '<ref>'} && git worktree add ${target} ${newBranch.trim()}`
    }
    return `git worktree add ${target} ${ref.trim() || '<ref>'}`
  }, [mode, newBranch, p, ref])

  const canSubmit = ref.trim().length > 0 && p.trim().length > 0 && (!mode || mode === 'existing' || newBranch.trim().length > 0)

  const onSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setResultPath(null)
    try {
      const payload: CreateWorktreeRequest = {
        ref: ref.trim(),
        path: p.trim(),
        ...(mode === 'new' ? { newBranch: newBranch.trim() } : {}),
      }
      const created = await create(payload)
      if (!created) {
        toast.error('创建失败')
        return
      }
      setResultPath(created.path)
      toast.success('创建成功')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error('创建失败', { description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              {t('create.back')}
            </Button>
          </Link>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('create.title')}</div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/help')}>{t('create.help')}</Button>
      </div>

      <div className="mt-5 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === 'existing' ? 'primary' : 'secondary'}
                onClick={() => setMode('existing')}
              >
                {t('create.tabs.existing')}
              </Button>
              <Button size="sm" variant={mode === 'new' ? 'primary' : 'secondary'} onClick={() => setMode('new')}>
                {t('create.tabs.new')}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-12 gap-3">
              <div className="col-span-12">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('create.fields.ref')}</div>
                <div className="mt-1">
                  <Input
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    placeholder={t('create.fields.refPlaceholder')}
                    list="branch-list"
                  />
                  <datalist id="branch-list">
                    {branches.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              {mode === 'new' ? (
                <div className="col-span-12">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('create.fields.newBranch')}</div>
                  <div className="mt-1">
                    <Input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder={t('create.fields.newBranchPlaceholder')} />
                  </div>
                </div>
              ) : null}

              <div className="col-span-12">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('create.fields.path')}</div>
                <div className="mt-1">
                  <Input value={p} onChange={(e) => setP(e.target.value)} placeholder={t('create.fields.pathPlaceholder')} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-end gap-2">
              <Button className="w-full sm:w-auto" variant="primary" size="sm" disabled={!canSubmit || submitting} onClick={onSubmit}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('create.submit')}
              </Button>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('create.preview.title')}</div>
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100">
              {preview}
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('create.preview.desc')}</div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('create.result.title')}</div>
            {submitting ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('create.result.creating')}
              </div>
            ) : resultPath ? (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('create.result.success')}
                </div>
                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100">
                  {resultPath}
                </div>
                <div className="mt-3">
                  <Link to="/">
                    <Button variant="secondary" size="sm">{t('create.result.backToList')}</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('create.result.empty')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
