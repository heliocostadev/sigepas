import { apiFalha, apiFalsa, carregarTelas, chamadasA, clicar, esperar, limparChamadas, tela, texto } from './preparar-telas';
import {
  abrirDia,
  aberto,
  avisos,
  botaoComTexto,
  caixaDe,
  DATA_DO_TESTE,
  dia,
  elemento,
  estado,
  linhaDe,
  marcar,
  preencher,
  ROTA_DO_DIA,
} from './viagens-externas-ajuda';

function textosDe(seletor: string): string[] {
  return Array.from(document.querySelectorAll(seletor)).map((el) => (el.textContent ?? '').trim());
}

describe('Viagens Externas: fila do dia, filtros e busca', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('abre o dia e desenha a fila por cidade e horário, sem o pedido cancelado', async () => {
    await abrirDia();
    expect(chamadasA(ROTA_DO_DIA)).toEqual([[DATA_DO_TESTE, '']]);
    expect(textosDe('#dmCorpo .dm-cidade-row')).toEqual([
      expect.stringContaining('CURITIBA'),
      expect.stringContaining('ITAJAÍ'),
    ]);
    expect(texto('#dmCorpo')).not.toContain('ANA FICTÍCIA');
    expect(textosDe('#dmCorpo .dm-hora-chip')).toEqual(['08:00', '10:30']);
    expect(textosDe('#dmCorpo .dm-banda-turno')).toEqual(['Manhã', 'Manhã']);
    expect(texto('#dmModoFilaN')).toBe('2');
    expect(texto('#dmModoCarrosN')).toBe('3');
    expect(texto('#dmResumo')).toContain('2 pac · 3 pass');
    expect(texto('#dmResumo')).toContain('3 carro(s) · 4 pac');
    expect(texto('#dmResumo')).toContain('1 ambulância');
    expect(texto('#dmNCancel')).toBe('1');
    expect(elemento('#dmBtnCancel').classList.contains('tem')).toBe(true);
    expect(textosDe('#dmFCidade option')).toEqual(['Todas', 'BLUMENAU (1)', 'CURITIBA (2)', 'FLORIANÓPOLIS (3)', 'ITAJAÍ (2)']);
    expect(textosDe('#dmFVeic option')).toEqual(['Todos', 'Ambulância', 'Automóvel']);
    expect(elemento<HTMLButtonElement>('#dmBtnNovoPac').disabled).toBe(false);
    // O furgão do LACEN está na frota e ainda não saiu: a tela lembra da viagem fixa.
    expect(texto('#dmCorpo .dm-lacen')).toContain('TST1A06');
  });

  it('a linha mostra veículo, idade, restrição e o selo de idoso sem acompanhante', async () => {
    const dados = dia();
    dados.pacientes[0] = { ...dados.pacientes[0], observacao: 'Cadeirante', tipoSolicitado: 'Carro com Motorista' };
    dados.pacientes.push(
      { ...dados.pacientes[2], id: 'P9', nome: 'BEBÊ FICTÍCIO', nascimento: '2026-11-20', tipoSolicitado: 'Carro sem motorista', hora: '' },
      { ...dados.pacientes[2], id: 'P10', nome: 'CRIANÇA FICTÍCIA', nascimento: '2025-05-01', tipoSolicitado: 'Van', hora: '19:00' },
      { ...dados.pacientes[2], id: 'P11', nome: 'MENINA FICTÍCIA', nascimento: '2026-09-01', tipoSolicitado: '', hora: '14:00', observacao: 'Nenhuma' },
      { ...dados.pacientes[2], id: 'P12', nome: 'TESTE', nascimento: 'data-ruim', hora: '15:00', bairro: '', local: '' },
    );
    await abrirDia(dados);
    expect(linhaDe('P8').querySelector('.dm-veic')?.className).toContain('v-com');
    expect(linhaDe('P8').querySelector('.dm-restr-btn')).not.toBeNull();
    expect(linhaDe('P8').textContent).toContain('IDOSO SEM ACOMPANHANTE');
    expect(linhaDe('P4').querySelector('.dm-veic')?.className).toContain('v-auto');
    expect(linhaDe('P9').querySelector('.dm-veic')?.className).toContain('v-sem');
    expect(linhaDe('P9').textContent).toMatch(/\d+ dias?/);
    expect(linhaDe('P9').textContent).toContain('Bebê Conforto');
    expect(linhaDe('P10').querySelector('.dm-veic')?.className).toContain('v-out');
    expect(linhaDe('P10').textContent).toMatch(/1 ano e \d+ m/);
    expect(linhaDe('P11').textContent).toMatch(/\d+ m[eê]s/);
    expect(linhaDe('P11').querySelector('.dm-restr-btn')).toBeNull();
    expect(linhaDe('P12').querySelector('.dm-idade')).toBeNull();
    expect(linhaDe('P12').querySelector('.dm-av')?.textContent).toBe('TE');
    expect(textosDe('#dmCorpo .dm-banda-turno')).toContain('Noite');
    expect(textosDe('#dmCorpo .dm-banda-turno')).toContain('Tarde');
    expect(textosDe('#dmCorpo .dm-hora-chip')).toContain('--:--');
  });

  it('enquanto o dia carrega, avisa e trava o botão de adicionar paciente', async () => {
    elemento<HTMLInputElement>('#dmData').value = '';
    tela.iniciarDemandas();
    expect(elemento<HTMLInputElement>('#dmData').value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(texto('#dmCorpo')).toContain('Carregando demandas...');
    expect(elemento<HTMLButtonElement>('#dmBtnNovoPac').disabled).toBe(true);
    expect(elemento('#dmBtnNovoPac').title).toBe('Aguarde o dia terminar de carregar');
    // Enquanto carrega, redesenhar não faz nada.
    tela.dmRender();
    expect(texto('#dmCorpo')).toContain('Carregando demandas...');
    await esperar();
    expect(elemento<HTMLButtonElement>('#dmBtnNovoPac').disabled).toBe(false);
  });

  it('erro da API ao carregar aparece no lugar da fila', async () => {
    apiFalha(ROTA_DO_DIA, 500, 'Banco fora do ar');
    elemento<HTMLInputElement>('#dmData').value = '2026-12-30';
    tela.iniciarDemandas();
    await esperar();
    expect(texto('#dmCorpo')).toContain('Erro ao carregar: Banco fora do ar');
    expect(estado().data).toBe('2026-12-30');
  });

  it('carga lembrada: se o dia mudou enquanto o operador selecionava, a seleção é desfeita com aviso', async () => {
    await abrirDia();
    tela.iniciarDemandas(true);
    expect(chamadasA(ROTA_DO_DIA)).toHaveLength(2);
    tela.dmSelecionar('P8', true);
    expect(estado().selecionados).toEqual({ P8: true });
    await esperar();
    expect(estado().selecionados).toEqual({});
    expect(avisos()).toContain('O dia mudou enquanto você olhava');
  });

  it('carga lembrada: resposta que chega depois de trocar o dia é ignorada', async () => {
    await abrirDia();
    const comNovo = dia();
    comNovo.pacientes.push({ ...comNovo.pacientes[0], id: 'P30', nome: 'NOVO FICTÍCIO' });
    apiFalsa(ROTA_DO_DIA, () => structuredClone(comNovo));
    tela.iniciarDemandas(true);
    estado().data = '2026-11-28';
    await esperar();
    expect(estado().pacientes).toHaveLength(3);
  });

  it('filtros de cidade, local e veículo e a busca por texto recortam a fila', async () => {
    await abrirDia();
    preencher('#dmFCidade', 'CURITIBA', 'change');
    expect(textosDe('#dmCorpo .dm-cidade-row')).toEqual([expect.stringContaining('CURITIBA')]);
    expect(texto('#dmResumo')).toContain('1 pac · 1 pass');
    expect(texto('#dmResumo')).toContain('(de 3)');
    preencher('#dmFCidade', '', 'change');
    preencher('#dmFLocal', 'HOSPITAL FICTÍCIO DO LITORAL', 'change');
    expect(texto('#dmCorpo')).toContain('DIEGO EXEMPLO');
    expect(texto('#dmCorpo')).not.toContain('HEITOR');
    preencher('#dmFLocal', '', 'change');
    preencher('#dmFVeic', 'Ambulância', 'change');
    expect(texto('#dmCorpo')).toContain('HEITOR');
    expect(texto('#dmCorpo')).not.toContain('DIEGO');
    preencher('#dmFVeic', '', 'change');
    preencher('#dmBusca', '  diego ');
    expect(texto('#dmModoFilaN')).toBe('1');
    preencher('#dmBusca', 'ninguém com este nome');
    expect(texto('#dmCorpo')).toContain('Nenhuma demanda com os filtros atuais.');
  });

  it('o filtro escolhido continua ao recarregar o dia', async () => {
    await abrirDia();
    preencher('#dmFCidade', 'ITAJAÍ', 'change');
    tela.iniciarDemandas();
    await esperar();
    expect(elemento<HTMLSelectElement>('#dmFCidade').value).toBe('ITAJAÍ');
    expect(texto('#dmModoFilaN')).toBe('1');
  });

  it('cidade com e sem acento vira uma opção só, com o rótulo acentuado', async () => {
    const dados = dia();
    dados.pacientes[2] = { ...dados.pacientes[2], cidade: 'ITAJAI' };
    dados.pacientes.push({ ...dados.pacientes[2], id: 'P13', cidade: 'Itajaí' });
    await abrirDia(dados);
    expect(textosDe('#dmFCidade option').filter((t) => t.toUpperCase().startsWith('ITAJA'))).toEqual(['Itajaí (4)']);
    expect(textosDe('#dmCorpo .dm-cidade-row')).toEqual([expect.stringContaining('CURITIBA'), expect.stringContaining('ITAJAÍ')]);
  });

  it('o botão de cancelados mostra e esconde os pedidos cancelados pelo posto', async () => {
    await abrirDia();
    clicar('#dmBtnCancel');
    expect(elemento('#dmBtnCancel').classList.contains('on')).toBe(true);
    const linha = linhaDe('P1');
    expect(linha.classList.contains('cancelada')).toBe(true);
    expect(linha.querySelector('input')).toBeNull();
    expect(linha.querySelector('.dm-cancelar-linha')).toBeNull();
    expect(linha.textContent).toContain('cancelado pelo posto');
    // O cancelado aparece, mas não conta como trabalho do dia.
    expect(texto('#dmResumo')).toContain('2 pac · 3 pass');
    clicar('#dmBtnCancel');
    expect(texto('#dmCorpo')).not.toContain('ANA FICTÍCIA');
  });

  it('sem nenhum cancelado no dia, o botão some e o filtro desliga sozinho', async () => {
    await abrirDia();
    clicar('#dmBtnCancel');
    const semCancelados = dia();
    semCancelados.pacientes = semCancelados.pacientes.filter((p) => !p.cancelado);
    tela.dmCarregar(semCancelados);
    expect(texto('#dmNCancel')).toBe('0');
    expect(elemento('#dmBtnCancel').classList.contains('tem')).toBe(false);
    expect((tela as Record<string, unknown>).dmVerCancelados).toBe(false);
  });

  it('dia vazio e dia sem carro mostram mensagens diferentes', async () => {
    const vazio = dia();
    vazio.pacientes = [];
    vazio.veiculosSalvos = [];
    await abrirDia(vazio);
    expect(texto('#dmCorpo')).toContain('Nenhuma demanda para esta data.');
    clicar('#dmModoCarros');
    expect(texto('#dmCorpo')).toContain('Nenhum carro montado nesta data.');
    tela.dmCarregar(null);
    expect(estado().pacientes).toEqual([]);
  });

  it('com coordenadas das cidades, a fila segue a direção e a distância', async () => {
    const dados = dia();
    dados.pacientes.push(
      { ...dados.pacientes[2], id: 'P14', cidade: 'BLUMENAU', hora: '09:00' },
      { ...dados.pacientes[2], id: 'P15', cidade: 'ARAQUARI', hora: '09:00' },
    );
    dados.geoCidades = {
      ITAJAI: { ordem: 1, direcao: 'Litoral sul', km: 90 },
      CURITIBA: { ordem: 2, direcao: 'Norte', km: 130 },
    };
    await abrirDia(dados);
    expect(textosDe('#dmCorpo .dm-direcao-row')).toEqual(['Litoral sul', 'Norte', 'Sem localização']);
    expect(textosDe('#dmCorpo .dm-cidade-row').map((t) => t.split(/\d/)[0])).toEqual(['ITAJAÍ', 'CURITIBA', 'ARAQUARI', 'BLUMENAU']);
    expect(texto('#dmCorpo .dm-cid-km')).toBe('90 km');
  });
});

