import { apiFalha, apiFalsa, carregarTelas, chamadasA, clicar, esperar, limparChamadas, tela, texto } from './preparar-telas';
import {
  abrirDia,
  aberto,
  avisos,
  botaoComTexto,
  type Carro,
  DATA_DO_TESTE,
  dia,
  elemento,
  estado,
  marcar,
  montagem,
  preencher,
  tecla,
  type Registro,
} from './viagens-externas-ajuda';

function textosDe(seletor: string): string[] {
  return Array.from(document.querySelectorAll(seletor)).map((el) => (el.textContent ?? '').trim());
}

// O card de um carro do dia, pela placa.
function cardDe(placa: string): HTMLElement {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('#dmCorpo .card-veiculo'));
  const achado = cards.find((c) => c.querySelector('.placa-badge')?.textContent === placa);
  if (!achado) throw new Error(`Carro ${placa} não encontrado`);
  return achado;
}

function botaoDoCard(placa: string, rotulo: string): HTMLButtonElement {
  const botao = Array.from(cardDe(placa).querySelectorAll<HTMLButtonElement>('.dm-cs-btn')).find((b) => (b.textContent ?? '').includes(rotulo));
  if (!botao) throw new Error(`Botão ${rotulo} não encontrado no carro ${placa}`);
  return botao;
}

async function abrirCarros(dados = dia()): Promise<void> {
  await abrirDia(dados);
  clicar('#dmModoCarros');
}

function payloadDaEdicao(): Registro {
  const chamada = chamadasA('/api/operacao/editar-carro')[0] as unknown[];
  return chamada[2] as Registro;
}

