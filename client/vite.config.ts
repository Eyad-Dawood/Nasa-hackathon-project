import { defineConfig } from 'vite';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 1234;

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/Nasa-hackathon-project/' : '/',
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

