import { lerVariaveisDeAmbiente } from './variaveis-de-ambiente';

const ENDERECO_FICTICIO = 'postgresql://sigepas@localhost:5432/sigepas';

describe('lerVariaveisDeAmbiente', () => {
  it('usa os valores padrão quando só o endereço do banco é informado', () => {
    expect(lerVariaveisDeAmbiente({ DATABASE_URL: ENDERECO_FICTICIO })).toEqual({
      porta: 3000,
      portaDasMetricas: 9464,
      enderecoDoBanco: ENDERECO_FICTICIO,
      origensPermitidas: [],
      limiteDeRequisicoesPorMinuto: 100,
      nivelDeLog: 'info',
    });
  });

  it('recusa iniciar sem o endereço do banco e diz qual variável falta', () => {
    expect(() => lerVariaveisDeAmbiente({})).toThrow('DATABASE_URL');
  });

  it('separa as origens permitidas por vírgula e ignora espaços e itens vazios', () => {
    const variaveis = lerVariaveisDeAmbiente({
      DATABASE_URL: ENDERECO_FICTICIO,
      ORIGENS_PERMITIDAS: ' https://sigepas.exemplo.org , ,http://localhost:5173 ',
    });
    expect(variaveis.origensPermitidas).toEqual(['https://sigepas.exemplo.org', 'http://localhost:5173']);
  });

  it.each(['0', '70000', 'abc', '30.5', '1e3', '0x10', '-1'])('recusa a porta %s', (porta) => {
    expect(() => lerVariaveisDeAmbiente({ DATABASE_URL: ENDERECO_FICTICIO, PORTA: porta })).toThrow('PORTA');
  });

  it('aceita uma porta válida e um limite de requisições informado', () => {
    const variaveis = lerVariaveisDeAmbiente({
      DATABASE_URL: ENDERECO_FICTICIO,
      PORTA: '8080',
      LIMITE_DE_REQUISICOES_POR_MINUTO: '20',
    });
    expect(variaveis.porta).toBe(8080);
    expect(variaveis.limiteDeRequisicoesPorMinuto).toBe(20);
  });

  it.each(['0', '0x10', '1e2'])('recusa o limite de requisições %s', (limite) => {
    expect(() =>
      lerVariaveisDeAmbiente({ DATABASE_URL: ENDERECO_FICTICIO, LIMITE_DE_REQUISICOES_POR_MINUTO: limite }),
    ).toThrow('LIMITE_DE_REQUISICOES_POR_MINUTO');
  });

  it('recusa um limite tão grande que deixa de ser um número inteiro exato', () => {
    expect(() =>
      lerVariaveisDeAmbiente({ DATABASE_URL: ENDERECO_FICTICIO, LIMITE_DE_REQUISICOES_POR_MINUTO: '9'.repeat(400) }),
    ).toThrow('LIMITE_DE_REQUISICOES_POR_MINUTO');
  });

  it('não mostra a palavra Infinity na mensagem de um limite sem teto', () => {
    expect(() =>
      lerVariaveisDeAmbiente({ DATABASE_URL: ENDERECO_FICTICIO, LIMITE_DE_REQUISICOES_POR_MINUTO: 'abc' }),
    ).toThrow(/^(?!.*Infinity).*$/);
  });

  it('recusa a porta das métricas igual à porta da API, porque as métricas não podem sair pela porta pública', () => {
    expect(() =>
      lerVariaveisDeAmbiente({ DATABASE_URL: ENDERECO_FICTICIO, PORTA: '3000', PORTA_DAS_METRICAS: '3000' }),
    ).toThrow('PORTA_DAS_METRICAS');
  });

  it('aceita os níveis de log do pino e recusa os outros dizendo qual variável corrigir', () => {
    expect(lerVariaveisDeAmbiente({ DATABASE_URL: ENDERECO_FICTICIO, NIVEL_DE_LOG: 'warn' }).nivelDeLog).toBe('warn');
    expect(() => lerVariaveisDeAmbiente({ DATABASE_URL: ENDERECO_FICTICIO, NIVEL_DE_LOG: 'detalhado' })).toThrow(
      'NIVEL_DE_LOG',
    );
  });
});
