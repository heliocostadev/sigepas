import { BadRequestException, Injectable } from '@nestjs/common';
import { BancoDeDadosService } from '../banco-de-dados/banco-de-dados.service';
import { conferirData, texto } from '../operacao/operacao.service';
import { DATA_ISO, ehJoinville, isoParaBR, normalizarHora, roteiroDoTexto } from '../regras/regras-do-setor';
import { EventosService } from '../tempo-real/eventos.service';

// Fluxo 2, lado da escala: quem trabalha em cada dia, em que ordem, e qual motorista leva cada carro. Traz
// getDadosParaEscala, salvarNovaArquitetura, salvarViagensDaFormacao e getEscalaPeriodo do sistema atual.

type Objeto = Record<string, unknown>;
const DIAS_DA_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DIAS_CURTOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
// Teto do período do relatório (MAX_DIAS_ESCALA do sistema atual).
export const MAXIMO_DE_DIAS_NO_PERIODO = 92;
const UM_DIA = 86_400_000;

function diaDaSemana(dataISO: string): number {
  return new Date(`${dataISO}T12:00:00Z`).getUTCDay();
}

function somarDias(dataISO: string, dias: number): string {
  return new Date(new Date(`${dataISO}T12:00:00Z`).getTime() + dias * UM_DIA).toISOString().slice(0, 10);
}

// Data que vem da tela em DD/MM/AAAA ou AAAA-MM-DD.
function dataDaTela(valor: unknown): string {
  const t = texto(valor, 20);
  if (DATA_ISO.test(t)) return t;
  const brasileira = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  return brasileira ? `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}` : '';
}

@Injectable()
export class EscalaService {
  constructor(
    private readonly banco: BancoDeDadosService,
    private readonly eventos: EventosService,
  ) {}

  private async calendario(): Promise<Map<string, { tipo: string; descricao: string }>> {
    const dias = await this.banco.cliente.diaNaoUtil.findMany();
    return new Map(dias.map((d) => [d.data, { tipo: d.tipo || 'Feriado', descricao: d.descricao }]));
  }

  // _contextoEscala: num fim de semana ou feriado, a escala é a do bloco inteiro de dias não úteis, a partir do
  // primeiro deles (a âncora).
  async contexto(data: string, calendario?: Map<string, { tipo: string; descricao: string }>) {
    const cal = calendario ?? (await this.calendario());
    const naoUtil = (d: string) => cal.has(d) || [0, 6].includes(diaDaSemana(d));
    const semana = diaDaSemana(data);
    const ehUtil = !naoUtil(data);
    const info = cal.get(data);
    let ancora = data;
    const dias = [data];
    if (!ehUtil) {
      for (let passos = 0; passos < 40 && naoUtil(somarDias(ancora, -1)); passos++) {
        ancora = somarDias(ancora, -1);
        dias.unshift(ancora);
      }
      let ultimo = data;
      for (let passos = 0; passos < 40 && naoUtil(somarDias(ultimo, 1)); passos++) {
        ultimo = somarDias(ultimo, 1);
        dias.push(ultimo);
      }
    }
    const ancoraTemEscala = ancora !== data && (await this.banco.cliente.escalaDoDia.count({ where: { data: ancora } })) > 0;
    return {
      data: isoParaBR(data),
      diaSemana: DIAS_CURTOS[semana],
      tipo: info ? info.tipo : semana === 0 ? 'Domingo' : semana === 6 ? 'Sábado' : 'Dia útil',
      descricao: info?.descricao ?? '',
      ehUtil,
      ancora: isoParaBR(ancora),
      ehAncora: ancora === data,
      dias: dias.map(isoParaBR),
      diasISO: dias,
      ancoraTemEscala,
    };
  }

