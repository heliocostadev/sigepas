import { apiFalha, carregarTelas, chamadasA, clicar, esperar, limparChamadas, tela, texto } from './preparar-telas';
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
  montagem,
  preencher,
  ROTA_DO_DIA,
  tecla,
  type Registro,
} from './viagens-externas-ajuda';

function textosDe(seletor: string): string[] {
  return Array.from(document.querySelectorAll(seletor)).map((el) => (el.textContent ?? '').trim());
}

function placa(nome: string): HTMLElement {
  return elemento(`#dmMoCorpo button.dm-mo-placa[onclick*="'${nome}'"]`);
}

function cidadesDoRoteiro(): string[] {
  return textosDe('#dmMoCorpo .rt-chip:not(.origem) .rt-chip-cidade').map((t) => t.replace(/^\d{2}:\d{2}\s*/, ''));
}

function chipDoRoteiro(cidade: string): HTMLElement {
  const chips = Array.from(document.querySelectorAll<HTMLElement>('#dmMoCorpo .rt-chip:not(.origem)'));
  const achado = chips.find((c) => (c.querySelector('.rt-chip-cidade')?.textContent ?? '').includes(cidade));
  if (!achado) throw new Error(`Parada ${cidade} não encontrada`);
  return achado;
}

function embarqueDoPassageiro(id: string): HTMLSelectElement {
  return elemento<HTMLSelectElement>(`#dmMoCorpo select[onchange*="dmEmbarquePaciente('${id}'"]`);
}

// Seleciona os pacientes, abre a janela e escolhe a placa. Com `irAoPasso2`, já passa para a confirmação.
async function abrirMontagem(ids: string[], placaEscolhida = 'TST1A02', irAoPasso2 = true): Promise<void> {
  for (const id of ids) marcar(caixaDe(id));
  clicar(botaoComTexto('#dmBarra', 'Montar carro'));
  clicar(placa(placaEscolhida));
  if (irAoPasso2) clicar('#dmMoNext');
}

describe('Viagens Externas: montar carro, escolha do veículo', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('abre a janela com o retrato da seleção e sugere a ambulância pedida no dash', async () => {
    await abrirDia();
    marcar(caixaDe('P8'));
    marcar(caixaDe('P4'));
    clicar(linhaDe('P8'));
    clicar(botaoComTexto('#dmBarra', 'Montar carro'));
    expect(aberto('dmModal')).toBe(true);
    expect(aberto('dmDrawer')).toBe(false);
    expect(texto('#dmMoTit')).toBe('Montar carro');
    expect(texto('#dmMoSub')).toBe('2 paciente(s) · 3 passageiro(s) · CURITIBA / ITAJAÍ · saída 08:00');
    expect(textosDe('#dmMoCorpo .dm-mo-gnome')).toEqual(['MINI-BUS', 'SPIN', 'ARGO', 'AMBULÂNCIA']);
    const ambulancia = elemento('#dmMoCorpo .dm-mo-grupo:last-child');
    expect(ambulancia.textContent).toContain('sugerido');
    expect(ambulancia.textContent).toContain('não comporta 3');
    expect(placa('TST1A01').textContent).toContain('1 saída hoje');
    expect(placa('TST1A01').title).toBe('Já saiu 1 vez hoje. Use outro horário.');
    expect(elemento<HTMLButtonElement>('#dmMoNext').disabled).toBe(true);
    expect(texto('#dmMoDica')).toBe('Escolha uma placa.');
    // O embarque padrão (a estrela do cadastro) já vem preenchido em quem não tinha.
    expect(estado().pacientes.find((p) => p.id === 'P8')?.enderecoEmbarque).toBe('Secretaria da Saúde');
  });

  it('sem ambulância pedida, sugere o menor carro que comporta e nunca a ambulância', async () => {
    await abrirDia();
    marcar(caixaDe('P4'));
    clicar(botaoComTexto('#dmBarra', 'Montar carro'));
    const sugerido = elemento('#dmMoCorpo .dm-mo-selo.sug').closest('.dm-mo-grupo');
    expect(sugerido?.querySelector('.dm-mo-gnome')?.textContent).toBe('ARGO');
  });

  it('escolher a placa mostra a lotação e libera o próximo passo', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4'], 'TST1A02', false);
    expect(placa('TST1A02').classList.contains('on')).toBe(true);
    expect(texto('#dmMoDica')).toBe('TST1A02 · SPIN · 3 de 6 lugares');
    expect(elemento<HTMLButtonElement>('#dmMoNext').disabled).toBe(false);
    clicar(placa('TST1A05'));
    expect(texto('#dmMoDica')).toBe('TST1A05 · AMBULÂNCIA · só 2 lugares para 3 passageiro(s)');
    tela.dmEscolherPlaca('TST9Z99');
    expect(avisos()).toContain('Esta placa não está mais disponível.');
    expect(montagem().placa).toBe('');
    // Sem placa, o passo 2 não abre.
    tela.dmModalPasso(2);
    expect(montagem().passo).toBe(1);
  });

  it('a frota terceirizada mostra o motorista do vínculo, e falta dele em destaque', async () => {
    const dados = dia();
    dados.veiculos[1] = { ...dados.veiculos[1], motoristaProprio: '' };
    await abrirDia(dados);
    marcar(caixaDe('P8'));
    clicar(botaoComTexto('#dmBarra', 'Montar carro'));
    clicar('#dmMoTabTer');
    expect(elemento('#dmMoTabTer').classList.contains('on')).toBe(true);
    expect(textosDe('#dmMoCorpo .dm-mo-pl')).toEqual(['TST2B02', 'TST2B01']);
    expect(placa('TST2B01').textContent).toContain('GUSTAVO TERCEIRO ALVES');
    expect(placa('TST2B02').querySelector('.dm-mo-mot.sem')?.textContent).toBe('sem motorista');
    clicar(placa('TST2B02'));
    clicar('#dmMoNext');
    expect(texto('#dmMoCorpo .cat-badge')).toBe('Terc');
    expect(texto('#dmMoCorpo .cv-topo-right')).toContain('sem motorista');
    // Carro terceirizado não tem a opção de dois motoristas.
    expect(document.getElementById('dmMoDois')).toBeNull();
    tela.dmModalPasso(1);
    clicar(placa('TST2B01'));
    clicar('#dmMoNext');
    expect(texto('#dmMoCorpo .motorista-label')).toBe('GUSTAVO TERCEIRO ALVES');
  });

  it('sem frota do dia, avisa que a lista é o cadastro geral, e aba sem carro diz isso', async () => {
    const dados = dia();
    dados.veiculos = [];
    dados.veiculosCadastro = dados.veiculosCadastro.filter((v) => v.categoria === 'publico').concat([{ placa: '', tipo: 'SPIN' }, { placa: 'TST1A02', tipo: 'SPIN', categoria: 'publico', limite: 6 }]);
    await abrirDia(dados);
    marcar(caixaDe('P8'));
    clicar(botaoComTexto('#dmBarra', 'Montar carro'));
    expect(texto('#dmMoCorpo .dm-mo-nota')).toContain('cadastro geral');
    expect(textosDe('#dmMoCorpo .dm-mo-pl').filter((p) => p === 'TST1A02')).toHaveLength(1);
    clicar('#dmMoTabTer');
    expect(texto('#dmMoCorpo')).toContain('Nenhum veículo desta frota disponível.');
    clicar(botaoComTexto('#dmMoAcoes', 'Cancelar'));
    expect(aberto('dmModal')).toBe(false);
    expect(estado().montagem).toBeNull();
  });

  it('sem ninguém selecionado, montar carro não abre a janela', async () => {
    await abrirDia();
    tela.dmMontarCarro();
    expect(aberto('dmModal')).toBe(false);
    tela.dmModalAba('publico');
    tela.dmModalPasso(1);
    tela.dmModalRenderFrota();
    tela.dmEscolherPlaca('TST1A02');
    expect(estado().montagem).toBeNull();
  });
});

