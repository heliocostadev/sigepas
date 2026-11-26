// Monta as telas trazidas do Apps Script no navegador simulado (jsdom) para os testes. A API é falsa: cada rota
// responde com os dados fictícios gravados em teste/respostas, ou com o que o teste mandar.
import pagina from '../../../sistema/index.html?raw';
import nomesGlobais from '../nomes-globais-das-telas.json';
import configuracoes from './respostas/configuracoes.json';
import dadosDoDia from './respostas/dados-do-dia.json';
import dadosParaFormacao from './respostas/dados-para-formacao.json';
import escalaDoPeriodo from './respostas/escala-do-periodo.json';
import locaisPadronizados from './respostas/locais-padronizados.json';
import locaisPendentes from './respostas/locais-pendentes.json';
import padronizacoes from './respostas/padronizacoes.json';

export type Resposta = unknown | ((argumentos: unknown[]) => unknown);
export interface Chamada {
  rota: string;
  argumentos: unknown[];
}

export const RESPOSTAS_PADRAO: Record<string, Resposta> = {
  '/api/operacao/dados-do-dia': () => structuredClone(dadosDoDia),
  '/api/escala/dados-para-formacao': () => structuredClone(dadosParaFormacao),
  '/api/escala/escala-do-periodo': () => structuredClone(escalaDoPeriodo),
  '/api/cadastros/dados': () => structuredClone(configuracoes),
  '/api/cadastros/padronizacoes': () => structuredClone(padronizacoes),
  '/api/importacao/locais-pendentes': () => structuredClone(locaisPendentes),
  '/api/importacao/locais-padronizados': () => structuredClone(locaisPadronizados),
};

export const DADOS = { configuracoes, dadosDoDia, dadosParaFormacao, escalaDoPeriodo, locaisPadronizados, locaisPendentes, padronizacoes };

const estado: { respostas: Record<string, Resposta>; chamadas: Chamada[]; falhas: Record<string, { status: number; mensagem: string }> } = {
  respostas: { ...RESPOSTAS_PADRAO },
  chamadas: [],
  falhas: {},
};

function respostaHttp(status: number, corpo: unknown): Response {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  return { ok: status >= 200 && status < 300, status, text: async () => texto, json: async () => corpo } as Response;
}

export function apiFalsa(rota: string, resposta: Resposta): void {
  estado.respostas[rota] = resposta;
}

export function apiFalha(rota: string, status: number, mensagem: string): void {
  estado.falhas[rota] = { status, mensagem };
}

export function chamadasA(rota: string): unknown[][] {
  return estado.chamadas.filter((c) => c.rota === rota).map((c) => c.argumentos);
}

export function limparChamadas(): void {
  estado.chamadas = [];
  estado.falhas = {};
  estado.respostas = { ...RESPOSTAS_PADRAO };
}

const buscar = async (rota: string, opcoes?: RequestInit): Promise<Response> => {
  if (rota === '/api/autenticacao/eu') return respostaHttp(200, { email: 'gestor@teste', nome: 'Gestora Fictícia', papel: 'GESTOR' });
  if (rota === '/api/autenticacao/sair') return respostaHttp(204, undefined);
  const corpo = opcoes?.body ? (JSON.parse(String(opcoes.body)) as { argumentos?: unknown[] }) : {};
  const argumentos = corpo.argumentos ?? [];
  estado.chamadas.push({ rota, argumentos });
  const falha = estado.falhas[rota];
  if (falha) return respostaHttp(falha.status, { message: falha.mensagem });
  const resposta = estado.respostas[rota];
  if (resposta === undefined) return respostaHttp(200, true);
  return respostaHttp(200, typeof resposta === 'function' ? (resposta as (a: unknown[]) => unknown)(argumentos) : resposta);
};

// Espera as promessas e os setTimeout curtos das telas terminarem.
export async function esperar(milissegundos = 30): Promise<void> {
  await new Promise((resolver) => setTimeout(resolver, milissegundos));
}

let carregada = false;

export async function carregarTelas(): Promise<void> {
  if (carregada) return;
  const corpo = /<body>([\s\S]*)<\/body>/.exec(pagina)?.[1] ?? '';
  document.body.innerHTML = corpo.replace(/<script[\s\S]*?<\/script>/g, '');
  vi.stubGlobal('fetch', vi.fn(buscar));
  await import('../iniciar-sistema.js');
  // No Vitest, o window das telas é o objeto global do Node, e o onclick escrito no HTML roda no window do jsdom.
  // Os nomes que as telas expõem passam a valer também lá, como valem no navegador de verdade.
  const janelaDoJsdom = ((globalThis as Record<string, unknown>)['jsdom'] as { window?: Record<string, unknown> } | undefined)?.window;
  if (janelaDoJsdom) {
    for (const nome of nomesGlobais as string[]) {
      Object.defineProperty(janelaDoJsdom, nome, {
        configurable: true,
        get: () => (globalThis as Record<string, unknown>)[nome],
        set: (valor) => {
          (globalThis as Record<string, unknown>)[nome] = valor;
        },
      });
    }
  }
  carregada = true;
}

// Acesso às funções que as telas põem no window, como no Apps Script.
// As telas trazidas põem no window centenas de funções sem tipo. Nos testes, o acesso a elas fica sem checagem de tipo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tela = window as any;

export function clicar(seletor: string | Element): void {
  const elemento = typeof seletor === 'string' ? document.querySelector(seletor) : seletor;
  if (!elemento) throw new Error(`Elemento não encontrado: ${String(seletor)}`);
  (elemento as HTMLElement).click();
}

export function texto(seletor: string): string {
  return document.querySelector(seletor)?.textContent ?? '';
}
