// Trazido de ferramentas/testes/teste_identidade_guia.cjs, do SIGEPAS em Apps Script (projeto do estágio). As verificações
// são as mesmas; mudou só a base, que agora roda as funções das telas trazidas no Vitest.
// Passo 1.4: as três funções de identidade da Guia — as mesmas da tentativa de 14/09 — entram SEM USO.
// Dados fictícios. Os passos 4.1 a 4.3 passam a usá-las, um uso por vez.
import { carregarTelas } from '../preparar-telas';
import { ler, carregar, teste } from './base-dos-testes-do-estagio.js';

describe('teste_identidade_guia (testes do estágio)', () => {
  beforeAll(carregarTelas);
  it('as verificações do teste original continuam valendo', () => {

    const src = ler('GuiaMotoristas.html.md');
    const f = carregar('GuiaMotoristas.html.md', ['guiaMarcadorNulo', 'guiaIdPax', 'guiaNomePax']);

    console.log('== marcador de "sem paciente" ==');
    ['', '-', 'N/A', 'na', 'Não informado', 'sem informação', null, undefined].forEach(v =>
      teste('nulo: ' + JSON.stringify(v), f.guiaMarcadorNulo(v) === true));
    teste('nome de verdade não é nulo', f.guiaMarcadorNulo('Maria Ficticia') === false);

    console.log('\n== identidade do passageiro ==');
    teste('paciente com matrícula → a matrícula', f.guiaIdPax({ matricula: '777', nome: 'Ana Ficticia', chaveDemanda: 'D-1' }) === '777');
    const semMat = f.guiaIdPax({ matricula: '', nome: "Maria D'Ávila", chaveDemanda: 'D-2' });
    teste('sem matrícula → o nome, em maiúsculas', semMat === "MARIA D'ÁVILA", semMat);
    const a = f.guiaIdPax({ matricula: '-', nome: '-', chaveDemanda: 'D-05de' });
    const b = f.guiaIdPax({ matricula: '-', nome: '-', chaveDemanda: 'D-9cb1' });
    teste('servidor → "#" + chave do pedido', a === '#D-05DE', a);
    teste('dois servidores no mesmo carro têm identidades diferentes', a !== b);
    teste('sem matrícula, nome nem chave → "@" + ID da linha (D6, passo 4.3)', f.guiaIdPax({ matricula: '-', nome: '-', idLinha: 'VAL-v2-p9' }) === '@VAL-V2-P9');
    teste('sem nada → vazio', f.guiaIdPax({}) === '');

    console.log('\n== nome exibido ==');
    teste('servidor → "Servidor" (D2 revista)', f.guiaNomePax({ matricula: '-', nome: '-', objetivo: 'Reunião no LACEN' }) === 'Servidor');
    teste('servidor com "N/A"', f.guiaNomePax({ matricula: 'N/A', nome: '-' }) === 'Servidor');
    teste('paciente → o próprio nome', f.guiaNomePax({ matricula: '777', nome: 'Ana Ficticia' }) === 'Ana Ficticia');

    console.log('\n== uso (1.4: nenhum; 4.1: o nome exibido; 4.2: buscas; 4.3: card, clique e troca) ==');
    const conta = re => (src.match(re) || []).length;
    teste('guiaIdPax: definição + guiaAcharPax + card + clique + troca (passo 4.3) + cancelar pelo card (05/10)', conta(/guiaIdPax\(/g) === 6, conta(/guiaIdPax\(/g));
    // 11/11/2026: o cabeçalho do painel passou a ser montado num lugar só (atualizarHeaderDrawerGuia), e o aviso de
    // falha da gravação de fundo do contato também mostra o nome: são 10.
    teste('guiaNomePax é usada nos pontos de exibição (passo 4.1, cabeçalho unificado e aviso de falha em 11/11) + a imagem da viagem (06/10)', conta(/guiaNomePax\(/g) === 10, conta(/guiaNomePax\(/g));
    teste('guiaMarcadorNulo: definição + 4 nas funções novas + 1 na matrícula do card + 3 do servidor identificado (S.5) + 5 na imagem da viagem (06/10)', conta(/guiaMarcadorNulo\(/g) === 14, conta(/guiaMarcadorNulo\(/g));
  });
});
