#!/usr/bin/env node
// Hook SessionStart do Claude Code: no começo de cada conversa, procura a página
// ONDE_PAREI_E_PROXIMOS_PASSOS.md subindo as pastas a partir do repositório (ela fica na pasta
// TCC, pasta-mãe do repositório) e entrega o conteúdo à IA. Em outra máquina, onde a página não existe, não faz nada.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const NOME_DA_PAGINA = 'ONDE_PAREI_E_PROXIMOS_PASSOS.md';
const LIMITE_DE_CARACTERES = 12000;

function lerEntrada() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function acharPaginaSubindoAsPastas(pastaInicial) {
  let pasta = pastaInicial;
  for (let nivel = 0; nivel < 12; nivel += 1) {
    const candidato = join(pasta, NOME_DA_PAGINA);
    if (existsSync(candidato)) return candidato;
    const pastaDeCima = dirname(pasta);
    if (pastaDeCima === pasta) return null;
    pasta = pastaDeCima;
  }
  return null;
}

const entrada = lerEntrada();
const pagina = acharPaginaSubindoAsPastas(entrada.cwd || process.cwd());
if (!pagina) process.exit(0);

const conteudo = readFileSync(pagina, 'utf8').slice(0, LIMITE_DE_CARACTERES);
process.stdout.write(
  `Página de onde parei do TCC (${pagina}). Leia antes de começar; o próximo passo está nela.\n\n${conteudo}\n`,
);
