import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { BancoDeDadosService } from '../banco-de-dados/banco-de-dados.service';
import type { Passageiro, Prisma, Viagem } from '../gerado/prisma/client';
import {
  chaveDoPedido,
  DATA_ISO,
  ehDemandaInterna,
  ehMarcadorNulo,
  isoParaBR,
  normalizarHora,
  normalizarTexto,
} from '../regras/regras-do-setor';
import { EventosService } from '../tempo-real/eventos.service';
import { descreverPassageiro, ehOMesmoPassageiro, identificarPassageiro, servidorDaLinha } from './passageiros';

// Fluxos 1, 2 e 3 do lado do dia: a fila de pedidos, a montagem dos carros e a confirmação por telefone. Traz
// getDadosOperacao e as gravações que as telas Viagens Externas e Confirmação e Guias chamam (ADR 0016).
// Cada gravação roda numa transação com uma trava do PostgreSQL por dia (pg_advisory_xact_lock): dois operadores
// gravando o mesmo dia esperam um pelo outro, como o LockService do sistema atual, mas dias diferentes não se travam.

type Transacao = Prisma.TransactionClient;
type ViagemComPassageiros = Viagem & { passageiros: Passageiro[] };
type Objeto = Record<string, unknown>;

const QUEM_ATENDEU_PADRAO = ['Paciente', 'Mãe', 'Pai', 'Filho(a)', 'Cônjuge', 'Irmão(ã)', 'Acompanhante', 'Vizinho'];
// Fluxo 3: a ligação termina em Confirmado ou Não atende. Cancelado tira o passageiro do carro. Sem WhatsApp nesta entrega.
const STATUS_DA_CONFIRMACAO = new Set(['Pendente', 'Confirmado', 'Não atende', 'Não confirmado', 'Cancelado']);
const CAPACIDADE_QUANDO_NAO_CADASTRADA = 4;
const TAMANHO_MAXIMO_DE_TEXTO = 2000;

export function texto(valor: unknown, maximo = TAMANHO_MAXIMO_DE_TEXTO): string {
  if (typeof valor === 'number') return String(valor);
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
}

function inteiro(valor: unknown, padrao: number): number {
  const numero = typeof valor === 'number' ? valor : Number.parseInt(texto(valor), 10);
  return Number.isSafeInteger(numero) ? numero : padrao;
}

export function conferirData(data: unknown): string {
  const valor = texto(data);
  if (!DATA_ISO.test(valor)) throw new BadRequestException('Data inválida. Use o formato AAAA-MM-DD.');
  return valor;
}

