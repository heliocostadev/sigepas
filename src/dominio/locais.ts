/**
 * Padronização de cidades e locais de atendimento (RN-IMP-06, RN-IMP-07 e RN-IMP-13).
 *
 * O problema: cada posto digita o destino do seu jeito. "Hospital Regional", "HOSP.
 * REGIONAL", "hospital regionall". Para a pessoa é o mesmo lugar; para o sistema eram três,
 * e o roteiro do motorista saía repetindo cidade e perdendo carona.
 *
 * A solução em produção é um dicionário construído pelo próprio setor: a cada grafia nova,
 * alguém decide uma vez, e o sistema passa a corrigir sozinho. Este módulo é o motor disso.
 *
 * Princípio: o sistema SUGERE, a pessoa DECIDE. Nada é corrigido automaticamente sem que
 * aquela grafia já tenha sido decidida por alguém antes.
 */

import { chaveDestino, normalizarTexto } from './texto.js';

export interface Destino {
  readonly cidade: string;
  readonly local: string;
}

/** Uma entrada do dicionário: a grafia como veio e a grafia oficial. */
export interface EntradaDicionario {
  readonly origem: Destino;
  readonly padrao: Destino;
}

/** Semelhança mínima para o sistema ousar sugerir. Ver a pergunta aberta no PR. */
export const LIMIAR_SEMELHANCA = 0.8;

/** Nome curto demais não é comparado: "UPA" e "UBS" são 67% parecidos e não têm relação. */
const TAMANHO_MINIMO_PARA_COMPARAR = 4;

/** Distância de edição entre dois textos (Levenshtein, duas linhas). */
export function distanciaEdicao(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(
        (atual[j - 1] ?? 0) + 1,
        (anterior[j] ?? 0) + 1,
        (anterior[j - 1] ?? 0) + custo,
      );
    }
    anterior = atual;
  }

  return anterior[b.length] ?? 0;
}

/** Semelhança entre dois textos, de 0 a 1, ignorando acento e caixa. */
export function semelhanca(a: string, b: string): number {
  const x = normalizarTexto(a);
  const y = normalizarTexto(b);
  if (!x || !y) return 0;
  return 1 - distanciaEdicao(x, y) / Math.max(x.length, y.length);
}

/** O dicionário como estrutura de consulta rápida. */
export class DicionarioDeLocais {
  private readonly porChave = new Map<string, Destino>();

  constructor(entradas: readonly EntradaDicionario[] = []) {
    for (const e of entradas) this.registrar(e);
  }

  /** Registra (ou atualiza) uma decisão. A última decisão vence. */
  registrar(entrada: EntradaDicionario): void {
    this.porChave.set(chaveDestino(entrada.origem.cidade, entrada.origem.local), entrada.padrao);
  }

  /** A grafia oficial desta grafia, se já tiver sido decidida. */
  padraoDe(destino: Destino): Destino | null {
    return this.porChave.get(chaveDestino(destino.cidade, destino.local)) ?? null;
  }

  /** Os destinos oficiais distintos — base de comparação das sugestões. */
  destinosPadrao(): Destino[] {
    const vistos = new Map<string, Destino>();
    for (const padrao of this.porChave.values()) {
      vistos.set(chaveDestino(padrao.cidade, padrao.local), padrao);
    }
    return [...vistos.values()];
  }
}

export type ResultadoPadronizacao =
  | { readonly tipo: 'conhecido'; readonly destino: Destino; readonly corrigido: boolean }
  | { readonly tipo: 'pendente'; readonly destino: Destino; readonly sugestao: Sugestao | null };

export interface Sugestao {
  readonly destino: Destino;
  readonly semelhanca: number;
}

/**
 * Aplica o dicionário a um destino vindo do arquivo.
 *
 * - **conhecido**: alguém já decidiu esta grafia. `corrigido` diz se o valor mudou.
 * - **pendente**: grafia nova. Vem com uma sugestão quando há algo parecido o bastante —
 *   mas a viagem é importada do mesmo jeito (RN-IMP-07): revisar local nunca trava o dia.
 */
export function padronizar(destino: Destino, dicionario: DicionarioDeLocais): ResultadoPadronizacao {
  const padrao = dicionario.padraoDe(destino);
  if (padrao) {
    const corrigido = padrao.cidade !== destino.cidade || padrao.local !== destino.local;
    return { tipo: 'conhecido', destino: padrao, corrigido };
  }
  return { tipo: 'pendente', destino, sugestao: sugerir(destino, dicionario) };
}

/** O destino oficial mais parecido, se passar do limiar. */
export function sugerir(destino: Destino, dicionario: DicionarioDeLocais): Sugestao | null {
  if (normalizarTexto(destino.local).length < TAMANHO_MINIMO_PARA_COMPARAR) return null;

  let melhor: Sugestao | null = null;
  for (const candidato of dicionario.destinosPadrao()) {
    const nota = semelhanca(destino.local, candidato.local);
    if (nota >= LIMIAR_SEMELHANCA && (melhor === null || nota > melhor.semelhanca)) {
      melhor = { destino: candidato, semelhanca: nota };
    }
  }
  return melhor;
}