describe('Viagens Externas: carros do dia', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('lista os carros gravados pela hora de saída, recolhidos, com ocupação e avisos', async () => {
    await abrirCarros();
    expect(elemento('#dmModoCarros').classList.contains('on')).toBe(true);
    expect(elemento('#demandas').classList.contains('modo-carros')).toBe(true);
    expect(aberto('dmBarra')).toBe(false);
    expect(textosDe('#dmCorpo .placa-badge')).toEqual(['TST1A01', 'TST1A03', 'TST2B01']);
    expect(texto('#dmCorpo .dm-lacen')).toContain('LACEN');
    const spin = cardDe('TST1A01');
    expect(spin.querySelector('.cv-topo')?.classList.contains('recolhido')).toBe(true);
    expect(spin.textContent).toContain('AVISO URGENTE');
    expect(spin.textContent).toContain('Levar a cadeira de rodas');
    expect(spin.querySelector('.motorista-label')?.textContent).toBe('ANTÔNIO FICTÍCIO DA SILVA / 2º a definir2 motoristas');
    expect(spin.querySelector('.vagas-badge')?.textContent).toBe('3 livre(s)');
    expect(spin.textContent).toContain('1 de 2 confirmado(s)');
    expect(spin.querySelector('.cv-rota')?.textContent).toBe('Joinville › ITAJAÍ › FLORIANÓPOLIS · Saída Secretaria da Saúde');
    expect(textosDe('#dmCorpo .card-veiculo:first-child .cp-n-hora')).toEqual(['07:30', '13:00']);
    expect(spin.querySelector('.dm-cs-conf.ok')?.textContent).toBe('Confirmado');
    const terc = cardDe('TST2B01');
    expect(terc.querySelector('.cat-badge')?.textContent).toBe('Terc');
    expect(terc.textContent).toContain('Bloqueado 1');
    expect(terc.querySelector('.vagas-badge')?.textContent).toBe('4 livre(s)');
    expect(cardDe('TST1A03').querySelector('.motorista-label')?.textContent).toBe('(Sem motorista)');
    // O resumo do topo vale nos dois modos.
    expect(texto('#dmResumo')).toContain('3 carro(s) · 4 pac');
  });

  it('clicar no topo do carro abre e fecha o card', async () => {
    await abrirCarros();
    clicar(elemento('.cv-topo', cardDe('TST1A03')));
    expect(estado().carrosAbertos).toEqual({ FCC4B796: true });
    expect(cardDe('TST1A03').querySelector('.cv-corpo')?.classList.contains('recolhido')).toBe(false);
    clicar(elemento('.cv-topo', cardDe('TST1A03')));
    expect(estado().carrosAbertos).toEqual({});
  });

  it('os filtros e a busca valem para os carros, e a busca acha placa e motorista', async () => {
    await abrirCarros();
    preencher('#dmFCidade', 'CURITIBA', 'change');
    expect(textosDe('#dmCorpo .placa-badge')).toEqual(['TST1A03']);
    expect(texto('#dmModoCarrosN')).toBe('1');
    preencher('#dmFCidade', '', 'change');
    preencher('#dmBusca', 'antônio');
    expect(textosDe('#dmCorpo .placa-badge')).toEqual(['TST1A01']);
    preencher('#dmBusca', 'tst2b01');
    expect(textosDe('#dmCorpo .placa-badge')).toEqual(['TST2B01']);
    preencher('#dmBusca', 'cecília');
    expect(textosDe('#dmCorpo .placa-badge')).toEqual(['TST2B01']);
    // A placa procurada dentro de outra cidade não aparece.
    preencher('#dmFCidade', 'CURITIBA', 'change');
    preencher('#dmBusca', 'tst2b01');
    expect(texto('#dmCorpo')).toContain('Nenhum carro com os filtros atuais.');
    expect(texto('#dmCorpo')).toContain('São 3 carro(s) montado(s) nesta data.');
    clicar('#dmModoFila');
    expect(elemento('#demandas').classList.contains('modo-carros')).toBe(false);
  });

  it('o card mostra cheio, excedido, pedido cancelado, servidor e carro sem destino', async () => {
    const dados = dia();
    const base = dados.veiculosSalvos[0] as Carro;
    const passageiro = base.passageiros[0] as Registro;
    dados.veiculosSalvos = [
      { ...base, idViagem: 'V1', placa: 'TST3C01', limite: 1, horaEmbarque: '', roteiro: [], destino: '' },
      {
        ...base,
        idViagem: 'V2',
        placa: 'TST3C02',
        limite: 1,
        roteiro: [],
        destino: 'CURITIBA',
        localEmbarque: '',
        categoria: 'publico',
        passageiros: [
          { ...passageiro, quantidade: 2, nascimento: '1950-01-01', pedidoCancelado: true, observacao: 'Cadeirante', enderecoEmbarque: 'Terminal Central', statusConfirmacao: '' },
          { ...passageiro, id: 'S-X', nome: '-', matricula: '-', servidorNome: 'Servidora Fictícia', nascimento: '', hora: '', cidade: '', bairro: '', local: '' },
        ],
      },
      // A viagem do LACEN chega com a linha de carga no lugar dos passageiros, como o servidor grava.
      {
        ...base,
        idViagem: 'V3',
        placa: 'TST1A06',
        tipo: 'FURGÃO LACEN',
        passageiros: [{ ...passageiro, matricula: 'N/A', nome: 'Carga / Insumos (Sem Pacientes)', quantidade: 0 }],
      },
      { ...base, idViagem: 'V4', placa: 'TST3C04', limite: 0 },
    ];
    await abrirCarros(dados);
    expect(cardDe('TST3C01').querySelector('.vagas-badge')?.textContent).toBe('Cheio');
    expect(cardDe('TST3C01').querySelector('.cv-hora-saida')?.classList.contains('vazia')).toBe(true);
    expect(cardDe('TST3C01').querySelector('.cv-rota')?.textContent).toBe('sem destino');
    expect(botaoDoCard('TST3C01', 'Encaixe').title).toBe('Carro sem vaga livre');
    const excedido = cardDe('TST3C02');
    expect(excedido.querySelector('.vagas-badge')?.textContent).toBe('Excedido por 2');
    expect(excedido.querySelector('.cv-rota')?.textContent).toBe('Joinville › CURITIBA');
    expect(excedido.textContent).toContain('PEDIDO CANCELADO');
    expect(excedido.querySelector('.alerta-pill.a-perigo')?.getAttribute('title')).toBe('A UBSF cancelou este pedido depois que o carro foi montado. Confira antes de sair.');
    expect(excedido.textContent).toContain('Idoso (acompanhante OK)');
    expect(excedido.textContent).toMatch(/\d+ anos • AMÉRICA/);
    expect(excedido.textContent).toContain('Embarque: Terminal Central');
    expect(excedido.querySelector('.obs-texto')?.textContent).toBe('Cadeirante');
    expect(excedido.querySelector('.dm-selo-serv')).not.toBeNull();
    expect(excedido.textContent).toContain('Servidora Fictícia');
    expect(excedido.textContent).toContain('Pendente');
    expect(botaoDoCard('TST1A06', 'Encaixe').disabled).toBe(true);
    expect(botaoDoCard('TST1A06', 'Encaixe').title).toBe('O furgão do LACEN não leva paciente');
    expect(cardDe('TST3C04').querySelector('.seg-ocupado')?.getAttribute('style')).toBe('width:0%');
  });
});