describe('Viagens Externas: seleção e barra flutuante', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('marcar pacientes mostra a barra com a contagem e o carro sugerido', async () => {
    await abrirDia();
    expect(aberto('dmBarra')).toBe(false);
    marcar(caixaDe('P8'));
    expect(aberto('dmBarra')).toBe(true);
    expect(elemento('#demandas').classList.contains('tem-selecao')).toBe(true);
    expect(texto('#dmBarraN')).toBe('1 paciente(s) · 1 passageiro(s)');
    // TST1A01 e TST1A03 já saíram hoje: a menor capacidade livre é a SPIN TST1A02.
    expect(texto('#dmExt .dm-vc-tipo')).toBe('SPIN');
    expect(texto('#dmExt .dm-vc-lug')).toBe('1/6');
    expect(texto('#dmExt .dm-ext-saida')).toContain('08:00');
    expect(textosDe('#dmExt .dm-cid-chip')).toEqual(['CURITIBA']);
    expect(linhaDe('P8').classList.contains('sel')).toBe(true);
    marcar(caixaDe('P4'));
    expect(texto('#dmBarraN')).toBe('2 paciente(s) · 3 passageiro(s)');
    expect(elemento<HTMLInputElement>('#dmChkTodos').checked).toBe(true);
    marcar(caixaDe('P4'), false);
    expect(elemento<HTMLInputElement>('#dmChkTodos').indeterminate).toBe(true);
    clicar(botaoComTexto('#dmBarra', 'Limpar'));
    expect(estado().selecionados).toEqual({});
    expect(aberto('dmBarra')).toBe(false);
    expect(texto('#dmExt')).toBe('');
  });

  it('marcar todos seleciona só o que está na tela e avisa quem ficou fora do filtro', async () => {
    await abrirDia();
    marcar('#dmChkTodos');
    expect(estado().selecionados).toEqual({ P8: true, P4: true });
    preencher('#dmFCidade', 'CURITIBA', 'change');
    expect(texto('#dmBarraN')).toContain('1 fora do filtro atual');
    marcar('#dmChkTodos', false);
    expect(estado().selecionados).toEqual({ P4: true });
  });

  it('clicar na caixa de seleção não abre o painel do paciente', async () => {
    await abrirDia();
    clicar(caixaDe('P8'));
    expect(aberto('dmDrawer')).toBe(false);
  });

  it('o carro sugerido troca com o tamanho do grupo, e avisa quando nada comporta', async () => {
    const dados = dia();
    dados.pacientes.push(
      { ...dados.pacientes[2], id: 'P16', quantidade: 6, cidade: 'BLUMENAU', tipoSolicitado: 'Automóvel' },
      { ...dados.pacientes[2], id: 'P17', quantidade: 8, cidade: 'JOINVILLE', tipoSolicitado: 'Automóvel' },
      { ...dados.pacientes[2], id: 'P18', quantidade: 3, cidade: 'GUARAMIRIM', tipoSolicitado: 'Automóvel' },
    );
    await abrirDia(dados);
    marcar(caixaDe('P4'));
    expect(texto('#dmExt .dm-vc-tipo')).toBe('SPIN');
    marcar(caixaDe('P16'));
    expect(texto('#dmExt .dm-vc-tipo')).toBe('VAN');
    // A troca de modelo pisca o cartão, para o operador perceber.
    expect(elemento('#dmVeicCard').classList.contains('trocou')).toBe(true);
    marcar(caixaDe('P17'));
    expect(texto('#dmExt .dm-vc-tipo')).toBe('Nenhum veículo comporta');
    expect(texto('#dmExt .dm-vc-sub')).toBe('maior é MINI-BUS 15 · excede 1');
    marcar(caixaDe('P18'));
    expect(textosDe('#dmExt .dm-cid-chip')).toEqual(['ITAJAÍ', 'BLUMENAU', 'JOINVILLE', '+1']);
  });

  it('sem frota no cadastro, ou com toda a frota já na rua, o cartão diz o motivo', async () => {
    const semFrota = dia();
    semFrota.veiculos = [];
    semFrota.veiculosCadastro = [];
    await abrirDia(semFrota);
    marcar(caixaDe('P8'));
    expect(texto('#dmExt')).toContain('nenhum veículo ativo no cadastro');

    const todosSairam = dia();
    todosSairam.veiculos = todosSairam.veiculos.filter((v) => ['TST1A01', 'TST1A03', 'TST2B01', 'TST1A05'].includes(String(v.placa)));
    await abrirDia(todosSairam);
    expect(estado().escadaTodosSairam).toBe(true);
    marcar(caixaDe('P8'));
    expect(texto('#dmExt')).toContain('todos os veículos já têm viagem hoje');
  });

  it('sem frota do dia, a sugestão usa o cadastro geral', async () => {
    const dados = dia();
    dados.veiculos = [];
    await abrirDia(dados);
    expect(estado().escada.map((d) => d.tipo)).toEqual(['SPIN', 'VAN', 'MINI-BUS']);
    expect(tela.dmVeiculoPara(99)).toBeNull();
  });
});

