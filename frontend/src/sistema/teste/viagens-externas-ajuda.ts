// Apoio comum aos testes da tela Viagens Externas (viagens-externas.js): abre o dia com dados fictícios, lê o estado
// da tela e aciona campos como o operador faria.
import { apiFalsa, DADOS, esperar, tela } from './preparar-telas';

export type Registro = Record<string, unknown>;

export interface Carro extends Registro {
  passageiros: Registro[];
}

export interface Dia extends Registro {
  pacientes: Registro[];
  veiculos: Registro[];
  veiculosSalvos: Carro[];
  veiculosCadastro: Registro[];
  geoCidades: Record<string, Registro>;
}

export interface EstadoDm {
  data: string;
  pacientes: Registro[];
  veiculosSalvos: Carro[];
  selecionados: Record<string, boolean>;
  drawerId: string;
  modo: string;
  carrosAbertos: Record<string, boolean>;
  montagem: Registro | null;
  encaixe: Registro | null;
  novoEditando: Registro | null;
  escada: Registro[];
  escadaTodosSairam: boolean;
}

export const DATA_DO_TESTE = '2026-11-27';
export const ROTA_DO_DIA = '/api/operacao/dados-do-dia';

// Cópia nova do dia fictício, para cada teste mexer sem afetar os outros.
export function dia(): Dia {
  return structuredClone(DADOS.dadosDoDia) as unknown as Dia;
}

export function estado(): EstadoDm {
  return tela.estadoDm as unknown as EstadoDm;
}

export function montagem(): Registro {
  const m = estado().montagem;
  if (!m) throw new Error('Nenhum carro em montagem.');
  return m;
}

export function elemento<T extends HTMLElement = HTMLElement>(seletor: string, raiz: ParentNode = document): T {
  const el = raiz.querySelector(seletor);
  if (!el) throw new Error(`Elemento não encontrado: ${seletor}`);
  return el as T;
}

// Fecha o que ficou aberto no teste anterior e abre o dia com os dados pedidos.
export async function abrirDia(dados?: Dia): Promise<void> {
  if (dados) apiFalsa(ROTA_DO_DIA, () => structuredClone(dados));
  tela.dmFecharModal();
  tela.dmFecharEncaixe();
  tela.dmFecharConfirma();
  tela.dmFecharModalNovoPaciente();
  (tela as Record<string, unknown>).dmVerCancelados = false;
  for (const id of ['dmFCidade', 'dmFLocal', 'dmFVeic', 'dmBusca']) elemento<HTMLInputElement>('#' + id).value = '';
  elemento('#toastArea').innerHTML = '';
  estado().modo = 'fila';
  elemento<HTMLInputElement>('#dmData').value = DATA_DO_TESTE;
  tela.iniciarDemandas();
  await esperar();
}

// Troca o valor de um campo e avisa a tela, como o navegador faz quando o operador digita ou escolhe.
export function preencher(seletor: string | Element, valor: string, evento: 'input' | 'change' = 'input'): void {
  const el = (typeof seletor === 'string' ? elemento(seletor) : seletor) as HTMLInputElement;
  el.value = valor;
  el.dispatchEvent(new Event(evento, { bubbles: true }));
}

export function marcar(seletor: string | Element, marcado = true): void {
  const el = (typeof seletor === 'string' ? elemento(seletor) : seletor) as HTMLInputElement;
  el.checked = marcado;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export function tecla(seletor: string, key: string): void {
  elemento(seletor).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

export function avisos(): string {
  return elemento('#toastArea').textContent ?? '';
}

export function linhaDe(id: string): HTMLElement {
  return elemento(`tr.dm-linha[onclick*="'${id}'"]`);
}

export function caixaDe(id: string): HTMLInputElement {
  return elemento<HTMLInputElement>(`#dmCorpo input[onchange*="'${id}'"]`);
}

export function aberto(id: string): boolean {
  return elemento('#' + id).classList.contains('on');
}

export function botaoComTexto(raiz: string, textoDoBotao: string): HTMLElement {
  const botoes = Array.from(document.querySelectorAll<HTMLElement>(`${raiz} button`));
  const achado = botoes.find((b) => (b.textContent ?? '').includes(textoDoBotao));
  if (!achado) throw new Error(`Botão "${textoDoBotao}" não encontrado em ${raiz}`);
  return achado;
}
