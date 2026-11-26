import request from 'supertest';
import {
  criarAplicacaoComBanco,
  EMAIL_DO_GESTOR,
  ENDERECO_DO_BANCO_DE_TESTE,
  SENHA_DE_TESTE,
  type AplicacaoComBanco,
} from '../teste/aplicacao-com-banco';
import { NOME_DO_COOKIE } from './cookie-da-sessao';
import { conferirSenha, gerarHashDaSenha } from './senha';
import { PRAZO_SEM_USO_EM_MILISSEGUNDOS, resumirToken } from './sessoes.service';

describe('senha com scrypt', () => {
  it('confere a senha certa, recusa a errada e recusa hash em formato estranho', async () => {
    const hash = await gerarHashDaSenha('uma-senha-bem-longa');
    expect(hash.startsWith('scrypt$131072$8$1$')).toBe(true);
    expect(await conferirSenha('uma-senha-bem-longa', hash)).toBe(true);
    expect(await conferirSenha('outra-senha-qualquer', hash)).toBe(false);
    expect(await conferirSenha('uma-senha-bem-longa', 'md5$abc')).toBe(false);
    expect(await conferirSenha('x'.repeat(200), hash)).toBe(false);
  });

  it('recusa senha curta demais ou longa demais', async () => {
    await expect(gerarHashDaSenha('curta')).rejects.toThrow('entre 12 e 128');
    await expect(gerarHashDaSenha('x'.repeat(129))).rejects.toThrow('entre 12 e 128');
  });
});

describe.skipIf(!ENDERECO_DO_BANCO_DE_TESTE)('login com sessão no servidor', () => {
  let contexto: AplicacaoComBanco;
  beforeAll(async () => {
    contexto = await criarAplicacaoComBanco();
  });
  afterAll(async () => contexto?.aplicacao.close());

  it('entra com e-mail e senha e grava o cookie HttpOnly, Secure e SameSite=Strict, sem Max-Age', async () => {
    const resposta = await request(contexto.aplicacao.getHttpServer())
      .post('/autenticacao/entrar')
      .send({ email: ` ${EMAIL_DO_GESTOR.toUpperCase()} `, senha: SENHA_DE_TESTE })
      .expect(200);
    expect(resposta.body).toEqual({ nome: 'Gestora de Teste', papel: 'GESTOR' });
    const cookie = (resposta.headers['set-cookie'] as unknown as string[])[0] ?? '';
    expect(cookie).toContain(`${NOME_DO_COOKIE}=`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).not.toMatch(/Max-Age|Expires/i);
  });

  it('recusa senha errada e conta inexistente com a mesma mensagem', async () => {
    const servidor = contexto.aplicacao.getHttpServer();
    const errada = await request(servidor).post('/autenticacao/entrar').send({ email: EMAIL_DO_GESTOR, senha: 'senha-errada-123' }).expect(401);
    const inexistente = await request(servidor).post('/autenticacao/entrar').send({ email: 'ninguem@teste.sigepas', senha: 'senha-errada-123' }).expect(401);
    expect(errada.body.message).toBe(inexistente.body.message);
  });

  it('recusa entrada sem e-mail ou com senha que não é texto', async () => {
    const servidor = contexto.aplicacao.getHttpServer();
    await request(servidor).post('/autenticacao/entrar').send({ senha: 'x' }).expect(400);
    await request(servidor).post('/autenticacao/entrar').send({ email: EMAIL_DO_GESTOR, senha: 123 }).expect(400);
  });

  it('protege as rotas: sem sessão responde 401, com sessão diz quem é', async () => {
    const servidor = contexto.aplicacao.getHttpServer();
    await request(servidor).get('/autenticacao/eu').expect(401);
    await request(servidor).get('/autenticacao/eu').set('Cookie', `${NOME_DO_COOKIE}=token-que-nao-existe-no-banco`).expect(401);
    const eu = await request(servidor).get('/autenticacao/eu').set('Cookie', contexto.operador).expect(200);
    expect(eu.body).toEqual({ email: 'operador@teste.sigepas', nome: 'Operador de Teste', papel: 'OPERADOR' });
  });

  it('recusa escrita que não vem em JSON (proteção contra CSRF)', async () => {
    await request(contexto.aplicacao.getHttpServer())
      .post('/operacao/dados-do-dia')
      .set('Cookie', contexto.operador)
      .type('form')
      .send('argumentos=1')
      .expect(403);
  });

  it('só o gestor altera cadastros', async () => {
    await contexto.chamar('/cadastros/salvar', ['veiculos', 'novo', { placa: 'TST9Z99', tipo: 'ARGO', assentos: 4 }]).expect(403);
    await contexto.chamar('/cadastros/salvar', ['veiculos', 'novo', { placa: 'TST9Z99', tipo: 'ARGO', assentos: 4 }], contexto.gestor).expect(200);
  });

  it('a sessão vence depois de 2 horas sem uso', async () => {
    const cookie = contexto.gestor;
    const token = cookie.split('=')[1] ?? '';
    await contexto.banco.cliente.sessao.update({
      where: { id: resumirToken(token) },
      data: { ultimoUsoEm: new Date(Date.now() - PRAZO_SEM_USO_EM_MILISSEGUNDOS - 1000) },
    });
    await request(contexto.aplicacao.getHttpServer()).get('/autenticacao/eu').set('Cookie', cookie).expect(401);
    expect(await contexto.banco.cliente.sessao.findUnique({ where: { id: resumirToken(token) } })).toBeNull();
  });

  it('sair apaga a sessão no banco e manda o navegador apagar o cookie', async () => {
    const servidor = contexto.aplicacao.getHttpServer();
    const resposta = await request(servidor).post('/autenticacao/sair').set('Cookie', contexto.operador).send({}).expect(204);
    expect(resposta.headers['clear-site-data']).toBe('"cookies"');
    await request(servidor).get('/autenticacao/eu').set('Cookie', contexto.operador).expect(401);
    await request(servidor).post('/autenticacao/sair').send({}).expect(204);
  });
});
