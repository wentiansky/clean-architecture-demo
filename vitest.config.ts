import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@adapter': path.resolve(__dirname, 'src/adapter'),
      '@application': path.resolve(__dirname, 'src/application'),
      '@ui': path.resolve(__dirname, 'src/ui')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
});