  // getDadosParaEscala
  async dadosParaEscala(dataRecebida: unknown): Promise<Objeto> {
    const data = conferirData(dataRecebida);
    const cliente = this.banco.cliente;
    const [veiculos, motoristas, escala, frota] = await Promise.all([
      cliente.veiculo.findMany({ where: { status: 'Ativo' }, orderBy: { placa: 'asc' } }),
      cliente.motorista.findMany({ where: { status: 'Ativo' }, orderBy: { ordem: 'asc' } }),
      cliente.escalaDoDia.findMany({ where: { data }, orderBy: { posicao: 'asc' } }),
      cliente.frotaDoDia.findMany({ where: { data }, orderBy: { id: 'asc' } }),
    ]);
    const veiculoDaPlaca = new Map(veiculos.map((v) => [v.placa, v]));
    const placasDeTerceirizado = new Set(motoristas.filter((m) => m.vinculo === 'Terceirizado' && m.placaVinculada).map((m) => m.placaVinculada));
    const contexto = await this.contexto(data);
    const datasDasViagens = contexto.ehAncora && contexto.diasISO.length > 1 ? contexto.diasISO : [data];
    const viagens = await cliente.viagem.findMany({
      where: { data: { in: datasDasViagens } },
      include: { passageiros: true },
      orderBy: [{ data: 'asc' }, { horaSaida: 'asc' }],
    });
    const lista = viagens
      .filter((v) => v.passageiros.some((p) => p.statusConfirmacao !== 'Cancelado'))
      .filter((v) => !ehJoinville(v.destino))
      .map((v) => ({
        data: isoParaBR(v.data),
        idViagem: v.id,
        placa: v.placa,
        tipo: v.tipoVeiculo,
        motorista: v.motorista,
        hora: normalizarHora(v.horaSaida),
        destino: v.destino,
        terceirizado: placasDeTerceirizado.has(v.placa),
        ocupados: v.passageiros.filter((p) => p.statusConfirmacao !== 'Cancelado').reduce((s, p) => s + (p.quantidade || 1), 0),
        bloqueados: v.assentosBloqueados,
        doisMotoristas: v.doisMotoristas,
        motorista2: v.doisMotoristas ? v.motorista2 : '',
      }))
      .sort((a, b) => `${dataDaTela(a.data)} ${a.hora || '99:99'}`.localeCompare(`${dataDaTela(b.data)} ${b.hora || '99:99'}`));
    const fixacoes = viagens.flatMap((v) => [
      ...(v.motoristaFixado ? [{ data: isoParaBR(v.data), idViagem: v.id, motorista: v.motoristaFixado, segundo: false }] : []),
      ...(v.motorista2Fixado ? [{ data: isoParaBR(v.data), idViagem: v.id, motorista: v.motorista2Fixado, segundo: true }] : []),
    ]);
    return {
      servidores: motoristas.filter((m) => m.vinculo === 'Servidor').map((m) => ({ nome: m.nome, vinculo: m.vinculo, placaVinculada: m.placaVinculada })),
      terceirizados: motoristas
        .filter((m) => m.vinculo === 'Terceirizado')
        .map((m) => ({
          nome: m.nome,
          vinculo: m.vinculo,
          placaVinculada: m.placaVinculada,
          tipoVeiculo: veiculoDaPlaca.get(m.placaVinculada)?.tipo ?? 'Veículo',
          lotacaoVeiculo: veiculoDaPlaca.get(m.placaVinculada)?.capacidade ?? 0,
        })),
      veiculos: veiculos
        .filter((v) => v.propriedade === 'Público')
        .map((v) => ({ placa: v.placa, tipo: v.tipo, lotacao: v.capacidade, lacen: /LACEN/i.test(v.tipo) })),
      salvos: {
        motoristas: escala.map((e) => ({ nome: e.motorista, condicao: e.condicao, motivo: e.motivoAusencia, posicao: e.posicao, observacao: e.observacao })),
        veiculos: frota.map((f) => ({ placa: f.placa, condicao: f.condicao, motivo: f.motivo, observacao: f.observacao })),
      },
      contexto: { ...contexto, diasISO: undefined },
      viagens: lista,
      fixacoes,
    };
  }

