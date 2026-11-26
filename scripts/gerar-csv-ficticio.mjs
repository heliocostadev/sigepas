#!/usr/bin/env node
// Gera um arquivo CSV fictício no formato do OLOSTECH (as 27 colunas descritas em docs/produto/glossario.md e em
// 02-DOCUMENTACAO/01_IMPORTACAO.md), para testes e demonstração. Nenhum dado é real: nomes, matrículas, endereços e
// telefones são inventados, e os telefones usam o prefixo 0000, que não existe.
// O resultado é sempre o mesmo para as mesmas datas (sem sorteio), para o teste poder conferir números exatos.
//
// Uso: node scripts/gerar-csv-ficticio.mjs 2026-11-27 2026-12-18 > docs/exemplos/olostech-ficticio.csv

const CABECALHO = [
  'Data compromisso', 'Cidade', 'Hora', 'Local destino', 'Tipo veículo', 'Restrições', 'Objetivo', 'Bairro paciente',
  'Local embarque', 'QTD pessoas', 'Tipo atendimento', 'Matrícula paciente', 'Nome paciente', 'Trecho paciente',
  'Data nascimento paciente', 'Faixa etária paciente', 'Logradouro paciente', 'Número residência paciente',
  'Telefone 1 paciente', 'Telefone 2 paciente', 'Telefone 3 paciente', 'Acompanhante', 'Trecho acompanhante',
  'Telefone 1 acompanhante', 'Telefone 2 acompanhante', 'Telefone 3 acompanhante', 'Status do pedido',
];

const DESTINOS = [
  ['FLORIANÓPOLIS', 'HOSPITAL REGIONAL DE EXEMPLO'],
  ['CURITIBA', 'CLINICA DE DEMONSTRAÇAO'],
  ['BLUMENAU', 'CENTRO DE ESPECIALIDADES MODELO'],
  ['ITAJAÍ', 'HOSPITAL FICTÍCIO DO LITORAL'],
  ['FLORIANÓPOLIS', 'HOSP. REGIONAL DE EXEMPLO'],
  ['JOINVILLE', 'POLICLÍNICA DE EXEMPLO'],
];
const NOMES = ['ANA', 'BRUNO', 'CECÍLIA', 'DIEGO', 'ELISA', 'FÁBIO', 'GABRIELA', 'HEITOR', 'ISABEL', 'JOÃO', 'KARINA', 'LUÍS'];
const SOBRENOMES = ['FICTÍCIA', 'EXEMPLO', 'MODELO', 'TESTE', 'AMOSTRA', 'SIMULADA'];
const BAIRROS = ['CENTRO', 'AMÉRICA', 'BOA VISTA', 'COSTA E SILVA', 'IRIRIÚ', 'GLÓRIA'];
const OBJETIVOS = ['Consulta', 'Exame', 'Hemodiálise', 'Retorno'];
const HORAS = ['07:30', '08:00', '09:00', '10:30', '13:00', '14:30'];

function* dias(inicio, fim) {
  for (let d = new Date(`${inicio}T12:00:00Z`); d <= new Date(`${fim}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) yield new Date(d);
  }
}

function campo(valor) {
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function gerarLinhas(inicio, fim, pedidosPorDia = 8) {
  const linhas = [CABECALHO];
  let n = 0;
  for (const dia of dias(inicio, fim)) {
    const data = dia.toISOString().slice(0, 10).split('-').reverse().join('/');
    for (let i = 0; i < pedidosPorDia; i++, n++) {
      const [cidade, local] = DESTINOS[n % DESTINOS.length];
      const comAcompanhante = n % 3 === 0;
      const nome = `${NOMES[n % NOMES.length]} ${SOBRENOMES[(n >> 1) % SOBRENOMES.length]} DA SILVA ${String(n).padStart(3, '0')}`;
      linhas.push([
        data, cidade, HORAS[n % HORAS.length], local, n % 7 === 0 ? 'Ambulância' : 'Automóvel', n % 5 === 0 ? 'Cadeirante' : '',
        OBJETIVOS[n % OBJETIVOS.length], BAIRROS[n % BAIRROS.length], `RUA FICTÍCIA ${n % 40}, ${100 + n}`,
        comAcompanhante ? 2 : 1, comAcompanhante ? 'Com Acompanhante' : 'Sozinho', String(900000 + n), nome,
        'Completo (Ida e Volta)', `${String((n % 28) + 1).padStart(2, '0')}/0${(n % 9) + 1}/19${50 + (n % 50)}`, 'Adulto',
        `RUA FICTÍCIA ${n % 40}`, String(100 + n), `(00) 0000-${String(1000 + n).slice(-4)}`, '', '',
        comAcompanhante ? `ACOMPANHANTE FICTÍCIO ${n}` : '', comAcompanhante ? 'Completo (Ida e Volta)' : '',
        comAcompanhante ? `(00) 0000-${String(5000 + n).slice(-4)}` : '', '', '', n % 11 === 0 ? 'Cancelado' : 'Ativo',
      ]);
    }
  }
  return linhas;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('gerar-csv-ficticio.mjs')) {
  const [inicio = '2026-11-27', fim = '2026-12-18'] = process.argv.slice(2);
  process.stdout.write(`${gerarLinhas(inicio, fim).map((linha) => linha.map(campo).join(',')).join('\n')}\n`);
}
