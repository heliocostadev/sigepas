const estadoGuia = {
    veiculosSalvos: [],
    cidadesHistoricas: [],
    locais: [],
    locaisEmbarque: [],
    motoristasDisponiveis: [],
    motoristasServidores: [],
    quemAtendeuOpcoes: [],
    expandidos: [],
    confAberto: ''
  };

  // Entrar na aba ou trocar a data (13/11/2026): mostra na hora a última carga daquele dia, a mesma que Viagens
  // Externas usa (cargaDiaPedir, no Index), e confere com o servidor por trás. Se algo mudou, redesenha com o aviso
  // "Viagens atualizadas!".
  function iniciarGuia() {
    const dataEl = document.getElementById('gFiltroData');
    if (!dataEl.value) {
      dataEl.value = dataPadraoISO();   // o dia seguinte (11/11/2026)
    }
    const data = dataEl.value;
    if (!cargaDiaTem(data)) toast('Carregando confirmação e guias de viagens...', 'info');
    cargaDiaPedir({ data: data, lembrar: true, quem: 'guia' }, function (dados, como) {
      if (como === 'nova') {
        if (document.getElementById('gFiltroData').value !== data) return;   // trocaram de dia enquanto conferia
        if (guiaGravacoesContato > 0) return;   // o contato em gravação redesenha a lista quando terminar
      }
      carregarGuia(dados, como === 'lembrada');
    }, function (e) {
      document.getElementById('guiaCorpo').innerHTML = '<div class="guia-vazio">⚠️ Erro ao carregar: ' + e + '</div>';
      toast('Erro ao carregar a guia: ' + e, 'erro');
    });
  }

  // ⛔ guiaPropagarAba2 saiu daqui em 01/09/2026, junto com a Aba 2. Ela empurrava o
  // payload de cada ação para a outra tela, para a Aba 2 não mostrar estado velho.
  // Sem a Aba 2, não há para onde empurrar.

  function carregarGuia(dados, silencioso) {
    dados = dados || {};
    // Guardada ANTES de a lista mexer nos dados (13/11/2026): vira a última carga do dia, para esta aba e para
    // Viagens Externas. Vale também a que volta de uma gravação (contato, mover, trocar…).
    if (typeof cargaDiaGuardar === 'function') cargaDiaGuardar(dados);
    estadoGuia.veiculosSalvos = (dados.veiculosSalvos || []).map(function (v) {
      if (!Array.isArray(v.passageiros)) v.passageiros = [];
      return v;
    });
    estadoGuia.cidadesHistoricas = dados.cidadesHistoricas || [];
    estadoGuia.locaisEmbarque = dados.locaisEmbarque || [];
    estadoGuia.motoristasDisponiveis = dados.motoristasDisponiveis || [];
    estadoGuia.motoristasServidores = dados.motoristasServidores || [];
    estadoGuia.quemAtendeuOpcoes = dados.quemAtendeuOpcoes || [];

    // locais de atendimento distintos (dos passageiros salvos)
    const locaisSet = new Set();
    estadoGuia.veiculosSalvos.forEach(v => v.passageiros.forEach(p => { if (p.local) locaisSet.add(p.local); }));
    estadoGuia.locais = [...locaisSet].sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });

    // cidades de destino para o filtro: históricas + destinos salvos.
    // 🔑 Uma cidade, uma opção (defeito 3, 05/10): o CSV grava "FLORIANOPOLIS" e o LACEN "Florianópolis". O valor da
    // opção é a chave (sem acento, maiúsculas); o rótulo é a grafia com acento, quando houver uma.
    const cidadesMapa = {};
    const juntarCidade = c => {
      const k = guiaNormCid(c);
      if (k && (!cidadesMapa[k] || (guiaTemAcento(c) && !guiaTemAcento(cidadesMapa[k])))) cidadesMapa[k] = c;
    };
    (estadoGuia.cidadesHistoricas || []).forEach(juntarCidade);
    estadoGuia.veiculosSalvos.forEach(v => { const d = destinoDe(v); if (d && d !== 'Sem destino') juntarCidade(d); });
    const cidades = Object.keys(cidadesMapa).sort((a, b) => a.localeCompare(b));

    const selCidade = document.getElementById('gFiltroCidade');
    const cidadeAtual = selCidade.value;
    selCidade.innerHTML = '<option value="">Todas as Cidades</option>' +
      cidades.map(c => `<option value="${c}" ${c === cidadeAtual ? 'selected' : ''}>${cidadesMapa[c]}</option>`).join('');

    const selLocal = document.getElementById('gFiltroLocal');
    const localAtual = selLocal.value;
    selLocal.innerHTML = '<option value="">Todos os Locais</option>' +
      estadoGuia.locais.map(l => `<option value="${l}" ${l === localAtual ? 'selected' : ''}>${l}</option>`).join('');

    renderGuia();
    if (!silencioso) toast('Viagens atualizadas!', 'ok');
  }

  // Chave de cidade: sem acento, maiúsculas, sem espaço nas pontas. Agrupa e filtra "Florianópolis" com "FLORIANOPOLIS".
  function guiaNormCid(s) { return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim(); }
  function guiaTemAcento(s) { return guiaNormCid(s) !== (s || '').toString().toUpperCase().trim(); }

  function destinoDe(v) {
    return v.destino || (v.roteiro && v.roteiro.length ? v.roteiro[v.roteiro.length - 1] : '') || 'Sem destino';
  }

  // 🔑 BATE-VOLTA: a placa deixou de identificar o carro do dia — a mesma placa pode sair
  // duas vezes (4h para Penha, volta, 6h de novo). A identidade passou a ser a VIAGEM.
  // Daqui para baixo, toda string que a Guia usa para "qual carro" é esta chave; a placa
  // ficou sendo só rótulo na tela e argumento para o backend.
  // Carro antigo, gravado antes do backfill, não tem viagem no id: cai na placa, que era
  // o comportamento de sempre — nada quebra retroativamente.
  function chaveCarroGuia(v) { return (v && (v.idViagem || v.placa)) || ''; }
  function carroDaChave(k) {
    return (estadoGuia.veiculosSalvos || []).find(function (x) { return chaveCarroGuia(x) === k; }) || null;
  }

  function alternarGuiaCard(placa) {
    const i = estadoGuia.expandidos.indexOf(placa);
    if (i > -1) estadoGuia.expandidos.splice(i, 1);
    else estadoGuia.expandidos.push(placa);
    renderGuia();
  }

  function renderGuia() {
    const cont = document.getElementById('guiaCorpo');
    const cid = document.getElementById('gFiltroCidade').value;
    const local = document.getElementById('gFiltroLocal').value;
    const statusConf = document.getElementById('gFiltroStatusConf').value;
    const somenteLivres = document.getElementById('gSomenteLivres').checked;
    const busca = document.getElementById('gBusca').value.toLowerCase().trim();

    renderContadoresGuia();

    let lista = estadoGuia.veiculosSalvos.filter(v => {
      if (cid) {
        const ok = guiaNormCid(v.destino) === cid || (v.roteiro || []).some(r => guiaNormCid(r) === cid)
          || v.passageiros.some(p => guiaNormCid(p.cidade) === cid);
        if (!ok) return false;
      }
      if (local && !v.passageiros.some(p => p.local === local)) return false;
      if (statusConf && !v.passageiros.some(p => guiaStatusCasa(p.statusConfirmacao, statusConf))) return false;
      if (somenteLivres) {
        const limite = v.limite || 4;
        const ocup = v.passageiros.reduce((s, p) => s + Number(p.quantidade), 0);
        if (ocup + (v.bloqueados || 0) >= limite) return false;
      }
      if (busca) {
        const txt = [v.placa, v.motoristaAtribuido, v.destino, v.tipo, ...(v.roteiro || []),
          ...v.passageiros.map(p => `${p.nome} ${p.matricula} ${p.bairro} ${p.local} ${p.cidade} ${p.servidorNome || ''} ${p.servidorMatricula || ''}`)
        ].join(' ').toLowerCase();
        if (!txt.includes(busca)) return false;
      }
      return true;
    });

    const totalVeic = lista.length;
    const totalPax = lista.reduce((s, v) => s + v.passageiros.reduce((ss, p) => ss + Number(p.quantidade), 0), 0);
    document.getElementById('guiaResumo').textContent = totalVeic ? `${totalVeic} veículo(s) · ${totalPax} passageiro(s)` : '';

    if (!lista.length) {
      cont.innerHTML = '<div class="guia-vazio">Nenhum veículo salvo para a data/filtros atuais.</div>';
      return;
    }

    // agrupa por cidade de destino
    // A faixa é por CHAVE de cidade (defeito 3); o nome mostrado é a grafia com acento, quando houver.
    const grupos = {}, rotulos = {};
    lista.forEach(v => {
      const d = destinoDe(v), k = guiaNormCid(d);
      (grupos[k] = grupos[k] || []).push(v);
      if (!rotulos[k] || (guiaTemAcento(d) && !guiaTemAcento(rotulos[k]))) rotulos[k] = d;
    });
    const cidadesOrd = Object.keys(grupos).sort((a, b) => a.localeCompare(b));

    cont.innerHTML = cidadesOrd.map(cidade => {
      const vs = grupos[cidade].sort((a, b) => (a.horaEmbarque || '').localeCompare(b.horaEmbarque || ''));
      const paxGrupo = vs.reduce((s, v) => s + v.passageiros.reduce((ss, p) => ss + Number(p.quantidade), 0), 0);
      return `
        <div class="guia-grupo">
          <div class="guia-grupo-cidade">
            <span class="gc-nome">${rotulos[cidade].toUpperCase()}</span>
            <span class="gc-meta">${vs.length} veículo${vs.length > 1 ? 's' : ''} · ${paxGrupo} passageiro${paxGrupo > 1 ? 's' : ''}</span>
          </div>
          ${vs.map(cardVeiculoGuiaHTML).join('')}
        </div>`;
    }).join('');

    if (estadoGuia.confAberto) {
      const c = _confAtual();
      if (c && c.p && c.v) {
        atualizarHeaderDrawerGuia(c.p, c.v, c.placa);
        // A aba Mover mostra vagas: sem refazer, ela ficava com as vagas de antes da recarga (2.1b, 15/09).
        if (abaAtivaDrawerGuia === 'mover') renderDrawerConteudoGuia('mover');
      } else {
        fecharPainelPax();
      }
    }
  }

  function cardVeiculoGuiaHTML(v) {
    const limite = v.limite || 4;
    const ocupados = v.passageiros.reduce((s, p) => s + Number(p.quantidade), 0);
    const livres = limite - ocupados - (v.bloqueados || 0);

    let badgeVagasClasse = 'vagas-badge';
    let textoVagas = `${livres} livre(s)`;
    if (livres === 0) { badgeVagasClasse += ' sem-vaga'; textoVagas = 'Cheio'; }
    else if (0 > livres) { badgeVagasClasse += ' excedido'; textoVagas = `Excedido por ${Math.abs(livres)}`; }

    const isTerc = v.categoria === 'terceirizado';
    const recolhido = !estadoGuia.expandidos.includes(chaveCarroGuia(v)); // começa recolhido (como em Viagens Salvas)
    const rotaHTML = `${formatarCaminhoRoteiroHTML(v.roteiro && v.roteiro.length ? v.roteiro : (v.destino ? [v.destino] : []))}${v.localEmbarque ? ` <span class="cv-rota-local">· Saída ${v.localEmbarque}</span>` : ''}`;

    const whatsappBtn = guiaTemZap(v)
      ? `<a class="ds-btn ds-btn--whatsapp ds-btn--icone ds-btn--sm guia-zap" href="#" title="Enviar programação no WhatsApp para ${guiaNomesMotoristas(v)}" onclick="event.stopPropagation();abrirWhatsappGuia('${chaveCarroGuia(v)}');return false;"><i class="ti ti-brand-whatsapp"></i></a>`
      : '';
    // Imagem da viagem (06/10/2026): em todo carro; sem WhatsApp do motorista, só baixa.
    const imagemBtn = '<button class="ds-btn ds-btn--primario ds-btn--icone ds-btn--sm guia-img-btn" title="Baixar a imagem desta viagem e abrir o WhatsApp do motorista"'
      + ' onclick="event.stopPropagation();guiaImagemViagem(\'' + chaveCarroGuia(v) + '\', this)">'
      + '<i class="ti ti-photo-down" aria-hidden="true"></i></button>';

    const statusConf = document.getElementById('gFiltroStatusConf').value;
    const pax = [...v.passageiros]
      .filter(p => !statusConf || guiaStatusCasa(p.statusConfirmacao, statusConf))
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
      .map(p => cardPassageiroGuiaHTML(p, chaveCarroGuia(v), v.passageiros.indexOf(p))).join('') || '<div class="guia-vazio">Nenhum paciente.</div>';

    return `
      <div class="card-veiculo" id="guia-card-${v.placa}">
        <div class="cv-topo ${recolhido ? 'recolhido' : ''}" onclick="alternarGuiaCard('${chaveCarroGuia(v)}')">
          <div class="cv-topo-left">
            <span class="seta-sanfona">▼</span>
            <span class="cv-hora-saida ${v.horaEmbarque ? '' : 'vazia'}">${v.horaEmbarque || '--:--'}</span>
            <span class="cv-rota">${rotaHTML}</span>
          </div>
          <div class="cv-topo-right">
            ${cvAvisoSeloHTML(v)}
            <div class="cv-topo-item"><span class="${badgeVagasClasse}">${textoVagas}</span></div>
            <div class="cv-topo-item tipo-label">${v.tipo}</div>
            <div class="cv-topo-item"><span class="placa-badge">${v.placa}</span></div>
            <div class="cv-topo-item"><span class="cat-badge ${isTerc ? 'terc' : ''}">${v.categoria === 'publico' ? 'Púb' : 'Terc'}</span></div>
            ${motoristaGuiaHTML(v)}
            <div class="cv-topo-item"><button class="ds-btn ds-btn--perigo-suave ds-btn--sm guia-aviso-btn" title="Escrever, mudar ou remover o aviso urgente deste carro" onclick="event.stopPropagation();abrirAvisoGuia('${chaveCarroGuia(v)}')"><i class="ti ti-alert-triangle" aria-hidden="true"></i>Aviso</button></div>
            ${whatsappBtn}
            ${imagemBtn}
          </div>
        </div>
        <div class="cv-corpo ${recolhido ? 'recolhido' : ''}">
          <div class="cv-corpo-inner">${cvAvisoFaixaHTML(v)}${pax}</div>
        </div>
      </div>`;
  }

  function cardPassageiroGuiaHTML(p, placa, pos) {
    const esc = s => !s ? '' : s.toString().split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
    const idade = calcularIdade(p.nascimento);
    const idadeTxt = idade.semData ? '' : idade.anos + ' anos';   // sem data, sem idade (passo 4.4)
    const temObs = temRestricaoReal(p.observacao);
    const local = esc(p.local) || '—';
    const tel = esc(p.telefones) || '—';
    const temAcomp = p.acompanhante && p.acompanhante.trim();
    const acomp = temAcomp ? esc(p.acompanhante) : 'Sem acompanhante';
    const telAcomp = esc(p.telefonesAcomp);

    // Mesmos alertas da Aba 2 (cadeirinha, idoso sem acompanhante, etc.), adaptados para a guia:
    // - remove o "Idoso (acompanhante OK)" (quando está tudo certo, não polui)
    // - CTB (cadeirinha/bebê/elevação/cinto) sem emoji; "IDOSO SEM ACOMPANHANTE" mantém o ⚠️
    const al = regrasIdade(p).filter(a => !/acompanhante OK/i.test(a.label));
    const nv = nivelMaisAlto(al);
    const pills = al.map(a => {
      const conteudo = /SEM ACOMPANHANTE/i.test(a.label) ? `${a.icone} ${a.label}` : a.label;
      return `<span class="alerta-pill a-${a.nivel}" title="${a.dica}">${conteudo}</span>`;
    }).join('');

    let linhas = '';
    let embReal = p.enderecoEmbarque;
    if (embReal === "Endereço do paciente") embReal = p.enderecoResidencia || embReal;
    const embTexto = embReal ? esc(embReal) : '';
    if (embTexto) linhas += `<div class="gp-info"><b>Local de embarque:</b> ${embTexto}</div>`;
    linhas += `<div class="gp-info"><b>Local de atendimento:</b> ${local}</div>`;
    linhas += `<div class="gp-info"><b>Telefone:</b> ${tel}</div>`;
    linhas += `<div class="gp-info"><b>Acompanhante:</b> ${acomp}</div>`;
    if (temAcomp && telAcomp) linhas += `<div class="gp-info"><b>Telefone do acompanhante:</b> ${telAcomp}</div>`;
    // 🔑 A Guia é o último ponto antes de o carro sair, e é aqui que as ligações do dia
    // acontecem — se o aviso de cancelamento vale em algum lugar, vale mais neste.
    if (p.pedidoCancelado) {
      linhas += `<div class="gp-obs" style="background:var(--ds-perigo-fundo);border-color:var(--ds-perigo-borda);color:var(--ds-perigo-texto);font-weight:700;">🚫 PEDIDO CANCELADO NO POSTO — confira antes de sair</div>`;
    }
    if (temObs) linhas += `<div class="gp-obs">⚠️ ${esc(p.observacao)}</div>`;

    // Obs da Ligação (col AE). Chegava no payload desde sempre e NUNCA era exibida —
    // era dado morto. Hoje o backend escreve aqui o motivo quando anula uma
    // confirmação por mudança de horário (item 3); sem mostrar, o status voltar para
    // "Ligar" pareceria aleatório para quem já tinha ligado.
    if (p.obsLigacao) linhas += `<div class="gp-obs-lig">☎️ ${esc(p.obsLigacao)}</div>`;

    const si = statusConfInfo(p.statusConfirmacao);
    const selo = `<span class="gp-status" style="background:${si.bg};color:${si.cor};border-color:${si.bd};">${si.txt}</span>`;
    // Chave do painel = carro + identidade do passageiro (passo 4.3, 16/09). O clique leva só o carro e a
    // POSIÇÃO do passageiro nele: matrícula crua fazia dois servidores ("-") serem a mesma pessoa, e nome no
    // atributo quebraria com apóstrofo. Tudo calculado antes do template, que só recebe variáveis simples.
    const chave = placa + '|' + guiaIdPax(p);
    const chaveAttr = esc(chave);
    const ativo = estadoGuia.confAberto === chave;
    const posPax = Number(pos) > 0 ? Number(pos) : 0;
    const onclick = placa ? `onclick="abrirPainelPaxPos('${placa}',${posPax})"` : '';
    // Nome e matrícula calculados FORA do template (passo 4.1, 16/09): servidor aparece como "Servidor" e sem
    // "(mat. -)". Dentro do template ficam só variáveis simples (ver as hipóteses da faixa vermelha de 14/09).
    const nomeExib = esc(guiaNomePax(p));
    // Servidor: a matrícula dele, quando informada na Demandas (S.5, 18/09). Calculada antes do template.
    const matServ = guiaMarcadorNulo(p.nome) && !guiaMarcadorNulo(p.servidorMatricula) ? '(mat. ' + esc(p.servidorMatricula) + ')' : '';
    const matExib = (p.matricula && !guiaMarcadorNulo(p.matricula)) ? '(mat. ' + esc(p.matricula) + ')' : matServ;
    // Cancelar direto do card, embaixo do horário (05/10/2026): abre a mesma janela do Cancelar da ficha, sem
    // precisar abri-la. O clique para no botão, senão abriria a ficha junto. Calculado antes do template.
    const btnCancelar = placa
      ? '<button class="ds-btn-cancelar guia-pax-cancelar" title="Cancelar este paciente" onclick="event.stopPropagation();guiaCancelarDoCard(\'' + placa + '\',' + posPax + ')">'
        + '<i class="ti ti-user-x" aria-hidden="true"></i>Cancelar</button>'
      : '';
    const horaTxt = esc(p.hora) || '--:--';

    return `
      <div class="guia-pax-wrap">
        <div class="guia-pax ${nv === 'perigo' ? 'gp-perigo' : ''} ${ativo ? 'ativo' : ''}" ${onclick} data-gpax="${chaveAttr}" title="Clique para gerenciar ligação, WhatsApp e remanejamento">
          <div class="ds-pilha"><span class="ds-hora ds-hora--sm gp-hora">${horaTxt}</span>${btnCancelar}</div>
          <div class="gp-corpo">
            <div class="gp-nome">${nomeExib} ${matExib}<span class="gp-idade">${idadeTxt}</span>${pills}</div>
            ${linhas}
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0;">
            ${selo}
            <span class="gp-cidade">${esc(p.cidade) || '—'}</span>
          </div>
          <i class="ti ti-chevron-right gp-seta" aria-hidden="true"></i>
        </div>
      </div>`;
  }

  // Contadores de status (fila de trabalho): conta TODOS os passageiros do dia,
  // independentemente dos filtros; clicar num chip aplica o filtro de confirmação.
  function renderContadoresGuia() {
    const el = document.getElementById('guiaContadores');
    if (!el) return;
    const cont = { 'Pendente': 0, 'Confirmado': 0, 'Não atende': 0, 'Enviada por WhatsApp': 0 };
    let total = 0;
    estadoGuia.veiculosSalvos.forEach(v => v.passageiros.forEach(p => {
      const s = p.statusConfirmacao || 'Pendente';
      if (cont[s] === undefined) cont[s] = 0;
      cont[s]++; total++;
    }));
    const ativo = document.getElementById('gFiltroStatusConf').value;
    const defs = [
      { val: '', rot: 'Todos', n: total, bg: '#fff', cor: 'var(--ds-texto)', bd: 'var(--ds-borda-forte)' },
      { val: 'Pendente', rot: '<i class="ti ti-phone" style="font-size:11px;" aria-hidden="true"></i> Ligar', n: cont['Pendente'], bg: 'var(--ds-superficie-3)', cor: 'var(--ds-texto-2)', bd: 'var(--ds-borda)' },
      { val: 'Confirmado', rot: 'Confirmados', n: cont['Confirmado'] + (cont['Confirmado por WhatsApp'] || 0), bg: 'var(--ds-sucesso-fundo)', cor: 'var(--ds-sucesso-texto)', bd: 'var(--ds-sucesso-borda)' },
      { val: 'Enviada por WhatsApp', rot: 'Enviados', n: cont['Enviada por WhatsApp'], bg: 'var(--ds-marca-50)', cor: 'var(--ds-marca-700)', bd: 'var(--ds-marca-200)' },
      { val: 'Não atende', rot: 'Não atende', n: cont['Não atende'], bg: 'var(--ds-atencao-fundo)', cor: 'var(--ds-atencao-texto)', bd: 'var(--ds-atencao-borda)' }
    ];
    el.innerHTML = defs.map(d =>
      `<span class="gcont-chip ${ativo === d.val ? 'gcont-ativo' : ''}" style="background:${d.bg};color:${d.cor};border-color:${d.bd};" onclick="filtrarStatusGuia('${d.val}')">${d.rot} <b>${d.n}</b></span>`
    ).join('');
  }

  // Filtro de confirmação (11/11/2026): "Confirmado" vale para os dois jeitos de confirmar (ligação e WhatsApp).
  function guiaStatusCasa(status, filtro) {
    const st = (status || 'Pendente').toString().trim();
    if (filtro === 'Confirmado') return st === 'Confirmado' || st === 'Confirmado por WhatsApp';
    return st === filtro;
  }

  function filtrarStatusGuia(val) {
    document.getElementById('gFiltroStatusConf').value = val;
    renderGuia();
  }

  function statusConfInfo(status) {
    status = status || 'Pendente';
    const map = {
      'Pendente':             { txt: '<i class="ti ti-phone" style="font-size:11px; margin-right:3px;"></i>Ligar',   bg: 'var(--ds-superficie-3)', cor: 'var(--ds-texto-2)', bd: 'var(--ds-borda)' },
      'Confirmado':           { txt: 'Confirmado', bg: 'var(--ds-sucesso-fundo)', cor: 'var(--ds-sucesso-texto)', bd: 'var(--ds-sucesso-borda)' },
      'Confirmado por WhatsApp': { txt: '<i class="ti ti-brand-whatsapp" style="font-size:11px; margin-right:3px;"></i>Confirmado', bg: 'var(--ds-sucesso-fundo)', cor: 'var(--ds-sucesso-texto)', bd: 'var(--ds-sucesso-borda)' },
      'Não atende':           { txt: 'Não atende', bg: 'var(--ds-atencao-fundo)', cor: 'var(--ds-atencao-texto)', bd: 'var(--ds-atencao-borda)' },
      'Enviada por WhatsApp': { txt: 'Enviado',    bg: 'var(--ds-marca-50)', cor: 'var(--ds-marca-700)', bd: 'var(--ds-marca-200)' }
    };
    return map[status] || map['Pendente'];
  }

  // ===================== AÇÕES AO VIVO (Fase 1) =====================
  // 🔁 Trocar motorista (e carro) passou a existir SÓ na Formação da escala (10/11/2026, pedido do Hélio). A troca
  // daqui era desfeita sem aviso quando alguém gravava a Formação (item 29). O botão continua no cabeçalho do
  // carro, de servidor e de terceirizado, e abre Escala de Viagens → Formação da escala na data, com o carro
  // destacado. Saíram iniciarTrocaMotorista, cancelarTrocaMotorista, confirmarTrocaMotorista e a lista da troca.
  function motoristaGuiaHTML(v) {
    // Dois motoristas (11/11/2026): "Fulano / Ciclano (2º)", ou "2º a definir" até a Formação escolher.
    const nome = (v.motoristaAtribuido || '(Sem motorista)')
      + (v.doisMotoristas ? ' / ' + (v.motorista2 || '2º a definir') + ' (2º)' : '');
    return `<div class="cv-topo-item motorista-wrap">
      <span class="motorista-label">${escGuia(nome)}</span>
      <button class="guia-troca-btn" title="Trocar motorista ou carro na Formação da escala" onclick="event.stopPropagation();guiaAbrirFormacao('${chaveCarroGuia(v)}')"><i class="ti ti-user-cog" aria-hidden="true"></i></button>
    </div>`;
  }

  function guiaAbrirFormacao(chave) {
    const v = carroDaChave(chave);
    const data = document.getElementById('gFiltroData').value;
    const aba = document.querySelector('.ds-nav-aba[onclick*="escala\'"]');
    if (aba) aba.click();
    if (typeof escFAbrirEm === 'function') escFAbrirEm(data, v ? (v.idViagem || v.placa) : '');
    else toast('Abra Escala de Viagens → Formação da escala para trocar o motorista.', 'aviso');
  }

  // --- Alteração de pacientes: transferir (1→1) e trocar (swap) de carro ---
  // ⚠️ O carro na Guia é a VIAGEM (`c.chave`, desde a MF4 de 27/08); a placa de verdade é `c.v.placa`. O servidor
  // procura o paciente pela placa: mandar a chave fazia toda ação do painel dar "não encontrado" (passo 2.1b, 15/09).
  function transferirPaciente(placaDestino) {
    if (!placaDestino) return;
    const c = _confAtual();
    if (!c || !c.p || !c.v) return;
    const vd = carroDaChave(placaDestino);
    if (!vd) { toast('O carro de destino não está mais na tela. Recarregue.', 'erro'); return; }
    if (vd === c.v) { toast('O paciente já está neste carro.', 'erro'); return; }
    const data = document.getElementById('gFiltroData').value;
    const destTxt = vd ? `${escGuia(vd.tipo)} ${escGuia(vd.placa)} (${escGuia(vd.horaEmbarque || '--:--')} · ${escGuia(destinoDe(vd))})` : escGuia(placaDestino);
    const resetSel = function () { const s = document.getElementById('gTransferirSel'); if (s) s.value = ''; };
    guiaModalConfirmar(
      'Transferir paciente',
      `Mover <b>${escGuia(guiaNomePax(c.p))}</b> do carro <b>${escGuia(c.v.placa)}</b> para <b>${destTxt}</b>?<br><br>O paciente volta para <b>Pendente</b> (carro/horário mudaram) e gera uma tarefa na Lista de Tarefas.`,
      'Confirmar transferência', 'primario',
      function () {
        guiaModalLoading('Transferindo...');
        chamarServidor('moverPacienteAlocado', [data, c.v.placa, c.mat, vd.placa, getOperador(), vd.idViagem || ''], function (dados) { estadoGuia.confAberto = ''; fecharPainelPax(); carregarGuia(dados, true); guiaModalSucesso('Paciente transferido!'); if (typeof atualizarBadgeKanban === 'function') atualizarBadgeKanban(); }, function (e) { guiaModalFechar(); toast('Erro: ' + e, 'erro'); resetSel(); });
      },
      resetSel
    );
  }

  function trocarPaciente(valor) {
    if (!valor) return;
    const c = _confAtual();
    if (!c || !c.p || !c.v) return;
    const sep = valor.indexOf('|');
    const placaOutro = valor.slice(0, sep);
    const matOutro = valor.slice(sep + 1);
    const vOutro = carroDaChave(placaOutro);
    const pOutro = vOutro && guiaAcharPax(vOutro.passageiros, matOutro);
    const resetSel = function () { const s = document.getElementById('gTpaxBusca'); if (s) s.value = ''; };
    if (!vOutro || !pOutro) { toast('Paciente para troca não encontrado.', 'erro'); resetSel(); return; }
    const data = document.getElementById('gFiltroData').value;

    const criarCard = (pp, vv) => `
      <div class="gm-troca-card">
        <div class="gm-card-header">
          <div class="gm-avatar">${escGuia((guiaNomePax(pp) || '?').charAt(0).toUpperCase())}</div>
          <div class="gm-card-nome">${escGuia(guiaNomePax(pp))}</div>
        </div>
        <div class="gm-card-linha"><i class="ti ti-map-pin"></i> ${escGuia(pp.cidade || destinoDe(vv))} &nbsp;|&nbsp; <i class="ti ti-clock"></i> ${escGuia(vv.horaEmbarque || '--:--')}</div>
        <div class="gm-card-linha"><i class="ti ti-car"></i> ${escGuia(vv.tipo)} (${escGuia(vv.placa)})</div>
      </div>`;
    const msg = `
      <div class="gm-troca-container">
        <div class="gm-troca-col">
          <div class="gm-troca-titulo">1. Situação Atual:</div>
          ${criarCard(c.p, c.v)}
          ${criarCard(pOutro, vOutro)}
        </div>
        <div class="gm-troca-meio"><i class="ti ti-arrows-exchange"></i><span>Inverter<br>Carros</span></div>
        <div class="gm-troca-col">
          <div class="gm-troca-titulo">2. Como ficará após troca:</div>
          ${criarCard(c.p, vOutro)}
          ${criarCard(pOutro, c.v)}
        </div>
      </div>
      <div class="gm-aviso-final">Os dois voltam para Pendente e geram tarefa na Lista de Tarefas.</div>`;
    guiaModalConfirmar('Trocar pacientes de carro', msg, 'Confirmar Troca', 'primario',
      function () {
        guiaModalLoading('Trocando pacientes...');
        chamarServidor('trocarPacienteAlocado', [data, c.v.placa, c.mat, vOutro.placa, matOutro, getOperador()], function (dados) { estadoGuia.confAberto = ''; fecharPainelPax(); carregarGuia(dados, true); guiaModalSucesso('Troca concluída!'); if (typeof atualizarBadgeKanban === 'function') atualizarBadgeKanban(); }, function (e) { guiaModalFechar(); toast('Erro: ' + e, 'erro'); resetSel(); });
      },
      resetSel
    );
  }

  // ---- Busca da troca de pacientes (passo 4.2b, 16/09) ----
  // Era uma lista suspensa com todos os nomes. Agora é um campo: clicar mostra todos; digitar vai filtrando
  // (sem acento, sem diferença de maiúscula, cada palavra em qualquer parte de nome, cidade, hora, tipo e placa).
  // Mesmo jeito do "local da consulta" do encaixe na Demandas: setas, Enter e Esc.
  function guiaNormBusca(s) {
    return (s == null ? '' : s.toString()).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function guiaTpaxAchar(texto) {
    const palavras = guiaNormBusca(texto).split(' ').filter(Boolean);
    const achados = [];
    (estadoGuia.tpaxOpcoes || []).forEach(function (o, i) {
      const alvo = guiaNormBusca(o.nome + ' ' + o.detalhe);
      if (palavras.every(function (w) { return alvo.indexOf(w) > -1; })) achados.push(i);
    });
    return achados;
  }
  function guiaTpaxFiltrar(texto) {
    const cx = document.getElementById('gTpaxSug');
    if (!cx) return;
    const achados = guiaTpaxAchar(texto);
    estadoGuia.tpaxVisiveis = achados;
    estadoGuia.tpaxIdx = -1;
    cx.innerHTML = achados.length ? achados.map(function (i) {
      const o = estadoGuia.tpaxOpcoes[i];
      const nome = escGuia(o.nome);
      const det = escGuia(o.detalhe);
      return `<div class="guia-tpax-item" onmousedown="event.preventDefault(); guiaTpaxEscolher(${i})"><span class="guia-tpax-nome">${nome}</span><span class="guia-tpax-det">${det}</span></div>`;
    }).join('') : '<div class="guia-tpax-vazio">Nenhum paciente com esse texto.</div>';
    cx.classList.add('on');
  }
  function guiaTpaxEscolher(i) {
    const o = (estadoGuia.tpaxOpcoes || [])[i];
    if (!o) return;
    const campo = document.getElementById('gTpaxBusca');
    if (campo) campo.value = o.nome;
    guiaTpaxFechar();
    trocarPaciente(o.valor);
  }
  function guiaTpaxFechar() {
    const cx = document.getElementById('gTpaxSug');
    if (cx) { cx.classList.remove('on'); cx.innerHTML = ''; }
    estadoGuia.tpaxIdx = -1;
  }
  function guiaTpaxTecla(ev) {
    const cx = document.getElementById('gTpaxSug');
    if (!cx || !cx.classList.contains('on')) return;
    if (ev.key === 'Escape') { ev.preventDefault(); guiaTpaxFechar(); return; }
    const vis = estadoGuia.tpaxVisiveis || [];
    if (vis.length === 0) return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      let k = estadoGuia.tpaxIdx + (ev.key === 'ArrowDown' ? 1 : -1);
      if (k > vis.length - 1) k = 0;
      if (0 > k) k = vis.length - 1;
      estadoGuia.tpaxIdx = k;
      const itens = cx.querySelectorAll('.guia-tpax-item');
      itens.forEach(function (el, j) { el.classList.toggle('on', j === k); });
      if (itens[k] && itens[k].scrollIntoView) itens[k].scrollIntoView({ block: 'nearest' });
      return;
    }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      // Enter escolhe o marcado pelas setas; sem marcado, só escolhe se sobrou um único paciente.
      const k = estadoGuia.tpaxIdx > -1 ? estadoGuia.tpaxIdx : (vis.length === 1 ? 0 : -1);
      if (k > -1) guiaTpaxEscolher(vis[k]);
    }
  }

  // ===================== SANFONA DE CONFIRMAÇÃO (Fase 2) =====================
  function soDigitos(t) { return (t || '').toString().replace(/\D/g, ''); }

  function _confAtual() {
    if (!estadoGuia.confAberto) return null;
    const i = estadoGuia.confAberto.indexOf('|');
    const placa = estadoGuia.confAberto.slice(0, i);
    const mat = estadoGuia.confAberto.slice(i + 1);
    const v = carroDaChave(placa);
    const p = v && guiaAcharPax(v.passageiros, mat);
    // `placa` aqui é a PLACA DE VERDADE (o backend precisa dela para achar a linha);
    // `chave` é a viagem. Devolver a chave como se fosse placa faria toda ação de
    // paciente procurar um carro que não existe na planilha.
    return { chave: placa, placa: v ? v.placa : placa, mat: mat, v: v, p: p };
  }

  let abaAtivaDrawerGuia = 'ligacao';

  // Clique do card (passo 4.3): acha o passageiro pela posição no carro e abre o painel pela identidade.
  function abrirPainelPaxPos(chaveCarro, pos) {
    const v = carroDaChave(chaveCarro);
    const p = v && v.passageiros[pos];
    if (!p) { toast('Passageiro não encontrado. Recarregue a tela.', 'erro'); return; }
    abrirPainelPax(chaveCarro, guiaIdPax(p));
  }

  // `mat` é a IDENTIDADE do passageiro (guiaIdPax) desde o passo 4.3 — é ela que vai ao servidor.
  function abrirPainelPax(placa, mat) {
    estadoGuia.confAberto = placa + '|' + (mat || '');
    const c = _confAtual();
    if (!c || !c.p || !c.v) {
      fecharPainelPax();
      return;
    }

    const p = c.p;
    const v = c.v;

    atualizarHeaderDrawerGuia(p, v, placa);

    // Render contents of the active tab
    renderDrawerConteudoGuia(abaAtivaDrawerGuia);

    // Open drawer
    const drawerEl = document.getElementById('guiaSlideDrawer');
    const overEl = document.getElementById('guiaDrawerOverlay');
    if (drawerEl) drawerEl.classList.add('aberto');
    if (overEl) overEl.classList.add('aberto');

    // Destaca o card aberto pela marca data-gpax (o clique não carrega mais a matrícula para comparar).
    const aberto = estadoGuia.confAberto;
    document.querySelectorAll('.guia-pax').forEach(function (el) {
      el.classList.toggle('ativo', el.getAttribute('data-gpax') === aberto);
    });
  }

  function fecharPainelPax() {
    estadoGuia.confAberto = '';
    const d = document.getElementById('guiaSlideDrawer');
    const o = document.getElementById('guiaDrawerOverlay');
    if (d) d.classList.remove('aberto');
    if (o) o.classList.remove('aberto');
    document.querySelectorAll('.guia-pax').forEach(function (el) { el.classList.remove('ativo'); });
  }

  // Cabeçalho da ficha (pedido do Hélio, 11/11/2026), em três linhas:
  //   [nome] [idade]
  //   [hora de saída do veículo] - [modelo placa]
  //   [cidade destino] - [local destino]
  function atualizarHeaderDrawerGuia(p, v, placa) {
    const nomeEl = document.getElementById('guiaDNomePax');
    if (!nomeEl) return;
    nomeEl.textContent = guiaNomePax(p) || '—';
    const idade = (typeof calcularIdade === 'function') ? calcularIdade(p.nascimento) : null;
    document.getElementById('guiaDIdade').textContent = (idade && !idade.semData) ? idade.anos + ' anos' : '';
    const carro = [v.tipo || '', v.placa || placa || ''].filter(Boolean).join(' ');
    document.getElementById('guiaDLinha1').innerHTML = '<b>' + escGuia(v.horaEmbarque || '--:--') + '</b> - ' + escGuia(carro || '—');
    const cidade = p.cidade || destinoDe(v) || '—';
    document.getElementById('guiaDLinha2').innerHTML = '<b>' + escGuia(cidade) + '</b>' + (p.local ? ' - ' + escGuia(p.local) : '');
    guiaMarcarBotoesStatus((p.statusConfirmacao || 'Pendente').toString().trim());
  }

  // Botão aceso = o resultado gravado do contato.
  function guiaMarcarBotoesStatus(st) {
    const marca = function (id, valor) { const b = document.getElementById(id); if (b) b.classList.toggle('ativo', st === valor); };
    marca('guiaBtnConf', 'Confirmado');
    marca('guiaBtnConfZap', 'Confirmado por WhatsApp');
    marca('guiaBtnNao', 'Não atende');
  }

  function trocarAbaDrawerGuia(aba) {
    abaAtivaDrawerGuia = aba;
    document.querySelectorAll('.guia-d-tab').forEach(function (t) { t.classList.remove('ativo'); });
    const idBtn = (aba === 'ligacao') ? 'guiaTabBtnLigacao' : ((aba === 'zap') ? 'guiaTabBtnZap' : 'guiaTabBtnMover');
    const btn = document.getElementById(idBtn);
    if (btn) btn.classList.add('ativo');
    renderDrawerConteudoGuia(aba);
  }

  function selecionarQuemAtendeuChip(texto) {
    document.querySelectorAll('.guia-chip-atendeu').forEach(function (c) { c.classList.remove('sel'); });
    const chips = Array.from(document.querySelectorAll('.guia-chip-atendeu'));
    const achado = chips.find(function (c) { return c.textContent === texto; });
    if (achado) achado.classList.add('sel');

    const inpHidden = document.getElementById('gdQuemAtendeu');
    const inpOutro = document.getElementById('gdQuemOutro');
    if (texto === 'Outro…') {
      if (inpHidden) inpHidden.value = inpOutro ? inpOutro.value : '';
      if (inpOutro) { inpOutro.style.display = 'block'; inpOutro.focus(); }
    } else {
      if (inpHidden) inpHidden.value = texto;
      if (inpOutro) inpOutro.style.display = 'none';
    }
  }

  function dispararWhatsappGuia(tel) {
    const el = document.getElementById('gdFone');
    if (el) el.value = tel;
    enviarWhatsappPaciente();
  }

  function renderDrawerConteudoGuia(aba) {
    const c = _confAtual();
    if (!c || !c.p || !c.v) return;
    const p = c.p;
    const v = c.v;
    const cont = document.getElementById('guiaDrawerContent');
    if (!cont) return;

    if (aba === 'ligacao') {
      const opcoesPadrao = ['Paciente', 'Mãe', 'Pai', 'Cônjuge', 'Filho(a)', 'Acompanhante', 'Vizinho'];
      const quemAtual = (p.quemAtendeu || '').toString().trim();
      const ehOutro = quemAtual && !opcoesPadrao.includes(quemAtual);

      const chipsHtml = opcoesPadrao.map(function (o) {
        const sel = o === quemAtual;
        return `<span class="guia-chip-atendeu ${sel ? 'sel' : ''}" onclick="selecionarQuemAtendeuChip('${escGuia(o)}')">${escGuia(o)}</span>`;
      }).join('') + `<span class="guia-chip-atendeu ${ehOutro ? 'sel' : ''}" onclick="selecionarQuemAtendeuChip('Outro…')">Outro…</span>`;

      const avisoAnulacao = p.obsLigacao ? `
        <div style="background:var(--ds-marca-50);border:1px solid var(--ds-marca-200);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--ds-marca-700);display:flex;align-items:flex-start;gap:8px;">
          <i class="ti ti-info-circle" style="font-size:16px;flex-shrink:0;margin-top:1px;"></i>
          <div><b>Confirmação anterior anulada:</b> ${escGuia(p.obsLigacao)}</div>
        </div>` : '';

      cont.innerHTML = `
        <div class="guia-tab-pane ativo">
          ${avisoAnulacao}
          <div class="guia-campo">
            <label class="gd-campo-lbl">Quem atendeu a chamada?</label>
            <div class="guia-atendeu-chips">${chipsHtml}</div>
            <input type="hidden" id="gdQuemAtendeu" value="${escGuia(quemAtual || 'Paciente')}">
            <input id="gdQuemOutro" class="gd-input" style="display:${ehOutro ? 'block' : 'none'}; margin-top:6px;" placeholder="Especifique quem atendeu" value="${ehOutro ? escGuia(quemAtual) : ''}" oninput="document.getElementById('gdQuemAtendeu').value = this.value">
          </div>

          <div class="guia-campo" style="margin-top:6px;">
            <label class="gd-campo-lbl">Restrição / Observação (atualize se a ligação trouxe algo novo)</label>
            <textarea id="gdObs" class="gd-txt" placeholder="ex.: cadeirante; levar receitas; ligar após as 14h">${escGuia(p.observacao || '')}</textarea>
          </div>

          <div style="display:flex;justify-content:flex-end;margin-top:4px;">
            <button class="gd-btn ok" style="flex:none;padding:7px 14px;font-size:12px;" onclick="registrarConfirmacaoPanel()">
              <i class="ti ti-device-floppy"></i> Salvar anotações
            </button>
          </div>

          <div style="background:var(--ds-superficie-2);border:1px solid var(--ds-borda);border-radius:8px;padding:10px 12px;font-size:11.5px;color:var(--ds-texto-3);line-height:1.45;margin-top:8px;">
            <i class="ti ti-info-circle" style="color:var(--ds-marca-600);"></i>
            <b>Regra do setor:</b> Apenas a alteração no horário de saída do carro invalida a confirmação com o paciente.
          </div>
        </div>`;
      return;
    }

    if (aba === 'zap') {
      // 📵 Telefone FIXO não tem WhatsApp (defeito 6, 05/10): aparece na lista, mas sem o "Enviar", como na
      // Remoção Interna. Quem classifica é o processarTelefone (global, do bloco da Remoção Interna).
      const ehFixo = function (t) {
        const r = (typeof processarTelefone === 'function') ? processarTelefone(t) : [];
        return !!(r[0] && r[0].tipo === 'fixo');
      };
      const fones = [];
      (p.telefones || '').split('/').forEach(function (t) { if (t && t.trim()) fones.push({ lab: formatarTelefonesWpp(t), dig: soDigitos(t), tipo: 'Paciente (Principal)', fixo: ehFixo(t) }); });
      (p.telefonesAcomp || '').split('/').forEach(function (t) { if (t && t.trim()) fones.push({ lab: formatarTelefonesWpp(t), dig: soDigitos(t), tipo: 'Acompanhante', fixo: ehFixo(t) }); });
      const primeiroCelular = fones.filter(function (f) { return !f.fixo; })[0];
      const primeiroFone = primeiroCelular ? primeiroCelular.dig : '';

      const fonesCards = fones.length ? fones.map(function (f) {
        const acao = f.fixo
          ? '<span class="guia-cz-fixo"><i class="ti ti-phone"></i>Fixo, sem WhatsApp</span>'
          : '<button class="guia-btn-zap" onclick="dispararWhatsappGuia(\'' + f.dig + '\')"><i class="ti ti-brand-whatsapp"></i> Enviar</button>';
        return `
        <div class="guia-card-zap${f.fixo ? ' fixo' : ''}">
          <div class="guia-cz-esq">
            <span class="guia-cz-tel">${escGuia(f.lab)}</span>
            <span class="guia-cz-tipo">${escGuia(f.tipo)}</span>
          </div>
          ${acao}
        </div>`;
      }).join('') : '<div style="font-size:12px;color:var(--ds-texto-inativo);">Nenhum telefone cadastrado para este paciente.</div>';

      const dataOp = document.getElementById('gFiltroData').value;
      const previaMsg = (typeof gerarMensagemPacienteWhatsapp === 'function')
        ? escGuia(gerarMensagemPacienteWhatsapp(p, v, dataOp)).split('\n').join('<br>')
        : 'Mensagem da viagem...';

      cont.innerHTML = `
        <div class="guia-tab-pane ativo">
          <div class="guia-campo">
            <label class="gd-campo-lbl">Telefones disponíveis para envio</label>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">
              ${fonesCards}
            </div>
          </div>

          <div class="guia-campo" style="margin-top:8px;">
            <label class="gd-campo-lbl">Ou digite outro número (com DDD)</label>
            <div class="gd-fone-envio" style="margin-top:4px;">
              <input id="gdFone" class="gd-input" value="${primeiroFone}" placeholder="DDD + número">
              <button class="gd-btn ok" style="flex:none;" onclick="enviarWhatsappPaciente()"><i class="ti ti-send"></i> Enviar</button>
            </div>
          </div>

          <div class="guia-campo" style="margin-top:10px;">
            <label class="gd-campo-lbl">Prévia da mensagem que será enviada</label>
            <div style="background:var(--ds-sucesso-fundo);border:1px solid var(--ds-sucesso-borda);border-radius:8px;padding:12px;font-size:12px;color:var(--ds-sucesso-texto);line-height:1.5;margin-top:4px;">
              ${previaMsg}
            </div>
          </div>
        </div>`;
      return;
    }

    if (aba === 'mover') {
      // ⚠️ `placa` (c.placa) é a placa de verdade; o carro na Guia é a VIAGEM (c.chave). Procurar o carro atual
      // pela placa dava vazio desde 10/09: a troca não listava ninguém e a transferência oferecia o próprio
      // carro (achado no teste de 16/09, passo 4.2a).
      const vAtual = c.v;
      const serveCidade = (vv, cid) => destinoDe(vv) === cid || (vv.roteiro && vv.roteiro.includes(cid));
      const livresDe = vv => (vv.limite || 4) - vv.passageiros.reduce((s, x) => s + Number(x.quantidade || 1), 0) - (vv.bloqueados || 0);
      const qtdPac = Number(p.quantidade || 1);

      const carrosDestino = estadoGuia.veiculosSalvos.filter(function (vv) {
        return vv !== vAtual && chaveCarroGuia(vv) !== c.chave && serveCidade(vv, p.cidade) && livresDe(vv) >= qtdPac;
      });

      const carrosCardsHtml = carrosDestino.length ? carrosDestino.map(function (vv) {
        return `
        <div class="guia-cand-card">
          <div class="guia-cand-esq">
            <div class="guia-cand-l1">
              <span class="gp-hora" style="font-size:11.5px;padding:1px 6px;">${escGuia(vv.horaEmbarque || '--:--')}</span>
              <span>${escGuia(vv.tipo)} • ${escGuia(vv.placa)}</span>
            </div>
            <div class="guia-cand-l2">
              Destino: <b>${escGuia(destinoDe(vv))}</b> • Motorista: ${escGuia(vv.motoristaAtribuido || '(sem motorista)')} • <b style="color:var(--ds-sucesso);">${livresDe(vv)} vaga(s) livre(s)</b>
            </div>
          </div>
          <button class="guia-btn-transf" onclick="transferirPaciente('${escGuia(chaveCarroGuia(vv))}')">
            Transferir
          </button>
        </div>`;
      }).join('') : '<div style="font-size:12px;color:var(--ds-texto-inativo);padding:8px 0;">Não há outros carros para este destino com vagas livres suficientes.</div>';

      // Candidatos da troca ficam no estado; a lista da busca leva só a posição de cada um (passo 4.2b, 16/09).
      const opcoesTroca = [];
      estadoGuia.veiculosSalvos.forEach(function (vv) {
        if (vv === vAtual || chaveCarroGuia(vv) === c.chave || !serveCidade(vv, p.cidade)) return;
        vv.passageiros.forEach(function (p2) {
          if (!vAtual || !serveCidade(vAtual, p2.cidade)) return;
          const qtd2 = Number(p2.quantidade || 1);
          if (qtdPac - qtd2 > livresDe(vv) || qtd2 - qtdPac > livresDe(vAtual)) return;
          const lug = qtd2 > 1 ? ' · ' + qtd2 + ' lug.' : '';
          opcoesTroca.push({
            valor: chaveCarroGuia(vv) + '|' + guiaIdPax(p2),
            nome: guiaNomePax(p2) || '—',
            detalhe: (p2.cidade || destinoDe(vv)) + ' · ' + (vv.horaEmbarque || '--:--') + ' · ' + (vv.tipo || '') + ' ' + (vv.placa || '') + lug
          });
        });
      });
      // Ordem alfabética (pedido do Hélio, 16/09): sem diferença de acento e maiúscula; empate vai pela hora do carro.
      opcoesTroca.sort(function (a, b) {
        return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }) || a.detalhe.localeCompare(b.detalhe, 'pt-BR');
      });
      estadoGuia.tpaxOpcoes = opcoesTroca;
      estadoGuia.tpaxVisiveis = [];
      estadoGuia.tpaxIdx = -1;
      // Sem template dentro de template: o campo é montado aqui e entra abaixo como variável simples.
      const trocaHtml = opcoesTroca.length ? `
            <input type="text" id="gTpaxBusca" class="gd-input" autocomplete="off" style="margin-top:6px;"
                   placeholder="Clique para ver todos, ou digite nome, cidade, hora ou placa"
                   onfocus="guiaTpaxFiltrar(this.value)" onclick="guiaTpaxFiltrar(this.value)"
                   oninput="guiaTpaxFiltrar(this.value)" onkeydown="guiaTpaxTecla(event)" onblur="guiaTpaxFechar()">
            <div id="gTpaxSug" class="guia-tpax-sug" onmousedown="event.preventDefault()"></div>`
        : '<div style="font-size:12px;color:var(--ds-texto-inativo);margin-top:4px;">Nenhum paciente compatível em outro carro do mesmo destino para troca direta.</div>';

      const lugaresTxt = qtdPac > 1 ? `Ocupa ${qtdPac} lugares` : 'Ocupa 1 lugar';
      const lugCor = qtdPac >= 3 ? 'background:var(--ds-perigo-fundo);border-color:var(--ds-perigo-borda);color:var(--ds-perigo-texto);'
                   : qtdPac === 2 ? 'background:var(--ds-atencao-fundo);border-color:var(--ds-atencao-borda);color:var(--ds-atencao-texto);'
                   : 'background:var(--ds-sucesso-fundo);border-color:var(--ds-sucesso-borda);color:var(--ds-sucesso-texto);';

      cont.innerHTML = `
        <div class="guia-tab-pane ativo">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11.5px;font-weight:700;border:1px solid;border-radius:12px;padding:2px 9px;${lugCor}">
              <i class="ti ti-users" style="vertical-align:-1px;"></i> ${lugaresTxt}
            </span>
          </div>

          <div class="guia-campo" style="margin-top:6px;">
            <label class="gd-campo-lbl">Transferir para outro carro com vaga (mesmo destino)</label>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">
              ${carrosCardsHtml}
            </div>
          </div>

          <div class="guia-campo" style="margin-top:10px;border-top:1px solid var(--ds-borda);padding-top:14px;">
            <label class="gd-campo-lbl">Ou trocar de lugar com paciente de outro carro (Swap)</label>
            ${trocaHtml}
          </div>
        </div>`;
      return;
    }
  }

  function getQuemAtendeuPanel() {
    const hidden = document.getElementById('gdQuemAtendeu');
    if (hidden && hidden.value) {
      if (hidden.value === 'Outro…') {
        const outro = document.getElementById('gdQuemOutro');
        return (outro ? outro.value : '').trim();
      }
      return hidden.value.trim();
    }
    const sel = document.getElementById('gdQuemAtendeu');
    if (!sel) return '';
    if (sel.value === 'Outro…') return (document.getElementById('gdQuemOutro').value || '').trim();
    return sel.value;
  }

  // ===== RESULTADO DO CONTATO: a tela responde na hora (pedido do Hélio, 11/11/2026) =====
  // Antes, cada clique esperava o servidor gravar E remontar os dados do dia inteiro (o mesmo getDadosOperacao da
  // abertura da tela): uns 10 segundos sem resposta. Agora a ficha e o card mudam no clique, e a gravação corre por
  // trás. Se o servidor recusar, a tela volta ao que era e avisa. Os dados do servidor só redesenham a lista quando a
  // ÚLTIMA gravação em andamento termina: com cliques seguidos, a resposta do primeiro não desfaz o segundo na tela.
  // ⚠️ Só aqui (status do contato), que é gravação pequena e independente. Cancelar continua esperando o servidor:
  // mexe no carro e na Lista de Tarefas.
  let guiaGravacoesContato = 0;
  function guiaGravarStatusContato(c, status, quem, obs, msgOk) {
    const p = c.p;
    const antes = { st: p.statusConfirmacao, quem: p.quemAtendeu, obs: p.obsLigacao };
    p.statusConfirmacao = status;
    if (quem) p.quemAtendeu = quem;
    if (obs !== undefined) p.obsLigacao = obs;
    if (estadoGuia.confAberto === c.chave + '|' + c.mat) guiaMarcarBotoesStatus(status);
    renderGuia();
    if (msgOk) toast(msgOk, 'ok');
    guiaGravacoesContato++;
    const data = document.getElementById('gFiltroData').value;
    chamarServidor('salvarConfirmacao', [data, c.v.placa, c.mat, status, quem, obs, getOperador()], function (dados) {
        guiaGravacoesContato--;
        if (guiaGravacoesContato === 0) carregarGuia(dados, true);
      }, function (e) {
        guiaGravacoesContato--;
        p.statusConfirmacao = antes.st; p.quemAtendeu = antes.quem; p.obsLigacao = antes.obs;
        if (estadoGuia.confAberto === c.chave + '|' + c.mat) guiaMarcarBotoesStatus((antes.st || 'Pendente').toString().trim());
        renderGuia();
        toast('Não gravou o resultado de ' + escGuia(guiaNomePax(p)) + ': ' + escGuia((e && e.message) || e)
            + '. A tela voltou ao que estava.', 'erro');
      });
  }

  // Sem status (botão Salvar anotações): mantém o status ATUAL do passageiro. Antes o botão levava o status de quando
  // a aba foi desenhada, e salvar as anotações depois de Confirmou desfazia a confirmação.
  function registrarConfirmacaoPanel(status) {
    const c = _confAtual();
    if (!c || !c.p) return;
    if (status === undefined) status = c.p.statusConfirmacao || 'Pendente';
    const quem = getQuemAtendeuPanel();
    const obs = (document.getElementById('gdObs') ? document.getElementById('gdObs').value : (c.p.observacao || ''));
    guiaGravarStatusContato(c, status, quem, obs, 'Resultado registrado: ' + statusConfTexto(status) + '.');
  }

  // Texto curto do status para o aviso.
  function statusConfTexto(status) {
    const t = { 'Confirmado': 'Confirmou', 'Confirmado por WhatsApp': 'Confirmou por WhatsApp', 'Não atende': 'Não atende' };
    return t[status] || status;
  }

  // Esc fecha a ficha do paciente (pedido do Hélio, 11/11/2026). Se houver uma janela por cima dela (cancelar,
  // confirmações), o Esc é dela primeiro.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !estadoGuia.confAberto) return;
    const d = document.getElementById('guiaSlideDrawer');
    if (!d || !d.classList.contains('aberto')) return;
    const gm = document.getElementById('guiaModalOverlay');
    if ((gm && gm.classList.contains('aberto')) || document.querySelector('.ds-modal-fundo.aberto')) return;
    fecharPainelPax();
  });

  // `opcoes.doCard`: veio do botão do card (05/10/2026), não da ficha. `opcoes.aoDesistir`: chamado se o
  // operador fechar a janela sem cancelar.
  function confirmarCancelarPax(opcoes) {
    opcoes = opcoes || {};
    const c = _confAtual();
    if (!c || !c.p) return;
    const nome = guiaNomePax(c.p) || 'este paciente';
    const data = document.getElementById('gFiltroData').value;
    // 🐛 RESTRIÇÃO APAGADA (achado em 05/10/2026). "Quem atendeu" e a restrição só existem na aba "Detalhes da
    // Ligação" da ficha. Cancelando com a ficha na aba WhatsApp ou Mover / Trocar, ia '' e a restrição do
    // paciente era gravada EM BRANCO. Agora: sem o campo na tela, vai null e o servidor não mexe na coluna V;
    // "quem atendeu" fica o que já estava gravado. Pelo card, a ficha pode estar aberta com OUTRO paciente:
    // os campos dela não são lidos.
    const elObs = opcoes.doCard ? null : document.getElementById('gdObs');
    const obs = elObs ? elObs.value : null;
    const quem = (!opcoes.doCard && document.getElementById('gdQuemAtendeu')) ? getQuemAtendeuPanel() : (c.p.quemAtendeu || '');
    // Os campos da janela são os compartilhados (WhatsappFormatter): os mesmos do Cancelar de Montar Carros.
    guiaModalConfirmar('Cancelar paciente', cancelamentoCamposHTML('gm', nome), 'Confirmar cancelamento', 'perigo', function () {
      const canc = cancelamentoLer('gm');
      if (!canc) return false;   // sem justificativa: a janela fica aberta e o botão continua armado
      guiaModalLoading('Cancelando...');
      chamarServidor('salvarConfirmacao', [data, c.v.placa, c.mat, 'Cancelado', quem, obs, getOperador(), canc.texto], function (dados) {
          estadoGuia.confAberto = '';
          fecharPainelPax();
          carregarGuia(dados, true);
          guiaModalSucesso('Paciente cancelado!');
          if (typeof atualizarBadgeKanban === 'function') atualizarBadgeKanban();
        }, function (e) {
          guiaModalFechar();
          if (opcoes.aoDesistir) opcoes.aoDesistir();
          toast('Erro: ' + e, 'erro');
        });
    }, opcoes.aoDesistir);
  }

  // Cancelar pelo botão do card, embaixo do horário (05/10/2026). Acha o passageiro pela POSIÇÃO no carro, como
  // o clique do card (abrirPainelPaxPos), e abre a mesma janela da ficha, sem abrir a ficha. O confAberto passa
  // a apontar para ele só para o confirmarCancelarPax saber quem é; desistindo, volta ao que era (a ficha pode
  // estar aberta com outro paciente).
  function guiaCancelarDoCard(chaveCarro, pos) {
    const v = carroDaChave(chaveCarro);
    const p = v && v.passageiros[Number(pos) > 0 ? Number(pos) : 0];
    if (!p) { toast('Passageiro não encontrado. Recarregue a tela.', 'erro'); return; }
    const fichaAntes = estadoGuia.confAberto;
    estadoGuia.confAberto = chaveCarro + '|' + guiaIdPax(p);
    confirmarCancelarPax({ doCard: true, aoDesistir: function () { estadoGuia.confAberto = fichaAntes; } });
  }

  function selecionarTelefoneConf(dig) {
    const el = document.getElementById('gdFone');
    if (el) el.value = dig;
  }

  function enviarWhatsappPaciente() {
    const c = _confAtual();
    if (!c || !c.p) return;
    const fone = soDigitos(document.getElementById('gdFone').value);
    if (10 > fone.length) { toast('Telefone inválido para WhatsApp (precisa de DDD + número).', 'aviso'); return; }
    const dataOp = document.getElementById('gFiltroData').value;
    const msg = gerarMensagemPacienteWhatsapp(c.p, c.v, dataOp);
    // ⚠️ Endereço entre ASPAS SIMPLES, nunca entre crases (05/10/2026): as duas barras do https dentro de uma
    // crase derrubaram o script da Guia no Apps Script (skill google-script-parser-bug, sintoma E).
    window.open('https://web.whatsapp.com/send/?phone=55' + fone + '&text=' + encodeURIComponent(msg) + '&type=phone_number&app_absent=0', '_blank');
    const obs = (document.getElementById('gdObs') ? document.getElementById('gdObs').value : (c.p.observacao || ''));
    // Mesma gravação de fundo do resultado do contato (11/11/2026): a tela marca "Enviado" na hora.
    guiaGravarStatusContato(c, 'Enviada por WhatsApp', getQuemAtendeuPanel(), obs, 'WhatsApp aberto. Status: Enviada.');
  }

  // ===================== MODAL CENTRAL + ANIMAÇÕES =====================
  function escGuia(s) {
    if (!s) return '';
    return s.toString().split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
  }

  // IDENTIDADE DO PASSAGEIRO (14/09): matrícula, senão nome, senão a chave do pedido.
  // 🔴 Pedido de servidor chega com matrícula '-' e nome '-'. A Guia achava o passageiro pela
  // matrícula crua, e o servidor (codigo.gs) gravava a confirmação e o cancelamento em TODA linha
  // com aquela matrícula, sem parar na primeira: cancelar um servidor cancelava todos do carro.
  // 📌 Espelho EXATO de `_idPassageiro` (codigo.gs) e de `dmChaveP` (Demandas): a Guia manda esta
  // chave e o servidor procura a linha por ela.
  function guiaMarcadorNulo(s) {
    const t = (s == null ? '' : s.toString()).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase().split(' ').filter(Boolean).join(' ');
    return t === '' || t === '-' || t === 'N/A' || t === 'NA' || t === 'NAO INFORMADO' || t === 'SEM INFORMACAO';
  }
  function guiaIdPax(p) {
    const m = guiaMarcadorNulo(p.matricula) ? '' : (p.matricula || '').toString().trim();
    const n = guiaMarcadorNulo(p.nome) ? '' : (p.nome || '').toString().trim();
    const c = (p.chaveDemanda || '').toString().trim();
    const l = (p.idLinha || '').toString().trim();
    return (m || n || (c ? '#' + c : (l ? '@' + l : ''))).toUpperCase();
  }
  // Só exibição: servidor aparece como "Servidor", como no selo da Remoção Interna e na Demandas
  // (D2 revista, 16/09).
  function guiaNomePax(p) {
    if (guiaMarcadorNulo(p.nome) && guiaMarcadorNulo(p.matricula)) {
      // Servidor identificado (S.5, 18/09): "Servidor FULANO" — nome informado na Demandas (colunas AH/AI).
      // Vale para o card, o painel, os avisos, a troca e a mensagem de WhatsApp (wppNomePax usa esta função).
      const sn = guiaMarcadorNulo(p.servidorNome) ? '' : (p.servidorNome || '').toString().trim();
      return 'Servidor' + (sn ? ' ' + sn : '');
    }
    return p.nome || '';
  }
  // Acha o passageiro do painel e da troca (passo 4.2, 16/09). Aceita as duas chaves:
  // - a nova (identidade de `guiaIdPax`), que o card passa a mandar no 4.3;
  // - a antiga (matrícula crua, inclusive "-" ou vazia), que o card manda hoje — aí compara como sempre.
  function guiaAcharPax(lista, chave) {
    const k = (chave == null ? '' : chave).toString();
    const alvo = k.trim().toUpperCase();
    const porId = alvo ? (lista || []).find(x => guiaIdPax(x) === alvo) : null;
    return porId || (lista || []).find(x => (x.matricula || '').toString() === k);
  }

  function guiaModalAbrir(html) {
    const ov = document.getElementById('guiaModalOverlay');
    const box = document.getElementById('guiaModalBox');
    box.classList.remove('saindo');
    box.innerHTML = html;
    ov.classList.add('aberto');
  }

  function guiaModalFechar() {
    const ov = document.getElementById('guiaModalOverlay');
    const box = document.getElementById('guiaModalBox');
    box.classList.add('saindo');
    setTimeout(function () { ov.classList.remove('aberto'); box.classList.remove('saindo'); }, 250);
  }

  // ===================== MODAL NOVO ENCAIXE =====================
  // ⛔ ENCAIXE REMOVIDO DAQUI EM 27/08/2026.
  // Passou a existir num lugar só: Demandas do Dia › Carros do dia › Encaixe.
  //
  // Não foi só para evitar duas telas para a mesma ação. O encaixe daqui gravava uma
  // linha EMPOBRECIDA — bairro vazio, 'Sim' no lugar do nome do acompanhante, telefone
  // do acompanhante vazio, e 'Ida e Volta' / 'Consulta' / 'Veículo' cravados nas colunas
  // S, T e Y — porque nasceu para quem é digitado à mão e não tem histórico nenhum.
  // Era a implementação PIOR das duas, e a que vinhamos remendando a semana toda
  // (idade no lugar da data, coluna AF errada, LACEN sem bloqueio, conflito de paciente
  // sem checagem). Tirar o botão deixou apagá-la inteira, junto com o `adicionarEncaixe`
  // do backend — e com ela some uma classe inteira de divergência entre dois caminhos.
  //
  // Saíram com ele: abrirModalEncaixe, gmDecrementarQtd, gmIncrementarQtd, salvarEncaixe.

  let _guiaModalSim = null;
  let _guiaModalNao = null;
  function guiaModalConfirmar(titulo, msgHtml, labelOk, classeOk, onSim, onNao) {
    _guiaModalSim = onSim; _guiaModalNao = onNao || null;
    guiaModalAbrir(`
      <div class="gm-titulo">${escGuia(titulo)}</div>
      <div class="gm-texto">${msgHtml}</div>
      <div class="gm-acoes">
        <button class="gm-btn" onclick="guiaModalResponder(false)">Cancelar</button>
        <button class="gm-btn ${classeOk}" onclick="guiaModalResponder(true)">${escGuia(labelOk)}</button>
      </div>
    `);
  }
  function guiaModalResponder(sim) {
    const fnSim = _guiaModalSim, fnNao = _guiaModalNao;
    _guiaModalSim = null; _guiaModalNao = null;
    if (sim) {
      // 🐛 BOTÃO TRAVADO (achado em 05/10/2026). A ação pode recusar (ex.: justificativa vazia) devolvendo
      // false: a janela continua aberta e o botão tem de continuar funcionando. Antes os dois ficavam sem
      // ação e o "Confirmar" parava de responder até fechar e abrir de novo.
      if (fnSim && fnSim() === false) { _guiaModalSim = fnSim; _guiaModalNao = fnNao; }
    }
    else { guiaModalFechar(); if (fnNao) fnNao(); }
  }

  function guiaModalLoading(msg) {
    guiaModalAbrir(`
      <div style="text-align: center;">
        <div class="gm-icone gm-spin"><i class="ti ti-refresh" aria-hidden="true"></i></div>
        <div class="gm-texto">${escGuia(msg)}</div>
      </div>
    `);
  }

  function guiaModalSucesso(msg) {
    const box = document.getElementById('guiaModalBox');
    box.innerHTML = `
      <div style="text-align: center;">
        <div class="gm-icone gm-ok"><i class="ti ti-circle-check" aria-hidden="true"></i></div>
        <div class="gm-texto">${escGuia(msg)}</div>
      </div>`;
    setTimeout(guiaModalFechar, 1200);
  }

  // ===================== WHATSAPP =====================
  // Formata telefones como DDD-prefixo-sufixo (sem parênteses); várias separadas por " / ".
  function formatarTelefonesWpp(str) {
    if (!str) return '—';
    return str.split('/').map(s => {
      const d = s.replace(/\D/g, '');
      if (d.length === 11) return `${d.slice(0, 2)}-${d.slice(2, 7)}-${d.slice(7)}`;
      if (d.length === 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
      return s.trim();
    }).filter(Boolean).join(' / ');
  }

  // ===================== DOIS MOTORISTAS (11/11/2026) =====================
  // Viagem longa: um motorista na ida e outro na volta. O botão do WhatsApp continua um só; nessa viagem ele
  // abre uma janela que explica e tem um "Enviar" para cada motorista. `n` = 1 (ida) ou 2 (volta).
  function guiaDoisMotoristas(v) { return !!(v && v.doisMotoristas && v.motorista2); }
  function guiaTemZap(v) { return !!(v && (v.whatsappMotorista || (guiaDoisMotoristas(v) && v.whatsappMotorista2))); }
  function guiaNomesMotoristas(v) {
    return (v.motoristaAtribuido || 'motorista') + (guiaDoisMotoristas(v) ? ' e ' + v.motorista2 : '');
  }
  function guiaMotoristaN(v, n) {
    return n === 2 ? { nome: v.motorista2 || '', zap: v.whatsappMotorista2 || '' }
                   : { nome: v.motoristaAtribuido || '', zap: v.whatsappMotorista || '' };
  }
  // `acao`: 'texto' (programação em texto) ou 'imagem' (a imagem já foi baixada/copiada; `copiou` diz qual).
  function guiaJanelaDoisMotoristas(chave, acao, copiou) {
    const v = carroDaChave(chave);
    if (!v) return;
    const linha = function (n, papel) {
      const m = guiaMotoristaN(v, n);
      const cmd = acao === 'imagem'
        ? 'guiaModalFechar();guiaAbrirConversaImagem(\'' + chave + '\',' + (copiou ? 'true' : 'false') + ',' + n + ')'
        : 'guiaModalFechar();abrirWhatsappGuia(\'' + chave + '\',' + n + ')';
      return '<div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-top:1px solid var(--ds-borda);">'
        + '<div style="flex:1;"><b>' + escGuia(m.nome || '(sem nome)') + '</b>'
        + '<div style="font-size:12px; color:var(--ds-texto-3);">' + papel + (m.zap ? '' : ' · sem WhatsApp cadastrado') + '</div></div>'
        + '<button class="gm-btn primario"' + (m.zap ? ' onclick="' + cmd + '"' : ' disabled') + '>Enviar</button></div>';
    };
    guiaModalAbrir('<div class="gm-titulo">Viagem com dois motoristas</div>'
      + '<div class="gm-texto"><p style="margin:0 0 10px; font-size:14px; color:var(--ds-texto-2);">Nesta viagem teremos dois motoristas: '
      + 'um dirige na ida e o outro na volta. A programação precisa ser enviada para os dois.'
      + (acao === 'imagem' ? (copiou ? ' A imagem já está copiada: em cada conversa, aperte Ctrl+V e Enter.'
                                     : ' A imagem foi baixada: arraste o arquivo para cada conversa.') : '')
      + '</p>' + linha(1, '1º motorista · ida') + linha(2, '2º motorista · volta') + '</div>'
      + '<div class="gm-acoes"><button class="gm-btn" onclick="guiaModalFechar()">Fechar</button></div>');
  }

  function abrirWhatsappGuia(placa, n) {
    const v = carroDaChave(placa);
    if (!v) return;
    if (!n && guiaDoisMotoristas(v)) { guiaJanelaDoisMotoristas(placa, 'texto'); return; }
    const m = guiaMotoristaN(v, n || 1);
    if (!m.zap) { toast('Motorista sem WhatsApp cadastrado (bd_motoristas, coluna E).', 'aviso'); return; }
    const dataOp = document.getElementById('gFiltroData').value;
    const msg = gerarMensagemWhatsapp(v, dataOp, m.nome);
    // ⚠️ Aspas simples, nunca crase, em endereço com https (05/10/2026): ver enviarWhatsappPaciente.
    const url = 'https://web.whatsapp.com/send/?phone=55' + m.zap + '&text=' + encodeURIComponent(msg) + '&type=phone_number&app_absent=0';
    window.open(url, '_blank');
    // A mensagem aberta já leva o aviso atual: o "não enviado" do carro sai (29/09/2026).
    guiaMarcarAvisoEnviado(v, dataOp);
  }
  // Usada pela mensagem em texto e pela imagem da viagem: as duas levam o aviso ao motorista.
  function guiaMarcarAvisoEnviado(v, dataOp) {
    if (!v.avisoAEnviar) return;
    chamarServidor('marcarAvisoEnviado', [dataOp, v.placa, getOperador(), v.idViagem || ''], function (dados) { carregarGuia(dados, true); }, function () {});
  }

  // ===================== IMAGEM DA VIAGEM (06/10/2026) =====================
  // Ícone no cabeçalho do carro: gera um PNG em pé (360 px de desenho, 1080 px de arquivo) para abrir no
  // celular, com o carro, o AVISO URGENTE e TODOS os pacientes (o filtro é só da tela, como na mensagem de
  // texto). A imagem sai dos DADOS do carro, não do card: funciona com o card recolhido.
  // Com WhatsApp do motorista, um clique baixa, copia e abre a conversa; o operador só cola (Ctrl+V). O link
  // do WhatsApp aceita só texto: não existe anexar imagem por ele.
  // ⚠️ Sem a logo: vem do site da Prefeitura e, sem permissão (CORS), o navegador recusa salvar a imagem.
  // ⚠️ Texto concatenado, sem crase: endereço com barras dentro de crase derrubou a Guia em 05/10/2026.
  const GUIA_IMG_DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  // "06-10 - JORGE EXEMPLO - 05h30 - QXT4B21 SPIN - CURITIBA.png" (formato pedido pelo Hélio).
  // Tira o que o Windows não aceita em nome de arquivo.
  function guiaNomeArquivoImagem(v, dataOp) {
    const d = (dataOp || '').split('-');
    const diaMes = d.length === 3 ? d[2] + '-' + d[1] : 'SEM DATA';
    const hora = v.horaEmbarque ? v.horaEmbarque.toString().trim().split(':').join('h') : 'SEM HORA';
    const motorista = (v.motoristaAtribuido || '').toString().trim().toUpperCase() || 'SEM MOTORISTA';
    const carro = [v.placa, v.tipo].filter(Boolean).join(' ').toUpperCase();
    return [diaMes, motorista, hora, carro, destinoDe(v).toUpperCase()].map(function (s) {
      return (s || '').toString().replace(/[\\/:*?\x22\u003c>|\r\n\t]/g, ' ').split(' ').filter(Boolean).join(' ');
    }).filter(Boolean).join(' - ') + '.png';
  }

  // Telefone da imagem no formato que se lê e disca: "00 00000-0000" (vários separados por " / ").
  // Cada número vai inteiro numa linha (gimg-nw); a quebra só acontece entre um número e outro.
  function guiaFoneImagem(str) {
    return (str || '').toString().split('/').map(function (s) {
      const d = s.replace(/\D/g, '');
      if (d.length === 11) return d.slice(0, 2) + ' ' + d.slice(2, 7) + '-' + d.slice(7);
      if (d.length === 10) return d.slice(0, 2) + ' ' + d.slice(2, 6) + '-' + d.slice(6);
      return s.trim();
    }).filter(Boolean).map(function (x) { return '<span class="gimg-nw">' + escGuia(x) + '</span>'; }).join(' / ');
  }

  // Hospital e cidade em "Título", com de/da/do/dos/das/e em minúsculas: "Hospital Infantil Joana de Gusmao".
  function guiaTituloImagem(s) {
    return tituloMsg(s).split(' ').map(function (w, i) {
      return i > 0 && ['De', 'Da', 'Do', 'Dos', 'Das', 'E'].indexOf(w) > -1 ? w.toLowerCase() : w;
    }).join(' ');
  }
  // Idade da imagem: bebê em meses ("8 meses"), não "0 anos" (parecer do mockup revisado, 06/10/2026).
  function guiaIdadeImagem(nasc) {
    const i = calcularIdade(nasc);
    if (i.semData) return '';
    if (i.anos === 0) return i.meses === 0 ? 'menos de 1 mês' : (i.meses === 1 ? '1 mês' : i.meses + ' meses');
    return i.anos === 1 ? '1 ano' : i.anos + ' anos';
  }

  // Desenho 3 (06/10/2026): o mockup revisado por outra IA, a pedido do Hélio. A saída e o DESTINO dominam o topo
  // azul, com a rota inteira embaixo (para a parada não ser lida como destino); carro, motorista e partida numa
  // faixa clara; aviso com tarja; cartões com rótulos e a cidade do atendimento em chip.
  // opc.interna (12/11/2026, pedido do Hélio): o MESMO impresso serve à Remoção Interna (riGuias*, no
  // RemocaoInterna.html). Muda só o que lá é diferente: o título, o destino (pode ser mais de um: opc.destino e
  // opc.kickerDestino), a rota (opc.rota, bairros → locais, em vez de Joinville → cidades), os chips de categoria
  // e de lugares, e o rótulo EMBARQUE, que vira ENDEREÇO: o endereço completo do paciente.
  function guiaImagemHTML(v, dataOp, operador, agora, opc) {
    const e = escGuia;
    const ri = !!(opc && opc.interna);
    const p2 = function (n) { return ('0' + n).slice(-2); };
    const d = (dataOp || '').split('-');
    let dataBR = '', diaSem = '';
    if (d.length === 3) {
      dataBR = d[2] + '/' + d[1] + '/' + d[0];
      diaSem = GUIA_IMG_DIAS[new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2])).getDay()] || '';
    }
    const paradas = (v.roteiro && v.roteiro.length ? v.roteiro : (v.destino ? [v.destino] : [])).filter(Boolean);
    const destino = ri ? (opc.destino || 'Sem destino') : (paradas.length ? paradas[paradas.length - 1] : 'Sem destino');
    const rota = ri ? (opc.rota || '') : ['Joinville'].concat(paradas).map(guiaTituloImagem).join(' → ');
    const lista = (v.passageiros || []).slice().sort(function (a, b) { return (a.hora || '').localeCompare(b.hora || ''); });
    const ocup = lista.reduce(function (s, p) { return s + (Number(p.quantidade) || 0); }, 0);
    const limite = v.limite || 4;
    const bloq = Number(v.bloqueados) || 0;
    const linha = function (rot, html) { return '<div class="gimg-linha"><div class="gimg-rot">' + rot + '</div><div class="gimg-val">' + html + '</div></div>'; };
    const mrow = function (rot, html) { return '<div class="gimg-mrow"><span class="gimg-mrow-lab">' + rot + '</span><span class="gimg-mrow-val">' + html + '</span></div>'; };

    let h = '<div class="gimg">'
      + '<div class="gimg-topo">'
      +   '<div class="gimg-topo-l1"><span class="gimg-ar gimg-marca">' + (ri ? 'SIGEPAS · GUIA DE REMOÇÃO INTERNA' : 'SIGEPAS · GUIA DE VIAGEM') + '</span>'
      +     '<span class="gimg-data">' + e(diaSem) + (diaSem && dataBR ? ' · ' : '') + '<b class="gimg-ar">' + e(dataBR) + '</b></span></div>'
      +   '<div class="gimg-hero"><div class="gimg-saida"><span class="gimg-kicker">SAÍDA</span><b class="gimg-ar">' + e(v.horaEmbarque || '--:--') + '</b></div>'
      +     '<div class="gimg-destino"><span class="gimg-kicker">' + (ri ? e(opc.kickerDestino || 'DESTINO') : 'DESTINO PRINCIPAL') + '</span><b class="gimg-ar">' + e(destino.toString().toUpperCase()) + '</b></div></div>'
      +   (rota ? '<div class="gimg-rota"><b>ROTA:</b> ' + e(rota) + '</div>' : '')
      + '</div>'
      + '<div class="gimg-oper">'
      +   '<div class="gimg-chips"><span class="gimg-chip">' + e((v.tipo || '—').toString().toUpperCase()) + '</span>'
      +     '<span class="gimg-chip gimg-chip-placa">' + e(v.placa || '') + '</span>'
      +     '<span class="gimg-chip gimg-chip-suave">' + (ri ? 'Remoção interna' : (v.categoria === 'publico' ? 'Público' : 'Terceirizado')) + '</span>'
      +     '<span class="gimg-chip gimg-chip-suave">' + (ri ? ocup + (ocup === 1 ? ' passageiro' : ' passageiros') : ocup + '/' + limite + ' lugares') + '</span>'
      +     (bloq ? '<span class="gimg-chip gimg-chip-suave">' + bloq + (bloq === 1 ? ' bloqueado' : ' bloqueados') + '</span>' : '') + '</div>'
      +   mrow(v.doisMotoristas ? 'Motorista (ida)' : 'Motorista', '<b>' + e(v.motoristaAtribuido || '(Sem motorista)') + '</b>' + (v.whatsappMotorista ? ' · ' + guiaFoneImagem(v.whatsappMotorista) : ''))
      // Dois motoristas (11/11/2026): o 2º logo abaixo.
      +   (v.doisMotoristas ? mrow('Motorista (volta)', '<b>' + e(v.motorista2 || '(a definir)') + '</b>' + (v.whatsappMotorista2 ? ' · ' + guiaFoneImagem(v.whatsappMotorista2) : '')) : '')
      +   (v.localEmbarque ? mrow('Partida', e(v.localEmbarque)) : '')
      + '</div>';

    const aviso = (v.aviso || '').toString().trim();
    if (aviso) {
      h += '<div class="gimg-aviso"><div class="gimg-ar gimg-aviso-tit">AVISO URGENTE</div>'
        + '<div class="gimg-aviso-corpo"><div class="gimg-aviso-txt">' + e(aviso) + '</div>'
        + (v.avisoRegistro ? '<div class="gimg-aviso-meta">Registrado em ' + e(v.avisoRegistro) + '</div>' : '') + '</div></div>';
    }

    h += '<div class="gimg-sec"><b class="gimg-ar">Pacientes</b><span>' + lista.length + ' paciente' + (lista.length === 1 ? '' : 's')
      + ' · ' + ocup + ' passageiro' + (ocup === 1 ? '' : 's') + '</span></div>';
    if (!lista.length) h += '<div class="gimg-card gimg-vazio">Nenhum paciente.</div>';
    lista.forEach(function (p, i) {
      const al = regrasIdade(p).filter(function (a) { return !/acompanhante OK/i.test(a.label); });
      const tags = al.map(function (a) {
        return '<span class="gimg-tag gimg-tag-' + a.nivel + '">' + e(/SEM ACOMPANHANTE/i.test(a.label) ? a.icone + ' ' + a.label : a.label) + '</span>';
      }).join('') + (p.cidade ? '<span class="gimg-tag gimg-tag-cidade">' + e(p.cidade.toString().toUpperCase()) + '</span>' : '');
      // Nome e matrícula com a MESMA regra do card (servidor: selo e a matrícula informada na Demandas).
      const servidor = guiaMarcadorNulo(p.nome) && guiaMarcadorNulo(p.matricula);
      const matServ = guiaMarcadorNulo(p.nome) && !guiaMarcadorNulo(p.servidorMatricula) ? p.servidorMatricula : '';
      const mat = (p.matricula && !guiaMarcadorNulo(p.matricula)) ? p.matricula : matServ;
      const nome = guiaNomePax(p);
      const nomeHTML = servidor ? '<span class="gimg-serv">SERVIDOR</span>' + e(nome.replace(/^Servidor\s*/, '')) : e(nome);
      const meta = [guiaIdadeImagem(p.nascimento), mat ? 'mat. ' + mat : ''].filter(Boolean).join(' · ');
      let emb = p.enderecoEmbarque;
      if (emb === 'Endereço do paciente') emb = p.enderecoResidencia || emb;
      const temAcomp = p.acompanhante && p.acompanhante.trim();
      // Telefone do acompanhante na linha de baixo do nome, sem rótulo (pedido do Hélio, 06/10/2026).
      const acomp = temAcomp
        ? e(p.acompanhante) + (p.telefonesAcomp ? '<br>' + guiaFoneImagem(p.telefonesAcomp) : '')
        : '<b>Sem acompanhante</b>';
      // Cor do cartão pela posição na lista (1, 2, 3, 4, 1...): dois vizinhos nunca têm a mesma cor.
      h += '<div class="gimg-card gimg-cor-' + ((i % 4) + 1) + (nivelMaisAlto(al) === 'perigo' ? ' gimg-card-perigo' : '') + '">'
        + '<div class="gimg-cab"><span class="gimg-ar gimg-hora">' + e(p.hora || '--:--') + '</span>'
        +   '<div class="gimg-id"><div class="gimg-nome">' + nomeHTML + '</div>' + (meta ? '<div class="gimg-meta">' + e(meta) + '</div>' : '') + '</div></div>'
        + (tags ? '<div class="gimg-tags">' + tags + '</div>' : '')
        + '<div class="gimg-linhas">'
        +   linha('Atendimento', '<b>' + e(guiaTituloImagem(p.local) || '—') + '</b>')
        +   (emb ? linha(ri ? 'Endereço' : 'Embarque', e(emb)) : '')
        +   linha('Contato', p.telefones ? guiaFoneImagem(p.telefones) : '—')
        +   linha('Acompanhante', acomp)
        + '</div>'
        + (p.pedidoCancelado ? '<div class="gimg-faixa gimg-faixa-canc">PEDIDO CANCELADO NO POSTO · confira antes de sair</div>' : '')
        + (temRestricaoReal(p.observacao) ? '<div class="gimg-faixa gimg-faixa-obs">' + e(p.observacao) + '</div>' : '')
        + '</div>';
    });

    const quando = agora ? p2(agora.getDate()) + '/' + p2(agora.getMonth() + 1) + '/' + agora.getFullYear() + ' ' + p2(agora.getHours()) + ':' + p2(agora.getMinutes()) : '';
    h += '<div class="gimg-rodape"><span>Gerado em ' + e(quando) + (operador ? ' · ' + e(operador) : '') + '</span><b class="gimg-ar">SIGEPAS</b></div>';
    return h + '</div>';
  }

  // A biblioteca html2canvas vem do próprio SIGEPAS (iniciar-sistema.js), e não mais de um site de fora: a política de
  // segurança da página só aceita script do próprio endereço.
  function guiaCarregarHtml2Canvas(cb) {
    cb(!!window.html2canvas);
  }

  function guiaPalcoImagem() {
    let palco = document.getElementById('guiaImgPalco');
    if (!palco) {
      palco = document.createElement('div');
      palco.id = 'guiaImgPalco';
      palco.setAttribute('aria-hidden', 'true');
      document.body.appendChild(palco);
    }
    return palco;
  }

  function guiaImagemViagem(chave, btn) {
    const v = carroDaChave(chave);
    if (!v) { toast('Carro não encontrado. Recarregue a tela.', 'erro'); return; }
    if (btn && btn.disabled) return;
    const dataOp = document.getElementById('gFiltroData').value;
    const operador = getOperador();
    const nomeArq = guiaNomeArquivoImagem(v, dataOp);
    const htmlBtn = btn ? btn.innerHTML : '';
    const destravar = function () { if (btn) { btn.disabled = false; btn.innerHTML = htmlBtn; } };
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 gm-spin" style="color:#fff" aria-hidden="true"></i>'; }

    const promessaCanvas = new Promise(function (resolve, reject) {
      guiaCarregarHtml2Canvas(function (ok) {
        if (!ok) { reject(new Error('html2canvas não carregou')); return; }
        const palco = guiaPalcoImagem();
        palco.innerHTML = guiaImagemHTML(v, dataOp, operador, new Date());
        setTimeout(function () {
          html2canvas(palco.firstElementChild, { scale: 3, backgroundColor: '#ffffff', logging: false, useCORS: true })
            .then(resolve, reject);
        }, 60);
      });
    });
    const promessaBlob = promessaCanvas.then(function (canvas) {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (b) { if (b) resolve(b); else reject(new Error('sem imagem')); }, 'image/png');
      });
    });

    // 🔑 O pedido de copiar nasce AINDA DENTRO do clique (o Chrome só aceita assim) e recebe a imagem como
    // promessa, que fica pronta depois. Se o Google ou o navegador negarem, o arquivo baixado continua valendo.
    let copia = Promise.resolve(false);
    if (guiaTemZap(v) && navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
      try {
        copia = navigator.clipboard.write([new ClipboardItem({ 'image/png': promessaBlob })])
          .then(function () { return true; }, function () { return false; });
      } catch { copia = Promise.resolve(false); }
    }

    promessaCanvas.then(function (canvas) {
      const link = document.createElement('a');
      link.download = nomeArq;
      link.href = canvas.toDataURL('image/png');
      link.click();
      if (!guiaTemZap(v)) {
        destravar();
        toast('Imagem baixada. Motorista sem WhatsApp cadastrado (bd_motoristas, coluna E).', 'aviso');
        return;
      }
      // Dois motoristas (11/11/2026): a janela oferece uma conversa para cada um.
      copia.then(function (copiou) {
        destravar();
        if (guiaDoisMotoristas(v)) guiaJanelaDoisMotoristas(chave, 'imagem', copiou);
        else guiaAbrirConversaImagem(chave, copiou);
      }).catch(function () { destravar(); });
    }).catch(function () {
      destravar();
      toast('Não deu para gerar a imagem. Tente de novo.', 'erro');
    });
  }

  // ===================== BAIXAR AS GUIAS DE TODOS OS CARROS (10/11/2026) =====================
  // Pedido do Hélio: um botão no fim da barra de filtros que baixa a guia de cada carro do dia, separada por
  // Terceiros (categoria 'terceirizado') ou Servidores (frota da prefeitura). Mesmo desenho (guiaImagemHTML) e
  // mesmo nome de arquivo (guiaNomeArquivoImagem) do ícone de cada carro, mas SEM copiar e SEM abrir o WhatsApp.
  // 📌 Vale o dia inteiro da data escolhida, sem os outros filtros: "todos" é todos. Carro sem passageiro (o
  // furgão do LACEN) fica de fora: não há guia a mandar.
  // 📌 Não marca o aviso urgente como enviado (guiaMarcarAvisoEnviado): baixar não é mandar.
  // ⚠️ Um arquivo de cada vez, com uma pausa entre eles: o Chrome pergunta uma vez "baixar vários arquivos?" e
  // descarta downloads disparados juntos demais.
  let guiaBaixando = false;

  function guiaCarrosParaBaixar(cat) {
    return (estadoGuia.veiculosSalvos || []).filter(function (v) {
      const ehTerc = v.categoria === 'terceirizado';
      return (cat === 'terceirizado' ? ehTerc : !ehTerc) && (v.passageiros || []).length > 0;
    }).sort(function (a, b) { return (a.horaEmbarque || '99:99').localeCompare(b.horaEmbarque || '99:99'); });
  }

  function guiaBaixarMenu(ev) {
    if (ev) ev.stopPropagation();
    const menu = document.getElementById('guiaBaixarMenu');
    const abrir = !menu.classList.contains('aberto');
    if (abrir) {
      [['guiaBaixarTerc', 'terceirizado'], ['guiaBaixarServ', 'publico']].forEach(function (par) {
        const n = guiaCarrosParaBaixar(par[1]).length;
        const b = document.getElementById(par[0]);
        b.disabled = n === 0 || guiaBaixando;
        b.querySelector('.n').textContent = n === 1 ? '1 carro' : n + ' carros';
      });
    }
    menu.classList.toggle('aberto', abrir);
  }
  function guiaFecharMenuBaixar() {
    const menu = document.getElementById('guiaBaixarMenu');
    if (menu) menu.classList.remove('aberto');
  }
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest || !ev.target.closest('.guia-baixar')) guiaFecharMenuBaixar();
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') guiaFecharMenuBaixar(); });

  function guiaBaixarTodas(cat) {
    guiaFecharMenuBaixar();
    if (guiaBaixando) return;
    const lista = guiaCarrosParaBaixar(cat);
    const rotulo = cat === 'terceirizado' ? 'terceiros' : 'servidores';
    if (lista.length === 0) { toast('Nenhum carro de ' + rotulo + ' com passageiro neste dia.', 'aviso'); return; }
    const dataOp = document.getElementById('gFiltroData').value;
    const operador = getOperador();
    const agora = new Date();
    const btn = document.getElementById('guiaBaixarBtn');
    const htmlBtn = btn.innerHTML;
    guiaBaixando = true;
    btn.disabled = true;
    const falhas = [];
    let i = 0;
    const terminar = function () {
      guiaBaixando = false;
      btn.disabled = false;
      btn.innerHTML = htmlBtn;
      const ok = lista.length - falhas.length;
      if (falhas.length) toast(ok + ' guia(s) de ' + rotulo + ' baixada(s). Não saíram: ' + falhas.map(escGuia).join(', ') + '. Tente de novo.', 'aviso');
      else toast(ok + ' guia(s) de ' + rotulo + ' baixada(s). Se o navegador perguntar, permita baixar vários arquivos.', 'ok');
    };
    guiaCarregarHtml2Canvas(function (carregou) {
      if (!carregou) { guiaBaixando = false; btn.disabled = false; toast('Não deu para gerar as imagens. Tente de novo.', 'erro'); return; }
      const palco = guiaPalcoImagem();
      const proximo = function () {
        if (i >= lista.length) { terminar(); return; }
        const v = lista[i++];
        btn.innerHTML = '<i class="ti ti-loader-2 gm-spin" aria-hidden="true"></i>Baixando ' + i + ' de ' + lista.length + '…';
        palco.innerHTML = guiaImagemHTML(v, dataOp, operador, agora);
        setTimeout(function () {
          html2canvas(palco.firstElementChild, { scale: 3, backgroundColor: '#ffffff', logging: false, useCORS: true })
            .then(function (canvas) {
              const link = document.createElement('a');
              link.download = guiaNomeArquivoImagem(v, dataOp);
              link.href = canvas.toDataURL('image/png');
              link.click();
              setTimeout(proximo, 400);
            }, function () {
              falhas.push((v.horaEmbarque || '--:--') + ' ' + (v.placa || ''));
              setTimeout(proximo, 60);
            });
        }, 60);
      };
      proximo();
    });
  }

  // Abre a conversa do motorista com uma frase curta (a imagem leva o resto). Se o navegador bloquear a
  // janela (ela abre depois de gerar a imagem, fora do clique), uma janela da Guia oferece o botão.
  // `n` (11/11/2026): 1 = o motorista da ida (padrão), 2 = o da volta, na viagem com dois motoristas.
  function guiaAbrirConversaImagem(chave, copiou, n) {
    const v = carroDaChave(chave);
    if (!v) return;
    const m = guiaMotoristaN(v, n || 1);
    if (!m.zap) return;
    const dataOp = document.getElementById('gFiltroData').value;
    const d = (dataOp || '').split('-');
    const diaMes = d.length === 3 ? d[2] + '/' + d[1] : '';
    const msg = 'Olá, ' + (m.nome || 'motorista').toString().toUpperCase() + '! Segue a guia da sua viagem'
      + (diaMes ? ' de ' + diaMes : '') + ', saída ' + (v.horaEmbarque || '--:--') + '.'
      + (guiaDoisMotoristas(v) ? ' Nesta viagem são dois motoristas: ' + v.motoristaAtribuido.toUpperCase() + ' na ida e '
                                 + v.motorista2.toUpperCase() + ' na volta.' : '');
    // ⚠️ Aspas simples, nunca crase, em endereço com https (05/10/2026).
    const url = 'https://web.whatsapp.com/send/?phone=55' + m.zap + '&text=' + encodeURIComponent(msg) + '&type=phone_number&app_absent=0';
    const janela = window.open(url, '_blank');
    if (!janela) {
      guiaModalAbrir('<div class="gm-titulo">Imagem pronta</div>'
        + '<div class="gm-texto"><p style="margin:0; font-size:14px; color:var(--ds-texto-2);">O navegador não deixou abrir o WhatsApp sozinho. '
        + (copiou ? 'A imagem já está copiada: na conversa, aperte Ctrl+V e Enter.' : 'A imagem foi baixada: arraste o arquivo para a conversa.') + '</p></div>'
        + '<div class="gm-acoes"><button class="gm-btn" onclick="guiaModalFechar()">Fechar</button>'
        + '<button class="gm-btn primario" onclick="guiaModalFechar();guiaAbrirConversaImagem(\'' + chave + '\',' + (copiou ? 'true' : 'false') + ',' + (n || 1) + ')">Abrir conversa do motorista</button></div>');
      return;
    }
    toast(copiou ? 'Imagem baixada e copiada: na conversa, aperte Ctrl+V e Enter.' : 'Imagem baixada: arraste o arquivo para a conversa.', 'ok');
    guiaMarcarAvisoEnviado(v, dataOp);
  }

  // ===================== AVISO URGENTE DO CARRO (29/09/2026) =====================
  // Caixinha só com o aviso. Grava pelo MESMO atualizarCarroAlocado do Editar de Carros Montados
  // (mudancas.aviso), então a regra é uma só nos dois lugares. O modal inteiro de edição não abre
  // daqui: ele mora dentro da aba Viagens Externas, escondida enquanto a Guia está na tela.
  function abrirAvisoGuia(chave) {
    const v = carroDaChave(chave);
    if (!v) return;
    guiaModalAbrir(`
      <div class="gm-titulo">AVISO URGENTE</div>
      <div class="gm-texto">
        <p style="margin:0; font-size:14px; color:var(--ds-texto-2);">Carro <b>${escGuia(v.placa)}</b> · saída ${escGuia(v.horaEmbarque || '--:--')}. O aviso aparece no card e vai no topo da mensagem do motorista.</p>
        <label class="gm-form-lbl">Texto do aviso</label>
        <textarea id="gmAvisoTxt" class="gm-form-txt" placeholder="Ex.: buscar a paciente das 10:00 na portaria lateral do hospital">${escGuia(v.aviso || '')}</textarea>
      </div>
      <div class="gm-acoes">
        <button class="gm-btn" onclick="guiaModalFechar()">Cancelar</button>
        ${v.aviso ? `<button class="gm-btn perigo" onclick="salvarAvisoGuia('${chave}', true)">Remover aviso</button>` : ''}
        <button class="gm-btn primario" onclick="salvarAvisoGuia('${chave}', false)">Salvar</button>
      </div>`);
    const el = document.getElementById('gmAvisoTxt');
    if (el) el.focus();
  }

  function salvarAvisoGuia(chave, remover) {
    const v = carroDaChave(chave);
    if (!v) return;
    const el = document.getElementById('gmAvisoTxt');
    const texto = remover ? '' : ((el && el.value) || '').trim();
    const atual = (v.aviso || '').trim();
    if (!texto && !atual) { toast('Escreva o aviso antes de salvar.', 'aviso'); return; }
    if (texto === atual) { guiaModalFechar(); return; }   // nada mudou: nem grava nem marca para reenviar
    const data = document.getElementById('gFiltroData').value;
    guiaModalLoading(texto ? 'Salvando o aviso...' : 'Removendo o aviso...');
    chamarServidor('atualizarCarroAlocado', [data, v.placa, { aviso: texto }, getOperador(), v.idViagem || ''], function (dados) {
        carregarGuia(dados, true);
        guiaModalSucesso(texto ? 'Aviso salvo. Reenvie a mensagem ao motorista.' : 'Aviso removido.');
      }, function (e) { guiaModalFechar(); toast('Não gravou. ' + ((e && e.message) ? e.message : e), 'erro'); });
  }

  // Selo de versão (SEMPRE a última linha do script — o Index acusa se faltar = colagem truncada)
  window.__VERSOES = window.__VERSOES || {}; window.__VERSOES.guia = '13/11a';

