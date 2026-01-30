import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    open: true,
    // Builder.io preview configuration
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    // Builder.io HMR config for development
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    // Builder.io optimization
    rollupOptions: {
      output: {
        manualChunks: {
          'builder': ['@builder.io/react'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@builder.io/react'],
  },
  // Environment variables
  define: {
    __BUILDER_API_KEY__: JSON.stringify(process.env.VITE_BUILDER_API_KEY),
  },
})
