// Tela Configurações (fluxo 2): cadastro de veículos, motoristas, locais de embarque, calendário e padronização.
import { apiFalha, apiFalsa, carregarTelas, chamadasA, clicar, esperar, esquecerChamadas, limparChamadas, tela, texto } from './preparar-telas';

const CADASTROS = {
  veiculos: [
    { _key: 'TST1A01', placa: 'TST1A01', tipo: 'SPIN', assentos: 6, propriedade: 'Público', status: 'Ativo', motivo: '', observacao: '' },
    { _key: 'TST2B01', placa: 'TST2B01', tipo: 'SPIN', assentos: 6, propriedade: 'Terceirizado', status: 'Ativo', motivo: '', observacao: '' },
    { _key: 'TST2B02', placa: 'TST2B02', tipo: 'VAN', assentos: 12, propriedade: 'Terceirizado', status: 'Ativo', motivo: '', observacao: '' },
    { _key: 'TST2B03', placa: 'TST2B03', tipo: 'VAN', assentos: 12, propriedade: 'Terceirizado', status: 'Inativo', motivo: 'Manutenção', observacao: '' },
    { _key: 'TST9B99', placa: 'TST9B99', tipo: 'ARGO', assentos: 4, propriedade: 'Público', status: 'Inativo', motivo: 'Baixado', observacao: '' },
  ],
  motoristas: [
    { _key: 'ANA SERVIDORA', nome: 'ANA SERVIDORA', vinculo: 'Servidor', placaVinculada: '', status: 'Ativo', whatsapp: '0000000000', motivo: '', observacao: '' },
    { _key: 'GUSTAVO TERCEIRO', nome: 'GUSTAVO TERCEIRO', vinculo: 'Terceirizado', placaVinculada: 'TST2B01', status: 'Ativo', whatsapp: '', motivo: '', observacao: '' },
    { _key: 'HELENA SEM CARRO', nome: 'HELENA SEM CARRO', vinculo: 'Terceirizado', placaVinculada: 'TST2B03', status: 'Ativo', whatsapp: '', motivo: '', observacao: '' },
    { _key: 'IGOR ANTIGO', nome: 'IGOR ANTIGO', vinculo: 'Servidor', placaVinculada: '', status: 'Inativo', whatsapp: '', motivo: 'Não disponível', observacao: '' },
  ],
  locais: [
    { _key: 'Secretaria da Saúde', local: 'Secretaria da Saúde', status: 'Ativo', motivo: '', padrao: true, trava: '' },
    { _key: 'Terminal Central', local: 'Terminal Central', status: 'Ativo', motivo: '', padrao: false, trava: '' },
    { _key: 'Endereço do paciente', local: 'Endereço do paciente', status: 'Ativo', motivo: '', padrao: false, trava: 'sentinela' },
  ],
  calendario: [
    { _key: '25/12/2026', data: '25/12/2026', tipo: 'Feriado', descricao: 'Natal', bloco: '' },
    { _key: '31/12/2026', data: '31/12/2026', tipo: 'Recesso', descricao: 'Fim de ano', bloco: 'Fim de ano 31/12/2026' },
    { _key: '01/01/2027', data: '01/01/2027', tipo: 'Recesso', descricao: 'Fim de ano', bloco: 'Fim de ano 31/12/2026' },
  ],
};
const PADRONIZACOES = [
  { cidadeOrig: 'FLORIANÓPOLIS', localOrig: 'HOSP. REGIONAL', cidadePad: 'FLORIANÓPOLIS', localPad: 'HOSPITAL REGIONAL', quem: 'Gestora', quando: '26/11/2026', origem: 'sugestao_dicionario' },
  { cidadeOrig: 'CURITIBA', localOrig: 'CLINICA', cidadePad: 'CURITIBA', localPad: 'CLINICA', quem: '', quando: '', origem: 'mantido_original' },
  { cidadeOrig: 'BLUMENAU', localOrig: 'CENTRO', cidadePad: 'BLUMENAU', localPad: 'CENTRO MODELO', quem: 'Gestora', quando: '', origem: 'outra' },
];