  // salvarNovaArquitetura: grava a escala e a frota do dia. Num bloco de dias não úteis, grava o bloco inteiro.
  async salvarEscala(pacote: unknown, operador: string): Promise<{ datas: string[] }> {
    const dados = (pacote ?? {}) as Objeto;
    const motoristas = Array.isArray(dados['motoristas']) ? (dados['motoristas'] as Objeto[]).slice(0, 500) : [];
    const veiculos = Array.isArray(dados['veiculos']) ? (dados['veiculos'] as Objeto[]).slice(0, 500) : [];
    const data = conferirData(motoristas[0]?.['data'] ?? veiculos[0]?.['data']);
    const contexto = await this.contexto(data);
    const datas = contexto.ehAncora && contexto.diasISO.length > 1 ? contexto.diasISO : [data];
    await this.banco.cliente.$transaction(async (transacao) => {
      await transacao.escalaDoDia.deleteMany({ where: { data: { in: datas } } });
      await transacao.frotaDoDia.deleteMany({ where: { data: { in: datas } } });
      const vistosMotoristas = new Set<string>();
      const vistosVeiculos = new Set<string>();
      await transacao.escalaDoDia.createMany({
        data: datas.flatMap((d) =>
          motoristas
            .filter((m) => texto(m['nome'], 200) && !vistosMotoristas.has(`${d}|${texto(m['nome'], 200)}`) && vistosMotoristas.add(`${d}|${texto(m['nome'], 200)}`))
            .map((m) => ({
              data: d,
              motorista: texto(m['nome'], 200),
              vinculo: texto(m['vinculo'], 50),
              condicao: texto(m['condicao'], 50) || 'Disponível',
              motivoAusencia: texto(m['motivo'], 200),
              posicao: Number.parseInt(texto(m['posicao'], 10), 10) || 999,
              observacao: texto(m['observacao']),
            })),
        ),
      });
      await transacao.frotaDoDia.createMany({
        data: datas.flatMap((d) =>
          veiculos
            .filter((v) => texto(v['placa'], 20) && !vistosVeiculos.has(`${d}|${texto(v['placa'], 20)}`) && vistosVeiculos.add(`${d}|${texto(v['placa'], 20)}`))
            .map((v) => ({
              data: d,
              placa: texto(v['placa'], 20),
              propriedade: texto(v['propriedade'], 50),
              condicao: texto(v['condicao'], 50) || 'Disponível',
              motivo: texto(v['motivo'], 200),
              observacao: texto(v['observacao']),
            })),
        ),
      });
    });
    this.eventos.avisar('escala', datas, operador);
    this.eventos.avisar('operacao', datas, operador);
    return { datas: datas.map(isoParaBR) };
  }

