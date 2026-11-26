// Funções comuns a todas as telas, trazidas do script do Index do SIGEPAS em Apps Script: troca de aba, avisos rápidos
// (toast), janelas do design system e a "última carga do dia". O modo diagnóstico e o selo de versão do Apps Script
// ficaram de fora: aqui o código vem de um commit só, conferido pelo CI.

function abaAtiva() {
  const ativa = document.querySelector('.tab-content.active');
  return ativa ? ativa.id : '';
}

function mudarAba(idAba, elementoClicado) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.ds-nav-aba').forEach(b => b.classList.remove('ativa'));
  document.getElementById(idAba).classList.add('active');
  elementoClicado.classList.add('ativa');
  if (idAba === 'demandas' && typeof iniciarDemandas === 'function') iniciarDemandas(true);
  if (idAba === 'guia' && typeof iniciarGuia === 'function') iniciarGuia();
  if (idAba === 'importacao' && typeof iniciarImportacao === 'function') iniciarImportacao();
  if (idAba === 'escala' && typeof iniciarEscala === 'function') iniciarEscala();
  if (idAba === 'escalaEnviar' && typeof iniciarEscalaEnviar === 'function') iniciarEscalaEnviar();
  if (idAba === 'aba3' && typeof iniciarAba3 === 'function') iniciarAba3();
}

// O nome de quem está usando vem da sessão (login). As telas ainda chamam getOperador(); o servidor ignora o que vem
// daqui e grava o nome da conta que entrou.
let OPERADOR_DA_SESSAO = 'Operador';
function getOperador() {
  return OPERADOR_DA_SESSAO;
}

// Aviso rápido no padrão do design system: canto de baixo à direita, ícone conforme o tipo.
const TOAST_APELIDO = { alerta: 'aviso', sucesso: 'ok' };
const TOAST_ICONE = { ok: 'ti-circle-check', erro: 'ti-alert-circle', aviso: 'ti-alert-triangle', info: 'ti-info-circle' };
function toast(msg, tipo) {
  tipo = TOAST_APELIDO[tipo] || tipo || 'ok';
  if (!TOAST_ICONE[tipo]) tipo = 'info';
  const area = document.getElementById('toastArea');
  const t = document.createElement('div');
  t.className = 'ds-toast ds-toast--' + tipo;
  t.setAttribute('role', 'status');
  t.innerHTML = '<i class="ti ' + TOAST_ICONE[tipo] + '" aria-hidden="true"></i><span>' + msg + '</span>';
  area.appendChild(t);
  setTimeout(() => t.classList.add('saindo'), 3000);
  setTimeout(() => t.remove(), 3300);
}

// ---- Janelas do design system ----
const dsPilha = [];
function dsEsc(s) {
  return (s === null || s === undefined ? '' : s.toString()).split('&').join('&amp;')
    .split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
}
// Data com que as telas abrem: o DIA SEGUINTE, que é o dia que o setor monta.
function dataPadraoISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
}
function dsAbrir(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('aberto');
  if (dsPilha.indexOf(id) === -1) dsPilha.push(id);
}
function dsFechar(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('aberto');
  const i = dsPilha.indexOf(id);
  if (i > -1) dsPilha.splice(i, 1);
  const fn = el && el.getAttribute('data-ao-fechar');
  if (fn && typeof window[fn] === 'function') window[fn]();
}
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && dsPilha.length) dsFechar(dsPilha[dsPilha.length - 1]);
});
document.addEventListener('click', function (ev) {
  const a = ev.target;
  if (a && a.classList && a.classList.contains('ds-modal-fundo') && !a.hasAttribute('data-sem-fechar-fora')) dsFechar(a.id);
});
// op = { titulo, corpo (HTML), ok, classeOk ('primario' | 'perigo' | 'sucesso'), cancelar, aoConfirmar(fechar), aoCancelar }
function dsConfirmar(op) {
  let fundo = document.getElementById('dsConfirma');
  if (!fundo) {
    fundo = document.createElement('div');
    fundo.className = 'ds-modal-fundo';
    fundo.id = 'dsConfirma';
    fundo.innerHTML = '<div class="ds-modal" role="dialog" aria-modal="true" aria-labelledby="dsConfTit">'
      + '<div class="ds-modal-cab"><div class="ds-modal-titulo" id="dsConfTit"></div>'
      + '<button class="ds-btn ds-btn--fantasma ds-btn--icone ds-modal-fechar" id="dsConfX" title="Fechar"><i class="ti ti-x"></i></button></div>'
      + '<div class="ds-modal-corpo" id="dsConfCorpo"></div>'
      + '<div class="ds-modal-pe"><span class="ds-dica"></span><button class="ds-btn ds-btn--secundario" id="dsConfNao"></button>'
      + '<button class="ds-btn" id="dsConfOk"></button></div></div>';
    document.body.appendChild(fundo);
  }
  document.getElementById('dsConfTit').textContent = op.titulo || '';
  document.getElementById('dsConfCorpo').innerHTML = op.corpo || '';
  const nao = document.getElementById('dsConfNao');
  nao.textContent = op.cancelar || 'Cancelar';
  const ok = document.getElementById('dsConfOk');
  ok.className = 'ds-btn ds-btn--' + (op.classeOk || 'primario');
  ok.innerHTML = op.ok || 'Confirmar';
  const fechar = function () { dsFechar('dsConfirma'); };
  ok.onclick = function () { if (op.aoConfirmar) op.aoConfirmar(fechar); else fechar(); };
  nao.onclick = function () { fechar(); if (op.aoCancelar) op.aoCancelar(); };
  document.getElementById('dsConfX').onclick = nao.onclick;
  dsAbrir('dsConfirma');
}

