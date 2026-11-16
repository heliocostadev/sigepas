#!/usr/bin/env node
// Hook PreToolUse do Claude Code: antes de um `git commit` feito pela IA, procura segredo no que vai entrar no
// commit e barra o comando se achar. Ideia do `guarda-segredo.py` do repositório harness_engineering; o gitleaks
// confere de novo no CI.
//
// Vale para as duas ferramentas de terminal do Claude Code (Bash e PowerShell).
// Entrada: o JSON que o Claude Code manda pela entrada padrão ({ tool_name, tool_input: { command }, cwd }).
// Saída: código 0 libera; código 2 barra, e a mensagem de erro volta para a IA explicar ao Hélio.

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ARQUIVOS_QUE_NUNCA_ENTRAM = [
  { padrao: /(^|\/)\.env(\.[^/]*)?$/, motivo: 'arquivo .env', excecao: /\.env\.(example|exemplo|modelo)$/ },
  { padrao: /\.(pem|key|p12|pfx|jks)$/, motivo: 'chave privada ou certificado' },
  { padrao: /(^|\/)id_(rsa|ecdsa|ed25519)$/, motivo: 'chave SSH' },
  { padrao: /(^|\/)credentials(\.json)?$/, motivo: 'arquivo de credenciais' },
  { padrao: /\.tfstate(\.backup)?$/, motivo: 'estado do Terraform (pode conter segredo)' },
  { padrao: /\.tfvars$/, motivo: 'variáveis do Terraform (podem conter segredo)' },
];

const CONTEUDO_QUE_PARECE_SEGREDO = [
  { padrao: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/, motivo: 'chave de acesso da AWS' },
  { padrao: /aws_secret_access_key\s*[=:]\s*\S{20,}/i, motivo: 'segredo da AWS' },
  { padrao: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, motivo: 'chave privada' },
  { padrao: /\bghp_[A-Za-z0-9]{36}\b/, motivo: 'token do GitHub' },
  { padrao: /\bgithub_pat_[A-Za-z0-9_]{50,}\b/, motivo: 'token do GitHub' },
  { padrao: /\bsk-ant-[A-Za-z0-9_-]{20,}/, motivo: 'chave da API da Anthropic' },
  { padrao: /\bsk-[A-Za-z0-9]{32,}\b/, motivo: 'chave de API' },
  { padrao: /\bxox[abprs]-[A-Za-z0-9-]{10,}/, motivo: 'token do Slack' },
  { padrao: /\bAIza[0-9A-Za-z_-]{35}\b/, motivo: 'chave de API do Google' },
  { padrao: /\bsqp_[0-9a-f]{40}\b/, motivo: 'token do SonarCloud' },
  {
    // Endereço de banco com usuário e senha embutidos, fora da máquina local e do Compose.
    padrao: /\b(postgres(ql)?|mysql|mongodb(\+srv)?):\/\/[^:\s/]+:[^@\s]+@(?!(localhost|127\.0\.0\.1|db|postgres|banco)[:/])/i,
    motivo: 'endereço de banco com senha',
  },
];

