import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Backend configuration - can be overridden via env vars
const apiHost = process.env.VITE_API_HOST || '127.0.0.1'
const apiPort = process.env.VITE_API_PORT || '8888'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          // Data fetching
          'vendor-query': ['@tanstack/react-query'],
          // Flow/graph visualization (largest dependency)
          'vendor-flow': ['@xyflow/react', 'dagre'],
          // Terminal emulator
          'vendor-xterm': ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links'],
          // UI components
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
            'lucide-react',
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: `http://${apiHost}:${apiPort}`,
        changeOrigin: true,
      },
      '/auth': {
        target: `http://${apiHost}:${apiPort}`,
        changeOrigin: true,
      },
      '/ws': {
        target: `ws://${apiHost}:${apiPort}`,
        ws: true,
      },
    },
  },
})
