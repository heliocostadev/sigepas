import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { BancoDeDadosService } from '../banco-de-dados/banco-de-dados.service';
import { VARIAVEIS_DE_AMBIENTE, type VariaveisDeAmbiente } from '../configuracao/variaveis-de-ambiente';
import { chaveDoLocal } from '../regras/regras-do-setor';
import { LOCAIS_DE_EMBARQUE_FICTICIOS, MOTORISTAS_FICTICIOS, PADRONIZACOES_FICTICIAS, VEICULOS_FICTICIOS } from './dados-ficticios';

// Na subida da API: cria o gestor inicial, se ainda não existir, e semeia os cadastros fictícios, se pedido e se o
// cadastro estiver vazio. Nada é sobrescrito: rodar de novo não muda o que já existe.
@Injectable()
export class PrepararDadosIniciaisService implements OnApplicationBootstrap {
  private readonly registro = new Logger('DadosIniciais');

  constructor(
    private readonly banco: BancoDeDadosService,
    @Inject(VARIAVEIS_DE_AMBIENTE) private readonly variaveis: VariaveisDeAmbiente,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.preparar();
    } catch (erro) {
      // Banco fora do ar não derruba a API: a rota /saude mostra o problema.
      this.registro.error(`Não foi possível preparar os dados iniciais: ${(erro as Error).message}`);
    }
  }

  async preparar(): Promise<{ gestorCriado: boolean; cadastrosSemeados: boolean }> {
    const cliente = this.banco.cliente;
    let gestorCriado = false;
    let cadastrosSemeados = false;
    const gestor = this.variaveis.gestorInicial;
    if (gestor && !(await cliente.conta.findUnique({ where: { email: gestor.email } }))) {
      await cliente.conta.create({ data: { email: gestor.email, nome: gestor.nome, papel: 'GESTOR', hashDaSenha: gestor.hashDaSenha } });
      gestorCriado = true;
    }
    if (this.variaveis.semearDadosFicticios && (await cliente.veiculo.count()) === 0 && (await cliente.motorista.count()) === 0) {
      await cliente.$transaction([
        cliente.veiculo.createMany({ data: VEICULOS_FICTICIOS }),
        cliente.motorista.createMany({ data: MOTORISTAS_FICTICIOS.map((m, i) => ({ ...m, ordem: i + 1 })) }),
        cliente.localDeEmbarque.createMany({ data: LOCAIS_DE_EMBARQUE_FICTICIOS.map((l, i) => ({ ...l, ordem: i + 1 })), skipDuplicates: true }),
        cliente.padronizacaoDeLocal.createMany({
          data: PADRONIZACOES_FICTICIAS.map((p) => ({
            chave: chaveDoLocal(p.cidade, p.local),
            cidadeOriginal: p.cidade,
            localOriginal: p.local,
            cidadePadrao: p.cidade,
            localPadrao: p.local,
            decididoPor: 'Dados fictícios',
            origem: 'manual',
          })),
          skipDuplicates: true,
        }),
      ]);
      cadastrosSemeados = true;
    }
    if (gestorCriado) this.registro.log('Gestor inicial criado.');
    if (cadastrosSemeados) this.registro.log('Cadastros fictícios criados.');
    return { gestorCriado, cadastrosSemeados };
  }
}
