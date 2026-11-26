// Tela Escala para Enviar (fluxo 2): a folha do dia que vai em imagem para o grupo dos motoristas.
import { apiFalha, apiFalsa, carregarTelas, chamadasA, clicar, esperar, limparChamadas, tela, texto } from './preparar-telas';

const DIA = {
  data: '27/11/2026',
  diaSemana: 'Sexta-feira',
  temEscala: true,
  ehUtil: true,
  tipoDia: 'Dia útil',
  descricaoDia: '',
  externas: [
    { motorista: 'ANTÔNIO FICTÍCIO DA SILVA', hora: '04:30', destino: 'ITAJAÍ › FLORIANÓPOLIS', placa: 'TST1A01', tipo: 'SPIN' },
    { motorista: 'BEATRIZ EXEMPLO SOUZA', hora: '04:30', destino: 'ITAJAÍ › FLORIANÓPOLIS', placa: 'TST1A01', tipo: 'SPIN', revezamento: true },
    { motorista: '', hora: '06:00', destino: 'CURITIBA', placa: 'TST9Z99', tipo: '' },
  ],
  internas: [
    { motorista: 'CARLOS TESTE PEREIRA', atividade: 'Em Remoção Interna', obs: 'Plantão até 19h' },
    { motorista: 'DANIELA DEMONSTRAÇÃO LIMA', atividade: 'Consultório de Rua' },
  ],
  observacoes: [
    { tipo: 'motorista', nome: 'FERNANDA AMOSTRA ROCHA', motivo: 'Férias', observacao: 'volta dia 10' },
    { tipo: 'veiculo', nome: 'TST1A05', motivo: '', observacao: '' },
  ],
  terceirizados: [
    { motorista: 'GUSTAVO TERCEIRO ALVES', hora: '06:00', destino: 'CURITIBA', placa: 'TST2B01', tipo: 'SPIN', interno: false },
    { motorista: 'HELENA CONTRATO RIBEIRO', hora: '', destino: '', placa: '', tipo: '', interno: true },
  ],
};
const VEICULOS = { TST1A01: { tipo: 'SPIN', cor: '#dbeafe' }, TST2B01: { tipo: 'SPIN', cor: 'abc' }, TST1A05: { tipo: 'AMBULÂNCIA', cor: 'cor-errada' } };