describe('Viagens Externas: editar carro gravado', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('abre o carro com os dados gravados e salva pelo id da viagem', async () => {
    await abrirCarros();
    clicar(botaoDoCard('TST1A01', 'Editar'));
    expect(aberto('dmModal')).toBe(true);
    expect(texto('#dmMoTit')).toBe('Editar o carro');
    expect(texto('#dmMoSub')).toBe('Editando TST1A01 · 2 paciente(s) · 3 passageiro(s)');
    expect(elemento<HTMLInputElement>('#dmMoCorpo input[type="time"]').value).toBe('04:30');
    expect(elemento<HTMLTextAreaElement>('#dmMoAviso').value).toBe('Levar a cadeira de rodas');
    expect(elemento<HTMLInputElement>('#dmMoDois').checked).toBe(true);
    expect(texto('#dmMoNext')).toBe('Salvar alterações');
    expect(texto('#dmMoDica')).toBe('TST1A01 · SPIN · 3 de 6 lugares');
    expect(textosDe('#dmMoCorpo .rt-chip:not(.origem) .rt-chip-cidade').map((t) => t.replace(/^\d{2}:\d{2}\s*/, ''))).toEqual(['ITAJAÍ', 'FLORIANÓPOLIS']);
    // No carro gravado, o card do passageiro não abre a ficha da fila.
    expect(document.querySelector('#dmMoCorpo .chip-passageiro-novo[onclick]')).toBeNull();

    // Os passageiros vieram sem local de embarque: salvar pede antes.
    clicar('#dmMoNext');
    expect(texto('#dmCfmTit')).toBe('Falta o local de embarque');
    expect(texto('#dmCfmCorpo')).toContain('GABRIELA TESTE DA SILVA 006');
    expect(texto('#dmCfmCorpo')).toContain('ELISA MODELO DA SILVA 004');
    tela.dmFecharConfirma();
    for (const id of ['S-900006', 'S-900004']) {
      preencher(`#dmMoCorpo select[onchange*="dmEmbarquePaciente('${id}'"]`, 'Terminal Central', 'change');
    }
    preencher('#dmMoAviso', 'Levar a cadeira de rodas e o oxigênio');
    clicar('#dmMoNext');
    expect(texto('#dmMoNext')).toBe('Salvando...');
    expect(texto('#dmMoDica')).toBe('Gravando no sistema...');
    await esperar();
    const chamada = chamadasA('/api/operacao/editar-carro')[0] as unknown[];
    expect(chamada[0]).toBe(DATA_DO_TESTE);
    expect(chamada[1]).toBe('TST1A01');
    expect(chamada[4]).toBe('5972C41D');
    expect(payloadDaEdicao()).toEqual({
      horaSaida: '04:30',
      localEmbarque: 'Secretaria da Saúde',
      roteiro: ['ITAJAÍ', 'FLORIANÓPOLIS'],
      destino: 'FLORIANÓPOLIS',
      bloqueados: 0,
      aviso: 'Levar a cadeira de rodas e o oxigênio',
      doisMotoristas: true,
      removerMatriculas: [],
      encaixar: [],
      embarques: { '900006': 'Terminal Central', '900004': 'Terminal Central' },
      servidores: {},
    });
    expect(aberto('dmModal')).toBe(false);
    expect(avisos()).toContain('Carro TST1A01 atualizado.');
  });

  it('tirar um passageiro manda a identidade dele para remover, e esvaziar é permitido', async () => {
    await abrirCarros();
    clicar(botaoDoCard('TST2B01', 'Editar'));
    preencher('#dmMoCorpo select[onchange*="dmEmbarquePaciente"]', 'Terminal Central', 'change');
    clicar(elemento('#dmMoCorpo .btn-remover'));
    expect(texto('#dmMoCorpo')).toContain('Nenhum paciente neste carro.');
    // Editando, carro vazio é legítimo: desfaz o carro no servidor.
    expect(elemento<HTMLButtonElement>('#dmMoNext').disabled).toBe(false);
    clicar(botaoComTexto('#dmMoAcoes', 'Salvar alterações'));
    await esperar();
    expect(payloadDaEdicao()).toMatchObject({ removerMatriculas: ['900002'], doisMotoristas: false, bloqueados: 1 });
  });

  it('se a edição não grava, o botão volta e o operador é avisado', async () => {
    await abrirCarros();
    apiFalha('/api/operacao/editar-carro', 409, 'Outra pessoa mexeu neste carro');
    clicar(botaoDoCard('TST1A03', 'Editar'));
    clicar('#dmMoNext');
    await esperar();
    expect(texto('#dmMoNext')).toBe('Salvar alterações');
    expect(texto('#dmMoDica')).toBe('Não gravou.');
    expect(avisos()).toContain('Não gravou. Outra pessoa mexeu neste carro');
    clicar(botaoComTexto('#dmMoAcoes', 'Cancelar'));
    expect(aberto('dmModal')).toBe(false);
  });

  it('servidor no carro gravado precisa de nome e matrícula antes de salvar', async () => {
    const dados = dia();
    const carro = dados.veiculosSalvos[0] as Carro;
    carro.passageiros = [{ ...carro.passageiros[0], id: 'S-SERV', nome: '-', matricula: '-', objetivo: 'Curso', chaveDemanda: 'D-SERV9' }];
    await abrirCarros(dados);
    clicar(botaoDoCard('TST1A03', 'Editar'));
    clicar('#dmMoNext');
    expect(texto('#dmCfmTit')).toBe('Falta identificar o servidor');
    tela.dmFecharConfirma();
    const [nome, matricula] = Array.from(document.querySelectorAll<HTMLInputElement>('#dmMoCorpo .dm-serv-in'));
    preencher(nome as HTMLInputElement, 'Servidor Fictício');
    preencher(matricula as HTMLInputElement, '700003');
    clicar('#dmMoNext');
    await esperar();
    expect(payloadDaEdicao().servidores).toEqual({ '#D-SERV9': { nome: 'Servidor Fictício', matricula: '700003' } });
  });

  it('carro sem roteiro gravado usa o destino, e sem aviso no estado manda nulo', async () => {
    const dados = dia();
    const carro = dados.veiculosSalvos[0] as Carro;
    carro.roteiro = 'CURITIBA';
    carro.categoria = 'terceirizado';
    await abrirCarros(dados);
    clicar(botaoDoCard('TST1A03', 'Editar'));
    montagem().aviso = null;
    clicar('#dmMoNext');
    await esperar();
    expect(payloadDaEdicao()).toMatchObject({ roteiro: ['CURITIBA'], aviso: null, doisMotoristas: false });
  });

  it('carro que sumiu da tela não abre para editar nem estornar', async () => {
    await abrirCarros();
    tela.dmEditarCarro('TST9Z99', 'NAO-EXISTE');
    expect(aberto('dmModal')).toBe(false);
    tela.dmEstornarCarro('TST9Z99', '');
    expect(aberto('dmCfm')).toBe(false);
    expect(avisos()).toContain('Carro não encontrado. Recarregue a tela.');
    // Sem id da viagem, a placa basta.
    tela.dmEditarCarro('TST1A03', '');
    expect(texto('#dmMoSub')).toContain('Editando TST1A03');
  });
});

