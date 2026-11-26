import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BancoDeDadosService } from '../banco-de-dados/banco-de-dados.service';
import { texto } from '../operacao/operacao.service';
import { chaveDoLocal, DATA_ISO, isoParaBR, normalizarTexto } from '../regras/regras-do-setor';
import { EventosService } from '../tempo-real/eventos.service';

// Tela Configurações: frota, motoristas, locais de embarque, calendário e padronização de locais. Traz getConfigData,
// salvarConfig, inativarComVinculo, vincularVeiculoMotorista, salvarCalendario e as funções da padronização.

type Objeto = Record<string, unknown>;
// "Endereço do paciente" é uma opção do sistema: na montagem, vira o endereço de casa de cada paciente.
export const EMBARQUE_ENDERECO_DO_PACIENTE = 'Endereço do paciente';
const UM_DIA = 86_400_000;

function dataBRParaISO(valor: unknown): string {
  const t = texto(valor, 20);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return DATA_ISO.test(t) ? t : '';
}

// Motivo diferente de "Ativo" inativa o registro (regra do sistema atual).
function situacao(dados: Objeto): { status: string; motivo: string; observacao: string } {
  let motivo = texto(dados['motivo'], 100);
  let status = texto(dados['status'], 20);
  if (motivo && motivo.toLowerCase() !== 'ativo') status = 'Inativo';
  else {
    motivo = '';
    status ||= 'Ativo';
  }
  return { status, motivo, observacao: texto(dados['observacao']) };
}

@Injectable()
export class CadastrosService {
  constructor(
    private readonly banco: BancoDeDadosService,
    private readonly eventos: EventosService,
  ) {}

  private avisar(origem: string): void {
    this.eventos.avisar('cadastros', [], origem);
  }

  // getConfigData
  async dadosDasConfiguracoes(): Promise<Objeto> {
    const cliente = this.banco.cliente;
    const [veiculos, motoristas, locais, calendario] = await Promise.all([
      cliente.veiculo.findMany({ orderBy: { placa: 'asc' } }),
      cliente.motorista.findMany({ orderBy: { ordem: 'asc' } }),
      cliente.localDeEmbarque.findMany({ orderBy: [{ ordem: 'asc' }, { nome: 'asc' }] }),
      cliente.diaNaoUtil.findMany({ orderBy: { data: 'asc' } }),
    ]);
    return {
      veiculos: veiculos.map((v) => ({
        _key: v.placa, placa: v.placa, tipo: v.tipo, assentos: v.capacidade, propriedade: v.propriedade,
        status: v.status, motivo: v.motivo, observacao: v.observacao,
      })),
      motoristas: motoristas.map((m) => ({
        _key: m.nome, nome: m.nome, vinculo: m.vinculo, placaVinculada: m.placaVinculada, status: m.status,
        whatsapp: m.whatsapp, motivo: m.motivo, observacao: m.observacao,
      })),
      locais: locais.map((l) => ({
        _key: l.nome, local: l.nome, status: l.status, motivo: l.motivo, padrao: l.padrao,
        trava: normalizarTexto(l.nome) === normalizarTexto(EMBARQUE_ENDERECO_DO_PACIENTE) ? 'sentinela' : '',
      })),
      calendario: calendario.map((c) => ({ _key: isoParaBR(c.data), data: isoParaBR(c.data), tipo: c.tipo, descricao: c.descricao, bloco: c.bloco })),
    };
  }

  // salvarConfig(tipo, acao, dados, chaveAntiga)
  async salvarConfiguracao(argumentos: unknown[], operador: string): Promise<boolean> {
    const tipo = texto(argumentos[0], 20);
    const acao = texto(argumentos[1], 20);
    const dados = (argumentos[2] ?? {}) as Objeto;
    const chaveAntiga = texto(argumentos[3], 200);
    if (tipo === 'locais') await this.salvarLocalDeEmbarque(acao, dados, chaveAntiga);
    else if (tipo === 'veiculos') await this.salvarVeiculo(acao, dados, chaveAntiga);
    else if (tipo === 'motoristas') await this.salvarMotorista(acao, dados, chaveAntiga);
    else throw new BadRequestException(`Cadastro desconhecido: ${tipo}.`);
    this.avisar(operador);
    return true;
  }

