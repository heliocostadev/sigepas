// Apoio comum aos testes da tela Confirmação e Guias (confirmacao-e-guias.js): abre o dia com dados fictícios, monta
// cenários com mais carros e lê o que a tela mostra.
import { apiFalsa, DADOS, esperar, tela } from './preparar-telas';

export type Registro = Record<string, unknown>;

export interface Passageiro extends Registro {
  nome: string;
  matricula: string;
}

export interface Carro extends Registro {
  idViagem: string;
  placa: string;
  passageiros: Passageiro[];
}

export interface Dia extends Registro {
  veiculosSalvos: Carro[];
  cidadesHistoricas: string[];
}

export interface EstadoGuia {
  veiculosSalvos: Carro[];
  locais: string[];
  expandidos: string[];
  confAberto: string | null;
  tpaxOpcoes?: { valor: string; nome: string; detalhe: string }[];
  tpaxVisiveis?: number[];
  tpaxIdx?: number;
}

export const DATA_DO_TESTE = '2026-11-27';
export const ROTA_DO_DIA = '/api/operacao/dados-do-dia';
export const ROTA_CONFIRMAR = '/api/operacao/confirmar-passageiro';
export const ROTA_MOVER = '/api/operacao/mover-passageiro';
export const ROTA_TROCAR = '/api/operacao/trocar-passageiros';
export const ROTA_EDITAR_CARRO = '/api/operacao/editar-carro';
export const ROTA_AVISO_ENVIADO = '/api/operacao/marcar-aviso-enviado';

// Chaves das viagens do dia fictício (dados-do-dia.json).
export const VIAGEM_CURITIBA = 'FCC4B796'; // TST1A03, ARGO, 05:30, sem motorista
export const VIAGEM_FLORIANOPOLIS = '5972C41D'; // TST1A01, SPIN, 04:30, dois motoristas e aviso
export const VIAGEM_BLUMENAU = '4AD286F6'; // TST2B01, SPIN terceirizado, 06:00, 1 lugar bloqueado

// Cópia nova do dia fictício, para cada teste mexer sem afetar os outros.
export function dia(): Dia {
  return structuredClone(DADOS.dadosDoDia) as unknown as Dia;
}

export function carroDoDia(dados: Dia, idViagem: string): Carro {
  const carro = dados.veiculosSalvos.find((v) => v.idViagem === idViagem);
  if (!carro) throw new Error(`Viagem ${idViagem} não está no dia fictício`);
  return carro;
}

export function passageiroFicticio(extra: Registro): Passageiro {
  return {
    id: 'S-' + String(extra.matricula ?? 'X'),
    chaveDemanda: '',
    idLinha: '',
    matricula: '',
    nome: '',
    nascimento: '',
    telefones: '',
    bairro: 'CENTRO',
    enderecoEmbarque: '',
    acompanhante: '',
    telefonesAcomp: '',
    quantidade: 1,
    trecho: 'Completo (Ida e Volta)',
    objetivo: 'Consulta',
    local: 'HOSPITAL REGIONAL DE EXEMPLO',
    observacao: '',
    hora: '09:00',
    cidade: 'FLORIANÓPOLIS',
    tipoSolicitado: 'Automóvel',
    statusConfirmacao: 'Pendente',
    quemAtendeu: '',
    obsLigacao: '',
    enderecoResidencia: '',
    servidorNome: '',
    servidorMatricula: '',
    pedidoCancelado: false,
    ...extra,
  } as Passageiro;
}

export function carroFicticio(extra: Partial<Carro> & Registro): Carro {
  return {
    idViagem: 'VIAGEM-X',
    placa: 'TST9X99',
    tipo: 'SPIN',
    motoristaAtribuido: 'CARLOS TESTE PEREIRA',
    horaEmbarque: '06:30',
    localEmbarque: 'Secretaria da Saúde',
    destino: 'FLORIANÓPOLIS',
    bloqueados: 0,
    roteiro: ['FLORIANÓPOLIS'],
    aviso: '',
    avisoRegistro: '',
    avisoAEnviar: false,
    doisMotoristas: false,
    motorista2: '',
    whatsappMotorista: '',
    whatsappMotorista2: '',
    limite: 6,
    categoria: 'publico',
    passageiros: [],
    ...extra,
  } as Carro;
}

