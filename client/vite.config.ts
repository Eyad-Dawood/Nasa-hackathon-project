import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 1234,
    open: true,
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
