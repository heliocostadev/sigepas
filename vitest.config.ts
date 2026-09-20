import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/dominio/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      reporter: ['text', 'lcov'],
      // A linha Web Apps da disciplina pede 75% de cobertura no back-end.
      // O domínio é a camada onde essa meta faz sentido: regra pura, sem infraestrutura.
      thresholds: { lines: 75, functions: 75, branches: 75, statements: 75 },
    },
  },
});
