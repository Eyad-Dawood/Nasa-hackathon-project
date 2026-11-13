import { defineConfig } from 'vite';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 1234;

export default defineConfig({
  server: {
    port,
    host: '0.0.0.0',
    open: false,
    allowedHosts: true,
    fs: {
      allow: [".."],
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});

