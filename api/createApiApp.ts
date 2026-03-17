import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import { createWorktreeRouter } from './routes/worktrees.js'

export function createApiApp(getRepoRoot: () => string) {
  const app: express.Application = express()

  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  app.use('/api', createWorktreeRouter(getRepoRoot))

  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ ok: true, data: { status: 'ok' } })
  })

  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    void error
    void req
    void next
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL', message: 'Server internal error' },
    })
  })

  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'API not found' } })
  })

  return app
}