  private async salvarVeiculo(acao: string, dados: Objeto, chaveAntiga: string): Promise<void> {
    const { status, motivo, observacao } = situacao(dados);
    const cliente = this.banco.cliente;
    if (acao === 'alternarStatus') {
      const atual = await cliente.veiculo.findUnique({ where: { placa: chaveAntiga } });
      if (!atual) throw new NotFoundException('Registro original não encontrado.');
      await cliente.veiculo.update({ where: { placa: chaveAntiga }, data: { status, motivo: status === 'Ativo' ? '' : motivo, observacao: status === 'Ativo' ? '' : observacao } });
      return;
    }
    const placa = texto(dados['placa'], 20).toUpperCase();
    if (!placa) throw new BadRequestException('Informe a placa.');
    const campos = {
      placa,
      tipo: texto(dados['tipo'], 100),
      capacidade: Math.max(0, Number.parseInt(texto(dados['assentos'], 5), 10) || 0),
      propriedade: texto(dados['propriedade'], 30) || 'Público',
      status,
      motivo,
    };
    if (acao === 'novo') {
      if (await cliente.veiculo.findUnique({ where: { placa } })) throw new ConflictException(`O carro ${placa} já está cadastrado.`);
      await cliente.veiculo.create({ data: campos });
    } else if (acao === 'editar') {
      if (!(await cliente.veiculo.findUnique({ where: { placa: chaveAntiga } }))) throw new NotFoundException('Registro original não encontrado.');
      await cliente.veiculo.update({ where: { placa: chaveAntiga }, data: campos });
    } else throw new BadRequestException(`Ação desconhecida: ${acao}.`);
  }

  private async salvarMotorista(acao: string, dados: Objeto, chaveAntiga: string): Promise<void> {
    const { status, motivo, observacao } = situacao(dados);
    const cliente = this.banco.cliente;
    if (acao === 'alternarStatus') {
      if (!(await cliente.motorista.findUnique({ where: { nome: chaveAntiga } }))) throw new NotFoundException('Registro original não encontrado.');
      await cliente.motorista.update({ where: { nome: chaveAntiga }, data: { status, motivo: status === 'Ativo' ? '' : motivo, observacao: status === 'Ativo' ? '' : observacao } });
      return;
    }
    const nome = texto(dados['nome'], 200);
    if (!nome) throw new BadRequestException('Informe o nome do motorista.');
    const campos = {
      nome,
      vinculo: texto(dados['vinculo'], 30) || 'Servidor',
      placaVinculada: texto(dados['placaVinculada'], 20),
      status,
      whatsapp: texto(dados['whatsapp'], 30),
      motivo,
    };
    if (acao === 'novo') {
      if (await cliente.motorista.findUnique({ where: { nome } })) throw new ConflictException(`${nome} já está cadastrado.`);
      const ultimo = await cliente.motorista.aggregate({ _max: { ordem: true } });
      await cliente.motorista.create({ data: { ...campos, ordem: (ultimo._max.ordem ?? 0) + 1 } });
    } else if (acao === 'editar') {
      if (!(await cliente.motorista.findUnique({ where: { nome: chaveAntiga } }))) throw new NotFoundException('Registro original não encontrado.');
      await cliente.motorista.update({ where: { nome: chaveAntiga }, data: campos });
    } else throw new BadRequestException(`Ação desconhecida: ${acao}.`);
  }

