import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // The React Testing Library suites drive real user-event timing and take
    // ~1s each. Under `turbo`, backend, web and shared tests run in parallel,
    // and the default 5s was occasionally not enough on a loaded machine.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