  // salvarViagensDaFormacao: troca motorista e carro das viagens. Recusa o que mudou desde que a tela leu.
  async salvarViagensDaFormacao(argumentos: unknown[], operador: string): Promise<{ alterados: number; recusadas: string[] }> {
    const dataPadrao = conferirData(argumentos[0]);
    const pares = Array.isArray(argumentos[1]) ? (argumentos[1] as Objeto[]).slice(0, 300) : [];
    const recusadas: string[] = [];
    let alterados = 0;
    const datasTocadas = new Set<string>([dataPadrao]);
    await this.banco.cliente.$transaction(async (transacao) => {
      const veiculos = new Map((await transacao.veiculo.findMany()).map((v) => [v.placa.toUpperCase(), v]));
      const motoristas = new Map((await transacao.motorista.findMany()).map((m) => [m.nome.toUpperCase(), m]));
      for (const v of pares) {
        const data = dataDaTela(v['data']) || dataPadrao;
        const idViagem = texto(v['idViagem'], 20);
        const placaNova = texto(v['placa'], 20);
        const motoristaNovo = texto(v['motorista'], 200);
        const rotulo = `${texto(v['hora'], 10) ? `${texto(v['hora'], 10)} ` : ''}${texto(v['destino'], 300) || idViagem}`;
        const recusar = (motivo: string) => recusadas.push(`${rotulo}: ${motivo}`);
        const viagem = await transacao.viagem.findFirst({ where: { id: idViagem, data }, include: { passageiros: true } });
        const vivos = viagem?.passageiros.filter((p) => p.statusConfirmacao !== 'Cancelado') ?? [];
        if (!viagem || !vivos.length) {
          recusar('a viagem não existe mais (estornada ou cancelada)');
          continue;
        }
        if ((v['placaLida'] !== undefined && viagem.placa !== texto(v['placaLida'], 20)) || (v['motoristaLido'] !== undefined && viagem.motorista !== texto(v['motoristaLido'], 200))) {
          recusar(`mudou depois que a Formação abriu (${viagem.placa}, ${viagem.motorista || 'sem motorista'}). Reabra a Formação.`);
          continue;
        }
        const doisNovo = v['doisMotoristas'] === undefined ? viagem.doisMotoristas : !!v['doisMotoristas'];
        const motorista2Novo = doisNovo ? (v['motorista2'] === undefined ? viagem.motorista2 : texto(v['motorista2'], 200)) : '';
        if (v['motorista2Lido'] !== undefined && (viagem.doisMotoristas ? viagem.motorista2 : '') !== texto(v['motorista2Lido'], 200)) {
          recusar('o 2º motorista mudou depois que a Formação abriu. Reabra a Formação.');
          continue;
        }
        const fixado = v['fixado'] && motoristaNovo ? motoristaNovo : '';
        const fixado2 = v['fixado2'] && doisNovo && motorista2Novo ? motorista2Novo : '';
        const mudou = viagem.placa !== placaNova || viagem.motorista !== motoristaNovo || doisNovo !== viagem.doisMotoristas || motorista2Novo !== (viagem.doisMotoristas ? viagem.motorista2 : '');
        if (!mudou) {
          if (fixado !== viagem.motoristaFixado || fixado2 !== viagem.motorista2Fixado) {
            await transacao.viagem.update({ where: { id: viagem.id }, data: { motoristaFixado: fixado, motorista2Fixado: fixado2 } });
          }
          continue;
        }
        if (!placaNova) {
          recusar('sem veículo');
          continue;
        }
        const carro = veiculos.get(placaNova.toUpperCase());
        if (viagem.placa !== placaNova) {
          if (carro?.status !== 'Ativo') {
            recusar(`o carro ${placaNova} não está ativo no cadastro`);
            continue;
          }
          if (/LACEN/i.test(carro.tipo)) {
            recusar('o furgão do LACEN não leva paciente');
            continue;
          }
          const ocupados = vivos.reduce((s, p) => s + (p.quantidade || 1), 0);
          const limite = carro.capacidade || 4;
          if (ocupados + viagem.assentosBloqueados > limite) {
            recusar(`${placaNova} leva ${limite} e a viagem tem ${ocupados}${viagem.assentosBloqueados ? ` + ${viagem.assentosBloqueados} bloqueado(s)` : ''}`);
            continue;
          }
        }
        if (motoristaNovo) {
          const m = motoristas.get(motoristaNovo.toUpperCase());
          if (m?.status !== 'Ativo') {
            recusar(`o motorista ${motoristaNovo} não está ativo no cadastro`);
            continue;
          }
          if (m.vinculo === 'Terceirizado' && m.placaVinculada.toUpperCase() !== placaNova.toUpperCase()) {
            recusar(`${motoristaNovo} é terceirizado e dirige só o carro dele (${m.placaVinculada || 'sem placa'})`);
            continue;
          }
          if (m.vinculo !== 'Terceirizado' && carro && carro.propriedade !== 'Público') {
            recusar(`o carro ${placaNova} é de terceirizado: só o motorista dele dirige`);
            continue;
          }
        }
        if (doisNovo) {
          if (carro?.propriedade !== 'Público') {
            recusar(`dois motoristas só em carro público (${placaNova} não é)`);
            continue;
          }
          const m2 = motorista2Novo ? motoristas.get(motorista2Novo.toUpperCase()) : undefined;
          if (motorista2Novo && m2?.status !== 'Ativo') {
            recusar(`o 2º motorista ${motorista2Novo} não está ativo no cadastro`);
            continue;
          }
          if (m2?.vinculo === 'Terceirizado') {
            recusar(`o 2º motorista tem de ser servidor (${motorista2Novo} é terceirizado)`);
            continue;
          }
          if (motorista2Novo && motorista2Novo.toUpperCase() === motoristaNovo.toUpperCase()) {
            recusar(`${motorista2Novo} não pode ser o 1º e o 2º motorista`);
            continue;
          }
        }
        await transacao.viagem.update({
          where: { id: viagem.id },
          data: {
            placa: placaNova,
            tipoVeiculo: viagem.placa !== placaNova ? (carro?.tipo ?? '') : viagem.tipoVeiculo,
            motorista: motoristaNovo,
            doisMotoristas: doisNovo,
            motorista2: motorista2Novo,
            motoristaFixado: fixado,
            motorista2Fixado: fixado2,
          },
        });
        alterados += 1;
        datasTocadas.add(data);
      }
    });
    this.eventos.avisar('operacao', [...datasTocadas], operador);
    this.eventos.avisar('escala', [...datasTocadas], operador);
    return { alterados, recusadas };
  }

