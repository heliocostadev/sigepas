// =======================================================================
  // ABA IMPORTAÇÃO — upload do CSV + padronização de locais
  // (regra do parser do GAS: zero caractere menor-que como operador/regex)
  // =======================================================================
  let arquivoImp = null;

  // Chamada pelo Index ao entrar na aba: atualiza o contador de pendências.
  function iniciarImportacao() {
    atualizarBadgePendentes();
  }

  function atualizarBadgePendentes() {
    chamarServidor('getLocaisPendentes', [], function(res) {
        var n = (res || []).length;
        var badge = document.getElementById('impBadgePendentes');
        if (!badge) return;
        badge.innerText = n;
        badge.style.display = n > 0 ? 'inline-flex' : 'none';
      }, function() {});
  }

  function aoEscolherArquivoImp() {
    var input = document.getElementById('impArquivo');
    definirArquivoImp(input.files.length > 0 ? input.files[0] : null);
  }

  function impStatus(icone, cor, texto) {
    document.getElementById('impStatus').innerHTML = (icone ? '<i class="ti ' + icone + '"' + (cor ? ' style="color:' + cor + '"' : '') + '></i>' : '')
      + '<span' + (cor ? ' style="color:' + cor + '"' : '') + '>' + texto + '</span>';
  }

  function definirArquivoImp(file) {
    arquivoImp = file;
    var drop = document.getElementById('impDrop');
    var info = document.getElementById('impNomeArquivo');
    if (!file) {
      info.innerHTML = '';
      info.classList.add('ds-oculto');
      document.getElementById('impBtnProcessar').disabled = true;
      impStatus('ti-info-circle', '', 'Aguardando arquivo...');
      drop.classList.remove('com-arquivo');
      return;
    }
    info.innerHTML = '<i class="ti ti-file-check"></i>' + escaparHtmlLocais(file.name) + ' · ' + (file.size / 1024).toFixed(1) + ' KB';
    info.classList.remove('ds-oculto');
    document.getElementById('impBtnProcessar').disabled = false;
    impStatus('ti-check', 'var(--ds-sucesso)', 'Pronto para processar o CSV.');
    drop.classList.add('com-arquivo');
  }

  // Arrastar e soltar o arquivo na área
  (function () {
    var drop = document.getElementById('impDrop');
    if (!drop) return;
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); drop.classList.add('arrastando'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); drop.classList.remove('arrastando'); });
    });
    drop.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || files.length === 0) return;
      var f = files[0];
      if (f.name.toLowerCase().slice(-4) !== '.csv') { toast('Envie um arquivo .csv', 'aviso'); return; }
      definirArquivoImp(f);
    });
  })();

  function importarCSV() {
    var btn = document.getElementById('impBtnProcessar');
    if (!arquivoImp) { toast('Escolha o arquivo CSV das viagens primeiro.', 'aviso'); return; }
    btn.disabled = true;
    document.getElementById('impStatus').innerHTML = '<span class="ds-giro"></span><span style="color:var(--ds-atencao-texto)">Processando…</span>';
    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target.result;
      chamarServidor('processarCSVUpload', [text], function (res) {
          impStatus('ti-circle-check', 'var(--ds-sucesso)', 'Banco atualizado');
          setTimeout(function () { document.getElementById('impStatus').innerHTML = ''; }, 4000);
          btn.disabled = false;
          mostrarResumoImportacao(res);
          atualizarBadgePendentes();
          var pend = (res && res.pendencias) ? res.pendencias : [];
          var corr = (res && res.corrigidas) ? res.corrigidas : 0;
          var cancel = (res && res.canceladas) ? res.canceladas : 0;
          // Desde 28/08 eles não são mais ignorados: entram marcados, para o sistema poder
          // avisar quando o cancelamento atinge alguém que já está num carro.
          var sufixoCancel = cancel > 0 ? (' (' + cancel + ' cancelado(s) pelo posto)') : '';
          if (pend.length > 0) {
            toast('Viagens importadas' + sufixoCancel + '. ' + pend.length + ' local(is) novo(s) para revisar.', 'aviso');
            abrirModalLocais(pend);
          } else {
            toast('Viagens processadas' + (corr > 0 ? ' — ' + corr + ' local(is) padronizados automaticamente' : '') + sufixoCancel + '!', 'ok');
          }
          if (res && res.avisoHeader) toast(res.avisoHeader, 'aviso');
          // Coordenadas das cidades novas do dia, para a ordem de Montar Carros (29/09/2026).
          // Em segundo plano e em silêncio: a importação já terminou, e se o Google falhar a
          // cidade só fica no fim da lista até a próxima importação.
        }, function (err) {
          // Antes era um alert() do navegador (06/11/2026: o design system usa o aviso do sistema).
          impStatus('ti-alert-circle', 'var(--ds-perigo)', 'Falha ao processar o arquivo');
          btn.disabled = false;
          toast('Erro ao processar arquivo: ' + escaparHtmlLocais(err.message), 'erro');
        });
    };
    reader.readAsText(arquivoImp, 'UTF-8');
  }

  function mostrarResumoImportacao(res) {
    res = res || {};
    var total = res.totalLinhas || 0;
    var corr = res.corrigidas || 0;
    var cancel = res.canceladas || 0;
    var pend = (res.pendencias || []).length;

    var chips = [];
    chips.push(chipImpHTML(total, total === 1 ? 'viagem importada' : 'viagens importadas', 'sucesso'));
    if (corr > 0) chips.push(chipImpHTML(corr, corr === 1 ? 'local padronizado' : 'locais padronizados', ''));
    if (cancel > 0) chips.push(chipImpHTML(cancel, cancel === 1 ? 'pedido cancelado' : 'pedidos cancelados', ''));
    if (pend > 0) chips.push(chipImpHTML(pend, pend === 1 ? 'local novo para revisar' : 'locais novos para revisar', 'atencao'));

    document.getElementById('impResumoChips').innerHTML = chips.join('');
    document.getElementById('impResumo').classList.remove('ds-oculto');
  }

  function chipImpHTML(num, texto, variante) {
    return '<div class="ds-kpi' + (variante ? ' ds-kpi--' + variante : '') + '">'
      + '<span class="ds-kpi-num">' + num + '</span><span class="ds-kpi-rotulo">' + texto + '</span></div>';
  }

  // =======================================================================
  // PADRONIZAÇÃO DE LOCAIS (dicionário) — modal de revisão pós-import
  // (regra do parser do GAS: zero caractere menor-que como operador/regex neste script)
  // =======================================================================
  let pendenciasLocais = [];
  let padroesLocais = { cidades: [], pares: [] };
  let mapaLocalParaCidades = {}; // "LOCAL(NORM)" -> [cidadesPadrao distintas]

  function escaparHtmlLocais(s) {
    return (s === null || s === undefined ? '' : s.toString())
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;');
  }

  function fecharModalLocais() {
    dsFechar('modalLocais');
  }

  // Estado da janela sem a lista (carregando, salvo, erro): o rodapé some e o corpo mostra o estado.
  function estadoModalLocais(tipo, texto, sub, botao) {
    var icone = tipo === 'carregando' ? 'ti-loader-2' : (tipo === 'sucesso' ? 'ti-circle-check' : 'ti-circle-x');
    document.getElementById('impLocPe').style.display = 'none';
    document.getElementById('conteudoModalLocais').innerHTML = '<div class="ds-modal-estado ' + tipo + '"><i class="ti ' + icone + '"></i>'
      + '<div class="ds-modal-estado-txt">' + texto + '</div>'
      + (sub ? '<div class="ds-modal-estado-sub">' + sub + '</div>' : '')
      + (botao || '') + '</div>';
  }

  function abrirRevisaoLocais() {
    document.getElementById('impLocTit').innerHTML = '<i class="ti ti-map-pin"></i> Padronização de locais';
    estadoModalLocais('carregando', 'Buscando locais pendentes...');
    dsAbrir('modalLocais');
    chamarServidor('getLocaisPendentes', [], function(res) {
        var pend = res || [];
        if (pend.length === 0) { fecharModalLocais(); toast('Nenhum local pendente de revisão.', 'ok'); return; }
        abrirModalLocais(pend);
      }, function(err) {
        estadoModalLocais('erro', 'Falha ao buscar pendências', escaparHtmlLocais(err.message),
          '<button class="ds-btn ds-btn--secundario" style="margin-top:16px;" onclick="fecharModalLocais()">Fechar</button>');
      });
  }

  function abrirModalLocais(pendencias) {
    pendenciasLocais = (pendencias || []).map(function(p) {
      return { cidade: p.cidade || '', local: p.local || '', ocorrencias: p.ocorrencias || 1,
               sugestaoCidade: '', sugestaoLocal: '', fonte: '', similaridade: 0, cidadeGoogle: '',
               carregando: true, editando: false, decisao: '', cidadeFinal: '', localFinal: '' };
    });
    renderizarPendenciasLocais();
    dsAbrir('modalLocais');
    var enxuto = pendenciasLocais.map(function(p) { return { cidade: p.cidade, local: p.local }; });
    chamarServidor('getSugestoesLocais', [enxuto], receberSugestoesLocais, function() {
        pendenciasLocais.forEach(function(p) { p.carregando = false; p.fonte = 'nenhuma'; });
        renderizarPendenciasLocais();
      });
    // Carrega os valores já padronizados para o autocomplete da edição
    chamarServidor('getPadroesLocais', [], function(res) {
        padroesLocais = res || { cidades: [], pares: [] };
        mapaLocalParaCidades = {};
        (padroesLocais.pares || []).forEach(function(pp) {
          var k = (pp.local || '').trim().toUpperCase();
          if (!mapaLocalParaCidades[k]) mapaLocalParaCidades[k] = [];
          if (mapaLocalParaCidades[k].indexOf(pp.cidade) === -1) mapaLocalParaCidades[k].push(pp.cidade);
        });
        renderizarPendenciasLocais();
      }, function() {});
  }

  function receberSugestoesLocais(sugestoes) {
    sugestoes = sugestoes || [];
    for (var i = 0; sugestoes.length > i; i++) {
      if (!pendenciasLocais[i]) continue;
      var s = sugestoes[i];
      pendenciasLocais[i].sugestaoCidade = s.sugestaoCidade || '';
      pendenciasLocais[i].sugestaoLocal = s.sugestaoLocal || '';
      pendenciasLocais[i].fonte = s.fonte || 'nenhuma';
      pendenciasLocais[i].similaridade = s.similaridade || 0;
      pendenciasLocais[i].cidadeGoogle = s.cidadeGoogle || '';
      pendenciasLocais[i].carregando = false;
    }
    renderizarPendenciasLocais();
  }

  function renderizarPendenciasLocais() {
    var total = pendenciasLocais.length;
    var decididas = pendenciasLocais.filter(function(p) { return p.decisao; }).length;
    var palavra = total === 1 ? 'combinação nova' : 'combinações novas';
    var cards = pendenciasLocais.map(function(p, i) { return cardPendenciaLocalHTML(p, i); }).join('');
    document.getElementById('impLocTit').innerHTML = '<i class="ti ti-map-pin"></i> Padronização de locais — ' + total + ' ' + palavra;
    document.getElementById('conteudoModalLocais').innerHTML = datalistsPadroesHTML() + cards;
    document.getElementById('impLocPe').style.display = '';
    document.getElementById('impLocDica').textContent = 'Decididas ' + decididas + ' de ' + total;
    document.getElementById('impLocSalvar').disabled = decididas === 0;
  }

  function datalistsPadroesHTML() {
    var op = function(v) { return '<option value="' + escaparHtmlLocais(v) + '"></option>'; };
    var locais = [], vistos = {};
    (padroesLocais.pares || []).forEach(function(p) {
      var k = (p.local || '').toUpperCase();
      if (!vistos[k]) { vistos[k] = true; locais.push(p.local); }
    });
    return '<datalist id="dlCidadesPadrao">' + (padroesLocais.cidades || []).map(op).join('') + '</datalist>'
         + '<datalist id="dlLocaisPadrao">' + locais.map(op).join('') + '</datalist>';
  }

  function cardPendenciaLocalHTML(p, i) {
    var cidadeTxt = escaparHtmlLocais(p.cidade) || '(cidade vazia)';
    var localTxt = escaparHtmlLocais(p.local) || '(local vazio)';
    var plural = p.ocorrencias === 1 ? '' : 's';
    var corpo = p.decisao ? resumoDecisaoLocalHTML(p, i) : (p.editando ? edicaoManualLocalHTML(p, i) : sugestaoLocalHTML(p, i));
    return '<div class="imp-pend' + (p.decisao ? ' decidida' : '') + '">'
      + '<div class="imp-pend-tit">' + cidadeTxt + ' <span class="ds-texto-3">—</span> ' + localTxt
      + ' <small>(' + p.ocorrencias + ' ocorrência' + plural + ')</small></div>'
      + corpo + '</div>';
  }

  function sugestaoLocalHTML(p, i) {
    var area;
    if (p.carregando) {
      area = '<div class="ds-texto-2"><span class="ds-giro" style="display:inline-block; vertical-align:-4px;"></span> Buscando sugestões…</div>';
    } else if (p.fonte === 'dicionario') {
      // A cidade vem sempre do próprio CSV (o servidor garante). Mostrar em cinza deixa claro
      // que o aceite muda só o nome do local — quem quiser trocar a cidade usa Editar.
      area = '<div class="ds-faixa ds-faixa--info"><i class="ti ti-book-2"></i><span>Dicionário (' + Math.round(p.similaridade * 100) + '% similar): <b>'
        + escaparHtmlLocais(p.sugestaoLocal) + '</b> <span class="ds-texto-3">em ' + escaparHtmlLocais(p.sugestaoCidade) + ' (a cidade não muda)</span></span></div>';
    } else {
      area = '<div class="ds-texto-3">— sem sugestão automática</div>';
    }
    // Aviso do Google: informação, nunca botão. Aparece sempre que a cidade encontrada é outra,
    // com ou sem sugestão do dicionário (📌 25/09/2026: antes só aparecia junto da sugestão).
    var extraGoogle = '';
    if (!p.carregando && p.cidadeGoogle && p.cidadeGoogle.trim().toUpperCase() !== (p.cidade || '').trim().toUpperCase()) {
      extraGoogle = '<div class="ds-faixa ds-faixa--sucesso"><i class="ti ti-world"></i><span>O Google indica que este local fica em <b>'
        + escaparHtmlLocais(p.cidadeGoogle) + '</b>. Se for o caso, use <b>Editar</b> para trocar a cidade.</span></div>';
    }
    var btnAceitar = '';
    if (!p.carregando && p.fonte !== 'nenhuma') {
      btnAceitar = '<button class="ds-btn ds-btn--sucesso ds-btn--sm" onclick="decidirLocal(' + i + ',\'aceitar\')"><i class="ti ti-check"></i>Aceitar sugestão</button>';
    }
    return area + extraGoogle
      + '<div class="imp-pend-acoes">' + btnAceitar
      + '<button class="ds-btn ds-btn--secundario ds-btn--sm" onclick="decidirLocal(' + i + ',\'manter\')">Manter como está</button>'
      + '<button class="ds-btn ds-btn--secundario ds-btn--sm" onclick="decidirLocal(' + i + ',\'manual\')"><i class="ti ti-pencil"></i>Editar</button>'
      + '</div>';
  }

  function edicaoManualLocalHTML(p, i) {
    var cidadePre = escaparHtmlLocais(p.sugestaoCidade || p.cidade);
    var localPre = escaparHtmlLocais(p.sugestaoLocal || p.local);
    return '<div class="imp-edit">'
      + '<label class="ds-rotulo" for="inpCidadeLocal_' + i + '">Cidade</label>'
      + '<input class="ds-input" id="inpCidadeLocal_' + i + '" type="text" value="' + cidadePre + '" list="dlCidadesPadrao" autocomplete="off">'
      + '<label class="ds-rotulo" for="inpLocalLocal_' + i + '">Local</label>'
      + '<input class="ds-input" id="inpLocalLocal_' + i + '" type="text" value="' + localPre + '" list="dlLocaisPadrao" autocomplete="off" onchange="aoEscolherLocalPadrao(' + i + ')">'
      + '<span class="ds-ajuda"><i class="ti ti-bulb"></i> Digite para buscar cidades e locais já padronizados.</span>'
      + '</div>'
      + '<div class="imp-pend-acoes">'
      + '<button class="ds-btn ds-btn--sucesso ds-btn--sm" onclick="confirmarManualLocal(' + i + ')"><i class="ti ti-check"></i>Confirmar</button>'
      + '<button class="ds-btn ds-btn--secundario ds-btn--sm" onclick="decidirLocal(' + i + ',\'\')">Cancelar</button>'
      + '</div>';
  }

  function aoEscolherLocalPadrao(i) {
    var elL = document.getElementById('inpLocalLocal_' + i);
    var elC = document.getElementById('inpCidadeLocal_' + i);
    if (!elL || !elC) return;
    var cidades = mapaLocalParaCidades[elL.value.trim().toUpperCase()];
    if (cidades && cidades.length === 1) elC.value = cidades[0]; // só quando não-ambíguo
  }

  function resumoDecisaoLocalHTML(p, i) {
    var rotulo = p.decisao === 'manter' ? 'Mantido' : (p.decisao === 'manual' ? 'Editado' : 'Aceito');
    return '<div class="imp-decidida"><span><i class="ti ti-check"></i> ' + rotulo + ': <b>' + escaparHtmlLocais(p.cidadeFinal) + '</b> / '
      + escaparHtmlLocais(p.localFinal) + '</span>'
      + '<button class="ds-link" onclick="decidirLocal(' + i + ',\'\')"><i class="ti ti-arrow-back-up"></i> desfazer</button></div>';
  }

  function decidirLocal(i, acao) {
    var p = pendenciasLocais[i];
    if (!p) return;
    if (acao === '') { p.decisao = ''; p.editando = false; }
    else if (acao === 'aceitar') { p.cidadeFinal = p.sugestaoCidade; p.localFinal = p.sugestaoLocal; p.decisao = 'aceitar'; p.editando = false; }
    else if (acao === 'manter') { p.cidadeFinal = p.cidade; p.localFinal = p.local; p.decisao = 'manter'; p.editando = false; }
    else if (acao === 'manual') { p.editando = true; }
    renderizarPendenciasLocais();
  }

  function confirmarManualLocal(i) {
    var p = pendenciasLocais[i];
    if (!p) return;
    var elC = document.getElementById('inpCidadeLocal_' + i);
    var elL = document.getElementById('inpLocalLocal_' + i);
    var cidade = elC ? elC.value.trim() : '';
    var local = elL ? elL.value.trim() : '';
    var cidadeEscolhida = cidade || p.cidade;
    var aplicar = function () {
      p.cidadeFinal = cidadeEscolhida;
      p.localFinal = local || p.local;
      p.decisao = 'manual';
      p.editando = false;
      renderizarPendenciasLocais();
    };
    // Trocar a cidade à mão é permitido, mas nunca sem querer: a decisão vale para TODAS as
    // importações seguintes, porque vira linha no dicionário (chave = cidade + local do CSV).
    // Desde 06/11/2026 a pergunta é a janela do sistema (dsConfirmar), não a caixa do navegador.
    if (cidadeEscolhida.trim().toUpperCase() !== (p.cidade || '').trim().toUpperCase()) {
      dsConfirmar({ titulo: 'Mudar a cidade?', ok: 'Confirmar', classeOk: 'primario',
        corpo: '<p style="margin:0 0 8px">Você está mudando a cidade de <b>' + escaparHtmlLocais(p.cidade || '(vazia)') + '</b> para <b>'
          + escaparHtmlLocais(cidadeEscolhida) + '</b>.</p><p style="margin:0">Isso vale para esta linha e para todas as próximas importações com essa mesma escrita.</p>',
        aoConfirmar: function (fechar) { fechar(); aplicar(); } });
      return;
    }
    aplicar();
  }

  function salvarDecisoesLocaisFront() {
    var decididas = pendenciasLocais.filter(function(p) { return p.decisao; });
    if (decididas.length === 0) return;
    var decisoes = decididas.map(function(p) {
      var origem = 'manual';
      // 📌 25/09/2026: 'sugestao_google' não é mais gravado — o Google virou só aviso e não
      // tem botão de aceitar. As linhas antigas com essa origem continuam válidas no histórico.
      if (p.decisao === 'aceitar') origem = 'sugestao_dicionario';
      else if (p.decisao === 'manter') origem = 'mantido_original';
      return { cidadeOriginal: p.cidade, localOriginal: p.local, cidadePadrao: p.cidadeFinal, localPadrao: p.localFinal, origem: origem };
    });
    estadoModalLocais('carregando', 'Salvando decisões...', 'Atualizando o dicionário e corrigindo as viagens.');
    var operador = (window.localStorage && localStorage.getItem('operadorNome')) || 'Operador';
    chamarServidor('salvarDecisoesLocais', [decisoes, operador], function(res) {
        var corr = (res && res.linhasCorrigidas) || 0;
        var rest = (res && res.pendentesRestantes) || 0;
        estadoModalLocais('sucesso', 'Salvo!', corr + ' linha(s) corrigidas no banco.' + (rest > 0 ? ' Restam ' + rest + ' local(is) a revisar.' : ''));
        toast('Dicionário atualizado — ' + corr + ' viagem(ns) corrigida(s).', 'ok');
        atualizarBadgePendentes();
        setTimeout(function() { fecharModalLocais(); }, 2500);
      }, function(err) {
        estadoModalLocais('erro', 'Falha ao salvar', escaparHtmlLocais(err.message),
          '<button class="ds-btn ds-btn--secundario" style="margin-top:16px;" onclick="renderizarPendenciasLocais()">Voltar</button>');
      });
  }

  // Selo de versão (SEMPRE a última linha do script — o Index acusa se faltar = colagem truncada)
  window.__VERSOES = window.__VERSOES || {}; window.__VERSOES.importacao = '06/11b';

