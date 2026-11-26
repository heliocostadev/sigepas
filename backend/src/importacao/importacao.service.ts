import { BadRequestException, Injectable } from '@nestjs/common';
import { BancoDeDadosService } from '../banco-de-dados/banco-de-dados.service';
import type { Prisma } from '../gerado/prisma/client';
import {
  chaveDoLocal,
  chaveDoPedido,
  dataParaISO,
  escolherSeparador,
  lerCsv,
  normalizarHora,
  normalizarTexto,
  similaridade,
} from '../regras/regras-do-setor';
import { EventosService } from '../tempo-real/eventos.service';

// Fluxo 1: do arquivo do OLOSTECH à fila do dia. Traz processarCSVUpload, getLocaisPendentes, getSugestoesLocais,
// getPadroesLocais e salvarDecisoesLocais do sistema atual. A diferença principal: a tabela de pedidos não é apagada a
// cada importação. Cada pedido é gravado pela chave, então reimportar o mesmo arquivo não duplica nada.

// Teto do arquivo: o do setor tem algumas centenas de linhas. 5 mil linhas sobram e impedem um arquivo gigante.
export const MAXIMO_DE_LINHAS = 5000;
// Semelhança mínima para sugerir um local já padronizado (LIMIAR_FUZZY_LOCAIS do sistema atual).
const SEMELHANCA_MINIMA = 0.8;

// Posição de cada coluna no arquivo do OLOSTECH (as 27 colunas descritas em ESTRUTURA_DE_DADOS.md).
const COLUNA = {
  data: 0, cidade: 1, hora: 2, local: 3, tipoVeiculo: 4, restricoes: 5, objetivo: 6, bairro: 7,
  enderecoResidencial: 8, quantidade: 9, tipoAtendimento: 10, matricula: 11, nome: 12, trecho: 13, nascimento: 14,
  faixaEtaria: 15, logradouro: 16, numero: 17, telefone1: 18, telefone2: 19, telefone3: 20, acompanhante: 21,
  trechoAcompanhante: 22, telefoneAcomp1: 23, telefoneAcomp2: 24, telefoneAcomp3: 25,
} as const;

export interface ResultadoDaImportacao {
  status: string;
  totalLinhas: number;
  corrigidas: number;
  canceladas: number;
  pendencias: { cidade: string; local: string; ocorrencias: number }[];
  avisoHeader: string;
}

interface Padronizacao {
  cidadePadrao: string;
  localPadrao: string;
}

function campo(linha: string[], indice: number): string {
  return (linha[indice] ?? '').trim();
}

function telefones(...valores: string[]): string[] {
  return valores.map((valor) => valor.trim()).filter(Boolean);
}

@Injectable()
export class ImportacaoService {
  constructor(
    private readonly banco: BancoDeDadosService,
    private readonly eventos: EventosService,
  ) {}

  private async carregarDicionario(): Promise<Map<string, Padronizacao>> {
    const linhas = await this.banco.cliente.padronizacaoDeLocal.findMany();
    return new Map(linhas.map((linha) => [linha.chave, { cidadePadrao: linha.cidadePadrao, localPadrao: linha.localPadrao }]));
  }

