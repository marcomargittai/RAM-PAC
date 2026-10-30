import { defineConfig } from 'vite'

export default defineConfig({
  // relative, so the same build runs at marcomargittai.com/pac-ram/ and on github.io
  base: './',
  server: { host: '0.0.0.0', port: 43123, strictPort: true },
  preview: { host: '0.0.0.0', port: 43123, strictPort: true },
})
