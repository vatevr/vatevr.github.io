import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: '/focus-city/',
  resolve: {
    dedupe: ['three', 'react', 'react-dom'],
  },
  build: {
    outDir: path.resolve(__dirname, '../focus-city'),
    emptyOutDir: true,
  },
})