  async importar(conteudo: unknown, operador: string): Promise<ResultadoDaImportacao> {
    if (typeof conteudo !== 'string' || conteudo.trim() === '') {
      throw new BadRequestException('O arquivo CSV parece estar vazio ou inválido.');
    }
    const linhas = lerCsv(conteudo, escolherSeparador(conteudo));
    if (linhas.length < 2) throw new BadRequestException('O arquivo CSV parece estar vazio ou inválido.');
    if (linhas.length - 1 > MAXIMO_DE_LINHAS) {
      throw new BadRequestException(`O arquivo tem mais de ${MAXIMO_DE_LINHAS} linhas. Exporte um período menor.`);
    }
    const cabecalho = linhas[0] ?? [];
    const cabecalhoNoPadrao =
      normalizarTexto(cabecalho[COLUNA.cidade]).includes('CIDADE') && normalizarTexto(cabecalho[COLUNA.local]).includes('LOCAL');
    // A coluna do status é procurada pelo cabeçalho, porque a posição dela pode mudar (_idxStatusPedido).
    const colunaDoStatus = cabecalho.findIndex((titulo) => normalizarTexto(titulo).includes('STATUS'));
    const dicionario = await this.carregarDicionario();

    const pedidos: Prisma.PedidoCreateManyInput[] = [];
    const ocorrencias = new Map<string, number>();
    const pendencias = new Map<string, { cidade: string; local: string; ocorrencias: number }>();
    let corrigidas = 0;
    let canceladas = 0;

    linhas.slice(1).forEach((linha, posicao) => {
      const data = dataParaISO(campo(linha, COLUNA.data));
      if (!data) return;
      const cancelado = colunaDoStatus >= 0 && normalizarTexto(linha[colunaDoStatus]).includes('CANCELADO');
      if (cancelado) canceladas += 1;
      const cidadeOriginal = campo(linha, COLUNA.cidade);
      const localOriginal = campo(linha, COLUNA.local);
      let cidade = cidadeOriginal;
      let localDestino = localOriginal;
      if (cabecalhoNoPadrao && (cidadeOriginal || localOriginal)) {
        const chaveDoLocalNoArquivo = chaveDoLocal(cidadeOriginal, localOriginal);
        const padrao = dicionario.get(chaveDoLocalNoArquivo);
        if (padrao) {
          if (padrao.cidadePadrao !== cidade || padrao.localPadrao !== localDestino) corrigidas += 1;
          cidade = padrao.cidadePadrao;
          localDestino = padrao.localPadrao;
        } else if (!cancelado) {
          const pendencia = pendencias.get(chaveDoLocalNoArquivo) ?? { cidade: cidadeOriginal, local: localOriginal, ocorrencias: 0 };
          pendencia.ocorrencias += 1;
          pendencias.set(chaveDoLocalNoArquivo, pendencia);
        }
      }
      const quantidadeNoArquivo = Number.parseInt(campo(linha, COLUNA.quantidade), 10);
      const compromisso = {
        data,
        cidade: cidadeOriginal,
        hora: normalizarHora(campo(linha, COLUNA.hora)),
        localDestino: localOriginal,
        objetivo: campo(linha, COLUNA.objetivo),
        matricula: campo(linha, COLUNA.matricula),
        nomePaciente: campo(linha, COLUNA.nome),
        quantidadePessoas: campo(linha, COLUNA.quantidade),
      };
      const semOcorrencia = chaveDoPedido(compromisso);
      const ocorrencia = (ocorrencias.get(semOcorrencia) ?? 0) + 1;
      ocorrencias.set(semOcorrencia, ocorrencia);
      const nascimento = dataParaISO(campo(linha, COLUNA.nascimento));
      pedidos.push({
        chave: chaveDoPedido(compromisso, ocorrencia),
        data,
        cidadeOriginal,
        localOriginal,
        cidade,
        hora: compromisso.hora,
        localDestino,
        tipoVeiculo: campo(linha, COLUNA.tipoVeiculo),
        restricoes: campo(linha, COLUNA.restricoes),
        objetivo: compromisso.objetivo,
        bairro: campo(linha, COLUNA.bairro),
        // A coluna se chama "Local embarque", mas guarda o endereço de casa (ESTRUTURA_DE_DADOS.md, coluna 9).
        enderecoResidencial: campo(linha, COLUNA.enderecoResidencial),
        quantidadePessoas: Number.isSafeInteger(quantidadeNoArquivo) && quantidadeNoArquivo > 0 ? quantidadeNoArquivo : 1,
        tipoAtendimento: campo(linha, COLUNA.tipoAtendimento),
        matricula: compromisso.matricula,
        nomePaciente: compromisso.nomePaciente,
        trecho: campo(linha, COLUNA.trecho),
        dataNascimento: nascimento || campo(linha, COLUNA.nascimento),
        faixaEtaria: campo(linha, COLUNA.faixaEtaria),
        logradouro: campo(linha, COLUNA.logradouro),
        numero: campo(linha, COLUNA.numero),
        telefones: telefones(campo(linha, COLUNA.telefone1), campo(linha, COLUNA.telefone2), campo(linha, COLUNA.telefone3)),
        acompanhante: campo(linha, COLUNA.acompanhante),
        trechoAcompanhante: campo(linha, COLUNA.trechoAcompanhante),
        telefonesAcompanhante: telefones(
          campo(linha, COLUNA.telefoneAcomp1),
          campo(linha, COLUNA.telefoneAcomp2),
          campo(linha, COLUNA.telefoneAcomp3),
        ),
        canceladoNaOrigem: cancelado,
        ordemNaImportacao: posicao,
      });
    });

    const datas = [...new Set(pedidos.map((pedido) => pedido.data))];
    const chaves = pedidos.map((pedido) => pedido.chave);
    await this.banco.cliente.$transaction(async (transacao) => {
      // O pedido do OLOSTECH que sumiu do arquivo sai da fila daquele dia. O digitado à mão fica.
      await transacao.pedido.deleteMany({ where: { data: { in: datas }, digitadoAMao: false, chave: { notIn: chaves } } });
      for (const pedido of pedidos) {
        const { chave, ...dados } = pedido;
        await transacao.pedido.upsert({ where: { chave }, create: pedido, update: dados });
      }
      await transacao.importacao.create({ data: { operador, linhas: pedidos.length, canceladas, corrigidas, datas } });
    });
    this.eventos.avisar('operacao', datas);

    return {
      status: 'Sucesso',
      totalLinhas: pedidos.length,
      corrigidas,
      canceladas,
      pendencias: [...pendencias.values()],
      avisoHeader: cabecalhoNoPadrao ? '' : 'Cabeçalho do CSV fora do padrão: a padronização de locais foi pulada.',
    };
  }

