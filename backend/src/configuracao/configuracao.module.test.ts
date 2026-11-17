import { Test } from '@nestjs/testing';
import { ConfiguracaoModule } from './configuracao.module';
import { VARIAVEIS_DE_AMBIENTE, type VariaveisDeAmbiente } from './variaveis-de-ambiente';

describe('ConfiguracaoModule', () => {
  const ambienteOriginal = { ...process.env };
  afterEach(() => {
    process.env = { ...ambienteOriginal };
  });

  it('lê as variáveis do ambiente do processo na inicialização', async () => {
    process.env['DATABASE_URL'] = 'postgresql://sigepas@localhost:5432/teste-do-modulo';
    process.env['PORTA'] = '4321';
    const modulo = await Test.createTestingModule({ imports: [ConfiguracaoModule] }).compile();
    const variaveis = modulo.get<VariaveisDeAmbiente>(VARIAVEIS_DE_AMBIENTE);
    expect(variaveis.enderecoDoBanco).toBe('postgresql://sigepas@localhost:5432/teste-do-modulo');
    expect(variaveis.porta).toBe(4321);
  });

  it('impede a aplicação de subir sem o endereço do banco', async () => {
    delete process.env['DATABASE_URL'];
    await expect(Test.createTestingModule({ imports: [ConfiguracaoModule] }).compile()).rejects.toThrow(
      'DATABASE_URL',
    );
  });
});
