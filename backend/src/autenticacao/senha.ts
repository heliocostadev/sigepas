// Hash e conferência de senha com scrypt, do próprio Node (node:crypto), sem biblioteca de terceiros (ADR 0015).
// Formato guardado no banco: scrypt$N$r$p$sal-em-base64$hash-em-base64. Os parâmetros ficam junto do hash, para
// uma troca futura de custo não invalidar as senhas antigas.
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Parâmetros recomendados pela OWASP (Password Storage Cheat Sheet) para scrypt: N = 2^17, r = 8, p = 1.
const CUSTO = 2 ** 17;
const TAMANHO_DO_BLOCO = 8;
const PARALELISMO = 1;
const TAMANHO_DO_HASH = 64;
const TAMANHO_DO_SAL = 16;
// O scrypt com N = 2^17 e r = 8 usa 128 MiB. O limite padrão do Node é 32 MiB, por isso ele sobe aqui.
const MEMORIA_MAXIMA = 256 * 1024 * 1024;

export const TAMANHO_MINIMO_DA_SENHA = 12;
export const TAMANHO_MAXIMO_DA_SENHA = 128;

function calcularScrypt(senha: string, sal: Buffer, opcoes: ScryptOptions): Promise<Buffer> {
  return new Promise((resolver, rejeitar) => {
    scrypt(senha.normalize('NFKC'), sal, TAMANHO_DO_HASH, opcoes, (erro, chave) => (erro ? rejeitar(erro) : resolver(chave)));
  });
}

export async function gerarHashDaSenha(senha: string): Promise<string> {
  if (senha.length < TAMANHO_MINIMO_DA_SENHA || senha.length > TAMANHO_MAXIMO_DA_SENHA) {
    throw new Error(`A senha deve ter entre ${TAMANHO_MINIMO_DA_SENHA} e ${TAMANHO_MAXIMO_DA_SENHA} caracteres.`);
  }
  const sal = randomBytes(TAMANHO_DO_SAL);
  const hash = await calcularScrypt(senha, sal, {
    N: CUSTO,
    r: TAMANHO_DO_BLOCO,
    p: PARALELISMO,
    maxmem: MEMORIA_MAXIMA,
  });
  return ['scrypt', CUSTO, TAMANHO_DO_BLOCO, PARALELISMO, sal.toString('base64'), hash.toString('base64')].join('$');
}

// Confere a senha contra o hash guardado. Comparação em tempo constante. Hash em formato estranho nunca confere.
export async function conferirSenha(senha: string, hashGuardado: string): Promise<boolean> {
  const partes = hashGuardado.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
  if (senha.length > TAMANHO_MAXIMO_DA_SENHA) return false;
  const [, custo, bloco, paralelismo, salEmBase64, hashEmBase64] = partes;
  const esperado = Buffer.from(hashEmBase64 ?? '', 'base64');
  const calculado = await calcularScrypt(senha, Buffer.from(salEmBase64 ?? '', 'base64'), {
    N: Number(custo),
    r: Number(bloco),
    p: Number(paralelismo),
    maxmem: MEMORIA_MAXIMA,
  });
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}
