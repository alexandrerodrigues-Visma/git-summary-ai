import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      enabled: false, // Disable for now, can be enabled with --coverage flag
      provider: 'v8', // Using v8 instead of c8
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'releases/**',
        'tests/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        'src/index.ts', // CLI entry point
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'releases'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
