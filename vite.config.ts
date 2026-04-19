import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The base path matches the GitHub Pages URL segment
// (https://<user>.github.io/signal-playground/). Assets resolve against this
// prefix so the deployed build works without URL rewriting.
export default defineConfig({
  base: '/signal-playground/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