describe('Viagens Externas: montar carro, confirmação e gravação', () => {
  beforeAll(carregarTelas);
  // O jsdom não desenha a página, então não tem rolagem até o aviso.
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  beforeEach(limparChamadas);

  it('o passo 2 pede a hora de saída e mostra o roteiro ordenado por horário', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4']);
    expect(texto('#dmMoTit')).toBe('Confirmar o carro');
    expect(elemento('#dmMoTabs').style.display).toBe('none');
    expect(elemento('#dmModal').classList.contains('largo')).toBe(true);
    expect(texto('#dmCfHoraTopo')).toBe('--:--');
    expect(texto('#dmCfRota')).toBe('Joinville › CURITIBA › ITAJAÍ · Saída Secretaria da Saúde');
    expect(cidadesDoRoteiro()).toEqual(['CURITIBA', 'ITAJAÍ']);
    expect(textosDe('#dmMoCorpo .rt-chip-info')).toEqual(['1 desembarque', '2 desembarques']);
    expect(texto('#dmMoCorpo .vagas-badge')).toBe('3 livre(s)');
    expect(texto('#dmMoCorpo .dm-cf-ref')).toContain('08:00');
    expect(elemento<HTMLButtonElement>('#dmMoNext').disabled).toBe(true);
    expect(texto('#dmMoDica')).toBe('Informe a hora de saída.');
    expect(embarqueDoPassageiro('P8').value).toBe('Secretaria da Saúde');
    const horaSaida = elemento<HTMLInputElement>('#dmMoCorpo input[type="time"]');
    preencher(horaSaida, '05:3');
    expect(montagem().horaSaida).toBe('');
    preencher(horaSaida, '05:30');
    expect(texto('#dmCfHoraTopo')).toBe('05:30');
    expect(texto('#dmCfOrigemHora')).toBe('05:30 Joinville');
    expect(elemento<HTMLButtonElement>('#dmMoNext').disabled).toBe(false);
    expect(texto('#dmMoDica')).toBe('TST1A02 · SPIN · 3 de 6 lugares');
    preencher('#dmMoCorpo .cv-logistica-input select', '', 'change');
    expect(texto('#dmMoDica')).toBe('Escolha o local de embarque.');
    expect(texto('#dmCfRota')).toBe('Joinville › CURITIBA › ITAJAÍ');
    preencher('#dmMoCorpo .cv-logistica-input select', 'Terminal Central', 'change');
    expect(texto('#dmCfRota')).toContain('Saída Terminal Central');
  });

  it('a hora digitada só com as horas é completada ao sair do campo', async () => {
    await abrirDia();
    await abrirMontagem(['P8']);
    const seletor = '#dmMoCorpo input[type="time"]';
    const campo = elemento<HTMLInputElement>(seletor);
    campo.dispatchEvent(new Event('focus'));
    tecla(seletor, '7');
    tecla(seletor, 'Tab');
    campo.dispatchEvent(new Event('blur'));
    expect(campo.value).toBe('07:00');
    expect(montagem().horaSaida).toBe('07:00');

    // Com três dígitos o operador estava nos minutos: não se completa.
    campo.value = '';
    tecla(seletor, '0');
    tecla(seletor, '4');
    tecla(seletor, '3');
    campo.dispatchEvent(new Event('blur'));
    expect(campo.value).toBe('');
    // Hora impossível também não.
    tecla(seletor, '2');
    tecla(seletor, '5');
    campo.dispatchEvent(new Event('blur'));
    expect(campo.value).toBe('');
    // Apagar zera o que foi digitado.
    tecla(seletor, '9');
    tecla(seletor, 'Backspace');
    campo.dispatchEvent(new Event('blur'));
    expect(campo.value).toBe('');
    // Se o navegador já entregou a hora inteira, nada muda.
    tecla(seletor, '1');
    campo.value = '11:45';
    campo.dispatchEvent(new Event('blur'));
    expect(campo.value).toBe('11:45');
  });

  it('bloquear assentos respeita o que sobra no carro', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4']);
    const menos = (): void => clicar(elemento('#dmMoCorpo .stepper button[aria-label="Menos"]'));
    const mais = (): void => clicar(elemento('#dmMoCorpo .stepper button[aria-label="Mais"]'));
    menos();
    expect(montagem().bloqueados).toBe(0);
    mais();
    expect(texto('#dmMoCorpo .stepper .qtd')).toBe('1');
    expect(texto('#dmMoCorpo .vagas-badge')).toBe('2 livre(s)');
    mais();
    mais();
    mais();
    expect(montagem().bloqueados).toBe(3);
    expect(texto('#dmMoCorpo .vagas-badge')).toBe('Cheio');
    menos();
    expect(montagem().bloqueados).toBe(2);
  });

  it('o roteiro pode ser reordenado, reduzido e ampliado com parada de passagem', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4']);
    clicar(elemento('button[title="Mover para frente"]', chipDoRoteiro('CURITIBA')));
    expect(cidadesDoRoteiro()).toEqual(['ITAJAÍ', 'CURITIBA']);
    expect(texto('#dmMoCorpo .rt-dica')).toContain('ordem manual');
    clicar('#dmMoCorpo .rt-auto-link');
    expect(cidadesDoRoteiro()).toEqual(['CURITIBA', 'ITAJAÍ']);
    clicar(elemento('button[title="Mover para trás"]', chipDoRoteiro('ITAJAÍ')));
    expect(cidadesDoRoteiro()).toEqual(['ITAJAÍ', 'CURITIBA']);
    // Os limites do roteiro não mexem em nada.
    tela.dmMoverParada(0, -1);
    tela.dmMoverParada(1, 1);
    expect(cidadesDoRoteiro()).toEqual(['ITAJAÍ', 'CURITIBA']);

    clicar(elemento('.rt-x', chipDoRoteiro('CURITIBA')));
    expect(cidadesDoRoteiro()).toEqual(['ITAJAÍ']);
    const foraDoRoteiro = elemento('#dmMoCorpo .cp-cidade-tag.fora');
    expect(foraDoRoteiro.textContent).toContain('CURITIBA · fora do roteiro');
    clicar(elemento('.cp-add-parada', foraDoRoteiro));
    expect(cidadesDoRoteiro()).toEqual(['ITAJAÍ', 'CURITIBA']);

    // FLORIANÓPOLIS está na fila (o pedido cancelado), mas ninguém deste carro desce lá: vira parada de passagem.
    preencher('#dmMoCorpo .rt-add select', 'FLORIANÓPOLIS', 'change');
    expect(cidadesDoRoteiro()).toEqual(['ITAJAÍ', 'CURITIBA', 'FLORIANÓPOLIS']);
    expect(texto('#dmMoCorpo .rt-chip.destino .rt-chip-info')).toBe('parada de passagem');
    expect(montagem().roteiroManuais).toEqual(['FLORIANÓPOLIS']);
    expect(document.querySelector('#dmMoCorpo .rt-add')).toBeNull();
    tela.dmAddParada('');
    expect(cidadesDoRoteiro()).toHaveLength(3);
  });

  it('arrastar uma parada muda a ordem, e soltar fora limpa o realce', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4']);
    const origem = chipDoRoteiro('CURITIBA');
    const alvo = chipDoRoteiro('ITAJAÍ');
    const dados = { effectAllowed: '', dropEffect: '', setData: vi.fn() };
    const evento = (alvoDoEvento: HTMLElement): Registro => ({ dataTransfer: dados, currentTarget: alvoDoEvento, preventDefault: vi.fn() });
    // Sem arraste em curso, passar por cima não faz nada.
    tela.dmRtDragOver(evento(alvo));
    expect(alvo.classList.contains('rt-drag-over')).toBe(false);
    tela.dmRtDragStart(evento(origem), 0);
    expect(origem.classList.contains('rt-dragging')).toBe(true);
    tela.dmRtDragOver(evento(alvo));
    expect(dados.dropEffect).toBe('move');
    expect(alvo.classList.contains('rt-drag-over')).toBe(true);
    tela.dmRtDragLeave(evento(alvo));
    expect(alvo.classList.contains('rt-drag-over')).toBe(false);
    tela.dmRtDrop(evento(alvo), 1);
    expect(cidadesDoRoteiro()).toEqual(['ITAJAÍ', 'CURITIBA']);

    const chip = chipDoRoteiro('CURITIBA');
    chip.classList.add('rt-dragging');
    tela.dmRtDragEnd();
    expect(chip.classList.contains('rt-dragging')).toBe(false);
    // Soltar sem arraste começado, ou no mesmo lugar, não reordena.
    tela.dmRtDrop(evento(chip), 0);
    tela.dmMoverParadaPara(1, 1);
    tela.dmMoverParadaPara(-1, 0);
    tela.dmMoverParadaPara(0, 9);
    expect(cidadesDoRoteiro()).toEqual(['ITAJAÍ', 'CURITIBA']);
    // Navegador que recusa o setData segue sem a marca.
    const recusa = { effectAllowed: '', setData: (): never => { throw new Error('sem arrastar'); } };
    tela.dmRtDragStart({ dataTransfer: recusa, currentTarget: chip }, 1);
    expect((tela as Record<string, unknown>).dmRtIdx).toBe(1);
    tela.dmRtDragEnd();
  });

  it('grava o carro com hora, roteiro, aviso, dois motoristas e os passageiros', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4']);
    preencher('#dmMoCorpo input[type="time"]', '05:30');
    preencher(embarqueDoPassageiro('P4'), 'Terminal Central', 'change');
    preencher('#dmMoAviso', 'Paciente de Curitiba com muleta');
    marcar('#dmMoDois');
    clicar(elemento('#dmMoCorpo .stepper button[aria-label="Mais"]'));
    clicar('#dmMoNext');
    expect(texto('#dmMoNext')).toBe('Gravando...');
    expect(texto('#dmMoDica')).toBe('Gravando no sistema...');
    await esperar();
    const [payload] = chamadasA('/api/operacao/montar-carros')[0] as [Registro & { alocacoes: Registro[] }];
    expect(payload.data).toBe(DATA_DO_TESTE);
    expect(payload.alocacoes[0]).toMatchObject({
      placa: 'TST1A02',
      tipo: 'SPIN',
      motorista: '',
      bloqueados: 1,
      destino: 'ITAJAÍ',
      roteiro: ['CURITIBA', 'ITAJAÍ'],
      horaEmbarque: '05:30',
      localEmbarque: 'Secretaria da Saúde',
      aviso: 'Paciente de Curitiba com muleta',
      doisMotoristas: true,
    });
    const passageiros = payload.alocacoes[0]?.passageiros as Registro[];
    expect(passageiros.map((p) => [p.id, p.chaveDemanda, p.quantidade, p.enderecoEmbarque, p.statusConfirmacao])).toEqual([
      ['P8', 'D-A7895223', 1, 'Secretaria da Saúde', ''],
      ['P4', 'D-6942BB43', 2, 'Terminal Central', ''],
    ]);
    expect(aberto('dmModal')).toBe(false);
    expect(estado().selecionados).toEqual({});
    expect(avisos()).toContain('Carro montado: TST1A02 com 2 paciente(s).');
    expect(chamadasA(ROTA_DO_DIA)).toHaveLength(2);
  });

  it('recusa do servidor aparece na janela, com a primeira frase em destaque', async () => {
    await abrirDia();
    apiFalha('/api/operacao/montar-carros', 409, 'Este carro já sai às 05:00. Escolha outra hora.');
    await abrirMontagem(['P8']);
    preencher('#dmMoCorpo input[type="time"]', '05:00');
    clicar('#dmMoNext');
    await esperar();
    expect(aberto('dmMoAlerta')).toBe(true);
    expect(texto('#dmMoAlertaTxt')).toBe('Este carro já sai às 05:00.');
    expect(texto('#dmMoAlertaSub')).toBe('Escolha outra hora.');
    expect(texto('#dmMoNext')).toBe('Montar carro');
    expect(aberto('dmModal')).toBe(true);
    tela.dmAlerta('Error: Placa ocupada');
    expect(texto('#dmMoAlertaTxt')).toBe('Placa ocupada');
    expect(texto('#dmMoAlertaSub')).toBe('');
    clicar(elemento('#dmModal .dm-mo-x'));
    expect(aberto('dmMoAlerta')).toBe(false);
  });

  it('passageiro sem local de embarque não deixa gravar e é apontado pelo nome', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4']);
    preencher('#dmMoCorpo input[type="time"]', '05:30');
    preencher(embarqueDoPassageiro('P8'), '', 'change');
    clicar('#dmMoNext');
    expect(texto('#dmCfmTit')).toBe('Falta o local de embarque');
    expect(texto('#dmCfmCorpo')).toBe('Selecione um local de embarque para o paciente HEITOR TESTE DA SILVA 007.');
    clicar('#dmCfmOk');
    preencher(embarqueDoPassageiro('P4'), '', 'change');
    clicar('#dmMoNext');
    expect(texto('#dmCfmCorpo')).toContain('para os pacientes:');
    expect(chamadasA('/api/operacao/montar-carros')).toEqual([]);
  });

  it('servidor sem nome e matrícula não grava, e os campos do card resolvem', async () => {
    const dados = dia();
    dados.pacientes.push(
      { ...dados.pacientes[0], id: 'P20', nome: '-', matricula: 'N/A', objetivo: 'Curso', hora: '07:00', chaveDemanda: 'D-SERV1' },
      { ...dados.pacientes[0], id: 'P21', nome: '', matricula: '-', objetivo: '', hora: '', chaveDemanda: 'D-SERV2' },
    );
    await abrirDia(dados);
    expect(linhaDe('P20').querySelector('.dm-local-serv')).not.toBeNull();
    await abrirMontagem(['P20', 'P21']);
    preencher('#dmMoCorpo input[type="time"]', '05:30');
    expect(document.querySelectorAll('#dmMoCorpo .dm-serv-ident')).toHaveLength(2);
    expect(texto('#dmMoCorpo .dm-serv-obj')).toBe('Curso');
    clicar('#dmMoNext');
    expect(texto('#dmCfmTit')).toBe('Falta identificar o servidor');
    expect(texto('#dmCfmCorpo')).toContain('dos servidores:');
    expect(texto('#dmCfmCorpo')).toContain('Curso · 07:00');
    tela.dmFecharConfirma();
    const [nome1, mat1, nome2, mat2] = Array.from(document.querySelectorAll<HTMLInputElement>('#dmMoCorpo .dm-serv-in'));
    preencher(nome1 as HTMLInputElement, 'Servidora Fictícia');
    preencher(mat1 as HTMLInputElement, '700001');
    expect(mat1?.classList.contains('falta')).toBe(false);
    clicar('#dmMoNext');
    expect(texto('#dmCfmCorpo')).toContain('do servidor: Servidor.');
    tela.dmFecharConfirma();
    preencher(nome2 as HTMLInputElement, 'Servidor Fictício');
    preencher(mat2 as HTMLInputElement, '700002');
    tela.dmServidorCampo('NAO-EXISTE', 'nome', nome2);
    clicar('#dmMoNext');
    await esperar();
    const [payload] = chamadasA('/api/operacao/montar-carros')[0] as [Registro & { alocacoes: Array<{ passageiros: Registro[] }> }];
    expect(payload.alocacoes[0]?.passageiros.map((p) => [p.servidorNome, p.servidorMatricula])).toEqual([
      ['Servidora Fictícia', '700001'],
      ['Servidor Fictício', '700002'],
    ]);
  });

  it('acima da lotação o carro não grava e o rodapé diz quantos lugares faltam', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4'], 'TST1A05');
    preencher('#dmMoCorpo input[type="time"]', '05:30');
    expect(texto('#dmMoDica')).toBe('Não cabe: 2 lugar(es) para 3 pessoa(s). Tire alguém ou volte e escolha um carro maior.');
    expect(texto('#dmMoCorpo .vagas-badge')).toBe('Excedido por 1');
    tela.dmGravarCarro();
    expect(avisos()).toContain('Não cabe');
    clicar(botaoComTexto('#dmMoAcoes', 'Voltar'));
    expect(montagem().passo).toBe(1);
    expect(placa('TST1A05').classList.contains('on')).toBe(true);
  });

  it('tirar paciente do carro devolve à fila, e carro vazio não grava', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4']);
    preencher('#dmMoCorpo input[type="time"]', '05:30');
    const tirar = (id: string): void => clicar(elemento(`#dmMoCorpo .btn-remover[onclick*="'${id}'"]`));
    tirar('P4');
    expect(montagem().ids).toEqual(['P8']);
    expect(montagem().passageiros).toBe(1);
    expect(estado().selecionados).toEqual({ P8: true });
    expect(cidadesDoRoteiro()).toEqual(['CURITIBA']);
    tirar('P8');
    expect(texto('#dmMoCorpo')).toContain('Nenhum paciente neste carro.');
    expect(texto('#dmMoDica')).toBe('O carro ficou sem paciente.');
    expect(texto('#dmCfRota')).toBe('sem cidade nos pacientes');
    tela.dmGravarCarro();
    expect(chamadasA('/api/operacao/montar-carros')).toEqual([]);
  });

  it('se outro operador levou um paciente, a janela avisa e não grava', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4']);
    preencher('#dmMoCorpo input[type="time"]', '05:30');
    const semP4 = dia();
    semP4.pacientes = semP4.pacientes.filter((p) => p.id !== 'P4');
    tela.dmCarregar(semP4);
    clicar('#dmMoNext');
    expect(avisos()).toContain('A seleção mudou: volte e monte de novo.');
    expect(texto('#dmMoCorpo .dm-mo-nota')).toContain('1 paciente(s) da seleção saíram da fila');
    expect(chamadasA('/api/operacao/montar-carros')).toEqual([]);
  });

  it('a ficha aberta pelo card do passageiro muda a quantidade e o carro acompanha', async () => {
    await abrirDia();
    await abrirMontagem(['P8', 'P4']);
    clicar(elemento('#dmMoCorpo .chip-passageiro-novo[onclick*="\'P8\'"]'));
    expect(aberto('dmDrawer')).toBe(true);
    clicar('#dmQtdMais');
    expect(montagem().passageiros).toBe(4);
    expect(texto('#dmMoCorpo .vagas-badge')).toBe('2 livre(s)');
    preencher('#dmDrObs', 'Oxigênio');
    clicar('#dmDrBtnObs');
    await esperar();
    expect(texto('#dmMoCorpo .obs-texto')).toBe('Oxigênio');
    tela.dmGravarQtd('P8');
    await esperar();
  });

  it('as funções do passo 2 não quebram sem carro em montagem', () => {
    tela.dmFecharModal();
    tela.dmMontagemHora('05:00');
    tela.dmMontagemLocal('Terminal Central');
    tela.dmMontagemAviso('x');
    tela.dmMontagemDois(true);
    tela.dmAjustarBloqueio(1);
    tela.dmTirarPaciente('P8');
    tela.dmAddParada('CURITIBA');
    tela.dmRemoverParada('CURITIBA');
    tela.dmMoverParada(0, 1);
    tela.dmRoteiroAuto();
    tela.dmMoverParadaPara(0, 1);
    tela.dmSincronizarRoteiro([]);
    tela.dmMontagemRecontar();
    tela.dmModalRenderConfirma();
    tela.dmPintarCabecalhoCarro();
    tela.dmModalPe();
    tela.dmGravarCarro();
    tela.dmSalvarEdicao();
    expect(estado().montagem).toBeNull();
    expect(tela.dmRotaHTML()).toBe('sem cidade nos pacientes');
  });
});

