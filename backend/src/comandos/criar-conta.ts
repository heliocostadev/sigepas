// Cria uma conta do SIGEPAS ou troca a senha de uma conta que já existe. Nenhuma senha fica no repositório.
// Uso, com a API já construída:
//   node backend/dist/comandos/criar-conta.js --email pessoa@exemplo.org --nome "Nome" --papel operador
// A senha vem da variável SENHA_DA_CONTA. Sem ela, o comando gera uma senha forte e a mostra uma vez só.
// Com --so-hash, o comando só mostra o hash scrypt da senha, sem tocar no banco (para HASH_DA_SENHA_DO_GESTOR_INICIAL).
import { randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { gerarHashDaSenha } from '../autenticacao/senha';
import { PrismaClient } from '../gerado/prisma/client';

export interface PedidoDeConta {
  email: string;
  nome: string;
  papel: 'GESTOR' | 'OPERADOR';
  soHash: boolean;
}

export function lerPedidoDeConta(argumentos: string[]): PedidoDeConta {
  const valor = (nome: string) => {
    const posicao = argumentos.indexOf(nome);
    return posicao >= 0 ? (argumentos[posicao + 1] ?? '').trim() : '';
  };
  const soHash = argumentos.includes('--so-hash');
  const email = valor('--email').toLowerCase();
  const papel = valor('--papel').toUpperCase() || 'OPERADOR';
  if (!soHash && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido em --email.');
  if (papel !== 'GESTOR' && papel !== 'OPERADOR') throw new Error('O papel é gestor ou operador.');
  return { email, nome: valor('--nome') || email, papel, soHash };
}

export function gerarSenhaForte(): string {
  return randomBytes(18).toString('base64url');
}

async function executar(): Promise<void> {
  const pedido = lerPedidoDeConta(process.argv.slice(2));
  const senhaInformada = process.env['SENHA_DA_CONTA'];
  const senha = senhaInformada || gerarSenhaForte();
  const hash = await gerarHashDaSenha(senha);
  if (pedido.soHash) {
    console.log(hash);
    return;
  }
  const cliente = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' }) });
  try {
    await cliente.conta.upsert({
      where: { email: pedido.email },
      create: { email: pedido.email, nome: pedido.nome, papel: pedido.papel, hashDaSenha: hash },
      update: { nome: pedido.nome, papel: pedido.papel, hashDaSenha: hash, ativa: true },
    });
    console.log(`Conta pronta: ${pedido.email} (${pedido.papel.toLowerCase()}).`);
    if (!senhaInformada) console.log(`Senha gerada, mostrada só agora: ${senha}`);
  } finally {
    await cliente.$disconnect();
  }
}

if (require.main === module) {
  executar().catch((erro: Error) => {
    console.error(erro.message);
    process.exitCode = 1;
  });
}