function novoIdDeViagem(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

function estaCancelado(p: Passageiro): boolean {
  return p.statusConfirmacao.toLowerCase() === 'cancelado';
}

function juntarTelefones(lista: string[]): string {
  return lista.filter(Boolean).join(' / ');
}

// Nascimento guardado em AAAA-MM-DD vira DD/MM/AAAA, como a tela espera.
function nascimentoParaTela(valor: string): string {
  return DATA_ISO.test(valor) ? isoParaBR(valor) : valor;
}

@Injectable()
export class OperacaoService {
  constructor(
    private readonly banco: BancoDeDadosService,
    private readonly eventos: EventosService,
  ) {}

  // Roda a gravação com a trava do dia e avisa as telas abertas no fim.
  private async gravarNoDia<T>(data: string, origem: string, gravacao: (transacao: Transacao) => Promise<T>): Promise<T> {
    const resultado = await this.banco.cliente.$transaction(async (transacao) => {
      await transacao.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`dia:${data}`}))`;
      return gravacao(transacao);
    });
    this.eventos.avisar('operacao', [data], origem);
    return resultado;
  }

  // getDadosOperacaoSeMudou: se a tela já tem a versão atual, não precisa receber tudo de novo.
  async dadosDoDiaSeMudou(data: unknown, versaoQueATelaTem: unknown): Promise<Objeto> {
    const versao = this.eventos.versaoAtual();
    if (texto(versaoQueATelaTem) && texto(versaoQueATelaTem) === versao) return { semMudanca: true, _versao: versao };
    return this.dadosDoDia(data);
  }

  // getDadosOperacao: tudo o que as telas do dia precisam, numa resposta só.
  async dadosDoDia(dataRecebida: unknown): Promise<Objeto> {
    const data = conferirData(dataRecebida);
    const versao = this.eventos.versaoAtual();
    const cliente = this.banco.cliente;
    const [viagens, escala, veiculos, motoristas, frota, embarques, pedidos, cancelamentos, dicionario] = await Promise.all([
      cliente.viagem.findMany({ where: { data }, include: { passageiros: { orderBy: { id: 'asc' } } }, orderBy: { criadaEm: 'asc' } }),
      cliente.escalaDoDia.findMany({ where: { data, condicao: 'Disponível', vinculo: 'Servidor' }, orderBy: { posicao: 'asc' } }),
      cliente.veiculo.findMany({ orderBy: { placa: 'asc' } }),
      cliente.motorista.findMany({ orderBy: { ordem: 'asc' } }),
      cliente.frotaDoDia.findMany({ where: { data, condicao: 'Disponível' }, orderBy: { id: 'asc' } }),
      cliente.localDeEmbarque.findMany({ where: { status: 'Ativo' }, orderBy: [{ ordem: 'asc' }, { nome: 'asc' }] }),
      cliente.pedido.findMany({ where: { data }, orderBy: [{ cidade: 'asc' }, { hora: 'asc' }, { ordemNaImportacao: 'asc' }, { id: 'asc' }] }),
      cliente.cancelamentoNaFila.findMany({ where: { data } }),
      cliente.padronizacaoDeLocal.findMany(),
    ]);

    // Quem já foi alocado sai da fila. A pergunta é por PEDIDO (chave), não por pessoa. Passageiro sem chave
    // (digitado na hora) usa a regra antiga: matrícula ou nome.
    const chavesAlocadas = new Set<string>();
    const matriculasAlocadas = new Set<string>();
    const nomesAlocados = new Set<string>();
    const cidadesHistoricas = new Set<string>();
    for (const viagem of viagens) {
      if (viagem.destino) cidadesHistoricas.add(viagem.destino);
      for (const p of viagem.passageiros) {
        if (p.cidade) cidadesHistoricas.add(p.cidade);
        if (p.chaveDoPedido) chavesAlocadas.add(p.chaveDoPedido);
        else {
          if (p.matricula) matriculasAlocadas.add(p.matricula);
          if (p.nome) nomesAlocados.add(p.nome);
        }
      }
    }

    const infoDoVeiculo = new Map(veiculos.map((v) => [v.placa, v]));
    const whatsappDoMotorista = new Map(motoristas.map((m) => [m.nome, m.whatsapp.replace(/\D/g, '')]));
    const motoristaDaPlaca = new Map(
      motoristas.filter((m) => m.vinculo === 'Terceirizado' && m.placaVinculada).map((m) => [m.placaVinculada.toUpperCase(), m.nome]),
    );
    const chavesCanceladasNaOrigem = new Set(pedidos.filter((p) => p.canceladoNaOrigem).map((p) => p.chave));

    const veiculosSalvos = viagens
      .filter((v) => v.passageiros.some((p) => !estaCancelado(p)))
      .map((v) => this.viagemParaTela(v, infoDoVeiculo.get(v.placa), whatsappDoMotorista, chavesCanceladasNaOrigem));

    const motoristasAlocados = new Set<string>();
    const viagensPorPlaca = new Map<string, number>();
    const placaDoMotorista = new Map<string, string>();
    for (const v of veiculosSalvos) {
      viagensPorPlaca.set(v.placa, (viagensPorPlaca.get(v.placa) ?? 0) + 1);
      if (v.motoristaAtribuido) {
        motoristasAlocados.add(v.motoristaAtribuido);
        placaDoMotorista.set(v.motoristaAtribuido, v.placa);
      }
      if (v.motorista2) motoristasAlocados.add(v.motorista2);
    }

    const frotaDoDia = frota.flatMap((f) => {
      const info = infoDoVeiculo.get(f.placa);
      const motoristaProprio = f.propriedade === 'Terceirizado' ? (motoristaDaPlaca.get(f.placa.toUpperCase()) ?? null) : null;
      // Terceirizado: o motorista dele só tira o carro da frota se estiver em OUTRO carro (bate-volta é o mesmo).
      if (motoristaProprio && motoristasAlocados.has(motoristaProprio) && placaDoMotorista.get(motoristaProprio) !== f.placa) return [];
      return [{
        placa: f.placa,
        tipo: info?.tipo ?? 'Veículo',
        categoria: f.propriedade === 'Público' ? 'publico' : 'terceirizado',
        limite: info?.capacidade || CAPACIDADE_QUANDO_NAO_CADASTRADA,
        viagensHoje: viagensPorPlaca.get(f.placa) ?? 0,
        motoristaProprio,
        motoristaAtribuido: motoristaProprio ?? '',
        bloqueados: 0,
        destino: '',
        horaEmbarque: '',
        localEmbarque: '',
      }];
    });

    const canceladosNaFila = new Map(cancelamentos.map((c) => [c.chave, c]));
    const pacientes = pedidos
      .filter((p) => !ehDemandaInterna(p))
      .filter((p) => !chavesAlocadas.has(p.chave) && !(p.matricula && matriculasAlocadas.has(p.matricula)) && !(p.nomePaciente && nomesAlocados.has(p.nomePaciente)))
      .map((p) => {
        const cancelamento = canceladosNaFila.get(p.chave);
        return {
          id: `P${p.id}`,
          cancelado: p.canceladoNaOrigem || !!cancelamento,
          canceladoPor: p.canceladoNaOrigem ? 'posto' : (cancelamento?.quem ?? ''),
          motivoCancelamento: cancelamento?.motivo ?? '',
          canceladoNaFila: !!cancelamento,
          chaveDemanda: p.chave,
          hora: p.hora,
          cidade: p.cidade,
          local: p.localDestino,
          tipoSolicitado: p.tipoVeiculo,
          restricao: p.restricoes,
          objetivo: p.objetivo,
          bairro: p.bairro,
          enderecoResidencia: p.enderecoResidencial,
          enderecoEmbarque: p.enderecoEmbarque,
          origemManual: p.digitadoAMao,
          quantidade: p.quantidadePessoas,
          matricula: p.matricula,
          nome: p.nomePaciente,
          trecho: p.trecho,
          nascimento: p.dataNascimento,
          acompanhante: p.acompanhante,
          telefones: juntarTelefones(p.telefones),
          telefonesAcomp: juntarTelefones(p.telefonesAcompanhante),
          observacao: p.restricoes,
          alocadoEm: null,
        };
      });

    const servidoresTodos = escala.map((e) => e.motorista);
    const locaisPadrao = new Map<string, { cidade: string; local: string }>();
    const cidadesDicionario = new Map<string, string>();
    for (const d of dicionario) {
      if (d.localPadrao) locaisPadrao.set(`${d.cidadePadrao}|${d.localPadrao}`.toUpperCase(), { cidade: d.cidadePadrao, local: d.localPadrao });
      if (d.cidadePadrao) cidadesDicionario.set(d.cidadePadrao.toUpperCase(), d.cidadePadrao);
    }
    const padrao = embarques.find((e) => e.padrao)?.nome ?? '';

    return {
      motoristasDisponiveis: servidoresTodos.filter((nome) => !motoristasAlocados.has(nome)),
      motoristasServidores: servidoresTodos,
      pacientes,
      veiculos: frotaDoDia,
      locaisEmbarque: embarques.map((e) => e.nome),
      embarquePadrao: padrao,
      locaisPadrao: [...locaisPadrao.values()].sort((a, b) => a.local.localeCompare(b.local)),
      quemAtendeuOpcoes: QUEM_ATENDEU_PADRAO,
      veiculosSalvos,
      veiculosCadastro: veiculos
        .filter((v) => v.status === 'Ativo')
        .map((v) => ({
          placa: v.placa,
          tipo: v.tipo,
          limite: v.capacidade,
          categoria: v.propriedade === 'Público' ? 'publico' : 'terceirizado',
          motoristaProprio: v.propriedade === 'Público' ? '' : (motoristaDaPlaca.get(v.placa.toUpperCase()) ?? ''),
        })),
      cidadesHistoricas: [...cidadesHistoricas].sort((a, b) => a.localeCompare(b)),
      cidadesDicionario: [...cidadesDicionario.values()].sort((a, b) => a.localeCompare(b)),
      geoCidades: {},
      _dataISO: data,
      _versao: versao,
    };
  }

  private viagemParaTela(
    v: ViagemComPassageiros,
    veiculo: { capacidade: number; propriedade: string } | undefined,
    whatsapp: Map<string, string>,
    chavesCanceladasNaOrigem: Set<string>,
  ) {
    return {
      idViagem: v.id,
      placa: v.placa,
      tipo: v.tipoVeiculo,
      motoristaAtribuido: v.motorista,
      horaEmbarque: v.horaSaida,
      localEmbarque: v.localEmbarque,
      destino: v.destino,
      bloqueados: v.assentosBloqueados,
      roteiro: v.roteiro,
      aviso: v.aviso,
      avisoRegistro: v.avisoRegistro,
      avisoAEnviar: v.avisoAEnviar,
      doisMotoristas: v.doisMotoristas,
      motorista2: v.doisMotoristas ? v.motorista2 : '',
      whatsappMotorista: whatsapp.get(v.motorista) ?? '',
      whatsappMotorista2: v.doisMotoristas && v.motorista2 ? (whatsapp.get(v.motorista2) ?? '') : '',
      limite: veiculo?.capacidade || CAPACIDADE_QUANDO_NAO_CADASTRADA,
      categoria: veiculo?.propriedade === 'Público' ? 'publico' : 'terceirizado',
      passageiros: v.passageiros
        .filter((p) => !estaCancelado(p))
        .map((p) => ({
          id: `S-${ehMarcadorNulo(p.matricula) ? (p.chaveDoPedido || `L${p.id}`) : p.matricula}`,
          chaveDemanda: p.chaveDoPedido,
          idLinha: String(p.id),
          matricula: p.matricula,
          nome: p.nome,
          nascimento: nascimentoParaTela(p.nascimento),
          telefones: p.telefones,
          bairro: p.bairro,
          enderecoEmbarque: p.enderecoEmbarque,
          acompanhante: p.acompanhante,
          telefonesAcomp: p.telefonesAcomp,
          quantidade: p.quantidade,
          trecho: p.trecho,
          objetivo: p.objetivo,
          local: p.local,
          observacao: p.observacao,
          hora: normalizarHora(p.hora),
          cidade: p.cidade,
          tipoSolicitado: p.tipoSolicitado,
          statusConfirmacao: p.statusConfirmacao || 'Pendente',
          horaLigacao: p.horaLigacao,
          quemAtendeu: p.quemAtendeu,
          obsLigacao: p.obsLigacao,
          enderecoResidencia: p.enderecoResidencia,
          servidorNome: p.servidorNome,
          servidorMatricula: p.servidorMatricula,
          pedidoCancelado: !!p.chaveDoPedido && chavesCanceladasNaOrigem.has(p.chaveDoPedido),
        })),
    };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Fila de pedidos (fluxo 1)

  private async pedidoDaFila(transacao: Transacao, data: string, chave: string) {
    const pedido = await transacao.pedido.findFirst({ where: { data, chave } });
    if (!pedido) throw new NotFoundException('Este pedido já não está na fila. Recarregue a tela.');
    return pedido;
  }

  private async chaveJaEstaNumCarro(transacao: Transacao, data: string, chave: string): Promise<boolean> {
    const vivo = await transacao.passageiro.findFirst({
      where: { chaveDoPedido: chave, viagem: { data }, NOT: { statusConfirmacao: 'Cancelado' } },
    });
    return !!vivo;
  }

  // cancelarPedidoFila: o operador cancela um pedido que ainda está na fila.
  async cancelarPedidoNaFila(argumentos: unknown[], operador: string): Promise<Objeto> {
    const data = conferirData(argumentos[0]);
    const chave = texto(argumentos[1], 100);
    const motivo = texto(argumentos[2], 100) || 'Outro';
    const justificativa = texto(argumentos[3]);
    if (!chave) throw new BadRequestException('Pedido sem identificação. Recarregue a tela.');
    if (!justificativa) throw new BadRequestException('Descreva a justificativa do cancelamento.');
    let acao = 'cancelada';
    await this.gravarNoDia(data, operador, async (transacao) => {
      const pedido = await this.pedidoDaFila(transacao, data, chave);
      if (await this.chaveJaEstaNumCarro(transacao, data, chave)) {
        throw new ConflictException('Este paciente já está num carro. Cancele pela Confirmação e Guias de Viagens.');
      }
      if (pedido.digitadoAMao) {
        await transacao.pedido.delete({ where: { id: pedido.id } });
        acao = 'apagada';
        return;
      }
      const quem = normalizarTexto(motivo).includes('PACIENTE') ? 'paciente' : normalizarTexto(motivo).includes('SETOR') ? 'setor' : 'outro';
      await transacao.cancelamentoNaFila.upsert({
        where: { chave },
        create: { chave, data, quem, motivo: `${motivo}: ${justificativa}`, operador },
        update: {},
      });
    });
    return { ...(await this.dadosDoDia(data)), acaoCancelamento: acao };
  }

  // desfazerCancelamentoFila
  async desfazerCancelamentoNaFila(argumentos: unknown[], operador: string): Promise<Objeto> {
    const data = conferirData(argumentos[0]);
    const chave = texto(argumentos[1], 100);
    await this.gravarNoDia(data, operador, async (transacao) => {
      const apagados = await transacao.cancelamentoNaFila.deleteMany({ where: { chave, data } });
      if (apagados.count === 0) throw new ConflictException('Este pedido já está na fila. Recarregue a tela.');
    });
    return this.dadosDoDia(data);
  }

  // excluirDemandaManual: só o pedido digitado à mão pode ser apagado. O do OLOSTECH voltaria na próxima importação.
  async excluirPedidoDigitado(argumentos: unknown[], operador: string): Promise<Objeto> {
    const chave = texto(argumentos[0], 100);
    const data = conferirData(argumentos[1]);
    return this.gravarNoDia(data, operador, async (transacao) => {
      const pedido = await transacao.pedido.findFirst({ where: { data, chave } });
      if (!pedido) return { ok: false, motivo: 'Esta demanda já não está mais na fila.' };
      if (!pedido.digitadoAMao) throw new BadRequestException('Esta demanda veio do OLOSTECH e não pode ser apagada aqui.');
      await transacao.pedido.delete({ where: { id: pedido.id } });
      return { ok: true };
    });
  }

  // salvarEdicaoPaciente: local, observação e quantidade de pessoas de um pedido da fila.
  async editarPedido(argumentos: unknown[], operador: string): Promise<boolean> {
    const idDaTela = texto(argumentos[0], 30);
    if (!/^P\d+$/.test(idDaTela)) throw new BadRequestException('ID de paciente inválido.');
    const pedido = await this.banco.cliente.pedido.findUnique({ where: { id: Number(idDaTela.slice(1)) } });
    if (!pedido) throw new NotFoundException('Este pedido já não está na fila. Recarregue a tela.');
    await this.gravarNoDia(pedido.data, operador, async (transacao) => {
      await transacao.pedido.update({
        where: { id: pedido.id },
        data: {
          localDestino: texto(argumentos[1], 300),
          restricoes: texto(argumentos[2]),
          quantidadePessoas: Math.max(1, inteiro(argumentos[3], 1)),
        },
      });
    });
    return true;
  }

  // salvarNovaDemandaFila e atualizarDemandaManual: pedido digitado à mão pelo operador.
  async salvarPedidoDigitado(dados: Objeto, chaveAntiga: string, operador: string): Promise<Objeto> {
    const data = conferirData(dados['dataNavegador'] ?? dados['data']);
    const nome = texto(dados['nome'], 200);
    const cidade = texto(dados['cidade'], 200).toUpperCase();
    if (!nome) throw new BadRequestException('Nome do paciente é obrigatório.');
    if (!cidade) throw new BadRequestException('Cidade de destino é obrigatória.');
    const hora = normalizarHora(texto(dados['hora'], 10));
    const quantidade = Math.max(1, inteiro(dados['quantidade'], 1));
    const trecho = texto(dados['trecho'], 100) || 'Completo (Ida e Volta)';
    const compromisso = {
      data,
      cidade,
      hora,
      localDestino: texto(dados['local'], 300),
      objetivo: texto(dados['objetivo'], 200) || 'Consulta',
      matricula: texto(dados['matricula'], 50),
      nomePaciente: nome,
      quantidadePessoas: quantidade,
    };
    await this.gravarNoDia(data, operador, async (transacao) => {
      const antigo = chaveAntiga ? await transacao.pedido.findFirst({ where: { chave: chaveAntiga, data } }) : null;
      if (chaveAntiga && !antigo?.digitadoAMao) throw new BadRequestException('Só a demanda digitada à mão pode ser editada aqui.');
      let ocorrencia = 1;
      let chave = chaveDoPedido(compromisso, ocorrencia);
      while (await transacao.pedido.findFirst({ where: { chave, NOT: { id: antigo?.id ?? -1 } } })) {
        ocorrencia += 1;
        chave = chaveDoPedido(compromisso, ocorrencia);
      }
      const campos = {
        chave,
        data,
        cidadeOriginal: cidade,
        localOriginal: compromisso.localDestino,
        cidade,
        hora,
        localDestino: compromisso.localDestino,
        tipoVeiculo: texto(dados['tipoSolicitado'], 100) || 'Automóvel',
        restricoes: texto(dados['observacao']),
        objetivo: compromisso.objetivo,
        bairro: texto(dados['bairro'], 200),
        enderecoResidencial: texto(dados['enderecoResidencia'], 300),
        quantidadePessoas: quantidade,
        tipoAtendimento: quantidade > 1 ? 'Com Acompanhante' : 'Sozinho',
        matricula: compromisso.matricula,
        nomePaciente: nome,
        trecho,
        dataNascimento: texto(dados['nascimento'], 20),
        logradouro: texto(dados['rua'], 200) || antigo?.logradouro || '',
        numero: texto(dados['numero'], 20) || antigo?.numero || '',
        telefones: texto(dados['telefones'], 200) ? [texto(dados['telefones'], 200)] : [],
        acompanhante: texto(dados['acompanhante'], 200),
        trechoAcompanhante: quantidade > 1 ? trecho : '',
        digitadoAMao: true,
        enderecoEmbarque: texto(dados['enderecoEmbarque'], 300),
      };
      if (antigo) await transacao.pedido.update({ where: { id: antigo.id }, data: campos });
      else await transacao.pedido.create({ data: campos });
    });
    return this.dadosDoDia(data);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Carros (fluxo 2)

  private async capacidades(transacao: Transacao): Promise<Map<string, { capacidade: number; publico: boolean }>> {
    const veiculos = await transacao.veiculo.findMany();
    return new Map(veiculos.map((v) => [v.placa, { capacidade: v.capacidade || CAPACIDADE_QUANDO_NAO_CADASTRADA, publico: v.propriedade === 'Público' }]));
  }

  // _conflitoPacientes: o mesmo pedido não entra em dois carros. Pedido cancelado na fila também não entra.
  private async conflitosDePassageiros(transacao: Transacao, data: string, passageiros: Objeto[]): Promise<string[]> {
    const vivos = await transacao.passageiro.findMany({
      where: { viagem: { data }, NOT: { statusConfirmacao: 'Cancelado' } },
      select: { chaveDoPedido: true, matricula: true, nome: true },
    });
    const chaves = new Set(vivos.filter((p) => p.chaveDoPedido).map((p) => p.chaveDoPedido));
    const matriculas = new Set(vivos.filter((p) => !p.chaveDoPedido && p.matricula).map((p) => p.matricula));
    const nomes = new Set(vivos.filter((p) => !p.chaveDoPedido && p.nome).map((p) => p.nome.toUpperCase()));
    const cancelados = new Set((await transacao.cancelamentoNaFila.findMany({ where: { data } })).map((c) => c.chave));
    const problemas = new Set<string>();
    for (const p of passageiros) {
      const chave = texto(p['chaveDemanda'], 100);
      const matricula = texto(p['matricula'], 50);
      const nome = texto(p['nome'], 200);
      if (chave && cancelados.has(chave)) {
        problemas.add(`${descreverPassageiro(matricula, nome)}: este pedido foi cancelado. Recarregue a tela.`);
        continue;
      }
      const conflita = chave ? chaves.has(chave) : matricula ? matriculas.has(matricula) : !!nome && nomes.has(nome.toUpperCase());
      if (conflita) problemas.add(`${descreverPassageiro(matricula, nome)} já está em outro carro. Recarregue a tela.`);
    }
    return [...problemas];
  }

  private dadosDoPassageiro(p: Objeto, horaSaida: string): Prisma.PassageiroCreateWithoutViagemInput {
    const [servidorNome, servidorMatricula] = servidorDaLinha(p);
    // _confirmacaoAoRegravar: a confirmação só continua valendo se a hora de saída não mudou.
    const status = texto(p['statusConfirmacao'], 30);
    const horaNaLigacao = texto(p['horaNaLigacao'], 10);
    const confirmacaoValida = !!status && status.toLowerCase() !== 'pendente' && !(horaNaLigacao && horaNaLigacao !== horaSaida);
    return {
      chaveDoPedido: texto(p['chaveDemanda'], 100),
      matricula: texto(p['matricula'], 50),
      nome: texto(p['nome'], 200),
      nascimento: texto(p['nascimento'], 20),
      telefones: texto(p['telefones'], 300),
      bairro: texto(p['bairro'], 200),
      enderecoEmbarque: texto(p['enderecoEmbarque'], 300),
      acompanhante: texto(p['acompanhante'], 200),
      telefonesAcomp: texto(p['telefonesAcomp'], 300),
      quantidade: Math.max(0, inteiro(p['quantidade'], 1)),
      trecho: texto(p['trecho'], 100),
      objetivo: texto(p['objetivo'], 200),
      local: texto(p['local'], 300),
      observacao: texto(p['observacao']),
      hora: texto(p['hora'], 10),
      cidade: texto(p['cidade'], 200),
      tipoSolicitado: texto(p['tipoSolicitado'], 100),
      enderecoResidencia: texto(p['enderecoResidencia'], 300),
      servidorNome,
      servidorMatricula,
      statusConfirmacao: confirmacaoValida ? status : 'Pendente',
      horaLigacao: confirmacaoValida ? texto(p['horaLigacao'], 10) : '',
      quemAtendeu: confirmacaoValida ? texto(p['quemAtendeu'], 100) : '',
      atendente: confirmacaoValida ? texto(p['atendente'], 200) : '',
      obsLigacao: confirmacaoValida
        ? texto(p['obsLigacao'])
        : status && status.toLowerCase() !== 'pendente'
          ? `Confirmação anulada: saída mudou de ${horaNaLigacao} para ${horaSaida}.`
          : '',
      horaSaidaNaLigacao: confirmacaoValida ? horaSaida : '',
    };
  }

  // salvarViagensAlocadas: grava os carros montados na tela Viagens Externas.
  async salvarCarros(payload: unknown, operador: string): Promise<boolean> {
    const dados = (payload ?? {}) as Objeto;
    const data = conferirData(dados['data']);
    const alocacoes = Array.isArray(dados['alocacoes']) ? (dados['alocacoes'] as Objeto[]).slice(0, 100) : [];
    await this.gravarNoDia(data, operador, async (transacao) => {
      const todos = alocacoes.flatMap((v) => (Array.isArray(v['passageiros']) ? (v['passageiros'] as Objeto[]) : []));
      const problemas = await this.conflitosDePassageiros(transacao, data, todos);
      // A mesma placa pode sair mais de uma vez no dia (bate-volta), mas não duas vezes no mesmo horário.
      const ocupadas = new Set<string>();
      const viagensDoDia = await transacao.viagem.findMany({ where: { data }, include: { passageiros: true } });
      for (const v of viagensDoDia) {
        if (v.passageiros.some((p) => !estaCancelado(p)) && v.horaSaida) ocupadas.add(`${v.placa.toUpperCase()}|${v.horaSaida}`);
      }
      for (const v of alocacoes) {
        const placa = texto(v['placa'], 20).toUpperCase();
        const hora = texto(v['horaEmbarque'], 10);
        if (placa && !hora && [...ocupadas].some((k) => k.startsWith(`${placa}|`))) problemas.push('Este carro já saiu hoje. Informe a hora de saída.');
        if (placa && hora) {
          if (ocupadas.has(`${placa}|${hora}`)) problemas.push(`Este carro já sai às ${hora}. Escolha outro horário.`);
          ocupadas.add(`${placa}|${hora}`);
        }
      }
      if (problemas.length) {
        throw new ConflictException(problemas.slice(0, 3).join(' ') + (problemas.length > 3 ? ` E mais ${problemas.length - 3}.` : ''));
      }
      const capacidades = await this.capacidades(transacao);
      for (const v of alocacoes) {
        const placa = texto(v['placa'], 20);
        const passageiros = Array.isArray(v['passageiros']) ? (v['passageiros'] as Objeto[]) : [];
        const tipo = texto(v['tipo'], 100);
        const ehLacen = !passageiros.length && tipo.toUpperCase().includes('LACEN');
        if (!passageiros.length && !ehLacen) continue;
        const capacidade = capacidades.get(placa);
        const bloqueados = Math.max(0, inteiro(v['bloqueados'], 0));
        if (passageiros.length) {
          const pessoas = passageiros.reduce((soma, p) => soma + Math.max(0, inteiro(p['quantidade'], 1)), 0);
          const lugares = (capacidade?.capacidade ?? CAPACIDADE_QUANDO_NAO_CADASTRADA) - bloqueados;
          if (pessoas > lugares) throw new BadRequestException(`Carro ${placa}: Não cabe: ${lugares} lugar(es) para ${pessoas} pessoa(s).`);
        }
        if (v['doisMotoristas'] && !capacidade?.publico) {
          throw new BadRequestException(`Dois motoristas só em carro público: o ${placa} é terceirizado.`);
        }
        const horaSaida = texto(v['horaEmbarque'], 10);
        const aviso = texto(v['aviso']);
        const localEmbarque = texto(v['localEmbarque'], 300);
        const destino = texto(v['destino'], 300);
        await transacao.viagem.create({
          data: {
            id: novoIdDeViagem(),
            data,
            placa,
            tipoVeiculo: tipo,
            motorista: texto(v['motorista'], 200),
            doisMotoristas: !!v['doisMotoristas'],
            horaSaida,
            localEmbarque,
            destino,
            assentosBloqueados: ehLacen ? (capacidade?.capacidade ?? CAPACIDADE_QUANDO_NAO_CADASTRADA) : bloqueados,
            roteiro: Array.isArray(v['roteiro']) ? (v['roteiro'] as unknown[]).map((r) => texto(r, 300)).filter(Boolean) : [],
            aviso,
            avisoRegistro: aviso ? `${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${operador}` : '',
            avisoAEnviar: !!aviso,
            ehCargaDoLacen: ehLacen,
            passageiros: {
              create: ehLacen
                ? [{ matricula: 'N/A', nome: 'Carga / Insumos (Sem Pacientes)', quantidade: 0, objetivo: 'Transporte de Insumos', local: 'LACEN', hora: horaSaida, cidade: destino, enderecoEmbarque: localEmbarque }]
                : passageiros.map((p) => this.dadosDoPassageiro(p, horaSaida)),
            },
          },
        });
      }
    });
    return true;
  }

  // _linhasDoCarro: acha a viagem pela placa e, quando houver bate-volta, pelo id da viagem.
  private async viagemDoCarro(transacao: Transacao, data: string, placa: string, idViagem: string): Promise<ViagemComPassageiros> {
    const viagens = await transacao.viagem.findMany({
      where: { data, placa, ...(idViagem ? { id: idViagem } : {}) },
      include: { passageiros: { orderBy: { id: 'asc' } } },
    });
    const vivas = viagens.filter((v) => v.passageiros.some((p) => !estaCancelado(p)));
    const candidatas = vivas.length ? vivas : viagens;
    if (candidatas.length > 1) {
      throw new ConflictException(`Este carro tem ${candidatas.length} viagens neste dia. Abra em Viagens Externas e escolha qual.`);
    }
    const viagem = candidatas[0];
    if (!viagem) throw new NotFoundException(`O carro ${placa} não tem viagem ativa em ${isoParaBR(data)}.`);
    return viagem;
  }

  // atualizarCarroAlocado: edita o carro no lugar (hora, embarque, roteiro, bloqueios, aviso, quem sai, quem entra).
  async editarCarro(argumentos: unknown[], operador: string): Promise<Objeto> {
    const data = conferirData(argumentos[0]);
    const placa = texto(argumentos[1], 20);
    const mudancas = (argumentos[2] ?? {}) as Objeto;
    const idViagem = texto(argumentos[4], 20);
    await this.gravarNoDia(data, operador, async (transacao) => {
      const viagem = await this.viagemDoCarro(transacao, data, placa, idViagem);
      const capacidades = await this.capacidades(transacao);
      const atualizar: Prisma.ViagemUpdateInput = {};
      if (mudancas['aviso'] !== undefined) {
        const aviso = texto(mudancas['aviso']).replace(/\r\n?/g, '\n');
        if (aviso !== viagem.aviso.trim()) {
          atualizar.aviso = aviso;
          atualizar.avisoRegistro = aviso ? `${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${operador}` : '';
          atualizar.avisoAEnviar = !!aviso;
        }
      }
      if (mudancas['doisMotoristas'] !== undefined) {
        const querDois = !!mudancas['doisMotoristas'];
        if (querDois && !capacidades.get(placa)?.publico) throw new BadRequestException(`Dois motoristas só em carro público: o ${placa} é terceirizado.`);
        atualizar.doisMotoristas = querDois;
        if (!querDois) atualizar.motorista2 = '';
      }
      const horaAntes = viagem.horaSaida;
      const horaNova = mudancas['horaSaida'] === undefined ? horaAntes : texto(mudancas['horaSaida'], 10);
      if (mudancas['horaSaida'] !== undefined) atualizar.horaSaida = horaNova;
      if (mudancas['localEmbarque'] !== undefined) atualizar.localEmbarque = texto(mudancas['localEmbarque'], 300);
      const roteiro = Array.isArray(mudancas['roteiro']) ? (mudancas['roteiro'] as unknown[]).map((r) => texto(r, 300)).filter(Boolean) : null;
      if (roteiro) atualizar.roteiro = roteiro;
      const destino = mudancas['destino'] !== undefined ? texto(mudancas['destino'], 300) : roteiro?.length ? roteiro[roteiro.length - 1] : undefined;
      if (destino !== undefined) atualizar.destino = destino;
      const bloqueados = mudancas['bloqueados'] !== undefined ? Math.max(0, inteiro(mudancas['bloqueados'], 0)) : viagem.assentosBloqueados;
      atualizar.assentosBloqueados = bloqueados;

      // Quem sai.
      const remover = new Set(
        (Array.isArray(mudancas['removerMatriculas']) ? (mudancas['removerMatriculas'] as unknown[]) : []).map((m) => texto(m, 200).toUpperCase()).filter(Boolean),
      );
      const vivos = viagem.passageiros.filter((p) => !estaCancelado(p));
      const saem = vivos.filter((p) => remover.has(identificarPassageiro(p)) || (!ehMarcadorNulo(p.nome) && remover.has((p.matricula || p.nome).toUpperCase())));
      const ficam = vivos.filter((p) => !saem.includes(p));
      const entram = Array.isArray(mudancas['encaixar']) ? (mudancas['encaixar'] as Objeto[]).slice(0, 50) : [];
      if (saem.length) await transacao.passageiro.deleteMany({ where: { id: { in: saem.map((p) => p.id) } } });
      if (!ficam.length && !entram.length) {
        await transacao.viagem.delete({ where: { id: viagem.id } });
        return;
      }
      const embarques = (mudancas['embarques'] ?? {}) as Objeto;
      const servidores = (mudancas['servidores'] ?? {}) as Objeto;
      if (entram.length) {
        if (viagem.tipoVeiculo.toUpperCase().includes('LACEN')) throw new BadRequestException('O furgão do LACEN não leva paciente.');
        const problemas = await this.conflitosDePassageiros(transacao, data, entram);
        if (problemas.length) throw new ConflictException(problemas.slice(0, 3).join(' '));
        const ocupados = ficam.reduce((soma, p) => soma + (p.quantidade || 1), 0);
        const precisa = entram.reduce((soma, p) => soma + Math.max(1, inteiro(p['quantidade'], 1)), 0);
        const livres = (capacidades.get(placa)?.capacidade ?? CAPACIDADE_QUANDO_NAO_CADASTRADA) - ocupados - bloqueados;
        if (livres < precisa) throw new BadRequestException(`Não cabe: ${livres} vaga(s) livre(s) e ${precisa} pessoa(s).`);
        for (const p of entram) {
          const chave = identificarPassageiro({ id: 0, matricula: texto(p['matricula'], 50), nome: texto(p['nome'], 200), chaveDoPedido: texto(p['chaveDemanda'], 100) });
          const embarque = embarques[chave];
          await transacao.passageiro.create({
            data: { ...this.dadosDoPassageiro({ ...p, statusConfirmacao: '' }, horaNova), ...(embarque !== undefined ? { enderecoEmbarque: texto(embarque, 300) } : {}), viagem: { connect: { id: viagem.id } } },
          });
        }
      }
      for (const p of ficam) {
        const chave = identificarPassageiro(p);
        const mudar: Prisma.PassageiroUpdateInput = {};
        const embarque = embarques[chave] ?? (!ehMarcadorNulo(p.nome) ? embarques[(p.matricula || p.nome).toUpperCase()] : undefined);
        if (embarque !== undefined) mudar.enderecoEmbarque = texto(embarque, 300);
        const servidor = servidores[chave] as Objeto | undefined;
        if (servidor && ehMarcadorNulo(p.nome) && ehMarcadorNulo(p.matricula)) {
          mudar.servidorNome = ehMarcadorNulo(servidor['nome']) ? '' : texto(servidor['nome'], 200);
          mudar.servidorMatricula = ehMarcadorNulo(servidor['matricula']) ? '' : texto(servidor['matricula'], 50);
        }
        // Só a hora de saída anula a confirmação: é o que o paciente ouviu no telefone.
        if (horaNova !== horaAntes && p.statusConfirmacao && p.statusConfirmacao.toLowerCase() !== 'pendente') {
          Object.assign(mudar, {
            statusConfirmacao: 'Pendente',
            horaLigacao: '',
            quemAtendeu: '',
            atendente: '',
            obsLigacao: `Confirmação anulada: saída mudou de ${horaAntes} para ${horaNova}.`,
          });
        }
        if (Object.keys(mudar).length) await transacao.passageiro.update({ where: { id: p.id }, data: mudar });
      }
      await transacao.viagem.update({ where: { id: viagem.id }, data: atualizar });
    });
    return this.dadosDoDia(data);
  }

  // estornarViagemAlocada: desfaz o carro. Os pedidos voltam para a fila.
  async desfazerCarro(argumentos: unknown[], operador: string): Promise<Objeto> {
    const data = conferirData(argumentos[0]);
    const placa = texto(argumentos[1], 20);
    const idViagem = texto(argumentos[3], 20);
    await this.gravarNoDia(data, operador, async (transacao) => {
      const viagem = await this.viagemDoCarro(transacao, data, placa, idViagem);
      await transacao.viagem.delete({ where: { id: viagem.id } });
    });
    return this.dadosDoDia(data);
  }

  // marcarAvisoEnviado
  async marcarAvisoEnviado(argumentos: unknown[], operador: string): Promise<Objeto> {
    const data = conferirData(argumentos[0]);
    const placa = texto(argumentos[1], 20);
    const idViagem = texto(argumentos[3], 20);
    await this.gravarNoDia(data, operador, async (transacao) => {
      const viagem = await this.viagemDoCarro(transacao, data, placa, idViagem);
      await transacao.viagem.update({ where: { id: viagem.id }, data: { avisoAEnviar: false } });
    });
    return this.dadosDoDia(data);
  }

  private acharPassageiro(viagens: ViagemComPassageiros[], alvo: unknown) {
    for (const viagem of viagens) {
      const passageiro = viagem.passageiros.find((p) => ehOMesmoPassageiro(p, alvo));
      if (passageiro) return { viagem, passageiro };
    }
    return null;
  }

  private ocupacao(viagem: ViagemComPassageiros): number {
    return viagem.passageiros.filter((p) => !estaCancelado(p)).reduce((soma, p) => soma + (p.quantidade || 1), 0);
  }

  private zerarConfirmacao(): Prisma.PassageiroUpdateInput {
    return { statusConfirmacao: 'Pendente', horaLigacao: '', quemAtendeu: '', atendente: '', obsLigacao: '', horaSaidaNaLigacao: '' };
  }

  // moverPacienteAlocado: leva um passageiro para outro carro. A confirmação volta a pendente, porque o carro mudou.
  async moverPassageiro(argumentos: unknown[], operador: string): Promise<Objeto> {
    const data = conferirData(argumentos[0]);
    const placaOrigem = texto(argumentos[1], 20);
    const placaDestino = texto(argumentos[3], 20);
    const idViagemDestino = texto(argumentos[5], 20);
    if (placaOrigem === placaDestino && !idViagemDestino) return this.dadosDoDia(data);
    await this.gravarNoDia(data, operador, async (transacao) => {
      const daOrigem = await transacao.viagem.findMany({ where: { data, placa: placaOrigem }, include: { passageiros: true } });
      const achado = this.acharPassageiro(daOrigem, argumentos[2]);
      if (!achado) throw new NotFoundException('Paciente não encontrado no carro de origem.');
      const destino = await this.viagemDoCarro(transacao, data, placaDestino, idViagemDestino);
      if (destino.id === achado.viagem.id) return;
      const capacidade = (await this.capacidades(transacao)).get(placaDestino)?.capacidade ?? CAPACIDADE_QUANDO_NAO_CADASTRADA;
      const livres = capacidade - this.ocupacao(destino) - destino.assentosBloqueados;
      const precisa = achado.passageiro.quantidade || 1;
      if (livres < precisa) throw new BadRequestException(`O carro ${placaDestino} não tem vaga suficiente (livres: ${livres}, necessário: ${precisa}).`);
      await transacao.passageiro.update({ where: { id: achado.passageiro.id }, data: { ...this.zerarConfirmacao(), viagem: { connect: { id: destino.id } } } });
      await this.apagarViagemVazia(transacao, achado.viagem.id);
    });
    return this.dadosDoDia(data);
  }

  // trocarPacienteAlocado: troca dois passageiros de carro.
  async trocarPassageiros(argumentos: unknown[], operador: string): Promise<Objeto> {
    const data = conferirData(argumentos[0]);
    const placaA = texto(argumentos[1], 20);
    const placaB = texto(argumentos[3], 20);
    await this.gravarNoDia(data, operador, async (transacao) => {
      const viagens = await transacao.viagem.findMany({ where: { data, placa: { in: [placaA, placaB] } }, include: { passageiros: true } });
      const a = this.acharPassageiro(viagens.filter((v) => v.placa === placaA), argumentos[2]);
      const b = this.acharPassageiro(viagens.filter((v) => v.placa === placaB), argumentos[4]);
      if (!a || !b) throw new NotFoundException('Paciente(s) não encontrado(s) para a troca.');
      if (a.viagem.id === b.viagem.id) return;
      const capacidades = await this.capacidades(transacao);
      const qa = a.passageiro.quantidade || 1;
      const qb = b.passageiro.quantidade || 1;
      const limiteA = capacidades.get(placaA)?.capacidade ?? CAPACIDADE_QUANDO_NAO_CADASTRADA;
      const limiteB = capacidades.get(placaB)?.capacidade ?? CAPACIDADE_QUANDO_NAO_CADASTRADA;
      if (this.ocupacao(a.viagem) - qa + qb + a.viagem.assentosBloqueados > limiteA) throw new BadRequestException(`A troca estoura a lotação do carro ${placaA}.`);
      if (this.ocupacao(b.viagem) - qb + qa + b.viagem.assentosBloqueados > limiteB) throw new BadRequestException(`A troca estoura a lotação do carro ${placaB}.`);
      await transacao.passageiro.update({ where: { id: a.passageiro.id }, data: { ...this.zerarConfirmacao(), viagem: { connect: { id: b.viagem.id } } } });
      await transacao.passageiro.update({ where: { id: b.passageiro.id }, data: { ...this.zerarConfirmacao(), viagem: { connect: { id: a.viagem.id } } } });
    });
    return this.dadosDoDia(data);
  }

  private async apagarViagemVazia(transacao: Transacao, idViagem: string): Promise<void> {
    const restantes = await transacao.passageiro.count({ where: { viagemId: idViagem } });
    if (restantes === 0) await transacao.viagem.delete({ where: { id: idViagem } });
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Confirmação do paciente (fluxo 3)

  // salvarConfirmacao: registra a ligação. Cancelado tira o passageiro do carro e o carro vazio volta à frota.
  async salvarConfirmacao(argumentos: unknown[], operador: string): Promise<Objeto> {
    const data = conferirData(argumentos[0]);
    const placa = texto(argumentos[1], 20);
    const status = texto(argumentos[3], 30);
    if (!STATUS_DA_CONFIRMACAO.has(status)) throw new BadRequestException('Situação da confirmação inválida.');
    const quemAtendeu = texto(argumentos[4], 100);
    const observacao = argumentos[5];
    const motivoDoCancelamento = texto(argumentos[7]);
    await this.gravarNoDia(data, operador, async (transacao) => {
      const viagens = await transacao.viagem.findMany({ where: { data, placa }, include: { passageiros: true } });
      const achado = this.acharPassageiro(viagens, argumentos[2]);
      if (!achado) throw new NotFoundException('Paciente não encontrado neste carro. Recarregue a tela.');
      const hora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      await transacao.passageiro.update({
        where: { id: achado.passageiro.id },
        data: {
          statusConfirmacao: status,
          horaLigacao: hora,
          quemAtendeu,
          atendente: operador,
          obsLigacao: status === 'Cancelado' ? motivoDoCancelamento : '',
          horaSaidaNaLigacao: achado.viagem.horaSaida,
          ...(observacao !== undefined && observacao !== null ? { observacao: texto(observacao) } : {}),
        },
      });
    });
    return this.dadosDoDia(data);
  }
}