// Dia com mais dois carros para Florianópolis: um com vaga (TST1A02, com o passageiro HUGO) e um cheio (TST1A04).
// Serve aos testes de mover e trocar passageiro de carro.
export function diaComTroca(): Dia {
  const dados = dia();
  dados.veiculosSalvos.push(
    carroFicticio({
      idViagem: 'VIAGEM-02',
      placa: 'TST1A02',
      horaEmbarque: '06:30',
      passageiros: [passageiroFicticio({ matricula: '900010', nome: 'HUGO AMOSTRA DA SILVA 010', hora: '10:00' })],
    }),
    carroFicticio({
      idViagem: 'VIAGEM-04',
      placa: 'TST1A04',
      tipo: 'ARGO',
      horaEmbarque: '07:00',
      limite: 1,
      passageiros: [passageiroFicticio({ matricula: '900011', nome: 'IARA EXEMPLO DA SILVA 011', hora: '11:00' })],
    }),
  );
  return dados;
}

// Item de uma lista que o teste sabe que existe. Se não existir, o teste falha com uma mensagem clara.
export function item<T>(lista: ArrayLike<T> | undefined, posicao: number): T {
  const achado = lista?.[posicao];
  if (achado === undefined) throw new Error(`Nada na posição ${posicao} da lista`);
  return achado;
}

export function estado(): EstadoGuia {
  return tela.estadoGuia as EstadoGuia;
}

export function elemento<T extends HTMLElement = HTMLElement>(seletor: string, raiz: ParentNode = document): T {
  const el = raiz.querySelector(seletor);
  if (!el) throw new Error(`Elemento não encontrado: ${seletor}`);
  return el as T;
}

export function textos(seletor: string, raiz: ParentNode = document): string[] {
  return Array.from(raiz.querySelectorAll(seletor)).map((el) => (el.textContent ?? '').trim());
}

export function avisos(): string {
  return elemento('#toastArea').textContent ?? '';
}

export function limparAvisos(): void {
  elemento('#toastArea').innerHTML = '';
}

// Fecha o que ficou aberto no teste anterior, esquece a última carga guardada e abre o dia com os dados pedidos.
export async function abrirGuia(dados?: Dia): Promise<void> {
  if (dados) apiFalsa(ROTA_DO_DIA, () => structuredClone(dados));
  tela.fecharPainelPax();
  elemento('#guiaModalOverlay').classList.remove('aberto');
  elemento('#guiaModalBox').innerHTML = '';
  tela._guiaModalSim = null;
  tela._guiaModalNao = null;
  tela.abaAtivaDrawerGuia = 'ligacao';
  tela.guiaGravacoesContato = 0;
  tela.guiaBaixando = false;
  estado().expandidos = [];
  tela.cargaDiaEsquecer([DATA_DO_TESTE]);
  for (const id of ['gFiltroCidade', 'gFiltroLocal', 'gFiltroStatusConf', 'gBusca']) elemento<HTMLInputElement>('#' + id).value = '';
  elemento<HTMLInputElement>('#gSomenteLivres').checked = false;
  limparAvisos();
  elemento<HTMLInputElement>('#gFiltroData').value = DATA_DO_TESTE;
  tela.iniciarGuia();
  await esperar();
}

// O card de um carro, pela placa.
export function cardDe(placa: string): HTMLElement {
  return elemento('#guia-card-' + placa);
}

// A linha de um passageiro na lista, pelo nome.
export function linhaDoPassageiro(nome: string): HTMLElement {
  const linhas = Array.from(document.querySelectorAll<HTMLElement>('#guiaCorpo .guia-pax'));
  const achada = linhas.find((l) => (l.querySelector('.gp-nome')?.textContent ?? '').includes(nome));
  if (!achada) throw new Error(`Passageiro ${nome} não encontrado na lista`);
  return achada;
}

export function painelAberto(): boolean {
  return elemento('#guiaSlideDrawer').classList.contains('aberto');
}

export function janelaAberta(): boolean {
  return elemento('#guiaModalOverlay').classList.contains('aberto');
}

export function textoDaJanela(): string {
  return elemento('#guiaModalBox').textContent ?? '';
}

export function botaoDaJanela(rotulo: string): HTMLButtonElement {
  const botoes = Array.from(document.querySelectorAll<HTMLButtonElement>('#guiaModalBox button'));
  const achado = botoes.find((b) => (b.textContent ?? '').trim().includes(rotulo));
  if (!achado) throw new Error(`Botão "${rotulo}" não encontrado na janela`);
  return achado;
}

export function preencher(seletor: string, valor: string): void {
  const el = elemento<HTMLInputElement>(seletor);
  el.value = valor;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function tecla(alvo: EventTarget, key: string): void {
  alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}
