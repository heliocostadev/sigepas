// =======================================================================
  // ABA ESCALA PARA ENVIAR — visual Oficial da Planilha / WhatsApp
  // (Nenhum caractere menor-que em javascript devido ao parser GAS)
  // =======================================================================

  var envVeiculos = {};

  function envEsc(s) {
    return (s === null || s === undefined ? '' : s.toString())
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;');
  }

  function envHojeISO() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // Formata YYYY-MM-DD para "Sexta, 10 Set 2026"
  function envFormataData(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    if (p.length !== 3) return iso;
    var d = new Date(p[0], parseInt(p[1])-1, p[2]);
    var dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    var meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return dias[d.getDay()] + ', ' + p[2] + ' ' + meses[d.getMonth()] + ' ' + p[0];
  }

  // Formata YYYY-MM-DD para o padrão oficial da planilha: "11/09/2026 - Sexta-Feira"
  // A data vem do campo da tela e entra no HTML da folha. Ela é remontada a partir de números, então nenhum texto
  // digitado chega ao HTML (alerta do CodeQL). Fora do formato AAAA-MM-DD, não mostra nada.
  function envFormataDataOficial(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
    var p = iso.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    var dois = function (n) { return ('0' + n).slice(-2); };
    var dias = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
    return dois(p[2]) + '/' + dois(p[1]) + '/' + p[0] + ' - ' + dias[d.getDay()];
  }

  function iniciarEscalaEnviar() {
    var inp = document.getElementById('envData');
    if (!inp.value) inp.value = dataPadraoISO();   // o dia seguinte (11/11/2026)
    envCalLigarFechamento();
    envBuscar();
  }

  // ==========================================================================
  // CALENDÁRIO PRÓPRIO
  // ==========================================================================
  // 🔴 O `<input type="date">` NATIVO NÃO SERVE AQUI, e este é o motivo.
  // O `showPicker()` que estava no onclick do rótulo é barrado por especificação quando o
  // documento não é da mesma origem que a página de cima — e um web app do Apps Script roda
  // SEMPRE dentro de um iframe de outra origem (`googleusercontent` dentro do
  // `script.google.com`). A chamada lançava SecurityError e morria em silêncio: nenhum
  // calendário abria, nenhum erro aparecia, e o operador ficava só com as setas.
  //
  // ⚠️ Deixar o input visível para o usuário clicar no ícone nativo dele também não resolve:
  // o formato do texto passa a ser o do navegador (11/09/2026), e a pílula perde a data por
  // extenso, que é o que se confere de relance.
  //
  // 📌 Desenhado por nós, o calendário não depende de permissão de navegador nenhuma, e o
  // clique no dia JÁ APLICA a data — sem passo de confirmação. O `#envData` continua sendo
  // o guarda-valor em ISO que o `envNavegar`, o `envIrParaHoje` e o `envBuscar` já liam.
  var envCalAno = 0, envCalMesAtual = 0, envCalLigado = false;

  function envCalAbrir() {
    var cx = document.getElementById('envCal');
    if (!cx) return;
    if (cx.classList.contains('on')) { envCalFechar(); return; }
    var v = document.getElementById('envData').value || dataPadraoISO();
    var p = v.split('-');
    envCalAno = parseInt(p[0], 10);
    envCalMesAtual = parseInt(p[1], 10) - 1;
    envCalRender();
    cx.classList.add('on');
  }

  function envCalFechar() {
    var cx = document.getElementById('envCal');
    if (cx) cx.classList.remove('on');
  }

  function envCalAndarMes(delta) {
    envCalMesAtual += delta;
    // ⚠️ Sem `<` como operador (regra 2 do CLAUDE.md): a comparação vira `0 >`.
    if (envCalMesAtual > 11) { envCalMesAtual = 0; envCalAno++; }
    if (0 > envCalMesAtual) { envCalMesAtual = 11; envCalAno--; }
    envCalRender();
  }

  // Um clique, uma data. É o que o operador pediu: escolheu, apareceu.
  function envCalEscolher(iso) {
    document.getElementById('envData').value = iso;
    envCalFechar();
    envBuscar();
  }

  function envCalRender() {
    var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    var SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    var sel = document.getElementById('envData').value || '';
    var hoje = envHojeISO();
    var primeiro = new Date(envCalAno, envCalMesAtual, 1).getDay();       // 0 = domingo
    // Dia 0 do mês SEGUINTE é o último dia deste — pega fevereiro e ano bissexto de graça.
    var total = new Date(envCalAno, envCalMesAtual + 1, 0).getDate();

    var h = '<div class="env-cal-topo">' +
            '<button class="env-cal-nav" onclick="envCalAndarMes(-1)" title="Mês anterior"><i class="ti ti-chevron-left"></i></button>' +
            '<span class="env-cal-mes">' + MESES[envCalMesAtual] + ' ' + envCalAno + '</span>' +
            '<button class="env-cal-nav" onclick="envCalAndarMes(1)" title="Próximo mês"><i class="ti ti-chevron-right"></i></button>' +
            '</div><div class="env-cal-grade">';

    for (var s = 0; 7 > s; s++) h += '<div class="env-cal-sem">' + SEMANA[s] + '</div>';
    for (var b = 0; primeiro > b; b++) h += '<button class="env-cal-dia vazio" disabled></button>';

    for (var d = 1; total + 1 > d; d++) {
      var iso = envCalAno + '-' + ('0' + (envCalMesAtual + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
      var dow = new Date(envCalAno, envCalMesAtual, d).getDay();
      var cls = 'env-cal-dia';
      if (dow === 0 || dow === 6) cls += ' fds';
      if (iso === hoje) cls += ' hoje';
      if (iso === sel) cls += ' sel';
      // 📌 O `iso` é gerado aqui, só com dígitos e hífens — nunca leva apóstrofo para dentro
      // do onclick. Se um dia este texto vier de fora, a aspa simples tem de ser escapada.
      h += '<button class="' + cls + '" onclick="envCalEscolher(\'' + iso + '\')">' + d + '</button>';
    }
    h += '</div>';
    document.getElementById('envCal').innerHTML = h;
  }

  // Fechar clicando fora e com Esc. Registrado UMA vez — o JS é global entre as abas, e
  // reatar o ouvinte a cada abertura empilharia um por clique.
  function envCalLigarFechamento() {
    if (envCalLigado) return;
    envCalLigado = true;
    document.addEventListener('click', function (ev) {
      var cx = document.getElementById('envCal');
      if (!cx || !cx.classList.contains('on')) return;
      var w = document.getElementById('envDataWrap');
      if (w && w.contains(ev.target)) return;   // clique na própria pílula: deixa passar
      envCalFechar();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') envCalFechar();
    });
  }

  function envNavegar(diasDelta) {
    var inp = document.getElementById('envData');
    if (!inp.value) inp.value = dataPadraoISO();   // o dia seguinte (11/11/2026)
    var p = inp.value.split('-');
    var d = new Date(p[0], parseInt(p[1])-1, p[2]);
    d.setDate(d.getDate() + diasDelta);
    inp.value = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    envBuscar();
  }

  function envIrParaHoje() {
    document.getElementById('envData').value = envHojeISO();
    envBuscar();
  }

  function envBuscar() {
    var dataStr = document.getElementById('envData').value;
    if (!dataStr) return;
    
    document.getElementById('envDataVisual').textContent = envFormataData(dataStr);
    
    document.getElementById('envCorpo').innerHTML = 
      '<div class="ds-carregando"><span class="ds-giro"></span>Carregando escala do dia...</div>';
    
    // Desabilita botões para evitar flood
    var btns = document.querySelectorAll('.env-date-btn, .env-today-btn');
    for (var i = 0; btns.length > i; i++) btns[i].disabled = true;

    // Chama o backend, usando a mesma infra da aba antiga, mas passando 1 único dia.
    chamarServidor('getEscalaPeriodo', [dataStr, dataStr], function (res) {
        for (var k = 0; btns.length > k; k++) btns[k].disabled = false;
        envRender(res, dataStr);
      }, function (err) {
        for (var j = 0; btns.length > j; j++) btns[j].disabled = false;
        document.getElementById('envCorpo').innerHTML = 
          '<div class="ds-vazio"><i class="ti ti-alert-circle" style="color:var(--ds-perigo);"></i>' +
          '<div class="ds-vazio-titulo">Erro ao carregar</div>' + envEsc(err.message) + '</div>';
      });
  }

  // A biblioteca html2canvas vem do próprio SIGEPAS (iniciar-sistema.js): a política de segurança da página só aceita
  // script do próprio endereço.
  function envCarregarHtml2Canvas(callback) {
    callback();
  }

  function envBaixarPNG(evento) {
    var btn = evento.currentTarget;
    var oldBtnHtml = btn.innerHTML;
    btn.innerHTML = '<span class="ds-giro" style="width:16px;height:16px;"></span>Gerando...';
    btn.disabled = true;

    var area = document.getElementById('envSheetArea');
    if (!area) {
      alert('Nenhum dado carregado para exportação.');
      btn.innerHTML = oldBtnHtml;
      btn.disabled = false;
      return;
    }

    function triggerDownload(dataUrl) {
      var dStr = document.getElementById('envData').value;
      var link = document.createElement('a');
      link.download = 'Escala_' + dStr + '.png';
      link.href = dataUrl;
      link.click();
    }

    envCarregarHtml2Canvas(function() {
      setTimeout(function() {
        html2canvas(area, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#FFFFFF',
          logging: false,
          onclone: function(clonedDoc) {
            var clonedArea = clonedDoc.getElementById('envSheetArea');
            if (clonedArea) {
              clonedArea.style.animation = 'none';
              clonedArea.style.opacity = '1';
              clonedArea.style.transform = 'none';
              clonedArea.style.boxShadow = 'none';
            }
          }
        }).then(function(canvas) {
          try {
            triggerDownload(canvas.toDataURL('image/png'));
          } catch (e) {
            alert('Erro ao exportar imagem: ' + e);
          }
          btn.innerHTML = oldBtnHtml;
          btn.disabled = false;
        }).catch(function(err){
           alert('Erro crítico ao processar imagem: ' + err);
           btn.innerHTML = oldBtnHtml;
           btn.disabled = false;
        });
      }, 150);
    });
  }

  // --- Helpers de Cor para os Chips (Mesmo motor de constraste) ---
  var ENV_TINTA_ESCURA = '#1e293b';
  function envCorHex(txt) {
    var s = (txt || '').toString().trim().replace(/^#/, '').toLowerCase();
    if (!/^[0-9a-f]{3}$/.test(s) && !/^[0-9a-f]{6}$/.test(s)) return '';
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    return '#' + s;
  }
  function envLum(hex) {
    var canais = [1, 3, 5].map(function (i) {
      var c = parseInt(hex.substr(i, 2), 16) / 255;
      return c > 0.03928 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
    });
    return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
  }
  function envContraste(a, b) {
    var la = envLum(a), lb = envLum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function envTintaPara(hex) {
    return envContraste(hex, '#ffffff') >= envContraste(hex, ENV_TINTA_ESCURA) ? '#ffffff' : ENV_TINTA_ESCURA;
  }
  
  function envVeiculoHTML(placa, tipo, forcarBranco) {
    if (!placa) return '<span style="color:#94a3b8;">—</span>';
    var info = envVeiculos[placa.toString().trim().toUpperCase()] || {};
    var t = (tipo || info.tipo || '').toString().trim();
    var cor = envCorHex(info.cor);
    var estilo = '', classes = 'env-chip';
    
    if (cor) {
      var tinta = forcarBranco ? '#ffffff' : envTintaPara(cor);
      estilo = ' style="background-color:' + cor + '; color:' + tinta + ';"';
    } else {
      estilo = ' style="background-color:#475569; color:#ffffff;"';
    }
    var texto = envEsc(placa) + (t ? ' - ' + envEsc(t) : '');
    return '<div class="' + classes + '"' + estilo + '>' + texto + '</div>';
  }

  // ==========================================================================
  // A GRADE DA FOLHA — declarada UMA vez (11/09)
  // ==========================================================================
  // 🔴 A folha era QUATRO tabelas empilhadas, cada uma repetindo as larguras no `<th>` e de
  // novo no CSS. Medido na tela, isso produzia cinco defeitos:
  //  1. As tabelas VAZAVAM 2,5px pela direita. As larguras fixas somavam 760px dentro de uma
  //     moldura com 758 de miolo, e com `table-layout: fixed` a tabela ALARGA para caber as
  //     colunas — as faixas terminavam em 759 e as tabelas em 761,5.
  //  2. Observações tinha divisória própria (413,5px), fora da grade das outras seções.
  //  3. Linha com chip 29,4px, linha de texto 25px — ritmo diferente por seção.
  //  4. Faixa (div) com borda de 1px encostada na tabela com borda de 1px: 2px em toda junta.
  //  5. Faixa sem borda lateral ao lado de célula com borda: a lateral mudava de espessura.
  //
  // 📌 Agora é UMA tabela, com UM `<colgroup>`. Faixa, cabeçalho, linha e aviso moram todos
  // dentro dela, e a border-collapse faz toda borda ser compartilhada. As larguras viram
  // PORCENTAGEM do total, então a soma é 100% da moldura por construção — não há mais como
  // vazar. O modelo de 760px continua sendo a referência: é o tamanho do PNG oficial.
  //
  // ⚠️ Seção com número de colunas diferente NÃO cria divisória nova: ela MESCLA colunas da
  // grade (colspan), como se faz na planilha. É o que manteve Observações alinhada.
  var ENV_GRADE = [32, 160, 105, 250, 213];   // Nº · Motorista · Hora · Destino · Veículo

  function envColgroup() {
    var total = 0, i, h = '<colgroup>';
    for (i = 0; ENV_GRADE.length > i; i++) total += ENV_GRADE[i];
    for (i = 0; ENV_GRADE.length > i; i++) {
      h += '<col style="width:' + (ENV_GRADE[i] * 100 / total).toFixed(4) + '%">';
    }
    return h + '</colgroup>';
  }

  // Linha de largura cheia — faixa colorida ou aviso de seção vazia.
  function envFaixa(classe, conteudo) {
    return '<tr><td colspan="' + ENV_GRADE.length + '" class="' + classe + '">' + conteudo + '</td></tr>';
  }
  function envAviso(classe, texto) { return envFaixa(classe, texto); }

  // Cabeçalho de seção. Cada item é o título, ou [título, quantas colunas da grade ocupa].
  function envCabecalho(cols) {
    var h = '<tr>';
    for (var i = 0; cols.length > i; i++) {
      var txt = cols[i], span = 1;
      if (typeof txt !== 'string') { span = txt[1]; txt = txt[0]; }
      h += '<th' + (span > 1 ? ' colspan="' + span + '"' : '') + '>' + txt + '</th>';
    }
    return h + '</tr>';
  }

  // --- Renderização Principal (Estilo Planilha Oficial WhatsApp) ---
  function envRender(res, dataStr) {
    envVeiculos = (res && res.veiculos) ? res.veiculos : {};
    var dias = (res && res.dias) ? res.dias : [];
    
    if (dias.length === 0) {
      document.getElementById('envCorpo').innerHTML = '<div class="ds-vazio"><i class="ti ti-calendar-off"></i>Nenhum dado encontrado para esta data.</div>';
      document.getElementById('envResumoFrotas').innerHTML = '';
      return;
    }
    
    var d = dias[0]; // Apenas o dia solicitado
    // A data vem do campo da tela e entra no HTML da folha: sempre escapada (alerta do CodeQL).
    var dataOficial = envEsc(envFormataDataOficial(dataStr));
    var numLinha = 0;
    // Uma tabela, uma grade — ver ENV_GRADE. Cada seção é um <tbody> próprio.
    var html = '<div class="env-sheet-wrapper" id="envSheetArea">' +
               '<table class="env-sheet-table">' + envColgroup();

    // ===================================================================
    // 1. VIAGENS EXTERNAS
    // ===================================================================
    var qExt = d.externas.length;
    html += '<tbody>' +
            envFaixa('env-bar-blue', '<div class="title-main">Escala de Viagens Externas</div>' +
                                     '<div class="title-date">' + dataOficial + '</div>') +
            envCabecalho(['', 'Motoristas', 'Hora de Saída', 'Destino', 'Veículo']);

    if (qExt === 0) {
      html += envAviso('env-vazio', 'Nenhuma viagem externa neste dia.');
    } else {
      for (var e = 0; d.externas.length > e; e++) {
        numLinha++;
        var ext = d.externas[e];
        var mot = ext.motorista ? envEsc(ext.motorista) : '<span style="color:#94a3b8; font-style:italic;">Sem Motorista</span>';
        // Dois motoristas (11/11/2026): o 2º vem como linha própria da mesma viagem.
        if (ext.revezamento) mot += ' <span style="font-size:11px; font-weight:700; color:#e65100;">2º motorista (volta)</span>';
        html += '<tr class="env-linha">' +
                '<td class="col-idx">' + numLinha + '</td>' +
                '<td class="col-mot">' + mot + '</td>' +
                '<td class="col-hora">' + envEsc(ext.hora) + '</td>' +
                '<td class="col-dest">' + envEsc(ext.destino) + '</td>' +
                '<td class="col-veic">' + envVeiculoHTML(ext.placa, ext.tipo, true) + '</td>' +
                '</tr>';
      }
    }
    html += '</tbody>';

    // ===================================================================
    // 2. REMOÇÕES INTERNAS (A numeração continua sequencial)
    // ===================================================================
    var qInt = d.internas.length;
    html += '<tbody>' +
            envFaixa('env-bar-blue', '<div class="title-inline">Escala de Remoções Internas - ' + dataOficial + '</div>') +
            envCabecalho(['', 'Motoristas', 'H. Atividade', 'Atividade', 'Obs.']);

    // 🔴 O DIA NÃO ÚTIL VEM PRIMEIRO (10/09), e não mais atrás de `!d.temEscala`. Trancado
    // no ramo de "não existe escala", o aviso nunca aparecia num sábado em que o operador
    // TIVESSE formado a escala — e era justamente o caso em que ele fazia falta. Esta folha
    // vira PNG e vai para o grupo dos motoristas: uma frase vaga aqui viaja longe.
    // 📌 Três causas de tabela vazia, três frases. A mesma ordem vale no EscalaViagens.
    if (!d.ehUtil && d.tipoDia) {
      html += envAviso('env-alerta', 'Não há remoção interna: ' + envEsc(d.tipoDia) + (d.descricaoDia ? ' - ' + envEsc(d.descricaoDia) : ''));
    } else if (!d.temEscala) {
      html += envAviso('env-alerta', 'Sem escala registrada para este dia.');
    } else if (qInt === 0) {
      html += envAviso('env-vazio', 'Todos os servidores escalados estão em viagem externa.');
    } else {
      for (var i = 0; d.internas.length > i; i++) {
        numLinha++;
        var int = d.internas[i];
        var ativTxt = envEsc(int.atividade);
        var ehEspecial = (int.atividade === 'Consultório de Rua' || int.atividade === 'Recomeçar');
        var clsAtiv = ehEspecial ? ' env-destaque-bold' : '';
        var obsTxt = int.obs ? envEsc(int.obs) : '';
        var clsObs = obsTxt ? 'env-destaque-bold' : '';

        html += '<tr class="env-linha">' +
                '<td class="col-idx">' + numLinha + '</td>' +
                '<td class="col-mot">' + envEsc(int.motorista) + '</td>' +
                '<td class="col-hora">' + envEsc(int.hora || '') + '</td>' +
                '<td class="col-dest' + clsAtiv + '">' + ativTxt + '</td>' +
                '<td class="' + clsObs + '">' + obsTxt + '</td>' +
                '</tr>';
      }
    }
    html += '</tbody>';

    // ===================================================================
    // 3. OBSERVAÇÕES (faixa laranja)
    // ===================================================================
    // 📌 Três colunas de conteúdo numa grade de cinco, sem divisória nova: o NOME fica
    // embaixo de Motoristas — todo nome de pessoa da folha numa coluna só —, a OBSERVAÇÃO
    // mescla Hora + Atividade, e OUTRAS ANOTAÇÕES fica embaixo de Obs., que é o mesmo papel.
    // ⚠️ A Observação NÃO pode ir sozinha para a coluna de Hora: "MANUTENÇÃO", o motivo mais
    // longo da base, em negrito não cabe nos 105px dela.
    var qObs = d.observacoes.length;
    html += '<tbody>' +
            envFaixa('env-bar-orange', 'OBSERVAÇÕES:') +
            envCabecalho(['', 'Nome', ['Observação', 2], 'Outras Anotações']);

    if (qObs === 0) {
      html += '<tr><td class="col-idx"></td><td colspan="4" class="env-vazio">Nenhuma indisponibilidade registrada.</td></tr>';
    } else {
      for (var ob = 0; d.observacoes.length > ob; ob++) {
        var o = d.observacoes[ob];
        var nomeObs = o.tipo === 'motorista' ? o.nome : ('Veículo ' + o.nome);
        var motivoObs = o.motivo ? o.motivo.toString().toUpperCase() : '—';
        var detalheObs = o.observacao ? o.observacao.toString().toUpperCase() : '';

        html += '<tr class="env-linha">' +
                '<td class="col-idx"></td>' +
                '<td class="col-mot">' + envEsc(nomeObs) + '</td>' +
                '<td colspan="2" class="env-obs">' + envEsc(motivoObs) + '</td>' +
                '<td class="env-obs">' + envEsc(detalheObs) + '</td>' +
                '</tr>';
      }
    }
    html += '</tbody>';

    // ===================================================================
    // 4. TERCEIRIZADOS (Quando houver)
    // ===================================================================
    var qTerc = d.terceirizados.length;
    if (qTerc > 0) {
      html += '<tbody>' +
              envFaixa('env-bar-blue', '<div class="title-inline">Terceirizados - ' + dataOficial + '</div>') +
              envCabecalho(['', 'Motorista (nome)', 'Hora', 'Destino', 'Veículo']);

      for (var t = 0; d.terceirizados.length > t; t++) {
        numLinha++;
        var terc = d.terceirizados[t];
        // Sem viagem e sem remoção interna (sábado, feriado): traço. O `interno` já vem
        // resolvido do getEscalaPeriodo, que conhece o tipo do dia.
        var dest = terc.interno ? 'REMOÇÃO INTERNA' : (envEsc(terc.destino) || '-');
        html += '<tr class="env-linha">' +
                '<td class="col-idx">' + numLinha + '</td>' +
                '<td class="col-mot">' + envEsc(terc.motorista) + '</td>' +
                '<td class="col-hora">' + envEsc(terc.hora || '--:--') + '</td>' +
                '<td class="col-dest">' + dest + '</td>' +
                '<td class="col-veic">' + envVeiculoHTML(terc.placa, terc.tipo, false) + '</td>' +
                '</tr>';
      }
      html += '</tbody>';
    }

    html += '</table></div>'; // fecha a tabela única e o .env-sheet-wrapper

    document.getElementById('envCorpo').innerHTML = html;
    document.getElementById('envResumoFrotas').innerHTML = '<i class="ti ti-steering-wheel"></i> ' + (qExt + qInt + qTerc) + ' motoristas escalados';
  }

  window.__VERSOES = window.__VERSOES || {}; window.__VERSOES.escalaEnviar = '11/11b';

// ---- Exposição para o HTML e as outras telas (as telas vieram do Apps Script, onde tudo era global; ADR 0016).
Object.assign(window, { envEsc, envHojeISO, envFormataData, envFormataDataOficial, iniciarEscalaEnviar, envCalAbrir, envCalFechar, envCalAndarMes, envCalEscolher, envCalRender, envCalLigarFechamento, envNavegar, envIrParaHoje, envBuscar, envCarregarHtml2Canvas, envBaixarPNG, envCorHex, envLum, envContraste, envTintaPara, envVeiculoHTML, envColgroup, envFaixa, envAviso, envCabecalho, envRender });
Object.defineProperty(window, 'envVeiculos', { configurable: true, get: () => envVeiculos, set: (valor) => { envVeiculos = valor; } });
Object.defineProperty(window, 'envCalAno', { configurable: true, get: () => envCalAno, set: (valor) => { envCalAno = valor; } });
Object.defineProperty(window, 'envCalMesAtual', { configurable: true, get: () => envCalMesAtual, set: (valor) => { envCalMesAtual = valor; } });
Object.defineProperty(window, 'envCalLigado', { configurable: true, get: () => envCalLigado, set: (valor) => { envCalLigado = valor; } });
Object.defineProperty(window, 'ENV_TINTA_ESCURA', { configurable: true, get: () => ENV_TINTA_ESCURA, set: (valor) => { ENV_TINTA_ESCURA = valor; } });
Object.defineProperty(window, 'ENV_GRADE', { configurable: true, get: () => ENV_GRADE, set: (valor) => { ENV_GRADE = valor; } });
