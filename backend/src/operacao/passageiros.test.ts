import { descreverPassageiro, ehOMesmoPassageiro, identificarPassageiro, servidorDaLinha } from './passageiros';

const paciente = { id: 7, matricula: '900001', nome: 'Ana Fictícia', chaveDoPedido: 'D-1' };
const servidor = { id: 8, matricula: '-', nome: '-', chaveDoPedido: 'D-2' };

describe('identidade do passageiro (_idPassageiro do sistema atual)', () => {
  it('usa a matrícula, depois o nome, depois a chave do pedido e por fim a linha', () => {
    expect(identificarPassageiro(paciente)).toBe('900001');
    expect(identificarPassageiro({ ...paciente, matricula: '' })).toBe('ANA FICTÍCIA');
    expect(identificarPassageiro(servidor)).toBe('#D-2');
    expect(identificarPassageiro({ ...servidor, chaveDoPedido: '' })).toBe('@8');
  });

  it('reconhece o passageiro pelo identificador e não confunde dois servidores', () => {
    expect(ehOMesmoPassageiro(paciente, '900001')).toBe(true);
    expect(ehOMesmoPassageiro(paciente, 900001)).toBe(true);
    expect(ehOMesmoPassageiro(servidor, '#d-2')).toBe(true);
    expect(ehOMesmoPassageiro(servidor, '-')).toBe(false);
    expect(ehOMesmoPassageiro({ ...paciente, matricula: '' }, '')).toBe(true);
    expect(ehOMesmoPassageiro(paciente, null)).toBe(false);
  });

  it('descreve paciente e servidor para as mensagens', () => {
    expect(descreverPassageiro('900001', 'Ana')).toBe('Ana (mat. 900001)');
    expect(descreverPassageiro('', '')).toBe('Servidor');
    expect(descreverPassageiro('-', '-', 'João', '123')).toBe('Servidor João (mat. 123)');
    expect(descreverPassageiro('123', '-')).toBe('(sem nome) (mat. 123)');
  });

  it('guarda nome e matrícula do servidor só em linha de servidor', () => {
    expect(servidorDaLinha({ nome: '-', matricula: '-', servidorNome: 'João', servidorMatricula: '123' })).toEqual(['João', '123']);
    expect(servidorDaLinha({ nome: '-', matricula: '-', servidorNome: '-', servidorMatricula: 5 })).toEqual(['', '']);
    expect(servidorDaLinha({ nome: 'Ana', matricula: '1', servidorNome: 'João' })).toEqual(['', '']);
  });
});
