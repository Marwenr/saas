import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.js'],
    // run everything in a single worker
    pool: 'threads',
    maxThreads: 1,
    minThreads: 1,
    sequence: {
      concurrent: false,
    },
    // run test files sequentially (one file at a time)
    fileParallelism: false,
    // share module cache across test files (avoid OverwriteModelError)
    isolate: false,
  },
});

