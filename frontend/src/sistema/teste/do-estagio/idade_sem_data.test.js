// Trazido de ferramentas/testes/teste_idade_sem_data.cjs, do SIGEPAS em Apps Script (projeto do estágio). As verificações
// são as mesmas; mudou só a base, que agora roda as funções das telas trazidas no Vitest.
// Passo 4.4: passageiro sem data de nascimento (LACEN, servidor) não mostra idade nem alertas de idade —
// antes aparecia "0 anos" + alerta vermelho "Bebê Conforto". E o servidor sai "SERVIDOR" no WhatsApp.
// Roda as funções reais do WhatsappFormatter, da Guia e confere a Demandas. Dados fictícios.
import { carregarTelas } from '../preparar-telas';
import { ler, carregar, teste } from './base-dos-testes-do-estagio.js';

describe('teste_idade_sem_data (testes do estágio)', () => {
  beforeAll(carregarTelas);
  it('as verificações do teste original continuam valendo', () => {

    // 11/11/2026: o recado ao paciente usa wppPeriodoDoDia e wppEmbarqueSecretaria.
    const W = ['wppPeriodoDoDia', 'wppEmbarqueSecretaria', 'calcularIdade', 'regrasIdade', 'nivelMaisAlto', 'temRestricaoReal', 'tituloMsg', 'wppNomePax',
      'formatarTelefonesWpp', 'gerarMensagemWhatsapp', 'gerarMensagemPacienteWhatsapp'];
    // formatarTelefonesWpp e guiaNomePax moram na Guia: entram como "globais", como no navegador
    const guia = carregar('GuiaMotoristas.html.md', ['guiaMarcadorNulo', 'guiaNomePax', 'formatarTelefonesWpp']);
    const wpp = carregar('WhatsappFormatter.html.md', W.filter(n => n !== 'formatarTelefonesWpp'),
      { guiaNomePax: guia.guiaNomePax, formatarTelefonesWpp: guia.formatarTelefonesWpp });

    const iso = anosAtras => { const d = new Date(); d.setFullYear(d.getFullYear() - anosAtras); d.setDate(d.getDate() - 10); return d.toISOString().slice(0, 10); };
    const bebe = (() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10); })();

    console.log('== idade ==');
    teste('sem data → semData', wpp.calcularIdade('').semData === true);
    teste('data que não é data ("45") → semData (antes: "NaN anos")', wpp.calcularIdade('45').semData === true);
    teste('sem data mantém os zeros (tela antiga continua como era)', wpp.calcularIdade(undefined).anos === 0);
    const i40 = wpp.calcularIdade(iso(40));
    teste('com data → idade, sem semData', i40.anos === 40 && !i40.semData, JSON.stringify(i40));

    console.log('\n== alertas de idade ==');
    teste('sem data → nenhum alerta (antes: Bebê Conforto)', wpp.regrasIdade({ nascimento: '' }).length === 0);
    teste('data inválida → nenhum alerta', wpp.regrasIdade({ nascimento: '45' }).length === 0);
    teste('bebê de 6 meses → Bebê Conforto (continua)', wpp.regrasIdade({ nascimento: bebe })[0].label === 'Bebê Conforto');
    teste('idoso sem acompanhante → alerta (continua)', wpp.regrasIdade({ nascimento: iso(70), quantidade: 1 }).some(a => a.label === 'IDOSO SEM ACOMPANHANTE'));
    teste('adulto de 40 → nenhum alerta (continua)', wpp.regrasIdade({ nascimento: iso(40) }).length === 0);

    console.log('\n== card da Guia ==');
    const card = carregar('GuiaMotoristas.html.md', ['guiaMarcadorNulo', 'guiaIdPax', 'guiaNomePax', 'cardPassageiroGuiaHTML'], {
      estadoGuia: { confAberto: null }, statusConfInfo: () => ({ bg: '#fff', cor: '#000', bd: '#ccc', txt: 'Ligar' }),
      calcularIdade: wpp.calcularIdade, regrasIdade: wpp.regrasIdade, nivelMaisAlto: wpp.nivelMaisAlto, temRestricaoReal: wpp.temRestricaoReal,
    });
    const serv = card.cardPassageiroGuiaHTML({ matricula: '-', nome: '-', chaveDemanda: 'D-1', hora: '09:00', quantidade: 1 }, 'V1', 0);
    teste('servidor: sem "anos"', serv.indexOf(' anos<') === -1 && /<span class="gp-idade"><\/span>/.test(serv));
    teste('servidor: sem Bebê Conforto', serv.indexOf('Bebê Conforto') === -1);
    teste('servidor: card sem a marca vermelha', serv.indexOf('gp-perigo') === -1);
    const pac = card.cardPassageiroGuiaHTML({ matricula: '777', nome: 'ANA', nascimento: iso(40), hora: '09:00', quantidade: 1 }, 'V1', 1);
    teste('paciente com data: "40 anos" como sempre', pac.indexOf('<span class="gp-idade">40 anos</span>') > -1);
    const velho = carregar('GuiaMotoristas.html.md', ['guiaMarcadorNulo', 'guiaIdPax', 'guiaNomePax', 'cardPassageiroGuiaHTML'], {
      estadoGuia: { confAberto: null }, statusConfInfo: () => ({ bg: '', cor: '', bd: '', txt: '' }),
      calcularIdade: () => ({ anos: 0, meses: 0 }), regrasIdade: () => [], nivelMaisAlto: () => '', temRestricaoReal: () => false,
    });
    teste('Guia nova com o formatador antigo: "0 anos" como era (sem "undefined")',
      velho.cardPassageiroGuiaHTML({ matricula: '1', nome: 'X', quantidade: 1 }, 'V1', 0).indexOf('<span class="gp-idade">0 anos</span>') > -1);

    console.log('\n== mensagem ao motorista ==');
    const carro = { motoristaAtribuido: 'Motorista', roteiro: ['FLORIANOPOLIS'], horaEmbarque: '05:00', localEmbarque: 'Secretaria', passageiros: [
      { matricula: '-', nome: '-', chaveDemanda: 'D-1', hora: '08:00', local: 'LACEN', cidade: 'FLORIANOPOLIS' },
      { matricula: 'N/A', nome: 'MOTORISTA LACEN', hora: '09:00', local: 'LACEN', cidade: 'FLORIANOPOLIS' },
      { matricula: '777', nome: 'Ana Ficticia', nascimento: iso(40), hora: '10:00', local: 'Hospital', cidade: 'FLORIANOPOLIS' },
    ] };
    const msg = wpp.gerarMensagemWhatsapp(carro, '2026-09-20');
    const bloco = hora => msg.split('----------------------------------------').find(b => b.indexOf('*' + hora + ' — ') > -1) || '';
    teste('servidor sai "SERVIDOR" (antes: "-")', bloco('08:00').indexOf('*08:00 — SERVIDOR*') > -1, bloco('08:00'));
    teste('servidor: sem linha de idade', bloco('08:00').indexOf('Idade:') === -1, bloco('08:00'));
    teste('LACEN: nome e sem linha de idade', bloco('09:00').indexOf('*09:00 — MOTORISTA LACEN*') > -1 && bloco('09:00').indexOf('Idade:') === -1, bloco('09:00'));
    teste('ninguém recebe "Bebê Conforto" por falta de data', msg.indexOf('Bebê Conforto') === -1);
    teste('paciente com data: "Idade: 40 anos" como sempre', bloco('10:00').indexOf('Idade: 40 anos') > -1 && bloco('10:00').indexOf('*10:00 — ANA FICTICIA*') > -1, bloco('10:00'));

    console.log('\n== mensagem ao paciente ==');
    const msgP = wpp.gerarMensagemPacienteWhatsapp(carro.passageiros[0], carro, '2026-09-20');
    teste('servidor sai "*SERVIDOR*" (antes: "*-*")', msgP.indexOf('*SERVIDOR*') > -1 && msgP.indexOf('*-*') === -1);
    const wSemGuia = carregar('WhatsappFormatter.html.md', ['wppNomePax']);
    teste('sem a Guia carregada, cai no nome cru (como antes)', wSemGuia.wppNomePax({ nome: 'Ana' }) === 'ANA');

    console.log('\n== Demandas ==');
    const dm = ler('Demandas.html.md');
    teste('as duas linhas de card escondem a idade sem data', (dm.match(/\(idade && !idade\.semData \? idade\.anos \+ ' anos' : '—'\)/g) || []).length === 2);
    teste('o painel esconde a idade sem data', dm.indexOf("(idade && !idade.semData ? ' · ' + dmIdadeTexto(p.nascimento, idade) : '')") > -1);
    teste('nenhuma idade mostrada sem olhar semData (inclui a coluna Idade da fila, achada no 6.3)', !/\(idade \? /.test(dm));
    teste('coluna Idade da fila: "—" sem data', dm.indexOf("(idade && !idade.semData ? '<div class=\"dm-idade\">'") > -1);
  });
});