// ---- Exposição para o HTML e as outras telas (as telas vieram do Apps Script, onde tudo era global; ADR 0016).
Object.assign(window, { iniciarImportacao, atualizarBadgePendentes, aoEscolherArquivoImp, impStatus, definirArquivoImp, importarCSV, mostrarResumoImportacao, chipImpHTML, escaparHtmlLocais, fecharModalLocais, estadoModalLocais, abrirRevisaoLocais, abrirModalLocais, receberSugestoesLocais, renderizarPendenciasLocais, datalistsPadroesHTML, cardPendenciaLocalHTML, sugestaoLocalHTML, edicaoManualLocalHTML, aoEscolherLocalPadrao, resumoDecisaoLocalHTML, decidirLocal, confirmarManualLocal, salvarDecisoesLocaisFront });
Object.defineProperty(window, 'arquivoImp', { configurable: true, get: () => arquivoImp, set: (valor) => { arquivoImp = valor; } });
Object.defineProperty(window, 'pendenciasLocais', { configurable: true, get: () => pendenciasLocais, set: (valor) => { pendenciasLocais = valor; } });
Object.defineProperty(window, 'padroesLocais', { configurable: true, get: () => padroesLocais, set: (valor) => { padroesLocais = valor; } });
Object.defineProperty(window, 'mapaLocalParaCidades', { configurable: true, get: () => mapaLocalParaCidades, set: (valor) => { mapaLocalParaCidades = valor; } });
