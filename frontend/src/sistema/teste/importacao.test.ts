// Tela Importar CSV (fluxo 1): escolher o arquivo, processar e padronizar os locais desconhecidos.
import { apiFalha, apiFalsa, carregarTelas, chamadasA, clicar, esperar, limparChamadas, tela, texto } from './preparar-telas';

const PENDENCIAS = [
  { cidade: 'FLORIANÓPOLIS', local: 'HOSP. REGIONAL DE EXEMPLO', ocorrencias: 3 },
  { cidade: 'JOINVILLE', local: 'POLICLÍNICA DE EXEMPLO', ocorrencias: 1 },
  { cidade: 'CURITIBA', local: 'CLINICA NOVA', ocorrencias: 2 },
];
const SUGESTOES = [
  { cidade: 'FLORIANÓPOLIS', local: 'HOSP. REGIONAL DE EXEMPLO', sugestaoCidade: 'FLORIANÓPOLIS', sugestaoLocal: 'HOSPITAL REGIONAL DE EXEMPLO', fonte: 'dicionario', similaridade: 0.86, cidadeGoogle: 'São José' },
  { cidade: 'JOINVILLE', local: 'POLICLÍNICA DE EXEMPLO', fonte: 'nenhuma' },
  { cidade: 'CURITIBA', local: 'CLINICA NOVA', fonte: 'nenhuma' },
];

function botaoDoCard(indice: number, rotulo: string): HTMLElement {
  const card = document.querySelectorAll('#conteudoModalLocais .imp-pend')[indice];
  const botao = Array.from(card?.querySelectorAll('button') ?? []).find((b) => b.textContent?.includes(rotulo));
  if (!botao) throw new Error(`Botão ${rotulo} não achado no card ${indice}`);
  return botao as HTMLElement;
}

async function escolherArquivo(nome = 'pedidos.csv', conteudo = 'Data compromisso,Cidade\n01/12/2026,CURITIBA\n') {
  const arquivo = new File([conteudo], nome, { type: 'text/csv' });
  const entrada = document.getElementById('impArquivo') as HTMLInputElement;
  Object.defineProperty(entrada, 'files', { configurable: true, value: [arquivo] });
  entrada.dispatchEvent(new Event('change'));
  tela.aoEscolherArquivoImp();
  return arquivo;
}

