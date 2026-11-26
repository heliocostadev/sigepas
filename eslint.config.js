import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import nomesDasTelas from './frontend/src/sistema/nomes-globais-das-telas.json' with { type: 'json' };

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Código gerado pelo Prisma e saídas de build não são escritos à mão, por isso não passam pelo lint.
    ignores: ['coverage/**', 'node_modules/**', '**/dist/**', 'backend/src/gerado/**', 'backend/coverage/**', 'frontend/coverage/**'],
  },
  {
    // Telas trazidas do SIGEPAS em Apps Script (ADR 0016): rodam no navegador e usam as funções umas das outras pelo
    // window, como no Apps Script.
    files: ['frontend/src/sistema/**/*.js'],
    // A lista dos nomes que cada tela põe no window fica em nomes-globais-das-telas.json. O no-undef continua ligado:
    // nome fora da lista é erro de verdade. html2canvas vem de fora, por script, só na hora de gerar a imagem.
    // processarTelefone e carregarRI são da Remoção Interna, fora desta entrega: as telas conferem com typeof antes.
    languageOptions: {
      globals: {
        ...globals.browser,
        ...Object.fromEntries([...nomesDasTelas, 'html2canvas'].map((nome) => [nome, 'writable'])),
        processarTelefone: 'readonly',
        carregarRI: 'readonly',
      },
    },
  },
);
