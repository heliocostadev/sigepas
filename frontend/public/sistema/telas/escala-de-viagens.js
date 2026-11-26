// =======================================================================
  // ABA ESCALA DE VIAGENS — relatório por intervalo (somente leitura)
  // (regra do parser do GAS: zero caractere menor-que como operador/regex)
  // =======================================================================
  let escalaViagensCarregada = false;

  function escEsc(s) {
    return (s === null || s === undefined ? '' : s.toString())
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;');
  }

  function escHojeISO() {
    var d = new Date(); // data local (evita o desvio de fuso do toISOString)
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // ===== TELA ÚNICA (11/11/2026): a Formação deixou de ser janela e é o topo da Escala de Viagens =====
  // Uma data só. Num período (fim de semana, feriado), a tela mostra os dias dele juntos, como a Formação já fazia.
  let escCarregadaPara = '';                  // data (AAAA-MM-DD) que está na tela
  const estadoEscRel = { porDia: {} };        // relatório gravado (getEscalaPeriodo), por DD/MM/AAAA: tipo do dia,
                                              // terceirizados sem viagem e observações do cadastro
  let escSaindo = false;                      // deixa o clique no menu passar depois de confirmar a saída

  // Chamada pelo Index ao entrar na aba. Não recarrega a mesma data: as mudanças não gravadas continuam na tela.
  function iniciarEscala() {
    const dt = document.getElementById('escFData');
    if (!dt.value) dt.value = dataPadraoISO();   // o dia seguinte (11/11/2026)
    if (escCarregadaPara !== dt.value) escCarregarTudo();
  }

  function escCarregarTudo() {
    const data = document.getElementById('escFData').value;
    if (!data) return;
    escCarregadaPara = data;
    estadoEscRel.porDia = {};
    escFBuscar();
  }

  // Quantas mudanças ainda não foram gravadas: cada viagem mudada conta uma; a fila e as ausências, uma.
  function escPendencias() {
    if (!escCarregadaPara || !estadoEscF.assinatura0) return 0;
    let n = 0;
    (estadoEscF.viagens || []).forEach(function (v) {
      if (v.passou) return;
      if (v.motorista !== v.motoristaOriginal || v.placa !== v.placaOriginal || !!v.doisMotoristas !== !!v.doisOriginal
          || (v.doisMotoristas && v.motorista2 !== v.motorista2Original)) n++;
    });
    if (escFAssinatura() !== estadoEscF.assinatura0) n++;
    return n;
  }

  // Retrato do formulário da Formação (ausências, motivos, observações, motorista da vez e ordem), para saber se mudou.
  function escFAssinatura() {
    const partes = [];
    document.querySelectorAll('#escFCorpo .escf-item').forEach(function (it) {
      const c = it.querySelector('input[type=checkbox]');
      const sel = it.querySelector('select');
      const obs = it.querySelector('.escf-obs');
      partes.push((c ? c.value + ':' + (c.checked ? 1 : 0) : '') + '|' + (c && c.checked && sel ? sel.value : '')
                  + '|' + (c && c.checked && obs ? obs.value : ''));
    });
    const vez = document.getElementById('escFVez');
    partes.push('vez:' + (vez ? vez.value : ''));
    partes.push('fila:' + escFFila().map(function (m) { return m.nome; }).join(','));
    return partes.join(';');
  }

  // Troca de dia. Com mudança não gravada, pergunta antes de descartar.
  function escTrocarData(novaISO) {
    const dt = document.getElementById('escFData');
    const anterior = escCarregadaPara;
    const seguir = function () { if (novaISO) dt.value = novaISO; escCarregarTudo(); };
    if (escPendencias() > 0) {
      dsConfirmar({ titulo: 'Mudanças não gravadas',
        corpo: '<p style="margin:0">A escala deste dia tem mudanças que ainda não foram gravadas. Trocar de dia descarta essas mudanças.</p>',
        ok: 'Descartar e trocar', classeOk: 'perigo', cancelar: 'Continuar aqui',
        aoConfirmar: function (fechar) { fechar(); seguir(); },
        aoCancelar: function () { dt.value = anterior; } });
      return;
    }
    seguir();
  }

  function escMudarDia(delta) {
    const dt = document.getElementById('escFData');
    const p = (dt.value || dataPadraoISO()).split('-');
    const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + delta * 86400000);
    escTrocarData(d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2));
  }

  function escDesfazer() {
    if (escPendencias() === 0) { toast('Nada a desfazer.', 'info'); return; }
    dsConfirmar({ titulo: 'Desfazer mudanças', corpo: '<p style="margin:0">Volta a escala para o que está gravado. As mudanças desta tela se perdem.</p>',
      ok: 'Desfazer', classeOk: 'perigo', aoConfirmar: function (fechar) { fechar(); escCarregarTudo(); } });
  }

  function escRecolherFormacao() {
    const s = document.getElementById('escSec1');
    s.classList.toggle('recolhida');
    s.querySelector('.esc-sec-recolher span').textContent = s.classList.contains('recolhida') ? 'mostrar' : 'recolher';
  }

  // A Escala para Enviar abre no mesmo dia.
  function escIrParaEnviar() {
    const env = document.getElementById('envData');
    if (env) env.value = document.getElementById('escFData').value;
    const aba = document.querySelector('.ds-nav-aba[onclick*="escalaEnviar"]');
    if (aba) aba.click();
  }

  // Chip do topo: o tipo do dia, ou o período.
  function escAtualizarChip() {
    const el = document.getElementById('escCtxChip');
    const c = estadoEscF.contexto;
    if (!el) return;
    if (!c) { el.className = 'esc-chip'; el.innerHTML = ''; return; }
    const dias = c.dias || [];
    const cap = function (t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; };
    if (c.ehUtil) {
      el.className = 'esc-chip util';
      el.innerHTML = '<i class="ti ti-calendar-check"></i>' + escEsc(cap(c.diaSemana)) + ' · dia útil';
    } else if (c.ehAncora) {
      el.className = 'esc-chip fora';
      el.innerHTML = '<i class="ti ti-calendar-off"></i>' + (dias.length > 1
        ? 'Período de ' + dias.length + ' dias · ' + escEsc(dias[0].slice(0, 5)) + ' a ' + escEsc(dias[dias.length - 1].slice(0, 5))
        : escEsc(cap(c.diaSemana)) + ' · ' + escEsc(c.tipo));
    } else {
      el.className = 'esc-chip herda';
      el.innerHTML = '<i class="ti ti-alert-triangle"></i>' + escEsc(cap(c.diaSemana)) + ' · o período começa em ' + escEsc((c.ancora || '').slice(0, 5));
    }
  }

  // O relatório gravado: tipo de cada dia, terceirizados sem viagem e observações do cadastro.
  function escBuscarRelatorio() {
    const c = estadoEscF.contexto || {};
    const dias = (c.ehAncora && c.dias && c.dias.length > 1) ? c.dias : [c.data || ''];
    const ini = escFIsoDe(dias[0]) || escCarregadaPara, fim = escFIsoDe(dias[dias.length - 1]) || escCarregadaPara;
    const pedido = escCarregadaPara;
    chamarServidor('getEscalaPeriodo', [ini, fim], function (res) {
        if (pedido !== escCarregadaPara) return;   // trocaram de dia enquanto carregava
        escVeiculos = (res && res.veiculos) ? res.veiculos : {};
        estadoEscRel.porDia = {};
        ((res && res.dias) || []).forEach(function (d) { estadoEscRel.porDia[d.data] = d; });
        escFRenderViagens();
      }, function (e) {
        document.getElementById('escSecObs').innerHTML = '<div class="esc-aviso">Não foi possível carregar o relatório: '
          + escEsc((e && e.message) || e) + '</div>';
      });
  }

  // Seções 3 e 5 dependem só da tela (a fila e as ausências marcadas agora), não do que está gravado.
  // Remoção interna: servidores da ordem da escala que não estão em viagem no dia; o último é o Consultório de
  // Rua e o penúltimo o Recomeçar (a mesma regra do getEscalaPeriodo). Dia não útil: null = não há remoção interna.
  function escFInternasDoDia(d) {
    const c = estadoEscF.contexto || {};
    const periodo = !!(c.ehAncora && (c.dias || []).length > 1);
    if (periodo || !c.ehUtil) return null;
    const usados = {};
    (estadoEscF.viagens || []).forEach(function (v) {
      if (v.data !== d) return;
      if (v.motorista) usados[v.motorista.toUpperCase()] = true;
      if (v.motorista2) usados[v.motorista2.toUpperCase()] = true;
    });
    const lista = escFFila().filter(function (m) { return !usados[m.nome.toUpperCase()]; })
      .map(function (m) { return { motorista: m.nome, atividade: 'Em Remoção Interna' }; });
    if (lista.length >= 1) lista[lista.length - 1].atividade = 'Consultório de Rua';
    if (lista.length >= 2) lista[lista.length - 2].atividade = 'Recomeçar';
    return lista;
  }

  function escInternasHTML(d, rot, n0) {
    const lista = escFInternasDoDia(d);
    let h = '<table class="escf-folha"><colgroup><col class="c-n"><col class="c-mot"><col class="c-hora"><col class="c-dest"><col class="c-vei"></colgroup>'
          + '<tr><td colspan="5" class="escf-folha-faixa">Escala de Remoções Internas<small>' + escEsc(rot) + '</small></td></tr>'
          + '<tr><th></th><th>Motoristas</th><th>H. Atividade</th><th>Atividade</th><th>Obs.</th></tr>';
    if (lista === null) {
      const rel = estadoEscRel.porDia[d];
      const tipo = (rel && rel.tipoDia) || (estadoEscF.contexto && estadoEscF.contexto.tipo) || 'dia não útil';
      h += '<tr><td colspan="5" class="vazio">Não há remoção interna: ' + escEsc(tipo)
         + (rel && rel.descricaoDia ? ' — ' + escEsc(rel.descricaoDia) : '') + '.</td></tr>';
    } else if (lista.length === 0) {
      h += '<tr><td colspan="5" class="vazio">Todos os servidores da escala estão em viagem externa.</td></tr>';
    } else {
      lista.forEach(function (i, k) {
        const fixa = i.atividade !== 'Em Remoção Interna';
        h += '<tr><td class="n">' + (n0 + k + 1) + '</td><td class="nome-lido">' + escEsc(i.motorista) + '</td><td></td>'
           + '<td class="dest' + (fixa ? ' esc-ativ-fixa' : '') + '">' + escEsc(i.atividade) + '</td><td></td></tr>';
      });
    }
    return { html: h + '</table>', n: lista ? lista.length : 0 };
  }

  // Observações: o que está marcado AGORA na Formação (ausências) e o que vem do cadastro (Configurações).
  function escRenderObservacoes() {
    const cont = document.getElementById('escSecObs');
    if (!cont) return;
    const obs = [];
    const daLinha = function (chk) {
      const it = chk.closest('.escf-item');
      return { motivo: (it.querySelector('select') || {}).value || '', observacao: ((it.querySelector('.escf-obs') || {}).value || '').trim() };
    };
    document.querySelectorAll('#escFCorpo .escf-chk-serv:checked').forEach(function (c) {
      const l = daLinha(c); obs.push({ tipo: 'motorista', nome: c.value, motivo: l.motivo, observacao: l.observacao, origem: 'dia' });
    });
    document.querySelectorAll('#escFCorpo .escf-chk-terc:checked').forEach(function (c) {
      const l = daLinha(c); obs.push({ tipo: 'motorista', nome: c.value, placa: c.getAttribute('data-placa') || '', carroParadoJunto: true,
                                       motivo: l.motivo, observacao: l.observacao, origem: 'dia' });
    });
    document.querySelectorAll('#escFCorpo .escf-chk-vei:checked').forEach(function (c) {
      const l = daLinha(c); obs.push({ tipo: 'veiculo', nome: c.value, motivo: l.motivo, observacao: l.observacao, origem: 'dia' });
    });
    const c0 = estadoEscF.contexto || {};
    const rel = estadoEscRel.porDia[(c0.dias && c0.ehAncora && c0.dias.length > 1) ? c0.dias[0] : c0.data] || null;
    ((rel && rel.observacoes) || []).forEach(function (o) { if (o.origem === 'global') obs.push(o); });
    cont.innerHTML = escCardObservacoesHTML({ observacoes: obs },
      (c0.dias && c0.ehAncora && c0.dias.length > 1) ? 'Período ' + c0.dias[0].slice(0, 5) + ' a ' + c0.dias[c0.dias.length - 1].slice(0, 5) : (c0.data || ''));
  }

  // Ao lado de cada nome da Ordem da escala: onde ele caiu (viagem, 2º motorista ou remoção interna).
  function escFAtualizarOndeCaiu() {
    const c = estadoEscF.contexto || {};
    const periodo = !!(c.ehAncora && (c.dias || []).length > 1);
    const onde = {};
    const junta = function (nome, txt) { const k = nome.toUpperCase(); onde[k] = onde[k] ? onde[k] + ' · ' + txt : txt; };
    (estadoEscF.viagens || []).forEach(function (v) {
      const pre = periodo ? escFRotuloDia(v.data).slice(0, 3).toLowerCase() + ' ' : '';
      if (v.motorista && !v.terceirizado) junta(v.motorista, pre + (v.destino || ''));
      if (v.motorista2) junta(v.motorista2, pre + (v.destino || '') + ' (2º)');
    });
    if (!periodo) (escFInternasDoDia(c.data) || []).forEach(function (i) {
      junta(i.motorista, i.atividade === 'Em Remoção Interna' ? 'remoção interna' : i.atividade);
    });
    document.querySelectorAll('#escFOrdem .escf-ord-onde').forEach(function (el) {
      el.textContent = onde[(el.getAttribute('data-n') || '').toUpperCase()] || '';
    });
  }

  // Sair da aba com mudança não gravada pede confirmação. As mudanças continuam na tela ao voltar.
  document.addEventListener('click', function (e) {
    if (escSaindo) return;
    const aba = e.target && e.target.closest ? e.target.closest('.ds-nav-aba') : null;
    const tela = document.getElementById('escala');
    if (!aba || !tela || !tela.classList.contains('active')) return;
    if ((aba.getAttribute('onclick') || '').indexOf("'escala'") > -1) return;
    if (escPendencias() === 0) return;
    e.stopPropagation(); e.preventDefault();
    dsConfirmar({ titulo: 'Mudanças não gravadas',
      corpo: '<p style="margin:0">A escala tem mudanças que ainda não foram gravadas. Elas continuam aqui quando você voltar, mas só valem depois de <b>Gravar escala</b>.</p>',
      ok: 'Sair mesmo assim', cancelar: 'Continuar aqui',
      aoConfirmar: function (fechar) { fechar(); escSaindo = true; aba.click(); escSaindo = false; } });
  }, true);
  window.addEventListener('beforeunload', function (e) {
    if (escPendencias() > 0) { e.preventDefault(); e.returnValue = ''; }
  });

  function escCabecalhoCard(titulo, subtitulo, n) {
    var contagem = n > 0 ? `<span class="esc-card-contagem">${n}</span>` : '';
    return `<div class="esc-card-titulo"><span>${titulo} <span class="esc-mut" style="font-weight:500;">— ${subtitulo}</span></span>${contagem}</div>`;
  }

  // Cadastro de veículos por PLACA — { tipo, cor }. Preenchido pelo getEscalaPeriodo.
  var escVeiculos = {};

  // ⚠️ A coluna G é TEXTO DIGITADO e termina dentro de um atributo `style`. Só passam
  // `#rgb` e `#rrggbb` (com ou sem `#`, em qualquer caixa); qualquer outra coisa vira ''
  // e o chip cai no padrão escuro. Sem esta lista branca, um valor como
  // `red;background:url(...)` entraria na página vindo da planilha.
  function escCorHex(txt) {
    var s = (txt || '').toString().trim().replace(/^#/, '').toLowerCase();
    if (!/^[0-9a-f]{3}$/.test(s) && !/^[0-9a-f]{6}$/.test(s)) return '';
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    return '#' + s;
  }

  // Qual tinta fica legível sobre a cor escolhida — MEDIDO, não escolhido no olho.
  // Luminância relativa e razão de contraste da WCAG 2.1.
  //
  // ⚠️ Branco fixo não serve para uma cor QUALQUER. Na paleta de 02/09 três cores pediam
  // tinta escura — o amarelo do MINI-BUS (#ffb900) dava 1.72:1 com branco, ilegível.
  // 📌 A paleta trocada em 09/09 foi escolhida para que o branco vença nas SEIS, mas isso é
  // propriedade da paleta, não garantia do código: basta alguém digitar uma cor clara na
  // coluna G para o caso voltar. É por isso que este cálculo continua aqui, e é ele que
  // ainda decide a tinta nos cards de Terceirizados e Observações.
  //
  // 📌 Cinza-médio (perto de #808080) não alcança os 4.5:1 da norma com tinta NENHUMA.
  // Se um dia uma cor dessas entrar na coluna G, o conserto é trocar a cor, não a fonte.
  var ESC_TINTA_ESCURA = '#1e293b';

  function escLum(hex) {
    var canais = [1, 3, 5].map(function (i) {
      var c = parseInt(hex.substr(i, 2), 16) / 255;
      return c > 0.03928 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
    });
    return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
  }

  function escContraste(a, b) {
    var la = escLum(a), lb = escLum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function escTintaPara(hex) {
    return escContraste(hex, '#ffffff') >= escContraste(hex, ESC_TINTA_ESCURA)
      ? '#ffffff' : ESC_TINTA_ESCURA;
  }

  // `sempreBranco` é PEDIDO DO OPERADOR (09/09) e vale só nas Viagens Externas: ali a tinta é
  // branca e em negrito em todo chip, sem consultar o contraste.
  // ⚠️ Isto ABRE MÃO da legibilidade em três carros do cadastro de hoje — TPS8A55 (amarelo,
  // 1,72:1), UAV6F18 (laranja, 2,15:1) e SXT2H07 (azul-claro, 2,80:1), todos abaixo do 4,5:1
  // da WCAG. Nos outros 23 nada muda, porque o branco já vencia. A saída sem perda é escurecer
  // esses três fundos na coluna "Cor de Fundo" da bd_veiculos — aí branco passa a ser a
  // escolha certa por mérito, e não por imposição.
  // 📌 Os outros dois cards continuam com a tinta calculada: o operador pediu a mudança para
  // ESTE quadrante, e mudar os três por conta própria seria decidir no lugar dele.
  function escVeiculoHTML(placa, tipo, sempreBranco) {
    if (!placa) return '<span class="esc-mut">—</span>';
    var info = escVeiculos[placa.toString().trim().toUpperCase()] || {};
    // O tipo da VIAGEM vem na frente do cadastro: é o que estava valendo quando o carro foi
    // montado. O cadastro só preenche onde a linha não tem tipo nenhum — em Observações,
    // que conhece a placa e mais nada.
    var t = (tipo || info.tipo || '').toString().trim();
    var cor = escCorHex(info.cor);
    var estilo = '', claro = '';
    if (cor) {
      var tinta = sempreBranco ? '#ffffff' : escTintaPara(cor);
      estilo = ` style="background:${cor};color:${tinta}"`;
      // A aresta existe para o chip claro não vazar no papel branco. Com tinta branca forçada
      // ela continua fazendo falta — o fundo claro segue claro —, então o gatilho passa a ser
      // o FUNDO, não a tinta escolhida.
      if (escTintaPara(cor) !== '#ffffff') claro = ' claro';
    }
    return `<span class="esc-placa${claro}${sempreBranco ? ' tinta-branca' : ''}"${estilo}>${escEsc(placa)}`
         + (t ? `<span class="esc-placa-tipo">${escEsc(t)}</span>` : '')
         + `</span>`;
  }

  // --- Quadrante 1: Escala de Viagens Externas ---
  // --- Quadrante 3: Observações ---
  // Redesenhado em 09/09. A tabela de três colunas virou uma lista agrupada por ORIGEM.
  // O que saiu, e por quê:
  //  · a coluna TIPO — um chip de placa já é obviamente um veículo e um nome de pessoa já é
  //    obviamente um motorista; eram sete selos gritando o que a coluna ao lado mostrava;
  //  · o VERMELHO do selo de motorista — alguém de férias não é emergência, e a cor estava
  //    sendo gasta em categoria, não em urgência. A única cor da lista passou a ser a do chip
  //    da placa, que já significa o modelo do carro;
  //  · os selos `só hoje` / `cadastro` repetidos linha a linha — viraram cabeçalho de grupo,
  //    ditos uma vez, e o do cadastro ganhou espaço para dizer ONDE se resolve;
  //  · a seta `↳` do segundo andar — com motivo e observação em coluna própria e alinhados,
  //    ela virou enfeite.
  //
  // 📌 A FUSÃO do carro no dono é feita no SERVIDOR (ver getEscalaPeriodo). Aqui o card só
  // desenha o que recebe: `o.carroParadoJunto` já vem resolvido.
  function escLinhaObsHTML(o) {
    var ehMot = o.tipo === 'motorista';
    var icone = ehMot ? 'ti-user' : 'ti-car';

    var quem = ehMot
      ? `<span class="esc-obs-nome">${escEsc(o.nome)}</span>`
        // Terceirizado leva a PLACA junto: sem ela alguém procuraria o veículo achando que
        // está livre. `parado junto` é o que substitui a linha duplicada que existia antes.
        + (o.placa
            ? `<span class="esc-obs-carro">${escVeiculoHTML(o.placa, '')}`
              + (o.carroParadoJunto ? '<span class="esc-obs-junto">parado junto</span>' : '')
              + `</span>`
            : '')
      : escVeiculoHTML(o.nome, '');

    return `
      <div class="esc-obs-linha">
        <i class="ti ${icone} esc-obs-ic"></i>
        <div class="esc-obs-quem">${quem}</div>
        <div class="esc-obs-pq">
          ${o.motivo ? `<span class="esc-motivo-cat">${escEsc(o.motivo)}</span>`
                     : '<span class="esc-mut">—</span>'}
          ${o.observacao ? `<span class="esc-motivo-obs">${escEsc(o.observacao)}</span>` : ''}
        </div>
      </div>`;
  }

  function escCardObservacoesHTML(d, titulo) {
    var corpo;
    if (d.observacoes.length === 0) {
      corpo = `<div class="esc-vazio">Nenhuma indisponibilidade registrada.</div>`;
    } else {
      // O servidor já entrega ordenado (dia antes de cadastro, motorista antes de veículo).
      var doDia = d.observacoes.filter(function (o) { return o.origem !== 'global'; });
      var doCad = d.observacoes.filter(function (o) { return o.origem === 'global'; });

      var grupo = function (titulo, sub, arr) {
        if (arr.length === 0) return '';
        return `<div class="esc-obs-grupo">
            <span class="esc-obs-grupo-tit">${titulo}</span>
            ${sub ? `<span class="esc-obs-grupo-sub">${sub}</span>` : ''}
            <span class="esc-obs-grupo-risca"></span>
            <span class="esc-obs-grupo-n">${arr.length}</span>
          </div>` + arr.map(escLinhaObsHTML).join('');
      };

      corpo = `<div class="esc-obs-lista">`
        + grupo('Hoje', '', doDia)
        + grupo('Do cadastro', 'vale até alguém mudar em Configurações', doCad)
        + `</div>`;
    }
    return `<div class="esc-card esc-q-obs">${escCabecalhoCard('<i class="ti ti-alert-triangle"></i>Observações', titulo, d.observacoes.length)}${corpo}</div>`;
  }

  // Selo de versão (SEMPRE a última linha do script — o Index acusa se faltar = colagem truncada)
  // =======================================================================
  // FORMAÇÃO DA ESCALA (Fase 2) — o conteúdo da Aba 1, agora no FIM do fluxo
  // =======================================================================
  // Reusa o backend inteiro: getDadosParaEscala para ler, salvarNovaArquitetura para
  // gravar. Nenhuma função nova no servidor.
  //
  // ⚠️ Prefixo `escF` em TUDO. A Aba 1 continua viva até a Fase 4 e as duas telas
  // dividem o mesmo escopo global — id ou função repetida se sobrescreve em silêncio.
  //
  // 📌 A LISTA de quem aparece vem do cadastro global (o getDadosParaEscala só devolve
  // quem está `Ativo`). O que se marca aqui é quem faltou HOJE — coisa diferente de
  // "saiu do quadro", que é a Situação em Configurações.
  const estadoEscF = { servidores: [], terceirizados: [], veiculos: [], salvos: null,
                     ordem: [], contexto: null, diasAbertos: {}, fixacoes: [], destaque: '', assinatura0: '' };

  const ESCF_MOTIVOS_RH = ['Afastado', 'Atestado', 'Faltou', 'Férias', 'Folga', 'Licença',
                           'Não disponível', 'Outros'];
  const ESCF_MOTIVOS_VEI = ['Alocado', 'Manutenção', 'Outros'];

  // ⚠️ Ausente = condição DIFERENTE de 'Disponível'. A Aba 1 grava veículo indisponível
  // como 'Indisponível' mas relê comparando com 'Ausente' — então o veículo voltava
  // desmarcado e a gravação seguinte o devolvia à frota sem ninguém pedir. Nunca apareceu
  // porque não há linha marcada nos dados, mas o bug é real. Aqui a regra é a mesma que o
  // getDadosOperacao usa para a frota: só 'Disponível' conta como disponível.
  function escFAusente(cond) {
    return (cond || '').toString().trim() !== 'Disponível';
  }

  function escFOpcoes(lista, atual) {
    return lista.map(function (m) {
      return '<option value="' + escEsc(m) + '"' + (m === atual ? ' selected' : '') + '>'
           + escEsc(m) + '</option>';
    }).join('');
  }

  // Atalho do botão de trocar motorista da Confirmação e Guias (10/11/2026): abre esta tela na data, com a viagem
  // destacada. Desde 11/11 a Formação é a própria tela, não uma janela.
  function escFAbrirEm(dataISO, idViagem) {
    estadoEscF.destaque = idViagem || '';
    const dt = document.getElementById('escFData');
    if (dataISO && dataISO !== escCarregadaPara) { dt.value = dataISO; escCarregarTudo(); }
    else escFRenderViagens();
  }

  function escFBuscar() {
    const data = document.getElementById('escFData').value;
    if (!data) return;
    document.getElementById('escFCorpo').innerHTML =
      '<div class="escf-carregando">Carregando...</div>';
    ['escFViagens', 'escSecInternas', 'escFViagensTerc', 'escSecObs'].forEach(function (id) {
      const el = document.getElementById(id); if (el) el.innerHTML = '';
    });
    estadoEscF.assinatura0 = '';
    chamarServidor('getDadosParaEscala', [data], function (dados) {
        if (data !== escCarregadaPara) return;   // trocaram de dia enquanto carregava
        escFCarregar(dados);
        estadoEscF.assinatura0 = escFAssinatura();
        escAtualizarChip();
        escFDica();
        escBuscarRelatorio();
      }, function (e) {
        document.getElementById('escFCorpo').innerHTML =
          '<div class="escf-carregando">Erro ao carregar: ' + escEsc(e) + '</div>';
      });
  }

  function escFCarregar(dados) {
    estadoEscF.servidores = dados.servidores || [];
    estadoEscF.terceirizados = dados.terceirizados || [];
    estadoEscF.veiculos = dados.veiculos || [];
    estadoEscF.salvos = dados.salvos || { motoristas: [], veiculos: [] };
    // 🔒 Dia que já passou fica TRAVADO com o motorista gravado (11/09) — mas só num período
    // EM CURSO: reabrir o sábado no domingo de manhã não pode reembaralhar viagem que já rodou.
    // Um dia avulso, ou um período que já terminou inteiro, abre como sempre abriu: é revisão.
    const hojeIso = escHojeISO();
    const ctxC = dados.contexto || {};
    const diasC = (ctxC.ehAncora && ctxC.dias && ctxC.dias.length > 1) ? ctxC.dias : [];
    const emCurso = diasC.some(function (dd) { const iso = escFIsoDe(dd); return !!iso && !(hojeIso > iso); });
    estadoEscF.diasAbertos = {};
    // Viagens externas já montadas no dia (ou no período) — cópias, para mexer sem tocar no que veio.
    // Motoristas fixados à mão e gravados (10/11/2026): só valem se a viagem ainda está com AQUELE motorista.
    estadoEscF.fixacoes = dados.fixacoes || [];
    const fixadoEm = function (v) {
      return estadoEscF.fixacoes.some(function (f) {
        return !f.segundo && f.data === v.data && f.idViagem === v.idViagem && v.motorista
            && f.motorista.toUpperCase() === v.motorista.toUpperCase();
      });
    };
    // 2º motorista fixado (11/11/2026): mesma regra, na linha "#2" da fixação.
    const fixado2Em = function (v) {
      return estadoEscF.fixacoes.some(function (f) {
        return f.segundo && f.data === v.data && f.idViagem === v.idViagem && v.motorista2
            && f.motorista.toUpperCase() === v.motorista2.toUpperCase();
      });
    };
    estadoEscF.viagens = (dados.viagens || []).map(function (v) {
      const iso = escFIsoDe(v.data);
      const nova = { idViagem: v.idViagem || '', placa: v.placa, tipo: v.tipo, hora: v.hora, destino: v.destino,
               data: v.data || '',
               passou: emCurso && !!iso && hojeIso > iso,
               terceirizado: !!v.terceirizado,
               motorista: v.motorista || '',
               // O que estava gravado antes de a tela mexer: avisa o que a gravação vai mudar e é conferido
               // no servidor (se mudou lá desde então, outro operador mexeu e a viagem não é gravada por cima).
               motoristaOriginal: v.motorista || '',
               placaOriginal: v.placa || '',
               tipoOriginal: v.tipo || '',
               jaTinha: !!v.motorista,
               ocupados: v.ocupados || 0,
               bloqueados: v.bloqueados || 0,
               esperando: false,   // perdeu o motorista para outra viagem e espera a escolha do operador
               soltoAviso: false,  // estava fixado e o motorista ficou ausente: voltou para a fila sozinho
               fixado: false,
               // DOIS MOTORISTAS (11/11/2026): um na ida, outro na volta. Só viagem de servidor (carro público).
               doisMotoristas: !!v.doisMotoristas && !v.terceirizado,
               doisOriginal: !!v.doisMotoristas,
               motorista2: v.motorista2 || '',
               motorista2Original: v.motorista2 || '',
               esperando2: false, soltoAviso2: false, fixado2: false };
      nova.fixado = !nova.terceirizado && !nova.passou && fixadoEm(nova);
      nova.fixado2 = nova.doisMotoristas && !nova.passou && fixado2Em(nova);
      return nova;
    });
    estadoEscF.contexto = dados.contexto || null;

    // Remonta a ordem já gravada, se houver. Só entram servidores que ainda estão no
    // cadastro: quem saiu do quadro depois não pode voltar à fila por causa do histórico.
    const salvosOk = (estadoEscF.salvos.motoristas || []).filter(function (m) {
      return !escFAusente(m.condicao)
          && estadoEscF.servidores.some(function (s) { return s.nome === m.nome; });
    });
    // ⚠️ `ordem` guarda a fila COMPLETA, com os ausentes no meio dela. A fila exibida e
    // gravada é essa lista filtrada. É o que faz alguém que volta reaparecer no LUGAR
    // dele: se a lista só tivesse os disponíveis, o nome teria de ser recolocado no fim,
    // porque a informação de onde ele estava já teria sido jogada fora.
    estadoEscF.ordem = salvosOk.map(function (m) { return { nome: m.nome }; });
    escFEncaixarAusentes();

    escFRender();
  }

  // Ausente gravado não tem posição na planilha (posicao fica vazia), então ao reabrir
  // a data não há de onde saber onde ele estava. Encaixa pela ordem do CADASTRO: antes do
  // primeiro colega que já está na fila e que vem depois dele no cadastro.
  function escFEncaixarAusentes() {
    const naOrdem = estadoEscF.ordem.map(function (m) { return m.nome; });
    estadoEscF.servidores.forEach(function (s, idxCad) {
      if (naOrdem.indexOf(s.nome) > -1) return;
      let alvo = estadoEscF.ordem.length;
      for (let i = 0; estadoEscF.ordem.length > i; i++) {
        let idxOutro = -1;
        estadoEscF.servidores.forEach(function (x, k) {
          if (x.nome === estadoEscF.ordem[i].nome) idxOutro = k;
        });
        if (idxOutro > idxCad) { alvo = i; break; }
      }
      estadoEscF.ordem.splice(alvo, 0, { nome: s.nome });
    });
  }

  // 'DD/MM/AAAA' -> 'AAAA-MM-DD', que compara certo como texto. Vazio se não for data.
  function escFIsoDe(dataBR) {
    const p = (dataBR || '').split('/');
    return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : '';
  }

  // 'DD/MM/AAAA' -> 'Sábado, 12/09' — o cabeçalho de cada dia do período.
  function escFRotuloDia(dataBR) {
    const p = (dataBR || '').split('/');
    if (p.length !== 3) return dataBR || '';
    const dia = new Date(Date.UTC(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10))).getUTCDay();
    const NOMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return NOMES[dia] + ', ' + p[0] + '/' + p[1];
  }

  // A fila que aparece e que é gravada: a ordem completa, sem quem faltou hoje.
  function escFFila() {
    const fora = escFAusentes();
    return estadoEscF.ordem.filter(function (m) { return fora.indexOf(m.nome) === -1; });
  }

  function escFSalvoMot(nome) {
    return (estadoEscF.salvos.motoristas || []).filter(function (m) {
      return m.nome === nome;
    })[0];
  }
  function escFSalvoVei(placa) {
    return (estadoEscF.salvos.veiculos || []).filter(function (v) {
      return v.placa === placa;
    })[0];
  }

  function escFItemHTML(classe, valor, rotulo, sub, motivos, extra) {
    const salvo = extra.salvo;
    const fora = !!(salvo && escFAusente(salvo.condicao));
    return '<div class="escf-item' + (fora ? ' fora' : '') + '">'
      + '<label><input type="checkbox" class="' + classe + '" value="' + escEsc(valor) + '"'
      +   (extra.placa ? ' data-placa="' + escEsc(extra.placa) + '"' : '')
      +   (fora ? ' checked' : '')
      +   ' onchange="escFToggle(this)"><span>' + escEsc(rotulo)
      +   (sub ? ' <span class="escf-sub2">' + escEsc(sub) + '</span>' : '') + '</span></label>'
      // 📌 O motivo e a OBSERVAÇÃO nascem no mesmo gesto — marcar a caixa revela os dois.
      // Sem modal, de propósito: aqui se marca meia dúzia de ausentes de uma vez, e um modal
      // por marcação seriam seis modais para uma tarefa só. (Nas Configurações é o contrário:
      // um por vez e grava na hora, e lá o modal é o certo.)
      + '<div class="escf-obs-cx" style="display:' + (fora ? 'block' : 'none') + '">'
      +   '<select onchange="escFDica()">' + escFOpcoes(motivos, fora ? salvo.motivo : '') + '</select>'
      +   '<input type="text" class="escf-obs" maxlength="120" placeholder="Observação (opcional)" oninput="escFDica()"'
      +     ' value="' + escEsc(fora ? (salvo.observacao || '') : '') + '">'
      +   '<div class="escf-obs-dica">Aparece na Escala, embaixo do motivo</div>'
      + '</div>'
      + '</div>';
  }

  function escFRender() {
    let servHTML = '', tercHTML = '', veiHTML = '';

    estadoEscF.servidores.forEach(function (m) {
      servHTML += escFItemHTML('escf-chk-serv', m.nome, m.nome, '', ESCF_MOTIVOS_RH,
                               { salvo: escFSalvoMot(m.nome) });
    });
    estadoEscF.terceirizados.forEach(function (m) {
      tercHTML += escFItemHTML('escf-chk-terc', m.nome, m.nome,
                               '(' + (m.placaVinculada || 'sem placa') + ')',
                               ESCF_MOTIVOS_RH.concat(['Manutenção do Veículo']),
                               { salvo: escFSalvoMot(m.nome), placa: m.placaVinculada || '' });
    });
    estadoEscF.veiculos.forEach(function (v) {
      veiHTML += escFItemHTML('escf-chk-vei', v.placa, v.placa, '(' + (v.tipo || '') + ')',
                              ESCF_MOTIVOS_VEI, { salvo: escFSalvoVei(v.placa) });
    });

    const bloco = function (titulo, n, corpo) {
      return '<div class="escf-bloco"><div class="escf-bloco-tit"><span>' + titulo + '</span>'
           + '<span class="escf-bloco-n">' + n + '</span></div>'
           + '<div class="escf-lista">' + (corpo || '<div class="escf-vazio">Nenhum.</div>')
           + '</div></div>';
    };

    document.getElementById('escFCorpo').innerHTML =
        escFCtxHTML()
      + bloco('Motoristas servidores', estadoEscF.servidores.length, servHTML)
      + bloco('Terceirizados', estadoEscF.terceirizados.length, tercHTML)
      + bloco('Veículos da prefeitura', estadoEscF.veiculos.length, veiHTML)
      + '<div class="escf-bloco"><div class="escf-bloco-tit"><span>Ordem da escala</span>'
      +   '<span class="escf-bloco-n" id="escFOrdN"></span></div>'
      +   '<div class="escf-vez"><label for="escFVez">Motorista da vez</label>'
      +     '<select id="escFVez" onchange="escFGerar()"></select></div>'
      +   '<div class="escf-ordem" id="escFOrdem"></div>'
      + '</div>';

    escFAtualizarVez();
  }

  // Aviso de contexto do dia (Fase 3b).
  //
  // 📌 A REGRA, confirmada com o setor: a escala é formada UMA VEZ POR PERÍODO, e período
  // é uma sequência CONTÍGUA de dias não-úteis — sáb+dom, feriado isolado, feriado emendado
  // no fim de semana, ou bloco de recesso. O primeiro dia do período é a ÂNCORA; os demais
  // herdam a escala dele. Em dia útil, o período é o próprio dia.
  function escFCtxHTML() {
    const c = estadoEscF.contexto;
    if (!c) return '';

    const desc = c.descricao ? ' — ' + escEsc(c.descricao) : '';

    if (c.ehUtil) {
      return '<div class="escf-ctx util"><i class="ti ti-calendar-check"></i>'
        + '<div><b>' + escEsc(c.diaSemana) + '</b>, dia útil. '
        + 'Forma-se escala todo dia útil.</div></div>';
    }

    const n = (c.dias || []).length;
    const periodo = n > 1
      ? ' Faz parte de um período de <b>' + n + ' dias</b> ('
        + escEsc(c.dias[0]) + ' a ' + escEsc(c.dias[n - 1]) + ').'
      : '';

    if (c.ehAncora) {
      return '<div class="escf-ctx fora"><i class="ti ti-calendar-off"></i>'
        + '<div><b>' + escEsc(c.diaSemana) + '</b> · ' + escEsc(c.tipo) + desc + '.'
        + periodo + ' Este é o <b>primeiro dia</b> do período: a escala formada aqui vale '
        + 'para todos eles'
        // 11/09: agora vale na planilha também — a gravação copia a escala para cada dia.
        + (n > 1 ? ' — as viagens dos ' + n + ' dias estão logo abaixo, e a escala é gravada em cada um' : '')
        + '.</div></div>';
    }

    // Não é a âncora: a escala pertence a outro dia. Se lá já existe, formar aqui seria
    // criar uma segunda escala para o mesmo período — o erro que a regra existe para evitar.
    const irPara = '<button class="escf-ctx-ir" onclick="escFIrPara(\'' + c.ancora + '\')">'
                 + 'abrir ' + escEsc(c.ancora) + '</button>';
    if (c.ancoraTemEscala) {
      return '<div class="escf-ctx herda"><i class="ti ti-alert-triangle"></i>'
        + '<div><b>' + escEsc(c.diaSemana) + '</b> · ' + escEsc(c.tipo) + desc + '.' + periodo
        + '<br><b>A escala deste período já foi formada em ' + escEsc(c.ancora) + '</b> e vale '
        + 'para hoje. Gravar aqui cria uma segunda escala para o mesmo período. '
        + 'Se a intenção é corrigir, ' + irPara + '.</div></div>';
    }
    return '<div class="escf-ctx fora"><i class="ti ti-calendar-off"></i>'
      + '<div><b>' + escEsc(c.diaSemana) + '</b> · ' + escEsc(c.tipo) + desc + '.' + periodo
      + '<br>O período começa em <b>' + escEsc(c.ancora) + '</b>, e é lá que a escala deveria '
      + 'ser formada — ' + irPara + '.</div></div>';
  }

  function escFIrPara(dataBR) {
    const iso = escFIsoDe(dataBR);
    if (iso) escTrocarData(iso);
  }

  function escFToggle(chk) {
    const item = chk.closest('.escf-item');
    // Revela motivo E observação juntos — os dois moram na mesma caixa desde 09/09.
    item.querySelector('.escf-obs-cx').style.display = chk.checked ? 'block' : 'none';
    item.classList.toggle('fora', chk.checked);
    if (chk.checked) {
      // O foco vai para o MOTIVO, que é o obrigatório. A observação é opcional e vem depois,
      // com um Tab — quem não quer escrever nada não perde tempo com ela.
      const sel = item.querySelector('select');
      if (sel) setTimeout(function () { sel.focus(); }, 30);
    }
    if (chk.classList.contains('escf-chk-serv')) escFAtualizarVez();
  }

  function escFAusentes() {
    const fora = [];
    document.querySelectorAll('.escf-chk-serv').forEach(function (c) {
      if (c.checked) fora.push(c.value);
    });
    return fora;
  }

  // Mantém o select da vez e a ordem coerentes com quem foi marcado como ausente:
  // quem faltou sai da fila; quem voltou entra no fim, sem bagunçar o resto.
  function escFAtualizarVez() {
    const sel = document.getElementById('escFVez');
    if (!sel) return;
    const anterior = sel.value;
    const fora = escFAusentes();

    let html = '<option value="">Selecione o primeiro da fila...</option>';
    estadoEscF.servidores.forEach(function (m) {
      if (fora.indexOf(m.nome) > -1) return;
      html += '<option value="' + escEsc(m.nome) + '"'
            + (m.nome === anterior ? ' selected' : '') + '>' + escEsc(m.nome) + '</option>';
    });
    sel.innerHTML = html;

    // ⚠️ A ordem NÃO é mexida aqui. Marcar e desmarcar ausência só muda o filtro — quem
    // volta reaparece na posição que sempre teve. Antes eu removia e recolocava no fim,
    // e o operador reprovou com razão: o lugar dele na rotação é informação, não sobra.
    const fila = escFFila();
    if (fora.indexOf(anterior) > -1 && fila.length > 0) sel.value = fila[0].nome;
    // Ordem já gravada (11/11/2026): o motorista da vez é o primeiro dela, em vez de a lista abrir vazia.
    if (!sel.value && fila.length > 0) sel.value = fila[0].nome;
    escFRenderOrdem();
  }

  // A fila é a lista de servidores disponíveis ROTACIONADA para começar no da vez.
  function escFGerar() {
    const vez = document.getElementById('escFVez').value;
    if (!vez) { estadoEscF.ordem = []; escFRenderOrdem(); return; }
    // Rotaciona a lista COMPLETA do cadastro, ausentes inclusive: eles ficam guardados
    // na posição deles e só não aparecem enquanto estiverem marcados.
    const todos = estadoEscF.servidores;
    let i = -1;
    todos.forEach(function (m, k) { if (m.nome === vez && i === -1) i = k; });
    if (i === -1) return;
    estadoEscF.ordem = todos.slice(i).concat(todos.slice(0, i))
                            .map(function (m) { return { nome: m.nome }; });
    escFRenderOrdem();
  }

  function escFRenderOrdem() {
    const cont = document.getElementById('escFOrdem');
    if (!cont) return;
    const fila = escFFila();
    const n = document.getElementById('escFOrdN');
    if (n) n.textContent = fila.length;

    if (fila.length === 0) {
      cont.innerHTML = '<div class="escf-vazio">Escolha o motorista da vez para gerar a fila.</div>';
      escFDistribuir();   // sem fila, as viagens ficam sem motorista — e isso tem de aparecer
      return;
    }
    cont.innerHTML = fila.map(function (m, i) {
      return '<div class="escf-ord-item" draggable="true" title="Arraste para reordenar"'
        + ' ondragstart="escFDragStart(event,' + i + ')" ondragover="escFDragOver(event)"'
        + ' ondragleave="escFDragLeave(event)" ondrop="escFDrop(event,' + i + ')"'
        + ' ondragend="escFDragEnd(event)">'
        + '<span class="escf-ord-pos">' + (i + 1) + 'º</span>'
        + '<span class="escf-ord-nome">' + escEsc(m.nome) + '</span>'
        + '<span class="escf-ord-onde" data-n="' + escEsc(m.nome) + '"></span>'
        + '<i class="ti ti-grip-vertical" style="color:#c7cedb"></i></div>';
    }).join('');
    escFDistribuir();   // a fila mudou: redistribui as viagens do dia
  }

  // ---- VIAGENS DO DIA (ou do PERÍODO): distribuição dos motoristas ---------------
  // A regra está no docs/DECISOES.md e nunca tinha sido implementada: "ordenar as viagens
  // por horário e consumir os motoristas na sequência". Era o último passo manual do
  // fluxo invertido — montar carro sem motorista e depois atribuir um a um na Guia.
  function escFDistribuir() {
    // Fixado cujo motorista foi marcado ausente: volta para a fila sozinho, com aviso (10/11/2026).
    const fora = escFAusentes();
    (estadoEscF.viagens || []).forEach(function (v) {
      if (v.fixado && !v.terceirizado && v.motorista && fora.indexOf(v.motorista) > -1) {
        v.fixado = false; v.soltoAviso = true;
      }
      if (v.fixado2 && v.motorista2 && fora.indexOf(v.motorista2) > -1) { v.fixado2 = false; v.soltoAviso2 = true; }
    });
    escFDistribuirPuro(escFFila().map(function (m) { return m.nome; }), estadoEscF.viagens);
    escFRenderViagens();
  }

  // A distribuição em si, sem tela — é o que o teste roda.
  //
  // 📌 PERÍODO (11/09, decisão do operador): a fila CONTINUA de um dia para o outro — sábado
  // leva do 1º ao 5º, domingo segue do 6º — e volta ao começo sempre que acaba, quantas vezes
  // o período precisar. Não há limite de carros por dia: o número segue os pedidos dos
  // pacientes e é imprevisível.
  // ⚠️ NUNCA o mesmo motorista em dois carros no MESMO dia — a regra que o dia útil já seguia.
  // Por isso "já usado" é por DIA. A viagem só fica sem motorista quando aquele dia tem mais
  // carros do que gente livre na fila; aparece em vermelho e não trava a gravação.
  // 📌 Num dia só, o resultado é o de sempre: a volta ao começo só encontra quem já foi usado
  // no dia, e a viagem que sobra fica sem motorista, como antes.
  function escFDistribuirPuro(fila, viagens) {
    const n = fila.length;
    const usados = {};   // data -> { NOME: true }
    const doDia = function (d) { if (!usados[d]) usados[d] = {}; return usados[d]; };

    // ⚠️ Só as atribuições TRAVADAS ocupam nome antes de distribuir: terceirizado (motorista do
    // vínculo), `fixado` (o operador arrastou nesta sessão) e `passou` (dia que já rodou). Se as
    // distribuídas também entrassem aqui, na segunda rodada cada carro veria o próprio nome como
    // "usado" e se auto-excluiria da fila.
    //
    // 📌 `jaTinha` NÃO trava. Ele existia para proteger atribuição feita à mão na Guia — mas
    // depois da primeira gravação TODA viagem tem motorista, então na reabertura todas vinham
    // marcadas e reordenar a fila não mudava nada. Agora ele só MARCA, e a proteção passa a ser
    // a visibilidade: o painel mostra a atribuição antes de gravar.
    viagens.forEach(function (v) {
      if ((v.terceirizado || v.fixado || v.passou) && v.motorista) doDia(v.data)[v.motorista.toUpperCase()] = true;
      // 2º motorista travado (11/11/2026): fixado à mão ou dia que já passou.
      if (v.doisMotoristas && (v.fixado2 || v.passou) && v.motorista2) doDia(v.data)[v.motorista2.toUpperCase()] = true;
    });

    let ponteiro = 0;
    // O próximo da fila que ainda não está em carro nenhum do dia; '' quando todos já estão.
    const proximo = function (ocupados) {
      for (let t = 0; n > t; t++) {
        const nome = fila[(ponteiro + t) % n];
        if (ocupados[nome.toUpperCase()]) continue;
        ocupados[nome.toUpperCase()] = true;
        ponteiro = (ponteiro + t + 1) % n;
        return nome;
      }
      return '';   // todos da fila já estão num carro deste dia: fica sem motorista
    };
    viagens.forEach(function (v) {
      const ocupados = doDia(v.data);
      // `esperando` (10/11/2026): a viagem perdeu o motorista para outra e fica vazia até o operador escolher.
      if (!(v.terceirizado || v.fixado || v.passou || v.esperando)) {
        v.motorista = '';   // redistribui do zero a cada mudança na fila
        v.motorista = proximo(ocupados);
      }
      // DOIS MOTORISTAS (11/11/2026): a viagem marcada consome mais um nome da fila, logo depois do 1º.
      if (!v.doisMotoristas || v.terceirizado) { if (!v.passou) v.motorista2 = ''; return; }
      if (v.fixado2 || v.passou || v.esperando2) return;
      v.motorista2 = '';
      v.motorista2 = proximo(ocupados);
    });
    return viagens;
  }

  // Desenha as seções 2 (viagens dos servidores), 3 (remoção interna) e 4 (terceirizados), dia a dia. A numeração conta
  // MOTORISTAS e segue de uma seção para a outra, como na folha: viagens, depois internas, depois terceirizados.
  function escFRenderViagens() {
    escFMenuFechar();   // a lista aberta apontava para a linha antiga
    const contS = document.getElementById('escFViagens');
    const contI = document.getElementById('escSecInternas');
    const contT = document.getElementById('escFViagensTerc');
    if (!contS) return;
    const vs = estadoEscF.viagens || [];
    const c = estadoEscF.contexto || {};
    const periodo = !!(c.ehAncora && (c.dias || []).length > 1);
    const dias = periodo ? c.dias : [c.data || (vs[0] && vs[0].data) || ''];
    let hS = '', hI = '', hT = '';
    dias.forEach(function (d) {
      const idx = [];
      vs.forEach(function (v, i) { if (!periodo || v.data === d) idx.push(i); });
      const serv = idx.filter(function (i) { return !vs[i].terceirizado; });
      const terc = idx.filter(function (i) { return vs[i].terceirizado; });
      const rel = estadoEscRel.porDia[d] || null;
      const rot = escFRotuloDia(d) + (d && d.length === 10 ? '/' + d.slice(6) : '')
                + (rel && !rel.ehUtil && rel.tipoDia ? ' · ' + rel.tipoDia : '');
      let nServ = 0;
      serv.forEach(function (i) { nServ += vs[i].doisMotoristas ? 2 : 1; });
      hS += escFFolhaHTML('Escala de Viagens Externas', rot, serv, 'serv', 0);
      const int = escInternasHTML(d, rot, nServ);
      hI += int.html;
      // Terceirizados sem viagem externa no dia (remoção interna, ou nada num sábado): vêm do relatório, só leitura.
      const comViagem = {};
      terc.forEach(function (i) { if (vs[i].motorista) comViagem[vs[i].motorista.toUpperCase()] = true; });
      const resto = ((rel && rel.terceirizados) || []).filter(function (t) {
        return t.motorista && !comViagem[t.motorista.toUpperCase()] && !(t.hora && !t.interno);
      });
      hT += escFFolhaHTML('Terceirizados', rot, terc, 'terc', nServ + int.n, resto);
    });
    contS.innerHTML = hS;
    if (contI) contI.innerHTML = hI;
    if (contT) contT.innerHTML = hT;
    escFAtualizarOndeCaiu();
    escFDica();
    // Atalho da Guia: rola até a viagem destacada (uma vez só).
    if (estadoEscF.destaque) {
      const alvo = document.querySelector('#escUni tr[data-vg="' + estadoEscF.destaque.replace(/"/g, '') + '"]');
      if (alvo) { alvo.scrollIntoView({ block: 'center' }); estadoEscF.destaque = ''; }
    }
  }

  // Um quadro no visual da folha da Escala para Enviar: faixa, cabeçalho e linhas numeradas por motorista.
  // `extras` (11/11/2026): linhas só de leitura no fim (terceirizado sem viagem externa no dia).
  function escFFolhaHTML(titulo, sub, idx, quadro, n0, extras) {
    let h = '<table class="escf-folha"><colgroup><col class="c-n"><col class="c-mot"><col class="c-hora">'
          + '<col class="c-dest"><col class="c-vei"></colgroup>'
          + '<tr><td colspan="5" class="escf-folha-faixa">' + escEsc(titulo) + '<small>' + escEsc(sub) + '</small></td></tr>'
          + '<tr><th></th><th>Motoristas</th><th>Hora de Saída</th><th>Destino</th><th>Veículo</th></tr>';
    extras = extras || [];
    if (idx.length === 0 && extras.length === 0) h += '<tr><td colspan="5" class="vazio">Nenhuma viagem neste quadro.</td></tr>';
    let num = n0;
    // Terceirizados (pedido do Hélio, 11/11/2026): uma sequência só, na ordem das linhas da bd_motoristas (a mesma
    // da Escala para Enviar), com e sem viagem misturados. Antes vinham primeiro os com viagem e depois os sem.
    // `estadoEscF.terceirizados` chega do servidor nessa ordem; o mesmo motorista com duas viagens fica pela hora.
    const itens = idx.map(function (i) { return { i: i, nome: estadoEscF.viagens[i].motorista || '', hora: estadoEscF.viagens[i].hora || '' }; })
      .concat(extras.map(function (t) { return { t: t, nome: t.motorista || '', hora: '99:99' }; }));
    if (quadro === 'terc') {
      const pos = {};
      (estadoEscF.terceirizados || []).forEach(function (m, k) { pos[(m.nome || '').toUpperCase()] = k; });
      const posDe = function (n) { const q = pos[n.toUpperCase()]; return q === undefined ? 1e9 : q; };
      itens.sort(function (a, b) {
        const d = posDe(a.nome) - posDe(b.nome);
        if (d !== 0) return d;
        return a.hora === b.hora ? a.nome.localeCompare(b.nome) : a.hora.localeCompare(b.hora);
      });
    }
    itens.forEach(function (it) {
      if (it.t === undefined) {
        const v = estadoEscF.viagens[it.i];
        h += escFLinhaHTML(v, it.i, num + 1, quadro);
        num += v.doisMotoristas ? 2 : 1;
        return;
      }
      const t = it.t;
      num++;
      h += '<tr><td class="n">' + num + '</td><td><div class="escf-lmot"><span class="escf-cad fixo" title="Terceirizado: dirige o carro dele">'
         + '<i class="ti ti-lock"></i></span><span class="escf-pmot lido"><span class="txt">' + escEsc(t.motorista) + '</span></span></div></td>'
         + '<td class="hora">—</td><td class="dest">' + (t.interno ? 'Remoção interna' : 'Sem viagem')
         + '<small>' + (t.interno ? 'sem viagem externa' : 'não há remoção interna') + '</small></td>'
         + '<td><span class="escf-pvei fixo">' + escEsc((t.placa || '') + (t.tipo ? ' - ' + t.tipo : '')) + '</span></td></tr>';
    });
    return h + '</table>';
  }

  // Quem pode ser escolhido no dia: servidores da fila (sem os ausentes) e terceirizados presentes.
  function escFTercFora() {
    const fora = [];
    document.querySelectorAll('.escf-chk-terc').forEach(function (c) { if (c.checked) fora.push(c.value); });
    return fora;
  }
  function escFVeiculosFora() {
    const fora = [];
    document.querySelectorAll('.escf-chk-vei').forEach(function (c) { if (c.checked) fora.push(c.value); });
    return fora;
  }
  // Opções do motorista para a lista da pílula. `segundo` (11/11/2026): as do 2º motorista — só servidores, sem o 1º
  // desta mesma viagem. Devolve { livres, ocupados }, cada item { n, terc, off, onde }.
  function escFOpcoesMotorista(v, segundo) {
    const emViagem = {};
    estadoEscF.viagens.forEach(function (x) {
      if (x.data !== v.data || x === v) return;
      const onde = (x.hora || '--:--') + ' ' + (x.destino || '');
      if (x.motorista) emViagem[x.motorista.toUpperCase()] = onde;
      if (x.motorista2) emViagem[x.motorista2.toUpperCase()] = onde;
    });
    const outro = ((segundo ? v.motorista : v.motorista2) || '').toUpperCase();
    const livres = [], ocupados = [];
    const por = function (o) { (emViagem[o.n.toUpperCase()] ? ocupados : livres).push(o); o.onde = emViagem[o.n.toUpperCase()] || ''; };
    escFFila().forEach(function (m) {
      if (outro && m.nome.toUpperCase() === outro) return;   // já é o outro motorista desta viagem
      por({ n: m.nome, terc: false, off: false });
    });
    const tercFora = escFTercFora();
    if (!segundo) estadoEscF.terceirizados.forEach(function (t) {
      if (tercFora.indexOf(t.nome) > -1) return;
      por({ n: t.nome, terc: true, off: !t.placaVinculada });
    });
    return { livres: livres, ocupados: ocupados };
  }
  // Veículos para a lista da pílula: { c, lot, uso, naoCabe }.
  function escFOpcoesVeiculo(v) {
    const usoDe = {};
    estadoEscF.viagens.forEach(function (x) {
      if (x !== v && x.data === v.data && x.placa) usoDe[x.placa] = (usoDe[x.placa] ? usoDe[x.placa] + ', ' : '') + (x.hora || '--:--');
    });
    const fora = escFVeiculosFora();
    const precisa = (v.ocupados || 0) + (v.bloqueados || 0);
    return estadoEscF.veiculos.filter(function (c) {
      return c.placa === v.placa || (!c.lacen && fora.indexOf(c.placa) === -1);
    }).map(function (c) {
      const lot = c.lotacao || 4;
      return { c: c, lot: lot, uso: usoDe[c.placa] || '', naoCabe: precisa > lot };
    });
  }
  function escFCorPlaca(placa) {
    const info = (typeof escVeiculos !== 'undefined' && escVeiculos) ? (escVeiculos[(placa || '').toUpperCase()] || {}) : {};
    return escCorHex(info.cor);
  }

  // Cadeado + pílula de UM motorista. `posto` 1 ou 2. Terceirizado e dia que já passou: cadeado fechado, sem clique.
  function escFMotoristaHTML(v, i, posto, quadro) {
    const nome = posto === 2 ? v.motorista2 : v.motorista;
    const fixado = posto === 2 ? v.fixado2 : v.fixado;
    const trava = v.passou || quadro === 'terc';
    let cad;
    if (trava) {
      cad = '<span class="escf-cad fixo" title="' + (v.passou ? 'Dia que já passou' : 'Terceirizado: dirige o carro dele') + '"><i class="ti ti-lock"></i></span>';
    } else {
      const cls = fixado ? 'fechado' : (nome ? 'aberto' : 'aberto vazio');
      cad = '<button type="button" class="escf-cad ' + cls + '" onclick="escFCadeado(' + i + ',' + posto + ')"'
          + ' title="' + (fixado ? 'Fixado: não muda com a ordem da escala. Clique para soltar.' : 'Segue a ordem da escala. Clique para fixar.') + '">'
          + '<i class="ti ti-lock' + (fixado ? '' : '-open') + '"></i></button>';
    }
    const vazio = !nome;
    const pil = v.passou
      ? '<span class="escf-pmot lido"><span class="txt">' + escEsc(nome || 'sem motorista') + '</span></span>'
      : '<button type="button" class="escf-pmot' + (vazio ? ' vazio' : '') + '" onclick="escFMenuMotorista(event,' + i + ',' + posto + ')">'
        + '<span class="txt">' + escEsc(nome || 'Escolher motorista') + '</span><i class="ti ti-chevron-down seta"></i></button>';
    return '<div class="escf-lmot">' + cad + pil + '</div>';
  }

  function escFLinhaHTML(v, i, num, quadro) {
    let cls = v.passou ? 'passou' : '';
    if (estadoEscF.destaque && estadoEscF.destaque === v.idViagem) cls += ' destaque';
    const dois = quadro === 'serv' && v.doisMotoristas;
    const nums = dois ? '<div class="escf-nums"><span>' + num + '</span><span>' + (num + 1) + '</span></div>' : String(num);
    const mot = dois
      ? '<div class="escf-pilha">' + escFMotoristaHTML(v, i, 1, quadro) + escFMotoristaHTML(v, i, 2, quadro) + '</div>'
      : escFMotoristaHTML(v, i, 1, quadro);
    const pass = (v.ocupados || 0) + (v.ocupados === 1 ? ' passageiro' : ' passageiros') + (v.bloqueados ? ' + ' + v.bloqueados + ' bloq.' : '');

    let vei;
    const rot = v.placa ? escEsc(v.placa + (v.tipo ? ' - ' + v.tipo : '')) : 'Escolher veículo';
    if (quadro === 'terc' || v.passou) {
      vei = '<span class="escf-pvei fixo">' + rot + '</span>';
    } else {
      const cor = v.placa ? escFCorPlaca(v.placa) : '';
      vei = '<button type="button" class="escf-pvei' + (v.placa ? '' : ' vazio') + '"'
          + (cor ? ' style="background:' + cor + ';color:' + escTintaPara(cor) + '"' : '')
          + ' onclick="escFMenuVeiculo(event,' + i + ')">' + rot + '<i class="ti ti-chevron-down seta"></i></button>';
    }
    return '<tr class="' + cls.trim() + '" data-vg="' + escEsc(v.idViagem) + '">'
      + '<td class="n">' + nums + '</td><td>' + mot + '</td>'
      + '<td class="hora">' + escEsc(v.hora || '--:--') + '</td>'
      + '<td class="dest">' + escEsc(v.destino || '—') + '<small>' + escEsc(pass) + '</small></td>'
      + '<td>' + vei + '</td></tr>';
  }

  // ---- Cadeado (11/11/2026) ---------------------------------------------------------------------------------
  // Fechado = fixado: a pessoa fica naquela viagem, mude a ordem da escala como quiser. Aberto = segue a ordem.
  function escFCadeado(i, posto) {
    const v = estadoEscF.viagens[i];
    if (!v || v.passou || v.terceirizado) return;
    // Abrir não troca o nome na hora: ele só muda quando a ordem da escala mudar. Vazio e aberto: o clique
    // preenche com o próximo livre da ordem.
    if (posto === 2) {
      if (v.fixado2) v.fixado2 = false;
      else if (v.motorista2) v.fixado2 = true;
      else { v.motorista2 = escFProximoLivre(v); v.esperando2 = !v.motorista2; }
      v.soltoAviso2 = false;
    } else {
      if (v.fixado) v.fixado = false;
      else if (v.motorista) v.fixado = true;
      else { v.motorista = escFProximoLivre(v); v.esperando = !v.motorista; }
      v.soltoAviso = false;
    }
    escFRenderViagens();
  }

  // ---- Lista que abre na pílula (11/11/2026) ----------------------------------------------------------------
  // Uma lista só na tela, com a largura da pílula. Cada opção guarda a ação num vetor (escFMenuAcoes), para não
  // pôr nome de pessoa dentro de onclick.
  let escFMenuAcoes = [];
  function escFMenuFechar() {
    const m = document.getElementById('escFMenu');
    if (m) m.remove();
    escFMenuAcoes = [];
  }
  function escFMenuEscolher(k) {
    const f = escFMenuAcoes[k];
    escFMenuFechar();
    if (f) f();
  }
  function escFMenuAbrir(ev, html) {
    ev.stopPropagation();
    const alvo = ev.currentTarget;
    const jaAberto = document.getElementById('escFMenu');
    if (jaAberto && jaAberto.getAttribute('data-de') === alvo.getAttribute('onclick')) { escFMenuFechar(); return; }
    // Tira a lista anterior SEM zerar escFMenuAcoes: as ações desta lista acabaram de ser montadas.
    if (jaAberto) jaAberto.remove();
    const r = alvo.getBoundingClientRect();
    const m = document.createElement('div');
    m.id = 'escFMenu';
    m.className = 'escf-menu';
    m.setAttribute('data-de', alvo.getAttribute('onclick') || '');
    m.innerHTML = html;
    m.style.left = r.left + 'px';
    m.style.width = r.width + 'px';
    document.body.appendChild(m);
    // Abre para baixo; se não couber, para cima.
    const alt = m.offsetHeight;
    m.style.top = ((r.bottom + 4 + alt > window.innerHeight && r.top > alt + 8) ? r.top - 4 - alt : r.bottom + 4) + 'px';
  }
  function escFMenuOp(f, conteudo, classe) {
    escFMenuAcoes.push(f);
    return '<div class="op' + (classe ? ' ' + classe : '') + '" onclick="escFMenuEscolher(' + (escFMenuAcoes.length - 1) + ')">' + conteudo + '</div>';
  }
  document.addEventListener('click', function (e) {
    const m = document.getElementById('escFMenu');
    if (m && !m.contains(e.target)) escFMenuFechar();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') escFMenuFechar(); }, true);
  document.addEventListener('scroll', function (e) {
    const m = document.getElementById('escFMenu');
    if (m && !m.contains(e.target)) escFMenuFechar();
  }, true);

  function escFMenuMotorista(ev, i, posto) {
    const v = estadoEscF.viagens[i];
    if (!v || v.passou) return;
    escFMenuAcoes = [];
    const ops = escFOpcoesMotorista(v, posto === 2);
    const atual = ((posto === 2 ? v.motorista2 : v.motorista) || '').toUpperCase();
    const item = function (o) {
      const conteudo = '<span class="tag ' + (o.terc ? 'terc' : 'serv') + '">' + (o.terc ? 'TERC' : 'SERV') + '</span>'
        + '<span>' + escEsc(o.n) + '</span>'
        + (o.onde ? '<span class="info">· ' + escEsc(o.onde) + '</span>' : '')
        + (o.off ? '<span class="info nao">sem carro cadastrado</span>' : '');
      if (o.off) return '<div class="op off">' + conteudo + '</div>';
      return escFMenuOp(function () {
        if (posto === 2) escFEscolherMotorista2(i, o.n); else escFEscolherMotorista(i, o.n);
      }, conteudo, o.n.toUpperCase() === atual ? 'sel' : '');
    };
    let html = '<div class="grp livres">Livres</div>' + (ops.livres.length ? ops.livres.map(item).join('') : '<div class="op off">ninguém livre</div>');
    if (ops.ocupados.length) html += '<div class="grp">Em viagem</div>' + ops.ocupados.map(item).join('');
    // Dois motoristas: adicionar fica no fim da lista do 1º (só viagem de servidor); tirar, no fim da lista do 2º.
    if (posto === 2) {
      html += escFMenuOp(function () { escFDois(i, false); }, '<i class="ti ti-user-minus"></i>Tirar o 2º motorista', 'acao perigo');
    } else if (!v.terceirizado && !v.doisMotoristas) {
      html += escFMenuOp(function () { escFDois(i, true); }, '<i class="ti ti-user-plus"></i>Adicionar 2º motorista', 'acao');
    }
    escFMenuAbrir(ev, html);
  }

  function escFMenuVeiculo(ev, i) {
    const v = estadoEscF.viagens[i];
    if (!v || v.passou || v.terceirizado) return;
    escFMenuAcoes = [];
    const html = escFOpcoesVeiculo(v).map(function (o) {
      const conteudo = '<span>' + escEsc((o.c.tipo || 'Veículo') + ' · ' + o.c.placa) + '</span>'
        + '<span class="info">· ' + o.lot + ' lugares' + (o.uso ? ' · em viagem ' + escEsc(o.uso) : '') + '</span>'
        + (o.naoCabe ? '<span class="info nao">não cabe</span>' : '');
      return escFMenuOp(function () { escFEscolherVeiculo(i, o.c.placa); }, conteudo, o.c.placa === v.placa ? 'sel' : '');
    }).join('') || '<div class="op off">nenhum carro disponível</div>';
    escFMenuAbrir(ev, html);
  }

  // ---- DOIS MOTORISTAS (11/11/2026) ----------------------------------------------------------------------
  // Viagem longa: um motorista dirige na ida e outro na volta. Só viagem de servidor (carro público). A marca
  // pode vir de Viagens Externas ou ser ligada pela lista do motorista; o 2º sai da ordem da escala como o 1º.
  function escFDois(i, ligar) {
    const v = estadoEscF.viagens[i];
    if (!v || v.passou || v.terceirizado) return;
    v.doisMotoristas = !!ligar;
    v.motorista2 = ''; v.fixado2 = false; v.esperando2 = false; v.soltoAviso2 = false;
    // Só o lugar novo recebe o próximo livre da ordem; as outras viagens ficam como estão.
    if (ligar) { v.motorista2 = escFProximoLivre(v); v.esperando2 = !v.motorista2; }
    escFRenderViagens();
  }

  // Próximo da ordem da escala que ainda não está em nenhuma viagem do mesmo dia ('' se todos estão).
  function escFProximoLivre(v) {
    const usados = {};
    estadoEscF.viagens.forEach(function (x) {
      if (x.data !== v.data) return;
      if (x.motorista) usados[x.motorista.toUpperCase()] = true;
      if (x.motorista2) usados[x.motorista2.toUpperCase()] = true;
    });
    const f = escFFila();
    for (let k = 0; f.length > k; k++) if (!usados[f[k].nome.toUpperCase()]) return f[k].nome;
    return '';
  }

  // Tira `nome` de qualquer outro lugar do mesmo dia (1º ou 2º de outra viagem, ou o outro posto desta), e o
  // lugar que ele deixou fica vazio esperando a escolha do operador — a mesma regra do 1º motorista.
  function escFLiberarNome(v, nome, posto) {
    const N = nome.toUpperCase();
    estadoEscF.viagens.forEach(function (x) {
      if (x.passou || x.data !== v.data) return;
      if ((x !== v || posto === 2) && (x.motorista || '').toUpperCase() === N) {
        x.motorista = ''; x.esperando = true; x.fixado = false; x.soltoAviso = false;
      }
      if ((x !== v || posto === 1) && (x.motorista2 || '').toUpperCase() === N) {
        x.motorista2 = ''; x.esperando2 = true; x.fixado2 = false; x.soltoAviso2 = false;
      }
    });
  }

  function escFEscolherMotorista2(i, nome) {
    const v = estadoEscF.viagens[i];
    if (!v || v.passou || !nome || !v.doisMotoristas) { escFRenderViagens(); return; }
    escFLiberarNome(v, nome, 2);
    v.motorista2 = nome; v.esperando2 = false; v.soltoAviso2 = false;   // não fixa: só o cadeado fixa
    escFRenderViagens();
  }

  // ---- Escolher motorista e veículo (10/11/2026) ---------------------------------------------------------
  // 📌 Regras combinadas com o Hélio:
  //  - quem já está em OUTRA viagem do mesmo dia sai de lá, e aquela fica SEM MOTORISTA até a escolha;
  //  - terceirizado no quadro dos servidores: a viagem vai para os terceirizados, com o carro DELE;
  //  - servidor numa viagem de terceirizado: volta para os servidores e pede um carro da prefeitura;
  //  - a fila dos servidores se ajusta pela regra de sempre (escFDistribuirPuro); escolhido à mão fica fixado.
  function escFEscolherMotorista(i, nome) {
    const v = estadoEscF.viagens[i];
    if (!v || v.passou || !nome) { escFRenderViagens(); return; }
    const t = estadoEscF.terceirizados.filter(function (x) { return x.nome === nome; })[0];
    if (t) {
      if (!t.placaVinculada) { toast(nome + ' não tem carro cadastrado: não pode ser escolhido.', 'aviso'); escFRenderViagens(); return; }
      const lot = t.lotacaoVeiculo || 4, precisa = (v.ocupados || 0) + (v.bloqueados || 0);
      if (precisa > lot) {
        toast('O carro de ' + nome + ' leva ' + lot + ' e esta viagem tem ' + precisa + '. Faltam ' + (precisa - lot) + ' lugar(es).', 'aviso');
        escFRenderViagens(); return;
      }
    }
    estadoEscF.viagens.forEach(function (x) {
      if (x === v || x.passou || x.data !== v.data) return;
      if ((x.motorista || '').toUpperCase() !== nome.toUpperCase()) return;
      x.motorista = ''; x.esperando = true; x.fixado = false; x.soltoAviso = false;
      if (t) { x.terceirizado = false; x.placa = ''; x.tipo = ''; }   // o carro era dele: foi junto
    });
    if (!t) escFLiberarNome(v, nome, 1);   // dois motoristas (11/11): se era o 2º de alguma viagem, sai de lá
    v.motorista = nome; v.esperando = false; v.soltoAviso = false;
    if (t) {
      v.terceirizado = true; v.placa = t.placaVinculada; v.tipo = t.tipoVeiculo || ''; v.fixado = false;
      v.doisMotoristas = false; v.motorista2 = ''; v.fixado2 = false; v.esperando2 = false;   // terceirizado: um só
    }
    else if (v.terceirizado) { v.terceirizado = false; v.placa = ''; v.tipo = ''; }
    // 🔓 Escolher à mão NÃO fixa (11/11/2026): só o cadeado fixa. O nome fica até a ordem da escala mudar; aí,
    // com o cadeado aberto, a viagem volta a seguir a ordem. Por isso aqui só redesenha, sem redistribuir.
    escFRenderViagens();
  }

  function escFEscolherVeiculo(i, placa) {
    const v = estadoEscF.viagens[i];
    if (!v || v.passou || !placa) { escFRenderViagens(); return; }
    const c = estadoEscF.veiculos.filter(function (x) { return x.placa === placa; })[0];
    const lot = (c && c.lotacao) || 4, precisa = (v.ocupados || 0) + (v.bloqueados || 0);
    if (precisa > lot) {
      toast((c ? c.tipo + ' ' : '') + placa + ' leva ' + lot + ' e esta viagem tem ' + precisa + '. Faltam ' + (precisa - lot) + ' lugar(es).', 'aviso');
      escFRenderViagens(); return;
    }
    v.placa = placa; v.tipo = c ? c.tipo : v.tipo;
    escFRenderViagens();
  }

  let escFIdx = null;
  function escFDragStart(ev, i) {
    escFIdx = i;
    ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', String(i)); } catch (e) {}
    ev.currentTarget.classList.add('arrastando');
  }
  function escFDragOver(ev) {
    if (escFIdx === null) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    ev.currentTarget.classList.add('alvo');
  }
  function escFDragLeave(ev) { ev.currentTarget.classList.remove('alvo'); }
  function escFDrop(ev, i) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('alvo');
    // ⚠️ Os índices vêm da fila FILTRADA, mas a reordenação acontece na lista completa —
    // por isso a conversão por NOME. Mover pelo índice direto embaralharia os ausentes,
    // que estão guardados no meio da lista sem aparecer na tela.
    if (escFIdx !== null && escFIdx !== i) {
      const fila = escFFila();
      const nomeDe = fila[escFIdx] ? fila[escFIdx].nome : '';
      const nomePara = fila[i] ? fila[i].nome : '';
      if (nomeDe && nomePara) {
        let de = -1, para = -1;
        estadoEscF.ordem.forEach(function (m, k) {
          if (m.nome === nomeDe) de = k;
          if (m.nome === nomePara) para = k;
        });
        if (de > -1 && para > -1) {
          const item = estadoEscF.ordem.splice(de, 1)[0];
          let destino = -1;
          estadoEscF.ordem.forEach(function (m, k) { if (m.nome === nomePara) destino = k; });
          estadoEscF.ordem.splice(de > para ? destino : destino + 1, 0, item);
          escFRenderOrdem();
        }
      }
    }
    escFIdx = null;
  }
  function escFDragEnd() {
    escFIdx = null;
    const sujos = document.querySelectorAll('.escf-ord-item.arrastando, .escf-ord-item.alvo');
    for (let k = 0; sujos.length > k; k++) sujos[k].classList.remove('arrastando', 'alvo');
  }

  function escFDica() {
    const d = document.getElementById('escFDica');
    if (!d) return;
    // Barra de baixo (11/11/2026): quantas mudanças faltam gravar. E as observações seguem o que está marcado.
    const pend = document.getElementById('escPend');
    const nPend = escPendencias();
    if (pend) {
      pend.style.display = nPend ? '' : 'none';
      pend.innerHTML = '<i class="ti ti-pencil"></i>' + nPend + (nPend === 1 ? ' mudança não gravada' : ' mudanças não gravadas');
    }
    escRenderObservacoes();
    const fora = escFAusentes().length;
    const vs = estadoEscF.viagens || [];
    // Sem motorista, e EM QUE DIA — num período, "2 sem motorista" não diz onde olhar.
    let semMot = 0;
    const diasSem = [];
    vs.forEach(function (v) {
      if (v.motorista) return;
      semMot++;
      const dd = (v.data || '').slice(0, 5);
      if (dd && diasSem.indexOf(dd) === -1) diasSem.push(dd);
    });
    const multi = vs.some(function (v) { return v.data !== vs[0].data; });
    const semVei = vs.filter(function (v) { return !v.passou && !v.terceirizado && !v.placa; }).length;
    const sem2 = vs.filter(function (v) { return !v.passou && v.doisMotoristas && !v.motorista2; }).length;   // 11/11
    const btnOk = document.getElementById('escFOk');
    if (btnOk) btnOk.disabled = semVei > 0;
    d.textContent = escFFila().length + ' na fila'
      + (vs.length > 0
          ? ' · ' + vs.length + ' viagem(ns)'
            + (semMot > 0 ? ', ' + semMot + ' sem motorista' + (multi && diasSem.length ? ' (' + diasSem.join(', ') + ')' : '') : '')
          : '')
      + (sem2 > 0 ? ' · ' + sem2 + ' sem 2º motorista' : '')
      + (fora > 0 ? ' · ' + fora + ' servidor(es) fora hoje' : '')
      + (semVei > 0 ? ' · ' + semVei + ' viagem(ns) sem veículo: escolha o carro para gravar' : '');
  }

  // Antes de gravar, um resumo do que muda em cada viagem (10/11/2026). Mostra também as viagens sem motorista e
  // o mesmo carro em duas viagens do dia (permitido, como no bate-volta, mas vale conferir os horários).
  function escFResumoHTML() {
    const itens = [];
    estadoEscF.viagens.forEach(function (v) {
      if (v.passou) return;
      const m = [];
      if (v.motorista !== v.motoristaOriginal) m.push('motorista ' + (v.motoristaOriginal || '(sem)') + ' → ' + (v.motorista || '(sem motorista)'));
      if (v.placa !== v.placaOriginal) m.push('carro ' + v.placaOriginal + ' → ' + (v.placa || '(sem)'));
      // Dois motoristas (11/11/2026)
      if (v.doisMotoristas !== v.doisOriginal) m.push(v.doisMotoristas ? 'passa a ter dois motoristas' : 'volta a ter um motorista só');
      if (v.doisMotoristas && v.motorista2 !== v.motorista2Original) m.push('2º motorista ' + (v.motorista2Original || '(sem)') + ' → ' + (v.motorista2 || '(sem 2º motorista)'));
      const mesmoCarro = estadoEscF.viagens.filter(function (x) {
        return x !== v && x.data === v.data && x.placa && x.placa === v.placa;
      }).map(function (x) { return x.hora || '--:--'; });
      if (!m.length && v.motorista) return;
      itens.push('<li' + (v.motorista ? '' : ' style="color:var(--ds-perigo-texto);font-weight:700"') + '>'
        + escEsc((v.data && estadoEscF.contexto && (estadoEscF.contexto.dias || []).length > 1 ? v.data.slice(0, 5) + ' ' : '')
                 + (v.hora || '--:--') + ' ' + (v.destino || '') + ': ' + (m.length ? m.join(' · ') : 'sem motorista'))
        + (mesmoCarro.length && v.placa !== v.placaOriginal ? '<br><span style="color:var(--ds-atencao-texto)">o mesmo carro também sai às ' + escEsc(mesmoCarro.join(', ')) + '</span>' : '')
        + '</li>');
    });
    return itens.length
      ? '<p style="margin:0 0 8px">Só o motorista e o carro mudam. Passageiros, horários, embarques e confirmações ficam como estão.</p><ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px">' + itens.join('') + '</ul>'
      : '<p style="margin:0">Nenhuma viagem muda de motorista ou de carro: grava a fila e as ausências.</p>';
  }

  function escFGravar() {
    const data = document.getElementById('escFData').value;
    if (!data) { toast('Escolha a data.', 'erro'); return; }
    const semVei = estadoEscF.viagens.filter(function (v) { return !v.passou && !v.terceirizado && !v.placa; });
    if (semVei.length) { toast('Escolha o carro de ' + semVei.length + ' viagem(ns) antes de gravar.', 'aviso'); return; }
    dsConfirmar({ titulo: 'Confira antes de gravar', corpo: escFResumoHTML(), ok: '<i class="ti ti-device-floppy"></i>Gravar escala',
                  aoConfirmar: function (fechar) { fechar(); escFGravarAgora(data); } });
  }

  function escFGravarAgora(data) {

    const motoristas = [], veiculos = [];
    // A posição gravada é numerada 1..N sobre a fila SEM os ausentes — a planilha guarda
    // a sequência de quem de fato roda hoje, não os buracos.
    const fila = escFFila();
    const posDe = function (nome) {
      let p = '';
      fila.forEach(function (m, i) { if (m.nome === nome) p = i + 1; });
      return p;
    };

    // A observação só viaja quando o item está FORA. Presente marcado não tem o que observar,
    // e mandar texto de um campo escondido guardaria motivo de ausência em quem está presente.
    const obsDe = function (c) {
      const el = c.closest('.escf-item').querySelector('.escf-obs');
      return (el && el.value ? el.value : '').trim();
    };

    document.querySelectorAll('.escf-chk-serv').forEach(function (c) {
      const fora = c.checked;
      const mot = c.closest('.escf-item').querySelector('select').value;
      motoristas.push({ data: data, nome: c.value, vinculo: 'Servidor',
                        condicao: fora ? 'Ausente' : 'Disponível',
                        motivo: fora ? mot : '', posicao: fora ? '' : posDe(c.value),
                        observacao: fora ? obsDe(c) : '' });
    });
    document.querySelectorAll('.escf-chk-terc').forEach(function (c) {
      const fora = c.checked;
      const mot = fora ? c.closest('.escf-item').querySelector('select').value : '';
      const obs = fora ? obsDe(c) : '';
      motoristas.push({ data: data, nome: c.value, vinculo: 'Terceirizado',
                        condicao: fora ? 'Ausente' : 'Disponível', motivo: mot, posicao: '',
                        observacao: obs });
      // O veículo do terceirizado acompanha o motorista: sem ele, o carro não roda.
      // A observação vai junto pelo mesmo motivo — quem lê o carro parado quer saber por quê.
      veiculos.push({ data: data, placa: c.getAttribute('data-placa') || '',
                      propriedade: 'Terceirizado',
                      condicao: fora ? 'Indisponível' : 'Disponível', motivo: mot,
                      observacao: obs });
    });
    document.querySelectorAll('.escf-chk-vei').forEach(function (c) {
      const fora = c.checked;
      const mot = c.closest('.escf-item').querySelector('select').value;
      veiculos.push({ data: data, placa: c.value, propriedade: 'Público',
                      condicao: fora ? 'Indisponível' : 'Disponível', motivo: fora ? mot : '',
                      observacao: fora ? obsDe(c) : '' });
    });

    const btn = document.getElementById('escFOk');
    btn.disabled = true;
    document.getElementById('escFDica').textContent = 'Gravando...';

    // Duas etapas, nesta ordem: primeiro a FILA, depois a ATRIBUIÇÃO. Se a segunda
    // falhar, a fila fica gravada e o operador reabre e tenta de novo — o contrário
    // deixaria motorista atribuído a viagem sem escala por trás.
    // Cada par leva a DATA do carro (11/09): o período pode ter vários dias. Dia que já passou
    // não vai — o motorista dele está travado e não mudou.
    // Desde 10/11/2026 vão TODAS as viagens que ainda não passaram (servidores e terceirizados): a Formação troca
    // motorista e carro. Cada uma leva como a tela a leu, para o servidor não gravar por cima de outro operador.
    const pares = estadoEscF.viagens
      .filter(function (v) { return !v.passou; })
      .map(function (v) {
        return { data: v.data || '', idViagem: v.idViagem || '', hora: v.hora || '', destino: v.destino || '',
                 placaLida: v.placaOriginal || '', motoristaLido: v.motoristaOriginal || '',
                 placa: v.placa || '', motorista: v.motorista || '', fixado: !!v.fixado && !v.terceirizado,
                 // Dois motoristas (11/11/2026): a marca, o 2º, como a tela o leu, e se ficou fixado.
                 doisMotoristas: !!v.doisMotoristas && !v.terceirizado,
                 motorista2: (v.doisMotoristas && !v.terceirizado) ? (v.motorista2 || '') : '',
                 motorista2Lido: v.motorista2Original || '',
                 fixado2: !!v.fixado2 && !!v.doisMotoristas && !v.terceirizado };
      });

    chamarServidor('salvarNovaArquitetura', [{ motoristas: motoristas, veiculos: veiculos }], function (resEsc) {
        // Onde a escala foi escrita — num período, o operador precisa ver que o domingo foi junto.
        const datasGr = (resEsc && resEsc.datas) ? resEsc.datas : [];
        const onde = datasGr.length > 1
          ? ' para ' + datasGr.map(function (x) { return x.slice(0, 5); }).join(', ') : '';
        if (pares.length === 0) {
          btn.disabled = false;
          toast('Escala gravada' + onde + '.', 'ok');
          escCarregarTudo();
          return;
        }
        chamarServidor('salvarViagensDaFormacao', [data, pares], function (res) {
            btn.disabled = false;
            toast('Escala gravada' + onde + '. ' + (res && res.alterados ? res.alterados : 0)
                + ' viagem(ns) com motorista ou carro novo.', 'ok');
            if (res && res.recusadas && res.recusadas.length) {
              toast('Não gravadas:<br>' + res.recusadas.map(escEsc).join('<br>'), 'aviso');
            }
            if (typeof atualizarBadgeKanban === 'function') atualizarBadgeKanban();
            escCarregarTudo();
          }, function (e) {
            btn.disabled = false;
            document.getElementById('escFDica').textContent = 'Fila gravada, atribuição não.';
            toast('A fila foi gravada, mas a atribuição falhou: '
                + ((e && e.message) ? e.message : e), 'erro');
          });
      }, function (e) {
        btn.disabled = false;
        document.getElementById('escFDica').textContent = 'Não gravou.';
        toast('Falha ao gravar: ' + ((e && e.message) ? e.message : e), 'erro');
      });
  }

  window.__VERSOES = window.__VERSOES || {}; window.__VERSOES.escala = '11/11g';