describe('Viagens Externas: estornar carro', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('estornar avisa quantas ligações se perdem e devolve os pacientes selecionados à fila', async () => {
    await abrirCarros();
    clicar(botaoDoCard('TST1A01', 'Estornar'));
    expect(texto('#dmCfmTit')).toBe('Estornar TST1A01');
    expect(texto('#dmCfmCorpo')).toContain('2 paciente(s)');
    expect(texto('#dmCfmCorpo')).toContain('1 confirmação(ões) por telefone será(ão) perdida(s).');
    const depois = dia();
    depois.veiculosSalvos = depois.veiculosSalvos.filter((v) => v.placa !== 'TST1A01');
    const carro = dia().veiculosSalvos.find((v) => v.placa === 'TST1A01') as Carro;
    depois.pacientes.push(...carro.passageiros.map((p, i) => ({ ...p, id: 'P' + (40 + i) })));
    apiFalsa('/api/operacao/desfazer-carro', () => structuredClone(depois));
    clicar('#dmCfmOk');
    expect(texto('#dmCfmOk')).toBe('Estornando...');
    await esperar();
    expect(chamadasA('/api/operacao/desfazer-carro')).toEqual([[DATA_DO_TESTE, 'TST1A01', expect.any(String), '5972C41D']]);
    expect(estado().modo).toBe('fila');
    expect(estado().selecionados).toEqual({ P40: true, P41: true });
    expect(aberto('dmBarra')).toBe(true);
    expect(avisos()).toContain('Carro TST1A01 estornado. 2 paciente(s) de volta na fila, já selecionados.');
  });

  it('carro sem ligação feita diz que nada de telefone se perde, e erro mantém a janela', async () => {
    await abrirCarros();
    apiFalha('/api/operacao/desfazer-carro', 500, 'Planilha ocupada');
    clicar(botaoDoCard('TST1A03', 'Estornar'));
    expect(texto('#dmCfmCorpo')).toContain('Nenhuma ligação registrada neste carro');
    clicar('#dmCfmOk');
    await esperar();
    expect(aberto('dmCfm')).toBe(true);
    expect(texto('#dmCfmOk')).toBe('Estornar carro');
    expect(avisos()).toContain('Não estornou. Planilha ocupada');
  });
});

