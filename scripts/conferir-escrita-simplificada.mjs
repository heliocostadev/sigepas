#!/usr/bin/env node
// Confere arquivos Markdown contra as regras de Português Técnico Simplificado do projeto
// (docs/git/escrita-dos-textos-publicados.md, seção 1): frase longa, ponto e vírgula, travessão,
// verbo no futuro do pretérito e palavra de enchimento.
//
// Uso: node scripts/conferir-escrita-simplificada.mjs <arquivo.md> [outros arquivos]
// Saída: uma linha por problema, no formato arquivo:linha · problema · trecho. Código de saída 1 se houver problema.
//
// O script aponta; quem decide é a pessoa que revisa. Blocos de código, código entre crases e endereços de links
// não são conferidos.

import { readFileSync } from 'node:fs';

const LIMITE_EM_DESCRICAO = 25;
const LIMITE_EM_PROCEDIMENTO = 20;
const VERBOS_PROIBIDOS =
  /\b(deveria|poderia|faria|seria|teria|precisaria|iria|haveria|ficaria|conseguiria|daria|estaria)m?\b/i;
const ENCHIMENTO = /\b(basicamente|de certa forma|na verdade|literalmente|simplesmente)\b/i;
// Abreviações comuns (art., ex., p., nº) não encerram a frase.
const FIM_DE_FRASE = /(?<!\b(?:art|ex|p|pág|nº|inc|Sr|Sra|Dr)\.)(?<=[.!?])\s(?=["“(*_]?[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9])/u;
// Em specs e ADRs, as listas numeradas são cenários e consequências (descrição), não procedimentos.
const PASTAS_SO_DE_DESCRICAO = /(^|[\\/])(specs|adr)[\\/]/;

function limparTrechoDeMarkdown(texto) {
  return texto
    .replace(/`[^`]*`/g, 'CODIGO')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'ENDERECO')
    .replace(/[*_]{1,3}/g, '');
}

function contarPalavras(frase) {
  return frase.split(/\s+/).filter((palavra) => /[\p{L}\p{N}]/u.test(palavra)).length;
}

function separarEmUnidades(conteudo) {
  // Junta as linhas de um mesmo parágrafo ou item de lista; cada célula de tabela vira uma unidade.
  const linhas = conteudo.split(/\r?\n/);
  const unidades = [];
  let dentroDeCodigo = false;
  let dentroDoCabecalho = linhas[0] === '---';
  let atual = null;

  const fechar = () => {
    if (atual) unidades.push(atual);
    atual = null;
  };

  linhas.forEach((linha, indice) => {
    const numero = indice + 1;
    if (dentroDoCabecalho) {
      if (indice > 0 && linha === '---') dentroDoCabecalho = false;
      return;
    }
    if (/^\s*(```|~~~)/.test(linha)) {
      dentroDeCodigo = !dentroDeCodigo;
      fechar();
      return;
    }
    if (dentroDeCodigo) return;
    if (!linha.trim()) {
      fechar();
      return;
    }
    if (/^\s*\|/.test(linha)) {
      fechar();
      if (/^\s*\|[\s:|-]+\|\s*$/.test(linha)) return;
      for (const celula of linha.split('|').slice(1, -1)) {
        if (celula.trim()) unidades.push({ linha: numero, texto: celula.trim(), procedimento: false });
      }
      return;
    }
    const inicioDeItem = linha.match(/^[ \t]*(\d+\.|[-*])[ \t]/);
    if (/^#/.test(linha) || inicioDeItem || !atual) {
      fechar();
      atual = { linha: numero, texto: linha.trim(), procedimento: Boolean(inicioDeItem && /\d+\./.test(inicioDeItem[1])) };
      if (/^#/.test(linha)) fechar();
      return;
    }
    atual.texto += ` ${linha.trim()}`;
  });
  fechar();
  return unidades;
}

function conferirArquivo(caminho) {
  const problemas = [];
  for (const unidade of separarEmUnidades(readFileSync(caminho, 'utf8'))) {
    const texto = limparTrechoDeMarkdown(unidade.texto.replace(/^\s*(\d+\.|[-*>])\s+/, ''));
    const ehProcedimento = unidade.procedimento && !PASTAS_SO_DE_DESCRICAO.test(caminho);
    const limite = ehProcedimento ? LIMITE_EM_PROCEDIMENTO : LIMITE_EM_DESCRICAO;
    for (const frase of texto.split(FIM_DE_FRASE)) {
      const palavras = contarPalavras(frase);
      if (palavras > limite) problemas.push([unidade.linha, `frase com ${palavras} palavras (limite ${limite})`, frase]);
    }
    if (texto.includes(';')) problemas.push([unidade.linha, 'ponto e vírgula', texto]);
    if (/[—–]/.test(texto)) problemas.push([unidade.linha, 'travessão', texto]);
    const verbo = texto.match(VERBOS_PROIBIDOS);
    if (verbo) problemas.push([unidade.linha, `verbo "${verbo[0]}"`, texto]);
    const enchimento = texto.match(ENCHIMENTO);
    if (enchimento) problemas.push([unidade.linha, `enchimento "${enchimento[0]}"`, texto]);
  }
  return problemas.map(([linha, problema, trecho]) => `${caminho}:${linha} · ${problema} · ${trecho.slice(0, 90)}`);
}

const arquivos = process.argv.slice(2);
if (arquivos.length === 0) {
  console.error('Informe um ou mais arquivos .md. Exemplo: node scripts/conferir-escrita-simplificada.mjs docs/README.md');
  process.exit(1);
}

const todos = arquivos.flatMap(conferirArquivo);
for (const linha of todos) console.log(linha);
console.log(`${todos.length} ponto(s) para revisar em ${arquivos.length} arquivo(s).`);
process.exit(todos.length > 0 ? 1 : 0);