describe('Escala para Enviar', () => {
  beforeAll(carregarTelas);
  beforeEach(() => {
    limparChamadas();
    apiFalsa('/api/escala/escala-do-periodo', { dias: [structuredClone(DIA)], veiculos: VEICULOS });
    (document.getElementById('envData') as HTMLInputElement).value = '2026-11-27';
  });

  it('pede à API a escala de um dia só e desenha as quatro seções da folha', async () => {
    tela.iniciarEscalaEnviar();
    await esperar();
    expect(chamadasA('/api/escala/escala-do-periodo')).toEqual([['2026-11-27', '2026-11-27']]);
    expect(texto('#envDataVisual')).toBe('Sexta, 27 Nov 2026');
    const folha = texto('#envCorpo');
    expect(folha).toContain('27/11/2026 - Sexta-Feira');
    expect(folha).toContain('ANTÔNIO FICTÍCIO DA SILVA');
    expect(folha).toContain('2º motorista (volta)');
    expect(folha).toContain('Sem Motorista');
    expect(folha).toContain('Consultório de Rua');
    expect(folha).toContain('Plantão até 19h');
    expect(folha).toContain('VOLTA DIA 10');
    expect(folha).toContain('Veículo TST1A05');
    expect(folha).toContain('REMOÇÃO INTERNA');
    expect(texto('#envResumoFrotas')).toContain('7 motoristas escalados');
  });

  it('cada motivo de remoção interna vazia tem a sua frase', async () => {
    const casos: [Partial<typeof DIA>, string][] = [
      [{ ehUtil: false, tipoDia: 'Feriado', descricaoDia: 'Natal' }, 'Não há remoção interna: Feriado - Natal'],
      [{ temEscala: false }, 'Sem escala registrada para este dia.'],
      [{ internas: [] }, 'Todos os servidores escalados estão em viagem externa.'],
      [{ externas: [], observacoes: [], terceirizados: [] }, 'Nenhuma viagem externa neste dia.'],
    ];
    for (const [mudanca, frase] of casos) {
      apiFalsa('/api/escala/escala-do-periodo', { dias: [{ ...structuredClone(DIA), ...mudanca }], veiculos: {} });
      tela.envBuscar();
      await esperar();
      expect(texto('#envCorpo')).toContain(frase);
    }
    expect(texto('#envCorpo')).toContain('Nenhuma indisponibilidade registrada.');
  });

  it('sem dados mostra o aviso; erro da API mostra a mensagem', async () => {
    apiFalsa('/api/escala/escala-do-periodo', { dias: [] });
    tela.envBuscar();
    await esperar();
    expect(texto('#envCorpo')).toContain('Nenhum dado encontrado para esta data.');
    apiFalha('/api/escala/escala-do-periodo', 400, 'Intervalo muito grande.');
    tela.envBuscar();
    await esperar();
    expect(texto('#envCorpo')).toContain('Erro ao carregar');
    expect(texto('#envCorpo')).toContain('Intervalo muito grande.');
    (document.getElementById('envData') as HTMLInputElement).value = '';
    tela.envBuscar();
  });

  it('as setas andam um dia, e o botão Hoje volta para hoje', async () => {
    tela.envNavegar(1);
    expect((document.getElementById('envData') as HTMLInputElement).value).toBe('2026-11-28');
    tela.envNavegar(-2);
    expect((document.getElementById('envData') as HTMLInputElement).value).toBe('2026-11-26');
    (document.getElementById('envData') as HTMLInputElement).value = '';
    tela.envNavegar(0);
    expect((document.getElementById('envData') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    tela.envIrParaHoje();
    expect((document.getElementById('envData') as HTMLInputElement).value).toBe(tela.envHojeISO());
    await esperar();
  });

  it('o calendário próprio abre no mês da data, anda os meses e aplica o dia com um clique', async () => {
    tela.envCalLigarFechamento();
    tela.envCalAbrir();
    expect(document.getElementById('envCal')?.classList.contains('on')).toBe(true);
    expect(texto('.env-cal-mes')).toBe('novembro 2026');
    expect(document.querySelector('.env-cal-dia.sel')?.textContent).toBe('27');
    tela.envCalAndarMes(1);
    expect(texto('.env-cal-mes')).toBe('dezembro 2026');
    tela.envCalAndarMes(1);
    expect(texto('.env-cal-mes')).toBe('janeiro 2027');
    tela.envCalAndarMes(-1);
    tela.envCalAndarMes(-12);
    expect(texto('.env-cal-mes')).toBe('dezembro 2025');
    const dia = Array.from(document.querySelectorAll('.env-cal-dia')).find((b) => b.textContent === '15') as HTMLElement;
    clicar(dia);
    expect((document.getElementById('envData') as HTMLInputElement).value).toBe('2025-12-15');
    expect(document.getElementById('envCal')?.classList.contains('on')).toBe(false);
    tela.envCalAbrir();
    tela.envCalAbrir();
    expect(document.getElementById('envCal')?.classList.contains('on')).toBe(false);
    tela.envCalAbrir();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.getElementById('envCal')?.classList.contains('on')).toBe(false);
    tela.envCalAbrir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('envCal')?.classList.contains('on')).toBe(false);
    await esperar();
  });

  it('o chip do veículo usa a cor do cadastro com a tinta de melhor contraste', () => {
    tela.envVeiculos = { TST1A01: { tipo: 'SPIN', cor: '#1e3a8a' }, TST1A02: { tipo: 'SPIN', cor: '#fef3c7' } };
    expect(tela.envVeiculoHTML('TST1A01', '', false)).toContain('color:#ffffff');
    expect(tela.envVeiculoHTML('TST1A02', '', false)).toContain('color:#1e293b');
    expect(tela.envVeiculoHTML('TST1A02', 'VAN', true)).toContain('TST1A02 - VAN');
    expect(tela.envVeiculoHTML('', '', false)).toContain('—');
    expect(tela.envCorHex('fff')).toBe('#ffffff');
    expect(tela.envCorHex('xyz')).toBe('');
    expect(tela.envFormataData('')).toBe('');
    expect(tela.envFormataData('27/11')).toBe('27/11');
    expect(tela.envFormataDataOficial('')).toBe('');
    expect(tela.envFormataDataOficial('x')).toBe('x');
    expect(tela.envEsc(null)).toBe('');
  });

  it('baixa a folha em PNG pela biblioteca do próprio sistema', async () => {
    tela.iniciarEscalaEnviar();
    await esperar();
    const original = tela.html2canvas;
    tela.html2canvas = vi.fn().mockResolvedValue({ toDataURL: () => 'data:image/png;base64,AAAA' });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const botao = document.createElement('button');
    botao.textContent = 'Baixar';
    tela.envBaixarPNG({ currentTarget: botao });
    expect(botao.disabled).toBe(true);
    await esperar(200);
    expect(tela.html2canvas).toHaveBeenCalled();
    const opcoes = vi.mocked(tela.html2canvas).mock.calls[0][1];
    const copia = document.implementation.createHTMLDocument('copia');
    copia.body.innerHTML = '<div id="envSheetArea"></div>';
    opcoes.onclone(copia);
    expect((copia.getElementById('envSheetArea') as HTMLElement).style.animation).toBe('none');
    expect(clique).toHaveBeenCalled();
    expect(botao.disabled).toBe(false);

    const alerta = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    tela.html2canvas = vi.fn().mockRejectedValue(new Error('sem memória'));
    tela.envBaixarPNG({ currentTarget: botao });
    await esperar(200);
    expect(alerta).toHaveBeenCalledWith(expect.stringContaining('sem memória'));
    tela.html2canvas = vi.fn().mockResolvedValue({ toDataURL: () => { throw new Error('canvas sujo'); } });
    tela.envBaixarPNG({ currentTarget: botao });
    await esperar(200);
    expect(alerta).toHaveBeenCalledWith(expect.stringContaining('canvas sujo'));
    document.getElementById('envCorpo')!.innerHTML = '';
    tela.envBaixarPNG({ currentTarget: botao });
    expect(alerta).toHaveBeenCalledWith('Nenhum dado carregado para exportação.');
    tela.html2canvas = original;
    clique.mockRestore();
    alerta.mockRestore();
  });
});