// ---- Exposição para o HTML e as outras telas (as telas vieram do Apps Script, onde tudo era global; ADR 0016).
Object.assign(window, { iniciarGuia, carregarGuia, guiaNormCid, guiaTemAcento, destinoDe, chaveCarroGuia, carroDaChave, alternarGuiaCard, renderGuia, cardVeiculoGuiaHTML, cardPassageiroGuiaHTML, renderContadoresGuia, guiaStatusCasa, filtrarStatusGuia, statusConfInfo, motoristaGuiaHTML, guiaAbrirFormacao, transferirPaciente, trocarPaciente, guiaNormBusca, guiaTpaxAchar, guiaTpaxFiltrar, guiaTpaxEscolher, guiaTpaxFechar, guiaTpaxTecla, soDigitos, _confAtual, abrirPainelPaxPos, abrirPainelPax, fecharPainelPax, atualizarHeaderDrawerGuia, guiaMarcarBotoesStatus, trocarAbaDrawerGuia, selecionarQuemAtendeuChip, dispararWhatsappGuia, renderDrawerConteudoGuia, getQuemAtendeuPanel, guiaGravarStatusContato, registrarConfirmacaoPanel, statusConfTexto, confirmarCancelarPax, guiaCancelarDoCard, selecionarTelefoneConf, enviarWhatsappPaciente, escGuia, guiaMarcadorNulo, guiaIdPax, guiaNomePax, guiaAcharPax, guiaModalAbrir, guiaModalFechar, guiaModalConfirmar, guiaModalResponder, guiaModalLoading, guiaModalSucesso, formatarTelefonesWpp, guiaDoisMotoristas, guiaTemZap, guiaNomesMotoristas, guiaMotoristaN, guiaJanelaDoisMotoristas, abrirWhatsappGuia, guiaMarcarAvisoEnviado, guiaNomeArquivoImagem, guiaFoneImagem, guiaTituloImagem, guiaIdadeImagem, guiaImagemHTML, guiaCarregarHtml2Canvas, guiaPalcoImagem, guiaImagemViagem, guiaCarrosParaBaixar, guiaBaixarMenu, guiaFecharMenuBaixar, guiaBaixarTodas, guiaAbrirConversaImagem, abrirAvisoGuia, salvarAvisoGuia });
Object.defineProperty(window, 'estadoGuia', { configurable: true, get: () => estadoGuia });
Object.defineProperty(window, 'abaAtivaDrawerGuia', { configurable: true, get: () => abaAtivaDrawerGuia, set: (valor) => { abaAtivaDrawerGuia = valor; } });
Object.defineProperty(window, 'guiaGravacoesContato', { configurable: true, get: () => guiaGravacoesContato, set: (valor) => { guiaGravacoesContato = valor; } });
Object.defineProperty(window, '_guiaModalSim', { configurable: true, get: () => _guiaModalSim, set: (valor) => { _guiaModalSim = valor; } });
Object.defineProperty(window, '_guiaModalNao', { configurable: true, get: () => _guiaModalNao, set: (valor) => { _guiaModalNao = valor; } });
Object.defineProperty(window, 'GUIA_IMG_DIAS', { configurable: true, get: () => GUIA_IMG_DIAS });
Object.defineProperty(window, 'guiaBaixando', { configurable: true, get: () => guiaBaixando, set: (valor) => { guiaBaixando = valor; } });