describe('Importar CSV', () => {
  beforeAll(carregarTelas);
  beforeEach(() => {
    limparChamadas();
    apiFalsa('/api/importacao/sugestoes-de-locais', SUGESTOES);
  });

  it('mostra no menu quantos locais faltam padronizar', async () => {
    apiFalsa('/api/importacao/locais-pendentes', PENDENCIAS);
    tela.iniciarImportacao();
    await esperar();
    expect((document.getElementById('impBadgePendentes') as HTMLElement).innerText).toBe(3);
    apiFalsa('/api/importacao/locais-pendentes', []);
    tela.atualizarBadgePendentes();
    await esperar();
    expect((document.getElementById('impBadgePendentes') as HTMLElement).style.display).toBe('none');
  });

  it('sem arquivo, avisa e não processa; com arquivo, libera o botão', async () => {
    tela.definirArquivoImp(null);
    expect((document.getElementById('impBtnProcessar') as HTMLButtonElement).disabled).toBe(true);
    tela.importarCSV();
    expect(chamadasA('/api/importacao/importar-arquivo')).toEqual([]);
    await escolherArquivo('pedidos <fictícios>.csv');
    expect((document.getElementById('impBtnProcessar') as HTMLButtonElement).disabled).toBe(false);
    expect(document.getElementById('impNomeArquivo')?.innerHTML).toContain('pedidos &lt;fictícios&gt;.csv');
  });

  it('arrastar um arquivo que não é CSV é recusado; arrastar o CSV escolhe o arquivo', () => {
    const area = document.getElementById('impDrop') as HTMLElement;
    const soltar = (nome: string) => {
      const evento = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(evento, 'dataTransfer', { value: { files: [new File(['x'], nome)] } });
      area.dispatchEvent(evento);
    };
    area.dispatchEvent(new Event('dragenter'));
    expect(area.classList.contains('arrastando')).toBe(true);
    area.dispatchEvent(new Event('dragleave'));
    expect(area.classList.contains('arrastando')).toBe(false);
    soltar('foto.png');
    expect(texto('#toastArea')).toContain('Envie um arquivo .csv');
    soltar('pedidos.CSV');
    expect(document.getElementById('impNomeArquivo')?.textContent).toContain('pedidos.CSV');
    const vazio = new Event('drop');
    Object.defineProperty(vazio, 'dataTransfer', { value: { files: [] } });
    area.dispatchEvent(vazio);
  });

  it('processa o arquivo, mostra o resumo e abre a padronização dos locais novos', async () => {
    apiFalsa('/api/importacao/importar-arquivo', { status: 'Sucesso', totalLinhas: 120, corrigidas: 4, canceladas: 12, pendencias: PENDENCIAS, avisoHeader: 'Cabeçalho fora do padrão.' });
    await escolherArquivo('pedidos.csv', 'Data compromisso,Cidade\n01/12/2026,CURITIBA\n');
    clicar('#impBtnProcessar');
    await esperar(80);
    expect(chamadasA('/api/importacao/importar-arquivo')[0]?.[0]).toContain('01/12/2026,CURITIBA');
    const resumo = texto('#impResumoChips');
    expect(resumo).toContain('120viagens importadas');
    expect(resumo).toContain('4locais padronizados');
    expect(resumo).toContain('12pedidos cancelados');
    expect(resumo).toContain('3locais novos para revisar');
    expect(texto('#impLocTit')).toContain('3 combinações novas');
    expect(texto('#conteudoModalLocais')).toContain('HOSPITAL REGIONAL DE EXEMPLO');
    expect(texto('#conteudoModalLocais')).toContain('O Google indica que este local fica em São José');
    expect(texto('#toastArea')).toContain('Cabeçalho fora do padrão.');
  });

  it('importação sem pendências avisa o sucesso; erro da API aparece na tela', async () => {
    apiFalsa('/api/importacao/importar-arquivo', { status: 'Sucesso', totalLinhas: 1, corrigidas: 0, canceladas: 0, pendencias: [] });
    await escolherArquivo();
    tela.importarCSV();
    await esperar(80);
    expect(texto('#impResumoChips')).toContain('1viagem importada');
    expect(texto('#toastArea')).toContain('Viagens processadas');
    tela.mostrarResumoImportacao({ totalLinhas: 2, corrigidas: 1, canceladas: 1, pendencias: [{}] });
    expect(texto('#impResumoChips')).toContain('1local padronizado');
    expect(texto('#impResumoChips')).toContain('1pedido cancelado');
    expect(texto('#impResumoChips')).toContain('1local novo para revisar');
    tela.mostrarResumoImportacao(null);
    apiFalha('/api/importacao/importar-arquivo', 400, 'O arquivo CSV parece estar vazio ou inválido.');
    tela.importarCSV();
    await esperar(80);
    expect(texto('#impStatus')).toContain('Falha ao processar o arquivo');
    expect(texto('#toastArea')).toContain('vazio ou inválido');
  });

  it('aceitar, manter, editar e desfazer cada local, e salvar as decisões no dicionário', async () => {
    tela.abrirModalLocais(PENDENCIAS);
    await esperar();
    clicar(botaoDoCard(0, 'Aceitar sugestão'));
    expect(texto('#conteudoModalLocais')).toContain('Aceito: FLORIANÓPOLIS / HOSPITAL REGIONAL DE EXEMPLO');
    clicar(botaoDoCard(0, 'desfazer'));
    clicar(botaoDoCard(0, 'Aceitar sugestão'));
    clicar(botaoDoCard(1, 'Manter como está'));
    expect(texto('#impLocDica')).toBe('Decididas 2 de 3');
    clicar(botaoDoCard(2, 'Editar'));
    clicar(botaoDoCard(2, 'Cancelar'));
    clicar(botaoDoCard(2, 'Editar'));
    (document.getElementById('inpLocalLocal_2') as HTMLInputElement).value = 'HOSPITAL REGIONAL DE EXEMPLO';
    tela.aoEscolherLocalPadrao(2);
    expect((document.getElementById('inpCidadeLocal_2') as HTMLInputElement).value).toBe('FLORIANÓPOLIS');
    clicar(botaoDoCard(2, 'Confirmar'));
    expect(texto('#dsConfTit')).toBe('Mudar a cidade?');
    clicar('#dsConfOk');
    expect(texto('#conteudoModalLocais')).toContain('Editado: FLORIANÓPOLIS / HOSPITAL REGIONAL DE EXEMPLO');

    apiFalsa('/api/importacao/salvar-decisoes-de-locais', { status: 'Sucesso', linhasCorrigidas: 5, pendentesRestantes: 1 });
    clicar('#impLocSalvar');
    await esperar();
    const [decisoes] = chamadasA('/api/importacao/salvar-decisoes-de-locais')[0] as [Array<{ origem: string }>];
    expect(decisoes.map((d) => d.origem)).toEqual(['sugestao_dicionario', 'mantido_original', 'manual']);
    expect(texto('#conteudoModalLocais')).toContain('5 linha(s) corrigidas no banco. Restam 1 local(is) a revisar.');
  });

  it('editar sem trocar a cidade não pergunta nada', async () => {
    apiFalsa('/api/importacao/sugestoes-de-locais', [{ fonte: 'nenhuma' }]);
    tela.abrirModalLocais([{ cidade: 'CURITIBA', local: 'CLINICA', ocorrencias: 1 }]);
    await esperar();
    tela.decidirLocal(0, 'manual');
    (document.getElementById('inpLocalLocal_0') as HTMLInputElement).value = 'CLÍNICA';
    tela.confirmarManualLocal(0);
    expect(texto('#conteudoModalLocais')).toContain('Editado: CURITIBA / CLÍNICA');
    tela.decidirLocal(9, 'manter');
    tela.confirmarManualLocal(9);
  });

  it('falha ao salvar mostra o erro e deixa voltar para a lista', async () => {
    tela.abrirModalLocais([{ cidade: 'CURITIBA', local: 'CLINICA' }]);
    await esperar();
    tela.decidirLocal(0, 'manter');
    apiFalha('/api/importacao/salvar-decisoes-de-locais', 500, 'Banco fora do ar');
    tela.salvarDecisoesLocaisFront();
    await esperar();
    expect(texto('#conteudoModalLocais')).toContain('Falha ao salvar');
    clicar('#conteudoModalLocais button');
    expect(texto('#impLocDica')).toBe('Decididas 1 de 1');
    tela.decidirLocal(0, '');
    tela.salvarDecisoesLocaisFront();
  });

  it('a revisão de locais pelo botão do topo busca as pendências, ou avisa que não há', async () => {
    apiFalsa('/api/importacao/locais-pendentes', []);
    tela.abrirRevisaoLocais();
    await esperar();
    expect(texto('#toastArea')).toContain('Nenhum local pendente de revisão.');
    apiFalsa('/api/importacao/locais-pendentes', PENDENCIAS);
    apiFalha('/api/importacao/sugestoes-de-locais', 500, 'falhou');
    tela.abrirRevisaoLocais();
    await esperar();
    expect(texto('#conteudoModalLocais')).toContain('sem sugestão automática');
    apiFalha('/api/importacao/locais-pendentes', 500, 'Sem conexão');
    tela.abrirRevisaoLocais();
    await esperar();
    expect(texto('#conteudoModalLocais')).toContain('Falha ao buscar pendências');
    tela.fecharModalLocais();
  });
});
