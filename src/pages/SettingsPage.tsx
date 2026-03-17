import { ArrowLeft, Save, RotateCcw, Eraser, Moon, Sun, Laptop, Languages } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { useWorktreeStore } from '@/stores/worktreeStore'
import { useThemeStore } from '@/stores/themeStore'
import { apiGet, apiPut } from '@/utils/api'
import type { WtuiConfig } from '../../shared/wtui-types'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const prune = useWorktreeStore((s) => s.prune)
  const { theme, setTheme } = useThemeStore()
  const [cfg, setCfg] = useState<WtuiConfig>({})
  const [loading, setLoading] = useState(false)
  const [pruning, setPruning] = useState(false)

  useEffect(() => {
    setLoading(true)
    apiGet<WtuiConfig>('/api/config')
      .then((r) => {
        if (r.ok) setCfg(r.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const onSave = async () => {
    setLoading(true)
    try {
      const r = await apiPut<WtuiConfig, WtuiConfig>('/api/config', cfg)
      if (!r.ok) {
        const msg = (r as { ok: false; error: { message: string } }).error.message
        toast.error(t('settings.toast.saveFailed'), { description: msg })
        return
      }
      setCfg(r.data)
      toast.success(t('settings.toast.saveSuccess'))
    } finally {
      setLoading(false)
    }
  }

  const onReset = async () => {
    setCfg({})
    setLoading(true)
    try {
      const r = await apiPut<WtuiConfig, WtuiConfig>('/api/config', {})
      if (!r.ok) {
        const msg = (r as { ok: false; error: { message: string } }).error.message
        toast.error(t('settings.toast.resetFailed', '重置失败'), { description: msg })
        return
      }
      setCfg(r.data)
      toast.info(t('settings.toast.resetSuccess', '已重置'))
    } finally {
      setLoading(false)
    }
  }

  const onPrune = async () => {
    setPruning(true)
    try {
      const ok = await prune()
      if (ok) {
        toast.success(t('settings.toast.pruneSuccess'))
      } else {
        toast.error(t('settings.toast.pruneFailed'))
      }
    } finally {
      setPruning(false)
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
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('settings.title')}</div>
        </div>
        <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-2">
          <Button className="w-full sm:w-auto" variant="secondary" size="sm" onClick={onReset} disabled={loading}>
            <RotateCcw className="h-4 w-4" />
            {t('settings.cli.reset')}
          </Button>
          <Button className="w-full sm:w-auto" variant="primary" size="sm" onClick={onSave} disabled={loading}>
            <Save className="h-4 w-4" />
            {t('settings.cli.save')}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('settings.preferences.title')}</div>
            <div className="mt-4 grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-6">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('settings.preferences.theme')}</div>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant={theme === 'light' ? 'primary' : 'secondary'}
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-4 w-4" />
                    {t('settings.preferences.light')}
                  </Button>
                  <Button
                    size="sm"
                    variant={theme === 'dark' ? 'primary' : 'secondary'}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-4 w-4" />
                    {t('settings.preferences.dark')}
                  </Button>
                  <Button
                    size="sm"
                    variant={theme === 'system' ? 'primary' : 'secondary'}
                    onClick={() => setTheme('system')}
                  >
                    <Laptop className="h-4 w-4" />
                    {t('settings.preferences.system')}
                  </Button>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-6">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('settings.preferences.language')}</div>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant={i18n.language.startsWith('en') ? 'primary' : 'secondary'}
                    onClick={() => i18n.changeLanguage('en')}
                  >
                    <Languages className="h-4 w-4" />
                    {t('settings.preferences.en')}
                  </Button>
                  <Button
                    size="sm"
                    variant={i18n.language.startsWith('zh') ? 'primary' : 'secondary'}
                    onClick={() => i18n.changeLanguage('zh')}
                  >
                    <Languages className="h-4 w-4" />
                    {t('settings.preferences.zh')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('settings.cli.title')}</div>
            <div className="mt-4 grid grid-cols-12 gap-3">
              <div className="col-span-12">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('settings.cli.baseDir')}</div>
                <div className="mt-1">
                  <Input
                    value={cfg.baseDir || ''}
                    onChange={(e) => setCfg((c) => ({ ...c, baseDir: e.target.value }))}
                    placeholder={t('settings.cli.baseDirPlaceholder')}
                  />
                </div>
              </div>
              <div className="col-span-12">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('settings.cli.openCommand')}</div>
                <div className="mt-1">
                  <Input
                    value={cfg.openCommand || ''}
                    onChange={(e) => setCfg((c) => ({ ...c, openCommand: e.target.value }))}
                    placeholder={t('settings.cli.openCommandPlaceholder')}
                  />
                </div>
              </div>
              <div className="col-span-12">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('settings.cli.editorCommand')}</div>
                <div className="mt-1">
                  <Input
                    value={cfg.editorCommand || ''}
                    onChange={(e) => setCfg((c) => ({ ...c, editorCommand: e.target.value }))}
                    placeholder={t('settings.cli.editorCommandPlaceholder')}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('settings.maintenance.title')}</div>
            <div className="mt-3">
              <Button className="w-full sm:w-auto" variant="secondary" size="sm" onClick={onPrune} disabled={pruning}>
                <Eraser className="h-4 w-4" />
                {t('settings.maintenance.prune')}
              </Button>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {t('settings.maintenance.pruneDesc')}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('settings.note.title')}</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('settings.note.desc')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