describe('Viagens Externas: incluir e corrigir paciente digitado à mão', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  async function abrirNovo(): Promise<void> {
    await abrirDia();
    clicar('#dmBtnNovoPac');
  }

  it('o formulário abre com as cidades do dicionário e confere os campos obrigatórios em ordem', async () => {
    await abrirNovo();
    expect(aberto('dmNovoModal')).toBe(true);
    expect(texto('#dmNovoTit')).toBe('Adicionar paciente na fila');
    expect(texto('#dmNovoSub')).toBe('Demanda avulsa para 27/11/2026');
    expect(textosDe('#dmNovoCidDest option')).toEqual([
      'Selecione a cidade...', 'BLUMENAU', 'CURITIBA', 'FLORIANÓPOLIS', 'ITAJAÍ', '+ Outra cidade (digitar)...',
    ]);
    expect(elemento<HTMLSelectElement>('#dmNovoObj').value).toBe('Consulta');
    const tentar = (): string => {
      clicar('#dmNovoSalvarBtn');
      return texto('#dmNovoAlertaTxt');
    };
    expect(tentar()).toBe('Falta o nome do paciente.');
    preencher('#dmNovoNome', 'Paciente Fictícia Nova');
    preencher('#dmNovoMat', '-');
    expect(tentar()).toBe('Falta a matrícula do paciente.');
    preencher('#dmNovoMat', '900100');
    expect(tentar()).toBe('Faltam os telefones.');
    preencher('#dmNovoTel', '(00) 0000-0000');
    expect(tentar()).toBe('Falta a cidade de destino.');
    preencher('#dmNovoCidDest', 'CURITIBA', 'change');
    expect(tentar()).toBe('Falta a hora do compromisso.');
    expect(chamadasA('/api/operacao/incluir-pedido-digitado')).toEqual([]);
    clicar(elemento('#dmNovoModal .dm-mo-x'));
    expect(aberto('dmNovoModal')).toBe(false);
  });

  it('inclui o paciente com o endereço montado no formato do OLOSTECH', async () => {
    await abrirNovo();
    preencher('#dmNovoNome', 'Paciente Fictícia Nova');
    preencher('#dmNovoMat', '900100');
    preencher('#dmNovoTel', '(00) 0000-0000');
    preencher('#dmNovoCidDest', '__outro__', 'change');
    expect(elemento('#dmNovoCidOutroWrap').style.display).toBe('block');
    preencher('#dmNovoCidOutro', 'BLUMENAU');
    preencher('#dmNovoHora', '09:15');
    preencher('#dmNovoQtd', '2');
    preencher('#dmNovoRua', 'Rua Fictícia');
    preencher('#dmNovoNum', '10');
    preencher('#dmNovoCompl', 'apto 2');
    preencher('#dmNovoBairro', 'CENTRO');
    preencher('#dmNovoUF', 'sc');
    preencher('#dmNovoEmb', 'Terminal Central', 'change');
    clicar('#dmNovoSalvarBtn');
    expect(texto('#dmNovoSalvarBtn')).toBe('Salvando...');
    await esperar();
    expect(chamadasA('/api/operacao/incluir-pedido-digitado')).toEqual([
      [
        expect.objectContaining({
          dataNavegador: DATA_DO_TESTE,
          nome: 'Paciente Fictícia Nova',
          matricula: '900100',
          cidade: 'BLUMENAU',
          hora: '09:15',
          objetivo: 'Consulta',
          tipoSolicitado: 'Automóvel',
          quantidade: 2,
          enderecoEmbarque: 'Terminal Central',
          trecho: 'Completo (Ida e Volta)',
          enderecoResidencia: 'Rua Fictícia, 10, apto 2, CENTRO, Joinville - SC',
          rua: 'Rua Fictícia',
          numero: '10',
          bairro: 'CENTRO',
        }),
      ],
    ]);
    expect(aberto('dmNovoModal')).toBe(false);
    expect(avisos()).toContain('Paciente incluído na fila com sucesso.');
  });

  it('destino Joinville avisa que a demanda não entra na fila desta entrega', async () => {
    await abrirNovo();
    const campoDaRemocao = document.createElement('input');
    campoDaRemocao.id = 'riData';
    document.body.appendChild(campoDaRemocao);
    preencher('#dmNovoNome', 'Paciente Fictícia Local');
    preencher('#dmNovoMat', '900101');
    preencher('#dmNovoTel', '(00) 0000-0000');
    preencher('#dmNovoCidDest', '__outro__', 'change');
    preencher('#dmNovoCidOutro', 'Joinville');
    preencher('#dmNovoHora', '14:00');
    clicar('#dmNovoSalvarBtn');
    await esperar();
    expect(avisos()).toContain('Destino Joinville é remoção interna, que fica fora desta entrega. Esta demanda não entra na fila de viagens externas.');
    expect(campoDaRemocao.value).toBe(DATA_DO_TESTE);
    campoDaRemocao.remove();
  });

  it('erro ao incluir fica na janela e devolve o botão', async () => {
    await abrirNovo();
    apiFalha('/api/operacao/incluir-pedido-digitado', 400, 'Hora inválida. Use HH:MM.');
    preencher('#dmNovoNome', 'Paciente Fictícia');
    preencher('#dmNovoMat', '900102');
    preencher('#dmNovoTel', '(00) 0000-0000');
    preencher('#dmNovoCidDest', 'ITAJAÍ', 'change');
    preencher('#dmNovoHora', '10:00');
    clicar('#dmNovoSalvarBtn');
    await esperar();
    expect(texto('#dmNovoAlertaTxt')).toBe('Erro ao salvar: Hora inválida.');
    expect(texto('#dmNovoAlertaSub')).toBe('Use HH:MM.');
    expect(texto('#dmNovoSalvarBtn')).toBe('Salvar e incluir na fila');
    expect(elemento<HTMLButtonElement>('#dmNovoSalvarBtn').disabled).toBe(false);
  });

  it('o local da consulta sugere os locais conhecidos, com os da cidade escolhida primeiro', async () => {
    await abrirNovo();
    const seletor = '#dmNovoLocCons';
    preencher('#dmNovoCidDest', 'ITAJAÍ', 'change');
    elemento(seletor).dispatchEvent(new Event('focus'));
    expect(textosDe('#dmNovoLocSug .dm-en-sug-nome')[0]).toBe('HOSPITAL FICTÍCIO DO LITORAL');
    preencher(seletor, 'hospital');
    expect(textosDe('#dmNovoLocSug .dm-en-sug-nome')).toEqual(['HOSPITAL FICTÍCIO DO LITORAL', 'HOSPITAL REGIONAL DE EXEMPLO']);
    tecla(seletor, 'ArrowUp');
    expect(elemento('#dmNovoLocSug .dm-en-sug-item:last-child').classList.contains('on')).toBe(true);
    tecla(seletor, 'ArrowDown');
    expect(elemento('#dmNovoLocSug .dm-en-sug-item:first-child').classList.contains('on')).toBe(true);
    tecla(seletor, 'ArrowDown');
    tecla(seletor, 'ArrowDown');
    tecla(seletor, 'Enter');
    expect(elemento<HTMLInputElement>(seletor).value).toBe('HOSPITAL FICTÍCIO DO LITORAL');
    expect(aberto('dmNovoLocSug')).toBe(false);
    // Com a lista fechada, as teclas não fazem nada.
    tecla(seletor, 'ArrowDown');
    preencher(seletor, 'clínica');
    elemento('#dmNovoLocSug .dm-en-sug-item').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(elemento<HTMLInputElement>(seletor).value).toBe('CLÍNICA DE DEMONSTRAÇÃO');
    preencher(seletor, 'centro');
    tecla(seletor, 'Escape');
    expect(aberto('dmNovoLocSug')).toBe(false);
    preencher(seletor, 'nenhum local com este nome');
    expect(aberto('dmNovoLocSug')).toBe(false);
    preencher('#dmNovoCidDest', '', 'change');
    preencher(seletor, '');
    expect(document.querySelectorAll('#dmNovoLocSug .dm-en-sug-item')).toHaveLength(4);
    elemento(seletor).dispatchEvent(new Event('blur'));
    expect(aberto('dmNovoLocSug')).toBe(false);
  });

  it('corrige a demanda digitada à mão pela chave antiga, sem mexer em rua e número', async () => {
    const dados = dia();
    dados.pacientes[0] = {
      ...dados.pacientes[0],
      origemManual: true,
      objetivo: 'Hemodiálise',
      cidade: 'PORTO UNIÃO',
      enderecoEmbarque: 'Ponto antigo',
      trecho: 'Ida',
      quantidade: 'x',
    };
    await abrirDia(dados);
    tela.dmAbrirDrawer('P8');
    clicar(botaoComTexto('#dmDrCorpo', 'Editar'));
    expect(aberto('dmDrawer')).toBe(false);
    expect(texto('#dmNovoTit')).toBe('Editar paciente na fila');
    expect(texto('#dmNovoSub')).toBe('Demanda digitada à mão · 27/11/2026');
    expect(texto('#dmNovoSalvarBtn')).toBe('Salvar alterações');
    expect(elemento<HTMLInputElement>('#dmNovoNome').value).toBe('HEITOR TESTE DA SILVA 007');
    expect(elemento<HTMLSelectElement>('#dmNovoObj').value).toBe('Hemodiálise');
    expect(elemento<HTMLSelectElement>('#dmNovoCidDest').value).toBe('PORTO UNIÃO');
    expect(elemento('#dmNovoCidOutroWrap').style.display).toBe('none');
    expect(textosDe('#dmNovoEmb option')).toContain('Ponto antigo (fora do cadastro)');
    expect(elemento<HTMLInputElement>('#dmNovoQtd').value).toBe('1');
    expect(elemento<HTMLInputElement>('#dmNovoEndCompleto').value).toBe('RUA FICTÍCIA 7, 107');
    preencher('#dmNovoEndCompleto', 'RUA FICTÍCIA 7, 108');
    clicar('#dmNovoSalvarBtn');
    await esperar();
    const [chave, dataBR, payload] = chamadasA('/api/operacao/atualizar-pedido-digitado')[0] as [string, string, Registro];
    expect([chave, dataBR]).toEqual(['D-A7895223', '27/11/2026']);
    expect(payload).toMatchObject({ enderecoResidencia: 'RUA FICTÍCIA 7, 108', rua: null, numero: null, cidade: 'PORTO UNIÃO' });
    expect(avisos()).toContain('Demanda atualizada.');
    expect(estado().novoEditando).toBeNull();
  });

  // Defeito herdado do Apps Script, corrigido em 26/11/2026: um '+' no começo da linha virava mais unário sobre o
  // trecho gravado, e o select abria sempre em 'Completo (Ida e Volta)'.
  it('ao corrigir a demanda, o trecho gravado continua escolhido', async () => {
    const dados = dia();
    dados.pacientes[0] = { ...dados.pacientes[0], origemManual: true, trecho: 'Ida' };
    await abrirDia(dados);
    tela.dmAbrirModalNovoPaciente('P8');
    expect(elemento<HTMLSelectElement>('#dmNovoTrecho').value).toBe('Ida');
  });

  it('sem a estrela no cadastro, o embarque padrão é achado pelo nome, e cidades antigas entram na lista', async () => {
    const dados = dia();
    dados.embarquePadrao = '';
    dados.cidadesHistoricas = ['BLUMENAU', 'LAGES', ''];
    await abrirDia(dados);
    expect(tela.dmEmbarquePadrao()).toBe('Secretaria da Saúde');
    clicar('#dmBtnNovoPac');
    expect(textosDe('#dmNovoCidDest option')).toEqual([
      'Selecione a cidade...', 'BLUMENAU', 'CURITIBA', 'FLORIANÓPOLIS', 'ITAJAÍ', 'LAGES', '+ Outra cidade (digitar)...',
    ]);
    const semSecretaria = dia();
    semSecretaria.embarquePadrao = 'Ponto desativado';
    semSecretaria.locaisEmbarque = ['Terminal Central'];
    await abrirDia(semSecretaria);
    expect(tela.dmEmbarquePadrao()).toBe('');
  });

  it('só a demanda digitada à mão pode ser corrigida', async () => {
    await abrirDia();
    tela.dmAbrirModalNovoPaciente('NAO-EXISTE');
    expect(avisos()).toContain('Paciente não encontrado. Recarregue a tela.');
    tela.dmAbrirModalNovoPaciente('P8');
    expect(avisos()).toContain('Só dá para editar demanda digitada à mão.');
    expect(aberto('dmNovoModal')).toBe(false);
  });
});
