import { deveFicarForaDoLog, formatarRequisicaoParaLog, formatarRespostaParaLog } from './formatadores-de-log';

describe('formatarRequisicaoParaLog', () => {
  it('grava só o identificador, o método e o caminho, sem a query string', () => {
    const linha = formatarRequisicaoParaLog({
      id: 7,
      method: 'GET',
      url: '/pedidos?nome=Fulano&telefone=47999990000',
      headers: { authorization: 'Bearer FICTICIO', 'x-api-key': 'FICTICIO', cookie: 'sessao=FICTICIA' },
      remoteAddress: '10.0.0.5',
    });
    expect(linha).toEqual({ id: 7, metodo: 'GET', caminho: '/pedidos' });
  });

  it('não grava nenhum cabeçalho nem o endereço do cliente, que é dado pessoal pela LGPD', () => {
    const texto = JSON.stringify(
      formatarRequisicaoParaLog({ id: 1, method: 'POST', url: '/x', headers: { 'proxy-authorization': 'Basic Z' } }),
    );
    expect(texto).not.toMatch(/authorization|Basic|remoteAddress|headers/i);
  });

  it('aceita requisição sem endereço, sem quebrar o log', () => {
    expect(formatarRequisicaoParaLog({ id: 2, method: 'GET' })).toEqual({ id: 2, metodo: 'GET', caminho: '' });
  });
});

describe('formatarRespostaParaLog', () => {
  it('grava só o código de resposta', () => {
    expect(formatarRespostaParaLog({ statusCode: 503, headers: { 'set-cookie': 'sessao=FICTICIA' } })).toEqual({
      status: 503,
    });
  });
});

describe('deveFicarForaDoLog', () => {
  it.each(['/saude', '/saude?origem=monitor'])('não gera linha de log para %s', (endereco) => {
    expect(deveFicarForaDoLog(endereco)).toBe(true);
  });

  it.each(['/pedidos', '/metrics'])('gera linha de log para %s, porque a API não serve métricas na porta pública', (endereco) => {
    expect(deveFicarForaDoLog(endereco)).toBe(false);
  });
});
