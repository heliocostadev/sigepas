// Trazido de ferramentas/testes/teste_demandas_servidor_ident.cjs, do SIGEPAS em Apps Script (projeto do estágio). As verificações
// são as mesmas; mudou só a base, que agora roda as funções das telas trazidas no Vitest.
// Passo S.3 (18/09): a Demandas do Dia pede e EXIGE nome e matrícula do servidor ao montar e ao editar o carro;
// mostra "SERVIDOR FULANO" quando informado. A identidade (dmChaveP) não muda. Dados fictícios.
import { carregarTelas } from '../preparar-telas';
import { ler, extrair, carregar, teste } from './base-dos-testes-do-estagio.js';

describe('teste_demandas_servidor_ident (testes do estágio)', () => {
  beforeAll(carregarTelas);
  it('as verificações do teste original continuam valendo', () => {

    const src = ler('Demandas.html.md');
    const esc = s => String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');

    function montar(estadoDm) {
      const el = {};
      const cls = () => { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c), contains: c => s.has(c) }; };
      ['dmCfmTit', 'dmCfmCorpo', 'dmCfmOk', 'dmCfm', 'dmCfmFundo'].forEach(id => { el[id] = { classList: cls(), style: {} }; });
      const document = {
        getElementById: id => el[id] || null,
        querySelector: () => ({ style: {} }),
        addEventListener() {}, removeEventListener() {},
      };
      const f = carregar('Demandas.html.md', ['dmNorm', 'dmMarcadorNulo', 'dmChaveP', 'dmNomeExib', 'dmNomeHTML', 'dmMatExib',
        'dmFecharConfirma', 'dmAvisoOk', 'dmAvisoTecla', 'dmEhServidor', 'dmIdentServidor', 'dmSemIdentServidor',
        'dmAvisarSemIdentServidor', 'dmCamposServidorHTML', 'dmServidorCampo'], { document, dmEsc: esc, estadoDm: estadoDm || {} });
      return { f, el };
    }
    const SERV = (extra) => Object.assign({ id: 'P1', matricula: '-', nome: '-', chaveDemanda: 'D-SERV1', objetivo: 'Reunião no LACEN', hora: '09:00' }, extra || {});

    console.log('== como aparece ==');
    let t = montar();
    teste('servidor sem identificação: "Servidor" (como antes)', t.f.dmNomeExib(SERV()) === 'Servidor');
    teste('identificado: "Servidor FULANO"', t.f.dmNomeExib(SERV({ servidorNome: 'Fulano Ficticio' })) === 'Servidor Fulano Ficticio');
    teste('em HTML: selo + nome escapado', t.f.dmNomeHTML(SERV({ servidorNome: 'Fulano <X>' })) === '<span class="dm-selo-serv">Servidor</span> Fulano &lt;X&gt;');
    teste('sem nome: só o selo (igual ao 6.3)', t.f.dmNomeHTML(SERV()) === '<span class="dm-selo-serv">Servidor</span>');
    teste('matrícula do servidor quando informada', t.f.dmMatExib(SERV({ servidorMatricula: '123' })) === '123');
    teste('sem matrícula: "—"', t.f.dmMatExib(SERV()) === '—');
    teste('paciente: nada muda', t.f.dmNomeExib({ matricula: '7', nome: 'ANA', servidorNome: 'X' }) === 'ANA' && t.f.dmMatExib({ matricula: '7', nome: 'ANA', servidorMatricula: '9' }) === '7');
    teste('LACEN ("N/A" com nome) não é servidor', t.f.dmEhServidor({ matricula: 'N/A', nome: 'MOTORISTA' }) === false);
    teste('a identidade NÃO muda com o nome informado', t.f.dmChaveP(SERV({ servidorNome: 'Fulano', servidorMatricula: '1' })) === '#D-SERV1');

    console.log('\n== quem falta identificar ==');
    const pac = [SERV({ id: 'a' }), SERV({ id: 'b', servidorNome: 'Fulano' }), SERV({ id: 'c', servidorNome: 'Fulano', servidorMatricula: '1' }),
      SERV({ id: 'd', servidorNome: '-', servidorMatricula: 'N/A' }), { id: 'e', matricula: '7', nome: 'ANA' }];
    const falta = t.f.dmSemIdentServidor(pac).map(p => p.id);
    teste('falta: sem nada, só nome, e com "-"/"N/A"', JSON.stringify(falta) === '["a","b","d"]', JSON.stringify(falta));
    teste('paciente nunca entra na lista', falta.indexOf('e') === -1);

    console.log('\n== o aviso ==');
    t.f.dmAvisarSemIdentServidor([pac[0]]);
    teste('título "Falta identificar o servidor"', t.el.dmCfmTit.textContent === 'Falta identificar o servidor');
    teste('diz qual: objetivo e hora', t.el.dmCfmCorpo.innerHTML.indexOf('<b>Reunião no LACEN</b> · 09:00') > -1, t.el.dmCfmCorpo.innerHTML);
    teste('aviso só com OK', t.el.dmCfm.classList.contains('on') && t.el.dmCfmOk.textContent === 'OK');
    t.f.dmAvisarSemIdentServidor([pac[0], pac[1]]);
    teste('vários: lista todos', (t.el.dmCfmCorpo.innerHTML.match(/<b>Reunião no LACEN<\/b>/g) || []).length === 2);

    console.log('\n== os campos no card ==');
    const h = t.f.dmCamposServidorHTML(SERV({ servidorNome: 'Ana "B"' }), 'P1');
    teste('servidor: dois campos, nome e matrícula', (h.match(/<input /g) || []).length === 2 && h.indexOf('Nome *') > -1 && h.indexOf('Matrícula *') > -1);
    teste('valor já informado aparece, escapado', h.indexOf('value="Ana &quot;B&quot;"') > -1);
    teste('campo que falta sai marcado (vermelho)', /class="dm-serv-in mat falta"/.test(h) && !/class="dm-serv-in falta"/.test(h));
    teste('o campo avisa a tela a cada letra (sem redesenhar)', h.indexOf("oninput=\"dmServidorCampo('P1', 'nome', this)\"") > -1);
    teste('paciente: nenhum campo', t.f.dmCamposServidorHTML({ id: 'x', matricula: '7', nome: 'ANA' }, 'x') === '');

    console.log('\n== digitar guarda no passageiro certo ==');
    const fila = [SERV({ id: 'P1' }), SERV({ id: 'P2' })];
    t = montar({ pacientes: fila, montagem: { ids: ['P1', 'P2'] } });
    const inp = v => { const c = new Set(); return { value: v, classList: { toggle: (k, on) => (on ? c.add(k) : c.delete(k)) }, falta: () => c.has('falta') }; };
    let e1 = inp('Fulano'); t.f.dmServidorCampo('P2', 'nome', e1);
    teste('montando: grava no passageiro da fila (P2, não P1)', fila[1].servidorNome === 'Fulano' && !fila[0].servidorNome);
    teste('campo preenchido perde o vermelho', e1.falta() === false);
    let e2 = inp(''); t.f.dmServidorCampo('P2', 'matricula', e2);
    teste('campo apagado volta a ficar vermelho', e2.falta() === true);
    const pacs = [SERV({ id: 'S-#D-1' })];
    t = montar({ pacientes: [], montagem: { editando: 'AAA1A11', pacs } });
    t.f.dmServidorCampo('S-#D-1', 'matricula', inp('77'));
    teste('editando: grava na cópia do carro', pacs[0].servidorMatricula === '77');

    console.log('\n== no código da tela ==');
    const gravar = extrair(src, 'dmGravarCarro'), editar = extrair(src, 'dmSalvarEdicao');
    teste('montar: trava DEPOIS do embarque e antes de gravar', gravar.indexOf('dmSemIdentServidor(pac)') > gravar.indexOf('dmSemEmbarque(pac)') &&
      gravar.indexOf('dmSemIdentServidor(pac)') < gravar.indexOf('salvarViagensAlocadas'));
    teste('editar: idem', editar.indexOf('dmSemIdentServidor(pac)') > editar.indexOf('dmSemEmbarque(pac)') &&
      editar.indexOf('dmSemIdentServidor(pac)') < editar.indexOf('atualizarCarroAlocado'));
    teste('montar: o payload leva servidorNome e servidorMatricula', /servidorNome: p\.servidorNome \|\| '',\s*\n\s*servidorMatricula: p\.servidorMatricula \|\| ''/.test(gravar));
    teste('editar: mapa "servidores" com a chave do embarque (dmChaveP) e no encaixe', editar.indexOf('servidores[dmChaveP(p)]') > -1 &&
      editar.indexOf('servidores: servidores') > -1 && editar.indexOf("servidorNome: p.servidorNome || '', servidorMatricula") > -1);
    teste('o card da montagem/edição desenha os campos', extrair(src, 'dmChipPassageiroHTML').indexOf('dmCamposServidorHTML(p, id)') > -1);
  });
});