// A Lista de Tarefas (Kanban) não faz parte desta entrega. As telas ainda chamam a função do contador.
function atualizarBadgeKanban() {}

// ---- Última carga do dia ----
// Viagens Externas e Confirmação e Guias pedem a mesma carga do dia. A última recebida fica guardada por data, só na
// memória da página (some com o F5, e dado de paciente não vai para o armazenamento do navegador). Ao voltar para a aba,
// a tela mostra a guardada na hora e pergunta à API só se a versão mudou. O aviso de mudança do tempo real apaga a
// carga guardada do dia que mudou (tempo-real.js).
const CARGA_DIA = {};
const CARGA_DIA_VALIDADE = 10 * 60 * 1000;
function cargaDiaGuardar(dados) {
  if (!dados || !dados._dataISO || dados._lembrada) return;
  try { CARGA_DIA[dados._dataISO] = { texto: JSON.stringify(dados), versao: dados._versao || '', em: Date.now() }; } catch { /* sem espaço para guardar: a tela pede de novo */ }
}
function cargaDiaTem(dataISO) { return !!CARGA_DIA[dataISO]; }
function cargaDiaEsquecer(datas) { (datas || []).forEach(function (d) { delete CARGA_DIA[d]; }); }
function cargaDiaPedir(pedido, aoChegar, aoFalhar) {
  const m = pedido.lembrar ? CARGA_DIA[pedido.data] : null;
  let versao = '';
  if (m) {
    versao = (Date.now() - m.em > CARGA_DIA_VALIDADE) ? '' : m.versao;
    const copia = JSON.parse(m.texto);
    copia._lembrada = true;
    aoChegar(copia, 'lembrada');
  }
  chamarServidor('getDadosOperacaoSeMudou', [pedido.data, versao], function (d) {
    if (d && d.semMudanca) return;
    cargaDiaGuardar(d);
    aoChegar(d, m ? 'nova' : 'servidor');
  }, function (e) {
    if (!m) { aoFalhar(e); return; }
    toast('Não consegui conferir se o dia mudou: ' + ((e && e.message) || e) + '. Mostrando o que já estava na tela.', 'aviso');
  });
}

// ---- Sessão ----
function carregarUsuario() {
  fetch('/api/autenticacao/eu', { credentials: 'same-origin' }).then(function (resposta) {
    if (resposta.status === 401) { window.location.href = '/?sessao=terminou'; return null; }
    return resposta.json();
  }).then(function (conta) {
    if (!conta) return;
    OPERADOR_DA_SESSAO = conta.nome || conta.email;
    const el = document.getElementById('navbarOperador');
    if (el) {
      const b = document.createElement('b');
      b.textContent = OPERADOR_DA_SESSAO + (conta.papel === 'GESTOR' ? ' (gestor)' : '');
      el.innerHTML = '<i class="ti ti-user-circle" aria-hidden="true"></i>';
      el.appendChild(b);
    }
  }).catch(function () { toast('Sem conexão com o servidor.', 'erro'); });
}

function sairDoSistema() {
  fetch('/api/autenticacao/sair', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}'
  }).finally(function () { window.location.href = '/'; });
}

window.addEventListener('load', function () {
  carregarUsuario();
  if (typeof iniciarImportacao === 'function') iniciarImportacao();
});

// ---- Exposição para o HTML e as outras telas (as telas vieram do Apps Script, onde tudo era global; ADR 0016).
Object.assign(window, { abaAtiva, mudarAba, getOperador, toast, dsEsc, dataPadraoISO, dsAbrir, dsFechar, dsConfirmar, atualizarBadgeKanban, cargaDiaGuardar, cargaDiaTem, cargaDiaEsquecer, cargaDiaPedir, carregarUsuario, sairDoSistema });
Object.defineProperty(window, 'OPERADOR_DA_SESSAO', { configurable: true, get: () => OPERADOR_DA_SESSAO, set: (valor) => { OPERADOR_DA_SESSAO = valor; } });
Object.defineProperty(window, 'TOAST_APELIDO', { configurable: true, get: () => TOAST_APELIDO });
Object.defineProperty(window, 'TOAST_ICONE', { configurable: true, get: () => TOAST_ICONE });
Object.defineProperty(window, 'dsPilha', { configurable: true, get: () => dsPilha });
Object.defineProperty(window, 'CARGA_DIA', { configurable: true, get: () => CARGA_DIA });
Object.defineProperty(window, 'CARGA_DIA_VALIDADE', { configurable: true, get: () => CARGA_DIA_VALIDADE });
