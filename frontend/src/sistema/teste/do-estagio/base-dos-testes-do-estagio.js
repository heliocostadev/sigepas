// Base que deixa os testes do SIGEPAS em Apps Script (ferramentas/testes, projeto do estágio, escritos pelo Hélio com
// a IA entre setembro e novembro de 2026) rodarem no Vitest contra as telas trazidas. A ideia é a mesma da base
// original (_base.cjs): testar as funções reais das telas, nunca uma cópia. A diferença: aqui as funções vêm do módulo
// da tela já carregado na página de teste, para o Vitest medir a cobertura.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PASTA_DAS_TELAS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'telas');
const BARRA = String.fromCharCode(92);

// Nome do arquivo no Apps Script -> arquivo da tela trazida.
const ARQUIVOS = {
  'Demandas.html.md': 'viagens-externas.js',
  'GuiaMotoristas.html.md': 'confirmacao-e-guias.js',
  'EscalaViagens.html.md': 'escala-de-viagens.js',
  'EscalaEnviar.html.md': 'escala-para-enviar.js',
  'WhatsappFormatter.html.md': 'mensagens-de-whatsapp.js',
  'Importacao.html.md': 'importacao.js',
  'Aba3.html.md': 'configuracoes.js',
  'Index.html.md': join('..', 'principal.js'),
};

export function ler(arquivo) {
  const destino = ARQUIVOS[arquivo];
  if (!destino) throw new Error(`Arquivo sem correspondente nas telas trazidas: ${arquivo}`);
  return readFileSync(join(PASTA_DAS_TELAS, destino), 'utf8').replace(/\r\n/g, '\n');
}

// Recorta `function nome(...) { ... }` contando chaves e pulando comentários e strings (igual à base original).
export function extrair(src, nome) {
  const m = new RegExp('\\n\\s*function ' + nome.replace(/\$/g, '\\$') + '\\s*\\(').exec(src);
  if (!m) throw new Error('função não achada: ' + nome);
  let j = src.indexOf('{', m.index);
  let prof = 0;
  for (; j < src.length; j++) {
    const c = src[j];
    const d = src[j + 1];
    if (c === '/' && d === '/') { j = src.indexOf('\n', j); continue; }
    if (c === '/' && d === '*') { j = src.indexOf('*/', j) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      for (j++; j < src.length && src[j] !== c; j++) if (src[j] === BARRA) j++;
      continue;
    }
    if (c === '{') prof++;
    if (c === '}') { prof--; if (prof === 0) break; }
  }
  return src.slice(m.index, j + 1).trim();
}

// As funções pedidas, já carregadas na página de teste. `globais` troca, durante o teste, o que a função usa de fora:
// uma função de outra tela, o estado da tela (estadoDm, estadoGuia...) ou a hora.
export function carregar(arquivo, nomes, globais) {
  ler(arquivo);
  for (const [nome, valor] of Object.entries(globais || {})) {
    // O document falso do teste original empresta os métodos dele ao document da página.
    if (nome === 'document') {
      for (const chave of Object.keys(valor)) document[chave] = typeof valor[chave] === 'function' ? valor[chave].bind(valor) : valor[chave];
      continue;
    }
    const atual = window[nome];
    const descritor = Object.getOwnPropertyDescriptor(window, nome);
    if (descritor && descritor.get && !descritor.set && atual && typeof atual === 'object' && valor && typeof valor === 'object') {
      for (const chave of Object.keys(atual)) delete atual[chave];
      Object.assign(atual, valor);
    } else {
      window[nome] = valor;
    }
  }
  const funcoes = {};
  for (const nome of nomes) {
    if (typeof window[nome] !== 'function') throw new Error(`A tela não expõe a função ${nome}.`);
    funcoes[nome] = window[nome];
  }
  return funcoes;
}

export function teste(nome, condicao, detalhe) {
  expect.soft(!!condicao, nome + (detalhe === undefined ? '' : ` (${String(detalhe)})`)).toBe(true);
}

export function fim() {
  return 0;
}
