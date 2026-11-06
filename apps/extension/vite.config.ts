import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import manifest from './manifest.config.js'
import { crxLiveReloadCompatibility } from './dev/crxLiveReload'
import { releaseArchive } from './dev/releaseArchive'

const liveReload = true

export default defineConfig({
  resolve: {
    alias: {
      '@': `${path.resolve(__dirname, 'src')}`,
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    crx({ manifest, liveReload }),
    crxLiveReloadCompatibility(liveReload),
    releaseArchive(),
  ],
  server: {
    cors: {
      origin: [
        /chrome-extension:\/\//,
      ],
    },
  },
})
