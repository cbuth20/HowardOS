import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@howard/ui': path.resolve(__dirname, '../../packages/ui'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  envDir: path.resolve(__dirname, '../..'),
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
