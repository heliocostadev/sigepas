import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Código gerado pelo Prisma e saídas de build não são escritos à mão, por isso não passam pelo lint.
    ignores: ['coverage/**', 'node_modules/**', '**/dist/**', 'backend/src/gerado/**', 'backend/coverage/**', 'frontend/coverage/**'],
  },
);