function lerEntrada() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function git(argumentos, pasta) {
  return execFileSync('git', argumentos, { cwd: pasta, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
}

const FERRAMENTAS_DE_TERMINAL = ['Bash', 'PowerShell'];
const OPCOES_DO_GIT_ANTES_DO_SUBCOMANDO = String.raw`(?:\s+(?:-C\s+(?:"[^"]*"|'[^']*'|\S+)|-c\s+\S+|--[\w-]+(?:=\S+)?))*`;
const PADRAO_DE_COMMIT = new RegExp(String.raw`\bgit(?:\.exe)?` + OPCOES_DO_GIT_ANTES_DO_SUBCOMANDO + String.raw`\s+commit\b`);
const PADRAO_DE_ADD = new RegExp(String.raw`\bgit(?:\.exe)?` + OPCOES_DO_GIT_ANTES_DO_SUBCOMANDO + String.raw`\s+add\b`);
const TAMANHO_MAXIMO_LIDO_POR_ARQUIVO = 1024 * 1024;

const entrada = lerEntrada();
const comando = entrada?.tool_input?.command ?? '';
if (!FERRAMENTAS_DE_TERMINAL.includes(entrada.tool_name) || !PADRAO_DE_COMMIT.test(comando)) process.exit(0);

// `git -C <pasta> commit` roda o commit em outra pasta: é ela que precisa ser conferida.
const pastaDaConversa = entrada.cwd || process.cwd();
const opcaoDePasta = comando.match(/\bgit(?:\.exe)?\s+-C\s+(?:"([^"]*)"|'([^']*)'|(\S+))/);
const pastaInformada = opcaoDePasta ? opcaoDePasta[1] ?? opcaoDePasta[2] ?? opcaoDePasta[3] : null;
const pasta = pastaInformada ? resolve(pastaDaConversa, pastaInformada) : pastaDaConversa;
// O hook roda antes do comando inteiro. Se o mesmo comando faz `git add` e depois `git commit`, ou usa `commit -a`,
// os arquivos ainda não estão preparados: por segurança, confere também tudo o que mudou e o que é novo.
const confereTambemOQueNaoFoiPreparado =
  PADRAO_DE_ADD.test(comando) || /\scommit\b[^|;&]*\s(-a\b|--all\b|-[a-zA-Z]*a[a-zA-Z]*\b)/.test(comando);

let nomes = '';
let diferencas = '';
try {
  nomes = git(['diff', '--cached', '--name-only'], pasta);
  diferencas = git(['diff', '--cached', '-U0', '--no-color'], pasta);
  if (confereTambemOQueNaoFoiPreparado) {
    nomes += git(['diff', '--name-only'], pasta);
    diferencas += git(['diff', '-U0', '--no-color'], pasta);
    const novos = git(['ls-files', '--others', '--exclude-standard'], pasta).split('\n').filter(Boolean);
    nomes += `\n${novos.join('\n')}`;
    for (const arquivo of novos) {
      try {
        const caminho = join(pasta, arquivo);
        if (statSync(caminho).size > TAMANHO_MAXIMO_LIDO_POR_ARQUIVO) continue;
        const conteudo = readFileSync(caminho, 'utf8');
        diferencas += `\n+++ b/${arquivo}\n${conteudo.split('\n').map((l) => `+${l}`).join('\n')}`;
      } catch {
        // Arquivo ilegível ou removido no meio do caminho: segue para o próximo.
      }
    }
  }
} catch {
  // Fora de um repositório git: não há o que conferir.
  process.exit(0);
}

const achados = [];

for (const arquivo of nomes.split('\n').map((n) => n.trim()).filter(Boolean)) {
  for (const regra of ARQUIVOS_QUE_NUNCA_ENTRAM) {
    if (regra.padrao.test(arquivo) && !(regra.excecao && regra.excecao.test(arquivo))) {
      achados.push(`${arquivo}: ${regra.motivo}`);
    }
  }
}

let arquivoAtual = '';
for (const linha of diferencas.split('\n')) {
  if (linha.startsWith('+++ ')) {
    arquivoAtual = linha.replace(/^\+\+\+ (b\/)?/, '');
    continue;
  }
  if (!linha.startsWith('+') || linha.startsWith('+++')) continue;
  for (const regra of CONTEUDO_QUE_PARECE_SEGREDO) {
    if (regra.padrao.test(linha)) achados.push(`${arquivoAtual}: linha com ${regra.motivo}`);
  }
}

if (achados.length === 0) process.exit(0);

process.stderr.write(
  [
    'Commit barrado pelo hook bloquear-segredo-no-commit: o que vai entrar no commit parece conter segredo.',
    ...[...new Set(achados)].map((a) => `- ${a}`),
    'Tire o segredo do commit (variável de ambiente ou segredo do GitHub Actions) e avise o Hélio.',
    'Se for um falso positivo, mostre o trecho ao Hélio e deixe que ele decida. Não contorne o hook.',
  ].join('\n') + '\n',
);
process.exit(2);
