import { gerarSenhaForte, lerPedidoDeConta } from '../comandos/criar-conta';
import { criarAplicacaoComBanco, ENDERECO_DO_BANCO_DE_TESTE } from '../teste/aplicacao-com-banco';
import { PrepararDadosIniciaisService } from './preparar-dados-iniciais.service';

describe('comando criar-conta', () => {
  it('lê e-mail, nome e papel e recusa o que está errado', () => {
    expect(lerPedidoDeConta(['--email', 'Pessoa@Exemplo.org', '--nome', 'Pessoa', '--papel', 'gestor'])).toEqual({
      email: 'pessoa@exemplo.org', nome: 'Pessoa', papel: 'GESTOR', soHash: false,
    });
    expect(lerPedidoDeConta(['--email', 'a@b.org']).papel).toBe('OPERADOR');
    expect(lerPedidoDeConta(['--so-hash']).soHash).toBe(true);
    expect(() => lerPedidoDeConta(['--email', 'sem-arroba'])).toThrow('e-mail');
    expect(() => lerPedidoDeConta(['--email', 'a@b.org', '--papel', 'chefe'])).toThrow('gestor ou operador');
  });

  it('gera senha forte, diferente a cada vez', () => {
    const senha = gerarSenhaForte();
    expect(senha.length).toBeGreaterThanOrEqual(24);
    expect(gerarSenhaForte()).not.toBe(senha);
  });
});

describe.skipIf(!ENDERECO_DO_BANCO_DE_TESTE)('dados iniciais na subida da API', () => {
  it('cria o gestor inicial e os cadastros fictícios uma vez só', async () => {
    const c = await criarAplicacaoComBanco({ semearDadosFicticios: true });
    const servico = c.aplicacao.get(PrepararDadosIniciaisService);
    Object.assign(servico as unknown as { variaveis: object }, {
      variaveis: { semearDadosFicticios: true, gestorInicial: { email: 'novo-gestor@teste.sigepas', nome: 'Novo Gestor', hashDaSenha: 'scrypt$1$8$1$YQ==$YQ==' } },
    });
    expect(await servico.preparar()).toEqual({ gestorCriado: true, cadastrosSemeados: true });
    expect(await servico.preparar()).toEqual({ gestorCriado: false, cadastrosSemeados: false });
    expect(await c.banco.cliente.veiculo.count()).toBe(8);
    await c.aplicacao.close();
  });

  it('não derruba a API quando o banco falha na subida', async () => {
    const servico = new PrepararDadosIniciaisService(
      { cliente: { conta: { findUnique: () => Promise.reject(new Error('fora do ar')) } } } as never,
      { gestorInicial: { email: 'a@b.c', nome: 'A', hashDaSenha: 'scrypt$' }, semearDadosFicticios: false } as never,
    );
    await expect(servico.onApplicationBootstrap()).resolves.toBeUndefined();
  });
});