  // _salvarEmbarqueImpl
  private async salvarLocalDeEmbarque(acao: string, dados: Objeto, chaveAntiga: string): Promise<void> {
    const { status, motivo } = situacao(dados);
    const cliente = this.banco.cliente;
    const atual = acao === 'novo' ? null : await cliente.localDeEmbarque.findUnique({ where: { nome: chaveAntiga } });
    if (acao !== 'novo' && !atual) throw new NotFoundException(`Local "${chaveAntiga}" não encontrado. Recarregue a tela.`);
    const ehEnderecoDoPaciente = !!atual && normalizarTexto(atual.nome) === normalizarTexto(EMBARQUE_ENDERECO_DO_PACIENTE);
    const sai = status !== 'Ativo';
    const mensagemDoEndereco = `"${EMBARQUE_ENDERECO_DO_PACIENTE}" é uma opção do sistema: ao montar o carro, ela vira o endereço de casa de cada paciente. Não pode ser renomeada nem sair da lista.`;
    const mensagemDoPadrao = `"${atual?.nome ?? ''}" é o local padrão das saídas. Marque outro com a estrela antes de tirá-lo da lista.`;
    if (acao === 'definirPadrao' && atual) {
      if (ehEnderecoDoPaciente) throw new BadRequestException(`"${EMBARQUE_ENDERECO_DO_PACIENTE}" não é um lugar de saída e não pode ser o padrão.`);
      if (atual.status !== 'Ativo') throw new BadRequestException('Só um local ativo pode ser o padrão das saídas.');
      await cliente.$transaction([
        cliente.localDeEmbarque.updateMany({ data: { padrao: false } }),
        cliente.localDeEmbarque.update({ where: { id: atual.id }, data: { padrao: true } }),
      ]);
      return;
    }
    if (acao === 'alternarStatus' && atual) {
      if (sai && ehEnderecoDoPaciente) throw new BadRequestException(mensagemDoEndereco);
      if (sai && atual.padrao) throw new BadRequestException(mensagemDoPadrao);
      await cliente.localDeEmbarque.update({ where: { id: atual.id }, data: { status, motivo } });
      return;
    }
    if (acao !== 'novo' && acao !== 'editar') throw new BadRequestException(`Ação desconhecida: ${acao}.`);
    const nome = texto(dados['local'], 300).replace(/\s+/g, ' ');
    if (!nome) throw new BadRequestException('Informe o nome do local.');
    const todos = await cliente.localDeEmbarque.findMany();
    const repetido = todos.find((l) => l.id !== atual?.id && normalizarTexto(l.nome) === normalizarTexto(nome));
    if (repetido) throw new ConflictException(`Já existe um local chamado "${repetido.nome}".`);
    if (acao === 'novo') {
      await cliente.localDeEmbarque.create({ data: { nome, status, motivo, ordem: todos.length + 1 } });
      return;
    }
    if (atual && ehEnderecoDoPaciente && (nome !== atual.nome || sai)) throw new BadRequestException(mensagemDoEndereco);
    if (atual?.padrao && sai) throw new BadRequestException(mensagemDoPadrao);
    await cliente.localDeEmbarque.update({ where: { nome: chaveAntiga }, data: { nome, status, motivo } });
  }

  // inativarComVinculo: o terceirizado sai junto com o carro dele.
  async inativarComVinculo(dados: unknown, operador: string): Promise<boolean> {
    const p = (dados ?? {}) as Objeto;
    const placa = texto(p['placa'], 20);
    const nome = texto(p['motorista'], 200);
    if (!placa && !nome) throw new BadRequestException('Nada para inativar.');
    const inativar = { motivo: 'Inativo', observacao: p['observacao'] };
    if (placa) await this.salvarVeiculo('alternarStatus', inativar, placa);
    if (nome) await this.salvarMotorista('alternarStatus', inativar, nome);
    this.avisar(operador);
    return true;
  }

  // vincularVeiculoMotorista
  async vincularCarroAoMotorista(argumentos: unknown[], operador: string): Promise<boolean> {
    const nome = texto(argumentos[0], 200);
    const placaPedida = texto(argumentos[1], 20);
    if (!nome || !placaPedida) throw new BadRequestException('Informe o motorista e o carro.');
    const cliente = this.banco.cliente;
    const carro = (await cliente.veiculo.findMany()).find((v) => v.placa.toUpperCase() === placaPedida.toUpperCase());
    if (!carro) throw new NotFoundException(`O carro ${placaPedida} não está cadastrado.`);
    if (carro.propriedade !== 'Terceirizado') throw new BadRequestException(`O carro ${carro.placa} não é terceirizado.`);
    if (carro.status !== 'Ativo') throw new BadRequestException(`O carro ${carro.placa} não está ativo.`);
    const outro = await cliente.motorista.findFirst({ where: { vinculo: 'Terceirizado', placaVinculada: carro.placa, NOT: { nome } } });
    if (outro) throw new ConflictException(`O carro ${carro.placa} já está com ${outro.nome}.`);
    const motorista = await cliente.motorista.findUnique({ where: { nome } });
    if (!motorista) throw new NotFoundException(`Motorista não encontrado: ${nome}.`);
    if (motorista.vinculo !== 'Terceirizado') throw new BadRequestException(`${nome} não é motorista terceirizado.`);
    await cliente.motorista.update({ where: { nome }, data: { placaVinculada: carro.placa } });
    this.avisar(operador);
    return true;
  }

