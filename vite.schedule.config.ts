import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(import.meta.dirname, 'apps/work-schedule'),
  base: '/MinLab/apps/work-schedule/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/apps/work-schedule'),
    emptyOutDir: true,
  },
});