describe('Viagens Externas: painel do paciente, restrição e quantidade', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('clicar na linha abre a ficha completa do paciente', async () => {
    await abrirDia();
    clicar(linhaDe('P4'));
    expect(aberto('dmDrawer')).toBe(true);
    expect(estado().drawerId).toBe('P4');
    expect(texto('#dmDrNome')).toBe('DIEGO EXEMPLO DA SILVA 003');
    expect(texto('#dmDrSub')).toMatch(/^mat\. 900003 · \d+ anos$/);
    expect(texto('#dmDrCorpo')).toContain('ACOMPANHANTE FICTÍCIO 3');
    expect(texto('#dmDrCorpo')).toContain('(00) 0000-1003');
    expect(texto('#dmDrCorpo')).toContain('04/04/1953');
    expect(texto('#dmDrObsDica')).toBe('Nada que conte como restrição.');
    expect(texto('#dmQtdVal')).toBe('2');
    expect(elemento<HTMLButtonElement>('#dmQtdMenos').disabled).toBe(true);
    expect(texto('#dmQtdDica')).toBe('Mínimo 2: há acompanhante.');
    expect(texto('#dmDrCorpo')).toContain('Cancelar pedido');
    expect(texto('#dmDrCorpo')).not.toContain('Apagar da fila');
    clicar(elemento('#dmDrawer .dm-dr-x'));
    expect(aberto('dmDrawer')).toBe(false);
    expect(estado().drawerId).toBe('');
    tela.dmAbrirDrawer('NAO-EXISTE');
    expect(aberto('dmDrawer')).toBe(false);
  });

  it('salvar a restrição grava os três campos e mostra o aviso na linha', async () => {
    await abrirDia();
    clicar(linhaDe('P8'));
    preencher('#dmDrObs', '  Cadeirante ');
    clicar('#dmDrBtnObs');
    expect(texto('#dmDrBtnObs')).toBe('Salvando...');
    await esperar();
    expect(chamadasA('/api/operacao/editar-pedido')).toEqual([['P8', 'CLÍNICA DE DEMONSTRAÇÃO', 'Cadeirante', 1]]);
    expect(texto('#dmDrObsDica')).toBe('Salvo.');
    expect(linhaDe('P8').querySelector('.dm-restr-btn')).not.toBeNull();
    expect(avisos()).toContain('Restrição atualizada.');
    clicar('#dmDrBtnObs');
    expect(avisos()).toContain('Nada mudou na restrição.');
    expect(chamadasA('/api/operacao/editar-pedido')).toHaveLength(1);
    tela.dmSalvarRestricao('NAO-EXISTE');
  });

  it('se a restrição não grava, o texto antigo continua e o operador é avisado', async () => {
    await abrirDia();
    apiFalha('/api/operacao/editar-pedido', 500, 'Planilha ocupada');
    clicar(linhaDe('P8'));
    preencher('#dmDrObs', 'Acamado');
    clicar('#dmDrBtnObs');
    await esperar();
    expect(avisos()).toContain('Não foi possível salvar: Planilha ocupada');
    expect(texto('#dmDrBtnObs')).toBe('Salvar');
    expect(estado().pacientes.find((p) => p.id === 'P8')?.observacao).toBe('');
  });

  it('a quantidade sobe na hora e grava uma vez só depois da rajada de cliques', async () => {
    await abrirDia();
    clicar(linhaDe('P8'));
    clicar('#dmQtdMais');
    clicar('#dmQtdMais');
    expect(texto('#dmQtdVal')).toBe('3');
    expect(texto('#dmModoFilaN')).toBe('2');
    expect(texto('#dmResumo')).toContain('5 pass');
    expect(chamadasA('/api/operacao/editar-pedido')).toEqual([]);
    tela.dmGravarQtd('P8');
    expect(texto('#dmQtdDica')).toBe('Salvando...');
    await esperar();
    expect(chamadasA('/api/operacao/editar-pedido')).toEqual([['P8', 'CLÍNICA DE DEMONSTRAÇÃO', '', 3]]);
    expect(texto('#dmQtdDica')).toBe('Salvo.');
    // Sem nada pendente, gravar de novo não chama a API.
    tela.dmGravarQtd('P8');
    expect(chamadasA('/api/operacao/editar-pedido')).toHaveLength(1);
  });

  it('subir e descer de volta não grava nada', async () => {
    await abrirDia();
    clicar(linhaDe('P8'));
    clicar('#dmQtdMais');
    clicar('#dmQtdMenos');
    tela.dmGravarQtd('P8');
    await esperar();
    expect(chamadasA('/api/operacao/editar-pedido')).toEqual([]);
  });

  it('a quantidade respeita o mínimo com acompanhante e o teto de 8, mas desce de quem já veio acima', async () => {
    const dados = dia();
    dados.pacientes[0] = { ...dados.pacientes[0], quantidade: 8 };
    dados.pacientes.push({ ...dados.pacientes[0], id: 'P19', quantidade: 9 });
    await abrirDia(dados);
    tela.dmAjustarQtd('P4', -1);
    expect(estado().pacientes.find((p) => p.id === 'P4')?.quantidade).toBe(2);
    tela.dmAjustarQtd('P8', 1);
    expect(estado().pacientes.find((p) => p.id === 'P8')?.quantidade).toBe(8);
    clicar(linhaDe('P19'));
    expect(elemento<HTMLButtonElement>('#dmQtdMais').disabled).toBe(true);
    clicar('#dmQtdMenos');
    expect(texto('#dmQtdVal')).toBe('8');
    tela.dmAjustarQtd('NAO-EXISTE', 1);
    tela.dmGravarQtd('P19');
    await esperar();
    expect(chamadasA('/api/operacao/editar-pedido')).toEqual([['P19', 'CLÍNICA DE DEMONSTRAÇÃO', '', 8]]);
  });

  it('se a quantidade não grava, o número volta para o que está gravado', async () => {
    await abrirDia();
    apiFalha('/api/operacao/editar-pedido', 500, 'Sem conexão');
    clicar(linhaDe('P8'));
    clicar('#dmQtdMais');
    tela.dmGravarQtd('P8');
    await esperar();
    expect(estado().pacientes.find((p) => p.id === 'P8')?.quantidade).toBe(1);
    expect(texto('#dmQtdVal')).toBe('1');
    expect(texto('#dmQtdDica')).toBe('Não salvou.');
    expect(avisos()).toContain('Não foi possível salvar a quantidade');
  });

  it('a resposta que chega com outro paciente aberto não mexe na ficha dele', async () => {
    await abrirDia();
    clicar(linhaDe('P8'));
    clicar('#dmQtdMais');
    clicar(linhaDe('P4'));
    tela.dmGravarQtd('P8');
    await esperar();
    expect(texto('#dmQtdVal')).toBe('2');
    expect(texto('#dmQtdDica')).toBe('Mínimo 2: há acompanhante.');
  });
});

