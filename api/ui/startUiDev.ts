import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import serveStatic from 'serve-static'
import { createApiApp } from '../createApiApp.js'
import { openPath } from '../core/open.js'

export type UiDevHandle = {
  uiUrl: string
  close: () => Promise<void>
}

export async function startUiDevServer(options: {
  repoRoot: string
  uiPort?: number
  open?: boolean
}) : Promise<UiDevHandle> {
  const repoRoot = options.repoRoot
  const open = options.open !== false
  const uiPort = Number.isFinite(options.uiPort) ? (options.uiPort as number) : 5173

  const apiApp = createApiApp(() => repoRoot)
  const apiServer = apiApp.listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => apiServer.once('listening', () => resolve()))
  const apiAddress = apiServer.address()
  const apiPort = typeof apiAddress === 'object' && apiAddress ? apiAddress.port : 0
  
  // Set API URL for UI to consume
  process.env.WTUI_API_URL = `http://127.0.0.1:${apiPort}`

  // Setup static file serving for UI
  const here = path.dirname(fileURLToPath(import.meta.url))
  // In production (dist-node/api/ui), UI assets are in ../../../dist (root/dist)
  const distPath = path.resolve(here, '..', '..', '..', 'dist')
  
  const uiApp = express()
  
  // Proxy API requests to the API server
  uiApp.use('/api', (req, res) => {
    // Basic proxy implementation since we are in the same process
    // But since we have createApiApp, we can just mount it?
    // Actually createApiApp returns an express app, we can mount it directly.
    // However, createApiApp includes cors and body parsers which might conflict if mounted twice?
    // Let's just use the apiApp directly for API requests if possible, 
    // but here we are starting a separate UI server.
    // A better approach: merge them into one server.
    res.redirect(`http://127.0.0.1:${apiPort}/api${req.url}`)
  })

  // Serve static files
  uiApp.use(serveStatic(distPath))
  
  // SPA fallback
  uiApp.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })

  // Start UI server
  // Note: We need to inject the API URL into the HTML or provide it via an endpoint
  // The current UI implementation uses relative paths /api/..., so we need to proxy /api
  // Let's rewrite the logic to use a single server for both API and UI
  
  const combinedApp = express()
  
  // 1. API routes
  // The createApiApp returns an app that already handles /api routes.
  // We should mount it at root, so requests to /api/xxx are handled correctly.
  combinedApp.use(createApiApp(() => repoRoot))
  
  // 2. Static files
  combinedApp.use(serveStatic(distPath))
  
  // 3. SPA fallback
  combinedApp.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })

  // Close the temporary apiServer we created earlier since we are using combinedApp now
  apiServer.close()

  // Use port 0 if uiPort is not specified or if user wants random port (handled by caller passing 0?)
  // If uiPort is 5173 (default), we might want to try it, and failover?
  // But standard express behavior for port 0 is random port.
  // If user explicitly passed a port, we should use it and fail if taken.
  // If default (5173), we should probably try it, but if taken, maybe random?
  // Let's implement simple retry logic or just use random port if default fails?
  // The current error EADDRINUSE suggests we are forcing 5173.
  
  // Let's modify the logic: 
  // If user provided a specific port (not default 5173 logic), use it.
  // If we are using default 5173, we can try it, but to be safe and avoid conflicts, 
  // maybe we should just use port 0 (random) by default unless specified?
  // Or keep 5173 as preference but fallback to 0 if busy.
  
  let finalPort = uiPort
  let combinedServer: ReturnType<typeof combinedApp.listen>

  try {
    combinedServer = await startServer(combinedApp, uiPort)
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === 'EADDRINUSE' && uiPort === 5173 && !options.uiPort) {
      // Retry with random port if default port 5173 is taken and user didn't force it
      combinedServer = await startServer(combinedApp, 0)
      const addr = combinedServer.address()
      if (typeof addr === 'object' && addr) {
        finalPort = addr.port
      }
    } else {
      throw e
    }
  }
  
  // const combinedServer = combinedApp.listen(uiPort, '127.0.0.1')
  // await new Promise<void>((resolve) => combinedServer.once('listening', () => resolve()))
  
  const address = combinedServer.address()
  if (typeof address === 'object' && address) {
    finalPort = address.port
  }
  
  const url = `http://127.0.0.1:${finalPort}/`

  if (open) {
    openPath(url)
  }

  return {
    uiUrl: url,
    close: async () => {
      await new Promise<void>((resolve) => combinedServer.close(() => resolve()))
    },
  }
}

function startServer(app: express.Express, port: number): Promise<ReturnType<typeof app.listen>> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1')
    server.once('listening', () => resolve(server))
    server.once('error', (err) => reject(err))
  })
}
