// Trazido de ferramentas/testes/teste_guia_nome.cjs, do SIGEPAS em Apps Script (projeto do estágio). As verificações
// são as mesmas; mudou só a base, que agora roda as funções das telas trazidas no Vitest.
// Passo 4.1: a Guia mostra o nome por guiaNomePax — servidor aparece como "Servidor", sem "(mat. -)".
// Monta o card real do passageiro com uma página de mentira. Dados fictícios.
import { carregarTelas } from '../preparar-telas';
import { ler, carregar, teste } from './base-dos-testes-do-estagio.js';

describe('teste_guia_nome (testes do estágio)', () => {
  beforeAll(carregarTelas);
  it('as verificações do teste original continuam valendo', () => {

    const globais = {
      estadoGuia: { confAberto: null },
      calcularIdade: () => ({ anos: 40 }),
      temRestricaoReal: () => false,
      regrasIdade: () => [],
      nivelMaisAlto: () => '',
      statusConfInfo: () => ({ bg: '#fff', cor: '#000', bd: '#ccc', txt: 'Ligar' }),
    };
    const f = carregar('GuiaMotoristas.html.md', ['guiaMarcadorNulo', 'guiaIdPax', 'guiaNomePax', 'cardPassageiroGuiaHTML'], globais);

    function nomeNoCard(html) {
      const m = /<div class="gp-nome">([^<]*)<span class="gp-idade">/.exec(html);
      return m ? m[1].trim() : null;
    }

    console.log('== card do passageiro ==');
    const serv = f.cardPassageiroGuiaHTML({ matricula: '-', nome: '-', objetivo: 'Reunião', hora: '09:00', quantidade: 1 }, 'SXH4D63');
    teste('servidor: o card mostra "Servidor"', nomeNoCard(serv) === 'Servidor', nomeNoCard(serv));
    teste('servidor: sem "(mat. -)"', serv.indexOf('(mat. -)') === -1);
    const pac = f.cardPassageiroGuiaHTML({ matricula: '777', nome: 'ANA FICTICIA', hora: '09:00', quantidade: 1 }, 'SXH4D63');
    teste('paciente: nome e "(mat. 777)" como sempre', nomeNoCard(pac) === 'ANA FICTICIA (mat. 777)', nomeNoCard(pac));
    const aspas = f.cardPassageiroGuiaHTML({ matricula: '888', nome: 'BIA "FICTICIA" <X>', hora: '09:00', quantidade: 1 }, 'SXH4D63');
    teste('nome com aspas e sinais continua escapado', aspas.indexOf('BIA &quot;FICTICIA&quot; &lt;X&gt;') > -1);
    teste('LACEN (matrícula "N/A" e nome) mostra o nome, sem "(mat. N/A)"',
      nomeNoCard(f.cardPassageiroGuiaHTML({ matricula: 'N/A', nome: 'MOTORISTA FICTICIO', hora: '', quantidade: 0 }, 'LAC0001')) === 'MOTORISTA FICTICIO');

    console.log('\n== onde a Guia mostra o nome ==');
    const src = ler('GuiaMotoristas.html.md');
    [
      ['card: nome calculado fora do template', 'const nomeExib = esc(guiaNomePax(p));'],
      ['card: só variáveis simples no template', '<div class="gp-nome">${nomeExib} ${matExib}<span'],
      ['aviso de transferir', 'Mover <b>${escGuia(guiaNomePax(c.p))}</b>'],
      ['aviso de troca: inicial', '${escGuia((guiaNomePax(pp) || \'?\').charAt(0).toUpperCase())}'],
      ['aviso de troca: nome', '<div class="gm-card-nome">${escGuia(guiaNomePax(pp))}</div>'],
      // 11/11/2026: abrir e atualizar o painel usam o mesmo atualizarHeaderDrawerGuia.
      ['painel ao abrir', "nomeEl.textContent = guiaNomePax(p) || '—';"],
      ['painel ao recarregar', "    nomeEl.textContent = guiaNomePax(p) || '—';"],
      ['lista de troca', "nome: guiaNomePax(p2) || '—',"],
      ['aviso de cancelar', "const nome = guiaNomePax(c.p) || 'este paciente';"],
    ].forEach(([rot, trecho]) => teste(rot, src.indexOf(trecho) > -1));
    teste('nenhum nome cru em exibição', src.indexOf('${esc(p.nome)}') === -1 && src.indexOf('escGuia(pp.nome)') === -1 && src.indexOf('escGuia(c.p.nome)') === -1);
    teste('o caractere "·" saiu do nome do servidor', f.guiaNomePax({ matricula: '-', nome: '-', objetivo: 'x' }).indexOf('·') === -1);
  });
});