describe('Viagens Externas: cancelar, desfazer e apagar pedido da fila', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('cancelar pela linha pede justificativa e manda motivo e chave do pedido', async () => {
    await abrirDia();
    marcar(caixaDe('P8'));
    marcar(caixaDe('P4'));
    clicar(linhaDe('P8').querySelector('.dm-cancelar-linha') as Element);
    expect(aberto('dmDrawer')).toBe(false);
    expect(aberto('dmCfm')).toBe(true);
    expect(texto('#dmCfmTit')).toBe('Cancelar paciente');
    expect(texto('#dmCfmCorpo')).toContain('HEITOR TESTE DA SILVA 007');
    expect(texto('#dmCfmCorpo')).toContain('nasce uma tarefa na Lista de Tarefas');
    clicar('#dmCfmOk');
    expect(avisos()).toContain('Descreva a justificativa do cancelamento.');
    expect(chamadasA('/api/operacao/cancelar-pedido')).toEqual([]);
    const depois = dia();
    depois.pacientes = depois.pacientes.filter((p) => p.id !== 'P8');
    apiFalsa('/api/operacao/cancelar-pedido', () => ({ ...depois, acaoCancelamento: 'cancelada' }));
    preencher('#dmCancMotivo', 'Paciente cancelou', 'change');
    preencher('#dmCancJustif', 'Paciente internado em outro hospital');
    clicar('#dmCfmOk');
    expect(texto('#dmCfmOk')).toBe('Cancelando...');
    await esperar();
    expect(chamadasA('/api/operacao/cancelar-pedido')).toEqual([
      [DATA_DO_TESTE, 'D-A7895223', 'Paciente cancelou', 'Paciente internado em outro hospital', expect.any(String)],
    ]);
    expect(aberto('dmCfm')).toBe(false);
    expect(estado().selecionados).toEqual({ P4: true });
    expect(avisos()).toContain('Paciente cancelado. A tarefa foi para a Lista de Tarefas.');
  });

  it('cancelar a demanda digitada à mão apaga a linha e zera a seleção', async () => {
    const dados = dia();
    dados.pacientes[0] = { ...dados.pacientes[0], origemManual: true };
    await abrirDia(dados);
    marcar(caixaDe('P4'));
    tela.dmCancelarPedido('P8');
    expect(texto('#dmCfmCorpo')).toContain('digitada à mão');
    apiFalsa('/api/operacao/cancelar-pedido', () => ({ ...dia(), acaoCancelamento: 'apagada' }));
    preencher('#dmCancJustif', 'Lançada por engano');
    clicar('#dmCfmOk');
    await esperar();
    expect(estado().selecionados).toEqual({});
    expect(avisos()).toContain('Demanda apagada da fila.');
  });

  it('se o cancelamento falha, a janela continua aberta com o botão armado', async () => {
    await abrirDia();
    apiFalha('/api/operacao/cancelar-pedido', 409, 'Pedido já alocado');
    clicar(linhaDe('P4'));
    clicar(botaoComTexto('#dmDrCorpo', 'Cancelar pedido'));
    preencher('#dmCancJustif', 'Desistiu');
    clicar('#dmCfmOk');
    await esperar();
    expect(aberto('dmCfm')).toBe(true);
    expect(texto('#dmCfmOk')).toBe('Confirmar cancelamento');
    expect(elemento<HTMLButtonElement>('#dmCfmOk').disabled).toBe(false);
    expect(avisos()).toContain('Não deu para cancelar: Pedido já alocado');
    clicar(botaoComTexto('#dmCfm', 'Cancelar'));
    expect(aberto('dmCfm')).toBe(false);
  });

  it('pedido cancelado ou sem chave não abre a janela de cancelar', async () => {
    const dados = dia();
    dados.pacientes[2] = { ...dados.pacientes[2], chaveDemanda: '' };
    await abrirDia(dados);
    tela.dmCancelarPedido('P1');
    tela.dmCancelarPedido('NAO-EXISTE');
    expect(aberto('dmCfm')).toBe(false);
    tela.dmCancelarPedido('P4');
    expect(aberto('dmCfm')).toBe(false);
    expect(avisos()).toContain('Pedido sem identificação. Recarregue a tela.');
  });

  it('o cancelado nesta tela pode voltar para a fila pela ficha', async () => {
    const dados = dia();
    dados.pacientes[1] = { ...dados.pacientes[1], canceladoNaFila: true, canceladoPor: 'setor', motivoCancelamento: 'Paciente internado' };
    await abrirDia(dados);
    clicar('#dmBtnCancel');
    expect(linhaDe('P1').querySelector('.dm-selo-cancel')?.getAttribute('title')).toBe('Paciente internado');
    clicar(linhaDe('P1'));
    expect(texto('#dmDrCorpo .dm-dr-cancelar')).toContain('cancelado pelo setor');
    expect(texto('#dmDrCorpo .dm-dr-cancelar')).toContain('Paciente internado');
    clicar(botaoComTexto('#dmDrCorpo', 'Desfazer cancelamento'));
    expect(texto('#dmCfmTit')).toBe('Desfazer o cancelamento?');
    clicar('#dmCfmOk');
    expect(texto('#dmCfmOk')).toBe('Desfazendo...');
    await esperar();
    expect(chamadasA('/api/operacao/desfazer-cancelamento')).toEqual([[DATA_DO_TESTE, 'D-82C41A50', expect.any(String)]]);
    expect(aberto('dmDrawer')).toBe(false);
    expect(avisos()).toContain('Cancelamento desfeito');
  });

  it('se desfazer o cancelamento falha, o operador é avisado', async () => {
    const dados = dia();
    dados.pacientes[1] = { ...dados.pacientes[1], canceladoNaFila: true };
    await abrirDia(dados);
    apiFalha('/api/operacao/desfazer-cancelamento', 500, 'Tarefa travada');
    tela.dmDesfazerCancelamento('P1');
    clicar('#dmCfmOk');
    await esperar();
    expect(texto('#dmCfmOk')).toBe('Desfazer cancelamento');
    expect(avisos()).toContain('Não deu para desfazer: Tarefa travada');
    tela.dmFecharConfirma();
    tela.dmDesfazerCancelamento('P8');
    expect(aberto('dmCfm')).toBe(false);
  });

  it('a demanda digitada à mão pode ser apagada da fila pela ficha', async () => {
    const dados = dia();
    dados.pacientes[0] = { ...dados.pacientes[0], origemManual: true };
    await abrirDia(dados);
    clicar(linhaDe('P8'));
    expect(texto('#dmDrCorpo')).toContain('digitada à mão');
    expect(texto('#dmDrCorpo')).not.toContain('Cancelar pedido');
    clicar('#dmDrBtnApagar');
    expect(texto('#dmCfmTit')).toBe('Apagar esta demanda?');
    clicar('#dmCfmOk');
    await esperar();
    expect(chamadasA('/api/operacao/excluir-pedido-digitado')).toEqual([['D-A7895223', '27/11/2026']]);
    expect(avisos()).toContain('Demanda apagada.');
    // Depois de apagar, a tela relê o dia.
    expect(chamadasA(ROTA_DO_DIA)).toHaveLength(2);
  });

  it('apagar demanda que já saiu da fila avisa o motivo, e erro da API também', async () => {
    const dados = dia();
    dados.pacientes[0] = { ...dados.pacientes[0], origemManual: true };
    await abrirDia(dados);
    apiFalsa('/api/operacao/excluir-pedido-digitado', { ok: false, motivo: 'A demanda já está num carro.' });
    tela.dmApagarDemandaManual('P8');
    clicar('#dmCfmOk');
    await esperar();
    expect(avisos()).toContain('A demanda já está num carro.');

    apiFalsa('/api/operacao/excluir-pedido-digitado', { ok: false });
    tela.dmApagarDemandaManual('P8');
    clicar('#dmCfmOk');
    await esperar();
    expect(avisos()).toContain('Esta demanda já não está na fila.');

    apiFalha('/api/operacao/excluir-pedido-digitado', 500, 'Linha travada');
    tela.dmApagarDemandaManual('P8');
    clicar('#dmCfmOk');
    await esperar();
    expect(avisos()).toContain('Não deu para apagar: Linha travada');
    expect(texto('#dmCfmOk')).toBe('Apagar');
  });

  it('apagar demanda sem chave ou que não existe não chama a API', async () => {
    const dados = dia();
    dados.pacientes[0] = { ...dados.pacientes[0], origemManual: true, chaveDemanda: '' };
    await abrirDia(dados);
    tela.dmApagarDemandaManual('NAO-EXISTE');
    tela.dmApagarDemandaManual('P8');
    expect(avisos()).toContain('Demanda sem identificação. Recarregue a tela.');
    expect(aberto('dmCfm')).toBe(false);
  });

  it('o aviso só com OK fecha no botão e na tecla Esc', () => {
    tela.dmAvisoOk('Atenção', '<p>Teste</p>');
    expect(aberto('dmCfm')).toBe(true);
    expect(elemento('#dmCfm .dm-mo-cancelar').style.display).toBe('none');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(aberto('dmCfm')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(aberto('dmCfm')).toBe(false);
    expect(elemento('#dmCfm .dm-mo-cancelar').style.display).toBe('');
    tela.dmAvisoOk('De novo', '<p>Teste</p>');
    clicar('#dmCfmOk');
    expect(aberto('dmCfm')).toBe(false);
  });
});

