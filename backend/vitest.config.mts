// Vitest no NestJS com o plugin SWC, como a documentação oficial do NestJS descreve (ADR 0005).
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    // Os testes de integração usam o mesmo banco de teste: um arquivo por vez.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/main.ts', 'src/gerado/**', 'src/teste/**'],
      reporter: ['text', 'lcov'],
      // Piso da linha Web Apps para o back-end.
      thresholds: { lines: 75, functions: 75, branches: 75, statements: 75 },
    },
  },
});