  // getEscalaPeriodo: o relatório da escala por dia, usado na Escala de Viagens e na Escala para Enviar.
  async escalaDoPeriodo(inicioRecebido: unknown, fimRecebido: unknown): Promise<Objeto> {
    let inicio = conferirData(inicioRecebido);
    let fim = conferirData(fimRecebido);
    if (inicio > fim) [inicio, fim] = [fim, inicio];
    const quantidade = Math.round((Date.parse(fim) - Date.parse(inicio)) / UM_DIA) + 1;
    if (quantidade > MAXIMO_DE_DIAS_NO_PERIODO) {
      throw new BadRequestException(`Intervalo muito grande (${quantidade} dias). Máximo: ${MAXIMO_DE_DIAS_NO_PERIODO} dias.`);
    }
    const datas = Array.from({ length: quantidade }, (_, i) => somarDias(inicio, i));
    const cliente = this.banco.cliente;
    const [escala, frota, viagens, motoristas, veiculos, calendario] = await Promise.all([
      cliente.escalaDoDia.findMany({ where: { data: { in: datas } }, orderBy: { posicao: 'asc' } }),
      cliente.frotaDoDia.findMany({ where: { data: { in: datas } } }),
      cliente.viagem.findMany({ where: { data: { in: datas } }, include: { passageiros: true }, orderBy: { criadaEm: 'asc' } }),
      cliente.motorista.findMany({ orderBy: { ordem: 'asc' } }),
      cliente.veiculo.findMany(),
      this.calendario(),
    ]);
    const motoristaDoNome = new Map(motoristas.map((m) => [m.nome.toUpperCase(), m]));
    const ordemDoCadastro = new Map(motoristas.map((m, i) => [m.nome.toUpperCase(), i]));
    const veiculoDaPlaca = new Map(veiculos.map((v) => [v.placa.toUpperCase(), v]));
    const lacen = veiculos.find((v) => /LACEN/i.test(v.tipo) && v.status === 'Ativo');
    const foraGlobal = [
      ...motoristas
        .filter((m) => m.status !== 'Ativo' && m.motivo !== 'Baixado')
        .map((m) => ({ tipo: 'motorista', nome: m.nome, placa: m.vinculo === 'Terceirizado' ? m.placaVinculada : '', origem: 'global', motivo: m.motivo || 'Inativo', observacao: m.observacao })),
      ...veiculos
        .filter((v) => v.status !== 'Ativo' && v.motivo !== 'Baixado')
        .map((v) => ({ tipo: 'veiculo', nome: v.placa, placa: v.placa, origem: 'global', motivo: v.motivo || 'Inativo', observacao: v.observacao })),
    ];

    const dias = datas.map((data) => {
      const infoCal = calendario.get(data);
      const semana = diaDaSemana(data);
      const tipoDia = infoCal ? infoCal.tipo : semana === 0 ? 'Domingo' : semana === 6 ? 'Sábado' : 'Dia útil';
      const ehUtil = tipoDia === 'Dia útil';
      const escalaDoDia = escala.filter((e) => e.data === data);
      const carros = viagens
        .filter((v) => v.data === data && v.passageiros.some((p) => p.statusConfirmacao !== 'Cancelado'))
        .map((v) => ({
          placa: v.placa,
          tipo: v.tipoVeiculo || veiculoDaPlaca.get(v.placa.toUpperCase())?.tipo || '',
          motorista: v.motorista,
          motorista2: v.doisMotoristas ? v.motorista2 : '',
          hora: normalizarHora(v.horaSaida),
          destino: v.roteiro.length ? roteiroDoTexto(v.roteiro.join(' > ')).join(' › ') : v.destino,
          externa: !ehJoinville(v.destino),
        }));
      const vinculoDoDia = new Map(escalaDoDia.map((e) => [e.motorista.toUpperCase(), e.vinculo]));
      const ehServidor = (nome: string) => (vinculoDoDia.get(nome.toUpperCase()) || motoristaDoNome.get(nome.toUpperCase())?.vinculo || '') !== 'Terceirizado';
      const externas = carros
        .filter((c) => c.externa && ehServidor(c.motorista))
        .flatMap((c) => [
          { motorista: c.motorista, hora: c.hora, destino: c.destino, placa: c.placa, tipo: c.tipo },
          ...(c.motorista2 ? [{ motorista: c.motorista2, hora: c.hora, destino: c.destino, placa: c.placa, tipo: c.tipo, revezamento: true }] : []),
        ])
        .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
      const nosCarros = new Set(externas.map((e) => e.motorista.toUpperCase()));
      const internas = !ehUtil
        ? []
        : escalaDoDia
            .filter((e) => e.vinculo === 'Servidor' && e.condicao === 'Disponível' && !nosCarros.has(e.motorista.toUpperCase()))
            .map((e) => ({ motorista: e.motorista, atividade: 'Em Remoção Interna' }));
      const ultima = internas.at(-1);
      if (ultima) ultima.atividade = 'Consultório de Rua';
      const penultima = internas.length > 1 ? internas.at(-2) : undefined;
      if (penultima) penultima.atividade = 'Recomeçar';
      let observacoes: { tipo: string; nome: string; placa: string; origem: string; motivo: string; observacao: string; carroParadoJunto?: boolean }[] = [
        ...escalaDoDia
          .filter((e) => e.condicao === 'Ausente')
          .map((e) => {
            const m = motoristaDoNome.get(e.motorista.toUpperCase());
            return { tipo: 'motorista', nome: e.motorista, origem: 'dia', placa: m?.vinculo === 'Terceirizado' ? m.placaVinculada : '', motivo: e.motivoAusencia, observacao: e.observacao };
          }),
        ...frota
          .filter((f) => f.data === data && f.condicao === 'Indisponível')
          .map((f) => ({ tipo: 'veiculo', nome: f.placa, placa: f.placa, origem: 'dia', motivo: f.motivo, observacao: f.observacao })),
      ];
      const jaTem = new Set(observacoes.map((o) => `${o.tipo}|${o.nome.toUpperCase()}`));
      observacoes.push(...foraGlobal.filter((o) => !jaTem.has(`${o.tipo}|${o.nome.toUpperCase()}`)));
      // O carro do terceirizado parado junto com ele aparece numa linha só.
      const placaDeMotoristaFora = new Set(observacoes.filter((o) => o.tipo === 'motorista' && o.placa).map((o) => `${o.placa.toUpperCase()}|${o.origem}`));
      const fundidas = new Set<string>();
      observacoes = observacoes.filter((o) => {
        if (o.tipo !== 'veiculo' || !o.placa || !placaDeMotoristaFora.has(`${o.placa.toUpperCase()}|${o.origem}`)) return true;
        fundidas.add(`${o.placa.toUpperCase()}|${o.origem}`);
        return false;
      });
      for (const o of observacoes) if (o.tipo === 'motorista' && o.placa) o.carroParadoJunto = fundidas.has(`${o.placa.toUpperCase()}|${o.origem}`);
      observacoes.sort((a, b) => {
        if (a.origem !== b.origem) return a.origem === 'dia' ? -1 : 1;
        if (a.tipo !== b.tipo) return a.tipo === 'motorista' ? -1 : 1;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
      const terceirizados = escalaDoDia
        .filter((e) => e.vinculo === 'Terceirizado' && e.condicao === 'Disponível')
        .map((e) => {
          const carro = carros.find((c) => c.motorista.toUpperCase() === e.motorista.toUpperCase());
          if (carro?.externa) return { motorista: e.motorista, hora: carro.hora, destino: carro.destino, placa: carro.placa, tipo: carro.tipo, interno: false };
          const placa = carro?.placa || motoristaDoNome.get(e.motorista.toUpperCase())?.placaVinculada || '';
          return { motorista: e.motorista, hora: '', destino: '', interno: ehUtil, placa, tipo: carro?.tipo || veiculoDaPlaca.get(placa.toUpperCase())?.tipo || '' };
        })
        .sort((a, b) => (ordemDoCadastro.get(a.motorista.toUpperCase()) ?? 1e9) - (ordemDoCadastro.get(b.motorista.toUpperCase()) ?? 1e9) || a.motorista.localeCompare(b.motorista));
      return {
        data: isoParaBR(data),
        diaSemana: DIAS_DA_SEMANA[semana],
        temEscala: escalaDoDia.length > 0,
        externas,
        internas,
        observacoes,
        terceirizados,
        tipoDia,
        descricaoDia: infoCal?.descricao ?? '',
        ehUtil,
        lacenPendente: !!lacen && !externas.some((e) => e.placa.toUpperCase() === lacen.placa.toUpperCase()),
        lacenPlaca: lacen?.placa ?? '',
      };
    });
    const veiculosInfo = Object.fromEntries(veiculos.map((v) => [v.placa.toUpperCase(), { tipo: v.tipo, cor: v.corDeFundo }]));
    return { dias, veiculos: veiculosInfo };
  }
}
