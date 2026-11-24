import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/preparar-testes.ts'],
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/preparar-testes.ts'],
      reporter: ['text', 'lcov'],
      // Piso da linha Web Apps para o front-end.
      thresholds: { lines: 25, functions: 25, branches: 25, statements: 25 },
    },
  },
});
