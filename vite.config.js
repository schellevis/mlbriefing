import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs'

// Plugin om data/ directory naar dist/ te kopiëren tijdens de build
function copyDataPlugin() {
  return {
    name: 'copy-data',
    closeBundle() {
      const src = resolve(__dirname, 'data')
      const dest = resolve(__dirname, 'dist', 'data')
      if (!existsSync(src)) return

      function copyDir(from, to) {
        mkdirSync(to, { recursive: true })
        for (const file of readdirSync(from)) {
          const fromPath = resolve(from, file)
          const toPath = resolve(to, file)
          if (statSync(fromPath).isDirectory()) {
            copyDir(fromPath, toPath)
          } else {
            copyFileSync(fromPath, toPath)
          }
        }
      }
      copyDir(src, dest)
    },
  }
}

export default defineConfig({
  plugins: [react(), copyDataPlugin()],
  base: './',
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
