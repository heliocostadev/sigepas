// Tempo real entre as telas (ADR 0016). A API avisa cada gravação por Server-Sent Events em /api/eventos. Esta aba
// recarrega só o que mudou: o dia que está na tela, a escala aberta ou os cadastros. A aba que gravou não recarrega,
// porque já desenhou a resposta da própria gravação.
(function () {
  'use strict';

  var ESPERA_PARA_RECONECTAR = 5000;

  function contem(datas, data) {
    return !data || !datas || !datas.length || datas.indexOf(data) > -1;
  }

  function valorDe(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  // Viagens Externas: relê o dia sem mexer na data escolhida. Se havia pacientes selecionados, a seleção é desfeita,
  // porque a fila pode ter mudado embaixo dela.
  function atualizarViagensExternas(datas) {
    if (typeof estadoDm === 'undefined' || !contem(datas, estadoDm.data) || estadoDm.carregando) return;
    var data = estadoDm.data;
    chamarServidor('getDadosOperacao', [data], function (dados) {
      if (estadoDm.data !== data) return;
      if (Object.keys(estadoDm.selecionados || {}).length) {
        estadoDm.selecionados = {};
        toast('Outra pessoa gravou neste dia. A seleção foi desfeita: confira e selecione de novo.', 'aviso');
      }
      dmCarregar(dados);
    }, function () {});
  }

  function atualizarGuia(datas) {
    if (!contem(datas, valorDe('gFiltroData')) || typeof carregarGuia !== 'function') return;
    if (typeof guiaGravacoesContato !== 'undefined' && guiaGravacoesContato > 0) return;
    var data = valorDe('gFiltroData');
    chamarServidor('getDadosOperacao', [data], function (dados) {
      if (valorDe('gFiltroData') === data) carregarGuia(dados, true);
    }, function () {});
  }

  // Escala de Viagens: com mudanças não gravadas na tela, só avisa. Sem elas, recarrega.
  function atualizarEscala(datas) {
    if (!contem(datas, valorDe('escFData')) || typeof escCarregarTudo !== 'function') return;
    if (typeof escPendencias === 'function' && escPendencias() > 0) {
      toast('Outra pessoa alterou a escala ou as viagens deste dia. Grave as suas mudanças e recarregue a data.', 'aviso');
      return;
    }
    escCarregarTudo();
  }

  function aoMudar(mudanca) {
    if (!mudanca || mudanca.origem === window.ID_DA_TELA) return;
    var datas = mudanca.datas || [];
    if (datas.length && typeof cargaDiaEsquecer === 'function') cargaDiaEsquecer(datas);
    var aba = typeof abaAtiva === 'function' ? abaAtiva() : '';
    if (mudanca.assunto === 'operacao' || mudanca.assunto === 'escala') {
      if (aba === 'demandas') atualizarViagensExternas(datas);
      if (aba === 'guia') atualizarGuia(datas);
      if (aba === 'escala') atualizarEscala(datas);
      if (aba === 'escalaEnviar' && typeof envBuscar === 'function') envBuscar();
    }
    if (mudanca.assunto === 'cadastros' || mudanca.assunto === 'padronizacao') {
      if (typeof configCarregada !== 'undefined') configCarregada = false;
      if (aba === 'aba3' && typeof carregarAba3 === 'function') carregarAba3();
    }
    if (mudanca.assunto === 'padronizacao' || mudanca.assunto === 'operacao') {
      if (typeof atualizarBadgePendentes === 'function') atualizarBadgePendentes();
    }
  }

  function conectar() {
    if (!window.EventSource) return;
    var fonte = new EventSource('/api/eventos', { withCredentials: true });
    fonte.addEventListener('mudanca', function (evento) {
      try { aoMudar(JSON.parse(evento.data)); } catch (e) { /* aviso malformado: ignora */ }
    });
    fonte.onerror = function () {
      // Sessão vencida ou API reiniciando: tenta de novo depois de alguns segundos.
      fonte.close();
      setTimeout(conectar, ESPERA_PARA_RECONECTAR);
    };
  }

  window.addEventListener('load', conectar);
})();
