import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    // Duas páginas: a tela de entrada (React) e as telas trazidas do SIGEPAS em Apps Script (ADR 0016).
    rollupOptions: {
      input: {
        entrada: resolve(__dirname, 'index.html'),
        sistema: resolve(__dirname, 'sistema/index.html'),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/preparar-testes.ts'],
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx,js}'],
      exclude: ['src/**/*.test.{ts,tsx,js}', 'src/sistema/teste/**', 'src/main.tsx', 'src/preparar-testes.ts', 'src/sistema/iniciar-sistema.js'],
      reporter: ['text', 'lcov'],
      // Piso da linha Web Apps para o front-end.
      thresholds: { lines: 25, functions: 25, branches: 25, statements: 25 },
    },
  },
});
