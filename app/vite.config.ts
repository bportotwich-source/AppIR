import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: o mesmo build funciona no GitHub Pages (/AppIR/) e em localhost.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
})
