
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@emailjs/browser': path.resolve(__dirname, './node_modules/@emailjs/browser/es/index.js'),
    },
    conditions: ['import', 'module', 'browser', 'default'],
  },
  optimizeDeps: {
    include: ['@emailjs/browser'],
    esbuildOptions: {
      mainFields: ['module', 'main'],
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
})
