import { defineConfig } from 'vite';

export default defineConfig({
  root: 'example',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: '../dist',
    lib: {
      entry: '../src/index.ts',
      name: 'LeafEditor',
      formats: ['es', 'umd']
    }
  }
}); 