// O título da janela é escrito com innerText, que o jsdom guarda à parte do textContent.
function titulo(): string {
  return (document.getElementById('modalConfigTitle') as HTMLElement).innerText;
}

function linhas(tipo: string): string[] {
  return Array.from(document.querySelectorAll(`#tbody-${tipo} tr`)).map((tr) => tr.textContent ?? '');
}

function valor(id: string, novo?: string): string {
  const campo = document.getElementById(id) as HTMLInputElement;
  if (novo !== undefined) {
    campo.value = novo;
    campo.dispatchEvent(new Event('change'));
  }
  return campo.value;
}

async function recarregar() {
  tela.configCarregada = false;
  tela.carregarAba3();
  await esperar();
}

describe('Configurações', () => {
  beforeAll(carregarTelas);
  beforeEach(async () => {
    limparChamadas();
    apiFalsa('/api/cadastros/dados', () => structuredClone(CADASTROS));
    apiFalsa('/api/cadastros/padronizacoes', () => structuredClone(PADRONIZACOES));
    tela.aba3MostrarBaixados = false;
    await recarregar();
    esquecerChamadas();
  });

  it('desenha as três tabelas e o calendário, e esconde quem tem baixa até pedir', async () => {
    expect(linhas('veiculos').length).toBe(4);
    expect(linhas('motoristas').join(' ')).toContain('veículo em Manutenção · precisa de reposição');
    expect(linhas('locais').join(' ')).toContain('do sistema');
    expect(linhas('locais').join(' ')).toContain('Padrão');
    expect(linhas('calendario')[0]).toContain('sexta');
    expect(linhas('calendario')[1]).toContain('2 dia(s)');
    expect(texto('#baixados-veiculos')).toContain('Mostrar 1 com baixa');
    clicar('#baixados-veiculos button');
    expect(linhas('veiculos').length).toBe(5);
    expect(document.querySelector('#tbody-veiculos .linha-baixada')).not.toBeNull();
    tela.iniciarAba3();
    expect(chamadasA('/api/cadastros/dados')).toEqual([]);
  });

  it('carregar com erro avisa e deixa tentar de novo; tabela vazia diz que não há registro', async () => {
    apiFalha('/api/cadastros/dados', 500, 'Banco fora do ar');
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await recarregar();
    expect(texto('#toastArea')).toContain('Erro ao carregar banco de configurações.');
    expect(tela.configCarregada).toBe(false);
    erro.mockRestore();
    tela.dbConfig = { veiculos: [], motoristas: [], locais: [], calendario: [] };
    tela.aba3RenderTudo();
    expect(linhas('veiculos')[0]).toContain('Nenhum registro encontrado.');
    expect(linhas('calendario')[0]).toContain('Nenhum dia cadastrado.');
  });

  it('troca de sub-aba pelo clique e carrega a padronização só quando ela abre', async () => {
    const abas = document.querySelectorAll('#aba3 .ds-aba');
    const aba = Array.from(abas).find((b) => b.getAttribute('onclick')?.includes("'padronizacao'")) as HTMLElement;
    aba.click();
    await esperar();
    expect(document.getElementById('sec-padronizacao')?.classList.contains('ativo')).toBe(true);
    expect(chamadasA('/api/cadastros/padronizacoes').length).toBe(1);
  });

  it('cadastra um veículo novo com tipo digitado e recusa sem tipo', async () => {
    tela.abrirModalConfig('veiculos', 'novo');
    expect(titulo()).toBe('Novo Cadastro (Veículo)');
    valor('f_placa', 'TST3C01');
    valor('f_tipo', 'Outro');
    expect((document.getElementById('grupo_tipo_outro') as HTMLElement).style.display).toBe('block');
    tela.salvarConfigForm();
    expect(texto('#toastArea')).toContain('Informe o tipo do veículo.');
    valor('f_tipo_outro', 'MICRO-ÔNIBUS');
    valor('f_assentos', '20');
    tela.salvarConfigForm();
    await esperar();
    expect(chamadasA('/api/cadastros/salvar')[0]).toEqual(['veiculos', 'novo', { placa: 'TST3C01', tipo: 'MICRO-ÔNIBUS', assentos: '20', propriedade: 'Público', motivo: 'Ativo' }, null]);
    expect(texto('#toastArea')).toContain('Salvo com sucesso!');
  });

  it('edita um motorista, exige carro para terceirizado e avisa a placa já ocupada', async () => {
    tela.abrirModalConfig('motoristas', 'editar', 'HELENA SEM CARRO');
    expect(titulo()).toBe('Editar Cadastro (Motorista)');
    valor('f_placav', '');
    expect(texto('#aviso_placav')).toContain('precisa de um veículo vinculado');
    tela.salvarConfigForm();
    expect(texto('#toastArea')).toContain('Motorista terceirizado precisa de um veículo vinculado.');
    valor('f_placav', 'TST2B01');
    expect(texto('#aviso_placav')).toContain('já está com GUSTAVO TERCEIRO');
    valor('f_placav', 'TST2B02');
    expect(texto('#aviso_placav')).toContain('Veículo livre.');
    valor('f_vinc', 'Servidor');
    expect((document.getElementById('grupo_placav') as HTMLElement).style.display).toBe('none');
    apiFalha('/api/cadastros/salvar', 403, 'Só o gestor pode fazer esta alteração.');
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    tela.salvarConfigForm();
    await esperar();
    expect(chamadasA('/api/cadastros/salvar')[0]?.[2]).toMatchObject({ vinculo: 'Servidor', placaVinculada: '' });
    expect(texto('#toastArea')).toContain('Só o gestor pode fazer esta alteração.');
    erro.mockRestore();
    tela.abrirModalConfig('motoristas', 'editar', 'IGOR ANTIGO');
    expect(valor('f_situacao')).toBe('Inativo');
  });

  it('o + do motorista cadastra o carro e volta ao motorista com o carro escolhido', async () => {
    tela.abrirModalConfig('motoristas', 'novo');
    valor('f_nome', 'JOANA NOVA');
    valor('f_vinc', 'Terceirizado');
    tela.aba3NovoVeiculoTerceirizado();
    expect(valor('f_prop')).toBe('Terceirizado');
    valor('f_placa', 'TST2B02');
    valor('f_tipo', 'VAN');
    tela.salvarConfigForm();
    await esperar(60);
    expect(valor('f_nome')).toBe('JOANA NOVA');
    expect(valor('f_placav')).toBe('TST2B02');
    tela.aba3NovoVeiculoTerceirizado();
    tela.aba3ConfigAoFechar();
    expect(document.getElementById('f_nome')).not.toBeNull();
    tela.aba3VoltarAoMotorista({ acao: 'novo', nome: 'X', situacao: 'Férias' }, 'TST1A01');
    expect(texto('#toastArea')).toContain('não é terceirizado e não pode ser vinculado');
    tela.aba3ConfigAoFechar();
  });

  it('locais: nome repetido e vazio são recusados; a estrela muda o padrão', async () => {
    tela.abrirModalConfig('locais', 'novo');
    valor('f_local', '  terminal   central ');
    tela.salvarConfigForm();
    expect(texto('#toastArea')).toContain('Já existe um local com esse nome.');
    valor('f_local', '');
    tela.salvarConfigForm();
    expect(texto('#toastArea')).toContain('Informe o nome do local.');
    tela.abrirModalConfig('locais', 'editar', 'Secretaria da Saúde');
    expect((document.getElementById('f_situacao') as HTMLInputElement).type).toBe('hidden');
    tela.abrirModalConfig('locais', 'editar', 'Terminal Central');
    expect(texto('#modalConfigForm')).toContain('Renomear vale daqui para a frente');
    clicar('#tbody-locais .acao-estrela');
    await esperar();
    expect(chamadasA('/api/cadastros/salvar')[0]).toEqual(['locais', 'definirPadrao', {}, 'Terminal Central']);
    apiFalha('/api/cadastros/salvar', 400, 'Só um local ativo pode ser o padrão das saídas.');
    tela.aba3DefinirPadraoLocal('Terminal Central');
    await esperar();
    expect(texto('#toastArea')).toContain('Só um local ativo pode ser o padrão das saídas.');
  });

  it('tirar de operação pede o motivo, cancelar devolve o select, e voltar a Ativo grava direto', async () => {
    const select = document.querySelector('#tbody-veiculos select') as HTMLSelectElement;
    select.value = 'Manutenção';
    select.dispatchEvent(new Event('change'));
    expect(document.getElementById('modalSituacao')?.classList.contains('aberto')).toBe(true);
    expect(texto('#modalSitQuem')).toContain('TST1A01');
    tela.aba3FecharSituacao(false);
    expect(select.value).toBe('Ativo');
    select.value = 'Manutenção';
    tela.aba3MudarSituacao('veiculos', 'TST1A01', select);
    valor('modalSitObs', 'Troca de pneu');
    tela.aba3FecharSituacao(true);
    await esperar();
    expect(chamadasA('/api/cadastros/salvar')[0]).toEqual(['veiculos', 'alternarStatus', { motivo: 'Manutenção', observacao: 'Troca de pneu' }, 'TST1A01']);
    tela.aba3MudarSituacao('veiculos', 'TST1A01', { value: 'Ativo' });
    await esperar();
    expect(chamadasA('/api/cadastros/salvar')[1]?.[2]).toEqual({ motivo: 'Ativo', observacao: '' });
    tela.aba3SituacaoEsc();
    tela.aba3MudarSituacao('veiculos', 'NAOEXISTE', { value: 'Outros' });
  });

  it('se a API recusa a situação, a tela volta ao que era e recarrega', async () => {
    apiFalha('/api/cadastros/salvar', 500, 'Banco fora do ar');
    tela.aba3AplicarSituacao('motoristas', 'ANA SERVIDORA', 'Férias', 'ok', 'volta dia 10');
    await esperar();
    expect(texto('#toastArea')).toContain('a tela foi revertida');
    expect(chamadasA('/api/cadastros/dados').length).toBe(1);
  });

  it('carro terceirizado fora de operação avisa que o motorista ficou sem veículo', async () => {
    tela.aba3AplicarSituacao('veiculos', 'TST2B01', 'Manutenção', 'ok', '');
    expect(texto('#toastArea')).toContain('GUSTAVO TERCEIRO ficou sem veículo (Manutenção)');
    await esperar();
  });

  it('dar baixa passa pela confirmação, e reverter a baixa vai direto', async () => {
    tela.aba3Baixa('motoristas', 'ANA SERVIDORA', true);
    expect(texto('#modalBaixaTexto')).toContain('Dar baixa em ANA SERVIDORA?');
    // O cadastro fica no banco do sistema, não numa planilha.
    expect(texto('#modalBaixaTexto')).toContain('nada é apagado. O cadastro continua guardado e as viagens já feitas seguem mostrando o nome normalmente.');
    expect(texto('#modalBaixaTexto')).not.toContain('planilha');
    clicar('#btnConfirmarBaixa');
    await esperar();
    expect(chamadasA('/api/cadastros/salvar')[0]?.[2]).toMatchObject({ motivo: 'Baixado' });
    tela.aba3Baixa('veiculos', 'TST9B99', false);
    await esperar();
    expect(chamadasA('/api/cadastros/salvar')[1]?.[2]).toMatchObject({ motivo: 'Ativo' });
    tela.aba3Baixa('locais', 'Terminal Central', true);
    expect(texto('#modalBaixaTexto')).toContain('o local');
    tela.fecharModalBaixa();
  });

  it('inativar carro de terceiro pergunta pelo motorista: os dois juntos numa chamada só', async () => {
    tela.aba3MudarSituacao('veiculos', 'TST2B01', { value: 'Inativo' });
    expect(texto('#modalVincTexto')).toContain('vinculado ao motorista GUSTAVO TERCEIRO');
    valor('modalVincObs', 'Contrato encerrado');
    tela.aba3VinculoAcao('ambos');
    await esperar();
    expect(chamadasA('/api/cadastros/inativar-com-vinculo')).toEqual([[{ placa: 'TST2B01', motorista: 'GUSTAVO TERCEIRO', observacao: 'Contrato encerrado' }]]);
    expect(texto('#toastArea')).toContain('Inativados: carro TST2B01 e motorista GUSTAVO TERCEIRO.');
  });

  it('inativar só o motorista terceirizado deixa o carro livre; cancelar não grava nada', async () => {
    tela.aba3MudarSituacao('motoristas', 'GUSTAVO TERCEIRO', { value: 'Inativo' });
    expect(texto('#modalVincTexto')).toContain('tem vínculo com o carro TST2B01');
    tela.aba3VinculoAcao('fechar');
    tela.aba3VinculoAoFechar();
    expect(chamadasA('/api/cadastros/salvar')).toEqual([]);
    tela.aba3AbrirVinculo('motoristas', tela.dbConfig.motoristas[1], 'obs');
    tela.aba3VinculoAcao('soMotorista');
    await esperar();
    expect(chamadasA('/api/cadastros/salvar')[0]).toEqual(['motoristas', 'alternarStatus', { motivo: 'Inativo', observacao: 'obs' }, 'GUSTAVO TERCEIRO']);
    apiFalha('/api/cadastros/inativar-com-vinculo', 500, 'falhou');
    tela.aba3AbrirVinculo('veiculos', tela.dbConfig.veiculos[2], '');
    tela.aba3VinculoAcao('ambos');
  });

  it('inativar só o carro abre a reposição; escolher outro carro confirma e grava o vínculo', async () => {
    tela.aba3AbrirVinculo('veiculos', tela.dbConfig.veiculos[1], '');
    tela.aba3VinculoAcao('soCarro');
    expect(document.getElementById('modalReporAba3')?.classList.contains('aberto')).toBe(true);
    expect(texto('#modalReporAjuda')).toContain('1 carro(s) terceirizado(s) ativo(s) sem motorista.');
    valor('modalReporCarro', 'TST2B02');
    tela.aba3ReporEscolheu();
    expect((document.getElementById('modalReporOk') as HTMLButtonElement).disabled).toBe(false);
    tela.aba3ReporVincular();
    expect(texto('#dsConfTit')).toBe('Confirmar vínculo');
    clicar('#dsConfOk');
    await esperar();
    expect(chamadasA('/api/cadastros/vincular-carro-ao-motorista')).toEqual([['GUSTAVO TERCEIRO', 'TST2B02']]);
    apiFalha('/api/cadastros/vincular-carro-ao-motorista', 409, 'O carro já está com outro motorista.');
    tela.aba3ConfirmarVinculo('GUSTAVO TERCEIRO', 'TST2B02');
    clicar('#dsConfOk');
    await esperar();
    expect(texto('#toastArea')).toContain('O carro já está com outro motorista.');
    tela.aba3ConfirmarVinculo('GUSTAVO TERCEIRO', 'TST2B02');
    clicar('#dsConfNao');
    tela.aba3ConfirmarVinculo('GUSTAVO TERCEIRO', 'TST1A01');
    expect(texto('#toastArea')).toContain('não é terceirizado');
    tela.aba3FecharRepor();
    expect(texto('#toastArea')).toContain('ficou sem veículo');
  });

  it('na reposição, cadastrar o carro novo volta para confirmar o vínculo', async () => {
    tela.aba3AbrirRepor('GUSTAVO TERCEIRO', 'TST2B01');
    tela.aba3ReporCadastrar();
    expect(valor('f_prop')).toBe('Terceirizado');
    valor('f_placa', 'TST2B02');
    valor('f_tipo', 'VAN');
    tela.salvarConfigForm();
    await esperar(60);
    expect(texto('#dsConfTit')).toBe('Confirmar vínculo');
    clicar('#dsConfNao');
    tela.aba3Retorno = { tipo: 'vincular', motorista: 'GUSTAVO TERCEIRO' };
    tela.aba3ConfigAoFechar();
    expect(document.getElementById('modalReporAba3')?.classList.contains('aberto')).toBe(true);
    tela.dbConfig.veiculos = [];
    tela.aba3AbrirRepor('GUSTAVO TERCEIRO', '');
    expect(texto('#modalReporAjuda')).toContain('Nenhum carro terceirizado livre.');
  });

  it('calendário: novo dia com a data final acompanhando, editar e excluir o bloco inteiro', async () => {
    tela.abrirModalCal('novo');
    expect(titulo()).toBe('Novo dia no calendário');
    tela.salvarCalForm();
    expect(texto('#toastArea')).toContain('Informe a data.');
    valor('f_cal_ini', '2026-12-24');
    expect(valor('f_cal_fim')).toBe('2026-12-24');
    valor('f_cal_desc', 'Véspera de Natal');
    tela.salvarCalForm();
    await esperar();
    expect(chamadasA('/api/cadastros/salvar-calendario')[0]).toEqual(['novo', { tipo: 'Feriado', descricao: 'Véspera de Natal', dataInicio: '2026-12-24', dataFim: '2026-12-24' }, '']);
    tela.abrirModalCal('editar', '25/12/2026');
    expect(texto('#modalConfigForm')).toContain('25/12/2026 · sexta');
    apiFalha('/api/cadastros/salvar-calendario', 404, 'Data não encontrada no calendário.');
    tela.salvarCalForm();
    await esperar();
    expect(texto('#toastArea')).toContain('Data não encontrada no calendário.');
    limparChamadas();
    apiFalsa('/api/cadastros/dados', () => structuredClone(CADASTROS));
    tela.excluirCal('31/12/2026');
    expect(texto('#modalBaixaTexto')).toContain('bloco de 2 dias');
    clicar('#btnConfirmarBaixa');
    await esperar();
    expect(chamadasA('/api/cadastros/salvar-calendario')[0]).toEqual(['excluir', {}, '31/12/2026']);
    tela.excluirCal('25/12/2026');
    expect(texto('#modalBaixaTexto')).toContain('Excluir 25/12/2026 do calendário?');
    apiFalha('/api/cadastros/salvar-calendario', 500, 'falhou');
    tela.excluirCalConfirmado('25/12/2026');
    await esperar();
    expect(texto('#toastArea')).toContain('falhou');
    tela.excluirCal('01/01/2030');
    expect(tela.aba3DiaSemana('x')).toBe('');
  });

  it('o calendário não oferece importar do site, que não existe nesta versão', () => {
    const botoes = Array.from(document.querySelectorAll('#sec-calendario button')).map((b) => (b.textContent ?? '').trim());
    expect(botoes).toContain('Novo dia');
    expect(botoes).not.toContain('Importar do site');
  });

  it('importar o calendário do site da Prefeitura avisa que não existe nesta versão', async () => {
    tela.abrirModalImportar();
    valor('cal_imp_ano', '');
    tela.analisarImportacao();
    expect(texto('#toastArea')).toContain('Informe o ano.');
    valor('cal_imp_ano', '2027');
    tela.analisarImportacao();
    await esperar();
    expect(texto('#cal_imp_previa')).toContain('ainda não existe nesta versão');
    tela.calImportados = [
      { dias: ['01/01/2027'], tipo: 'Feriado', descricao: 'Ano Novo', inicio: '2027-01-01', fim: '2027-01-01', conflitos: [] },
      { dias: ['15/02/2027', '16/02/2027'], tipo: 'Ponto facultativo', descricao: 'Carnaval', inicio: '2027-02-15', fim: '2027-02-16', conflitos: ['15/02/2027'] },
    ];
    tela.renderPreviaImportacao();
    expect(texto('#cal_imp_dica')).toBe('1 de 2 selecionado(s) · 1 dia(s)');
    tela.confirmarImportacao();
    await esperar();
    expect(texto('#toastArea')).toContain('ainda não existe nesta versão');
    tela.calImportados = [];
    tela.renderPreviaImportacao();
    expect(texto('#cal_imp_previa')).toContain('Nenhuma data reconhecida.');
    tela.confirmarImportacao();
    tela.fecharModalImportar();
  });

  it('padronização: filtra, pagina, edita com confirmação ao trocar a cidade e exclui', async () => {
    tela.aba3Pad = { lista: null, pagina: 1, edit: null };
    tela.aba3PadCarregar(false);
    await esperar();
    expect(texto('#padN')).toBe('3 nomes');
    expect(document.body.textContent).toContain('Como cada cidade e local chega no CSV do OLOSTECH');
    expect(texto('#padInfo')).toContain('1 mantidos como vieram');
    expect(linhas('padronizacao').join(' ')).toContain('Sugestão');
    tela.aba3PadCarregar(false);
    (document.getElementById('padSoMuda') as HTMLInputElement).checked = false;
    valor('padBusca', 'curitiba');
    tela.aba3PadFiltrar();
    expect(texto('#padInfo')).toBe('Mostrando 1 de 1');
    valor('padBusca', 'nada disso');
    tela.aba3PadFiltrar();
    expect(linhas('padronizacao')[0]).toContain('Nenhum nome com esses filtros.');
    tela.aba3PadLimpar();
    valor('padCidade', 'BLUMENAU');
    // O sistema no ar não consulta o Google: o filtro não oferece essa origem.
    expect(Array.from((document.getElementById('padOrigem') as HTMLSelectElement).options).map((o) => o.textContent)).toEqual(['Todos', 'Sugestão', 'Digitado', 'Mantido como veio']);
    valor('padOrigem', 'outra');
    tela.aba3PadFiltrar();
    expect(texto('#padInfo')).toBe('Mostrando 1 de 1');
    tela.aba3PadLimpar();
    tela.aba3Pad.lista = Array.from({ length: 60 }, (_, i) => ({ cidadeOrig: 'X', localOrig: `L${i}`, cidadePad: 'X', localPad: `M${i}`, origem: 'manual' }));
    tela.aba3PadRender();
    tela.aba3PadIrPagina(2);
    expect(texto('#padInfo')).toBe('Mostrando 10 de 60');
    tela.aba3PadReceber(structuredClone(PADRONIZACOES));

    tela.aba3PadEditar(0);
    valor('padEdCidade', '');
    tela.aba3PadSalvar();
    expect(texto('#toastArea')).toContain('Informe a cidade e o local.');
    valor('padEdCidade', 'SÃO JOSÉ');
    valor('padEdLocal', 'HOSPITAL REGIONAL');
    apiFalsa('/api/cadastros/salvar-padronizacao', () => structuredClone(PADRONIZACOES));
    tela.aba3PadSalvar();
    expect(texto('#dsConfTit')).toBe('Trocar a cidade?');
    clicar('#dsConfOk');
    await esperar();
    expect(chamadasA('/api/cadastros/salvar-padronizacao')[0]?.[0]).toEqual({ cidadeOrig: 'FLORIANÓPOLIS', localOrig: 'HOSP. REGIONAL', cidadePad: 'SÃO JOSÉ', localPad: 'HOSPITAL REGIONAL' });
    tela.aba3PadEditar(1);
    apiFalha('/api/cadastros/salvar-padronizacao', 404, 'Esse nome não está mais na padronização.');
    tela.aba3PadSalvar();
    await esperar();
    expect(texto('#toastArea')).toContain('Esse nome não está mais na padronização.');
    tela.aba3PadSalvar();
    tela.aba3Pad.edit = null;
    tela.aba3PadSalvar();

    apiFalsa('/api/cadastros/excluir-padronizacao', []);
    tela.aba3PadExcluir(2);
    clicar('#dsConfOk');
    await esperar();
    expect(chamadasA('/api/cadastros/excluir-padronizacao')[0]).toEqual([{ cidadeOrig: 'BLUMENAU', localOrig: 'CENTRO' }]);
    tela.aba3PadReceber(structuredClone(PADRONIZACOES));
    apiFalha('/api/cadastros/excluir-padronizacao', 500, 'falhou');
    tela.aba3PadExcluir(0);
    clicar('#dsConfOk');
    await esperar();
    expect(texto('#toastArea')).toContain('Não foi possível excluir');
    tela.aba3PadEditar(99);
    tela.aba3PadExcluir(99);
    apiFalha('/api/cadastros/padronizacoes', 500, 'fora do ar');
    tela.aba3PadCarregar(true);
    await esperar();
    expect(linhas('padronizacao')[0]).toContain('Não foi possível carregar');
  });
});
