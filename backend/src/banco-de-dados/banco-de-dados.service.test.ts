import { VARIAVEIS_FICTICIAS } from '../teste/criar-aplicacao-de-teste';
import { BancoDeDadosService } from './banco-de-dados.service';

const ENDERECO_DO_BANCO_DE_TESTE = process.env['DATABASE_URL_DE_TESTE'];

describe('BancoDeDadosService', () => {
  it('informa que o banco está indisponível quando a conexão falha, sem derrubar a aplicação', async () => {
    const banco = new BancoDeDadosService(VARIAVEIS_FICTICIAS);
    expect(await banco.estaDisponivel()).toBe(false);
    await banco.onModuleDestroy();
  });

  // Roda só onde existe um PostgreSQL de teste: no CI, com o serviço do GitHub Actions, ou na máquina com o Docker.
  it.skipIf(!ENDERECO_DO_BANCO_DE_TESTE)('informa que o banco está disponível quando ele responde', async () => {
    const banco = new BancoDeDadosService({ ...VARIAVEIS_FICTICIAS, enderecoDoBanco: ENDERECO_DO_BANCO_DE_TESTE ?? '' });
    expect(await banco.estaDisponivel()).toBe(true);
    await banco.onModuleDestroy();
  });
});
