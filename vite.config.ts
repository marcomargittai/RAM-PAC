import { defineConfig } from 'vite'

export default defineConfig({
  base: '/RAM-PAC/',
  server: { host: '0.0.0.0', port: 43123, strictPort: true },
  preview: { host: '0.0.0.0', port: 43123, strictPort: true },
})
