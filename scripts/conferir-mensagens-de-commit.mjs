#!/usr/bin/env node
// Confere se as mensagens de commit seguem o padrão do repositório: `tipo(escopo): o que mudou`
// (Conventional Commits, com os tipos de docs/git/README.md). Ideia do Lucas Klemke
// (github.com/LucasKlemke/crm-advocacia), que verifica o padrão no CI.
//
// Uso: node scripts/conferir-mensagens-de-commit.mjs <referência-de-base> [referência-final]
// Exemplo no CI de um PR: node scripts/conferir-mensagens-de-commit.mjs origin/dev <sha do último commit do PR>
// No PR, não use HEAD como referência final: o HEAD é o commit de merge de teste criado pelo GitHub.

import { execFileSync } from 'node:child_process';

const TIPOS_ACEITOS = ['feat', 'fix', 'docs', 'test', 'chore', 'refactor', 'ci', 'build', 'perf', 'style', 'revert'];
const PADRAO_DO_TITULO = new RegExp(`^(${TIPOS_ACEITOS.join('|')})(\\([a-z0-9-]+\\))?!?: \\S.{2,}$`);
const TITULOS_GERADOS_PELO_GIT = /^(Merge (branch|pull request|remote-tracking branch) |Revert ")/;

const [base, fim = 'HEAD'] = process.argv.slice(2);
if (!base) {
  console.error('Informe a referência de base. Exemplo: node scripts/conferir-mensagens-de-commit.mjs origin/dev');
  process.exit(1);
}

const saida = execFileSync('git', ['log', '--format=%h%x09%s', `${base}..${fim}`], { encoding: 'utf8' });
const commits = saida.split('\n').filter(Boolean).map((linha) => {
  const [hash, ...titulo] = linha.split('\t');
  return { hash, titulo: titulo.join('\t') };
});

const foraDoPadrao = commits.filter(
  ({ titulo }) => !PADRAO_DO_TITULO.test(titulo) && !TITULOS_GERADOS_PELO_GIT.test(titulo),
);

if (foraDoPadrao.length === 0) {
  console.log(`${commits.length} commit(s) conferido(s): todos no padrão tipo(escopo): descrição.`);
  process.exit(0);
}

console.error('Commits fora do padrão tipo(escopo): descrição.');
console.error(`Tipos aceitos: ${TIPOS_ACEITOS.join(', ')}. Exemplo: fix(dominio): hora vazia devolve null`);
for (const { hash, titulo } of foraDoPadrao) console.error(`- ${hash} ${titulo}`);
process.exit(1);
