import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/Button'

export default function HelpPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-6">
      <div className="flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            {t('create.back')}
          </Button>
        </Link>
        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('helpPage.title')}</div>
      </div>

      <div className="mt-5 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('helpPage.commands')}</div>
            <div className="mt-3 space-y-2 font-mono text-xs text-slate-700 dark:text-slate-200">
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree list</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree create &lt;branch&gt;</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree delete</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree open &lt;path|branch&gt;</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree lock &lt;path|branch&gt;</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree unlock &lt;path|branch&gt;</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree prune</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree config</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree config get &lt;key&gt;</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree config set &lt;key&gt; &lt;value&gt;</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree --ui</div>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 px-3 py-2">wtree --ui --no-open --port 5173</div>
            </div>
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t('helpPage.commandsDesc')}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-4">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('helpPage.faq.title')}</div>
            <div className="mt-2 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div>
                <div className="text-slate-700 dark:text-slate-200">{t('helpPage.faq.q1')}</div>
                <div className="mt-1">{t('helpPage.faq.a1')}</div>
              </div>
              <div>
                <div className="text-slate-700 dark:text-slate-200">{t('helpPage.faq.q2')}</div>
                <div className="mt-1">{t('helpPage.faq.a2')}</div>
              </div>
              <div>
                <div className="text-slate-700 dark:text-slate-200">{t('helpPage.faq.q3')}</div>
                <div className="mt-1">{t('helpPage.faq.a3')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
