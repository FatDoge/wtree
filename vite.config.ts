import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const hasDevLocator = (() => {
  try {
    require.resolve('babel-plugin-react-dev-locator')
    return true
  } catch {
    return false
  }
})()

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: hasDevLocator ? ['react-dev-locator'] : [],
      },
    }),
    tsconfigPaths(),
  ],
  server: {
    proxy: {
      '/api': {
        target: process.env.WTUI_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        localAddress: '127.0.0.1',
      }
    }
  }
})
