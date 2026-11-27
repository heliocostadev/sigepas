// Monta as páginas da Wiki do GitHub a partir da pasta docs/.
// A Wiki do GitHub não tem pastas: cada página é identificada só pelo nome do arquivo. Copiar docs/ direto faria as
// várias README.md das subpastas colidirem e quebraria os links relativos. Este script dá um nome único a cada página,
// reescreve os links entre páginas e aponta os links para fora de docs/ ao arquivo no GitHub.
//
// Uso: node scripts/montar-paginas-da-wiki.mjs
// As páginas saem sempre na pasta paginas-da-wiki/, na raiz do repositório. O destino é fixo para o script não gravar
// em caminho recebido de fora.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, posix, sep } from 'node:path';

const REPOSITORIO = 'https://github.com/heliocostadev/sigepas';
const PASTA_DOS_DOCUMENTOS = 'docs';

const destino = 'paginas-da-wiki';

function listarDocumentos(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return listarDocumentos(caminho);
    return nome.endsWith('.md') ? [caminho.split(sep).join('/')] : [];
  });
}

// docs/README.md vira Home; docs/<pasta>/README.md vira <pasta>; os outros arquivos ficam com o próprio nome.
function nomeDaPagina(caminhoEmDocs) {
  const partes = caminhoEmDocs.split('/');
  const arquivo = partes.at(-1).replace(/\.md$/, '');
  if (arquivo !== 'README') return arquivo;
  return partes.length === 1 ? 'Home' : partes.at(-2);
}

const documentos = listarDocumentos(PASTA_DOS_DOCUMENTOS).map((caminho) => posix.relative(PASTA_DOS_DOCUMENTOS, caminho));
const paginaDoDocumento = new Map(documentos.map((caminho) => [caminho, nomeDaPagina(caminho)]));

const repetidas = [...paginaDoDocumento.values()].filter((nome, i, todos) => todos.indexOf(nome) !== i);
if (repetidas.length > 0) {
  console.error(`Duas páginas teriam o mesmo nome na Wiki: ${repetidas.join(', ')}. Renomeie um dos arquivos.`);
  process.exit(1);
}

function reescreverLink(origemEmDocs, alvo) {
  if (/^([a-z]+:|#|mailto:)/i.test(alvo)) return alvo;
  const [caminho, ancora] = alvo.split('#');
  const sufixo = ancora ? `#${ancora}` : '';
  const doRepositorio = posix.normalize(posix.join(PASTA_DOS_DOCUMENTOS, posix.dirname(origemEmDocs), caminho));
  const emDocs = posix.relative(PASTA_DOS_DOCUMENTOS, doRepositorio);
  const dentroDeDocs = !emDocs.startsWith('..');
  if (dentroDeDocs) {
    if (paginaDoDocumento.has(emDocs)) return paginaDoDocumento.get(emDocs) + sufixo;
    const readme = posix.join(emDocs, 'README.md');
    if (paginaDoDocumento.has(readme)) return paginaDoDocumento.get(readme) + sufixo;
  }
  const ehPasta = existsSync(doRepositorio) && statSync(doRepositorio).isDirectory();
  return `${REPOSITORIO}/${ehPasta ? 'tree' : 'blob'}/main/${doRepositorio.replace(/\/$/, '')}${sufixo}`;
}

mkdirSync(destino, { recursive: true });
for (const [caminho, pagina] of paginaDoDocumento) {
  const texto = readFileSync(join(PASTA_DOS_DOCUMENTOS, caminho), 'utf8');
  const convertido = texto.replace(/\]\(([^)\s]+)\)/g, (_, alvo) => `](${reescreverLink(caminho, alvo)})`);
  const aviso = `> Página gerada a partir de [\`docs/${caminho}\`](${REPOSITORIO}/blob/main/docs/${caminho}). ` +
    'Para corrigir, altere o arquivo no repositório.\n\n';
  writeFileSync(join(destino, `${pagina}.md`), aviso + convertido);
}

// Menu lateral: a página inicial, depois cada pasta de docs/ com as suas páginas.
const porPasta = new Map();
for (const [caminho, pagina] of paginaDoDocumento) {
  const pasta = caminho.includes('/') ? caminho.split('/')[0] : '';
  if (!porPasta.has(pasta)) porPasta.set(pasta, []);
  porPasta.get(pasta).push(pagina);
}
const linhas = ['**[Início](Home)**', ''];
for (const [pasta, paginas] of [...porPasta].sort(([a], [b]) => a.localeCompare(b))) {
  if (pasta === '') {
    paginas.filter((p) => p !== 'Home').forEach((p) => linhas.push(`- [${p}](${p})`));
    continue;
  }
  const temPaginaDaPasta = paginas.includes(pasta);
  linhas.push('', temPaginaDaPasta ? `**[${pasta}](${pasta})**` : `**${pasta}**`);
  paginas.filter((p) => p !== pasta).sort().forEach((p) => linhas.push(`- [${p}](${p})`));
}
writeFileSync(join(destino, '_Sidebar.md'), linhas.join('\n') + '\n');

console.log(`${paginaDoDocumento.size} páginas montadas em ${destino}.`);