describe('Viagens Externas: encaixe em carro já montado', () => {
  beforeAll(carregarTelas);
  beforeEach(limparChamadas);

  it('da fila: mostra quem vai para a rota do carro e leva o escolhido para a edição', async () => {
    await abrirCarros();
    clicar(botaoDoCard('TST1A03', 'Encaixe'));
    expect(aberto('dmEnModal')).toBe(true);
    expect(texto('#dmEnTit')).toBe('Encaixe em TST1A03');
    expect(texto('#dmEnSub')).toBe('ARGO · saída 05:30 · CURITIBA · 3 vaga(s) livre(s)');
    expect(textosDe('#dmEnCidade option')).toEqual(['Todas', 'CURITIBA', 'FLORIANÓPOLIS', 'ITAJAÍ']);
    expect(textosDe('#dmEnCorpo .dm-en-nome')).toEqual(['HEITOR TESTE DA SILVA 007']);
    expect(texto('#dmEnDica')).toBe('3 vaga(s) livre(s) neste carro.');
    expect(elemento<HTMLButtonElement>('#dmEnOk').disabled).toBe(true);
    marcar('#dmEnSoRota', false);
    expect(textosDe('#dmEnCorpo .dm-en-nome')).toEqual(['HEITOR TESTE DA SILVA 007', 'DIEGO EXEMPLO DA SILVA 003']);
    preencher('#dmEnBusca', 'diego');
    expect(textosDe('#dmEnCorpo .dm-en-nome')).toEqual(['DIEGO EXEMPLO DA SILVA 003']);
    preencher('#dmEnBusca', '');
    preencher('#dmEnCidade', 'ITAJAÍ', 'change');
    expect(textosDe('#dmEnCorpo .dm-en-nome')).toEqual(['DIEGO EXEMPLO DA SILVA 003']);
    preencher('#dmEnCidade', 'FLORIANÓPOLIS', 'change');
    expect(texto('#dmEnCorpo')).toContain('Ninguém na fila com esse filtro.');
    preencher('#dmEnCidade', '', 'change');
    marcar('#dmEnCorpo input[onchange*="P8"]');
    marcar('#dmEnCorpo input[onchange*="P4"]');
    expect(texto('#dmEnDica')).toBe('2 paciente(s) · 3 pessoa(s) para 3 vaga(s).');
    marcar('#dmEnCorpo input[onchange*="P4"]', false);
    expect(elemento('#dmEnCorpo tr.sel').textContent).toContain('HEITOR');
    clicar('#dmEnOk');
    expect(aberto('dmEnModal')).toBe(false);
    expect(estado().encaixe).toBeNull();
    expect(texto('#dmMoSub')).toBe('Editando TST1A03 · 2 paciente(s) · 2 passageiro(s) · 1 novo(s)');
    preencher('#dmMoCorpo input[type="time"]', '05:30');
    clicar('#dmMoNext');
    await esperar();
    const encaixados = payloadDaEdicao().encaixar as Registro[];
    expect(encaixados).toHaveLength(1);
    expect(encaixados[0]).toMatchObject({ matricula: '900007', chaveDemanda: 'D-A7895223', quantidade: 1, enderecoEmbarque: 'Secretaria da Saúde', cidade: 'CURITIBA' });
  });

  it('o encaixe que não cabe não continua, e o compromisso antes da saída fica em vermelho', async () => {
    const dados = dia();
    dados.pacientes.push({ ...dados.pacientes[0], id: 'P50', quantidade: 5, hora: '05:00', nome: 'PACIENTE CEDO FICTÍCIO' });
    await abrirCarros(dados);
    clicar(botaoDoCard('TST1A03', 'Encaixe'));
    const linhaCedo = elemento('#dmEnCorpo input[onchange*="P50"]').closest('tr') as HTMLElement;
    expect(linhaCedo.querySelector('.dm-en-hora.tarde')?.getAttribute('title')).toBe('O compromisso é antes da saída do carro');
    marcar('#dmEnCorpo input[onchange*="P50"]');
    expect(texto('#dmEnDica')).toContain('NÃO CABE.');
    expect(elemento<HTMLButtonElement>('#dmEnOk').disabled).toBe(true);
    tela.dmEncaixeSel('P50', false);
    tela.dmEncaixeContinuar();
    expect(aberto('dmEnModal')).toBe(true);
    clicar(elemento('#dmEnModal .dm-mo-x'));
    expect(aberto('dmEnModal')).toBe(false);
  });

  it('à mão: confere os campos obrigatórios e leva o paciente novo para a edição', async () => {
    await abrirCarros();
    clicar(botaoDoCard('TST1A03', 'Encaixe'));
    clicar('#dmEnTabMao');
    expect(elemento('#dmEnTabMao').classList.contains('on')).toBe(true);
    expect(elemento('#dmEnBarra').style.display).toBe('none');
    expect(elemento<HTMLSelectElement>('#dmEnCidDest').value).toBe('CURITIBA');
    expect(elemento<HTMLSelectElement>('#dmEnEmb').value).toBe('Secretaria da Saúde');
    expect(texto('#dmEnDica')).toBe('1 pessoa(s) para 3 vaga(s).');
    const tentar = (): string => {
      clicar('#dmEnOkMao');
      return texto('#dmEnAlertaTxt');
    };
    expect(tentar()).toBe('Falta o nome do paciente.');
    preencher('#dmEnNome', 'Paciente Fictício de Última Hora');
    expect(tentar()).toBe('Falta a matrícula do paciente.');
    preencher('#dmEnMat', '900200');
    expect(tentar()).toBe('Faltam os telefones.');
    preencher('#dmEnTel', '(00) 0000-0000');
    expect(tentar()).toBe('Falta a hora do compromisso.');
    preencher('#dmEnHora', '09:00');
    preencher('#dmEnEmb', '', 'change');
    expect(tentar()).toBe('Falta o local de embarque.');
    preencher('#dmEnEmb', 'Terminal Central', 'change');
    preencher('#dmEnQtd', '9');
    expect(texto('#dmEnDica')).toMatch(/^9 pessoa\(s\) para 3 vaga\(s\) .+ NÃO CABE\.$/);
    expect(elemento<HTMLButtonElement>('#dmEnOkMao').disabled).toBe(true);
    preencher('#dmEnQtd', '2');
    preencher('#dmEnRua', 'Rua Fictícia');
    preencher('#dmEnNum', 'S/N');
    preencher('#dmEnBairro', 'CENTRO');
    preencher('#dmEnCidRes', '');
    preencher('#dmEnUF', '');
    clicar('#dmEnOkMao');
    expect(aberto('dmEnModal')).toBe(false);
    const novo = (montagem().pacs as Registro[]).find((p) => String(p.id).startsWith('M-')) as Registro;
    expect(novo).toMatchObject({
      __novo: true,
      nome: 'Paciente Fictício de Última Hora',
      quantidade: 2,
      cidade: 'CURITIBA',
      enderecoEmbarque: 'Terminal Central',
      enderecoResidencia: 'Rua Fictícia, S/N, CENTRO, Joinville - SC',
    });
    expect(texto('#dmMoSub')).toContain('1 novo(s)');
    // Tirar o recém-encaixado não manda nada para remover: ele ainda não está gravado.
    clicar(elemento(`#dmMoCorpo .btn-remover[onclick*="'${String(novo.id)}'"]`));
    expect(montagem().removidos).toEqual([]);
  });

  it('o encaixe que passa da lotação trava o salvar da edição', async () => {
    const dados = dia();
    dados.pacientes.push({ ...dados.pacientes[0], id: 'P51', quantidade: 3 });
    await abrirCarros(dados);
    tela.dmAbrirEncaixe('TST1A03', 'FCC4B796');
    tela.dmEncaixeSel('P51', true);
    tela.dmEncaixeContinuar();
    clicar(elemento('#dmMoCorpo .stepper button[aria-label="Mais"]'));
    expect(montagem().bloqueados).toBe(0);
    montagem().bloqueados = 1;
    tela.dmModalPe();
    expect(texto('#dmMoDica')).toBe('Não cabe: 3 lugar(es) para 4 pessoa(s). Tire alguém do carro.');
    tela.dmSalvarEdicao();
    expect(avisos()).toContain('Não cabe');
    expect(chamadasA('/api/operacao/editar-carro')).toEqual([]);
  });

  it('o local da consulta sugere primeiro os locais das cidades do carro, com teclado', async () => {
    await abrirCarros();
    clicar(botaoDoCard('TST1A01', 'Encaixe'));
    clicar('#dmEnTabMao');
    const seletor = '#dmEnLocCons';
    elemento(seletor).dispatchEvent(new Event('focus'));
    expect(textosDe('#dmEnLocSug .dm-en-sug-nome')).toEqual([
      'HOSPITAL FICTÍCIO DO LITORAL',
      'HOSPITAL REGIONAL DE EXEMPLO',
      'CENTRO DE ESPECIALIDADES MODELO',
      'CLÍNICA DE DEMONSTRAÇÃO',
    ]);
    preencher(seletor, 'regional');
    expect(textosDe('#dmEnLocSug .dm-en-sug-nome')).toEqual(['HOSPITAL REGIONAL DE EXEMPLO']);
    tecla(seletor, 'Enter');
    expect(elemento<HTMLInputElement>(seletor).value).toBe('regional');
    tecla(seletor, 'ArrowDown');
    tecla(seletor, 'ArrowDown');
    tecla(seletor, 'ArrowUp');
    tecla(seletor, 'ArrowUp');
    tecla(seletor, 'Enter');
    expect(elemento<HTMLInputElement>(seletor).value).toBe('HOSPITAL REGIONAL DE EXEMPLO');
    tecla(seletor, 'Escape');
    preencher(seletor, 'centro');
    tecla(seletor, 'Escape');
    expect(aberto('dmEnLocSug')).toBe(false);
    preencher(seletor, 'clínica');
    elemento('#dmEnLocSug .dm-en-sug-item').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(elemento<HTMLInputElement>(seletor).value).toBe('CLÍNICA DE DEMONSTRAÇÃO');
    preencher(seletor, 'local que não existe');
    expect(aberto('dmEnLocSug')).toBe(false);
    elemento(seletor).dispatchEvent(new Event('blur'));
    clicar('#dmEnTabFila');
    expect(elemento('#dmEnBarra').style.display).toBe('');
  });

  it('carro que saiu da tela fecha o encaixe com aviso', async () => {
    await abrirCarros();
    tela.dmAbrirEncaixe('TST9Z99', 'NAO-EXISTE');
    expect(avisos()).toContain('Este carro não está mais na tela. Recarregue.');
    expect(aberto('dmEnModal')).toBe(false);
    clicar(botaoDoCard('TST1A03', 'Encaixe'));
    const semCarro = dia();
    semCarro.veiculosSalvos = [];
    tela.dmCarregar(semCarro);
    tela.dmEnLocalDigitou('x');
    tela.dmEncaixePeMao();
    tela.dmEncaixeRender();
    expect(aberto('dmEnModal')).toBe(false);
    expect(avisos()).toContain('Este carro saiu da tela. Recarregue.');
    // Sem encaixe aberto, nada acontece.
    tela.dmEncaixeAba('fila');
    tela.dmEncaixeBuscar('x');
    tela.dmEncaixeSel('P8', true);
    tela.dmEncaixeGravarMao();
    tela.dmEncaixeContinuar();
    tela.dmEncaixePeMao();
    tela.dmEnLocalDigitou('x');
    expect(tela.dmEncaixeMarcados()).toEqual([]);
    tela.dmAcrescentarNaEdicao([]);
    expect(estado().encaixe).toBeNull();
  });
});