  // salvarCalendario(acao, dados, chaveAntiga)
  async salvarCalendario(argumentos: unknown[], operador: string): Promise<boolean> {
    const acao = texto(argumentos[0], 20);
    const dados = (argumentos[1] ?? {}) as Objeto;
    const chaveAntiga = dataBRParaISO(argumentos[2]);
    const cliente = this.banco.cliente;
    if (acao === 'novo') {
      let inicio = dataBRParaISO(dados['dataInicio']);
      let fim = dataBRParaISO(dados['dataFim']) || inicio;
      if (!inicio) throw new BadRequestException('Informe a data.');
      if (inicio > fim) [inicio, fim] = [fim, inicio];
      const quantidade = Math.round((Date.parse(fim) - Date.parse(inicio)) / UM_DIA) + 1;
      if (quantidade > 120) throw new BadRequestException('Cadastre no máximo 120 dias de uma vez.');
      const dias = Array.from({ length: quantidade }, (_, i) => new Date(Date.parse(inicio) + i * UM_DIA).toISOString().slice(0, 10));
      const existentes = await cliente.diaNaoUtil.findMany({ where: { data: { in: dias } } });
      if (existentes.length) {
        const lista = existentes.map((d) => isoParaBR(d.data));
        throw new ConflictException(`Já existe registro para: ${lista.slice(0, 5).join(', ')}${lista.length > 5 ? ` (e mais ${lista.length - 5})` : ''}. Edite ou exclua antes de cadastrar de novo.`);
      }
      const descricao = texto(dados['descricao'], 300);
      const bloco = dias.length > 1 ? `${descricao || 'Bloco'} ${isoParaBR(inicio)}` : '';
      await cliente.diaNaoUtil.createMany({ data: dias.map((data) => ({ data, tipo: texto(dados['tipo'], 50) || 'Feriado', descricao, bloco })) });
    } else if (acao === 'editar' || acao === 'excluir') {
      const atual = chaveAntiga ? await cliente.diaNaoUtil.findUnique({ where: { data: chaveAntiga } }) : null;
      if (!atual) throw new NotFoundException('Data não encontrada no calendário.');
      if (acao === 'editar') {
        await cliente.diaNaoUtil.update({ where: { data: atual.data }, data: { tipo: texto(dados['tipo'], 50) || 'Feriado', descricao: texto(dados['descricao'], 300) } });
      } else if (atual.bloco) await cliente.diaNaoUtil.deleteMany({ where: { bloco: atual.bloco } });
      else await cliente.diaNaoUtil.delete({ where: { data: atual.data } });
    } else throw new BadRequestException(`Ação desconhecida no calendário: ${acao}.`);
    this.avisar(operador);
    this.eventos.avisar('escala', [], operador);
    return true;
  }

  // getPadronizacaoLocais
  async padronizacoes(): Promise<object[]> {
    const linhas = await this.banco.cliente.padronizacaoDeLocal.findMany({ orderBy: [{ cidadeOriginal: 'asc' }, { localOriginal: 'asc' }] });
    return linhas.map((l) => ({
      cidadeOrig: l.cidadeOriginal,
      localOrig: l.localOriginal,
      cidadePad: l.cidadePadrao,
      localPad: l.localPadrao,
      quem: l.decididoPor,
      quando: l.decididoEm.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      origem: l.origem,
    }));
  }

  // salvarPadronizacaoLocal
  async salvarPadronizacao(dados: unknown, operador: string): Promise<object[]> {
    const p = (dados ?? {}) as Objeto;
    const cidadePadrao = texto(p['cidadePad'], 300);
    const localPadrao = texto(p['localPad'], 300);
    if (!cidadePadrao || !localPadrao) throw new BadRequestException('Informe a cidade e o local.');
    const chave = chaveDoLocal(texto(p['cidadeOrig'], 300), texto(p['localOrig'], 300));
    const atual = await this.banco.cliente.padronizacaoDeLocal.findUnique({ where: { chave } });
    if (!atual) throw new NotFoundException('Esse nome não está mais na padronização (alguém excluiu). Recarregue a lista.');
    await this.banco.cliente.padronizacaoDeLocal.update({ where: { chave }, data: { cidadePadrao, localPadrao, decididoPor: operador, decididoEm: new Date(), origem: 'manual' } });
    this.eventos.avisar('padronizacao', [], operador);
    return this.padronizacoes();
  }

  // excluirPadronizacaoLocal
  async excluirPadronizacao(dados: unknown, operador: string): Promise<object[]> {
    const p = (dados ?? {}) as Objeto;
    const chave = chaveDoLocal(texto(p['cidadeOrig'], 300), texto(p['localOrig'], 300));
    await this.banco.cliente.padronizacaoDeLocal.deleteMany({ where: { chave } });
    this.eventos.avisar('padronizacao', [], operador);
    return this.padronizacoes();
  }
}
