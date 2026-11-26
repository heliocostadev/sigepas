// Lê e confere as variáveis de ambiente uma vez, na inicialização. Se faltar algo obrigatório ou vier um valor
// inválido, a aplicação não sobe, e a mensagem diz qual variável corrigir.

export const VARIAVEIS_DE_AMBIENTE = Symbol('VARIAVEIS_DE_AMBIENTE');

export const NIVEIS_DE_LOG = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type NivelDeLog = (typeof NIVEIS_DE_LOG)[number];

export interface VariaveisDeAmbiente {
  porta: number;
  portaDasMetricas: number;
  enderecoDoBanco: string;
  origensPermitidas: string[];
  limiteDeRequisicoesPorMinuto: number;
  nivelDeLog: NivelDeLog;
  // Conta de gestor criada na primeira subida, se ainda não existir. Só o hash scrypt da senha chega aqui.
  gestorInicial?: { email: string; nome: string; hashDaSenha: string };
  // Com "sim", a API cadastra motoristas, carros e locais fictícios quando o cadastro está vazio (demonstração).
  semearDadosFicticios: boolean;
}

const PORTA_PADRAO = 3000;
// Porta usada pelo exportador oficial do Prometheus para Node. Ela só existe na rede interna do Docker Compose.
const PORTA_PADRAO_DAS_METRICAS = 9464;
const LIMITE_PADRAO_DE_REQUISICOES_POR_MINUTO = 100;
const MAIOR_PORTA_POSSIVEL = 65535;
const SO_ALGARISMOS = /^\d+$/;

function lerInteiroPositivo(nome: string, valor: string | undefined, padrao: number, maximo?: number): number {
  if (valor === undefined || valor.trim() === '') return padrao;
  const texto = valor.trim();
  const numero = Number(texto);
  // Number.isSafeInteger recusa números grandes demais, que o JavaScript arredondaria ou transformaria em Infinity.
  const foraDoLimite = !Number.isSafeInteger(numero) || numero < 1 || (maximo !== undefined && numero > maximo);
  if (!SO_ALGARISMOS.test(texto) || foraDoLimite) {
    const faixa = maximo === undefined ? 'maior que zero' : `entre 1 e ${maximo}`;
    throw new Error(`A variável ${nome} deve ser um número inteiro ${faixa}. Valor recebido: "${valor}".`);
  }
  return numero;
}

function lerNivelDeLog(valor: string | undefined): NivelDeLog {
  if (valor === undefined || valor.trim() === '') return 'info';
  const nivel = NIVEIS_DE_LOG.find((opcao) => opcao === valor.trim());
  if (!nivel) {
    throw new Error(`A variável NIVEL_DE_LOG deve ser uma destas: ${NIVEIS_DE_LOG.join(', ')}. Valor recebido: "${valor}".`);
  }
  return nivel;
}

export function lerVariaveisDeAmbiente(ambiente: Record<string, string | undefined>): VariaveisDeAmbiente {
  const enderecoDoBanco = ambiente['DATABASE_URL']?.trim();
  if (!enderecoDoBanco) {
    throw new Error('A variável DATABASE_URL é obrigatória. Informe o endereço do PostgreSQL.');
  }
  const porta = lerInteiroPositivo('PORTA', ambiente['PORTA'], PORTA_PADRAO, MAIOR_PORTA_POSSIVEL);
  const portaDasMetricas = lerInteiroPositivo(
    'PORTA_DAS_METRICAS',
    ambiente['PORTA_DAS_METRICAS'],
    PORTA_PADRAO_DAS_METRICAS,
    MAIOR_PORTA_POSSIVEL,
  );
  if (portaDasMetricas === porta) {
    throw new Error('A variável PORTA_DAS_METRICAS deve ser diferente de PORTA: as métricas não saem pela porta pública.');
  }
  return {
    porta,
    portaDasMetricas,
    enderecoDoBanco,
    origensPermitidas: (ambiente['ORIGENS_PERMITIDAS'] ?? '')
      .split(',')
      .map((origem) => origem.trim())
      .filter((origem) => origem !== ''),
    limiteDeRequisicoesPorMinuto: lerInteiroPositivo(
      'LIMITE_DE_REQUISICOES_POR_MINUTO',
      ambiente['LIMITE_DE_REQUISICOES_POR_MINUTO'],
      LIMITE_PADRAO_DE_REQUISICOES_POR_MINUTO,
    ),
    nivelDeLog: lerNivelDeLog(ambiente['NIVEL_DE_LOG']),
    gestorInicial: lerGestorInicial(ambiente),
    semearDadosFicticios: ambiente['SEMEAR_DADOS_FICTICIOS']?.trim().toLowerCase() === 'sim',
  };
}

function lerGestorInicial(ambiente: Record<string, string | undefined>): VariaveisDeAmbiente['gestorInicial'] {
  const email = ambiente['EMAIL_DO_GESTOR_INICIAL']?.trim().toLowerCase() ?? '';
  const hashDaSenha = ambiente['HASH_DA_SENHA_DO_GESTOR_INICIAL']?.trim() ?? '';
  if (!email && !hashDaSenha) return undefined;
  if (!email || !hashDaSenha.startsWith('scrypt$')) {
    throw new Error('As variáveis EMAIL_DO_GESTOR_INICIAL e HASH_DA_SENHA_DO_GESTOR_INICIAL andam juntas, e o hash começa com "scrypt$".');
  }
  return { email, nome: ambiente['NOME_DO_GESTOR_INICIAL']?.trim() || 'Gestor', hashDaSenha };
}