  // getLocaisPendentes: duplas cidade e local dos pedidos ativos que o dicionário ainda não conhece.
  async locaisPendentes(): Promise<{ cidade: string; local: string; ocorrencias: number }[]> {
    const dicionario = await this.carregarDicionario();
    const pedidos = await this.banco.cliente.pedido.findMany({
      where: { canceladoNaOrigem: false, digitadoAMao: false },
      select: { cidadeOriginal: true, localOriginal: true },
    });
    const pendencias = new Map<string, { cidade: string; local: string; ocorrencias: number }>();
    for (const pedido of pedidos) {
      if (!pedido.cidadeOriginal && !pedido.localOriginal) continue;
      const chave = chaveDoLocal(pedido.cidadeOriginal, pedido.localOriginal);
      if (dicionario.has(chave)) continue;
      const pendencia = pendencias.get(chave) ?? { cidade: pedido.cidadeOriginal, local: pedido.localOriginal, ocorrencias: 0 };
      pendencia.ocorrencias += 1;
      pendencias.set(chave, pendencia);
    }
    return [...pendencias.values()];
  }

  // getSugestoesLocais: para cada local desconhecido, o local já padronizado mais parecido DA MESMA CIDADE. Nenhuma
  // sugestão muda a cidade (regra dura de 25/09/2026). A consulta ao Google Maps do sistema atual não foi trazida.
  async sugestoes(pendencias: unknown): Promise<object[]> {
    const lista = Array.isArray(pendencias) ? pendencias.slice(0, 500) : [];
    const dicionario = await this.carregarDicionario();
    const porCidade = new Map<string, { cidade: string; local: string }[]>();
    const vistos = new Set<string>();
    for (const padrao of dicionario.values()) {
      const chave = chaveDoLocal(padrao.cidadePadrao, padrao.localPadrao);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const cidade = normalizarTexto(padrao.cidadePadrao);
      porCidade.set(cidade, [...(porCidade.get(cidade) ?? []), { cidade: padrao.cidadePadrao, local: padrao.localPadrao }]);
    }
    return lista.map((pendencia: { cidade?: unknown; local?: unknown }) => {
      const cidade = typeof pendencia?.cidade === 'string' ? pendencia.cidade.trim() : '';
      const local = typeof pendencia?.local === 'string' ? pendencia.local.trim() : '';
      const item = { cidade, local, sugestaoCidade: '', sugestaoLocal: '', fonte: 'nenhuma', similaridade: 0, cidadeGoogle: '', erroGeo: '' };
      const candidatos = porCidade.get(normalizarTexto(cidade)) ?? [];
      if (normalizarTexto(local).length < 4) return item;
      let melhor: { local: string } | undefined;
      let melhorNota = 0;
      for (const candidato of candidatos) {
        const nota = similaridade(local, candidato.local);
        if (nota > melhorNota) {
          melhorNota = nota;
          melhor = candidato;
        }
      }
      if (melhor && melhorNota >= SEMELHANCA_MINIMA) {
        Object.assign(item, { fonte: 'dicionario', similaridade: melhorNota, sugestaoCidade: cidade, sugestaoLocal: melhor.local });
      }
      return item;
    });
  }

