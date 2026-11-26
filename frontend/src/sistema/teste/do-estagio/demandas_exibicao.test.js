// Trazido de ferramentas/testes/teste_demandas_exibicao.cjs, do SIGEPAS em Apps Script (projeto do estágio). As verificações
// são as mesmas; mudou só a base, que agora roda as funções das telas trazidas no Vitest.
// Passo 3.2 (+3.2a): a Demandas mostra o servidor como "Servidor" e a matrícula nula como "—".
// Dados fictícios.
import { carregarTelas } from '../preparar-telas';
import { ler, extrair, carregar, teste } from './base-dos-testes-do-estagio.js';

describe('teste_demandas_exibicao (testes do estágio)', () => {
  beforeAll(carregarTelas);
  it('as verificações do teste original continuam valendo', () => {

    const f = carregar('Demandas.html.md', ['dmNorm', 'dmMarcadorNulo', 'dmNomeExib', 'dmMatExib', 'dmNomeAviso']);

    console.log('== nome exibido ==');
    teste('servidor → "Servidor" (sem o objetivo, D2 revista)', f.dmNomeExib({ matricula: '-', nome: '-', objetivo: 'Reunião no LACEN' }) === 'Servidor');
    teste('servidor com "N/A" e "Não informado"', f.dmNomeExib({ matricula: 'N/A', nome: 'Não informado' }) === 'Servidor');
    teste('paciente → o próprio nome', f.dmNomeExib({ matricula: '777', nome: 'Ana Ficticia' }) === 'Ana Ficticia');
    teste('LACEN (nome sem matrícula) → o nome, não "Servidor"', f.dmNomeExib({ matricula: 'N/A', nome: 'Motorista Ficticio', objetivo: 'Transporte de Insumos' }) === 'Motorista Ficticio');
    teste('o aviso de embarque usa o mesmo nome', f.dmNomeAviso({ matricula: '-', nome: '-', objetivo: 'Reunião' }) === 'Servidor');
    teste('aviso sem nome nenhum', f.dmNomeAviso({ matricula: '777', nome: '' }) === '(sem nome)');

    console.log('\n== matrícula exibida ==');
    teste('"-" → "—"', f.dmMatExib({ matricula: '-' }) === '—');
    teste('"N/A" → "—"', f.dmMatExib({ matricula: 'N/A' }) === '—');
    teste('vazia → "—"', f.dmMatExib({}) === '—');
    teste('matrícula de verdade aparece igual', f.dmMatExib({ matricula: ' 777 ' }) === '777');

    console.log('\n== a tela não mostra mais o texto cru ==');
    const src = ler('Demandas.html.md');
    teste('nenhum "dmEsc(p.nome" em exibição', !/dmEsc\(p\.nome/.test(src));
    teste('nenhum "mat. " com a matrícula crua', !/mat\. ' \+ (dmEsc\()?\(?p\.matricula/.test(src));
    const pontos = (src.match(/dmNomeExib\(p\)/g) || []).length + (src.match(/dmNomeHTML\(p[,)]/g) || []).length;
    teste('nome exibido em 11 pontos (texto ou selo — passo 6.3)', pontos >= 11, pontos);
    teste('dmNomeExib é só exibição: não entra no payload gravado', extrair(src, 'dmGravarCarro').indexOf('dmNomeExib') === -1 && extrair(src, 'dmSalvarEdicao').indexOf('dmNomeExib') === -1);
  });
});
