#!/usr/bin/env node
// Copia a fonte de ícones Tabler Icons (MIT, github.com/tabler/tabler-icons) do pacote npm para o build das telas.
// As telas trazidas do Apps Script usavam a fonte por CDN. Aqui ela é servida pelo próprio SIGEPAS, porque a política
// de segurança de conteúdo (CSP) só aceita arquivos do próprio endereço.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const origem = join(dirname(require.resolve('@tabler/icons-webfont/package.json')), 'dist');
const destino = join(process.cwd(), 'dist', 'sistema', 'icones');
mkdirSync(join(destino, 'fonts'), { recursive: true });
cpSync(join(origem, 'tabler-icons.min.css'), join(destino, 'tabler-icons.min.css'));
const fontes = readdirSync(join(origem, 'fonts')).filter((nome) => /^tabler-icons\.[\w-]+\.woff2$|^tabler-icons\.woff2?$/.test(nome));
for (const nome of fontes) cpSync(join(origem, 'fonts', nome), join(destino, 'fonts', nome));
console.log(`Ícones copiados: ${fontes.length} arquivos de fonte.`);