  // getPadroesLocais: cidades e pares já padronizados, para o autocompletar da janela de padronização.
  async padroes(): Promise<{ cidades: string[]; pares: { cidade: string; local: string }[] }> {
    const dicionario = await this.carregarDicionario();
    const cidades = new Map<string, string>();
    const pares = new Map<string, { cidade: string; local: string }>();
    for (const { cidadePadrao, localPadrao } of dicionario.values()) {
      if (cidadePadrao && !cidades.has(cidadePadrao.toUpperCase())) cidades.set(cidadePadrao.toUpperCase(), cidadePadrao);
      const chave = `${cidadePadrao}||${localPadrao}`.toUpperCase();
      if (localPadrao && !pares.has(chave)) pares.set(chave, { cidade: cidadePadrao, local: localPadrao });
    }
    return {
      cidades: [...cidades.values()].sort((a, b) => a.localeCompare(b)),
      pares: [...pares.values()].sort((a, b) => a.local.localeCompare(b.local)),
    };
  }

  // salvarDecisoesLocais: grava as decisões no dicionário e reaplica o dicionário em todos os pedidos.
  async salvarDecisoes(decisoes: unknown, operador: string): Promise<{ status: string; linhasCorrigidas: number; pendentesRestantes: number }> {
    const lista = Array.isArray(decisoes) ? decisoes.slice(0, 1000) : [];
    for (const decisao of lista as Record<string, unknown>[]) {
      const texto = (valor: unknown) => (typeof valor === 'string' ? valor.trim().slice(0, 300) : '');
      const cidadeOriginal = texto(decisao?.['cidadeOriginal']);
      const localOriginal = texto(decisao?.['localOriginal']);
      if (!cidadeOriginal && !localOriginal) continue;
      const dados = {
        cidadeOriginal,
        localOriginal,
        cidadePadrao: texto(decisao['cidadePadrao']) || cidadeOriginal,
        localPadrao: texto(decisao['localPadrao']) || localOriginal,
        decididoPor: operador,
        decididoEm: new Date(),
        origem: texto(decisao['origem']) || 'manual',
      };
      const chave = chaveDoLocal(cidadeOriginal, localOriginal);
      await this.banco.cliente.padronizacaoDeLocal.upsert({ where: { chave }, create: { chave, ...dados }, update: dados });
    }
    const linhasCorrigidas = await this.reaplicarDicionario();
    return { status: 'Sucesso', linhasCorrigidas, pendentesRestantes: (await this.locaisPendentes()).length };
  }

  // _reaplicarDicionarioNoBdViagens: corrige cidade e local de todos os pedidos importados pelo dicionário atual.
  async reaplicarDicionario(): Promise<number> {
    const dicionario = await this.carregarDicionario();
    const pedidos = await this.banco.cliente.pedido.findMany({
      where: { digitadoAMao: false },
      select: { id: true, data: true, cidade: true, localDestino: true, cidadeOriginal: true, localOriginal: true },
    });
    let corrigidas = 0;
    const datas = new Set<string>();
    for (const pedido of pedidos) {
      const padrao = dicionario.get(chaveDoLocal(pedido.cidadeOriginal, pedido.localOriginal));
      const cidade = padrao?.cidadePadrao ?? pedido.cidadeOriginal;
      const localDestino = padrao?.localPadrao ?? pedido.localOriginal;
      if (cidade === pedido.cidade && localDestino === pedido.localDestino) continue;
      await this.banco.cliente.pedido.update({ where: { id: pedido.id }, data: { cidade, localDestino } });
      corrigidas += 1;
      datas.add(pedido.data);
    }
    this.eventos.avisar('padronizacao', []);
    if (datas.size) this.eventos.avisar('operacao', [...datas]);
    return corrigidas;
  }
}