describe('Viagens Externas: viagem do LACEN', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('monta a viagem fixa das 10h para Florianópolis, sem passageiros', async () => {
    await abrirDia();
    clicar('#dmBtnLacen');
    expect(texto('#dmBtnLacen')).toBe('Montando...');
    await esperar();
    expect(chamadasA('/api/operacao/montar-carros')).toEqual([
      [
        {
          data: DATA_DO_TESTE,
          operador: expect.any(String),
          alocacoes: [
            {
              placa: 'TST1A06',
              tipo: 'FURGÃO LACEN',
              motorista: '',
              bloqueados: 0,
              destino: 'Florianópolis',
              roteiro: ['Florianópolis'],
              horaEmbarque: '10:00',
              localEmbarque: 'Secretaria da Saúde',
              passageiros: [],
            },
          ],
        },
      ],
    ]);
    expect(avisos()).toContain('Viagem do LACEN montada.');
    expect(chamadasA(ROTA_DO_DIA)).toHaveLength(2);
  });

  it('se a viagem do LACEN não grava, o botão volta a funcionar', async () => {
    await abrirDia();
    apiFalha('/api/operacao/montar-carros', 409, 'Furgão já tem viagem');
    clicar('#dmBtnLacen');
    await esperar();
    expect(texto('#dmBtnLacen')).toBe('Montar viagem do LACEN');
    expect(elemento<HTMLButtonElement>('#dmBtnLacen').disabled).toBe(false);
    expect(avisos()).toContain('Não montou. Furgão já tem viagem');
  });

  it('o lembrete some com a viagem montada ou sem furgão na frota', async () => {
    const montada = dia();
    montada.veiculosSalvos.push({ idViagem: 'LAC1', placa: 'tst1a06', tipo: 'FURGÃO LACEN', passageiros: [] });
    await abrirDia(montada);
    expect(document.querySelector('#dmCorpo .dm-lacen')).toBeNull();

    const semFurgao = dia();
    semFurgao.veiculos = semFurgao.veiculos.filter((v) => !String(v.tipo).includes('LACEN'));
    semFurgao.veiculosCadastro = semFurgao.veiculosCadastro.filter((v) => !String(v.tipo).includes('LACEN'));
    await abrirDia(semFurgao);
    expect(document.querySelector('#dmCorpo .dm-lacen')).toBeNull();
    tela.dmMontarLacen();
    expect(chamadasA('/api/operacao/montar-carros')).toEqual([]);
  });
});
