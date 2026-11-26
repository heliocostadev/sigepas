// Trazido de ferramentas/testes/teste_guia_servidor_ident.cjs, do SIGEPAS em Apps Script (projeto do estágio). As verificações
// são as mesmas; mudou só a base, que agora roda as funções das telas trazidas no Vitest.
// Passo S.5 (18/09): a Guia dos Motoristas mostra "Servidor FULANO (mat. X)" quando o nome foi informado na
// Demandas — no card, no painel, na troca e na mensagem de WhatsApp ao motorista. A identidade não muda. Fictício.
import { carregarTelas } from '../preparar-telas';
import { ler, carregar, teste } from './base-dos-testes-do-estagio.js';

describe('teste_guia_servidor_ident (testes do estágio)', () => {
  beforeAll(carregarTelas);
  it('as verificações do teste original continuam valendo', () => {

    const g = carregar('GuiaMotoristas.html.md', ['guiaMarcadorNulo', 'guiaIdPax', 'guiaNomePax', 'formatarTelefonesWpp', 'cardPassageiroGuiaHTML'], {
      estadoGuia: { confAberto: null }, calcularIdade: () => ({ anos: 0, semData: true }), temRestricaoReal: () => false,
      regrasIdade: () => [], nivelMaisAlto: () => '', statusConfInfo: () => ({ bg: '', cor: '', bd: '', txt: 'Ligar' }),
    });
    const w = carregar('WhatsappFormatter.html.md', ['calcularIdade', 'regrasIdade', 'nivelMaisAlto', 'temRestricaoReal', 'tituloMsg',
      'wppNomePax', 'gerarMensagemWhatsapp'], { guiaNomePax: g.guiaNomePax, formatarTelefonesWpp: g.formatarTelefonesWpp });

    const S = extra => Object.assign({ matricula: '-', nome: '-', chaveDemanda: 'D-S1', idLinha: 'VAL-V1-a', hora: '09:00', quantidade: 1,
      cidade: 'FLORIANOPOLIS', local: 'LACEN' }, extra || {});

    console.log('== nome ==');
    teste('sem identificação: "Servidor" (como antes)', g.guiaNomePax(S()) === 'Servidor');
    teste('identificado: "Servidor FULANO"', g.guiaNomePax(S({ servidorNome: 'Fulano Ficticio', servidorMatricula: '123' })) === 'Servidor Fulano Ficticio');
    teste('"-" no nome do servidor = sem identificação', g.guiaNomePax(S({ servidorNome: '-' })) === 'Servidor');
    teste('paciente: nada muda', g.guiaNomePax({ matricula: '7', nome: 'ANA', servidorNome: 'X' }) === 'ANA');
    teste('a identidade continua a chave do pedido', g.guiaIdPax(S({ servidorNome: 'Fulano', servidorMatricula: '1' })) === '#D-S1');

    console.log('\n== card ==');
    const nomeNoCard = h => { const m = /<div class="gp-nome">([^<]*)<span class="gp-idade">/.exec(h); return m ? m[1].trim() : null; };
    let h = g.cardPassageiroGuiaHTML(S({ servidorNome: 'Fulano Ficticio', servidorMatricula: '123' }), 'V1', 0);
    teste('card: "Servidor Fulano Ficticio (mat. 123)"', nomeNoCard(h) === 'Servidor Fulano Ficticio (mat. 123)', nomeNoCard(h));
    h = g.cardPassageiroGuiaHTML(S(), 'V1', 0);
    teste('card sem identificação: "Servidor", sem "(mat."', nomeNoCard(h) === 'Servidor', nomeNoCard(h));
    h = g.cardPassageiroGuiaHTML(S({ servidorNome: 'Ana <B>', servidorMatricula: '9"9' }), 'V1', 0);
    teste('nome e matrícula escapados', h.indexOf('Servidor Ana &lt;B&gt;') > -1 && h.indexOf('(mat. 9&quot;9)') > -1);
    h = g.cardPassageiroGuiaHTML({ matricula: 'N/A', nome: 'MOTORISTA LACEN', servidorMatricula: '5', hora: '', quantidade: 0 }, 'V1', 0);
    teste('LACEN ("N/A" com nome): não ganha matrícula de servidor', nomeNoCard(h) === 'MOTORISTA LACEN', nomeNoCard(h));
    h = g.cardPassageiroGuiaHTML({ matricula: '777', nome: 'ANA', hora: '', quantidade: 1 }, 'V1', 0);
    teste('paciente: "(mat. 777)" como sempre', nomeNoCard(h) === 'ANA (mat. 777)');

    console.log('\n== mensagem ao motorista ==');
    const msg = w.gerarMensagemWhatsapp({ motoristaAtribuido: 'M', roteiro: ['FLORIANOPOLIS'], horaEmbarque: '05:00', localEmbarque: 'S',
      passageiros: [S({ servidorNome: 'Fulano Ficticio', servidorMatricula: '123' }), S({ chaveDemanda: 'D-S2', hora: '10:00' })] }, '2026-09-20');
    teste('servidor identificado: "SERVIDOR FULANO FICTICIO"', msg.indexOf('*09:00 — SERVIDOR FULANO FICTICIO*') > -1);
    teste('sem identificação: "SERVIDOR"', msg.indexOf('*10:00 — SERVIDOR*') > -1);

    console.log('\n== busca da Guia ==');
    teste('a busca também procura pelo nome e matrícula do servidor', ler('GuiaMotoristas.html.md').indexOf("${p.servidorNome || ''} ${p.servidorMatricula || ''}") > -1);
  });
});
