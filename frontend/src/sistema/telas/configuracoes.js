// Estado local
  let dbConfig = { veiculos: [], motoristas: [], locais: [], calendario: [] };
  let estadoModal = { tipo: '', acao: '', oldKey: null };
  let configCarregada = false;

  function mudarSubAba3(secao) {
    document.querySelectorAll('#aba3 .ds-aba').forEach(function(btn) {
      btn.classList.remove('ativa');
    });
    event.currentTarget.classList.add('ativa');
    
    document.querySelectorAll('.aba3-section').forEach(function(sec) {
      sec.classList.remove('ativo');
    });
    document.getElementById('sec-' + secao).classList.add('ativo');
    if (secao === 'padronizacao') aba3PadCarregar(false);   // lista própria, carregada só quando a sub-aba abre
    
    // Se for a primeira vez, carrega os dados
    if (!configCarregada) carregarAba3();
  }

  // Hook chamado pelo Index ao ENTRAR na aba (mesma convenção de iniciarAba2/
  // iniciarGuia/iniciarKanban...). A trava fica aqui, e não dentro de
  // carregarAba3(), porque ela também é chamada após salvar — ali o recarregamento
  // é obrigatório.
  function iniciarAba3() {
    if (!configCarregada) carregarAba3();
  }

  // Carrega (ou recarrega) os cadastros do backend
  // `depois` (opcional, 10/11/2026): o que fazer com os cadastros já recarregados — é o caminho de volta
  // do carro cadastrado pelo "+" do motorista ou pela reposição.
  function carregarAba3(depois) {
    configCarregada = true;
    toast('Carregando configurações...', 'info');
    
    chamarServidor('getConfigData', [], function(res) {
        dbConfig = res;
        renderizarTabela('veiculos');
        renderizarTabela('motoristas');
        renderizarTabela('locais');
        renderCalendario();
        if (typeof depois === 'function') depois();
      }, function(err) {
        console.error(err);
        toast("Erro ao carregar banco de configurações.", "erro");
        configCarregada = false;
      });
  }

  function renderizarTabela(tipo) {
    const tbody = document.getElementById('tbody-' + tipo);
    const todos = dbConfig[tipo] || [];
    const ehBaixado = function (i) { return (i.motivo || '') === ABA3_BAIXA; };
    const ativos = todos.filter(function (i) { return !ehBaixado(i); });
    const baixados = todos.filter(ehBaixado);

    // Controle no CABEÇALHO, não no rodapé: clicar embaixo e ter de rolar de volta para
    // cima para ver o que reapareceu era péssimo.
    // Os baixados voltam na POSIÇÃO ORIGINAL, não empilhados no fim nem no topo: assim a
    // lista não salta ao alternar e cada item continua onde o operador espera achá-lo.
    // O que os distingue é a linha listrada e riscada, não a posição.
    const slot = document.getElementById('baixados-' + tipo);
    if (slot) {
      slot.innerHTML = baixados.length === 0 ? '' :
        '<button class="ds-btn ds-btn--fantasma ds-btn--sm' + (aba3MostrarBaixados ? ' ativo' : '') + '" onclick="aba3ToggleBaixados()">'
        + '<i class="ti ti-' + (aba3MostrarBaixados ? 'eye-off' : 'eye') + '"></i> '
        + (aba3MostrarBaixados ? 'Ocultar' : 'Mostrar') + ' ' + baixados.length + ' com baixa</button>';
    }

    const dados = aba3MostrarBaixados ? todos : ativos;

    if (dados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="aba3-loading">Nenhum registro encontrado.</td></tr>';
      return;
    }
    
    let html = '';
    dados.forEach(function(item) {
      const baixado = ehBaixado(item);
      // Só acusa "a pé" em motorista ativo: quem tem baixa não precisa de carro.
      const semCarro = (tipo === 'motoristas' && !baixado) ? aba3MotoristaSemCarro(item) : '';
      let tr = [];
      tr.push('<tr class="' + (baixado ? 'linha-baixada' : (semCarro ? 'linha-alerta' : '')) + '">');

      // A barra invertida é escapada antes da aspa: senão um nome terminado em barra fecharia a string do onclick.
      const keyEscapada = (item._key || '').toString().replace(/\\/g, '\\\\').replace(/'/g, "\\'");

      // Situação editável na própria linha. O botão 🔄 saiu: com motivo no lugar de um
      // "Inativo" mudo, alternar às cegas não faz mais sentido.
      const chipStatus = aba3SelectSituacao(tipo, item, keyEscapada);

      const strAcoes =
        '<button class="ds-btn ds-btn--fantasma ds-btn--icone ds-btn--sm btn-acao" onclick="abrirModalConfig(\'' + tipo + '\', \'editar\', \'' + keyEscapada + '\')" title="Editar"><i class="ti ti-pencil"></i></button>'
        + (baixado
            ? '<button class="ds-btn ds-btn--fantasma ds-btn--icone ds-btn--sm btn-acao acao-voltar" onclick="aba3Baixa(\'' + tipo + '\', \'' + keyEscapada + '\', false)" title="Reverter a baixa"><i class="ti ti-arrow-back-up"></i></button>'
            : '<button class="ds-btn ds-btn--fantasma ds-btn--icone ds-btn--sm btn-acao acao-baixa" onclick="aba3Baixa(\'' + tipo + '\', \'' + keyEscapada + '\', true)" title="Dar baixa (sai da operação, histórico preservado)"><i class="ti ti-trash"></i></button>');

      if (tipo === 'veiculos') {
        tr.push('<td>' + (item.placa || '') + '</td>');
        tr.push('<td>' + (item.tipo || '') + '</td>');
        tr.push('<td>' + (item.assentos || '') + '</td>');
        tr.push('<td>' + (item.propriedade || '') + '</td>');
        tr.push('<td>' + chipStatus + '</td>');
        tr.push('<td class="ds-col-acoes">' + strAcoes + '</td>');
      } else if (tipo === 'motoristas') {
        tr.push('<td>' + (item.nome || '') + '</td>');
        tr.push('<td>' + (item.vinculo || '') + '</td>');
        tr.push('<td>' + (item.placaVinculada || '<span class="ds-vazio-traco">—</span>')
              + (semCarro ? '<div class="ds-chip ds-chip--perigo aba3-chip-linha"><i class="ti ti-car-off"></i> ' + escAba3(semCarro)
                          + ' · <b>precisa de reposição</b></div>' : '') + '</td>');
        tr.push('<td>' + (item.whatsapp || '') + '</td>');
        tr.push('<td>' + chipStatus + '</td>');
        tr.push('<td class="ds-col-acoes">' + strAcoes + '</td>');
      } else if (tipo === 'locais') {
        // 🔒 e ⭐ vêm resolvidos do servidor (getConfigData), que também os protege na
        // gravação — a tela só deixa de oferecer o que ele recusaria.
        const sistema = item.trava === 'sentinela';
        const ativo = !baixado && aba3SituacaoDe(item) === 'Ativo';
        const btnEditar = '<button class="ds-btn ds-btn--fantasma ds-btn--icone ds-btn--sm btn-acao" onclick="abrirModalConfig(\'locais\', \'editar\', \'' + keyEscapada + '\')" title="Editar"><i class="ti ti-pencil"></i></button>';
        tr.push('<td>' + escAba3(item.local || '')
              + (sistema ? '<span class="ds-chip aba3-chip-sistema" title="Não é um lugar: ao montar o carro, este texto vira o endereço de casa de cada paciente. Por isso não pode ser renomeado nem sair da lista."><i class="ti ti-lock"></i>do sistema</span>' : '')
              + '</td>');
        tr.push('<td>' + (item.padrao
              ? '<span class="ds-chip ds-chip--atencao" title="Já vem escolhido ao montar um carro em Viagens Externas"><i class="ti ti-star"></i>Padrão</span>'
              : ((ativo && !sistema) ? '<button class="ds-btn ds-btn--fantasma ds-btn--icone ds-btn--sm btn-acao acao-estrela" onclick="aba3DefinirPadraoLocal(\'' + keyEscapada + '\')" title="Tornar este o local padrão das saídas"><i class="ti ti-star"></i></button>' : ''))
              + '</td>');
        // O padrão e a opção do sistema não saem da lista: a situação deles não se escolhe.
        tr.push('<td>' + ((sistema || item.padrao)
              ? '<span class="ds-chip ds-chip--sucesso aba3-sit-fixa" title="' + (sistema ? 'Opção do sistema: sempre ativa.' : 'É o padrão das saídas: marque outro com a estrela antes de desativá-lo.') + '">Ativo</span>'
              : chipStatus) + '</td>');
        tr.push('<td class="ds-col-acoes">' + (sistema ? '' : (item.padrao ? btnEditar : strAcoes)) + '</td>');
      }
      
      tr.push('</tr>');
      html += tr.join('');
    });
    
    tbody.innerHTML = html;
  }

  // ---- CALENDÁRIO (Fase 3a) ------------------------------------------------------
  const ABA3_TIPOS_DIA = ['Feriado', 'Ponto facultativo', 'Recesso'];
  const ABA3_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  // 'DD/MM/AAAA' -> nome do dia da semana. Construído em UTC para não escorregar um dia.
  function aba3DiaSemana(dataBR) {
    const p = (dataBR || '').split('/');
    if (p.length !== 3) return '';
    const d = new Date(Date.UTC(+p[2], +p[1] - 1, +p[0]));
    return ABA3_SEMANA[d.getUTCDay()] || '';
  }

  function renderCalendario() {
    const tbody = document.getElementById('tbody-calendario');
    if (!tbody) return;
    const itens = dbConfig.calendario || [];
    if (itens.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="aba3-loading">Nenhum dia cadastrado. '
        + 'Sábado e domingo o sistema já reconhece pela data; aqui entram feriados, pontos '
        + 'facultativos e recessos — inclusive quando caem no fim de semana.</td></tr>';
      return;
    }
    // Quantos dias tem cada bloco, para a coluna dizer algo útil em vez de repetir o rótulo.
    const tamanho = {};
    itens.forEach(function (i) {
      if (i.bloco) tamanho[i.bloco] = (tamanho[i.bloco] || 0) + 1;
    });

    tbody.innerHTML = itens.map(function (i) {
      const k = escAba3(i.data);
      return '<tr>'
        + '<td><b>' + escAba3(i.data) + '</b></td>'
        + '<td class="ds-texto-2">' + aba3DiaSemana(i.data) + '</td>'
        + '<td>' + escAba3(i.tipo) + '</td>'
        + '<td>' + escAba3(i.descricao || '—') + '</td>'
        + '<td>' + (i.bloco
            ? '<span class="ds-chip ds-chip--marca">'
              + tamanho[i.bloco] + ' dia(s)</span>'
            : '<span class="ds-vazio-traco">—</span>') + '</td>'
        + '<td class="ds-col-acoes">'
        +   '<button class="ds-btn ds-btn--fantasma ds-btn--icone ds-btn--sm btn-acao" title="Editar" onclick="abrirModalCal(\'editar\', \'' + k + '\')">'
        +     '<i class="ti ti-pencil"></i></button> '
        +   '<button class="ds-btn ds-btn--fantasma ds-btn--icone ds-btn--sm btn-acao" title="Excluir" onclick="excluirCal(\'' + k + '\')">'
        +     '<i class="ti ti-trash"></i></button>'
        + '</td></tr>';
    }).join('');
  }

  // ---- IMPORTAR CALENDÁRIO DE UMA PUBLICAÇÃO ------------------------------------
  // O sistema PROPÕE; quem decide é o operador. Nada é gravado sem a conferência.
  let calImportados = [];

  function abrirModalImportar() {
    calImportados = [];
    document.getElementById('cal_imp_previa').innerHTML =
      '<div class="aba3-loading">Cole o endereço da publicação e clique em Analisar.</div>';
    document.getElementById('cal_imp_dica').textContent = '';
    document.getElementById('cal_imp_ok').disabled = true;
    dsAbrir('modalImportarCal');
  }

  function fecharModalImportar() {
    dsFechar('modalImportarCal');
  }

  function analisarImportacao() {
    const btn = document.getElementById('cal_imp_btn');
    const ano = parseInt(document.getElementById('cal_imp_ano').value, 10);
    if (!ano) { toast('Informe o ano.', 'erro'); return; }

    btn.innerText = 'Analisando...'; btn.disabled = true;
    document.getElementById('cal_imp_previa').innerHTML =
      '<div class="aba3-loading">Buscando e lendo a publicação...</div>';

    chamarServidor('previewCalendario', [{
        ano: ano,
        url: document.getElementById('cal_imp_url').value.trim(),
        texto: document.getElementById('cal_imp_texto').value.trim()
      }], function (res) {
        btn.innerText = 'Analisar'; btn.disabled = false;
        // Devolve o texto para a área: se a leitura vier torta, o operador vê a fonte e
        // pode corrigir à mão sem ter de buscar de novo.
        if (res.texto) {
          const ta = document.getElementById('cal_imp_texto');
          if (!ta.value.trim()) ta.value = res.texto.replace(/<[^>]+>/g, ' ')
                                                    .replace(/[ \t]+/g, ' ').trim();
        }
        calImportados = res.itens || [];
        renderPreviaImportacao();
      }, function (e) {
        btn.innerText = 'Analisar'; btn.disabled = false;
        document.getElementById('cal_imp_previa').innerHTML =
          '<div class="aba3-loading">' + escAba3((e && e.message) ? e.message : e) + '</div>';
      });
  }

  function renderPreviaImportacao() {
    const alvo = document.getElementById('cal_imp_previa');
    if (calImportados.length === 0) {
      alvo.innerHTML = '<div class="aba3-loading">Nenhuma data reconhecida. '
        + 'Confira o endereço, ou cole o texto da tabela no campo acima.</div>';
      document.getElementById('cal_imp_ok').disabled = true;
      return;
    }

    let linhas = '';
    calImportados.forEach(function (it, i) {
      const n = (it.dias || []).length;
      const conf = (it.conflitos || []).length;
      const periodo = n > 1 ? (it.dias[0] + ' a ' + it.dias[n - 1]) : (it.dias[0] || '');
      const semana = n === 1 ? aba3DiaSemana(it.dias[0]) : (n + ' dias');
      // ⚠️ O que já existe vem DESMARCADO: reimportar não pode sobrescrever em silêncio
      // um dia que o operador já ajustou à mão.
      const marcado = conf === 0 ? ' checked' : '';
      linhas += '<tr' + (conf > 0 ? ' class="aba3-conflito"' : '') + '>'
        + '<td><input type="checkbox" class="cal-imp-chk" data-i="' + i + '"' + marcado
        +   ' onchange="atualizarDicaImportacao()"></td>'
        + '<td><b>' + escAba3(periodo) + '</b></td>'
        + '<td class="ds-texto-2">' + escAba3(semana) + '</td>'
        + '<td><select class="ds-select cal-imp-tipo" data-i="' + i + '">'
        +   ABA3_TIPOS_DIA.map(function (t) {
              return '<option' + (t === it.tipo ? ' selected' : '') + '>' + t + '</option>';
            }).join('')
        + '</select></td>'
        + '<td>' + escAba3(it.descricao || '') + '</td>'
        + '<td class="ds-ajuda ds-ajuda--erro">'
        +   (conf > 0 ? 'já cadastrado: ' + escAba3(it.conflitos.join(', ')) : '')
        + '</td></tr>';
    });

    alvo.innerHTML = '<table class="ds-tabela"><thead><tr>'
      + '<th style="width:34px"></th><th>Período</th><th>Dia</th><th>Tipo</th>'
      + '<th>Descrição</th><th>Situação</th></tr></thead><tbody>' + linhas + '</tbody></table>';
    atualizarDicaImportacao();
  }

  function atualizarDicaImportacao() {
    let itens = 0, dias = 0;
    document.querySelectorAll('.cal-imp-chk').forEach(function (c) {
      if (!c.checked) return;
      itens++;
      dias += (calImportados[+c.dataset.i].dias || []).length;
    });
    document.getElementById('cal_imp_dica').textContent =
      itens + ' de ' + calImportados.length + ' selecionado(s) · ' + dias + ' dia(s)';
    document.getElementById('cal_imp_ok').disabled = itens === 0;
  }

  function confirmarImportacao() {
    const escolhidos = [];
    document.querySelectorAll('.cal-imp-chk').forEach(function (c) {
      if (!c.checked) return;
      const i = +c.dataset.i;
      const sel = document.querySelector('.cal-imp-tipo[data-i="' + i + '"]');
      escolhidos.push({
        inicio: calImportados[i].inicio,
        fim: calImportados[i].fim,
        tipo: sel ? sel.value : calImportados[i].tipo,
        descricao: calImportados[i].descricao
      });
    });
    if (escolhidos.length === 0) return;

    const btn = document.getElementById('cal_imp_ok');
    btn.innerText = 'Importando...'; btn.disabled = true;

    chamarServidor('importarCalendario', [escolhidos], function (res) {
        btn.innerText = 'Importar selecionados'; btn.disabled = false;
        fecharModalImportar();
        configCarregada = false;
        carregarAba3();
        if (res.erros && res.erros.length > 0) {
          toast(res.gravados + ' gravado(s), ' + res.erros.length + ' recusado(s): '
              + res.erros[0], 'aviso');
        } else {
          toast(res.gravados + ' registro(s) importado(s).', 'sucesso');
        }
      }, function (e) {
        btn.innerText = 'Importar selecionados'; btn.disabled = false;
        toast((e && e.message) ? e.message : 'Erro ao importar.', 'erro');
      });
  }

  let estadoCal = { acao: 'novo', key: '' };

  function abrirModalCal(acao, key) {
    estadoCal = { acao: acao, key: key || '' };
    const item = (dbConfig.calendario || []).filter(function (i) {
      return i.data === key;
    })[0] || {};
    const editando = acao === 'editar';


    const html = [];
    if (editando) {
      // A DATA não se edita: mudar o dia de uma linha de bloco deixaria a sequência com
      // um dia solto fora dela. Para mudar o dia, exclui e cadastra de novo.
      html.push('<div class="ds-campo"><span class="ds-rotulo">Data</span>'
        + '<div class="ds-forte">' + escAba3(item.data) + ' · '
        + aba3DiaSemana(item.data) + '</div></div>');
    } else {
      html.push(gerarInput('Data inicial', 'f_cal_ini', '', 'date'));
      html.push(gerarInput('Data final (deixe igual para um dia só)', 'f_cal_fim', '', 'date'));
    }
    html.push(gerarSelect('Tipo', 'f_cal_tipo', ABA3_TIPOS_DIA, item.tipo || 'Feriado'));
    html.push(gerarInput('Descrição (ex: Natal, Corpus Christi)', 'f_cal_desc',
                         item.descricao || ''));

    document.getElementById('modalConfigTitle').innerText =
      editando ? 'Editar dia do calendário' : 'Novo dia no calendário';
    document.getElementById('modalConfigForm').innerHTML = html.join('');
    document.getElementById('btnSalvarConfig').setAttribute('onclick', 'salvarCalForm()');
    dsAbrir('modalConfig');

    if (!editando) {
      // Data final acompanha a inicial enquanto o operador não mexer nela — o caso comum
      // é feriado de um dia só, e obrigar a preencher duas vezes é atrito à toa.
      const ini = document.getElementById('f_cal_ini');
      const fim = document.getElementById('f_cal_fim');
      ini.addEventListener('change', function () {
        if (!fim.value || ini.value > fim.value) fim.value = ini.value;
      });
    }
  }

  function salvarCalForm() {
    const btn = document.getElementById('btnSalvarConfig');
    const payload = {
      tipo: document.getElementById('f_cal_tipo').value,
      descricao: document.getElementById('f_cal_desc').value.trim()
    };
    if (estadoCal.acao === 'novo') {
      payload.dataInicio = document.getElementById('f_cal_ini').value;
      payload.dataFim = document.getElementById('f_cal_fim').value || payload.dataInicio;
      if (!payload.dataInicio) { toast('Informe a data.', 'erro'); return; }
    }
    btn.innerText = 'Salvando...'; btn.disabled = true;

    chamarServidor('salvarCalendario', [estadoCal.acao, payload, estadoCal.key], function () {
        toast('Salvo com sucesso!', 'sucesso');
        fecharModalConfig();
        configCarregada = false;
        carregarAba3();
        btn.innerText = 'Salvar'; btn.disabled = false;
      }, function (e) {
        btn.innerText = 'Salvar'; btn.disabled = false;
        toast((e && e.message) ? e.message : 'Erro ao salvar.', 'erro');
      });
  }

  function excluirCal(key) {
    const item = (dbConfig.calendario || []).filter(function (i) { return i.data === key; })[0];
    if (!item) return;
    const nBloco = item.bloco
      ? (dbConfig.calendario || []).filter(function (i) { return i.bloco === item.bloco; }).length
      : 0;

    // ⚠️ Reusa o modalBaixaAba3 em vez de confirm() nativo — o arquivo já avisava disso e
    // eu escorreguei: dentro do iframe do Apps Script o navegador prefixa o alerta com
    // "Uma página incorporada em n-...googleusercontent.com diz", que assusta e polui.
    document.getElementById('modalBaixaTitulo').innerHTML =
      '<i class="ti ti-trash"></i> Excluir do calendário';
    // ⚠️ O diálogo diz o que VAI ACONTECER e com quais dias — não POR QUE o sistema faz
    // assim. A justificativa (bloco com buraco quebra a regra da escala) é decisão de
    // projeto: mora no comentário e no docs/DECISOES.md, não na cara de quem está
    // decidindo se apaga.
    const doBloco = (dbConfig.calendario || [])
      .filter(function (i) { return item.bloco && i.bloco === item.bloco; })
      .map(function (i) { return i.data; });

    document.getElementById('modalBaixaTexto').innerHTML =
      nBloco > 1
        ? 'O dia <b>' + escAba3(key) + '</b> faz parte de um bloco de <b>' + nBloco
          + ' dias</b>, e o bloco todo será excluído:'
          + '<div class="ds-faixa ds-faixa--perigo" style="margin-top:12px;"><span>'
          + escAba3(doBloco.join(' · ')) + '</span></div>'
          + '<div class="ds-ajuda" style="margin-top:10px;">'
          + 'Esses dias voltam a ser tratados como dias úteis.</div>'
        : 'Excluir <b>' + escAba3(key) + '</b> do calendário?'
          + '<div class="ds-ajuda" style="margin-top:10px;">'
          + 'Este dia volta a ser tratado como dia útil.</div>';

    document.getElementById('btnConfirmarBaixa').onclick = function () {
      fecharModalBaixa();
      excluirCalConfirmado(key);
    };
    dsAbrir('modalBaixaAba3');
  }

  function excluirCalConfirmado(key) {
    chamarServidor('salvarCalendario', ['excluir', {}, key], function () {
        toast('Excluído.', 'sucesso');
        configCarregada = false;
        carregarAba3();
      }, function (e) {
        toast((e && e.message) ? e.message : 'Erro ao excluir.', 'erro');
      });
  }

  // Redesenha as TRÊS tabelas. As abas não são independentes: a situação de um veículo
  // decide se o motorista terceirizado dele aparece "a pé". Redesenhar só a tabela que
  // mudou deixava a de motoristas velha até o F5 — a versão antiga não tinha esse bug
  // por acidente, porque recarregava tudo do servidor a cada clique.
  // Custa quase nada: é só DOM, a partir de dados que já estão na memória.
  function aba3RenderTudo() {
    ['veiculos', 'motoristas', 'locais'].forEach(renderizarTabela);
    renderCalendario();
  }

  function aba3ToggleBaixados() {
    aba3MostrarBaixados = !aba3MostrarBaixados;
    aba3RenderTudo();
  }

  // ===== Situação global (Fase 0 do redesenho) ================================
  // A disponibilidade de motorista e veículo passou a ser GLOBAL, definida aqui —
  // antes era declarada dia a dia na Aba 1. O gestor quer sempre o PORQUÊ, então
  // é um seletor único: 'Ativo' ou o motivo. Qualquer motivo => indisponível.
  // Quem transforma isso no par (Status, Motivo) é o backend, não esta tela.
  // Mesma lista de motivos que a Aba 1 já usava, para não inventar vocabulário novo.
  // 10/11/2026: "Não disponível" virou "Inativo" (pedido do Hélio), e o carro ganhou "Inativo" também.
  // Inativo é o que deixa de trabalhar por tempo indeterminado; os outros motivos são ausências com fim.
  const ABA3_MOTIVOS_MOTORISTA = ['Ativo', 'Afastado', 'Atestado', 'Faltou', 'Férias',
                                  'Folga', 'Licença', 'Inativo',
                                  'Manutenção do Veículo', 'Outros'];
  const ABA3_MOTIVOS_VEICULO   = ['Ativo', 'Alocado', 'Manutenção', 'Inativo', 'Outros'];
  const ABA3_INATIVO = 'Inativo';
  const ABA3_INATIVO_ANTIGO = 'Não disponível';   // gravado antes de 10/11; a tela mostra como Inativo
  const ABA3_MOTIVOS_LOCAL     = ['Ativo', 'Inativo']; // local não tem motivo, só liga/desliga

  // "Baixa" = saída DEFINITIVA da operação (carro devolvido, motorista desligado).
  // NÃO apaga a linha: `bd_viagens_alocadas` e as tabelas `fato_*` guardam placa e nome
  // como TEXTO, então excluir de verdade deixaria viagens antigas apontando para nada e
  // faria os relatórios do gestor mentirem. A linha fica, com status não-Ativo — o que
  // já a tira do `getDadosParaEscala` (que filtra `status === 'Ativo'`) e portanto da
  // frota dos próximos dias. É reversível.
  // ⚠️ Não entra nas listas de motivo acima de propósito: é ação de botão, não de select.
  const ABA3_BAIXA = 'Baixado';
  let aba3MostrarBaixados = false;

  function aba3SituacaoDe(item) {
    if (!item) return 'Ativo';
    if (item.motivo === ABA3_INATIVO_ANTIGO) return ABA3_INATIVO;
    if (item.motivo) return item.motivo;
    return (item.status || 'Ativo').toLowerCase() === 'ativo' ? 'Ativo' : 'Outros';
  }

  // ===== Vínculo terceirizado (Fase 0.1) ======================================
  // Regra do gestor: veículo terceirizado PODE existir sem motorista; motorista
  // terceirizado NÃO PODE existir sem veículo. Quando o carro vai para manutenção, a
  // empresa contratada é obrigada a pôr outro — cadastra-se o novo e revincula-se.
  function aba3VeiculosTerceirizados() {
    return (dbConfig.veiculos || []).filter(function (v) {
      return (v.propriedade || '').toString().trim() === 'Terceirizado'
          && (v.motivo || '') !== ABA3_BAIXA;
    });
  }

  // Motorista terceirizado está a pé? Devolve o motivo, ou '' se está tudo certo.
  // Serve para acusar na LINHA dele — sem isso o operador marca o carro em manutenção,
  // vê o toast passar, e depois não tem mais como saber quem ficou sem veículo.
  function aba3MotoristaSemCarro(item) {
    if ((item.vinculo || '') !== 'Terceirizado') return '';
    const placa = (item.placaVinculada || '').toString().trim();
    if (!placa) return 'sem veículo vinculado';
    const v = (dbConfig.veiculos || []).filter(function (x) {
      return (x.placa || '').toString().trim().toUpperCase() === placa.toUpperCase();
    })[0];
    if (!v) return 'veículo não cadastrado';
    if ((v.motivo || '') === ABA3_BAIXA) return 'veículo com baixa';
    if ((v.status || 'Ativo').toLowerCase() !== 'ativo') return 'veículo em ' + (v.motivo || 'indisponível');
    return '';
  }

  // Placa já usada por OUTRO motorista terceirizado (para marcar como ocupada).
  function aba3DonoDaPlaca(placa, exceto) {
    const p = (placa || '').toString().trim().toUpperCase();
    if (!p) return '';
    const m = (dbConfig.motoristas || []).filter(function (x) {
      return (x.vinculo || '') === 'Terceirizado'
          && (x.placaVinculada || '').toString().trim().toUpperCase() === p
          && (x._key || '') !== (exceto || '');
    })[0];
    return m ? m.nome : '';
  }

  function aba3CampoPlacaVinculada(item) {
    const atual = (item.placaVinculada || '').toString().trim();
    let html = '<div class="ds-campo" id="grupo_placav">'
             + '<label class="ds-rotulo" for="f_placav">Placa vinculada <span id="lbl_placav_obr" class="ds-obrig"></span></label>'
             + '<div style="display:flex;gap:8px;align-items:center;">'
             + '<select class="ds-select" id="f_placav" style="flex:1;"><option value="">— sem veículo —</option>';
    let achou = !atual;
    aba3VeiculosTerceirizados().forEach(function (v) {
      const pl = (v.placa || '').toString().trim();
      if (pl.toUpperCase() === atual.toUpperCase()) achou = true;
      const dono = aba3DonoDaPlaca(pl, item._key || '');
      const rot = pl + (v.tipo ? ' · ' + v.tipo : '') + (dono ? '  (com ' + dono + ')' : '');
      html += '<option value="' + pl + '"' + (pl.toUpperCase() === atual.toUpperCase() ? ' selected' : '') + '>' + rot + '</option>';
    });
    // Placa que está no cadastro mas não é terceirizada (ou foi baixada) não pode sumir
    // do select em silêncio — senão salvar o motorista apagaria o vínculo sem avisar.
    if (!achou) html += '<option value="' + atual + '" selected>' + atual + ' (fora da frota terceirizada)</option>';
    html += '</select>'
          + '<button type="button" class="ds-btn ds-btn--secundario ds-btn--icone" title="Cadastrar veículo terceirizado" '
          + 'onclick="aba3NovoVeiculoTerceirizado()"><i class="ti ti-plus"></i></button>'
          + '</div><div id="aviso_placav" class="ds-ajuda"></div></div>';
    return html;
  }

  // Ajusta obrigatoriedade e avisos conforme o vínculo escolhido.
  function aba3AtualizarVinculo() {
    const selVinc = document.getElementById('f_vinc');
    const selPlaca = document.getElementById('f_placav');
    const aviso = document.getElementById('aviso_placav');
    const obr = document.getElementById('lbl_placav_obr');
    if (!selVinc || !selPlaca || !aviso) return;

    const terc = selVinc.value === 'Terceirizado';
    if (obr) obr.textContent = terc ? '*' : '';
    // Servidor não tem placa vinculada (10/11/2026): ele dirige o carro público que a escala der. O campo
    // some, e a gravação manda a placa vazia (salvarConfigForm).
    document.getElementById('grupo_placav').style.display = terc ? '' : 'none';

    if (!terc) { aviso.innerHTML = ''; return; }
    if (!selPlaca.value) { aviso.innerHTML = '<span style="color:var(--ds-perigo-texto);">Motorista terceirizado precisa de um veículo vinculado.</span>'; return; }

    const dono = aba3DonoDaPlaca(selPlaca.value, estadoModal.oldKey || '');
    aviso.innerHTML = dono
      ? '<span style="color:var(--ds-atencao-texto);">Atenção: esta placa já está com <b>' + escAba3(dono) + '</b>. Salvar vai deixá-lo sem veículo.</span>'
      : '<span style="color:var(--ds-sucesso-texto);">Veículo livre.</span>';
  }

  // ===== Volta ao que se estava fazendo depois de cadastrar um carro (10/11/2026) ===================
  // A janela de cadastro é UMA só (modalConfig). O "+" do motorista trocava o formulário dele pelo do
  // carro e, ao salvar o carro, a janela fechava: o motorista digitado sumia sem ser gravado. Agora o
  // rascunho fica guardado aqui e volta preenchido, com o carro novo já escolhido.
  //   { tipo: 'formMotorista', rascunho: {...} }  — veio do "+" do cadastro do motorista
  //   { tipo: 'vincular', motorista: 'Nome' }       — veio da reposição, depois de inativar só o carro
  let aba3Retorno = null;

  // Atalho: cadastra o veículo terceirizado sem perder o cadastro do motorista.
  function aba3NovoVeiculoTerceirizado() {
    const val = function (id) { const el = document.getElementById(id); return el ? el.value : ''; };
    const rascunho = {
      acao: estadoModal.acao, oldKey: estadoModal.oldKey,
      nome: val('f_nome'), vinculo: val('f_vinc'), whatsapp: val('f_wpp'), situacao: val('f_situacao')
    };
    abrirModalConfig('veiculos', 'novo');
    aba3Retorno = { tipo: 'formMotorista', rascunho: rascunho };
    const prop = document.getElementById('f_prop');
    if (prop) prop.value = 'Terceirizado';
    toast('Cadastre o veículo. Ao salvar, o cadastro do motorista volta com ele escolhido.', 'info');
  }

  // Reabre o cadastro do motorista com o que estava digitado e, se veio, o carro novo escolhido.
  function aba3VoltarAoMotorista(rascunho, placaNova) {
    abrirModalConfig('motoristas', rascunho.acao || 'novo', rascunho.oldKey || undefined);
    const por = function (id, v) { const el = document.getElementById(id); if (el && v != null) el.value = v; };
    por('f_nome', rascunho.nome);
    por('f_vinc', rascunho.vinculo || 'Terceirizado');
    por('f_wpp', rascunho.whatsapp);
    if (rascunho.situacao) por('f_situacao', rascunho.situacao);
    const sel = document.getElementById('f_placav');
    if (sel && placaNova) {
      const opt = Array.prototype.filter.call(sel.options, function (o) {
        return o.value.toUpperCase() === placaNova.toUpperCase();
      })[0];
      if (opt) sel.value = opt.value;
      else toast('O carro ' + escAba3(placaNova) + ' não é terceirizado e não pode ser vinculado.', 'aviso');
    }
    aba3AtualizarVinculo();
  }

  // Fechar o cadastro do carro SEM salvar (Cancelar, X, Esc) volta para onde se estava.
  // No caminho do Salvar, salvarConfigForm zera aba3Retorno antes de fechar, e isto não faz nada.
  function aba3ConfigAoFechar() {
    const r = aba3Retorno;
    aba3Retorno = null;
    if (!r) return;
    if (r.tipo === 'formMotorista') aba3VoltarAoMotorista(r.rascunho, '');
    else if (r.tipo === 'vincular') aba3AbrirRepor(r.motorista, '');
  }

  // Tipos distintos já cadastrados em bd_veiculos (col B), em ordem, + "Outro".
  function aba3TiposVeiculo(tipoAtual) {
    const vistos = {}, lista = [];
    (dbConfig.veiculos || []).forEach(function (v) {
      const t = (v.tipo || '').toString().trim();
      if (t && !vistos[t.toUpperCase()]) { vistos[t.toUpperCase()] = true; lista.push(t); }
    });
    lista.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    const atual = (tipoAtual || '').toString().trim();
    if (atual && !vistos[atual.toUpperCase()]) lista.unshift(atual);
    return lista.concat(['Outro']);
  }

  // Mostra o campo de digitação livre só quando "Outro" é escolhido.
  function aba3ToggleTipoOutro() {
    const sel = document.getElementById('f_tipo');
    const grupo = document.getElementById('grupo_tipo_outro');
    if (!sel || !grupo) return;
    grupo.style.display = sel.value === 'Outro' ? 'block' : 'none';
    if (sel.value === 'Outro') { const i = document.getElementById('f_tipo_outro'); if (i) i.focus(); }
  }

  // Select da situação renderizado DENTRO da linha da tabela.
  function aba3SelectSituacao(tipo, item, keyEscapada) {
    const atual = aba3SituacaoDe(item);
    const lista = (tipo === 'veiculos') ? ABA3_MOTIVOS_VEICULO
                : (tipo === 'locais')   ? ABA3_MOTIVOS_LOCAL
                : ABA3_MOTIVOS_MOTORISTA;
    // Motivo antigo que não está na lista (ex.: veio da Aba 1) não pode sumir do select
    const opts = lista.indexOf(atual) > -1 ? lista : lista.concat([atual]);
    const cls = atual === 'Ativo' ? 'ok' : 'nao';
    let html = '<select class="aba3-situacao ' + cls + '" onchange="aba3MudarSituacao(\'' + tipo + '\', \'' + keyEscapada + '\', this)">';
    opts.forEach(function (o) {
      html += '<option value="' + o + '"' + (o === atual ? ' selected' : '') + '>' + o + '</option>';
    });
    return html + '</select>';
  }

  // Dar baixa / reverter. Reverter é inofensivo e vai direto; dar baixa passa pelo modal.
  function aba3Baixa(tipo, key, dar) {
    if (!dar) { aba3GravarBaixa(tipo, key, false); return; }

    const oQue = tipo === 'veiculos' ? 'o veículo' : (tipo === 'motoristas' ? 'o motorista' : 'o local');
    document.getElementById('modalBaixaTexto').innerHTML =
        'Dar baixa em <b>' + escAba3(key) + '</b>?'
      + '<div class="ds-faixa ds-faixa--info" style="margin-top:12px;"><span>'
      + '<b>O que acontece:</b> ' + oQue + ' sai da operação e das listas a partir de agora.<br>'
      + '<b>O que NÃO acontece:</b> nada é apagado — a linha continua na planilha e as viagens '
      + 'já feitas seguem mostrando ' + (tipo === 'veiculos' ? 'a placa' : 'o nome') + ' normalmente.</span>'
      + '</div>'
      + '<div class="ds-ajuda" style="margin-top:10px;">Dá para reverter depois.</div>';

    const btn = document.getElementById('btnConfirmarBaixa');
    btn.onclick = function () { fecharModalBaixa(); aba3GravarBaixa(tipo, key, true); };
    dsAbrir('modalBaixaAba3');
  }

  function fecharModalBaixa() {
    dsFechar('modalBaixaAba3');
  }

  function escAba3(s) {
    return (s == null ? '' : s.toString()).split('&').join('&amp;').split('\x3C').join('&lt;').split('\x3E').join('&gt;');
  }

  function aba3GravarBaixa(tipo, key, dar) {
    aba3AplicarSituacao(tipo, key, dar ? ABA3_BAIXA : 'Ativo',
                        dar ? 'Baixa registrada.' : 'De volta à operação.');
  }

  // ===== Atualização otimista ==================================================
  // A tela muda NA HORA e o servidor recebe a gravação em segundo plano. Antes cada
  // clique esperava a ida-e-volta e ainda recarregava a Aba 3 inteira — dois cliques
  // seguidos ficavam lentos sem motivo.
  //
  // É seguro AQUI porque a operação é pequena e idempotente: escreve duas células de
  // uma linha, não depende do que veio antes, e repetir dá o mesmo resultado. Se o
  // servidor recusar, desfazemos a mudança local e recarregamos do servidor — a tela
  // nunca fica mentindo sobre o que está gravado.
  //
  // ⚠️ NÃO copiar este padrão para gravações que dependem de estado do servidor (montar
  // carro, estornar, registrar no Kanban): lá o resultado depende de quem chegou antes,
  // e "desfazer" no cliente não desfaz o efeito no banco.
  function aba3AplicarSituacao(tipo, key, valor, msgOk, observacao, semAvisoDono) {
    const lista = dbConfig[tipo] || [];
    const item = lista.filter(function (i) { return i._key.toString() === key.toString(); })[0];
    if (!item) return;

    const antes = { status: item.status, motivo: item.motivo, observacao: item.observacao };

    // 1) muda o modelo local e redesenha — o operador segue trabalhando
    item.motivo = (valor === 'Ativo') ? '' : valor;
    item.status = (valor === 'Ativo') ? 'Ativo' : 'Inativo';
    // Voltar a Ativo limpa a observação junto: ela descrevia a ausência que acabou de terminar.
    item.observacao = (valor === 'Ativo') ? '' : (observacao || '');
    aba3RenderTudo();

    // Veículo terceirizado que sai de operação (manutenção, baixa, qualquer motivo)
    // deixa o motorista dele a pé — e a empresa contratada é obrigada a repor. Avisar
    // aqui transforma a regra em ajuda; sem isso o operador só descobre no dia.
    // (Quem vem da janela de vínculo já abre a reposição em seguida: o toast seria repetição.)
    if (tipo === 'veiculos' && valor !== 'Ativo' && !semAvisoDono) {
      const dono = aba3DonoDaPlaca(item.placa, '');
      if (dono) {
        toast('<b>' + escAba3(dono) + '</b> ficou sem veículo (' + escAba3(valor) + ').<br>'
            + 'A contratada precisa repor — cadastre o carro novo e revincule.', 'erro');
      }
    }

    // 2) e só então avisa o servidor
    chamarServidor('salvarConfig', [tipo, 'alternarStatus', { motivo: valor, observacao: item.observacao }, key], function () { toast(msgOk || 'Salvo.', 'ok'); }, function (e) {
        item.status = antes.status; item.motivo = antes.motivo;
        item.observacao = antes.observacao;   // desfaz o otimismo, inteiro
        aba3RenderTudo();
        toast('Não foi possível salvar: ' + escAba3((e && e.message) || e) + ' — a tela foi revertida.', 'erro');
        configCarregada = false;
        carregarAba3(); // recarrega do servidor para não sobrar divergência
      });
  }

  // O backend é quem deriva o par (Status, Motivo) — ver o comentário no salvarConfig.
  //
  // 📌 TIRAR de operação abre o modal; VOLTAR para Ativo grava direto (09/09). Voltar ao normal
  // não tem o que justificar, e um modal ali seria atrito puro.
  let aba3SitAlvo = null;   // { tipo, key, valorAnterior, sel }

  function aba3MudarSituacao(tipo, key, sel) {
    const valor = sel.value;
    if (valor === 'Ativo') {
      aba3AplicarSituacao(tipo, key, valor, 'Disponível novamente.', '');
      return;
    }
    const lista = dbConfig[tipo] || [];
    const item = lista.filter(function (i) { return i._key.toString() === key.toString(); })[0];
    if (!item) return;

    // Inativo em carro ou motorista terceirizado com vínculo: a janela própria pergunta pelo outro.
    if (valor === ABA3_INATIVO && aba3ParVinculado(tipo, item)) {
      aba3AbrirVinculo(tipo, item, '');
      return;
    }

    // Guarda o valor ANTERIOR: cancelar tem de devolver o select ao que era, senão a tela
    // fica mostrando uma situação que ninguém gravou.
    aba3SitAlvo = { tipo: tipo, key: key, anterior: aba3SituacaoDe(item), sel: sel };

    const oQue = tipo === 'veiculos' ? 'Veículo' : 'Motorista';
    document.getElementById('modalSitQuem').innerHTML =
      oQue + ' <b>' + escAba3(key) + '</b>';

    const opcoes = (tipo === 'veiculos') ? ABA3_MOTIVOS_VEICULO : ABA3_MOTIVOS_MOTORISTA;
    const selMot = document.getElementById('modalSitMotivo');
    selMot.innerHTML = opcoes.filter(function (o) { return o !== 'Ativo'; })
      .map(function (o) {
        return '<option value="' + escAba3(o) + '"' + (o === valor ? ' selected' : '') + '>'
             + escAba3(o) + '</option>';
      }).join('');
    document.getElementById('modalSitObs').value = item.observacao || '';

    dsAbrir('modalSituacao');
    setTimeout(function () { document.getElementById('modalSitObs').focus(); }, 80);
  }

  function aba3FecharSituacao(salvar) {
    const alvo = aba3SitAlvo;
    aba3SitAlvo = null;
    dsFechar('modalSituacao');
    if (!alvo) return;

    if (!salvar) {
      alvo.sel.value = alvo.anterior;   // devolve o select
      return;
    }
    const motivo = document.getElementById('modalSitMotivo').value;
    const obs = (document.getElementById('modalSitObs').value || '').trim();
    // Trocou para Inativo dentro desta janela? Mesmo caminho do select da linha.
    const item = (dbConfig[alvo.tipo] || []).filter(function (i) { return i._key.toString() === alvo.key.toString(); })[0];
    if (motivo === ABA3_INATIVO && item && aba3ParVinculado(alvo.tipo, item)) {
      aba3AbrirVinculo(alvo.tipo, item, obs);
      return;
    }
    aba3AplicarSituacao(alvo.tipo, alvo.key, motivo, 'Indisponível: ' + motivo, obs);
  }

  // ===== INATIVO com vínculo de terceirizado (10/11/2026) ======================================
  // Carro terceirizado e o motorista dele andam juntos. Ao inativar um, a tela pergunta pelo outro.
  // Devolve o par { placa, motorista } quando há vínculo ATIVO do outro lado; senão, null.
  function aba3ParVinculado(tipo, item) {
    if (tipo === 'veiculos') {
      if ((item.propriedade || '').toString().trim() !== 'Terceirizado') return null;
      const dono = aba3DonoDaPlaca(item.placa, '');
      if (!dono) return null;
      const mot = (dbConfig.motoristas || []).filter(function (m) { return m.nome === dono; })[0];
      if (!mot || aba3SituacaoDe(mot) !== 'Ativo') return null;
      return { placa: (item.placa || '').toString().trim(), motorista: dono };
    }
    if (tipo === 'motoristas') {
      if ((item.vinculo || '') !== 'Terceirizado') return null;
      const placa = (item.placaVinculada || '').toString().trim();
      if (!placa) return null;
      const v = (dbConfig.veiculos || []).filter(function (x) {
        return (x.placa || '').toString().trim().toUpperCase() === placa.toUpperCase();
      })[0];
      if (!v || aba3SituacaoDe(v) !== 'Ativo') return null;
      return { placa: (v.placa || '').toString().trim(), motorista: item.nome || item._key };
    }
    return null;
  }

  let aba3VincAlvo = null;   // { tipo, placa, motorista }

  function aba3AbrirVinculo(tipo, item, obs) {
    const par = aba3ParVinculado(tipo, item);
    if (!par) return;
    aba3VincAlvo = { tipo: tipo, placa: par.placa, motorista: par.motorista };
    const placa = '<b>' + escAba3(par.placa) + '</b>', nome = '<b>' + escAba3(par.motorista) + '</b>';
    const pe = document.getElementById('modalVincPe');
    const botao = function (classe, acao, rotulo) {
      return '<button class="ds-btn ds-btn--' + classe + '" onclick="aba3VinculoAcao(\'' + acao + '\')">' + rotulo + '</button>';
    };
    if (tipo === 'veiculos') {
      document.getElementById('modalVincTexto').innerHTML =
          '<div class="ds-faixa ds-faixa--atencao"><span>Por ser um <b>carro de terceiro</b>, o ' + placa
        + ' está vinculado ao motorista ' + nome + '.</span></div>'
        + '<p class="aba3-sub" style="margin:12px 0 0;">Inativar só o carro deixa ' + nome + ' sem veículo, e em seguida '
        + 'você escolhe ou cadastra o carro que a contratada vai repor.</p>';
      pe.innerHTML = '<span class="ds-dica"></span>'
        + botao('secundario', 'fechar', 'Cancelar')
        + botao('secundario', 'soCarro', 'Inativar somente o carro')
        + botao('perigo', 'ambos', 'Inativar o carro e o motorista');
    } else {
      document.getElementById('modalVincTexto').innerHTML =
          '<div class="ds-faixa ds-faixa--atencao"><span>O motorista ' + nome + ' é terceirizado e tem vínculo com o carro '
        + placa + '.</span></div>'
        + '<p class="aba3-sub" style="margin:12px 0 0;">Inativar só o motorista deixa o carro ativo, sem motorista, '
        + 'pronto para ser vinculado a outro.</p>';
      pe.innerHTML = '<span class="ds-dica"></span>'
        + botao('secundario', 'fechar', 'Cancelar')
        + botao('secundario', 'soMotorista', 'Inativar somente o motorista')
        + botao('perigo', 'ambos', 'Inativar o motorista e o veículo');
    }
    document.getElementById('modalVincObs').value = obs || '';
    dsAbrir('modalVinculoAba3');
  }

  // Cancelar, X ou Esc: nada foi gravado; redesenhar devolve o select da linha ao que era.
  function aba3VinculoAoFechar() {
    if (!aba3VincAlvo) return;
    aba3VincAlvo = null;
    aba3RenderTudo();
  }
  function aba3FecharVinculo() { dsFechar('modalVinculoAba3'); }

  function aba3VinculoAcao(acao) {
    if (acao === 'fechar') { aba3FecharVinculo(); return; }
    const alvo = aba3VincAlvo;
    aba3VincAlvo = null;            // antes de fechar: o aba3VinculoAoFechar não deve tratar como Cancelar
    dsFechar('modalVinculoAba3');
    if (!alvo) return;
    const obs = (document.getElementById('modalVincObs').value || '').trim();

    if (acao === 'soCarro') {
      aba3AplicarSituacao('veiculos', alvo.placa, ABA3_INATIVO, 'Carro inativado.', obs, true);
      aba3AbrirRepor(alvo.motorista, alvo.placa);
      return;
    }
    if (acao === 'soMotorista') {
      aba3AplicarSituacao('motoristas', alvo.motorista, ABA3_INATIVO, 'Motorista inativado.', obs);
      return;
    }
    // Os dois de uma vez, numa chamada só ao servidor (inativarComVinculo grava os dois sob a mesma trava).
    const v = (dbConfig.veiculos || []).filter(function (x) { return x._key.toString() === alvo.placa; })[0];
    const m = (dbConfig.motoristas || []).filter(function (x) { return x._key.toString() === alvo.motorista; })[0];
    [v, m].forEach(function (it) {
      if (!it) return;
      it.status = 'Inativo'; it.motivo = ABA3_INATIVO; it.observacao = obs;
    });
    aba3RenderTudo();
    chamarServidor('inativarComVinculo', [{ placa: alvo.placa, motorista: alvo.motorista, observacao: obs }], function () { toast('Inativados: carro ' + escAba3(alvo.placa) + ' e motorista ' + escAba3(alvo.motorista) + '.', 'ok'); }, function (e) {
        toast('Não foi possível salvar: ' + escAba3((e && e.message) || e) + ' — a tela foi recarregada.', 'erro');
        configCarregada = false;
        carregarAba3();
      });
  }

  // ===== Reposição: vincular outro carro ao motorista que ficou sem veículo =====================
  let aba3ReporAlvo = null;   // nome do motorista

  // Carros terceirizados ativos que não estão com nenhum motorista (fora o que acabou de ser inativado).
  function aba3CarrosLivres(excetoPlaca) {
    const ex = (excetoPlaca || '').toString().trim().toUpperCase();
    return aba3VeiculosTerceirizados().filter(function (v) {
      const pl = (v.placa || '').toString().trim();
      return pl.toUpperCase() !== ex && aba3SituacaoDe(v) === 'Ativo' && !aba3DonoDaPlaca(pl, '');
    });
  }

  function aba3AbrirRepor(nomeMotorista, placaInativada) {
    aba3ReporAlvo = nomeMotorista;
    document.getElementById('modalReporQuem').innerHTML = 'Motorista <b>' + escAba3(nomeMotorista) + '</b>';
    const livres = aba3CarrosLivres(placaInativada);
    const sel = document.getElementById('modalReporCarro');
    sel.innerHTML = '<option value="">' + (livres.length ? '— escolha o carro —' : '— nenhum carro livre —') + '</option>'
      + livres.map(function (v) {
          const pl = escAba3((v.placa || '').toString().trim());
          return '<option value="' + pl + '">' + pl + (v.tipo ? ' · ' + escAba3(v.tipo) : '')
               + (v.assentos ? ' · ' + escAba3(v.assentos) + ' lugares' : '') + '</option>';
        }).join('');
    sel.disabled = !livres.length;
    document.getElementById('modalReporAjuda').textContent = livres.length
      ? livres.length + ' carro(s) terceirizado(s) ativo(s) sem motorista.'
      : 'Nenhum carro terceirizado livre. Cadastre o carro novo.';
    aba3ReporEscolheu();
    dsAbrir('modalReporAba3');
  }

  function aba3ReporEscolheu() {
    document.getElementById('modalReporOk').disabled = !document.getElementById('modalReporCarro').value;
  }

  // "Agora não": o motorista fica sem carro, e a linha dele fica amarela até alguém resolver.
  function aba3FecharRepor() {
    const nome = aba3ReporAlvo;
    aba3ReporAlvo = null;
    dsFechar('modalReporAba3');
    if (nome) toast('<b>' + escAba3(nome) + '</b> ficou sem veículo. A linha dele fica marcada até o novo carro ser vinculado.', 'aviso');
  }

  function aba3ReporVincular() {
    const placa = document.getElementById('modalReporCarro').value;
    const nome = aba3ReporAlvo;
    if (!placa || !nome) return;
    aba3ReporAlvo = null;
    dsFechar('modalReporAba3');
    aba3ConfirmarVinculo(nome, placa);
  }

  function aba3ReporCadastrar() {
    const nome = aba3ReporAlvo;
    aba3ReporAlvo = null;
    dsFechar('modalReporAba3');
    abrirModalConfig('veiculos', 'novo');
    aba3Retorno = { tipo: 'vincular', motorista: nome };
    const prop = document.getElementById('f_prop');
    if (prop) prop.value = 'Terceirizado';
  }

  // Confirmação com o par motorista + carro, e só então grava o vínculo.
  function aba3ConfirmarVinculo(nome, placa) {
    const v = (dbConfig.veiculos || []).filter(function (x) {
      return (x.placa || '').toString().trim().toUpperCase() === (placa || '').toUpperCase();
    })[0];
    if (!v || (v.propriedade || '') !== 'Terceirizado') {
      toast('O carro ' + escAba3(placa) + ' não é terceirizado e não pode ser vinculado a ' + escAba3(nome) + '.', 'erro');
      aba3AbrirRepor(nome, '');
      return;
    }
    dsConfirmar({
      titulo: 'Confirmar vínculo',
      corpo: '<div class="ds-faixa ds-faixa--info"><span>Motorista <b>' + escAba3(nome) + '</b><br>'
           + 'Carro <b>' + escAba3(v.placa) + '</b>' + (v.tipo ? ' · ' + escAba3(v.tipo) : '')
           + (v.assentos ? ' · ' + escAba3(v.assentos) + ' lugares' : '') + '</span></div>'
           + '<div class="ds-ajuda" style="margin-top:10px;">A partir de agora, ' + escAba3(nome) + ' dirige este carro.</div>',
      ok: 'Confirmar e salvar',
      aoConfirmar: function (fechar) {
        fechar();
        chamarServidor('vincularVeiculoMotorista', [nome, v.placa], function () {
            toast('<b>' + escAba3(nome) + '</b> agora dirige o carro ' + escAba3(v.placa) + '.', 'ok');
            configCarregada = false;
            carregarAba3();
          }, function (e) {
            toast('Não foi possível vincular: ' + escAba3((e && e.message) || e), 'erro');
            configCarregada = false;
            carregarAba3();
          });
      },
      aoCancelar: function () { aba3AbrirRepor(nome, ''); }
    });
  }

  // Esc ou X na janela "Tirar de operação" (data-ao-fechar): vale como Cancelar e devolve o select.
  function aba3SituacaoEsc() {
    if (aba3SitAlvo) aba3FecharSituacao(false);
  }

  function abrirModalConfig(tipo, acao, oldKey) {
    estadoModal = { tipo: tipo, acao: acao, oldKey: oldKey || null };
    // ⚠️ O botão Salvar é COMPARTILHADO com o modal do calendário, que troca o onclick
    // dele. Sem devolver aqui, abrir Veículos depois de mexer no calendário chamaria
    // salvarCalForm — e gravaria na aba errada, em silêncio.
    document.getElementById('btnSalvarConfig').setAttribute('onclick', 'salvarConfigForm()');
    
    let titulo = acao === 'novo' ? 'Novo Cadastro' : 'Editar Cadastro';
    let sufixo = tipo === 'veiculos' ? ' (Veículo)' : (tipo === 'motoristas' ? ' (Motorista)' : ' (Local)');
    document.getElementById('modalConfigTitle').innerText = titulo + sufixo;
    
    let itemAtual = {};
    if (acao === 'editar' && oldKey) {
      itemAtual = dbConfig[tipo].find(function(i) { return i._key.toString() === oldKey.toString(); }) || {};
    }
    
    let formHtml = [];
    if (tipo === 'veiculos') {
      formHtml.push(gerarInput('Placa', 'f_placa', itemAtual.placa || ''));
      // Tipos vêm da PRÓPRIA base (col B de bd_veiculos), não de uma lista fixa: o setor
      // cadastra o vocabulário que usa. "Outro" libera a digitação livre, para não travar
      // quando entrar um modelo que ainda não existe na frota.
      formHtml.push(gerarSelect('Tipo', 'f_tipo', aba3TiposVeiculo(itemAtual.tipo), itemAtual.tipo || ''));
      formHtml.push('<div class="ds-campo" id="grupo_tipo_outro" style="display:none;">'
        + '<label class="ds-rotulo" for="f_tipo_outro">Informe o tipo</label><input class="ds-input" type="text" id="f_tipo_outro" value=""></div>');
      formHtml.push(gerarInput('Assentos (ex: 4)', 'f_assentos', itemAtual.assentos || '', 'number'));
      formHtml.push(gerarSelect('Propriedade', 'f_prop', ['Público', 'Terceirizado', 'Alugado'], itemAtual.propriedade || 'Público'));
      formHtml.push(gerarSelect('Situação', 'f_situacao', ABA3_MOTIVOS_VEICULO, aba3SituacaoDe(itemAtual)));
    } else if (tipo === 'motoristas') {
      formHtml.push(gerarInput('Nome', 'f_nome', itemAtual.nome || ''));
      formHtml.push(gerarSelect('Vínculo', 'f_vinc', ['Servidor', 'Terceirizado'], itemAtual.vinculo || 'Servidor'));
      // Placa vinculada é SELECT, não texto livre: o vínculo é resolvido por igualdade
      // exata (codigo.gs monta placaVinc pelo nome), então um erro de digitação fazia o
      // carro do terceirizado simplesmente não aparecer, sem erro nenhum.
      formHtml.push(aba3CampoPlacaVinculada(itemAtual));
      formHtml.push(gerarInput('WhatsApp (Somente números)', 'f_wpp', itemAtual.whatsapp || ''));
      formHtml.push(gerarSelect('Situação', 'f_situacao', ABA3_MOTIVOS_MOTORISTA, aba3SituacaoDe(itemAtual)));
    } else if (tipo === 'locais') {
      // O nome vai para dentro de value="..."; uma aspa nele fecharia o atributo.
      const nomeAttr = escAba3(itemAtual.local || '').split('"').join('&quot;');
      formHtml.push(gerarInput('Local (ex.: UPA Norte)', 'f_local', nomeAttr));
      if (itemAtual.padrao || itemAtual.trava) {
        // O padrão e a opção do sistema não saem da lista: a situação deles é fixa.
        formHtml.push('<input type="hidden" id="f_situacao" value="Ativo">');
      } else {
        // Situação fora da lista (ex.: Baixado) entra como opção — sem isto o select cairia em
        // "Ativo", e editar só o nome reativaria o local sem ninguém pedir.
        const sit = aba3SituacaoDe(itemAtual);
        const opcoes = ABA3_MOTIVOS_LOCAL.indexOf(sit) > -1 ? ABA3_MOTIVOS_LOCAL : ABA3_MOTIVOS_LOCAL.concat([sit]);
        formHtml.push(gerarSelect('Situação', 'f_situacao', opcoes, sit));
      }
      if (acao === 'editar') {
        formHtml.push('<div class="ds-ajuda">'
          + 'Renomear vale daqui para a frente: as viagens já gravadas continuam com o nome antigo.</div>');
      }
    }
    
    document.getElementById('modalConfigForm').innerHTML = formHtml.join('');

    // gerarSelect não aceita handler; liga aqui depois de o HTML existir.
    const selTipo = document.getElementById('f_tipo');
    if (selTipo) { selTipo.addEventListener('change', aba3ToggleTipoOutro); aba3ToggleTipoOutro(); }

    const selVinc = document.getElementById('f_vinc'), selPlacav = document.getElementById('f_placav');
    if (selVinc && selPlacav) {
      selVinc.addEventListener('change', aba3AtualizarVinculo);
      selPlacav.addEventListener('change', aba3AtualizarVinculo);
      aba3AtualizarVinculo();
    }

    dsAbrir('modalConfig');
  }

  function fecharModalConfig() {
    dsFechar('modalConfig');
  }

  function gerarInput(label, id, value, type) {
    let t = type || 'text';
    return '<div class="ds-campo"><label class="ds-rotulo" for="' + id + '">' + label + '</label><input class="ds-input" type="' + t + '" id="' + id + '" value="' + value + '"></div>';
  }
  
  function gerarSelect(label, id, options, selectedValue) {
    let select = '<div class="ds-campo"><label class="ds-rotulo" for="' + id + '">' + label + '</label><select class="ds-select" id="' + id + '">';
    options.forEach(function(opt) {
      let sel = opt === selectedValue ? 'selected' : '';
      select += '<option value="' + opt + '" ' + sel + '>' + opt + '</option>';
    });
    select += '</select></div>';
    return select;
  }

  function salvarConfigForm() {
    const btnSalvar = document.getElementById('btnSalvarConfig');
    btnSalvar.innerText = 'Salvando...';
    btnSalvar.disabled = true;
    
    let payload = {};
    if (estadoModal.tipo === 'veiculos') {
      payload.placa = document.getElementById('f_placa').value;
      const tipoSel = document.getElementById('f_tipo').value;
      payload.tipo = (tipoSel === 'Outro')
        ? (document.getElementById('f_tipo_outro').value || '').trim()
        : tipoSel;
      if (!payload.tipo) {
        toast('Informe o tipo do veículo.', 'erro');
        btnSalvar.innerText = 'Salvar'; btnSalvar.disabled = false;
        return;
      }
      payload.assentos = document.getElementById('f_assentos').value;
      payload.propriedade = document.getElementById('f_prop').value;
      // Sempre enviado, inclusive ao EDITAR. Antes só ia no 'novo', e como o backend
      // regrava a linha inteira, editar um item gravava o Status VAZIO — o item
      // Inativo voltava a ficar Ativo sozinho (o getConfigData faz || 'Ativo').
      payload.motivo = document.getElementById('f_situacao').value;
    } else if (estadoModal.tipo === 'motoristas') {
      payload.nome = document.getElementById('f_nome').value;
      payload.vinculo = document.getElementById('f_vinc').value;
      // Servidor não tem placa vinculada (10/11/2026): o campo fica escondido e vai vazio.
      payload.placaVinculada = payload.vinculo === 'Terceirizado' ? document.getElementById('f_placav').value : '';
      payload.whatsapp = document.getElementById('f_wpp').value;
      payload.motivo = document.getElementById('f_situacao').value;

      // Regra do gestor: motorista terceirizado NÃO existe sem veículo.
      if (payload.vinculo === 'Terceirizado' && !payload.placaVinculada) {
        toast('Motorista terceirizado precisa de um veículo vinculado.', 'erro');
        btnSalvar.innerText = 'Salvar'; btnSalvar.disabled = false;
        return;
      }
    } else if (estadoModal.tipo === 'locais') {
      payload.local = (document.getElementById('f_local').value || '').trim();
      payload.motivo = document.getElementById('f_situacao').value;
      // Resposta rápida aqui; quem decide é o servidor, com a MESMA regra (sem caixa, acento
      // nem espaço repetido).
      const normL = function (s) {
        return (s == null ? '' : s.toString()).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .toUpperCase().replace(/\s+/g, ' ').trim();
      };
      const falha = !payload.local ? 'Informe o nome do local.'
        : ((dbConfig.locais || []).filter(function (l) {
            return l._key !== estadoModal.oldKey && normL(l.local) === normL(payload.local);
          })[0] ? 'Já existe um local com esse nome.' : '');
      if (falha) {
        toast(falha, 'erro');
        btnSalvar.innerText = 'Salvar'; btnSalvar.disabled = false;
        return;
      }
    }

    // Carro cadastrado a partir do motorista ou da reposição: guarda para onde voltar, e zera antes de
    // fechar, para o aba3ConfigAoFechar (que trata o Cancelar) não agir no caminho do Salvar.
    const retorno = (estadoModal.tipo === 'veiculos') ? aba3Retorno : null;
    const placaSalva = (payload.placa || '').toString().trim();

    chamarServidor('salvarConfig', [estadoModal.tipo, estadoModal.acao, payload, estadoModal.oldKey], function() {
        toast("Salvo com sucesso!", "sucesso");
        aba3Retorno = null;
        fecharModalConfig();
        configCarregada = false;
        btnSalvar.innerText = 'Salvar';
        btnSalvar.disabled = false;
        carregarAba3(function () {
          if (!retorno) return;
          if (retorno.tipo === 'formMotorista') aba3VoltarAoMotorista(retorno.rascunho, placaSalva);
          else if (retorno.tipo === 'vincular') aba3ConfirmarVinculo(retorno.motorista, placaSalva);
        });
      }, function(err) {
        console.error(err);
        // A mensagem do SERVIDOR chega inteira: é ela que diz o que foi recusado ("Já existe um
        // local chamado…", "é uma opção do sistema…"). O genérico escondia o motivo (11/09).
        toast('Não foi possível salvar: ' + escAba3((err && err.message) || err), 'erro');
        btnSalvar.innerText = 'Salvar';
        btnSalvar.disabled = false;
      });
  }

  // ⭐ Padrão das saídas (11/09). Mexe em DUAS linhas — tira a marca de uma e põe em outra —,
  // por isso NÃO usa o otimismo do aba3AplicarSituacao: grava e só então recarrega.
  function aba3DefinirPadraoLocal(key) {
    chamarServidor('salvarConfig', ['locais', 'definirPadrao', {}, key], function () {
        toast('Padrão das saídas: <b>' + escAba3(key) + '</b>.', 'ok');
        configCarregada = false;
        carregarAba3();
      }, function (e) {
        toast('Não foi possível salvar: ' + escAba3((e && e.message) || e), 'erro');
      });
  }

  // alternarStatusConfig() foi removida: o botão 🔄 deu lugar ao select de situação
  // direto na linha (aba3MudarSituacao), que grava o MOTIVO junto — alternar às cegas
  // entre Ativo/Inativo perdeu o sentido quando o gestor passou a exigir o porquê.

  // ===== PADRONIZAÇÃO DE LOCAIS (pedido do Hélio, 11/11/2026; mockup mockup-padronizacao-locais) =====
  // A bd_dicionario_locais em tela: como cada cidade e local chega no CSV e como o sistema passa a escrever. Editar muda
  // só o "como fica"; o "como vem" é a chave que a importação procura. Trocar a CIDADE pede confirmação (o caso do
  // HEMOSC: um aceite errado trocava o destino em silêncio em toda importação). Vale da próxima importação em diante.
  let aba3Pad = { lista: null, pagina: 1, edit: null };
  const ABA3_PAD_POR_PAGINA = 50;
  const ABA3_PAD_ORIGEM = {
    sugestao_dicionario: { rot: 'Sugestão', cls: 'dic', ic: 'ti-sparkles' },
    sugestao_google:     { rot: 'Google', cls: 'goo', ic: 'ti-map-search' },
    manual:              { rot: 'Digitado', cls: 'man', ic: 'ti-pencil' },
    mantido_original:    { rot: 'Mantido como veio', cls: 'igual', ic: 'ti-equal' }
  };

  function aba3PadNorm(s) {
    return (s == null ? '' : s.toString()).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  }
  // "Corrige algo" = o que fica é diferente do que veio, nem que seja só acento ou maiúscula.
  function aba3PadMuda(r) { return r.cidadeOrig !== r.cidadePad || r.localOrig !== r.localPad; }

  function aba3PadCarregar(forcar) {
    if (aba3Pad.lista && !forcar) { aba3PadRender(); return; }
    document.getElementById('tbody-padronizacao').innerHTML = '<tr><td colspan="6" class="aba3-loading">Carregando dados...</td></tr>';
    chamarServidor('getPadronizacaoLocais', [], function (lista) { aba3PadReceber(lista); }, function (e) {
        document.getElementById('tbody-padronizacao').innerHTML = '<tr><td colspan="6" class="aba3-loading">Não foi possível carregar: '
          + escAba3((e && e.message) || e) + '</td></tr>';
      });
  }

  function aba3PadReceber(lista) {
    aba3Pad.lista = lista || [];
    const cidades = {};
    aba3Pad.lista.forEach(function (r) { if (r.cidadePad) cidades[aba3PadNorm(r.cidadePad)] = r.cidadePad; });
    const nomes = Object.keys(cidades).map(function (k) { return cidades[k]; }).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    const sel = document.getElementById('padCidade');
    const atual = sel.value;
    sel.innerHTML = '<option value="">Todas</option>' + nomes.map(function (c) {
      return '<option value="' + escAba3(c).split('"').join('&quot;') + '">' + escAba3(c) + '</option>';
    }).join('');
    if (nomes.indexOf(atual) > -1) sel.value = atual;
    document.getElementById('padCidadesLista').innerHTML = nomes.map(function (c) {
      return '<option value="' + escAba3(c).split('"').join('&quot;') + '"></option>';
    }).join('');
    aba3PadRender();
  }

  function aba3PadFiltrar() { aba3Pad.pagina = 1; aba3PadRender(); }

  function aba3PadLimpar() {
    document.getElementById('padBusca').value = '';
    document.getElementById('padCidade').value = '';
    document.getElementById('padOrigem').value = '';
    document.getElementById('padSoMuda').checked = true;
    aba3PadFiltrar();
  }

  function aba3PadIrPagina(n) { aba3Pad.pagina = n; aba3PadRender(); }

  function aba3PadRender() {
    const tbody = document.getElementById('tbody-padronizacao');
    if (!tbody || !aba3Pad.lista) return;
    const busca = aba3PadNorm(document.getElementById('padBusca').value);
    const cidade = aba3PadNorm(document.getElementById('padCidade').value);
    const origem = document.getElementById('padOrigem').value;
    const soMuda = document.getElementById('padSoMuda').checked;
    let escondidosIguais = 0;
    const idx = [];
    aba3Pad.lista.forEach(function (r, i) {
      if (cidade && aba3PadNorm(r.cidadePad) !== cidade) return;
      if (origem && r.origem !== origem) return;
      if (busca && aba3PadNorm([r.cidadeOrig, r.localOrig, r.cidadePad, r.localPad].join(' ')).indexOf(busca) === -1) return;
      if (soMuda && !aba3PadMuda(r)) { escondidosIguais++; return; }
      idx.push(i);
    });
    document.getElementById('padN').textContent = aba3Pad.lista.length + ' nomes';

    const paginas = Math.max(1, Math.ceil(idx.length / ABA3_PAD_POR_PAGINA));
    if (aba3Pad.pagina > paginas) aba3Pad.pagina = paginas;
    const ini = (aba3Pad.pagina - 1) * ABA3_PAD_POR_PAGINA;
    const daPagina = idx.slice(ini, ini + ABA3_PAD_POR_PAGINA);

    if (daPagina.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="aba3-loading">Nenhum nome com esses filtros.</td></tr>';
    } else {
      tbody.innerHTML = daPagina.map(function (i) {
        const r = aba3Pad.lista[i];
        const o = ABA3_PAD_ORIGEM[r.origem] || { rot: r.origem || '—', cls: 'igual', ic: 'ti-point' };
        const mc = r.cidadeOrig !== r.cidadePad ? ' pad-muda' : '';
        const ml = r.localOrig !== r.localPad ? ' pad-muda' : '';
        return '<tr>'
          + '<td class="pad-orig"><span class="pad-c">' + escAba3(r.cidadeOrig) + '</span>' + escAba3(r.localOrig) + '</td>'
          + '<td class="pad-seta"><i class="ti ti-arrow-right"></i></td>'
          + '<td class="pad-novo"><span class="pad-c"><span class="' + mc.trim() + '">' + escAba3(r.cidadePad) + '</span></span>'
          +   '<span class="pad-l' + ml + '">' + escAba3(r.localPad) + '</span></td>'
          + '<td><span class="aba3-pad-chip ' + o.cls + '"><i class="ti ' + o.ic + '"></i>' + escAba3(o.rot) + '</span></td>'
          + '<td class="pad-quem">' + escAba3(r.quem || '—') + (r.quando ? '<br>' + escAba3(r.quando) : '') + '</td>'
          + '<td class="ds-col-acoes">'
          +   '<button class="ds-btn ds-btn--fantasma ds-btn--icone ds-btn--sm btn-acao" onclick="aba3PadEditar(' + i + ')" title="Editar"><i class="ti ti-pencil"></i></button>'
          +   '<button class="ds-btn ds-btn--fantasma ds-btn--icone ds-btn--sm btn-acao acao-baixa" onclick="aba3PadExcluir(' + i + ')" title="Excluir"><i class="ti ti-trash"></i></button>'
          + '</td></tr>';
      }).join('');
    }

    document.getElementById('padInfo').textContent = 'Mostrando ' + daPagina.length + ' de ' + idx.length
      + (escondidosIguais ? ' · ' + escondidosIguais + ' mantidos como vieram (escondidos pelo filtro)' : '');
    let pag = '';
    if (paginas > 1) {
      for (let n = 1; paginas >= n; n++) {
        pag += '<button class="' + (n === aba3Pad.pagina ? 'on' : '') + '" onclick="aba3PadIrPagina(' + n + ')">' + n + '</button>';
      }
    }
    document.getElementById('padPag').innerHTML = pag;
  }

  function aba3PadEditar(i) {
    const r = aba3Pad.lista && aba3Pad.lista[i];
    if (!r) return;
    aba3Pad.edit = { cidadeOrig: r.cidadeOrig, localOrig: r.localOrig, cidadeAntes: r.cidadePad };
    document.getElementById('padEdOrig').innerHTML = 'Como vem no CSV (não muda): <b>' + escAba3(r.cidadeOrig) + ' / ' + escAba3(r.localOrig) + '</b>';
    document.getElementById('padEdCidade').value = r.cidadePad;
    document.getElementById('padEdLocal').value = r.localPad;
    dsAbrir('modalPadLocal');
    setTimeout(function () { document.getElementById('padEdLocal').focus(); }, 60);
  }

  function aba3PadSalvar() {
    const e = aba3Pad.edit;
    if (!e) return;
    const cidade = (document.getElementById('padEdCidade').value || '').trim();
    const local = (document.getElementById('padEdLocal').value || '').trim();
    if (!cidade || !local) { toast('Informe a cidade e o local.', 'erro'); return; }
    const gravar = function () {
      const btn = document.getElementById('padEdOk');
      btn.disabled = true;
      chamarServidor('salvarPadronizacaoLocal', [{ cidadeOrig: e.cidadeOrig, localOrig: e.localOrig, cidadePad: cidade, localPad: local },
                                 (typeof getOperador === 'function') ? getOperador() : ''], function (lista) {
          btn.disabled = false;
          aba3Pad.edit = null;
          dsFechar('modalPadLocal');
          aba3PadReceber(lista);
          toast('Padronização salva. Vale da próxima importação.', 'ok');
        }, function (err) {
          btn.disabled = false;
          toast('Não foi possível salvar: ' + escAba3((err && err.message) || err), 'erro');
        });
    };
    // Trocar a CIDADE pede confirmação (só a grafia, sem mudar a cidade, não pede).
    if (aba3PadNorm(cidade) !== aba3PadNorm(e.cidadeAntes)) {
      dsConfirmar({ titulo: 'Trocar a cidade?', classeOk: 'perigo', ok: 'Trocar a cidade',
        corpo: '<p style="margin:0 0 8px">Todo paciente que chegar no CSV como <b>' + escAba3(e.cidadeOrig) + ' / ' + escAba3(e.localOrig)
          + '</b> passa a ir para outra cidade:</p><p style="margin:0"><b>' + escAba3(e.cidadeAntes) + '</b> → <b>' + escAba3(cidade) + '</b></p>',
        aoConfirmar: function (fechar) { fechar(); gravar(); } });
      return;
    }
    gravar();
  }

  function aba3PadExcluir(i) {
    const r = aba3Pad.lista && aba3Pad.lista[i];
    if (!r) return;
    dsConfirmar({ titulo: 'Excluir da padronização?', classeOk: 'perigo', ok: 'Excluir',
      corpo: '<p style="margin:0 0 8px"><b>' + escAba3(r.cidadeOrig) + ' / ' + escAba3(r.localOrig) + '</b> → '
        + escAba3(r.cidadePad) + ' / ' + escAba3(r.localPad) + '</p>'
        + '<p style="margin:0">Na próxima importação, esse nome volta para a revisão do <b>Importar CSV</b>.</p>',
      aoConfirmar: function (fechar) {
        fechar();
        chamarServidor('excluirPadronizacaoLocal', [{ cidadeOrig: r.cidadeOrig, localOrig: r.localOrig }], function (lista) { aba3PadReceber(lista); toast('Excluído da padronização.', 'ok'); }, function (err) { toast('Não foi possível excluir: ' + escAba3((err && err.message) || err), 'erro'); });
      } });
  }

  // Selo de versão
  window.__VERSOES = window.__VERSOES || {}; window.__VERSOES.aba3 = '11/11a';

// ---- Exposição para o HTML e as outras telas (as telas vieram do Apps Script, onde tudo era global; ADR 0016).
Object.assign(window, { mudarSubAba3, iniciarAba3, carregarAba3, renderizarTabela, aba3DiaSemana, renderCalendario, abrirModalImportar, fecharModalImportar, analisarImportacao, renderPreviaImportacao, atualizarDicaImportacao, confirmarImportacao, abrirModalCal, salvarCalForm, excluirCal, excluirCalConfirmado, aba3RenderTudo, aba3ToggleBaixados, aba3SituacaoDe, aba3VeiculosTerceirizados, aba3MotoristaSemCarro, aba3DonoDaPlaca, aba3CampoPlacaVinculada, aba3AtualizarVinculo, aba3NovoVeiculoTerceirizado, aba3VoltarAoMotorista, aba3ConfigAoFechar, aba3TiposVeiculo, aba3ToggleTipoOutro, aba3SelectSituacao, aba3Baixa, fecharModalBaixa, escAba3, aba3GravarBaixa, aba3AplicarSituacao, aba3MudarSituacao, aba3FecharSituacao, aba3ParVinculado, aba3AbrirVinculo, aba3VinculoAoFechar, aba3FecharVinculo, aba3VinculoAcao, aba3CarrosLivres, aba3AbrirRepor, aba3ReporEscolheu, aba3FecharRepor, aba3ReporVincular, aba3ReporCadastrar, aba3ConfirmarVinculo, aba3SituacaoEsc, abrirModalConfig, fecharModalConfig, gerarInput, gerarSelect, salvarConfigForm, aba3DefinirPadraoLocal, aba3PadNorm, aba3PadMuda, aba3PadCarregar, aba3PadReceber, aba3PadFiltrar, aba3PadLimpar, aba3PadIrPagina, aba3PadRender, aba3PadEditar, aba3PadSalvar, aba3PadExcluir });
Object.defineProperty(window, 'dbConfig', { configurable: true, get: () => dbConfig, set: (valor) => { dbConfig = valor; } });
Object.defineProperty(window, 'estadoModal', { configurable: true, get: () => estadoModal, set: (valor) => { estadoModal = valor; } });
Object.defineProperty(window, 'configCarregada', { configurable: true, get: () => configCarregada, set: (valor) => { configCarregada = valor; } });
Object.defineProperty(window, 'ABA3_TIPOS_DIA', { configurable: true, get: () => ABA3_TIPOS_DIA });
Object.defineProperty(window, 'ABA3_SEMANA', { configurable: true, get: () => ABA3_SEMANA });
Object.defineProperty(window, 'calImportados', { configurable: true, get: () => calImportados, set: (valor) => { calImportados = valor; } });
Object.defineProperty(window, 'estadoCal', { configurable: true, get: () => estadoCal, set: (valor) => { estadoCal = valor; } });
Object.defineProperty(window, 'ABA3_MOTIVOS_MOTORISTA', { configurable: true, get: () => ABA3_MOTIVOS_MOTORISTA });
Object.defineProperty(window, 'ABA3_MOTIVOS_VEICULO', { configurable: true, get: () => ABA3_MOTIVOS_VEICULO });
Object.defineProperty(window, 'ABA3_INATIVO', { configurable: true, get: () => ABA3_INATIVO });
Object.defineProperty(window, 'ABA3_INATIVO_ANTIGO', { configurable: true, get: () => ABA3_INATIVO_ANTIGO });
Object.defineProperty(window, 'ABA3_MOTIVOS_LOCAL', { configurable: true, get: () => ABA3_MOTIVOS_LOCAL });
Object.defineProperty(window, 'ABA3_BAIXA', { configurable: true, get: () => ABA3_BAIXA });
Object.defineProperty(window, 'aba3MostrarBaixados', { configurable: true, get: () => aba3MostrarBaixados, set: (valor) => { aba3MostrarBaixados = valor; } });
Object.defineProperty(window, 'aba3Retorno', { configurable: true, get: () => aba3Retorno, set: (valor) => { aba3Retorno = valor; } });
Object.defineProperty(window, 'aba3SitAlvo', { configurable: true, get: () => aba3SitAlvo, set: (valor) => { aba3SitAlvo = valor; } });
Object.defineProperty(window, 'aba3VincAlvo', { configurable: true, get: () => aba3VincAlvo, set: (valor) => { aba3VincAlvo = valor; } });
Object.defineProperty(window, 'aba3ReporAlvo', { configurable: true, get: () => aba3ReporAlvo, set: (valor) => { aba3ReporAlvo = valor; } });
Object.defineProperty(window, 'aba3Pad', { configurable: true, get: () => aba3Pad, set: (valor) => { aba3Pad = valor; } });
Object.defineProperty(window, 'ABA3_PAD_POR_PAGINA', { configurable: true, get: () => ABA3_PAD_POR_PAGINA });
Object.defineProperty(window, 'ABA3_PAD_ORIGEM', { configurable: true, get: () => ABA3_PAD_ORIGEM });
