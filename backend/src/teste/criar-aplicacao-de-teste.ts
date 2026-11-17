// Monta a aplicação inteira para os testes com o Supertest. As variáveis de ambiente são fictícias. Quando o teste
// pede, o acesso ao banco é trocado por um falso, para o teste não depender de um PostgreSQL rodando.
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { configurarAplicacao } from '../aplicacao';
import { AppModule } from '../app.module';
import { BancoDeDadosService } from '../banco-de-dados/banco-de-dados.service';
import { VARIAVEIS_DE_AMBIENTE, type VariaveisDeAmbiente } from '../configuracao/variaveis-de-ambiente';

export const VARIAVEIS_FICTICIAS: VariaveisDeAmbiente = {
  porta: 3000,
  portaDasMetricas: 9464,
  enderecoDoBanco: 'postgresql://sigepas@127.0.0.1:1/banco-que-nao-existe',
  origensPermitidas: ['http://localhost:5173'],
  limiteDeRequisicoesPorMinuto: 100,
  nivelDeLog: 'silent',
};

export async function criarAplicacaoDeTeste(opcoes: {
  bancoDisponivel?: boolean;
  variaveis?: Partial<VariaveisDeAmbiente>;
}): Promise<INestApplication> {
  const variaveis = { ...VARIAVEIS_FICTICIAS, ...opcoes.variaveis };
  let construtor = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(VARIAVEIS_DE_AMBIENTE)
    .useValue(variaveis);
  if (opcoes.bancoDisponivel !== undefined) {
    const disponivel = opcoes.bancoDisponivel;
    construtor = construtor
      .overrideProvider(BancoDeDadosService)
      .useValue({ estaDisponivel: async () => disponivel, onModuleDestroy: async () => undefined });
  }
  const modulo = await construtor.compile();
  const aplicacao = modulo.createNestApplication({ logger: false });
  configurarAplicacao(aplicacao, variaveis);
  await aplicacao.init();
  return aplicacao;
}
