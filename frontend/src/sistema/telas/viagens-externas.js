// Estado próprio — NÃO reaproveitar estadoAba2: as duas telas convivem sobre a mesma
  // base e precisam ser independentes até a Aba 2 ser aposentada (Fase 4).
  const estadoDm = { data: '', pacientes: [], veiculosSalvos: [], veiculos: [], veiculosCadastro: [],
                     escada: [], ambulancia: null, ultimoVeic: '',
                     carregando: false, selecionados: {}, drawerId: '', montagem: null,
                     locaisEmbarque: [], embarquePadrao: '', modo: 'fila', carrosAbertos: {},
                     cidadesHistoricas: [], cidadesDicionario: [],
                     // null = o modal "Adicionar paciente" está criando; preenchido = está
                     // corrigindo a demanda cuja chave ele guarda (ver dmAbrirModalNovoPaciente).
                     novoEditando: null };

  // Larguras FIXAS das 9 colunas, iguais em todas as cidades. Px nas colunas de conteúdo
  // previsível (hora, símbolo, qtd, idade) e % nas de texto livre.
  // ⚠️ Ordem definida pelo gestor: Restrição virou símbolo estreito e BAIRRO foi para o fim.
  const DM_COLGROUP =
      '<colgroup>'
    + '<col style="width:40px">'   /* Seleção    */
    + '<col style="width:128px">'  /* Veículo    */
    + '<col style="width:20%">'    /* Local      */
    + '<col style="width:16%">'    /* Objetivo   */
    + '<col style="width:70px">'   /* Restrição  — só o símbolo */
    + '<col style="width:52px">'   /* Qtd        */
    + '<col style="width:26%">'    /* Nome       — avatar + nome + selos */
    + '<col style="width:104px">'  /* Nascimento */
    + '<col style="width:14%">'    /* Bairro     */
    + '</colgroup>';
  // 394px fixos + 76% flexível (a coluna Hora saiu: a banda fixa já mostra o horário): sobra folga em telas normais. Abaixo da largura mínima
  // a área rola na horizontal, em vez de espremer as colunas.

  const DM_AV_CORES = [
    ['#dbe4f8','#1e3a8a'], ['#f9e6c9','#8a5411'], ['#e0e5fb','#2c3f9e'],
    ['#f1dcea','#8c3f72'], ['#dfeccf','#5a6b1f'], ['#dbe9f4','#245a7a']
  ];

  // `lembrar` = true (13/11/2026): ao entrar na aba ou trocar a data, mostra na hora a última carga daquele dia
  // (cargaDiaPedir, no Index) e confere com o servidor por trás. Sem ele, que é como as gravações daqui chamam
  // ("relê o dia"), vai direto ao servidor: depois de gravar, a carga guardada é a de antes da gravação.
  function iniciarDemandas(lembrar) {
    const el = document.getElementById('dmData');
    if (!el.value) {
      el.value = dataPadraoISO();   // o dia seguinte (11/11/2026)
    }
    estadoDm.data = el.value;
    estadoDm.carregando = true;
    // 🐛 O BOTÃO SÓ LIBERA COM O DIA CARREGADO (05/09). A lista de cidades do modal vem do
    // servidor junto com as demandas; clicando antes de a resposta chegar, o formulário abria
    // com o select VAZIO. O operador percebeu porque "esperando alguns segundos funciona" —
    // o pior tipo de defeito, o que às vezes acontece.
    dmTravarBotaoNovo(true);
    // Trocou de data: fecha restrições e ZERA a seleção. Os ids de paciente são o
    // índice da linha no bd_viagens ('P' + n), então se repetem entre datas — manter
    // a seleção selecionaria gente errada no dia novo.
    estadoDm.selecionados = {};
    estadoDm.carrosAbertos = {};   // placas do dia anterior não valem para o novo
    dmFecharDrawer();
    document.getElementById('dmCorpo').innerHTML =
      '<div class="dm-vazio"><span class="dm-ico"><i class="ti ti-loader-2"></i></span>Carregando demandas...</div>';

    const data = el.value;
    cargaDiaPedir({ data: data, lembrar: lembrar === true, quem: 'demandas' }, function (dados, como) {
      if (como === 'nova') {
        if (estadoDm.data !== data) return;   // trocaram de dia enquanto conferia
        // A fila mudou (alguém gravou). Os ids dos pacientes são a posição da linha na planilha e podem ter andado:
        // a seleção feita na carga lembrada poderia apontar para outra pessoa. Desfaz e avisa.
        if (Object.keys(estadoDm.selecionados || {}).length) {
          estadoDm.selecionados = {};
          toast('O dia mudou enquanto você olhava (outra pessoa gravou). A seleção foi desfeita: confira e selecione de novo.', 'aviso');
        }
      }
      dmCarregar(dados);
    }, function (e) {
      estadoDm.carregando = false;
      document.getElementById('dmCorpo').innerHTML =
        '<div class="dm-vazio"><span class="dm-ico"><i class="ti ti-alert-triangle"></i></span>Erro ao carregar: ' + dmEsc(e) + '</div>';
    });
  }

  // Reusa o MESMO getDadosOperacao da Aba 2 de propósito: uma fonte de verdade só.
  function dmCarregar(dados) {
    // Toda carga que chega (abrir, trocar o dia, voltar de uma gravação) vira a "última carga" deste dia, que a
    // Confirmação e Guias também usa (13/11/2026).
    if (typeof cargaDiaGuardar === 'function') cargaDiaGuardar(dados);
    estadoDm.carregando = false;
    estadoDm.pacientes = (dados && dados.pacientes) ? dados.pacientes : [];
    // veiculosSalvos alimenta o "já montado" do resumo — vem no mesmo payload.
    estadoDm.veiculosSalvos = (dados && dados.veiculosSalvos) ? dados.veiculosSalvos : [];
    // Frota LIVRE do dia — alimenta a escada de capacidades da barra flutuante.
    estadoDm.veiculos = (dados && dados.veiculos) ? dados.veiculos : [];
    // Cadastro global — referência de capacidade quando a frota do dia não foi declarada
    estadoDm.veiculosCadastro = (dados && dados.veiculosCadastro) ? dados.veiculosCadastro : [];
    // Locais de embarque (bd_embarques) — o select da tela de confirmação do carro.
    estadoDm.locaisEmbarque = (dados && dados.locaisEmbarque) ? dados.locaisEmbarque : [];
    // O local que já vem escolhido — a ⭐ de Configurações › Locais de Embarque (11/09).
    estadoDm.embarquePadrao = (dados && dados.embarquePadrao) ? dados.embarquePadrao : '';
    estadoDm.locaisPadrao = (dados && dados.locaisPadrao) ? dados.locaisPadrao : [];
    estadoDm.cidadesHistoricas = (dados && dados.cidadesHistoricas) ? dados.cidadesHistoricas : [];
    estadoDm.cidadesDicionario = (dados && dados.cidadesDicionario) ? dados.cidadesDicionario : [];
    // Ordem das cidades em Montar Carros: direção + vizinhança (29/09/2026), da aba bd_cidades_geo.
    estadoDm.geoCidades = (dados && dados.geoCidades) ? dados.geoCidades : {};
    dmMontarEscada();
    dmPopularFiltros();
    dmTravarBotaoNovo(false);   // a lista de cidades chegou: o formulário já abre completo
    dmRender();
  }

  // 🐛 A demanda com destino Joinville nasce na Remoção Interna, mas quem está olhando é esta
  // tela. Sem isto, o operador trocava de aba e NÃO via o paciente — precisava dar F5.
  //
  // A causa não era cache: a Remoção Interna recarrega sozinha ao ser aberta. Era a DATA. Ela
  // guarda a data que o operador escolheu por último, e `iniciarRemocao` só a preenche quando
  // está vazia — então uma demanda criada para hoje ficava invisível numa aba parada em ontem.
  //
  // 📌 Aqui a Remoção Interna é tocada por fora, com `typeof` na frente: se um dia ela sair do
  // Index, esta tela continua funcionando em vez de quebrar num erro sem explicação.
  function dmAvisarRemocaoInterna() {
    const data = estadoDm.data
      || (document.getElementById('dmData') ? document.getElementById('dmData').value : '');
    if (!data) return;
    const campo = document.getElementById('riData');
    if (campo) campo.value = data;          // a outra tela passa a olhar o mesmo dia
    if (typeof carregarRI === 'function') carregarRI();
  }

  // Trava/destrava o "Adicionar paciente" enquanto o dia não chegou do servidor.
  // O `title` muda junto: botão apagado sem explicação faz o operador clicar de novo.
  function dmTravarBotaoNovo(travar) {
    const btn = document.getElementById('dmBtnNovoPac');
    if (!btn) return;
    btn.disabled = !!travar;
    btn.title = travar
      ? 'Aguarde o dia terminar de carregar'
      : 'Adicionar paciente manualmente na fila deste dia';
  }

  function dmPopularFiltros() {
    // ⚠️ AS OPÇÕES VÊM DA FILA **E** DOS CARROS MONTADOS. Um pedido sai da fila no instante
    // em que entra num carro (`if (jaAlocado) continue`, no getDadosOperacao), então uma
    // lista tirada só de `estadoDm.pacientes` esvazia conforme o dia é montado: com tudo
    // alocado, a fila é zero e os três selects ficariam só com "Todas" — justamente no
    // momento em que "Carros do dia" está cheio e o operador mais precisa filtrar.
    const universo = (estadoDm.pacientes || []).slice();
    (estadoDm.veiculosSalvos || []).forEach(function (v) {
      (v.passageiros || []).forEach(function (p) { universo.push(p); });
    });
    const dist = function (campo) {
      const vistos = {}, out = [];
      universo.forEach(function (p) {
        const v = (p[campo] || '').toString().trim();
        // Cidade sem acento como chave (defeito 3, 06/11): "Florianópolis" e "FLORIANOPOLIS" são uma opção só,
        // e o rótulo fica com a grafia COM acento, quando aparecer alguma.
        const k = campo === 'cidade' ? dmNorm(v) : v.toUpperCase();
        if (!v) return;
        if (vistos[k] === undefined) { vistos[k] = out.length; out.push(v); }
        else if (campo === 'cidade' && dmNorm(out[vistos[k]]) === out[vistos[k]].toUpperCase() && dmNorm(v) !== v.toUpperCase()) out[vistos[k]] = v;
      });
      return out.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    };
    const encher = function (id, valores, rotuloTodos, sufixo) {
      const sel = document.getElementById(id);
      const atual = sel.value;
      let html = '<option value="">' + rotuloTodos + '</option>';
      valores.forEach(function (v) {
        html += '<option value="' + dmEsc(v) + '">' + dmEsc(v) + (sufixo ? sufixo(v) : '') + '</option>';
      });
      sel.innerHTML = html;
      if (valores.indexOf(atual) > -1) sel.value = atual; // preserva o filtro ao trocar de data
    };
    // Total de PESSOAS por cidade no dia (pedido do Hélio, 10/11/2026): "FLORIANOPOLIS (30)". Soma a
    // quantidade de cada pedido (paciente + acompanhantes, a mesma "vaga(s)" do cartão), da fila E dos
    // carros montados. O pedido cancelado pelo posto que está escondido na fila não entra na conta.
    const pessoasPorCidade = {};
    universo.forEach(function (p) {
      if (p.cancelado) return;
      const k = dmNorm((p.cidade || '').toString().trim());
      if (!k) return;
      pessoasPorCidade[k] = (pessoasPorCidade[k] || 0) + (parseInt(p.quantidade, 10) || 1);
    });
    encher('dmFCidade', dist('cidade'), 'Todas', function (c) {
      return ' (' + (pessoasPorCidade[dmNorm(c)] || 0) + ')';
    });
    encher('dmFLocal',  dist('local'),  'Todos');
    encher('dmFVeic',   dist('tipoSolicitado'), 'Todos');
  }

  // A regra de "este paciente casa com o filtro?" mora AQUI e so aqui. Dois chamadores:
  // a fila (barra de cima) e a busca do modal de encaixe, que tem caixa propria. Duas
  // copias divergiriam no dia em que uma ganhasse um campo novo de busca.
  // Ligado/desligado do botão de cancelados. Fica fora do estadoDm porque é preferência de
  // visualização, não dado do dia — trocar de data não deve reabrir o que o operador fechou.
  let dmVerCancelados = false;

  function dmAlternarCancelados() {
    dmVerCancelados = !dmVerCancelados;
    estadoDm.selecionados = {};   // seleção some junto: o que estava marcado pode sair da lista
    dmRender();
  }

  function dmCasaFiltro(p, f) {
    // 🔑 Pedido cancelado pelo posto. Desde 28/08 ele ENTRA na bd_viagens em vez de ser
    // descartado na importação — descartá-lo apagava a única informação capaz de avisar
    // que um carro já montado ia buscar quem cancelou. Aqui ele fica escondido por padrão:
    // a tela abre mostrando o trabalho do dia, e o operador liga o filtro quando quiser.
    if (p.cancelado && !f.cancelados) return false;
    if (f.cidade && dmNorm(p.cidade) !== dmNorm(f.cidade)) return false;
    if (f.local  && (p.local  || '') !== f.local)  return false;
    if (f.veiculo && (p.tipoSolicitado || '') !== f.veiculo) return false;
    if (!f.q) return true;
    const alvo = [p.nome, p.matricula, p.bairro, p.objetivo, p.local, p.cidade, p.observacao]
                   .join(' ').toLowerCase();
    return alvo.indexOf(f.q) > -1;
  }

  function dmFiltrados() {
    const f = {
      cidade:  document.getElementById('dmFCidade').value,
      local:   document.getElementById('dmFLocal').value,
      veiculo: document.getElementById('dmFVeic').value,
      cancelados: dmVerCancelados,
      q: (document.getElementById('dmBusca').value || '').trim().toLowerCase()
    };
    return estadoDm.pacientes.filter(function (p) { return dmCasaFiltro(p, f); });
  }

  // ---- OS MESMOS FILTROS, APLICADOS AOS CARROS ---------------------------------
  // Antes a barra sumia em "Carros do dia" porque filtrava a fila, que não é a lista da
  // tela. A saída não é esconder o controle: é fazê-lo valer aqui também. Um carro é a
  // reunião dos pedidos dele, então filtrar carro é perguntar pelos passageiros.
  //
  // ⚠️ REUSA a `dmCasaFiltro`, sem cópia. Passageiro de carro salvo não tem `.cancelado`
  // (o campo dele é `pedidoCancelado`, e a tarja vermelha o mostra sempre) — a primeira
  // linha daquela função não o alcança, e é isso que queremos: filtro nenhum pode apagar
  // o aviso de que o posto desmarcou alguém depois de o carro ficar pronto.
  //
  // 📌 A BUSCA POR TEXTO ENXERGA O CARRO, os selects não. Quem digita "ABC1D23" ou o nome
  // do motorista está procurando o VEÍCULO; quem escolhe "Cidade de destino" está
  // perguntando por pedidos. Os selects continuam mandando na busca por carro: procurar
  // uma placa dentro de "Joinville" não pode devolver um carro que vai para Curitiba.
  function dmCarroCasa(v, f) {
    const passageiros = v.passageiros || [];
    if (passageiros.some(function (p) { return dmCasaFiltro(p, f); })) return true;
    if (!f.q) return false;
    const semTexto = { cidade: f.cidade, local: f.local, veiculo: f.veiculo,
                       cancelados: f.cancelados, q: '' };
    if (!passageiros.some(function (p) { return dmCasaFiltro(p, semTexto); })) return false;
    const alvo = [v.placa, v.motoristaAtribuido, v.tipo, v.destino,
                  (v.roteiro || []).join(' '), v.localEmbarque, v.horaEmbarque]
                   .join(' ').toLowerCase();
    return alvo.indexOf(f.q) > -1;
  }

  function dmCarrosFiltrados() {
    const f = {
      cidade:  document.getElementById('dmFCidade').value,
      local:   document.getElementById('dmFLocal').value,
      veiculo: document.getElementById('dmFVeic').value,
      cancelados: dmVerCancelados,
      q: (document.getElementById('dmBusca').value || '').trim().toLowerCase()
    };
    return (estadoDm.veiculosSalvos || []).filter(function (v) { return dmCarroCasa(v, f); });
  }

  // ---- CARROS DO DIA (Parte 2) -------------------------------------------------
  // Lista os carros JÁ GRAVADOS, no mesmo card do passo 2. Lê de estadoDm.veiculosSalvos,
  // que o getDadosOperacao já devolve — nenhuma chamada nova ao servidor para listar.
  function dmOcupacaoSalvo(v) {
    let ocupado = 0;
    (v.passageiros || []).forEach(function (p) { ocupado += (parseInt(p.quantidade, 10) || 1); });
    const bloqueado = parseInt(v.bloqueados, 10) || 0;
    const limite = parseInt(v.limite, 10) || 0;
    return { ocupado: ocupado, bloqueado: bloqueado, limite: limite,
             livres: limite - ocupado - bloqueado };
  }

  // Quantas ligações já foram feitas neste carro. É o número que o estorno vai destruir,
  // então ele precisa estar à vista ANTES de alguém clicar em estornar (Parte 4).
  function dmConfirmadas(v) {
    let n = 0;
    (v.passageiros || []).forEach(function (p) {
      const s = (p.statusConfirmacao || '').toString().trim().toLowerCase();
      if (s && s !== 'pendente') n++;
    });
    return n;
  }

  // ⚠️ O mapa guarda quem está ABERTO, não quem está fechado: em "Carros do dia" o
  // padrão é recolhido — com 4 ou 5 carros expandidos a tela vira um rolo e o operador
  // perde a visão geral, que é justamente para o que ele veio a esta aba.
  // Chave por VIAGEM: duas viagens da mesma placa abririam juntas se fosse pela placa.
  function dmAlternarCarro(chave) {
    if (estadoDm.carrosAbertos[chave]) delete estadoDm.carrosAbertos[chave];
    else estadoDm.carrosAbertos[chave] = true;
    dmRenderCarros();
  }

  function dmRotaSalvoHTML(v) {
    const rota = Array.isArray(v.roteiro) ? v.roteiro.filter(Boolean) : [];
    const base = rota.length ? rota : (v.destino ? [v.destino] : []);
    if (!base.length) return 'sem destino';
    return ['Joinville'].concat(base.slice(0, base.length - 1)).join(' › ')
      + ' › <span class="cv-rota-destino">' + dmEsc(base[base.length - 1]) + '</span>'
      + (v.localEmbarque
          ? ' <span class="cv-rota-local">· Saída ' + dmEsc(v.localEmbarque) + '</span>' : '');
  }

  function dmChipSalvoHTML(p) {
    const al = (typeof regrasIdade === 'function') ? regrasIdade(p) : [];
    const nv = (typeof nivelMaisAlto === 'function') ? nivelMaisAlto(al) : '';
    const idade = (typeof calcularIdade === 'function') ? calcularIdade(p.nascimento) : null;
    let pills = al.map(function (a) {
      return '<span class="alerta-pill a-' + a.nivel + '" title="' + dmEsc(a.dica) + '">'
           + a.icone + ' ' + dmEsc(a.label) + '</span>';
    }).join('');
    // Vem PRIMEIRO, antes dos avisos de idade: e o unico que muda se a viagem deve
    // acontecer. Reusa a `.alerta-pill`, que ja e o lugar dos avisos dentro do chip.
    if (p.pedidoCancelado) {
      pills = '<span class="alerta-pill a-perigo" title="O posto cancelou este pedido '
            + 'depois que o carro foi montado. Confira antes de sair.">'
            + '🚫 PEDIDO CANCELADO</span>' + pills;
    }
    const obs = (typeof temRestricaoReal === 'function' && temRestricaoReal(p.observacao))
      ? '<span class="obs-texto">' + dmEsc(p.observacao) + '</span>' : '';

    const st = (p.statusConfirmacao || 'Pendente').toString().trim();
    const jaLigou = st.toLowerCase() !== 'pendente';
    const emb = p.enderecoEmbarque
      ? '<span class="cp-n-info" style="border:none;padding:0;flex:none;">Embarque: '
        + dmEsc(p.enderecoEmbarque) + '</span>' : '';

    return '<div class="chip-passageiro-novo' + (nv === 'perigo' ? ' perigo' : '') + '"'
         + ' style="cursor:default">'
         + '<div class="cp-novo-linha1">'
         +   '<span class="cp-n-hora">' + dmHora(p) + '</span>'
         +   '<span class="cp-n-nome">' + dmNomeHTML(p, '—')
         +     ' <span style="font-weight:normal;color:#475569">| '
         +     dmEsc(p.local || 'Sem local') + '</span></span>'
         +   '<span class="cp-n-info">' + (idade && !idade.semData ? idade.anos + ' anos' : '—')
         +     ' • ' + dmEsc(p.bairro || 'Sem bairro') + '</span>'
         +   (p.cidade ? '<span class="cp-cidade-tag">' + dmEsc(p.cidade) + '</span>' : '')
         +   '<span class="cp-n-vagas">' + (parseInt(p.quantidade, 10) || 1) + ' vaga(s)</span>'
         +   '<span class="dm-cs-conf ' + (jaLigou ? 'ok' : 'pend') + '">' + dmEsc(st) + '</span>'
         + '</div>'
         + (emb || obs || pills
             ? '<div class="cp-novo-linha2">' + emb + obs + pills + '</div>' : '')
         + '</div>';
  }

  function dmCardSalvoHTML(v) {
    const o = dmOcupacaoSalvo(v);
    const chaveCard = v.idViagem || v.placa;
    const recolhido = !estadoDm.carrosAbertos[chaveCard];
    const terc = v.categoria === 'terceirizado';
    const nConf = dmConfirmadas(v);

    let classeVagas = 'vagas-badge', textoVagas = o.livres + ' livre(s)';
    if (o.livres === 0) { classeVagas += ' sem-vaga'; textoVagas = 'Cheio'; }
    else if (0 > o.livres) {
      classeVagas += ' excedido';
      textoVagas = 'Excedido por ' + Math.abs(o.livres);
    }
    const pctOcup = o.limite > 0 ? Math.min(100, (o.ocupado / o.limite) * 100) : 0;
    const pctBloq = o.limite > 0 ? Math.min(100 - pctOcup, (o.bloqueado / o.limite) * 100) : 0;

    const chips = (v.passageiros || [])
      .slice()
      .sort(function (a, b) { return dmHoraOrd(a).localeCompare(dmHoraOrd(b)); })
      .map(function (p) { return dmChipSalvoHTML(p); }).join('');

    const pl = dmAspas(v.placa);
    // ⚠️ A acao vai pelo ID DA VIAGEM, nao pela placa: a mesma placa pode ter mais de uma
    // viagem no dia (bate-volta), e estornar/editar pela placa atingiria as duas.
    const idv = dmAspas(v.idViagem || '');
    // Encaixe: não oferecer o que o servidor vai recusar. O furgão do LACEN nunca leva
    // paciente — checado por TIPO, nunca por capacidade (a dele em bd_veiculos é 0 e
    // chega ao front valendo 4, então filtro numérico o deixaria passar).
    const ehLacen = dmNorm(v.tipo).indexOf('LACEN') > -1;
    const motivoEncaixe = ehLacen ? 'O furgão do LACEN não leva paciente'
                        : (0 >= o.livres ? 'Carro sem vaga livre' : '');
    return '<div class="card-veiculo' + (0 >= o.livres ? ' cheio' : '') + '">'
      + '<div class="cv-topo' + (recolhido ? ' recolhido' : '') + '"'
      +   ' onclick="dmAlternarCarro(\'' + dmAspas(chaveCard) + '\')">'
      +   '<div class="cv-topo-left">'
      +     '<span class="seta-sanfona">▼</span>'
      +     '<span class="cv-hora-saida' + (v.horaEmbarque ? '' : ' vazia') + '">'
      +       dmEsc(v.horaEmbarque || '--:--') + '</span>'
      +     '<span class="cv-rota">' + dmRotaSalvoHTML(v) + '</span>'
      +   '</div>'
      +   '<div class="cv-topo-right">'
      // AVISO URGENTE (29/09/2026): o mesmo selo e a mesma faixa da Guia (WhatsappFormatter).
      +     (typeof cvAvisoSeloHTML === 'function' ? cvAvisoSeloHTML(v) : '')
      +     '<div class="cv-topo-item"><span class="' + classeVagas + '">' + textoVagas
      +       '</span></div>'
      +     '<div class="cv-topo-item tipo-label">' + dmEsc(v.tipo) + '</div>'
      +     '<div class="cv-topo-item"><span class="placa-badge">' + dmEsc(v.placa)
      +       '</span></div>'
      +     '<div class="cv-topo-item"><span class="cat-badge' + (terc ? ' terc' : '') + '">'
      +       (terc ? 'Terc' : 'Púb') + '</span></div>'
      +     '<div class="cv-topo-item motorista-label">'
      +       dmEsc(v.motoristaAtribuido || '(Sem motorista)')
      // Dois motoristas (11/11/2026): o 2º ao lado, ou "a definir" até a Formação escolher.
      +       (v.doisMotoristas ? ' / ' + dmEsc(v.motorista2 || '2º a definir')
                + '<span class="dm-dois-chip" title="Viagem com dois motoristas: um na ida, outro na volta">2 motoristas</span>' : '')
      +       '</div>'
      +   '</div>'
      + '</div>'
      + '<div class="cv-corpo' + (recolhido ? ' recolhido' : '') + '"><div class="cv-corpo-inner">'
      +   (typeof cvAvisoFaixaHTML === 'function' ? cvAvisoFaixaHTML(v) : '')
      +   '<div class="cv-medidor"><div class="medidor-info"><span>Ocupado ' + o.ocupado
      +     ' · Bloqueado ' + o.bloqueado + ' · Limite ' + o.limite + '</span>'
      +     '<span>' + nConf + ' de ' + (v.passageiros || []).length + ' confirmado(s)</span>'
      +     '</div>'
      +     '<div class="barra"><div class="seg-ocupado" style="width:' + pctOcup + '%"></div>'
      +     '<div class="seg-bloqueado" style="width:' + pctBloq + '%"></div></div></div>'
      +   '<div class="cv-passageiros">' + chips + '</div>'
      +   '<div class="dm-cs-acoes">'
      +     '<button class="dm-cs-btn" onclick="dmAbrirEncaixe(&#39;' + pl + '&#39;, &#39;' + idv + '&#39;)"'
      +       (motivoEncaixe ? ' disabled title="' + dmEsc(motivoEncaixe) + '"' : '') + '>'
      +       '<i class="ti ti-user-plus"></i> Encaixe</button>'
      +     '<button class="dm-cs-btn" onclick="dmEditarCarro(\'' + pl + '\', \'' + idv + '\')">'
      +       '<i class="ti ti-pencil"></i> Editar</button>'
      +     '<button class="dm-cs-btn perigo" onclick="dmEstornarCarro(\'' + pl + '\', \'' + idv + '\')">'
      +       '<i class="ti ti-arrow-back-up"></i> Estornar</button>'
      +   '</div>'
      + '</div></div></div>';
  }

  // ---- VIAGEM DO LACEN ----------------------------------------------------------
  // Diária e fixa: 10h para Florianópolis, todos os dias, inclusive fim de semana
  // (docs/DECISOES.md). Não tem paciente — leva carga.
  //
  // 📌 Ela é montada AQUI, como carro de verdade, e daí flui sozinha para a Guia, o Kanban
  // e a Escala de Viagens. A alternativa — o relatório desenhar a viagem por conta própria —
  // criaria uma viagem que existe numa tela só, que ninguém consegue editar nem estornar.
  function dmVeiculoLacen() {
    const fonte = (estadoDm.veiculos || []).length > 0
      ? estadoDm.veiculos : (estadoDm.veiculosCadastro || []);
    return fonte.filter(function (v) {
      return dmNorm(v.tipo).indexOf('LACEN') > -1;
    })[0] || null;
  }

  function dmLacenMontado() {
    const v = dmVeiculoLacen();
    if (!v) return true;   // sem furgão cadastrado não há o que cobrar
    return (estadoDm.veiculosSalvos || []).some(function (x) {
      return (x.placa || '').toUpperCase() === (v.placa || '').toUpperCase();
    });
  }

  function dmChamadoLacenHTML() {
    if (dmLacenMontado()) return '';
    const v = dmVeiculoLacen();
    return '<div class="dm-lacen"><i class="ti ti-flask"></i>'
      + '<span>A viagem do <b>LACEN</b> ainda não foi montada neste dia — '
      + '<b>10h para Florianópolis</b>, com o furgão ' + dmEsc(v.placa) + '. '
      + 'Ela leva carga, não paciente.</span>'
      + '<button id="dmBtnLacen" onclick="dmMontarLacen()">'
      + '<i class="ti ti-plus"></i> Montar viagem do LACEN</button></div>';
  }

  function dmMontarLacen() {
    const v = dmVeiculoLacen();
    if (!v) return;
    const btn = document.getElementById('dmBtnLacen');
    if (btn) { btn.disabled = true; btn.textContent = 'Montando...'; }

    // Sem passageiros de propósito: o backend tem um caminho próprio para carro LACEN
    // (grava a linha "Carga / Insumos (Sem Pacientes)"), que já existia para a Aba 2.
    chamarServidor('salvarViagensAlocadas', [{
        data: estadoDm.data,
        operador: (typeof getOperador === 'function') ? getOperador() : '',
        alocacoes: [{
          placa: v.placa, tipo: v.tipo, motorista: '', bloqueados: 0,
          destino: 'Florianópolis', roteiro: ['Florianópolis'],
          horaEmbarque: '10:00',
          // Mesmo padrão dos outros carros. Vai para a col G (carro) e o backend replica
          // na col O da linha sintética, que é o que a Guia mostra ao motorista.
          localEmbarque: dmEmbarquePadrao(),
          passageiros: []
        }]
      }], function () {
        toast('Viagem do LACEN montada.', 'ok');
        if (typeof atualizarBadgeKanban === 'function') atualizarBadgeKanban();
        iniciarDemandas();
      }, function (e) {
        if (btn) { btn.disabled = false; btn.textContent = 'Montar viagem do LACEN'; }
        toast('Não montou. ' + ((e && e.message) ? e.message : e), 'erro');
      });
  }

  function dmRenderCarros() {
    const cont = document.getElementById('dmCorpo');
    const carros = dmCarrosFiltrados().slice()
      .sort(function (a, b) {
        return (a.horaEmbarque || '99:99').localeCompare(b.horaEmbarque || '99:99');
      });

    const chamado = dmChamadoLacenHTML();

    if (carros.length === 0) {
      // Dois vazios diferentes, e confundi-los faria o operador achar que perdeu o dia:
      // "não montei nenhum carro" é uma coisa, "o filtro escondeu todos" é outra.
      const nenhumMontado = (estadoDm.veiculosSalvos || []).length === 0;
      cont.innerHTML = chamado
        + '<div class="dm-vazio"><span class="dm-ico"><i class="ti ti-car-off"></i></span>'
        + (nenhumMontado
            ? 'Nenhum carro montado nesta data.<br>Monte o primeiro pela aba <b>Montar Carros</b>.'
            : 'Nenhum carro com os filtros atuais.<br>'
              + 'São <b>' + (estadoDm.veiculosSalvos || []).length
              + '</b> carro(s) montado(s) nesta data.')
        + '</div>';
      return;
    }
    cont.innerHTML = chamado + '<div class="dm-carros">'
      + carros.map(function (v) { return dmCardSalvoHTML(v); }).join('') + '</div>';
  }

  // ---- EDITAR CARRO GRAVADO (Parte 3) ------------------------------------------
  // Reusa o MESMO modal do passo 2. A diferença mora em `montagem.editando`: com ele
  // preenchido, os pacientes vêm do carro salvo (e não da fila), o botão grava pela
  // atualizarCarroAlocado, e não há passo 1 — a placa não muda aqui.
  // Identidade do passageiro (passo 3.1, 16/09) — espelho EXATO de `_idPassageiro` (Código.gs): matrícula;
  // sem ela, o nome; sem os dois, "#" + chave do pedido; sem nada, "@" + ID da linha (D6). Marcador nulo
  // ("-", "N/A", "Não informado") não é identidade.
  // 🔴 Servidor chega com matrícula "-" e nome "-": com o texto cru, todos os servidores do carro tinham a
  // chave "-", e tirar um apagava todos. A tela manda esta chave e o servidor procura a linha por ela.
  function dmMarcadorNulo(s) {
    const t = dmNorm(s).split(' ').filter(Boolean).join(' ');
    return t === '' || t === '-' || t === 'N/A' || t === 'NA' || t === 'NAO INFORMADO' || t === 'SEM INFORMACAO';
  }
  function dmChaveP(p) {
    const m = dmMarcadorNulo(p.matricula) ? '' : (p.matricula || '').toString().trim();
    const n = dmMarcadorNulo(p.nome) ? '' : (p.nome || '').toString().trim();
    const c = (p.chaveDemanda || '').toString().trim();
    const l = (p.idLinha || '').toString().trim();
    return (m || n || (c ? '#' + c : (l ? '@' + l : ''))).toUpperCase();
  }
  // O que a tela MOSTRA no lugar do nome (passo 3.2, 16/09). Servidor não tem nome: aparece como "Servidor",
  // como no selo da Remoção Interna (Hélio, 16/09 — o objetivo já tem coluna própria na fila e no painel).
  // ⚠️ Só exibição — a identidade é `dmChaveP`, e o `nome` gravado não muda.
  function dmNomeExib(p) {
    if (dmMarcadorNulo(p.nome) && dmMarcadorNulo(p.matricula)) {
      // Servidor identificado (S.3, 18/09): "Servidor FULANO" — o nome que o gestor informou ao montar o carro.
      const sn = dmMarcadorNulo(p.servidorNome) ? '' : (p.servidorNome || '').toString().trim();
      return 'Servidor' + (sn ? ' ' + sn : '');
    }
    return p.nome || '';
  }
  // O nome já em HTML: servidor vira o selo azul "SERVIDOR" (passo 6.3, 17/09 — pedido do Hélio); o resto sai
  // escapado, como sempre. Usar onde o nome é DESENHADO; em texto puro (avisos, aria-label) fica dmNomeExib.
  function dmNomeHTML(p, vazio) {
    if (dmMarcadorNulo(p.nome) && dmMarcadorNulo(p.matricula)) {
      const sn = dmMarcadorNulo(p.servidorNome) ? '' : (p.servidorNome || '').toString().trim();
      return '<span class="dm-selo-serv">Servidor</span>' + (sn ? ' ' + dmEsc(sn) : '');   // S.3: + o nome
    }
    return dmEsc(dmNomeExib(p) || vazio || '');
  }
  // Matrícula para exibir: marcador nulo ("-", "N/A") aparece como "—", e não como "mat. -".
  function dmMatExib(p) {
    if (dmMarcadorNulo(p.nome) && dmMarcadorNulo(p.matricula)) {
      // Servidor: a matrícula dele, quando informada (S.3); senão "—".
      const sm = dmMarcadorNulo(p.servidorMatricula) ? '' : (p.servidorMatricula || '').toString().trim();
      return sm || '—';
    }
    return dmMarcadorNulo(p.matricula) ? '—' : (p.matricula || '').toString().trim();
  }

  function dmEditarCarro(placa, idViagem) {
    const v = (estadoDm.veiculosSalvos || []).filter(function (x) {
      return idViagem ? x.idViagem === idViagem : x.placa === placa;
    })[0];
    if (!v) { toast('Carro não encontrado. Recarregue a tela.', 'erro'); return; }

    // Cópias: mexer no card não pode alterar estadoDm.veiculosSalvos antes de gravar,
    // senão cancelar a edição deixaria a tela mostrando o que não está na planilha.
    const pacs = (v.passageiros || []).map(function (p) {
      const c = {};
      Object.keys(p).forEach(function (k) { c[k] = p[k]; });
      return c;
    }).sort(function (a, b) { return dmHoraOrd(a).localeCompare(dmHoraOrd(b)); });

    let pass = 0;
    pacs.forEach(function (p) { pass += dmQtd(p); });

    estadoDm.montagem = {
      editando: placa,
      idViagem: (v.idViagem || ''),
      pacs: pacs,
      removidos: [],
      ids: pacs.map(function (p) { return p.id; }),
      pacientes: pacs.length,
      passageiros: pass,
      saida: dmBaseSaida(pacs),
      aba: v.categoria === 'terceirizado' ? 'terceirizado' : 'publico',
      passo: 2,
      placa: placa,
      tipo: v.tipo || '',
      capacidade: parseInt(v.limite, 10) || 0,
      motoristaProprio: v.motoristaAtribuido || '',
      horaSaida: (v.horaEmbarque || '').toString().trim(),
      localEmbarque: (v.localEmbarque || '').toString().trim(),
      bloqueados: parseInt(v.bloqueados, 10) || 0,
      roteiro: (Array.isArray(v.roteiro) ? v.roteiro.slice() : (v.destino ? [v.destino] : [])),
      // Tudo que veio da planilha entra como manual: o sincronismo não pode varrer fora
      // uma parada de passagem que o operador já tinha escolhido antes de gravar.
      roteiroManuais: (Array.isArray(v.roteiro) ? v.roteiro.slice() : []),
      roteiroRemovidas: [],
      roteiroOrdemManual: true,
      perdidos: [],
      // AVISO URGENTE do carro (29/09/2026): vai junto no atualizarCarroAlocado; o servidor só
      // grava (e marca "não enviado") se o texto mudou.
      aviso: (v.aviso || '').toString(),
      // DOIS MOTORISTAS (11/11/2026): a marca da viagem; o nome do 2º é escolhido na Formação.
      doisMotoristas: !!v.doisMotoristas
    };

    document.getElementById('dmMoSub').textContent =
        'Editando ' + placa + ' · ' + pacs.length + ' paciente(s) · ' + pass + ' passageiro(s)';

    dmFecharDrawer();
    dmModalCabeca(2);
    dmModalRenderConfirma();
    document.getElementById('dmModal').classList.add('on');
    document.getElementById('dmMoFundo').classList.add('on');
  }

  function dmSalvarEdicao() {
    const m = estadoDm.montagem;
    if (!m || !m.editando) return;
    const falta = dmMontagemFalta(m);
    if (falta) { toast(falta, 'erro'); return; }

    const pac = dmMontagemPacientes();
    const semEmb = dmSemEmbarque(pac);
    if (semEmb.length) { dmAvisarSemEmbarque(semEmb); return; }
    const semServ = dmSemIdentServidor(pac);   // S.3
    if (semServ.length) { dmAvisarSemIdentServidor(semServ); return; }
    dmSincronizarRoteiro(pac);
    const rota = m.roteiro || [];

    const embarques = {};
    pac.forEach(function (p) {
      if (p.enderecoEmbarque !== undefined) embarques[dmChaveP(p)] = p.enderecoEmbarque || '';
    });
    // Nome e matrícula do servidor (S.3): mesma chave do embarque. O encaixe novo leva no próprio item.
    const servidores = {};
    pac.forEach(function (p) {
      if (!p.__novo && dmEhServidor(p)) {
        servidores[dmChaveP(p)] = { nome: p.servidorNome || '', matricula: p.servidorMatricula || '' };
      }
    });

    const btn = document.getElementById('dmMoNext');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
    document.getElementById('dmMoDica').textContent = 'Gravando na planilha...';

    const placa = m.editando;
    chamarServidor('atualizarCarroAlocado', [estadoDm.data, placa, {
        horaSaida: m.horaSaida,
        localEmbarque: m.localEmbarque,
        roteiro: rota,
        destino: rota.length ? rota[rota.length - 1] : '',
        bloqueados: parseInt(m.bloqueados, 10) || 0,
        // AVISO URGENTE (29/09): o servidor ignora se não mudou. Sem o campo no estado, vai null ("não
        // mexer") e NUNCA "" — texto vazio apagaria o aviso do carro sem ninguém ter pedido.
        aviso: (m.aviso === undefined || m.aviso === null) ? null : m.aviso.toString(),
        // Dois motoristas (11/11/2026): só carro público; o servidor confere de novo.
        doisMotoristas: m.aba === 'publico' && !!m.doisMotoristas,
        removerMatriculas: m.removidos || [],
        // Quem tem `__novo` ainda não está na planilha: vira INSERT no servidor, com o
        // cabeçalho já ajustado por esta mesma edição. Os demais só têm campos reescritos.
        encaixar: pac.filter(function (p) { return !!p.__novo; }).map(function (p) {
          return {
            matricula: p.matricula || '', nome: p.nome || '',
            nascimento: p.nascimento || '', telefones: p.telefones || '',
            bairro: p.bairro || '', enderecoEmbarque: p.enderecoEmbarque || '',
            enderecoResidencia: p.enderecoResidencia || '',
            // 🔑 A identidade do PEDIDO. Sem ela a coluna AG nasce vazia e a
            // exclusão da fila volta a ser por pessoa — o defeito de 27/08.
            chaveDemanda: p.chaveDemanda || '',
            acompanhante: p.acompanhante || '', telefonesAcomp: p.telefonesAcomp || '',
            quantidade: dmQtd(p), trecho: p.trecho || '', objetivo: p.objetivo || '',
            local: p.local || '', observacao: p.observacao || '',
            hora: p.hora || '', cidade: p.cidade || '',
            tipoSolicitado: p.tipoSolicitado || '',
            servidorNome: p.servidorNome || '', servidorMatricula: p.servidorMatricula || ''   // S.3
          };
        }),
        embarques: embarques,
        servidores: servidores
      }, (typeof getOperador === 'function') ? getOperador() : '', m.idViagem || ''], function (dados) {
        dmFecharModal();
        toast('Carro ' + dmEsc(placa) + ' atualizado.', 'ok');
        if (typeof atualizarBadgeKanban === 'function') atualizarBadgeKanban();
        dmCarregar(dados);   // o backend já devolve o getDadosOperacao inteiro
      }, function (e) {
        const b = document.getElementById('dmMoNext');
        if (b) { b.disabled = false; b.textContent = 'Salvar alterações'; }
        document.getElementById('dmMoDica').textContent = 'Não gravou.';
        toast('Não gravou. ' + ((e && e.message) ? e.message : e), 'erro');
      });
  }

  // ---- diálogo de confirmação, genérico -----------------------------------------
  let dmCfmAcao = null;

  function dmConfirmar(titulo, corpoHTML, labelOk, classe, aoConfirmar) {
    dmCfmAcao = aoConfirmar;
    document.getElementById('dmCfmTit').textContent = titulo;
    document.getElementById('dmCfmCorpo').innerHTML = corpoHTML;
    const ok = document.getElementById('dmCfmOk');
    ok.textContent = labelOk;
    ok.disabled = false;
    ok.className = 'dm-mo-next' + (classe === 'perigo' ? ' perigo' : '');
    ok.onclick = function () { if (dmCfmAcao) dmCfmAcao(); };
    document.getElementById('dmCfm').classList.add('on');
    document.getElementById('dmCfmFundo').classList.add('on');
  }

  function dmFecharConfirma() {
    dmCfmAcao = null;
    // Desfaz o modo "só OK" do dmAvisoOk (o Cancelar volta a aparecer; Esc deixa de fechar).
    const cancelar = document.querySelector('#dmCfm .dm-mo-cancelar');
    if (cancelar) cancelar.style.display = '';
    document.removeEventListener('keydown', dmAvisoTecla);
    document.getElementById('dmCfm').classList.remove('on');
    document.getElementById('dmCfmFundo').classList.remove('on');
  }

  // ---- aviso só com OK (fecha no OK ou no Esc) — 16/09 -----------------------------
  function dmAvisoOk(titulo, corpoHTML) {
    dmCfmAcao = null;
    document.getElementById('dmCfmTit').textContent = titulo;
    document.getElementById('dmCfmCorpo').innerHTML = corpoHTML;
    const cancelar = document.querySelector('#dmCfm .dm-mo-cancelar');
    if (cancelar) cancelar.style.display = 'none';
    const ok = document.getElementById('dmCfmOk');
    ok.textContent = 'OK';
    ok.disabled = false;
    ok.className = 'dm-mo-next';
    ok.onclick = dmFecharConfirma;
    document.getElementById('dmCfm').classList.add('on');
    document.getElementById('dmCfmFundo').classList.add('on');
    document.addEventListener('keydown', dmAvisoTecla);
    if (ok.focus) ok.focus();
  }
  function dmAvisoTecla(ev) {
    if (ev.key === 'Escape') { ev.preventDefault(); dmFecharConfirma(); }
  }

  // ---- EMBARQUE OBRIGATÓRIO ao salvar o carro (pedido do setor, 16/09) ---------------
  // Passageiro em "Selecione..." não grava: o motorista não saberia onde buscá-lo.
  function dmSemEmbarque(pac) {
    return (pac || []).filter(function (p) { return !(p.enderecoEmbarque || '').toString().trim(); });
  }
  // O aviso usa o mesmo nome que a tela mostra (dmNomeExib, passo 3.2).
  function dmNomeAviso(p) {
    return dmNomeExib(p) || '(sem nome)';
  }
  function dmAvisarSemEmbarque(faltam) {
    const nomes = faltam.map(function (p) { return '<b>' + dmEsc(dmNomeAviso(p)) + '</b>'; });
    const corpo = faltam.length === 1
      ? '<p>Selecione um local de embarque para o paciente ' + nomes[0] + '.</p>'
      : '<p>Selecione um local de embarque para os pacientes:</p><p>' + nomes.join('<br>') + '</p>';
    dmAvisoOk('Falta o local de embarque', corpo);
  }

  // ---- SERVIDOR IDENTIFICADO ao salvar o carro (S.3, 18/09 — pedido do Hélio) --------
  // O dash não traz nome nem matrícula de servidor; o gestor tem no sistema da prefeitura. Carro com servidor sem
  // os dois não grava — mesmo jeito do embarque. Eles vão para colunas próprias (AH/AI), só exibição e registro:
  // a identidade do servidor continua a chave do pedido (dmChaveP), e nome/matrícula da linha seguem "-".
  function dmEhServidor(p) {
    return dmMarcadorNulo(p.nome) && dmMarcadorNulo(p.matricula);
  }
  function dmIdentServidor(p) {
    return {
      nome: dmMarcadorNulo(p.servidorNome) ? '' : (p.servidorNome || '').toString().trim(),
      matricula: dmMarcadorNulo(p.servidorMatricula) ? '' : (p.servidorMatricula || '').toString().trim()
    };
  }
  function dmSemIdentServidor(pac) {
    return (pac || []).filter(function (p) {
      if (!dmEhServidor(p)) return false;
      const s = dmIdentServidor(p);
      return !s.nome || !s.matricula;
    });
  }
  // Todos são "Servidor": o aviso diz qual pelo objetivo e pela hora.
  function dmAvisarSemIdentServidor(faltam) {
    const itens = faltam.map(function (p) {
      return '<b>' + dmEsc(p.objetivo || 'Servidor') + '</b>' + (p.hora ? ' · ' + dmEsc(p.hora) : '');
    });
    const corpo = (faltam.length === 1
        ? '<p>Informe o <b>nome</b> e a <b>matrícula</b> do servidor: ' + itens[0] + '.</p>'
        : '<p>Informe o <b>nome</b> e a <b>matrícula</b> dos servidores:</p><p>' + itens.join('<br>') + '</p>')
      + '<p style="color:#64748b;font-size:12px;">Os campos ficam no card do servidor, embaixo do embarque.</p>';
    dmAvisoOk('Falta identificar o servidor', corpo);
  }
  // Campos no card da montagem/edição. O valor fica no próprio passageiro (fila ou cópia do carro), como o
  // embarque — redesenhar o card não o perde. `id` já vem escapado (dmAspas), como no embarque.
  function dmCamposServidorHTML(p, id) {
    if (!dmEhServidor(p)) return '';
    const s = dmIdentServidor(p);
    // O objetivo abre o quadro: vários servidores no mesmo carro são todos "Servidor", e é pelo pedido que o
    // gestor acha o nome no sistema da prefeitura.
    return '<div class="dm-serv-ident" onclick="event.stopPropagation()">'
      + (p.objetivo ? '<span class="dm-serv-obj">' + dmEsc(p.objetivo) + '</span>' : '')
      + '<label>Nome *</label>'
      + '<input type="text" class="dm-serv-in' + (s.nome ? '' : ' falta') + '" placeholder="Nome completo do servidor"'
      +   ' value="' + dmEsc(p.servidorNome || '') + '" autocomplete="off"'
      +   ' oninput="dmServidorCampo(\'' + id + '\', \'nome\', this)">'
      + '<label>Matrícula *</label>'
      + '<input type="text" class="dm-serv-in mat' + (s.matricula ? '' : ' falta') + '" placeholder="Matrícula"'
      +   ' value="' + dmEsc(p.servidorMatricula || '') + '" autocomplete="off"'
      +   ' oninput="dmServidorCampo(\'' + id + '\', \'matricula\', this)">'
      + '</div>';
  }
  function dmServidorCampo(id, campo, el) {
    const m = estadoDm.montagem;
    const fonte = (m && m.editando) ? (m.pacs || []) : estadoDm.pacientes;
    const p = (fonte || []).filter(function (x) { return x.id === id; })[0];
    if (!p || !el) return;
    if (campo === 'nome') p.servidorNome = el.value; else p.servidorMatricula = el.value;
    if (el.classList) el.classList.toggle('falta', dmMarcadorNulo(el.value));
  }

  function dmConfirmaOcupado(txt) {
    const ok = document.getElementById('dmCfmOk');
    if (!ok) return;
    ok.disabled = !!txt;
    if (txt) ok.textContent = txt;
  }

  // ---- ESTORNAR CARRO (Parte 4) --------------------------------------------------
  // Aqui é desfazer de verdade: as linhas são APAGADAS, os pacientes voltam à fila e o
  // veículo à frota livre. Usa o estornarViagemAlocada que já existe.
  function dmEstornarCarro(placa, idViagem) {
    const v = (estadoDm.veiculosSalvos || []).filter(function (x) {
      return idViagem ? x.idViagem === idViagem : x.placa === placa;
    })[0];
    if (!v) { toast('Carro não encontrado. Recarregue a tela.', 'erro'); return; }

    const n = (v.passageiros || []).length;
    const nConf = dmConfirmadas(v);

    const corpo =
        '<div class="dm-cfm-carro">'
      +   '<span class="placa-badge">' + dmEsc(placa) + '</span>'
      +   '<span><b>' + dmEsc(v.tipo || '—') + '</b></span>'
      +   '<span>saída ' + dmEsc(v.horaEmbarque || '--:--') + '</span>'
      +   '<span class="cv-rota">' + dmRotaSalvoHTML(v) + '</span>'
      + '</div>'
      + '<p>Os <b>' + n + ' paciente(s)</b> voltam para a fila e o veículo volta para a '
      +   'frota livre. Eles ficam <b>já selecionados</b>, para você remontar num clique.</p>'
      // ⚠️ O número precisa estar à vista ANTES do clique: o estorno apaga as linhas, e
      // com elas as colunas AA–AE, que são a única memória de quem já foi avisado.
      // Diferente da EDIÇÃO, que preserva — por isso vale sempre perguntar se editar
      // não resolve antes de desfazer tudo.
      + (nConf > 0
          ? '<div class="dm-mo-nota"><b>' + nConf + ' confirmação(ões) por telefone '
            + 'será(ão) perdida(s).</b> Essas pessoas precisarão ser ligadas de novo. '
            + 'Se a intenção é só corrigir hora, local ou roteiro, <b>Editar</b> preserva '
            + 'as ligações.</div>'
          : '<p style="color:#8f9c97;font-size:11.5px;">Nenhuma ligação registrada neste '
            + 'carro — nada de trabalho de telefone se perde.</p>');

    dmConfirmar('Estornar ' + placa, corpo, 'Estornar carro', 'perigo', function () {
      dmEstornarConfirmado(placa, v);
    });
  }

  function dmEstornarConfirmado(placa, v) {
    // Chaves capturadas ANTES da chamada: depois do estorno o carro não existe mais, e
    // é por elas que os pacientes são reencontrados na fila para voltarem selecionados.
    const chaves = (v.passageiros || []).map(dmChaveP).filter(Boolean);
    dmConfirmaOcupado('Estornando...');

    chamarServidor('estornarViagemAlocada', [estadoDm.data, placa,
                             (typeof getOperador === 'function') ? getOperador() : '',
                             v.idViagem || ''], function (dados) {
        dmFecharConfirma();
        estadoDm.modo = 'fila';        // antes do dmCarregar, que já renderiza
        dmCarregar(dados);
        let n = 0;
        estadoDm.pacientes.forEach(function (p) {
          if (chaves.indexOf(dmChaveP(p)) > -1) { estadoDm.selecionados[p.id] = true; n++; }
        });
        dmRender();
        if (typeof atualizarBadgeKanban === 'function') atualizarBadgeKanban();
        toast('Carro ' + dmEsc(placa) + ' estornado. ' + n
            + ' paciente(s) de volta na fila, já selecionados.', 'ok');
      }, function (e) {
        dmConfirmaOcupado('');
        document.getElementById('dmCfmOk').textContent = 'Estornar carro';
        toast('Não estornou. ' + ((e && e.message) ? e.message : e), 'erro');
      });
  }

  function dmTrocarModo(modo) {
    estadoDm.modo = modo;
    dmFecharDrawer();
    dmRender();
  }

  // O botão só existe quando há cancelado no dia. Botão permanente com "0" ao lado ensinaria
  // o operador a ignorá-lo, e ele é justamente o que não pode passar despercebido.
  function dmPintarBotaoCancel() {
    const btn = document.getElementById('dmBtnCancel');
    if (!btn) return;
    const n = (estadoDm.pacientes || []).filter(function (p) { return !!p.cancelado; }).length;
    btn.classList.toggle('tem', n > 0);
    btn.classList.toggle('on', dmVerCancelados && n > 0);
    document.getElementById('dmNCancel').textContent = n;
    if (n === 0 && dmVerCancelados) dmVerCancelados = false;   // sem cancelados, sem filtro ligado
  }

  function dmPintarModos() {
    dmPintarBotaoCancel();
    const fila = estadoDm.modo !== 'carros';
    document.getElementById('dmModoFila').classList.toggle('on', fila);
    document.getElementById('dmModoCarros').classList.toggle('on', !fila);
    document.getElementById('dmModoFilaN').textContent =
      dmFiltrados().filter(function (p) { return !p.cancelado; }).length;
    // Os dois contadores dizem a MESMA coisa: quantos itens você acha se clicar aqui. Se um
    // respeitasse o filtro e o outro não, a soma dos dois números nunca fecharia com a tela.
    document.getElementById('dmModoCarrosN').textContent = dmCarrosFiltrados().length;

    // Filtros e busca ficam nos DOIS modos desde 02/09. Antes sumiam, porque filtravam a
    // fila e a fila não é a lista de "Carros do dia" — mas sumir tinha um preço alto: para
    // achar um paciente já embarcado o operador tinha de abrir carro por carro. Agora eles
    // valem aqui também (dmCarroCasa), e só o botão "Cancelados" segue sendo da fila.
    const tela = document.getElementById('demandas');
    tela.classList.toggle('modo-carros', !fila);

    // A barra flutuante é de montagem. Em "Carros do dia" ela oferece "Montar carro" para
    // uma seleção que não está à vista — some, sem perder a seleção guardada.
    if (!fila) {
      document.getElementById('dmBarra').classList.remove('on');
      tela.classList.remove('tem-selecao');
    }
  }

  // Duas contagens e as duas importam: PACIENTES é quantas demandas há (linhas),
  // PASSAGEIROS é quanta gente vai de fato (soma da Qtd, que já inclui acompanhante).
  function dmPintarResumo() {
    const lista = dmFiltrados();
    // ⚠️ O resumo conta o TRABALHO DO DIA, e pedido cancelado não é trabalho. Ele aparece
    // na lista quando o filtro está ligado, mas nunca soma em "Na fila" — senão ligar o
    // botão faria o dia parecer maior do que é.
    const contaveis = lista.filter(function (p) { return !p.cancelado; });
    let passageiros = 0;
    contaveis.forEach(function (p) { passageiros += dmQtd(p); });
    dmResumoDia(contaveis, passageiros);
    return lista;
  }

  function dmRender() {
    if (estadoDm.carregando) return;
    dmPintarModos();
    if (estadoDm.modo === 'carros') {
      // ⚠️ O resumo do topo ficava congelado aqui: ele só era pintado no ramo da FILA, e
      // quem monta/encaixa está justamente em "Carros do dia". Os números só mudavam
      // depois de um F5 (que devolve a tela ao modo fila). O resumo fala do dia inteiro —
      // fila E montado —, então vale nos dois modos.
      dmPintarResumo();
      dmRenderCarros();
      return;
    }
    const lista = dmPintarResumo();
    const cont = document.getElementById('dmCorpo');
    dmAtualizarBarra();

    // O chamado do LACEN vale nos DOIS modos: quem está montando o dia está aqui na fila,
    // e obrigar a trocar de aba só para lembrar de uma viagem fixa é atrito à toa.
    const chamadoLacen = dmChamadoLacenHTML();

    if (lista.length === 0) {
      cont.innerHTML = chamadoLacen
        + '<div class="dm-vazio"><span class="dm-ico"><i class="ti ti-mood-empty"></i></span>'
        + (estadoDm.pacientes.length === 0
            ? 'Nenhuma demanda para esta data.'
            : 'Nenhuma demanda com os filtros atuais.') + '</div>';
      return;
    }

    // Agrupa CIDADE -> HORA, na mesma leitura da Guia dos Motoristas
    // A chave é a cidade SEM ACENTO (defeito 3, 06/11); o nome mostrado é o com acento, quando houver.
    const porCidade = {}, rotCidade = {};
    lista.forEach(function (p) {
      const nomeC = (p.cidade || 'SEM CIDADE').toString().trim().toUpperCase();
      const c = dmNorm(nomeC);
      if (!rotCidade[c] || nomeC !== c) rotCidade[c] = nomeC;
      if (!porCidade[c]) porCidade[c] = {};
      const h = dmHora(p);
      if (!porCidade[c][h]) porCidade[c][h] = [];
      porCidade[c][h].push(p);
    });

    // Tabela ÚNICA: cabeçalho uma vez só (fixo no topo) e cidades como linhas.
    let html = '<table class="dm-tab">' + DM_COLGROUP
             + '<thead><tr>'
             + '<th><input type="checkbox" class="dm-chk" id="dmChkTodos" onchange="dmMarcarTodos(this)" title="Marcar tudo que está na tela"></th>'
             + '<th>Veículo</th><th>Local</th><th>Objetivo</th>'
             + '<th>Restr.</th><th>Qtd</th><th>Paciente</th><th>Idade</th><th>Bairro</th>'
             + '</tr></thead><tbody>';

    // Ordem das cidades: DIREÇÃO + VIZINHANÇA (29/09/2026), calculada no servidor a partir da aba
    // bd_cidades_geo — cidades que podem ir no mesmo carro ficam lado a lado. Cidade ainda sem
    // coordenada vai para o fim, em ordem alfabética. Sem nenhuma coordenada (aba vazia), a tela
    // fica como era: alfabética e sem divisórias.
    const geo = estadoDm.geoCidades || {};
    const geoDe = function (cid) { return geo[dmNorm(cid).replace(/\s+/g, ' ')] || null; };
    const cidades = Object.keys(porCidade).sort(function (a, b) {
      const ga = geoDe(a), gb = geoDe(b);
      if (ga && gb) return ga.ordem - gb.ordem;
      if (ga) return -1;
      if (gb) return 1;
      return a.localeCompare(b, 'pt-BR');
    });
    const comDirecao = cidades.some(function (c) { return !!geoDe(c); });
    let direcaoAnterior = null;

    cidades.forEach(function (cid) {
      const g = geoDe(cid);
      if (comDirecao) {
        const direcao = g ? g.direcao : 'Sem localização';
        if (direcao !== direcaoAnterior) {
          html += '<tr class="dm-direcao-row"><td colspan="9">' + dmEsc(direcao) + '</td></tr>';
          direcaoAnterior = direcao;
        }
      }
      const horas = Object.keys(porCidade[cid]).sort();
      let nPac = 0, nPass = 0;
      horas.forEach(function (h) {
        porCidade[cid][h].forEach(function (p) { nPac++; nPass += dmQtd(p); });
      });

      html += '<tr class="dm-cidade-row"><td colspan="9"><div class="dm-cidade-in">'
            + '<i class="ti ti-map-pin"></i>' + dmEsc(rotCidade[cid] || cid)
            + (g ? '<span class="dm-cid-km">' + g.km + ' km</span>' : '')
            + '<span class="dm-cid-n">' + nPac + ' paciente(s) / ' + nPass + ' passageiro(s) ao total</span>'
            + '</div></td></tr>';

      horas.forEach(function (h) {
        const grupo = porCidade[cid][h];
        let nG = 0;
        grupo.forEach(function (p) { nG += dmQtd(p); });
        html += '<tr class="dm-banda"><td colspan="9"><div class="dm-banda-in">'
              + '<span class="dm-hora-chip">' + dmEsc(h) + '</span>'
              + '<span class="dm-banda-turno">' + dmTurno(h) + '</span>'
              + '<span class="dm-banda-cidade"><i class="ti ti-map-pin"></i> ' + dmEsc(cid) + '</span>'
              + '<span class="dm-banda-meta">' + grupo.length + ' paciente(s) · ' + nG + ' passageiro(s)</span>'
              + '</div></td></tr>';
        grupo.forEach(function (p) { html += dmLinha(p); });
      });

    });
    cont.innerHTML = chamadoLacen + html + '</tbody></table>';
    dmAtualizarChkTodos();
    dmPedirAtualizacao(); // a tabela mudou: remede quem está grudado
  }

  function dmLinha(p) {
    const idade = (typeof calcularIdade === 'function') ? calcularIdade(p.nascimento) : null;
    const alertas = (typeof regrasIdade === 'function') ? regrasIdade(p) : [];
    const semAcomp = alertas.filter(function (a) { return a.label.indexOf('SEM ACOMPANHANTE') > -1; })[0];
    const ctb = alertas.filter(function (a) { return a.label.indexOf('ACOMPANHANTE') === -1; })[0];
    const restr = dmRestricao(p);
    const cor = dmCorAvatar(dmNomeExib(p));

    let selos = '';
    if (semAcomp) selos += '<span class="dm-selo risco">⚠️ ' + dmEsc(semAcomp.label) + '</span> ';
    if (ctb) selos += '<span class="dm-selo ctb">' + dmEsc(ctb.icone + ' ' + ctb.label) + '</span>';

    const id = dmAspas(p.id);
    const marcado = !!estadoDm.selecionados[p.id];

    // Clique na LINHA abre o painel; o clique no checkbox precisa parar a propagação,
    // senão marcar alguém abriria o painel junto.
    // ⚠️ Cancelado NÃO tem caixa de seleção. Deixá-la ali seria oferecer montar carro para
    // quem cancelou — e o servidor aceitaria, porque para ele é um pedido como outro
    // qualquer. A recusa tem de estar aqui, onde o operador vê o motivo.
    const cel = p.cancelado
      ? '<td></td>'
      : '<td onclick="event.stopPropagation()">'
        + '<input type="checkbox" class="dm-chk"' + (marcado ? ' checked' : '')
        + ' onchange="dmSelecionar(\'' + id + '\', this.checked)"'
        + ' aria-label="Selecionar ' + dmEsc(dmNomeExib(p)) + '"></td>';

    let html = '<tr class="dm-linha' + (marcado ? ' sel' : '')
      + (p.cancelado ? ' cancelada' : '') + '" onclick="dmAbrirDrawer(\'' + id + '\')">'
      + cel
      + '<td>' + (p.tipoSolicitado
                    ? '<span class="dm-veic ' + dmClasseVeiculo(p.tipoSolicitado) + '">'
                      + dmEsc(p.tipoSolicitado) + '</span>'
                    : dmVazio())
      // Cancelar direto da linha (05/10/2026). Para o clique aqui, como a caixa de seleção: senão abriria a
      // ficha junto. Cancelado não tem o botão (já está cancelado).
      +   (p.cancelado ? '' : '<button class="dm-cancelar-linha" title="Cancelar este pedido"'
                              + ' onclick="event.stopPropagation();dmCancelarPedido(\'' + id + '\')">'
                              + '<i class="ti ti-user-x"></i>Cancelar</button>')
      + '</td>'
      // Servidor: o selo azul também ao lado do local (30/09, pedido do Hélio), para bater o olho sem ler o nome.
      + '<td>' + (dmEhServidor(p)
            ? '<div class="dm-local-serv">' + dmTexto(p.local, 'dm-up') + '<span class="dm-selo-serv">Servidor</span></div>'
            : dmTexto(p.local, 'dm-up')) + '</td>'
      + '<td>' + dmTexto(p.objetivo, 'dm-up') + '</td>'
      + '<td>' + (restr
            ? '<span class="dm-restr-btn" title="Tem restrição — clique para ver">'
              + '<i class="ti ti-alert-triangle"></i></span>'
            : dmVazio()) + '</td>'
      + '<td><span class="dm-qtd">' + dmQtd(p) + '</span></td>'
      + '<td><div class="dm-pac">'
      +   '<div class="dm-av" style="background:' + cor[0] + ';color:' + cor[1] + ';">' + dmEsc(dmIniciais(dmNomeExib(p))) + '</div>'
      +   '<div class="dm-pac-txt">'
      +     '<div class="dm-nome" title="' + dmEsc(dmNomeExib(p)) + '">' + dmNomeHTML(p) + '</div>'
      +     (p.cancelado ? '<span class="dm-selo-cancel"' + (p.motivoCancelamento ? ' title="' + dmEsc(p.motivoCancelamento) + '"' : '') + '>'
                             + dmEsc(dmMarcaCancelado(p)) + '</span>' : '')
      +     '<div class="dm-mat">mat. ' + dmEsc(dmMatExib(p)) + '</div>'
      +     selos
      +   '</div></div></td>'
      // Idade em destaque, data embaixo — invertido a pedido do gestor
      // Sem data de nascimento, "—" — e não "0 meses" (passo 4.4; este ponto ficou de fora e foi achado no 6.3).
      + '<td>' + (idade && !idade.semData ? '<div class="dm-idade">' + dmEsc(dmIdadeTexto(p.nascimento, idade)) + '</div>' : dmVazio())
      +     (p.nascimento ? '<div class="dm-nasc-d">' + dmEsc(dmDataBR(p.nascimento)) + '</div>' : '') + '</td>'
      + '<td>' + dmTexto(p.bairro) + '</td>'
      + '</tr>';

    return html;
  }

  // ---- PAINEL LATERAL ---------------------------------------------------------
  // Clicar na linha abre a ficha completa. A tabela mostra o que serve para DECIDIR;
  // o painel mostra o que serve para EXECUTAR (telefones, endereço, acompanhante).
  function dmAbrirDrawer(id) {
    const p = estadoDm.pacientes.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    estadoDm.drawerId = id;   // quem os handlers assíncronos do stepper podem repintar

    const idade = (typeof calcularIdade === 'function') ? calcularIdade(p.nascimento) : null;
    const restr = dmRestricao(p);

    document.getElementById('dmDrNome').innerHTML = dmNomeHTML(p, '—');   // escapado dentro da função
    document.getElementById('dmDrSub').textContent =
      'mat. ' + dmMatExib(p) + (idade && !idade.semData ? ' · ' + dmIdadeTexto(p.nascimento, idade) : '');

    const campo = function (rot, val) {
      return '<div class="dm-dr-lbl">' + rot + '</div>'
           + '<div class="dm-dr-val">' + (val ? dmEsc(val) : '<span class="dm-nada">—</span>') + '</div>';
    };

    // Restrição EDITÁVEL, como na Aba 2. Sempre presente, mesmo vazia: é o campo que
    // decide o veículo, e o operador precisa poder corrigir o que veio do dash.
    // Mostra p.observacao cru (e não dmRestricao) para ele ver o que está gravado —
    // inclusive "Nenhuma", que a tabela trata como vazio.
    const obsCrua = (p.observacao || '').toString();
    const blocoObs =
        '<div class="dm-dr-obs"><b>Restrição</b>'
      + '<textarea id="dmDrObs" placeholder="Sem restrição registrada">' + dmEsc(obsCrua) + '</textarea>'
      + '<div class="dm-dr-obs-acoes">'
      +   '<button class="dm-dr-salvar" id="dmDrBtnObs" onclick="dmSalvarRestricao(\'' + dmAspas(p.id) + '\')">Salvar</button>'
      +   '<span class="dm-dr-obs-dica" id="dmDrObsDica">'
      +     (restr ? 'Grava na planilha do dia.' : 'Nada que conte como restrição.')
      +   '</span>'
      + '</div></div>';

    document.getElementById('dmDrCorpo').innerHTML =
        blocoObs
      + '<div class="dm-dr-grade">'
      +   '<div>' + campo('Hora do compromisso', dmHora(p)) + '</div>'
      +   '<div>' + campo('Veículo solicitado', p.tipoSolicitado) + '</div>'
      + '</div>'
      + campo('Local de atendimento', p.local)
      + campo('Objetivo', p.objetivo)
      + '<div class="dm-dr-grade">'
      +   '<div>' + campo('Cidade', p.cidade) + '</div>'
      +   '<div>' + campo('Bairro', p.bairro) + '</div>'
      + '</div>'
      + campo('Endereço residencial', p.enderecoResidencia)
      + campo('Telefones', p.telefones)
      + '<div class="dm-dr-grade">'
      +   '<div>' + dmQtdControleHTML(p) + '</div>'
      +   '<div>' + campo('Trecho', p.trecho) + '</div>'
      + '</div>'
      + campo('Acompanhante', p.acompanhante)
      + campo('Telefones do acompanhante', p.telefonesAcomp)
      + campo('Nascimento', p.nascimento ? dmDataBR(p.nascimento) : '')
      + dmBlocoCancelarHTML(p)
      + dmBlocoApagarHTML(p);

    document.getElementById('dmDrawer').classList.add('on');
    document.getElementById('dmDrawerFundo').classList.add('on');
  }

  // ---- Apagar demanda digitada à mão ---------------------------------------------
  // Só aparece para quem o operador digitou (`origemManual`, vindo da coluna 28 da
  // bd_viagens). Demanda do OLOSTECH não ganha o botão: apagá-la não resolveria nada,
  // porque ela volta na próxima importação — e a sensação de ter resolvido seria pior
  // do que não ter o botão.
  //
  // ⚠️ Só enquanto está NA FILA. Depois de encaixada num carro a demanda sai da fila
  // sozinha, e quem manda passa a ser o card de Editar — que já sabe desfazer alocação.
  // Duas portas para a mesma escrita seriam duas regras livres para divergir.
  function dmBlocoApagarHTML(p) {
    if (!p.origemManual) return '';
    const id = dmAspas(p.id);
    return '<div class="dm-dr-apagar">'
         + '<div class="dm-dr-apagar-cab">Esta demanda foi <b>digitada à mão</b>, não veio do '
         + 'OLOSTECH. Enquanto estiver na fila, dá para corrigir ou apagar.</div>'
         + '<div class="dm-dr-apagar-acoes">'
         +   '<button class="dm-dr-btn-editar" onclick="dmAbrirModalNovoPaciente(\'' + id + '\')">'
         +     '<i class="ti ti-pencil"></i> Editar</button>'
         +   '<button class="dm-dr-btn-apagar" id="dmDrBtnApagar"'
         +     ' onclick="dmApagarDemandaManual(\'' + id + '\')">'
         +     '<i class="ti ti-trash"></i> Apagar da fila</button>'
         + '</div></div>';
  }

  // ---- Cancelar pedido na fila (05/10/2026) ----------------------------------------
  // A MESMA janela do Cancelar da Guia: os campos vêm do cancelamentoCamposHTML (WhatsappFormatter) e aparecem
  // na janela DESTA tela (dmConfirmar), porque a da Guia mora dentro da aba dela e fica escondida aqui.
  // Sem otimismo: a fila só muda depois que o servidor confirmar (grava na planilha e cria a tarefa).
  // A digitada à mão sai da fila sem tarefa (não existe no Olostech): quem decide é o servidor.

  // A marca do cancelado: quem cancelou. Sem o campo (servidor antigo colado), é o do posto, como sempre foi.
  function dmMarcaCancelado(p) {
    const quem = p.canceladoPor || 'posto';
    return (typeof cancelamentoMarca === 'function') ? cancelamentoMarca(quem) : 'cancelado pelo posto';
  }

  // Na ficha: "Cancelar pedido" para quem está na fila; "Desfazer cancelamento" para o cancelado AQUI (o do
  // posto veio assim do Olostech e não tem volta por esta tela). A digitada à mão já tem "Apagar da fila".
  function dmBlocoCancelarHTML(p) {
    const id = dmAspas(p.id);
    if (p.canceladoNaFila) {
      return '<div class="dm-dr-cancelar"><div class="dm-dr-cancelar-txt"><b>' + dmEsc(dmMarcaCancelado(p)) + '</b>'
           + (p.motivoCancelamento ? '<br>' + dmEsc(p.motivoCancelamento) : '') + '</div>'
           + '<button class="dm-dr-btn-editar" onclick="dmDesfazerCancelamento(\'' + id + '\')">'
           + '<i class="ti ti-arrow-back-up"></i> Desfazer cancelamento</button></div>';
    }
    if (p.cancelado || p.origemManual) return '';
    return '<div class="dm-dr-cancelar"><div class="dm-dr-cancelar-txt">O paciente desistiu ou o setor não vai atender?</div>'
         + '<button class="dm-dr-btn-apagar" onclick="dmCancelarPedido(\'' + id + '\')">'
         + '<i class="ti ti-user-x"></i> Cancelar pedido</button></div>';
  }

  function dmCancelarPedido(id) {
    const p = estadoDm.pacientes.filter(function (x) { return x.id === id; })[0];
    if (!p || p.cancelado) return;
    if (!p.chaveDemanda) { toast('Pedido sem identificação. Recarregue a tela.', 'erro'); return; }
    if (typeof cancelamentoCamposHTML !== 'function') { toast('Recarregue o sistema (Ctrl+Shift+R) e tente de novo.', 'erro'); return; }
    const extra = p.origemManual
      ? 'Esta demanda foi digitada à mão: ela sai da fila e não gera tarefa, porque não existe no Olostech.'
      : 'Ele sai da fila e nasce uma tarefa na Lista de Tarefas para dar baixa no Olostech.';
    dmConfirmar('Cancelar paciente', cancelamentoCamposHTML('dmCanc', dmNomeExib(p), extra), 'Confirmar cancelamento', 'perigo', function () {
      const c = cancelamentoLer('dmCanc');
      if (!c) return;   // sem justificativa: a janela fica aberta e o botão continua armado
      dmConfirmaOcupado('Cancelando...');
      chamarServidor('cancelarPedidoFila', [estadoDm.data, p.chaveDemanda, c.motivo, c.justificativa,
                            (typeof getOperador === 'function') ? getOperador() : ''], function (res) {
          dmFecharConfirma();
          dmFecharDrawer();
          const apagada = !!(res && res.acaoCancelamento === 'apagada');
          // Apagar a linha da bd_viagens muda o índice ('P' + n) de quem vem depois: a seleção zera, como no
          // "Apagar da fila". Cancelar não apaga linha: sai da seleção só quem foi cancelado.
          if (apagada) estadoDm.selecionados = {}; else delete estadoDm.selecionados[id];
          dmCarregar(res);
          toast(apagada ? 'Demanda apagada da fila.' : 'Paciente cancelado. A tarefa foi para a Lista de Tarefas.', 'ok');
          if (!apagada && typeof atualizarBadgeKanban === 'function') atualizarBadgeKanban();
        }, function (err) {
          dmConfirmaOcupado('');
          document.getElementById('dmCfmOk').textContent = 'Confirmar cancelamento';
          toast('Não deu para cancelar: ' + ((err && err.message) ? err.message : err), 'erro');
        });
    });
  }

  function dmDesfazerCancelamento(id) {
    const p = estadoDm.pacientes.filter(function (x) { return x.id === id; })[0];
    if (!p || !p.canceladoNaFila) return;
    dmConfirmar(
      'Desfazer o cancelamento?',
      '<p><b>' + dmEsc(dmNomeExib(p) || 'O paciente') + '</b> volta para a fila, pronto para entrar num carro.</p>'
      + '<p>Se a tarefa de baixa ainda estiver pendente na Lista de Tarefas, ela sai. Se já foi registrada, nasce uma '
      + 'tarefa avisando que o pedido voltou.</p>',
      'Desfazer cancelamento',
      '',
      function () {
        dmConfirmaOcupado('Desfazendo...');
        chamarServidor('desfazerCancelamentoFila', [estadoDm.data, p.chaveDemanda, (typeof getOperador === 'function') ? getOperador() : ''], function (res) {
            dmFecharConfirma();
            dmFecharDrawer();
            dmCarregar(res);
            toast('Cancelamento desfeito: o paciente voltou para a fila.', 'ok');
            if (typeof atualizarBadgeKanban === 'function') atualizarBadgeKanban();
          }, function (err) {
            dmConfirmaOcupado('');
            document.getElementById('dmCfmOk').textContent = 'Desfazer cancelamento';
            toast('Não deu para desfazer: ' + ((err && err.message) ? err.message : err), 'erro');
          });
      }
    );
  }

  function dmApagarDemandaManual(id) {
    const p = estadoDm.pacientes.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    if (!p.chaveDemanda) {
      toast('Demanda sem identificação. Recarregue a tela.', 'erro');
      return;
    }
    // Sem otimismo: apaga linha de planilha de produção e não tem desfazer. A tela só
    // muda depois que o servidor confirmar.
    dmConfirmar(
      'Apagar esta demanda?',
      '<p>A demanda de <b>' + dmEsc(dmNomeExib(p) || 'sem nome') + '</b> sai da fila e não volta.</p>'
      + '<p>Isto não avisa o paciente nem o posto.</p>',
      'Apagar',
      'perigo',
      function () {
        dmConfirmaOcupado('Apagando...');
        chamarServidor('excluirDemandaManual', [p.chaveDemanda, dmDataBR(estadoDm.data)], function (res) {
            dmFecharConfirma();
            dmFecharDrawer();
            if (res && res.ok === false) toast(res.motivo || 'Esta demanda já não está na fila.', 'aviso');
            else toast('Demanda apagada.', 'ok');
            iniciarDemandas();   // relê o dia: a fila e os contadores mudaram
          }, function (err) {
            dmConfirmaOcupado('');
            document.getElementById('dmCfmOk').textContent = 'Apagar';
            toast('Não deu para apagar: ' + ((err && err.message) ? err.message : err), 'erro');
          });
      }
    );
  }

  // Grava a restrição na bd_viagens, reusando o mesmo salvarEdicaoPaciente da Aba 2.
  //
  // ⚠️ ARMADILHA: o backend grava as TRÊS colunas de uma vez — local (D), observação (F)
  // e quantidade (J). Mandar só a observação apagaria local e quantidade. Por isso os
  // valores atuais dos outros dois vão junto, inalterados.
  //
  // Sem otimismo aqui de propósito: isto grava em planilha de produção, e o campo decide
  // qual veículo o paciente recebe. Espera a confirmação antes de dizer que salvou.
  function dmSalvarRestricao(id) {
    const p = estadoDm.pacientes.filter(function (x) { return x.id === id; })[0];
    if (!p) return;

    const ta = document.getElementById('dmDrObs');
    const btn = document.getElementById('dmDrBtnObs');
    const nova = (ta.value || '').trim();
    if (nova === (p.observacao || '').toString().trim()) {
      toast('Nada mudou na restrição.', 'info');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Salvando...';
    chamarServidor('salvarEdicaoPaciente', [id, p.local || '', nova, dmQtd(p)], function () {
        p.observacao = nova;          // só depois de confirmado
        btn.disabled = false;
        btn.textContent = 'Salvar';
        document.getElementById('dmDrObsDica').textContent = 'Salvo.';
        dmRender();                   // o indicador ⚠ da linha aparece ou some
        if (estadoDm.montagem && estadoDm.montagem.passo === 2) dmModalRenderConfirma();
        toast('Restrição atualizada.', 'ok');
      }, function (e) {
        btn.disabled = false;
        btn.textContent = 'Salvar';
        toast('Não foi possível salvar: ' + e, 'erro');
      });
  }

  // ---- QUANTIDADE DE PESSOAS --------------------------------------------------
  // Mesma regra do card da Aba 2 (ajustarQtdLogistico): mínimo 2 quando há acompanhante
  // nomeado, 1 quando o paciente viaja sozinho; teto 8.
  // ⚠️ O `.trim()` importa: acompanhante que veio do dash como espaço em branco NÃO é
  // acompanhante, e prenderia o mínimo em 2 sem existir ninguém.
  const DM_QTD_MAX = 8;

  function dmQtdMin(p) {
    return ((p.acompanhante || '').toString().trim()) ? 2 : 1;
  }

  function dmQtdDicaBase(p) {
    return (dmQtdMin(p) === 2) ? 'Mínimo 2: há acompanhante.' : 'Paciente sem acompanhante.';
  }

  function dmQtdControleHTML(p) {
    const q = dmQtd(p);
    const a = dmAspas(p.id);
    return '<div class="dm-dr-lbl">Qtd. de pessoas</div>'
      + '<div class="dm-dr-qtd">'
      +   '<button type="button" id="dmQtdMenos" aria-label="Diminuir"'
      +     (q > dmQtdMin(p) ? '' : ' disabled')
      +     ' onclick="dmAjustarQtd(\'' + a + '\',-1)">&minus;</button>'
      +   '<span id="dmQtdVal">' + q + '</span>'
      +   '<button type="button" id="dmQtdMais" aria-label="Aumentar"'
      +     (DM_QTD_MAX > q ? '' : ' disabled')
      +     ' onclick="dmAjustarQtd(\'' + a + '\',1)">+</button>'
      + '</div>'
      + '<div class="dm-dr-qtd-dica" id="dmQtdDica">' + dmQtdDicaBase(p) + '</div>';
  }

  // Repinta só o painel. A guarda de drawerId existe porque estes handlers são
  // assíncronos: quando a resposta chega, o operador já pode ter fechado o painel
  // ou aberto OUTRO paciente — sem a guarda, o número de um cairia na ficha do outro.
  function dmPintarQtd(p) {
    if (estadoDm.drawerId !== p.id) return;
    const val = document.getElementById('dmQtdVal');
    if (!val) return;
    const q = dmQtd(p);
    val.textContent = q;
    const menos = document.getElementById('dmQtdMenos');
    const mais  = document.getElementById('dmQtdMais');
    if (menos) menos.disabled = (q > dmQtdMin(p)) ? false : true;
    if (mais)  mais.disabled  = (DM_QTD_MAX > q) ? false : true;
  }

  function dmDicaQtd(p, txt) {
    if (estadoDm.drawerId !== p.id) return;
    const el = document.getElementById('dmQtdDica');
    if (el) el.textContent = txt;
  }

  // Rajada de cliques = UMA gravação.
  // ⚠️ O "antes" fica num MAPA por paciente, não numa variável única: o operador pode
  // abrir outro paciente antes de o debounce fechar, e com variável única o valor
  // confirmado do primeiro seria sobrescrito — o rollback devolveria o número errado.
  const dmQtdPend = {};

  function dmAjustarQtd(id, delta) {
    const p = estadoDm.pacientes.filter(function (x) { return x.id === id; })[0];
    if (!p) return;

    const min = dmQtdMin(p);
    const alvo = dmQtd(p) + delta;
    // Sem Math.max aqui de propósito: com quantidade 1 numa linha que TEM acompanhante
    // (mínimo 2), grampear no mínimo faria o clique em "−" AUMENTAR o número.
    if (min > alvo) return;
    // O teto trava só a SUBIDA. Sem o `delta > 0`, uma linha que já viesse da planilha
    // acima de 8 ficaria CONGELADA: o "-" miraria 9, bateria no teto e não desceria nunca.
    if (delta > 0 && alvo > DM_QTD_MAX) return;

    if (!dmQtdPend[id]) dmQtdPend[id] = { antes: dmQtd(p), timer: null };
    p.quantidade = alvo;

    dmPintarQtd(p);   // painel
    dmRender();       // tabela, contadores, chip de idoso e barra de seleção
    // Se o carro está aberto no passo 2, a ocupação dele mudou junto — sem isto o
    // medidor e o "N livre(s)" ficariam mentindo até o próximo render do modal.
    if (estadoDm.montagem && estadoDm.montagem.passo === 2) {
      dmMontagemRecontar();
      dmModalRenderConfirma();
    }

    clearTimeout(dmQtdPend[id].timer);
    dmQtdPend[id].timer = setTimeout(function () { dmGravarQtd(id); }, 700);
  }

  // Aqui HÁ atualização otimista — ao contrário da restrição, logo acima, e a diferença
  // é deliberada: quantidade é um número pequeno, idempotente e reversível, e um stepper
  // que espera o servidor a cada clique é intragável. Se a gravação falhar, o valor volta
  // sozinho para o que a planilha tem.
  function dmGravarQtd(id) {
    const pend = dmQtdPend[id];
    if (!pend) return;
    clearTimeout(pend.timer);
    delete dmQtdPend[id];

    const p = estadoDm.pacientes.filter(function (x) { return x.id === id; })[0];
    if (!p) return;

    const valor = dmQtd(p);
    const antes = pend.antes;
    if (valor === antes) return;   // subiu e desceu de novo: nada a gravar

    dmDicaQtd(p, 'Salvando...');
    criarChamadaAoServidor(function () {
        dmDicaQtd(p, 'Salvo.');
        setTimeout(function () { dmDicaQtd(p, dmQtdDicaBase(p)); }, 1600);
      }, function (e) {
        p.quantidade = antes;
        dmPintarQtd(p);
        dmRender();
        dmDicaQtd(p, 'Não salvou.');
        toast('Não foi possível salvar a quantidade: ' + e, 'erro');
      })
      // ⚠️ As três colunas de novo (ver dmSalvarRestricao). Vai `p.observacao`, o valor
      // CONFIRMADO — nunca o texto solto do textarea, que o operador ainda não salvou.
      .salvarEdicaoPaciente(id, p.local || '', (p.observacao || '').toString(), valor);
  }

  function dmFecharDrawer() {
    estadoDm.drawerId = '';
    document.getElementById('dmDrawer').classList.remove('on');
    document.getElementById('dmDrawerFundo').classList.remove('on');
  }

  // ---- SELEÇÃO ----------------------------------------------------------------
  // A seleção sobrevive a filtro e busca de propósito: filtrar não pode desmarcar
  // ninguém em silêncio. Por isso a barra conta TUDO que está selecionado, e avisa
  // quando parte da seleção está escondida pelo filtro atual.
  function dmSelecionar(id, marcado) {
    if (marcado) estadoDm.selecionados[id] = true;
    else delete estadoDm.selecionados[id];
    dmRender();
  }

  function dmMarcarTodos(chk) {
    dmFiltrados().forEach(function (p) {
      if (chk.checked) estadoDm.selecionados[p.id] = true;
      else delete estadoDm.selecionados[p.id];
    });
    dmRender();
  }

  function dmLimparSelecao() {
    estadoDm.selecionados = {};
    dmRender();
  }

  function dmSelecionados() {
    return estadoDm.pacientes.filter(function (p) { return estadoDm.selecionados[p.id]; });
  }

  // ---- ESCADA DE CAPACIDADES --------------------------------------------------
  // Montada a partir da frota LIVRE do dia (dados.veiculos), onde `tipo` é a col B e
  // `limite` a col C de bd_veiculos. Nada de modelo cravado: se a frota mudar, a
  // escada muda sozinha.
  //
  // ⚠️ OUTLIER que define este código: o backend faz `limite: col C || 4`, então a
  // capacidade 0 do FURGÃO/LACEN chega aqui como 4 — filtrar por capacidade NÃO o
  // pegaria e ele viraria um degrau falso empatado com o ARGO. Só o TIPO identifica.
  //
  // Ambulância NÃO é excluída como o LACEN: fica numa lista à parte e só entra em cena
  // quando o dash marcou algum paciente da seleção como Ambulância. Mesmo aí é sugestão
  // — o setor avalia e pode realocar o paciente em outro veículo ao montar o carro.
  function dmNorm(s) {
    return (s == null ? '' : s.toString())
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  }

  function dmMontarEscada() {
    const porCap = {}, amb = { capacidade: 0, tipo: '', livres: 0 };

    // Prefere a frota LIVRE do dia. Se ela não existe — porque ninguém passou pela Aba 1
    // naquela data — cai no CADASTRO global, que sempre existe. Sem esse fallback a tela
    // ficava inútil até alguém montar a escala, que é justamente a dependência que o
    // gestor mandou inverter.
    const doDia = (estadoDm.veiculos || []).length > 0;
    const fonte = doDia ? estadoDm.veiculos : (estadoDm.veiculosCadastro || []);

    // Pedido do Hélio (10/11/2026): a sugestão que aparece enquanto se marcam os pacientes mostra só
    // carro que AINDA NÃO SAIU hoje, e nunca ambulância. A frota do dia mantém a placa que já tem
    // viagem (é o que permite o bate-volta na escolha do carro), então a conta é feita aqui, pelas
    // viagens já gravadas. A escolha do carro, no passo seguinte, continua mostrando todos.
    const jaSaiu = {};
    (estadoDm.veiculosSalvos || []).forEach(function (v) {
      const pl = (v.placa || '').toString().trim().toUpperCase();
      if (pl) jaSaiu[pl] = true;
    });
    let candidatos = 0;

    fonte.forEach(function (v) {
      const t = dmNorm(v.tipo);
      if (t.indexOf('LACEN') > -1) return;            // nunca leva paciente
      if (t.indexOf('AMBUL') > -1) return;            // ambulância não entra na sugestão (10/11)
      const cap = parseInt(v.limite, 10) || 0;
      if (cap === 0) return;
      candidatos++;
      if (jaSaiu[(v.placa || '').toString().trim().toUpperCase()]) return;
      // Agrupa por CAPACIDADE, não por nome: se o mesmo tipo estiver cadastrado com
      // capacidades diferentes, cada uma é um degrau de verdade.
      if (!porCap[cap]) porCap[cap] = { capacidade: cap, tipos: {}, livres: 0 };
      porCap[cap].livres++;
      porCap[cap].tipos[v.tipo] = (porCap[cap].tipos[v.tipo] || 0) + 1;
    });

    const escada = Object.keys(porCap).map(function (k) {
      const d = porCap[k];
      // rótulo = tipo mais frequente naquela capacidade
      let melhor = '', n = 0;
      Object.keys(d.tipos).forEach(function (t) { if (d.tipos[t] > n) { n = d.tipos[t]; melhor = t; } });
      return { capacidade: d.capacidade, tipo: melhor, livres: d.livres };
    }).sort(function (a, b) { return a.capacidade - b.capacidade; });

    estadoDm.escada = escada;
    estadoDm.ambulancia = amb.livres > 0 ? amb : null;   // sempre null desde 10/11 (ambulância fora)
    // Havia carro, mas todos já têm viagem hoje: o card diz isso, e não "sem frota".
    estadoDm.escadaTodosSairam = escada.length === 0 && candidatos > 0;
  }

  // Comparações invertidas por causa da regra do parser do Apps Script.
  function dmVeiculoPara(n, pedeAmbulancia) {
    if (pedeAmbulancia && estadoDm.ambulancia && estadoDm.ambulancia.capacidade >= n) {
      return { degrau: estadoDm.ambulancia, ambulancia: true };
    }
    const esc = estadoDm.escada || [];
    for (let i = 0; esc.length > i; i++) {
      if (esc[i].capacidade >= n) return { degrau: esc[i], ambulancia: false };
    }
    return null; // excede tudo
  }

  // O carro externo sai UMA vez, pelo compromisso MAIS CEDO do grupo. Juntar horários
  // diferentes é o procedimento normal — não significa várias saídas.
  function dmBaseSaida(sel) {
    let menor = '';
    sel.forEach(function (p) {
      const h = dmHora(p);
      if (h === '--:--') return;
      if (!menor || menor > h) menor = h; // string HH:MM ordena como texto
    });
    return menor;
  }

  function dmAtualizarExtensao(sel, passageiros) {
    const ext = document.getElementById('dmExt');
    const barra = document.getElementById('dmBarra');
    if (sel.length === 0) { barra.classList.remove('tem-ext'); ext.innerHTML = ''; return; }

    const pedeAmb = sel.some(function (p) { return dmNorm(p.tipoSolicitado).indexOf('AMBUL') > -1; });
    const escolha = dmVeiculoPara(passageiros, pedeAmb);
    const semFrota = (estadoDm.escada || []).length === 0 && !estadoDm.ambulancia;

    let card;
    if (semFrota) {
      card = '<div class="dm-veic-card vazio"><div><div class="dm-vc-tipo">Sem frota</div>'
           + '<div class="dm-vc-sub">' + (estadoDm.escadaTodosSairam
               ? 'todos os veículos já têm viagem hoje' : 'nenhum veículo ativo no cadastro')
           + '</div></div></div>';
    } else if (!escolha) {
      const maior = (estadoDm.escada || [])[estadoDm.escada.length - 1];
      const excede = maior ? (passageiros - maior.capacidade) : passageiros;
      card = '<div class="dm-veic-card alerta"><div><div class="dm-vc-tipo">Nenhum veículo comporta</div>'
           + '<div class="dm-vc-sub">' + (maior ? 'maior é ' + dmEsc(maior.tipo) + ' ' + maior.capacidade
                                                 + ' · excede ' + excede : 'nada disponível') + '</div></div></div>';
    } else {
      const d = escolha.degrau;
      card = '<div class="dm-veic-card' + (escolha.ambulancia ? ' amb' : '') + '" id="dmVeicCard">'
           + '<span class="dm-vc-tipo">' + dmEsc(d.tipo) + '</span>'
           + '<span class="dm-vc-lug">' + passageiros + '/' + d.capacidade + '</span>'
           // Quantos carros existem/estão livres saiu em 18/08: o operador já sabe a frota
           // dele de cor, e o número competia com o 3/4, que é o que ele lê aqui.
           // "pedida no dash" fica — não é contagem, é o motivo de a ambulância ter vindo.
           + (escolha.ambulancia ? '<span class="dm-vc-sub">pedida no dash</span>' : '')
           + '</div>';
    }

    const base = dmBaseSaida(sel);
    const saida = base ? '<div class="dm-ext-saida"><i>base da saída</i><b>' + dmEsc(base) + '</b></div>' : '';

    // Cidades: informativo, SEM alerta — a rota de uma cidade costuma passar por outra
    // que também pode ser atendida (Florianópolis–São José, Guaramirim–Jaraguá).
    const vistas = [];
    sel.forEach(function (p) {
      const c = (p.cidade || '').toString().trim().toUpperCase();
      if (c && vistas.indexOf(c) === -1) vistas.push(c);
    });
    let chips = vistas.slice(0, 3).map(function (c) {
      return '<span class="dm-cid-chip">' + dmEsc(c) + '</span>';
    }).join('');
    if (vistas.length > 3) {
      chips += '<span class="dm-cid-chip" title="' + dmEsc(vistas.join(' · ')) + '">+'
             + (vistas.length - 3) + '</span>';
    }

    ext.innerHTML = '<span class="dm-ext-sep"></span>' + card + saida + chips;
    barra.classList.add('tem-ext');

    // Realce só quando o MODELO muda — é o que dá o efeito de placar.
    const chave = semFrota ? 'sem' : (escolha ? escolha.degrau.tipo + escolha.degrau.capacidade : 'excede');
    if (estadoDm.ultimoVeic && estadoDm.ultimoVeic !== chave) {
      const el = document.getElementById('dmVeicCard');
      if (el) { el.classList.add('trocou'); setTimeout(function () { el.classList.remove('trocou'); }, 360); }
    }
    estadoDm.ultimoVeic = chave;
  }

  function dmAtualizarBarra() {
    const sel = dmSelecionados();
    const barra = document.getElementById('dmBarra');
    barra.classList.toggle('on', sel.length > 0);
    // Reserva o rodapé só enquanto a barra existe, para ela não tapar as últimas linhas
    document.getElementById('demandas').classList.toggle('tem-selecao', sel.length > 0);
    if (sel.length === 0) { dmAtualizarExtensao(sel, 0); return; }

    let pass = 0;
    sel.forEach(function (p) { pass += dmQtd(p); });

    // Quantos dos selecionados NÃO estão visíveis com o filtro atual
    const visiveis = {};
    dmFiltrados().forEach(function (p) { visiveis[p.id] = true; });
    const ocultos = sel.filter(function (p) { return !visiveis[p.id]; }).length;

    document.getElementById('dmBarraN').innerHTML =
        '<b>' + sel.length + '</b> paciente(s) · <b>' + pass + '</b> passageiro(s)'
      + (ocultos > 0 ? '<div class="dm-barra-sub">' + ocultos + ' fora do filtro atual</div>' : '');

    dmAtualizarExtensao(sel, pass);
  }

  // Estado do "marcar todos": reflete só o que está na tela.
  function dmAtualizarChkTodos() {
    const chk = document.getElementById('dmChkTodos');
    if (!chk) return;
    const vis = dmFiltrados();
    const marcados = vis.filter(function (p) { return estadoDm.selecionados[p.id]; }).length;
    chk.checked = (vis.length > 0) && (marcados === vis.length);
    chk.indeterminate = (marcados > 0) && (vis.length > marcados);
  }

  // ---- MONTAR CARRO: escolha da placa (entrega 3, micro-fase 1) ----------------
  function dmMontarCarro() {
    const sel = dmSelecionados();
    if (sel.length === 0) return;

    let pass = 0;
    sel.forEach(function (p) { pass += dmQtd(p); });

    const cidades = [];
    sel.forEach(function (p) {
      const c = (p.cidade || '').toString().trim().toUpperCase();
      if (c && cidades.indexOf(c) === -1) cidades.push(c);
    });

    // RETRATO da seleção no instante de abrir. A tabela continua viva atrás do modal —
    // o operador pode trocar a data, mexer num filtro ou receber um render — e o carro
    // tem de ser montado com o que ele VIU, não com o que a tela virou no meio.
    estadoDm.montagem = {
      ids: sel.map(function (p) { return p.id; }),
      pacientes: sel.length,
      passageiros: pass,
      cidades: cidades,
      saida: dmBaseSaida(sel),
      pedeAmb: sel.some(function (p) { return dmNorm(p.tipoSolicitado).indexOf('AMBUL') > -1; }),
      aba: 'publico',
      passo: 1,
      placa: '',
      tipo: '',
      capacidade: 0,
      motoristaProprio: '',
      // Hora de saída começa VAZIA de propósito. Ela não se deduz do compromisso: o carro
      // sai antes, e quanto antes depende da distância — só o operador sabe. Pré-preencher
      // com o horário da consulta seria um palpite que o operador aceitaria sem olhar.
      horaSaida: '',
      localEmbarque: dmEmbarquePadrao(),
      bloqueados: 0,
      roteiro: [],
      roteiroManuais: [],
      roteiroRemovidas: [],
      roteiroOrdemManual: false,
      perdidos: [],
      aviso: '',   // AVISO URGENTE (30/09): já pode ser escrito no Confirmar carro
      doisMotoristas: false   // dois motoristas (11/11/2026)
    };

    document.getElementById('dmMoSub').textContent =
        sel.length + ' paciente(s) · ' + pass + ' passageiro(s)'
      + (cidades.length ? ' · ' + cidades.join(' / ') : '')
      + (estadoDm.montagem.saida ? ' · saída ' + estadoDm.montagem.saida : '');

    // Mesmo padrão para cada passageiro — só onde está VAZIO, para não passar por cima de
    // um embarque que o operador já tenha escolhido antes de abrir o modal.
    const padrao = dmEmbarquePadrao();
    if (padrao) {
      sel.forEach(function (p) {
        if (!(p.enderecoEmbarque || '').toString().trim()) p.enderecoEmbarque = padrao;
      });
    }

    dmFecharDrawer();   // o painel atrás do modal só polui
    dmModalCabeca(1);
    dmModalAba('publico');
    document.getElementById('dmModal').classList.add('on');
    document.getElementById('dmMoFundo').classList.add('on');
  }

  // Título e abas mudam com o passo. Extraído para dmMontarCarro e dmModalPasso usarem
  // a MESMA regra — duplicar isso é o tipo de coisa que apodrece na primeira mudança.
  function dmModalCabeca(n) {
    const m = estadoDm.montagem;
    document.getElementById('dmMoTabs').style.display = (n === 1) ? '' : 'none';
    document.getElementById('dmMoTit').textContent =
      (m && m.editando) ? 'Editar o carro' : ((n === 1) ? 'Montar carro' : 'Confirmar o carro');
    // O passo 2 usa o card da Aba 2, que precisa de coluna larga.
    document.getElementById('dmModal').classList.toggle('largo', n === 2);
  }

  function dmModalPasso(n) {
    const m = estadoDm.montagem;
    if (!m) return;
    if (n === 2 && !m.placa) return;
    m.passo = n;
    dmModalCabeca(n);
    if (n === 1) dmModalRenderFrota(); else dmModalRenderConfirma();
  }

  // Mesma fonte da escada: frota LIVRE do dia; sem ela, o cadastro global.
  // ⚠️ Só `estadoDm.veiculos` vem filtrado pelo backend — o CADASTRO não sabe o que já
  // foi usado hoje. Por isso a exclusão das placas já montadas mora AQUI, valendo para
  // as duas fontes: sem ela, o fallback ofereceria um carro que já saiu com pacientes.
  function dmFrotaDisponivel() {
    const doDia = (estadoDm.veiculos || []).length > 0;
    const fonte = doDia ? estadoDm.veiculos : (estadoDm.veiculosCadastro || []);

    // 🔑 BATE-VOLTA: `usadas` era uma EXCLUSÃO — a placa já montada sumia da frota. Virou
    // uma CONTAGEM: a placa continua na lista, levando junto quantas viagens já tem hoje.
    // ⚠️ A contagem é feita aqui, e não lida do backend, porque a fonte pode ser
    // `veiculosCadastro` (quando a frota do dia não foi montada), que não passa pelo
    // caminho que calcula `viagensHoje`. Uma conta só, num lugar só.
    const usadas = {};
    (estadoDm.veiculosSalvos || []).forEach(function (v) {
      const pl = (v.placa || '').toString().trim().toUpperCase();
      if (pl) usadas[pl] = (usadas[pl] || 0) + 1;
    });

    const vistas = {}, lista = [];
    fonte.forEach(function (v) {
      const pl = (v.placa || '').toString().trim();
      if (!pl) return;
      const chave = pl.toUpperCase();
      if (vistas[chave]) return;                           // linha repetida no cadastro
      if (dmNorm(v.tipo).indexOf('LACEN') > -1) return;    // nunca leva paciente
      vistas[chave] = true;
      // Cópia: escrever `viagensHoje` no objeto original sujaria estadoDm.veiculos, que é
      // relido a cada render — a contagem iria congelando entre uma montagem e outra.
      const copia = {};
      Object.keys(v).forEach(function (k) { copia[k] = v[k]; });
      copia.viagensHoje = usadas[chave] || 0;
      lista.push(copia);
    });
    return { lista: lista, doCadastro: !doDia };
  }

  function dmModalAba(aba) {
    if (!estadoDm.montagem) return;
    estadoDm.montagem.aba = aba;
    document.getElementById('dmMoTabPub').classList.toggle('on', aba === 'publico');
    document.getElementById('dmMoTabTer').classList.toggle('on', aba === 'terceirizado');
    if (estadoDm.montagem.passo === 1) dmModalRenderFrota();
  }

  function dmModalRenderFrota() {
    const m = estadoDm.montagem;
    if (!m) return;
    const frota = dmFrotaDisponivel();
    const daAba = frota.lista.filter(function (v) { return v.categoria === m.aba; });

    const nota = frota.doCadastro
      ? '<div class="dm-mo-nota">A frota deste dia não foi declarada na Formação da Escala, '
        + 'então a lista abaixo é o <b>cadastro geral</b> — confira se o carro está mesmo '
        + 'rodando hoje.</div>'
      : '';

    if (daAba.length === 0) {
      document.getElementById('dmMoCorpo').innerHTML = nota
        + '<div class="dm-mo-vazio">Nenhum veículo desta frota disponível.<br>'
        + 'Podem já estar todos montados hoje, inativos no cadastro, ou fora da frota do dia.</div>';
      dmModalPe();
      return;
    }

    // Agrupa por TIPO (o modelo), maior capacidade primeiro — mesma leitura do card da
    // barra flutuante, para o operador reconhecer no modal o que já viu na seleção.
    const grupos = {};
    daAba.forEach(function (v) {
      const t = (v.tipo || 'SEM TIPO').toString().trim().toUpperCase();
      if (!grupos[t]) grupos[t] = { tipo: t, capacidade: parseInt(v.limite, 10) || 0, placas: [] };
      grupos[t].placas.push(v);
    });
    const ordenados = Object.keys(grupos).map(function (k) { return grupos[k]; })
      .sort(function (a, b) { return b.capacidade - a.capacidade; });

    // "Sugerido" = o MENOR que comporta, ou a ambulância quando o dash pediu ambulância.
    // Calculado aqui, e não lido da escada, para não depender de o nome do modelo bater.
    // Como `ordenados` está em ordem decrescente, o último que comporta é o menor.
    let sugerido = '';
    if (m.pedeAmb) {
      ordenados.forEach(function (g) {
        if (!sugerido && g.tipo.indexOf('AMBUL') > -1) sugerido = g.tipo;
      });
    }
    if (!sugerido) {
      ordenados.forEach(function (g) {
        // ⚠️ Ambulância NUNCA é sugerida sem o dash ter pedido. A frota real tem
        // ambulância com 5 lugares, entre o ARGO (4) e a SPIN (6) — sem esta linha, uma
        // seleção de 5 passageiros a apontaria como "o menor que comporta", e o operador
        // tiraria uma ambulância da rua para levar gente a consulta de rotina.
        if (g.tipo.indexOf('AMBUL') > -1) return;
        if (g.capacidade >= m.passageiros) sugerido = g.tipo;
      });
    }

    let html = nota;
    ordenados.forEach(function (g) {
      // Informa, não bloqueia: o setor pode escolher um carro menor e dividir a viagem.
      const cabe = g.capacidade >= m.passageiros;
      html += '<div class="dm-mo-grupo"><div class="dm-mo-gtit">'
           + '<span class="dm-mo-gnome">' + dmEsc(g.tipo) + '</span>'
           + '<span class="dm-mo-gcap">' + g.capacidade + ' lugares</span>'
           + (g.tipo === sugerido ? '<span class="dm-mo-selo sug">sugerido</span>' : '')
           + (cabe ? '' : '<span class="dm-mo-selo nao">não comporta ' + m.passageiros + '</span>')
           + '</div><div class="dm-mo-placas">';
      g.placas.forEach(function (v) {
        const pl = (v.placa || '').toString().trim();
        const mot = (v.motoristaProprio || '').toString().trim();
        // Segunda linha só no terceirizado: carro da prefeitura não tem motorista fixo —
        // quem dirige vem da escala do dia, e inventar um rótulo vazio aqui só confundiria.
        // "Sem motorista" em âmbar é aviso real: terceirizado precisa de motorista para sair.
        const linhaMot = (v.categoria === 'terceirizado')
          ? '<span class="dm-mo-mot' + (mot ? '' : ' sem') + '" title="' + dmEsc(mot) + '">'
            + (mot ? dmEsc(mot) : 'sem motorista') + '</span>'
          : '';
        // 🔑 BATE-VOLTA: quantas viagens VIVAS esta placa já tem hoje, contado uma única
        // vez em dmFrotaDisponivel() — ver o comentário lá sobre por que não vem do backend.
        const jaTem = parseInt(v.viagensHoje, 10) || 0;
        // O selo conta o que JÁ ACONTECEU, não o que vai acontecer: o operador está
        // olhando a frota, não a viagem que ainda vai montar. "2ª saída" prometia uma
        // segunda viagem que talvez ele nem monte.
        const linhaBV = jaTem > 0
          ? '<span class="dm-mo-bv">' + jaTem + (jaTem > 1 ? ' saídas hoje' : ' saída hoje') + '</span>'
          : '';
        const dicaBV = jaTem > 0
          ? 'Já saiu ' + jaTem + (jaTem > 1 ? ' vezes' : ' vez') + ' hoje. Use outro horário.'
          : '';
        html += '<button type="button" class="dm-mo-placa' + (m.placa === pl ? ' on' : '')
             + (jaTem > 0 ? ' bv' : '') + '"'
             + ' title="' + dmEsc(dicaBV) + '"'
             + ' onclick="dmEscolherPlaca(\'' + dmAspas(pl) + '\')">'
             + '<span class="dm-mo-pl">' + dmEsc(pl) + '</span>' + linhaBV + linhaMot + '</button>';
      });
      html += '</div></div>';
    });

    document.getElementById('dmMoCorpo').innerHTML = html;
    dmModalPe();
  }

  function dmEscolherPlaca(placa) {
    const m = estadoDm.montagem;
    if (!m) return;
    const v = dmFrotaDisponivel().lista.filter(function (x) {
      return (x.placa || '').toString().trim() === placa;
    })[0];
    if (!v) {                       // sumiu entre o render e o clique
      toast('Esta placa não está mais disponível.', 'erro');
      m.placa = '';
      dmModalRenderFrota();
      return;
    }
    m.placa = placa;
    m.tipo = (v.tipo || '').toString().trim();
    m.capacidade = parseInt(v.limite, 10) || 0;
    m.motoristaProprio = v.motoristaProprio || '';   // terceirizado já vem vinculado
    dmModalRenderFrota();
  }

  function dmEncaixeTexto(m) {
    return m.capacidade >= m.passageiros
      ? m.placa + ' · ' + m.tipo + ' · ' + m.passageiros + ' de ' + m.capacidade + ' lugares'
      : m.placa + ' · ' + m.tipo + ' · só ' + m.capacidade + ' lugares para '
        + m.passageiros + ' passageiro(s)';
  }

  // O rodapé é redesenhado por passo: os botões não são os mesmos, e deixar os dois pares
  // no HTML escondendo um deles é o caminho curto para clicar no botão errado.
  function dmModalPe() {
    const m = estadoDm.montagem;
    const acoes = document.getElementById('dmMoAcoes');
    const dica = document.getElementById('dmMoDica');
    if (!m || !acoes || !dica) return;

    if (m.passo === 1) {
      acoes.innerHTML =
          '<button class="dm-mo-cancelar" onclick="dmFecharModal()">Cancelar</button>'
        + '<button class="dm-mo-next" id="dmMoNext"' + (m.placa ? '' : ' disabled')
        + ' onclick="dmModalPasso(2)">Próximo</button>';
      dica.textContent = m.placa ? dmEncaixeTexto(m) : 'Escolha uma placa.';
      return;
    }

    const falta = dmMontagemFalta(m);
    // "Voltar" fora do Tab: o caminho pedido termina no último embarque e cai direto em
    // "Montar carro". Também evita que um Enter no meio do preenchimento volte ao passo 1.
    // Continua clicável. Editando não há passo 1 — a placa não muda —, então vira Cancelar.
    acoes.innerHTML =
        (m.editando
          ? '<button class="dm-mo-cancelar" tabindex="-1" onclick="dmFecharModal()">Cancelar</button>'
          : '<button class="dm-mo-cancelar" tabindex="-1" onclick="dmModalPasso(1)">Voltar</button>')
      + '<button class="dm-mo-next" id="dmMoNext"' + (falta ? ' disabled' : '')
      + (m.editando
          ? ' onclick="dmSalvarEdicao()">Salvar alterações</button>'
          : ' onclick="dmGravarCarro()">Montar carro</button>');
    dica.textContent = falta || dmEncaixeTexto(m);
  }

  // ⚠️ Hora de saída e local de embarque são EXIGIDOS aqui, ao contrário da Aba 2, que
  // deixa gravar sem eles. Esta tela existe justamente para capturá-los: a Guia mostra
  // "SAÍDA hh:mm" ao motorista, e a confirmação por telefone compara essa hora para
  // decidir se a ligação ainda vale. Carro que chega ao motorista sem hora volta como
  // problema, então bloqueio antes de gravar.
  function dmMontagemFalta(m) {
    if ((m.perdidos || []).length) return 'A seleção mudou: volte e monte de novo.';
    // Editando, zerar os pacientes é uma ação LEGÍTIMA: desfaz o carro e devolve veículo
    // e motorista à frota. Quem cuida disso é o _resolverCarroSemPacientes no servidor.
    if (!m.editando && (m.ids || []).length === 0) return 'O carro ficou sem paciente.';
    if (!m.horaSaida) return 'Informe a hora de saída.';
    if (!m.localEmbarque) return 'Escolha o local de embarque.';
    // Lotação: na MONTAGEM de carro novo e quando há gente NOVA no card (encaixe).
    // ⚠️ Até 30/09/2026 a conta só rodava com encaixe (`__novo`), e a montagem de carro novo — que
    // não marca ninguém assim — deixava gravar carro acima da lotação. Um carro JÁ gravado que esteja
    // acima do limite (dado antigo) continua editável sem encaixe: travar o salvar ali impediria
    // justamente de tirar alguém para resolver. A gravação (Código.gs) confere de novo.
    const temNovo = (m.pacs || []).some(function (p) { return !!p.__novo; });
    if (temNovo || !m.editando) {
      const cap = parseInt(m.capacidade, 10) || 0;
      const bloq = parseInt(m.bloqueados, 10) || 0;
      if ((m.passageiros || 0) > cap - bloq) {
        return 'Não cabe: ' + (cap - bloq) + ' lugar(es) para ' + m.passageiros + ' pessoa(s). '
          + (m.editando ? 'Tire alguém do carro.' : 'Tire alguém ou volte e escolha um carro maior.');
      }
    }
    return '';
  }

  // '--:--' (hora vazia) tem de ordenar por ÚLTIMO, não por primeiro: '-' vem antes de
  // '0' na tabela de caracteres, então comparar o texto cru jogaria quem não tem horário
  // para a frente da fila e mudaria o destino do roteiro. Mesma escolha do '99:99' que a
  // horaMinCidade da Aba 2 faz.
  function dmHoraOrd(p) {
    const h = dmHora(p);
    return (h === '--:--') ? '99:99' : h;
  }

  // Reconstrói a lista a partir dos ids do retrato, na ordem do horário.
  // ⚠️ Se algum paciente não estiver mais na fila — outro operador montou um carro com
  // ele enquanto este modal estava aberto — ele entra em `perdidos` e a gravação é
  // BLOQUEADA. Gravar o carro sem ele, em silêncio, é a mesma classe de bug das demandas
  // que desapareciam por causa da chave: ninguém percebe até o paciente ficar em terra.
  function dmMontagemPacientes() {
    const m = estadoDm.montagem;
    // Editando carro gravado: os passageiros vêm do CARRO, não da fila — eles já saíram
    // dela quando o carro foi montado, então procurá-los em estadoDm.pacientes não acha
    // ninguém e o card apareceria vazio.
    if (m.editando) return m.pacs || [];
    const achados = [], perdidos = [];
    (m.ids || []).forEach(function (id) {
      const p = estadoDm.pacientes.filter(function (x) { return x.id === id; })[0];
      if (p) achados.push(p); else perdidos.push(id);
    });
    achados.sort(function (a, b) { return dmHoraOrd(a).localeCompare(dmHoraOrd(b)); });
    m.perdidos = perdidos;
    return achados;
  }

  // ---- ROTEIRO ----------------------------------------------------------------
  // Mesma mecânica do sincronizarRoteiro da Aba 2, sobre estadoDm.montagem:
  //   roteiro          — paradas em ordem; a ÚLTIMA é o destino
  //   roteiroManuais   — paradas postas à mão (ficam mesmo sem passageiro)
  //   roteiroRemovidas — paradas tiradas à mão (não voltam na auto-sugestão)
  //   roteiroOrdemManual — depois de reordenar, o horário para de mandar
  function dmHoraMinCidade(pac, cidade) {
    let menor = '99:99';
    pac.forEach(function (p) {
      if ((p.cidade || '').toString().trim() !== cidade) return;
      const h = dmHoraOrd(p);
      if (menor > h) menor = h;
    });
    return menor;
  }

  function dmDesembarques(pac, cidade) {
    let n = 0;
    pac.forEach(function (p) {
      if ((p.cidade || '').toString().trim() === cidade) n += dmQtd(p);
    });
    return n;
  }

  function dmSincronizarRoteiro(pac) {
    const m = estadoDm.montagem;
    if (!m) return;
    if (!Array.isArray(m.roteiro)) m.roteiro = [];
    if (!Array.isArray(m.roteiroManuais)) m.roteiroManuais = [];
    if (!Array.isArray(m.roteiroRemovidas)) m.roteiroRemovidas = [];

    const cidades = [];
    pac.forEach(function (p) {
      const c = (p.cidade || '').toString().trim();
      if (c && cidades.indexOf(c) === -1) cidades.push(c);
    });

    cidades.forEach(function (c) {
      if (m.roteiro.indexOf(c) === -1 && m.roteiroRemovidas.indexOf(c) === -1) m.roteiro.push(c);
    });
    m.roteiro = m.roteiro.filter(function (c) {
      return cidades.indexOf(c) > -1 || m.roteiroManuais.indexOf(c) > -1;
    });
    if (!m.roteiroOrdemManual) {
      m.roteiro.sort(function (a, b) {
        return dmHoraMinCidade(pac, a).localeCompare(dmHoraMinCidade(pac, b));
      });
    }
  }

  function dmCidadesParaRoteiro() {
    const vistas = {}, out = [];
    estadoDm.pacientes.forEach(function (p) {
      const c = (p.cidade || '').toString().trim();
      if (c && !vistas[c]) { vistas[c] = true; out.push(c); }
    });
    return out.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  }

  function dmAddParada(cidade) {
    const m = estadoDm.montagem;
    if (!m || !cidade) return;
    m.roteiroRemovidas = (m.roteiroRemovidas || []).filter(function (c) { return c !== cidade; });
    if ((m.roteiro || []).indexOf(cidade) === -1) {
      m.roteiro.push(cidade);
      // Cidade sem passageiro é parada DE PASSAGEM: precisa entrar em roteiroManuais,
      // senão o próximo sincronismo a varreria fora por não ter ninguém desembarcando.
      const pac = dmMontagemPacientes();
      const temPass = pac.some(function (p) {
        return (p.cidade || '').toString().trim() === cidade;
      });
      if (!temPass) {
        m.roteiroManuais.push(cidade);
        m.roteiroOrdemManual = true;
      }
    }
    dmModalRenderConfirma();
  }

  function dmRemoverParada(cidade) {
    const m = estadoDm.montagem;
    if (!m) return;
    m.roteiro = (m.roteiro || []).filter(function (c) { return c !== cidade; });
    m.roteiroManuais = (m.roteiroManuais || []).filter(function (c) { return c !== cidade; });
    if ((m.roteiroRemovidas || []).indexOf(cidade) === -1) m.roteiroRemovidas.push(cidade);
    dmModalRenderConfirma();
  }

  function dmMoverParada(i, dir) {
    const m = estadoDm.montagem;
    if (!m || !Array.isArray(m.roteiro)) return;
    const j = i + dir;
    if (0 > j) return;
    if (j >= m.roteiro.length) return;
    const tmp = m.roteiro[i];
    m.roteiro[i] = m.roteiro[j];
    m.roteiro[j] = tmp;
    m.roteiroOrdemManual = true;
    dmModalRenderConfirma();
  }

  function dmRoteiroAuto() {
    const m = estadoDm.montagem;
    if (!m) return;
    m.roteiroOrdemManual = false;
    dmModalRenderConfirma();
  }

  // Arrastar para reordenar, como no card da Aba 2. Guardo só o índice de origem —
  // aqui existe UM carro em montagem por vez, então não há a placa para desambiguar
  // como lá (`rtDragPlaca`), e soltar sempre é dentro do mesmo roteiro.
  let dmRtIdx = null;

  function dmRtDragStart(ev, idx) {
    dmRtIdx = idx;
    ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', String(idx)); } catch { /* navegador sem arrastar: segue sem a marca */ }
    ev.currentTarget.classList.add('rt-dragging');
  }
  function dmRtDragOver(ev) {
    if (dmRtIdx === null) return;
    ev.preventDefault();                       // sem isto o navegador recusa o drop
    ev.dataTransfer.dropEffect = 'move';
    ev.currentTarget.classList.add('rt-drag-over');
  }
  function dmRtDragLeave(ev) { ev.currentTarget.classList.remove('rt-drag-over'); }
  function dmRtDrop(ev, idx) {
    ev.preventDefault();
    ev.currentTarget.classList.remove('rt-drag-over');
    if (dmRtIdx !== null) dmMoverParadaPara(dmRtIdx, idx);
    dmRtIdx = null;
  }
  // Soltar fora de um alvo válido também precisa limpar: sem isto o chip fica meio
  // apagado e o próximo arraste começa com o realce de outro.
  function dmRtDragEnd() {
    dmRtIdx = null;
    const sujos = document.querySelectorAll('.rt-dragging, .rt-drag-over');
    for (let i = 0; sujos.length > i; i++) {
      sujos[i].classList.remove('rt-dragging', 'rt-drag-over');
    }
  }

  function dmMoverParadaPara(de, para) {
    const m = estadoDm.montagem;
    if (!m || !Array.isArray(m.roteiro)) return;
    de = Number(de); para = Number(para);
    if (de === para) return;
    if (0 > de || 0 > para) return;
    if (de >= m.roteiro.length || para >= m.roteiro.length) return;
    const item = m.roteiro.splice(de, 1)[0];
    m.roteiro.splice(para, 0, item);
    m.roteiroOrdemManual = true;
    dmModalRenderConfirma();
  }

  function dmRenderRoteiro(pac) {
    const m = estadoDm.montagem;
    const rot = m.roteiro || [];
    const horaFmt = function (h) { return (h && h !== '99:99') ? h : ''; };

    let chips = '';
    rot.forEach(function (c, i) {
      const ehDestino = i === rot.length - 1;
      const n = dmDesembarques(pac, c);
      const desc = n > 0 ? (n + ' desembarque' + (n > 1 ? 's' : '')) : 'parada de passagem';
      const hora = horaFmt(dmHoraMinCidade(pac, c));
      chips += '<span class="rt-seta">›</span>'
        + '<div class="rt-chip' + (ehDestino ? ' destino' : '') + '" draggable="true"'
        +   ' title="Arraste para reordenar"'
        +   ' ondragstart="dmRtDragStart(event,' + i + ')"'
        +   ' ondragover="dmRtDragOver(event)" ondragleave="dmRtDragLeave(event)"'
        +   ' ondrop="dmRtDrop(event,' + i + ')" ondragend="dmRtDragEnd()">'
        +   '<div class="rt-chip-top">'
        +     '<span class="rt-chip-lbl">' + (ehDestino ? 'Destino final' : 'Parada ' + (i + 1))
        +       '</span>'
        +     '<span class="rt-chip-acoes">'
        +       '<button tabindex="-1" title="Mover para trás"'
        +         ' onclick="dmMoverParada(' + i + ',-1)"'
        +         (i === 0 ? ' disabled' : '') + '>◀</button>'
        +       '<button tabindex="-1" title="Mover para frente"'
        +         ' onclick="dmMoverParada(' + i + ',1)"'
        +         (ehDestino ? ' disabled' : '') + '>▶</button>'
        +       '<button tabindex="-1" class="rt-x" title="Remover parada"'
        +         ' onclick="dmRemoverParada(\'' + dmAspas(c) + '\')">✕</button>'
        +     '</span>'
        +   '</div>'
        +   '<div class="rt-chip-cidade">'
        +     (hora ? '<span class="rt-chip-hora">' + hora + '</span> ' : '') + dmEsc(c)
        +   '</div>'
        +   '<div class="rt-chip-info">' + desc + '</div>'
        + '</div>';
    });

    let opcoes = '';
    dmCidadesParaRoteiro().forEach(function (c) {
      if (rot.indexOf(c) > -1) return;
      opcoes += '<option value="' + dmEsc(c) + '">' + dmEsc(c) + '</option>';
    });

    const dica = m.roteiroOrdemManual
      ? 'ordem manual · <span class="rt-auto-link" onclick="dmRoteiroAuto()">ordenar por horário</span>'
      : 'ordenado por horário · última parada = destino';

    return '<div class="cv-roteiro">'
      + '<label>Roteiro do veículo <span class="rt-dica">' + dica + '</span></label>'
      + '<div class="rt-fluxo">'
      +   '<div class="rt-chip origem"><span class="rt-chip-lbl">Origem</span>'
      +     '<div class="rt-chip-cidade" id="dmCfOrigemHora">'
      +       (m.horaSaida ? '<span class="rt-chip-hora">' + dmEsc(m.horaSaida) + '</span> ' : '')
      +       'Joinville</div></div>'
      +   chips
      +   (opcoes
          ? '<span class="rt-seta">›</span><div class="rt-add">'
            + '<select tabindex="-1"'
            + ' onchange="if(this.value){dmAddParada(this.value); this.value=\'\';}">'
            + '<option value="">+ parada…</option>' + opcoes + '</select></div>'
          : '')
      + '</div></div>';
  }

  // Rota do cabeçalho, isolada porque três lugares a desenham.
  function dmRotaHTML() {
    const m = estadoDm.montagem;
    const rota = (m && m.roteiro) || [];
    if (!rota.length) return 'sem cidade nos pacientes';
    return ['Joinville'].concat(rota.slice(0, rota.length - 1)).join(' › ')
      + ' › <span class="cv-rota-destino">' + dmEsc(rota[rota.length - 1]) + '</span>'
      + (m.localEmbarque
          ? ' <span class="cv-rota-local">· Saída ' + dmEsc(m.localEmbarque) + '</span>' : '');
  }

  // Atualiza SÓ o cabeçalho e o chip de origem.
  // ⚠️ Redesenhar o card inteiro a cada campo ROUBA O FOCO — e é assim que o operador
  // preenche, de Tab em Tab. Era o que quebrava a navegação pelo teclado.
  function dmPintarCabecalhoCarro() {
    const m = estadoDm.montagem;
    if (!m) return;
    const h = document.getElementById('dmCfHoraTopo');
    if (h) {
      h.textContent = m.horaSaida || '--:--';
      h.className = 'cv-hora-saida' + (m.horaSaida ? '' : ' vazia');
    }
    const r = document.getElementById('dmCfRota');
    if (r) r.innerHTML = dmRotaHTML();
    const o = document.getElementById('dmCfOrigemHora');
    if (o) {
      o.innerHTML = (m.horaSaida
        ? '<span class="rt-chip-hora">' + dmEsc(m.horaSaida) + '</span> ' : '') + 'Joinville';
    }
  }

  // ⚠️ Só aceita hora COMPLETA. O <input type="time"> tem dois segmentos, e ao sair do
  // campo com só as horas digitadas o cabeçalho passava a anunciar um horário que o
  // operador não escolheu — 04:00 quando ele ia digitar 04:30. Enquanto não estiver
  // inteira, a hora fica vazia e o rodapé continua pedindo.
  function dmMontagemHora(valor) {
    const m = estadoDm.montagem;
    if (!m) return;
    const v = (valor || '').toString();
    m.horaSaida = /^[0-9]{2}:[0-9]{2}$/.test(v) ? v : '';
    dmPintarCabecalhoCarro();
    dmModalPe();
  }

  // ⚠️ O <input type="time"> do Chrome NÃO completa os minutos. Quem digita só "04" e sai
  // deixa o campo em `04:--` e o `.value` VAZIO — e o carro ficava impossível de gravar
  // sem que o operador entendesse o motivo (o botão travado e o campo parecendo cheio).
  // Não há API para ler os segmentos separados, então os dígitos são acompanhados na
  // tecla e o valor é remontado quando o foco sai.
  const dmHoraDigitos = { buf: '' };

  function dmHoraFoco() { dmHoraDigitos.buf = ''; }

  function dmHoraTecla(ev) {
    if (ev.key === 'Backspace' || ev.key === 'Delete') { dmHoraDigitos.buf = ''; return; }
    if (ev.key.length === 1 && ev.key >= '0' && ev.key <= '9') dmHoraDigitos.buf += ev.key;
  }

  function dmHoraSaiu(el) {
    const b = dmHoraDigitos.buf;
    dmHoraDigitos.buf = '';
    if (el.value) return;                 // navegador já entregou hora completa
    // Com 3 ou mais dígitos o operador estava no meio dos MINUTOS — completar ali seria
    // chutar (043 é 04:30 ou 04:03?). Só completa quando só a hora foi digitada.
    if (!b || b.length > 2) return;
    const h = parseInt(b, 10);
    if (isNaN(h)) return;
    if (0 > h || h > 23) return;
    el.value = (h > 9 ? '' : '0') + h + ':00';
    dmMontagemHora(el.value);
  }

  // Guarda o texto a cada tecla: o card do passo 2 é redesenhado em outras ações (bloqueio,
  // roteiro), e o que foi digitado não pode se perder nesse redesenho.
  function dmMontagemAviso(valor) {
    if (estadoDm.montagem) estadoDm.montagem.aviso = valor;
  }

  function dmMontagemLocal(valor) {
    const m = estadoDm.montagem;
    if (!m) return;
    m.localEmbarque = valor;
    dmPintarCabecalhoCarro();
    dmModalPe();
  }

  // Ocupação do carro em montagem. Espelha a `ocupacao()` da Aba 2, mas sobre
  // estadoDm — as duas telas têm estado independente até a Fase 4 (regra do topo).
  function dmOcupacao(pac, m) {
    let ocupado = 0;
    pac.forEach(function (p) { ocupado += dmQtd(p); });
    const bloqueado = parseInt(m.bloqueados, 10) || 0;
    const limite = parseInt(m.capacidade, 10) || 0;
    return { ocupado: ocupado, bloqueado: bloqueado, limite: limite,
             livres: limite - ocupado - bloqueado };
  }

  // Dois motoristas (11/11/2026): só guarda no estado da montagem; vai junto ao gravar o carro.
  function dmMontagemDois(ligado) {
    if (estadoDm.montagem) estadoDm.montagem.doisMotoristas = !!ligado;
  }

  function dmAjustarBloqueio(delta) {
    const m = estadoDm.montagem;
    if (!m) return;
    const novo = (parseInt(m.bloqueados, 10) || 0) + delta;
    if (0 > novo) return;
    // ⚠️ O teto é o que SOBRA, não a capacidade do carro: numa SPIN de 6 com 4 pessoas
    // dentro só há 2 assentos para bloquear. Deixar bloquear 6 fazia o card dizer
    // "Excedido por 4" com o carro na verdade certo — número que assustava à toa.
    const o = dmOcupacao(dmMontagemPacientes(), m);
    if (novo > (o.limite - o.ocupado)) return;
    m.bloqueados = novo;
    dmModalRenderConfirma();
  }

  // Embarque POR passageiro. Grava direto no objeto do paciente, como a Aba 2 faz —
  // é local até a gravação, e é o que preenche a coluna O da bd_viagens_alocadas.
  function dmEmbarquePaciente(id, valor) {
    const m = estadoDm.montagem;
    const fonte = (m && m.editando) ? (m.pacs || []) : estadoDm.pacientes;
    const p = fonte.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    p.enderecoEmbarque = valor;
  }

  // Tira o paciente DESTA montagem: sai do carro e volta para a fila. Não mexe em
  // planilha nenhuma — o carro ainda não existe.
  function dmTirarPaciente(id) {
    const m = estadoDm.montagem;
    if (!m) return;

    if (m.editando) {
      // Só marca para remover. A linha da planilha só é apagada quando ele salvar —
      // desistir da edição não pode ter apagado nada pelo caminho.
      // ⚠️ Quem foi ACRESCENTADO nesta mesma edição ainda não está na planilha: mandá-lo
      // em `removerMatriculas` faria o servidor procurar (e não achar) uma linha que
      // nunca existiu. Some da lista e pronto.
      const p = (m.pacs || []).filter(function (x) { return x.id === id; })[0];
      if (p && !p.__novo) m.removidos.push(dmChaveP(p));
      m.pacs = (m.pacs || []).filter(function (x) { return x.id !== id; });
      m.ids = (m.ids || []).filter(function (x) { return x !== id; });
      dmMontagemRecontar();
      dmModalRenderConfirma();
      return;
    }

    m.ids = (m.ids || []).filter(function (x) { return x !== id; });
    delete estadoDm.selecionados[id];
    dmMontagemRecontar();
    dmRender();                  // a fila e a barra flutuante acompanham
    dmModalRenderConfirma();
  }

  // Recalcula o retrato depois de qualquer mudança no conteúdo do carro. Precisa
  // existir porque `passageiros` e `saida` foram capturados na abertura do modal, e
  // tirar um paciente — ou mudar a quantidade pelo painel lateral — os invalida.
  function dmMontagemRecontar() {
    const m = estadoDm.montagem;
    if (!m) return;
    const pac = dmMontagemPacientes();
    let pass = 0;
    pac.forEach(function (p) { pass += dmQtd(p); });
    m.pacientes = pac.length;
    m.passageiros = pass;
    m.saida = dmBaseSaida(pac);
  }

  // Local de embarque padrão, pedido pelo supervisor: a esmagadora maioria das saídas é da
  // Secretaria da Saúde.
  // 📌 Desde 11/09 o padrão é MARCADO no cadastro (⭐ em Configurações › Locais de Embarque) e
  // chega pronto do servidor. Antes era o texto "Secretaria da Saúde" procurado aqui — e
  // renomeá-la no cadastro desligaria o padrão calado.
  // ⚠️ Continua sem inventar: só devolve um nome que ESTÁ na lista ativa. O casamento pelo nome
  // fica como reserva para uma colagem parcial (tela nova com servidor antigo).
  function dmEmbarquePadrao() {
    const lista = estadoDm.locaisEmbarque || [];
    if (estadoDm.embarquePadrao && lista.indexOf(estadoDm.embarquePadrao) > -1) return estadoDm.embarquePadrao;
    const achado = lista.filter(function (l) {
      return dmNorm(l) === 'SECRETARIA DA SAUDE';
    })[0];
    return achado || '';
  }

  function dmOpcoesEmbarque(valorAtual) {
    let opts = '<option value="">Selecione...</option>';
    const lista = estadoDm.locaisEmbarque || [];
    // Carro já montado com um local que saiu do cadastro (baixa) ou mudou de nome: o valor
    // gravado entra como opção própria (11/09). Sem isto o select abria em "Selecione…" e o
    // local se perdia na próxima gravação do carro.
    if (valorAtual && lista.indexOf(valorAtual) === -1) {
      opts += '<option value="' + dmEsc(valorAtual) + '" selected>' + dmEsc(valorAtual)
            + ' (fora do cadastro)</option>';
    }
    lista.forEach(function (l) {
      opts += '<option value="' + dmEsc(l) + '"' + (valorAtual === l ? ' selected' : '')
            + '>' + dmEsc(l) + '</option>';
    });
    return opts;
  }

  // Chip do passageiro, na mesma anatomia do card Em Edição da Aba 2. Clicar abre o
  // painel lateral (que fica acima do modal, ver o z-index no CSS).
  function dmChipPassageiroHTML(p) {
    const al = (typeof regrasIdade === 'function') ? regrasIdade(p) : [];
    const nv = (typeof nivelMaisAlto === 'function') ? nivelMaisAlto(al) : '';
    const idade = (typeof calcularIdade === 'function') ? calcularIdade(p.nascimento) : null;
    const pills = al.map(function (a) {
      return '<span class="alerta-pill a-' + a.nivel + '" title="' + dmEsc(a.dica) + '">'
           + a.icone + ' ' + dmEsc(a.label) + '</span>';
    }).join('');
    const obs = (typeof temRestricaoReal === 'function' && temRestricaoReal(p.observacao))
      ? '<span class="obs-texto">' + dmEsc(p.observacao) + '</span>' : '';
    const id = dmAspas(p.id);

    // Cidade do paciente fora do roteiro: só acontece depois que o operador remove uma
    // parada à mão. Sem o aviso, o carro sairia sem passar onde alguém desembarca.
    const cid = (p.cidade || '').toString().trim();
    const m = estadoDm.montagem;
    const noRoteiro = !cid || ((m && m.roteiro) || []).indexOf(cid) > -1;
    const cidadeTag = cid
      ? (noRoteiro
          ? '<span class="cp-cidade-tag">' + dmEsc(cid) + '</span>'
          : '<span class="cp-cidade-tag fora" title="Cidade fora do roteiro do veículo">'
            + dmEsc(cid) + ' · fora do roteiro · <span class="cp-add-parada"'
            + ' onclick="event.stopPropagation();dmAddParada(\'' + dmAspas(cid) + '\')">'
            + 'adicionar</span></span>')
      : '';

    // ⚠️ Editando carro gravado, o chip NÃO abre o painel: os ids ali são 'S-<matrícula>',
    // do carro salvo, e não existem em estadoDm.pacientes — o painel abriria vazio.
    const editando = !!(m && m.editando);
    return '<div class="chip-passageiro-novo' + (nv === 'perigo' ? ' perigo' : '') + '"'
         + (editando
             ? ' style="cursor:default"'
             : ' onclick="dmAbrirDrawer(\'' + id + '\')" title="Clique para ver e editar"') + '>'
         + '<div class="cp-novo-linha1">'
         +   '<span class="cp-n-hora">' + dmHora(p) + '</span>'
         +   '<span class="cp-n-nome">' + dmNomeHTML(p, '—')
         +     ' <span style="font-weight:normal;color:#475569">| '
         +     dmEsc(p.local || 'Sem local') + '</span></span>'
         +   '<span class="cp-n-info">' + (idade && !idade.semData ? idade.anos + ' anos' : '—')
         +     ' • ' + dmEsc(p.bairro || 'Sem bairro') + '</span>'
         +   cidadeTag
         +   '<span class="cp-n-vagas">' + dmQtd(p) + ' vaga(s)</span>'
         +   '<button class="btn-remover" tabindex="-1" aria-label="Tirar do carro"'
         +     ' onclick="event.stopPropagation();dmTirarPaciente(\'' + id + '\')">&times;</button>'
         + '</div>'
         + '<div class="cp-novo-linha2">'
         +   '<div class="cp-embarque-pax" title="Local de embarque deste passageiro"'
         +     ' style="display:inline-flex;align-items:center;gap:4px;font-size:11px;'
         +     'background:#f1f5f9;padding:2px 6px;border-radius:4px;margin-right:6px;">'
         +     '<label style="font-weight:500;color:#475569;margin:0;">Embarque:</label>'
         +     '<select onclick="event.stopPropagation()"'
         +       ' onchange="dmEmbarquePaciente(\'' + id + '\', this.value)"'
         +       ' style="font-size:11px;border:1px solid #cbd5e1;border-radius:3px;'
         +       'padding:1px 4px;background:#fff;outline:none;cursor:pointer;max-width:150px;">'
         +     dmOpcoesEmbarque(p.enderecoEmbarque || '') + '</select>'
         +   '</div>'
         +   obs + pills
         + '</div>' + dmCamposServidorHTML(p, id) + '</div>';   // S.3: nome e matrícula do servidor
  }

  function dmModalRenderConfirma() {
    const m = estadoDm.montagem;
    if (!m) return;
    const pac = dmMontagemPacientes();
    dmSincronizarRoteiro(pac);
    const o = dmOcupacao(pac, m);

    const rotaHTML = dmRotaHTML();   // mesma fonte que dmPintarCabecalhoCarro usa

    let classeVagas = 'vagas-badge', textoVagas = o.livres + ' livre(s)';
    if (o.livres === 0) { classeVagas += ' sem-vaga'; textoVagas = 'Cheio'; }
    else if (0 > o.livres) {
      classeVagas += ' excedido';
      textoVagas = 'Excedido por ' + Math.abs(o.livres);
    }

    const pctOcup = o.limite > 0 ? Math.min(100, (o.ocupado / o.limite) * 100) : 0;
    const pctBloq = o.limite > 0 ? Math.min(100 - pctOcup, (o.bloqueado / o.limite) * 100) : 0;

    const chips = pac.length
      ? pac.map(function (p) { return dmChipPassageiroHTML(p); }).join('')
      : '<div class="dm-mo-vazio">Nenhum paciente neste carro.</div>';

    const avisoPerdidos = (m.perdidos || []).length
      ? '<div class="dm-mo-nota"><b>' + m.perdidos.length + ' paciente(s) da seleção saíram da '
        + 'fila</b> enquanto este modal estava aberto — provavelmente foram montados em outro '
        + 'carro. Volte e monte de novo, para não gravar um carro incompleto sem perceber.</div>'
      : '';

    document.getElementById('dmMoCorpo').innerHTML =
        avisoPerdidos
      + '<div class="card-veiculo' + (0 >= o.livres ? ' cheio' : '') + '">'
      +   '<div class="cv-topo" style="cursor:default">'
      +     '<div class="cv-topo-left">'
      +       '<span id="dmCfHoraTopo" class="cv-hora-saida' + (m.horaSaida ? '' : ' vazia')
      +         '">' + (m.horaSaida || '--:--') + '</span>'
      +       '<span id="dmCfRota" class="cv-rota">' + rotaHTML + '</span>'
      +     '</div>'
      +     '<div class="cv-topo-right">'
      +       '<div class="cv-topo-item"><span class="' + classeVagas + '">' + textoVagas
      +         '</span></div>'
      +       '<div class="cv-topo-item tipo-label">' + dmEsc(m.tipo) + '</div>'
      +       '<div class="cv-topo-item"><span class="placa-badge">' + dmEsc(m.placa)
      +         '</span></div>'
      +       '<div class="cv-topo-item"><span class="cat-badge'
      +         (m.aba === 'terceirizado' ? ' terc' : '') + '">'
      +         (m.aba === 'terceirizado' ? 'Terc' : 'Púb') + '</span></div>'
      // Motorista SÓ do terceirizado, e aqui ele não é escolha: vem do vínculo da placa.
      // O carro da prefeitura sai sem — é a inversão do fluxo, a escala entra no fim —
      // e escrever "(Sem motorista)" ali faria um estado normal parecer campo faltando.
      // Terceirizado sem vínculo, esse sim, é anormal: a empresa tem de repor.
      +       (m.aba === 'terceirizado'
            ? (m.motoristaProprio
                ? '<div class="cv-topo-item motorista-label">' + dmEsc(m.motoristaProprio)
                  + '</div>'
                : '<div class="cv-topo-item"><span class="dm-mo-selo nao">sem motorista'
                  + '</span></div>')
            : '')
      +     '</div>'
      +   '</div>'
      +   '<div class="cv-corpo"><div class="cv-corpo-inner">'
      +     '<div class="cv-medidor"><div class="medidor-info"><span>Ocupado ' + o.ocupado
      +       ' · Bloqueado ' + o.bloqueado + ' · Limite ' + o.limite + '</span></div>'
      +       '<div class="barra"><div class="seg-ocupado" style="width:' + pctOcup + '%"></div>'
      +       '<div class="seg-bloqueado" style="width:' + pctBloq + '%"></div></div></div>'
      +     '<div class="cv-controles">'
      +       dmRenderRoteiro(pac)
      +       '<div class="cv-logistica-input"><label>Hora Saída</label>'
      +         '<input type="time" value="' + dmEsc(m.horaSaida) + '"'
      +         ' onfocus="dmHoraFoco()" onkeydown="dmHoraTecla(event)"'
      +         ' oninput="dmMontagemHora(this.value)" onblur="dmHoraSaiu(this)"></div>'
      +       '<div class="cv-logistica-input"><label>Local Embarque</label>'
      +         '<select onchange="dmMontagemLocal(this.value)">'
      +         dmOpcoesEmbarque(m.localEmbarque) + '</select></div>'
      // tabindex -1 nos steppers: são atalhos de mouse, e no Tab só atrapalhavam o
      // caminho hora → local → embarque de cada paciente → montar carro.
      +       '<div class="bloqueio"><label>Bloquear assentos</label>'
      +         '<div class="stepper">'
      +           '<button tabindex="-1" onclick="dmAjustarBloqueio(-1)" aria-label="Menos">'
      +             '&minus;</button>'
      +           '<span class="qtd">' + o.bloqueado + '</span>'
      +           '<button tabindex="-1" onclick="dmAjustarBloqueio(1)" aria-label="Mais">'
      +             '+</button>'
      +         '</div></div>'
      +     '</div>'
      // AVISO URGENTE (29/09/2026): recado para o motorista. Sai no card e no topo da mensagem de
      // WhatsApp. Desde 30/09 também no Confirmar carro (montagem nova), não só no Editar.
      // DOIS MOTORISTAS (11/11/2026): viagem longa, um na ida e outro na volta. Só carro público; o nome
      // do 2º sai na Formação da escala, pela fila, como o do 1º.
      +     (m.aba === 'publico'
              ? '<label class="dm-dois-mot"><input type="checkbox" id="dmMoDois"'
                + (m.doisMotoristas ? ' checked' : '') + ' onchange="dmMontagemDois(this.checked)">'
                + '<i class="ti ti-users"></i><b>Viagem com dois motoristas</b></label>'
              : '')
      +     '<div class="dm-aviso-campo"><label for="dmMoAviso">AVISO URGENTE</label>'
      +       '<textarea id="dmMoAviso" rows="2" oninput="dmMontagemAviso(this.value)"'
      +       ' placeholder="Opcional. Ex.: buscar a paciente das 10:00 na portaria lateral do hospital">'
      +       dmEsc(m.aviso || '') + '</textarea></div>'
      +     '<div class="cv-passageiros">' + chips + '</div>'
      +   '</div></div>'
      + '</div>'
      + '<div class="dm-cf-ref">Compromisso mais cedo: <b>' + (m.saida || '--:--')
      +   '</b>. A saída é antes disso — quanto antes depende da distância, então o campo de '
      +   'hora começa vazio de propósito.</div>';

    dmModalPe();
  }

  // SEM atualização otimista, de propósito (a regra está no docs/DECISOES.md): montar
  // carro depende de quem chegou antes — a placa pode ter sido usada por outro operador
  // no meio do caminho — e desfazer no cliente não desfaz o append na bd_viagens_alocadas.
  // A tela só muda depois do OK do servidor.
  function dmGravarCarro() {
    const m = estadoDm.montagem;
    if (!m) return;

    const pac = dmMontagemPacientes();   // recalcula perdidos ANTES de validar
    const falta = dmMontagemFalta(m);
    if (falta) { toast(falta, 'erro'); dmModalRenderConfirma(); return; }
    if (pac.length === 0) { toast('Nenhum paciente na seleção.', 'erro'); return; }
    const semEmb = dmSemEmbarque(pac);
    if (semEmb.length) { dmAvisarSemEmbarque(semEmb); return; }
    const semServ = dmSemIdentServidor(pac);   // S.3: servidor sem nome e matrícula não grava
    if (semServ.length) { dmAvisarSemIdentServidor(semServ); return; }

    dmSincronizarRoteiro(pac);
    const rota = estadoDm.montagem.roteiro || [];
    const payload = {
      data: estadoDm.data,
      operador: (typeof getOperador === 'function') ? getOperador() : '',
      alocacoes: [{
        placa: m.placa,
        tipo: m.tipo,
        // Terceirizado sai com o motorista do vínculo; prefeitura sai SEM motorista, e é
        // exatamente isso que a inversão do fluxo permite — a escala entra no fim.
        motorista: m.motoristaProprio || '',
        bloqueados: parseInt(m.bloqueados, 10) || 0,
        destino: rota.length ? rota[rota.length - 1] : '',
        roteiro: rota,
        horaEmbarque: m.horaSaida,
        localEmbarque: m.localEmbarque,
        // AVISO URGENTE (30/09): o carro já nasce com o recado e marcado como "não enviado".
        aviso: (m.aviso || '').toString(),
        doisMotoristas: m.aba === 'publico' && !!m.doisMotoristas,   // dois motoristas (11/11/2026)
        passageiros: pac.map(function (p) {
          return {
            id: p.id,
            matricula: p.matricula || '',
            nome: p.nome || '',
            nascimento: p.nascimento || '',
            telefones: p.telefones || '',
            bairro: p.bairro || '',
            enderecoEmbarque: p.enderecoEmbarque || '',
            enderecoResidencia: p.enderecoResidencia || '',
            // 🔑 A identidade do PEDIDO. Sem ela a coluna AG nasce vazia e a
            // exclusão da fila volta a ser por pessoa — o defeito de 27/08.
            chaveDemanda: p.chaveDemanda || '',
            acompanhante: p.acompanhante || '',
            telefonesAcomp: p.telefonesAcomp || '',
            quantidade: dmQtd(p),
            trecho: p.trecho || '',
            objetivo: p.objetivo || '',
            local: p.local || '',
            observacao: p.observacao || '',
            hora: p.hora || '',
            cidade: p.cidade || '',
            tipoSolicitado: p.tipoSolicitado || '',
            // Nome e matrícula do servidor (S.3) — colunas AH/AI; paciente vai vazio (o servidor ignora).
            servidorNome: p.servidorNome || '',
            servidorMatricula: p.servidorMatricula || '',
            // Carro novo: confirmação vazia. O backend grava "Pendente", que é o
            // comportamento de sempre — quem preserva ligação é o estorno (item 3).
            statusConfirmacao: '', horaLigacao: '', quemAtendeu: '',
            obsLigacao: '', horaNaLigacao: ''
          };
        })
      }]
    };

    const placa = m.placa, n = pac.length;
    const btn = document.getElementById('dmMoNext');
    if (btn) { btn.disabled = true; btn.textContent = 'Gravando...'; }
    document.getElementById('dmMoDica').textContent = 'Gravando na planilha...';

    chamarServidor('salvarViagensAlocadas', [payload], function () {
        dmFecharModal();
        estadoDm.selecionados = {};
        toast('Carro montado: ' + dmEsc(placa) + ' com ' + n + ' paciente(s).', 'ok');
        if (typeof atualizarBadgeKanban === 'function') atualizarBadgeKanban();
        iniciarDemandas();   // os pacientes saem da fila e o carro entra em "já montado"
      }, function (e) {
        const b = document.getElementById('dmMoNext');
        if (b) { b.disabled = false; b.textContent = 'Montar carro'; }
        document.getElementById('dmMoDica').textContent = '';
        dmAlerta((e && e.message) ? e.message : ('' + e));
      });
  }

  // Recusa da gravação. `e.message` para a frase do servidor chegar limpa: as recusas de
  // conflito já vêm prontas, e o "Error:" na frente só empobrece o aviso. A primeira frase
  // vira o título; o resto (quando há) vira a linha de baixo.
  function dmAlerta(msg) {
    const cx = document.getElementById('dmMoAlerta');
    if (!cx) { toast(msg, 'erro'); return; }
    const texto = (msg || '').toString().replace(/^Error:\s*/i, '').trim();
    const corte = texto.indexOf('. ');
    document.getElementById('dmMoAlertaTxt').textContent =
      corte > 0 ? texto.slice(0, corte + 1) : texto;
    document.getElementById('dmMoAlertaSub').textContent =
      corte > 0 ? texto.slice(corte + 2) : '';
    cx.classList.add('on');
    cx.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function dmAlertaLimpar() {
    const cx = document.getElementById('dmMoAlerta');
    if (cx) cx.classList.remove('on');
  }

  function dmFecharModal() {
    dmAlertaLimpar();
    document.getElementById('dmModal').classList.remove('on');
    document.getElementById('dmMoFundo').classList.remove('on');
    estadoDm.montagem = null;
  }

  // ---- "banda grudada" -------------------------------------------------------
  // Não existe seletor CSS para "este sticky está grudado agora", então medimos.
  // Só a ÚLTIMA banda que já alcançou a linha de fixação é a que está visivelmente
  // presa — as anteriores foram empurradas para fora da tela pelas seguintes.
  // ⚠️ Comparações invertidas por causa da regra do parser do Apps Script.
  const DM_TOPO_STICKY = 92; // 60px navbar + ~31px do cabeçalho + 1px de tolerância
  let dmAgendado = false;

  function dmMarcarBandaGrudada() {
    dmAgendado = false;
    const bandas = document.querySelectorAll('#demandas tr.dm-banda');
    if (bandas.length === 0) return;

    let presa = -1;
    for (let i = 0; bandas.length > i; i++) {
      if (DM_TOPO_STICKY >= bandas[i].getBoundingClientRect().top) presa = i;
    }
    for (let i = 0; bandas.length > i; i++) {
      bandas[i].classList.toggle('grudada', i === presa);
    }
  }

  function dmPedirAtualizacao() {
    if (dmAgendado) return;
    dmAgendado = true;
    requestAnimationFrame(dmMarcarBandaGrudada); // 1 medição por quadro, no máximo
  }

  // Uma vez só: o listener sobrevive às re-renderizações da tabela.
  if (!window.__dmScrollLigado) {
    window.__dmScrollLigado = true;
    window.addEventListener('scroll', dmPedirAtualizacao, { passive: true });
    window.addEventListener('resize', dmPedirAtualizacao, { passive: true });
  }

  // dmToggleRestr() removida: a restrição não expande mais na linha. O símbolo é
  // só indicador, e o texto completo vive no painel lateral — onde é editável.

  // ---- utilitários locais (prefixo dm para não colidir com as outras abas) ----
  function dmQtd(p) { return parseInt(p.quantidade, 10) || 1; }
  function dmHora(p) { return (p.hora || '--:--').toString().trim(); }
  function dmVazio() { return '<span class="dm-nada">—</span>'; }

  // Três respostas que o operador precisa antes de montar qualquer carro:
  // quanto falta (fila), quanto já andou (montado) e o que o dia exige (por tipo).
  function dmResumoDia(lista, passageiros) {
    const filtrando = lista.length !== estadoDm.pacientes.length;

    // Progresso: veiculosSalvos são os carros já fechados no dia.
    let carros = 0, pacMontados = 0;
    (estadoDm.veiculosSalvos || []).forEach(function (v) {
      carros++;
      (v.passageiros || []).forEach(function () { pacMontados++; });
    });

    // Só AMBULÂNCIA entra nesta linha (gestor, 18/08). O tipo que vem do dash é sugestão
    // — o setor realoca como quiser —, então "12 auto" não dizia nada que a tabela já não
    // mostrasse, e a linha aparecia todo dia sem motivo. Ambulância é a única que muda o
    // PREPARO da viagem, e por isso merece aviso no topo. Sem ambulância, a linha some.
    // Acompanha os filtros: conta o que está em tela.
    let nAmb = 0;
    lista.forEach(function (p) {
      if (dmClasseVeiculo(p.tipoSolicitado) === 'v-amb') nAmb++;
    });
    const tags = nAmb
      ? '<span class="dm-res-tag dm-veic v-amb" style="width:auto;">' + nAmb + ' ambulância</span>'
      : '';

    document.getElementById('dmResumo').innerHTML =
        '<div class="dm-res-l"><span class="dm-res-rot">Na fila</span>'
      + '<span class="dm-res-v"><b>' + lista.length + '</b> pac · <b>' + passageiros + '</b> pass'
      + (filtrando ? ' <span style="color:#8f9c97;">(de ' + estadoDm.pacientes.length + ')</span>' : '')
      + '</span></div>'
      + '<div class="dm-res-l"><span class="dm-res-rot">Já montado</span>'
      + '<span class="dm-res-v"><b>' + carros + '</b> carro(s) · <b>' + pacMontados + '</b> pac</span></div>'
      + (tags ? '<div class="dm-res-l"><span class="dm-res-rot">Pedido</span>'
              + '<span class="dm-res-tags">' + tags + '</span></div>' : '');
  }

  // dmSentenca()/DM_PRESERVA foram removidas: Local e Objetivo passaram a ser
  // normalizados por CSS (text-transform:uppercase, classe .dm-up). Caixa alta
  // dispensa lista de siglas protegidas, porque maiúscula nunca destrói sigla —
  // era justamente o problema de rebaixar "CCR" para "Ccr".

  // Rótulo curto para o resumo — o nome inteiro não cabe na tag.
  // Idade legível na faixa em que ela DECIDE a regra. Mostrar "0 anos" para um bebê de
  // duas semanas apagava justamente a informação que separa bebê conforto de cadeirinha.
  // Abaixo de 2 anos vai em meses; abaixo de 1 mês, em dias.
  // Comparações INVERTIDAS por causa da regra do parser do Apps Script.
  function dmIdadeTexto(nascISO, idade) {
    const anos = idade.anos || 0, meses = idade.meses || 0;
    if (anos >= 2) return anos + ' anos';

    const totalMeses = anos * 12 + meses;
    if (totalMeses >= 12) return '1 ano e ' + meses + ' m';
    if (totalMeses >= 1)  return totalMeses + (totalMeses === 1 ? ' mês' : ' meses');

    const n = new Date((nascISO || '') + 'T00:00:00');
    if (isNaN(n.getTime())) return '0 meses';
    const dias = Math.max(0, Math.floor((Date.now() - n.getTime()) / 86400000));
    return dias + (dias === 1 ? ' dia' : ' dias');
  }

  // Turno na banda, como a Remoção Interna mostra. Comparações INVERTIDAS por causa
  // da regra do parser do Apps Script: nada de "menor que" dentro do script.
  function dmTurno(h) {
    const hh = parseInt((h || '').toString().split(':')[0], 10);
    if (isNaN(hh)) return '';
    if (12 > hh) return 'Manhã';
    if (18 > hh) return 'Tarde';
    return 'Noite';
  }

  // Cor do chip por tipo pedido no dash. Ambulância em VERMELHO de propósito: é o
  // único que muda o preparo da viagem (maca, oxigênio) e precisa saltar aos olhos.
  function dmClasseVeiculo(tipo) {
    const t = (tipo || '').toString().toUpperCase();
    if (t.indexOf('AMBUL') > -1) return 'v-amb';
    if (t.indexOf('SEM MOTORISTA') > -1) return 'v-sem';
    if (t.indexOf('COM MOTORISTA') > -1) return 'v-com';
    if (t.indexOf('AUTOM') > -1) return 'v-auto';
    return 'v-out';
  }

  // Só devolve restrição REAL: o dash manda "Nenhuma", "-", "Não" e afins como texto.
  function dmRestricao(p) {
    const t = (p.observacao || '').toString().trim();
    if (!t) return '';
    if (typeof temRestricaoReal === 'function') return temRestricaoReal(t) ? t : '';
    return t;
  }

  function dmIniciais(nome) {
    const parts = (nome || '').toString().trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function dmCorAvatar(nome) {
    const s = (nome || '').toString();
    let h = 0;
    for (let i = 0; s.length > i; i++) { h = (h * 31 + s.charCodeAt(i)) % 997; }
    return DM_AV_CORES[h % DM_AV_CORES.length];
  }

  // Célula de texto livre: quebra em até 3 linhas, corta o excesso e guarda o texto
  // inteiro no title — o operador passa o mouse para ler o que não coube.
  function dmTexto(valor, classeExtra) {
    const t = (valor == null ? '' : valor.toString()).trim();
    if (!t) return dmVazio();
    return '<div class="dm-cl ' + (classeExtra || '') + '" title="' + dmEsc(t) + '">' + dmEsc(t) + '</div>';
  }

  function dmDataBR(iso) {
    const s = (iso || '').toString().trim();
    if (s.indexOf('-') === -1) return s;
    const p = s.split('-');
    return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : s;
  }

  // Aspas simples quebram o onclick inline; escapadas à parte do escape de HTML.
  function dmAspas(s) { return (s == null ? '' : s.toString()).split("'").join("\\'"); }

  // split/join em vez de regex: a regra do parser proíbe o sinal de menor literal aqui.
  function dmEsc(s) {
    return (s == null ? '' : s.toString())
      .split('&').join('&amp;').split('\x3C').join('&lt;').split('\x3E').join('&gt;').split('"').join('&quot;');
  }

  // ===================== ENCAIXE EM CARRO JÁ MONTADO =====================
  // Dois casos que não se parecem:
  //   "Da fila"       — o paciente veio no CSV do dash. A planilha já sabe tudo sobre ele, e
  //                     a linha gravada tem de sair IGUAL à de um carro montado de origem.
  //   "Digitar à mão" — foi lançado de última hora no OLOSTECH e não veio no CSV. Só existe
  //                     o que o operador digitar, então os campos precisam bastar para a
  //                     logística decidir — endereço e bairro, principalmente.
  // Por isso são duas funções de servidor diferentes, e não uma com um "se" dentro.

  function dmCarroDaChave(placa, idViagem) {
    const alvo = idViagem || placa;
    return (estadoDm.veiculosSalvos || []).filter(function (x) {
      return (x.idViagem || x.placa) === alvo;
    })[0] || null;
  }

  // As cidades que este carro atende: o destino final mais as paradas do roteiro.
  function dmCidadesDoCarro(v) {
    const c = {};
    if (v.destino) c[v.destino] = true;
    (v.roteiro || []).forEach(function (x) { if (x) c[x] = true; });
    return c;
  }

  function dmAbrirEncaixe(placa, idViagem) {
    const v = dmCarroDaChave(placa, idViagem);
    if (!v) { toast('Este carro não está mais na tela. Recarregue.', 'erro'); return; }
    estadoDm.encaixe = { placa: placa, idViagem: idViagem || '', aba: 'fila', sel: {}, q: '' };

    document.getElementById('dmEnTit').textContent = 'Encaixe em ' + v.placa;
    document.getElementById('dmEnBusca').value = '';
    document.getElementById('dmEnSoRota').checked = true;

    // As cidades saem de quem ESTÁ na fila agora, não de um cadastro: cidade sem ninguém
    // esperando só ocuparia espaço no seletor.
    const cids = {};
    (estadoDm.pacientes || []).forEach(function (p) { if (p.cidade) cids[p.cidade] = true; });
    document.getElementById('dmEnCidade').innerHTML =
      '<option value="">Todas</option>' +
      Object.keys(cids).sort().map(function (c) {
        return '<option value="' + dmEsc(c) + '">' + dmEsc(c) + '</option>';
      }).join('');

    dmEncaixeAba('fila');
    document.getElementById('dmEnFundo').classList.add('on');
    document.getElementById('dmEnModal').classList.add('on');
  }

  function dmFecharEncaixe() {
    document.getElementById('dmEnFundo').classList.remove('on');
    document.getElementById('dmEnModal').classList.remove('on');
    dmEnAlertaLimpar();
    estadoDm.encaixe = null;
  }

  function dmEncaixeAba(aba) {
    const e = estadoDm.encaixe;
    if (!e) return;
    e.aba = aba;
    document.getElementById('dmEnTabFila').classList.toggle('on', aba === 'fila');
    document.getElementById('dmEnTabMao').classList.toggle('on', aba === 'mao');
    // A barra de busca é da fila; no formulário à mão não há o que filtrar.
    document.getElementById('dmEnBarra').style.display = (aba === 'fila') ? '' : 'none';
    dmEnAlertaLimpar();
    dmEncaixeRender();
  }

  function dmEncaixeBuscar(valor) {
    if (!estadoDm.encaixe) return;
    estadoDm.encaixe.q = (valor || '').trim().toLowerCase();
    dmEncaixeRender();
  }

  // Quem pode ser encaixado: quem está na fila e passa no filtro. O recorte por rota é
  // OPCIONAL de propósito — a rota pode passar por cidade no caminho (docs/DECISOES.md),
  // então esconder o resto seria decidir pelo operador.
  function dmEncaixeCandidatos(v) {
    const e = estadoDm.encaixe;
    const f = { cidade: document.getElementById('dmEnCidade').value, local: '', veiculo: '', q: e.q };
    const soRota = document.getElementById('dmEnSoRota').checked;
    const daRota = dmCidadesDoCarro(v);
    return (estadoDm.pacientes || []).filter(function (p) {
      if (p.cancelado) return false;          // encaixar quem cancelou não faz sentido
      if (!dmCasaFiltro(p, f)) return false;
      if (soRota && !daRota[p.cidade || '']) return false;
      return true;
    });
  }

  function dmEncaixeRender() {
    const e = estadoDm.encaixe;
    if (!e) return;
    const v = dmCarroDaChave(e.placa, e.idViagem);
    if (!v) { dmFecharEncaixe(); toast('Este carro saiu da tela. Recarregue.', 'erro'); return; }

    const o = dmOcupacaoSalvo(v);
    document.getElementById('dmEnSub').textContent =
      (v.tipo || '') + ' · saída ' + (v.horaEmbarque || '--:--') + ' · '
      + (v.destino || 'sem destino') + ' · ' + o.livres + ' vaga(s) livre(s)';

    if (e.aba === 'mao') { dmEncaixeRenderMao(v, o); return; }

    const lista = dmEncaixeCandidatos(v);
    const corpo = document.getElementById('dmEnCorpo');

    if (lista.length === 0) {
      corpo.innerHTML = '<div class="dm-en-vazio">Ninguém na fila com esse filtro.<br>'
        + 'Desmarque "só quem vai para a rota deste carro" para ver o dia inteiro.</div>';
      dmEncaixePe(v, o);
      return;
    }

    let html = '<table class="dm-en-tab"><thead><tr>'
      + '<th></th><th>Hora</th><th>Paciente</th><th>Cidade</th>'
      + '<th>Local</th><th>Pess.</th><th>Bairro</th></tr></thead><tbody>';

    lista.forEach(function (p) {
      const marcado = !!e.sel[p.id];
      // Compromisso ANTES da saída do carro = o paciente perderia a consulta. Não bloqueia:
      // pode haver acerto que o sistema não conhece. Mas fica vermelho, à vista — é o erro
      // que só o olho pega, porque nenhuma regra o impede.
      const cedo = !!(p.hora && v.horaEmbarque && v.horaEmbarque > p.hora);
      html += '<tr class="' + (marcado ? 'sel' : '') + '">'
        + '<td><input type="checkbox" class="dm-chk"' + (marcado ? ' checked' : '')
        +   ' onchange="dmEncaixeSel(&#39;' + dmEsc(p.id) + '&#39;, this.checked)"'
        +   ' aria-label="Selecionar ' + dmEsc(dmNomeExib(p)) + '"></td>'
        + '<td><span class="dm-en-hora' + (cedo ? ' tarde' : '') + '"'
        +   (cedo ? ' title="O compromisso é antes da saída do carro"' : '') + '>'
        +   dmEsc(p.hora || '--:--') + '</span></td>'
        + '<td><div class="dm-en-nome">' + dmNomeHTML(p) + '</div>'
        +   '<div class="dm-en-mat">mat. ' + dmEsc(dmMatExib(p)) + '</div></td>'
        + '<td>' + dmEsc(p.cidade || '') + '</td>'
        + '<td>' + dmEsc(p.local || '') + '</td>'
        + '<td>' + dmQtd(p) + '</td>'
        + '<td>' + dmEsc(p.bairro || '') + '</td>'
        + '</tr>';
    });
    corpo.innerHTML = html + '</tbody></table>';
    dmEncaixePe(v, o);
  }

  function dmEncaixeSel(id, marcado) {
    const e = estadoDm.encaixe;
    if (!e) return;
    if (marcado) e.sel[id] = true; else delete e.sel[id];
    dmEnAlertaLimpar();
    dmEncaixeRender();
  }

  // Os marcados que AINDA estão na fila. Entre marcar e confirmar a lista pode ter sido
  // recarregada; mandar o id de quem já saiu geraria erro sem explicação nenhuma.
  function dmEncaixeMarcados() {
    const e = estadoDm.encaixe;
    if (!e) return [];
    return (estadoDm.pacientes || []).filter(function (p) { return !!e.sel[p.id]; });
  }

  function dmEncaixePe(v, o) {
    const marcados = dmEncaixeMarcados();
    let pessoas = 0;
    marcados.forEach(function (p) { pessoas += dmQtd(p); });
    const cabe = o.livres >= pessoas;

    // A conta é por PESSOAS, não por pacientes: quem tem acompanhante ocupa dois lugares.
    document.getElementById('dmEnDica').textContent = marcados.length === 0
      ? o.livres + ' vaga(s) livre(s) neste carro.'
      : marcados.length + ' paciente(s) · ' + pessoas + ' pessoa(s) para '
        + o.livres + ' vaga(s)' + (cabe ? '.' : ' — NÃO CABE.');

    document.getElementById('dmEnAcoes').innerHTML =
        '<button class="dm-mo-cancelar" onclick="dmFecharEncaixe()">Cancelar</button>'
      + '<button class="dm-mo-next" id="dmEnOk"'
      + ((marcados.length > 0 && cabe) ? '' : ' disabled')
      + ' onclick="dmEncaixeContinuar()">Continuar</button>';
  }

  // 🔑 NÃO grava aqui. Leva os escolhidos para o card de "Editar", que é onde o operador
  // acerta roteiro, hora e embarque — porque acrescentar gente costuma mudar as três. A
  // gravação acontece uma vez só, no "Salvar alterações", dentro de um lock só.
  // Foi pedido do operador depois do primeiro teste: encaixar e sair gravado tirava dele
  // a chance de ver o carro inteiro antes de fechar.
  function dmEncaixeContinuar() {
    const e = estadoDm.encaixe;
    if (!e) return;
    const marcados = dmEncaixeMarcados();
    if (marcados.length === 0) return;
    const placa = e.placa, idv = e.idViagem;
    dmFecharEncaixe();
    dmEditarCarro(placa, idv);
    dmAcrescentarNaEdicao(marcados.map(function (p) {
      const c = {};
      Object.keys(p).forEach(function (k) { c[k] = p[k]; });
      return c;
    }));
  }

  // Põe pacientes NOVOS dentro da edição em curso. `__novo` é o que separa quem já está
  // na planilha de quem ainda vai entrar: na hora de salvar, um vira UPDATE e o outro
  // vira INSERT, e trocar os dois duplicaria ou perderia gente.
  function dmAcrescentarNaEdicao(novos) {
    const m = estadoDm.montagem;
    if (!m || !m.editando) return;
    // O encaixado chegava sem embarque — a montagem preenche o padrão, o encaixe não — e o select
    // abria em "Selecione..." (16/09). Entra com o local do carro; sem ele, o padrão ⭐.
    const embCarro = (m.localEmbarque || '').toString().trim() || dmEmbarquePadrao();
    novos.forEach(function (p) {
      p.__novo = true;
      if (!(p.enderecoEmbarque || '').toString().trim() && embCarro) p.enderecoEmbarque = embCarro;
      m.pacs.push(p);
      m.ids.push(p.id);
    });
    // Reordena por horário do compromisso, como o card faz com os demais — o motorista
    // lê o card de cima para baixo, então o encaixado tem de cair no lugar dele.
    m.pacs.sort(function (a, b) { return dmHoraOrd(a).localeCompare(dmHoraOrd(b)); });
    // A cidade do encaixado pode não estar no roteiro: isso acrescenta a parada.
    dmSincronizarRoteiro(m.pacs);
    dmMontagemRecontar();
    document.getElementById('dmMoSub').textContent =
      'Editando ' + m.editando + ' · ' + m.pacientes + ' paciente(s) · '
      + m.passageiros + ' passageiro(s) · ' + novos.length + ' novo(s)';
    dmModalRenderConfirma();
  }

  function dmEnAlerta(msg) {
    const cx = document.getElementById('dmEnAlerta');
    if (!cx) { toast(msg, 'erro'); return; }
    const texto = (msg || '').toString().replace(/^Error:\s*/i, '').trim();
    const corte = texto.indexOf('. ');
    document.getElementById('dmEnAlertaTxt').textContent = corte > 0 ? texto.slice(0, corte + 1) : texto;
    document.getElementById('dmEnAlertaSub').textContent = corte > 0 ? texto.slice(corte + 2) : '';
    cx.classList.add('on');
  }
  function dmEnAlertaLimpar() {
    const cx = document.getElementById('dmEnAlerta');
    if (cx) cx.classList.remove('on');
  }

  // ---- Aba "Digitar à mão" --------------------------------------------------------
  // O paciente foi lançado de última hora no OLOSTECH e NÃO veio no CSV. Nada se sabe
  // sobre ele além do que for digitado aqui — por isso o endereço é campo, não detalhe:
  // é com ele que a logística decide a ordem de embarque dentro de Joinville.
  //
  // 📌 Os quatro campos de endereço não são invenção: a `bd_viagens` já guarda o endereço
  // do paciente como "Rua, número, complemento, bairro" numa string só (conferido em 328
  // linhas reais — 242 delas são endereço de casa nesse formato). Aqui o operador digita os
  // mesmos quatro pedaços e o sistema os junta do mesmo jeito, para a linha digitada ficar
  // igual à importada.
  function dmEncaixeRenderMao(v, o) {
    const cidades = Object.keys(dmCidadesDoCarro(v));
    const opCid = cidades.map(function (c) {
      return '<option value="' + dmEsc(c) + '"'
           + (c === v.destino ? ' selected' : '') + '>' + dmEsc(c) + '</option>';
    }).join('');

    document.getElementById('dmEnCorpo').innerHTML =
        '<div class="dm-en-campos">'
      +   '<div class="col2"><label for="dmEnNome">Nome do paciente *</label>'
      +     '<input type="text" id="dmEnNome" autocomplete="off"></div>'
      +   '<div><label for="dmEnMat">Matrícula *</label>'
      +     '<input type="text" id="dmEnMat" autocomplete="off"></div>'

      +   '<div><label for="dmEnNasc">Data de nascimento</label>'
      +     '<input type="date" id="dmEnNasc"></div>'
      +   '<div class="col2"><label for="dmEnTel">Telefones *</label>'
      +     '<input type="text" id="dmEnTel" placeholder="(00) 00000-0000 / (00) 0000-0000"></div>'

      +   '<div><label for="dmEnCidDest">Cidade de destino *</label>'
      +     '<select id="dmEnCidDest">' + opCid + '</select></div>'
      +   '<div class="dm-en-auto"><label for="dmEnLocCons">Local da consulta</label>'
      +     '<input type="text" id="dmEnLocCons" autocomplete="off"'
      +       ' oninput="dmEnLocalDigitou(this.value)" onfocus="dmEnLocalDigitou(this.value)"'
      +       ' onblur="dmEnLocFechar()" onkeydown="dmEnLocTecla(event)">'
      +     '<div class="dm-en-sug" id="dmEnLocSug"></div></div>'
      +   '<div><label for="dmEnHora">Hora do compromisso *</label>'
      +     '<input type="time" id="dmEnHora"></div>'

      +   '<div class="dm-en-grupo">Endereço do paciente</div>'
      +   '<div class="col2"><label for="dmEnRua">Rua</label>'
      +     '<input type="text" id="dmEnRua" autocomplete="off"></div>'
      +   '<div><label for="dmEnNum">Número</label>'
      +     '<input type="text" id="dmEnNum" autocomplete="off" placeholder="123 ou S/N"></div>'
      +   '<div><label for="dmEnCompl">Complemento</label>'
      +     '<input type="text" id="dmEnCompl" autocomplete="off" placeholder="apto, bloco..."></div>'
      +   '<div class="col2"><label for="dmEnBairro">Bairro</label>'
      +     '<input type="text" id="dmEnBairro" autocomplete="off"></div>'
      +   '<div class="col2"><label for="dmEnCidRes">Cidade</label>'
      +     '<input type="text" id="dmEnCidRes" value="Joinville" autocomplete="off"></div>'
      +   '<div><label for="dmEnUF">UF</label>'
      +     '<input type="text" id="dmEnUF" value="SC" maxlength="2" style="text-transform:uppercase" autocomplete="off"></div>'

      +   '<div class="dm-en-grupo">Embarque e vagas</div>'
      +   '<div class="col2"><label for="dmEnEmb">Local de embarque *</label>'
      +     '<select id="dmEnEmb">' + dmOpcoesEmbarque(v.localEmbarque || '') + '</select></div>'
      +   '<div><label for="dmEnQtd">Pessoas (com acompanhante)</label>'
      +     '<input type="number" id="dmEnQtd" min="1" max="' + Math.max(1, o.livres) + '" value="1"'
      +     ' oninput="dmEncaixePeMao()"></div>'
      +   '<div class="col2"><label for="dmEnObs">Restrição / observação</label>'
      +     '<input type="text" id="dmEnObs" autocomplete="off"></div>'
      + '</div>';

    dmEncaixePeMao();
  }

  // ---- Autocompletar do local da consulta -----------------------------------------
  // Era um <datalist> nativo. Trocado porque a posição e o formato da lista do datalist
  // NÃO são controláveis por CSS — o navegador desenha onde quer, e a cidade saía ao lado
  // do nome em vez de embaixo. Aqui a lista é um div comum, então some a mágica: fica onde
  // mandamos e mostra o que quisermos.
  //
  // Continua sendo SUGESTÃO, não lista fechada: o campo aceita qualquer texto, porque o
  // paciente de última hora pode ir a um local que ninguém cadastrou ainda.
  // ⚠️ Nada volta para o bd_dicionario_locais por aqui — quem o alimenta é a importação,
  // que é onde a decisão de padronizar tem contexto. Sugerir é barato; padrão errado, caro.

  function dmEnLocaisOrdenados(v) {
    const daRota = dmCidadesDoCarro(v);
    const perto = [], longe = [];
    (estadoDm.locaisPadrao || []).forEach(function (x) {
      (daRota[x.cidade] ? perto : longe).push(x);
    });
    return perto.concat(longe);
  }

  function dmEnLocalDigitou(valor) {
    const e = estadoDm.encaixe;
    if (!e) return;
    const v = dmCarroDaChave(e.placa, e.idViagem);
    if (!v) return;
    const cx = document.getElementById('dmEnLocSug');
    if (!cx) return;

    const q = (valor || '').trim().toLowerCase();
    // Campo vazio mostra o começo da lista: quem abre sem saber o nome exato precisa ver
    // o que existe. Com texto, filtra por "contém" — não por "começa com", porque o
    // operador costuma lembrar do meio do nome ("regional", "hans").
    const todos = dmEnLocaisOrdenados(v);
    const achados = (q
      ? todos.filter(function (x) { return x.local.toLowerCase().indexOf(q) > -1; })
      : todos).slice(0, 8);

    if (achados.length === 0) { dmEnLocFechar(); return; }

    e.sugIdx = -1;
    cx.innerHTML = achados.map(function (x, i) {
      return '<div class="dm-en-sug-item" data-i="' + i + '"'
           + ' onmousedown="event.preventDefault(); dmEnLocEscolher(&#39;'
           + dmEsc(x.local).split('&#39;').join('') + '&#39;)">'
           + '<span class="dm-en-sug-nome">' + dmEsc(x.local) + '</span>'
           + (x.cidade ? '<span class="dm-en-sug-cid">' + dmEsc(x.cidade) + '</span>' : '')
           + '</div>';
    }).join('');
    cx.classList.add('on');
  }

  function dmEnLocEscolher(local) {
    const campo = document.getElementById('dmEnLocCons');
    if (campo) campo.value = local;
    dmEnLocFechar();
  }

  function dmEnLocFechar() {
    const cx = document.getElementById('dmEnLocSug');
    if (cx) { cx.classList.remove('on'); cx.innerHTML = ''; }
  }

  // Setas e Enter para quem não tira a mão do teclado — o formulário inteiro é digitado.
  function dmEnLocTecla(ev) {
    const cx = document.getElementById('dmEnLocSug');
    const e = estadoDm.encaixe;
    if (!cx || !e || !cx.classList.contains('on')) return;
    const itens = cx.querySelectorAll('.dm-en-sug-item');
    if (itens.length === 0) return;

    if (ev.key === 'Escape') { dmEnLocFechar(); return; }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const passo = (ev.key === 'ArrowDown') ? 1 : -1;
      e.sugIdx = (e.sugIdx === undefined ? -1 : e.sugIdx) + passo;
      if (e.sugIdx > itens.length - 1) e.sugIdx = 0;
      if (0 > e.sugIdx) e.sugIdx = itens.length - 1;
      itens.forEach(function (el, i) { el.classList.toggle('on', i === e.sugIdx); });
      return;
    }
    if (ev.key === 'Enter' && e.sugIdx > -1) {
      ev.preventDefault();
      const alvo = itens[e.sugIdx].querySelector('.dm-en-sug-nome');
      if (alvo) dmEnLocEscolher(alvo.textContent);
    }
  }

  function dmEncaixePeMao() {
    const e = estadoDm.encaixe;
    if (!e) return;
    const v = dmCarroDaChave(e.placa, e.idViagem);
    if (!v) return;
    const o = dmOcupacaoSalvo(v);
    const campo = document.getElementById('dmEnQtd');
    const qtd = campo ? (parseInt(campo.value, 10) || 1) : 1;
    const cabe = o.livres >= qtd;

    document.getElementById('dmEnDica').textContent =
      qtd + ' pessoa(s) para ' + o.livres + ' vaga(s)' + (cabe ? '.' : ' — NÃO CABE.');

    document.getElementById('dmEnAcoes').innerHTML =
        '<button class="dm-mo-cancelar" onclick="dmFecharEncaixe()">Cancelar</button>'
      + '<button class="dm-mo-next" id="dmEnOkMao"' + (cabe ? '' : ' disabled')
      + ' onclick="dmEncaixeGravarMao()">Inserir no carro</button>';
  }

  // Junta os pedaços no MESMO formato do importado: "Rua, número, complemento,
  // bairro, cidade - uf". As partes vazias são omitidas para manter o texto limpo.
  function dmEnderecoMontado(rua, num, compl, bairro, cidade, uf) {
    if (!rua && !num && !compl && !bairro && !cidade && !uf) return '';
    const partes = [];
    if (rua) partes.push(rua);
    if (num) partes.push(num);
    if (compl) partes.push(compl);
    if (bairro) partes.push(bairro);
    const loc = [cidade, uf].filter(Boolean).join(' - ');
    if (loc) partes.push(loc);
    return partes.join(', ');
  }

  function dmEncaixeGravarMao() {
    const e = estadoDm.encaixe;
    if (!e) return;
    const val = function (id) { return (document.getElementById(id).value || '').trim(); };

    const nome = val('dmEnNome'), tel = val('dmEnTel'), mat = val('dmEnMat');
    const hora = val('dmEnHora'), emb = val('dmEnEmb'), cid = val('dmEnCidDest');
    // Obrigatórios checados aqui, e não por `required`, porque o formulário é montado
    // dentro de um div — não há <form> para o navegador validar.
    // Matrícula obrigatória (16/09): o sistema da prefeitura exige para todo paciente, e sem ela
    // "sem matrícula" deixaria de significar servidor. "-" e "N/A" não valem como matrícula.
    const falta = !nome ? 'Falta o nome do paciente.'
                : dmMarcadorNulo(mat) ? 'Falta a matrícula do paciente.'
                : !tel  ? 'Faltam os telefones.'
                : !hora ? 'Falta a hora do compromisso.'
                : !cid  ? 'Falta a cidade de destino.'
                : !emb  ? 'Falta o local de embarque.' : '';
    if (falta) { dmEnAlerta(falta); return; }

    const bairro = val('dmEnBairro');
    const cidRes = val('dmEnCidRes') || 'Joinville';
    const ufRes = (val('dmEnUF') || 'SC').toUpperCase();
    // Mesmo caminho da aba "Da fila": vai para o card de Editar, não direto para a
    // planilha. Duas portas para a mesma ação seriam duas regras que podem divergir.
    // O id não vem da fila (este paciente não está nela), então é inventado aqui — só
    // precisa ser único dentro da edição, para o botão de tirar do card saber quem é.
    const novo = {
      id: 'M-' + Date.now(),
      nome: nome,
      matricula: val('dmEnMat'),
      nascimento: val('dmEnNasc'),
      telefones: tel,
      cidade: cid,
      local: val('dmEnLocCons'),
      hora: hora,
      enderecoEmbarque: emb,
      bairro: bairro,
      enderecoResidencia: dmEnderecoMontado(val('dmEnRua'), val('dmEnNum'),
                                            val('dmEnCompl'), bairro, cidRes, ufRes),
      observacao: val('dmEnObs'),
      quantidade: parseInt(val('dmEnQtd'), 10) || 1,
      // O paciente de última hora não veio no CSV, então estes três não existem em lugar
      // nenhum. Ficam VAZIOS de propósito: campo vazio é honesto, campo chutado não.
      acompanhante: '', telefonesAcomp: '', trecho: '', objetivo: '', tipoSolicitado: ''
    };

    const placa = e.placa, idv = e.idViagem;
    dmFecharEncaixe();
    dmEditarCarro(placa, idv);
    dmAcrescentarNaEdicao([novo]);
  }

  // ===================== NOVO PACIENTE NA FILA =====================
  let dmNovoSugIdx = -1;

  // O MESMO modal serve para criar e para editar. `estadoDm.novoEditando` é o que separa os
  // dois: nulo = criando; preenchido = corrigindo uma demanda que já está na fila.
  // Um formulário só, uma validação só — duas telas parecidas divergiriam no dia em que uma
  // ganhasse um campo novo.
  function dmAbrirModalNovoPaciente(id) {
    const p = id ? estadoDm.pacientes.filter(function (x) { return x.id === id; })[0] : null;
    if (id && !p) { toast('Paciente não encontrado. Recarregue a tela.', 'erro'); return; }
    if (p && !p.origemManual) { toast('Só dá para editar demanda digitada à mão.', 'aviso'); return; }

    // Guarda a chave ANTIGA: é por ela que o servidor acha a linha. Editar hora, local,
    // nome ou quantidade MUDA a chave da demanda (ela é o hash desses campos), então a
    // chave nova não serviria para localizar o que ainda está gravado.
    estadoDm.novoEditando = p ? { id: p.id, chave: p.chaveDemanda || '' } : null;

    dmFecharDrawer();
    const fundo = document.getElementById('dmNovoFundo');
    const modal = document.getElementById('dmNovoModal');
    if (!fundo || !modal) return;

    dmNovoAlertaLimpar();
    dmNovoRenderCorpo(p);

    const dt = document.getElementById('dmData') ? document.getElementById('dmData').value : (estadoDm.data || '');
    const dtBR = dmDataBR(dt);
    document.getElementById('dmNovoTit').textContent =
      p ? 'Editar paciente na fila' : 'Adicionar paciente na fila';
    document.getElementById('dmNovoSub').textContent =
      p ? ('Demanda digitada à mão · ' + (dtBR || ''))
        : ('Demanda avulsa para ' + (dtBR || 'a data selecionada'));
    document.getElementById('dmNovoSalvarBtn').textContent =
      p ? 'Salvar alterações' : 'Salvar e incluir na fila';

    fundo.classList.add('on');
    modal.classList.add('on');
    setTimeout(function () {
      const el = document.getElementById('dmNovoNome');
      if (el) el.focus();
    }, 60);
  }

  function dmFecharModalNovoPaciente() {
    const fundo = document.getElementById('dmNovoFundo');
    const modal = document.getElementById('dmNovoModal');
    if (fundo) fundo.classList.remove('on');
    if (modal) modal.classList.remove('on');
    estadoDm.novoEditando = null;
    dmNovoAlertaLimpar();
  }

  // Garante que o valor GRAVADO exista entre as opções do select, mesmo que não esteja na
  // lista fixa. Sem isto, editar uma demanda cujo objetivo veio de fora da lista trocaria o
  // valor pela primeira opção em silêncio — e o operador só descobriria depois de salvar.
  function dmNovoOpcoes(valores, atual) {
    const v = (atual || '').toString().trim();
    const lista = valores.slice();
    if (v && !lista.some(function (x) { return dmNorm(x) === dmNorm(v); })) lista.unshift(v);
    return lista.map(function (x) {
      return '<option value="' + dmEsc(x) + '"'
           + (v && dmNorm(x) === dmNorm(v) ? ' selected' : '') + '>' + dmEsc(x) + '</option>';
    }).join('');
  }

  function dmNovoAlerta(msg) {
    const cx = document.getElementById('dmNovoAlerta');
    if (!cx) { toast(msg, 'erro'); return; }
    const texto = (msg || '').toString().replace(/^Error:\s*/i, '').trim();
    const corte = texto.indexOf('. ');
    document.getElementById('dmNovoAlertaTxt').textContent = corte > 0 ? texto.slice(0, corte + 1) : texto;
    document.getElementById('dmNovoAlertaSub').textContent = corte > 0 ? texto.slice(corte + 2) : '';
    cx.classList.add('on');
  }

  function dmNovoAlertaLimpar() {
    const cx = document.getElementById('dmNovoAlerta');
    if (cx) cx.classList.remove('on');
  }

  function dmCidadesDestinoOpcoes(selecionada) {
    const vistas = {};
    const lista = [];
    (estadoDm.cidadesDicionario || []).forEach(function (c) {
      const s = (c || '').toString().trim();
      if (s && !vistas[s.toUpperCase()]) {
        vistas[s.toUpperCase()] = true;
        lista.push(s);
      }
    });
    (estadoDm.cidadesHistoricas || []).forEach(function (c) {
      const s = (c || '').toString().trim();
      if (s && !vistas[s.toUpperCase()]) {
        vistas[s.toUpperCase()] = true;
        lista.push(s);
      }
    });
    lista.sort(function (a, b) { return a.localeCompare(b); });

    // A cidade GRAVADA tem de estar na lista e vir marcada. Se ela não estiver (o operador
    // digitou por "+ Outra cidade"), entra como opção própria — senão editar a demanda
    // trocaria a cidade por "Selecione..." e o operador salvaria sem perceber.
    const atual = (selecionada || '').toString().trim();
    if (atual && !lista.some(function (c) { return dmNorm(c) === dmNorm(atual); })) lista.unshift(atual);

    let out = '<option value="">Selecione a cidade...</option>';
    lista.forEach(function (c) {
      out += '<option value="' + dmEsc(c) + '"'
           + (atual && dmNorm(c) === dmNorm(atual) ? ' selected' : '') + '>' + dmEsc(c) + '</option>';
    });
    out += '<option value="__outro__">+ Outra cidade (digitar)...</option>';
    return out;
  }

  function dmNovoCidMudou(val) {
    const wrap = document.getElementById('dmNovoCidOutroWrap');
    if (!wrap) return;
    const ehOutro = val === '__outro__';
    wrap.style.display = ehOutro ? 'block' : 'none';
    if (ehOutro) {
      const inp = document.getElementById('dmNovoCidOutro');
      if (inp) inp.focus();
    }
  }

  function dmNovoRenderCorpo(p) {
    const cont = document.getElementById('dmNovoCorpo');
    if (!cont) return;

    const editando = !!p;
    const v = function (campo) { return p ? dmEsc((p[campo] || '').toString()) : ''; };

    // ⚠️ AS LISTAS FICAM FORA DA CONCATENAÇÃO, e não é estilo: dentro da cadeia de `+` que
    // monta o HTML, um array quebrado em duas linhas com `+` na margem faz o `+` virar MAIS
    // UNÁRIO sobre o primeiro item da segunda linha — 'Visita familiar' virava NaN e a opção
    // sumia do select. Sintaxe válida, `node --check` passa, e só se vê usando a tela.
    const opcoesObjetivo = dmNovoOpcoes(
      ['Consulta', 'Exame', 'Cirurgia', 'Retorno', 'Procedimento', 'Visita familiar', 'Outro'],
      p ? p.objetivo : 'Consulta');
    const opcoesVeiculo = dmNovoOpcoes(
      ['Automóvel', 'Spin', 'Ambulância', 'Mini-bus', 'Van', 'Carro com Motorista'],
      p ? p.tipoSolicitado : 'Automóvel');

    // ⚠️ O ENDEREÇO NÃO É REPARTIDO DE VOLTA. Na criação ele é montado juntando rua, número,
    // complemento, bairro, cidade e UF numa string só; repartir por vírgula na hora de editar
    // seria adivinhação — "Rua Duque de Caxias, 100, fundos" tem vírgula dentro de pedaço, e
    // qualquer chute embaralharia o endereço do paciente em silêncio.
    // Editando, o bloco vira UM campo com exatamente o que está gravado. O operador vê o que
    // tem e corrige o que quiser. O bairro continua separado porque mora em coluna PRÓPRIA na
    // planilha (col 8), além de aparecer dentro do texto.
    const blocoEndereco = editando
      ? '<div class="dm-en-grupo">Endereço do paciente</div>'
        + '<div class="col2"><label for="dmNovoBairro">Bairro</label>'
        + '<input type="text" id="dmNovoBairro" autocomplete="off" value="' + v('bairro') + '"></div>'
        + '<div class="col3"><label for="dmNovoEndCompleto">Endereço completo</label>'
        + '<input type="text" id="dmNovoEndCompleto" autocomplete="off" value="'
        + v('enderecoResidencia') + '"></div>'
      : '<div class="dm-en-grupo">Endereço do paciente</div>'
        + '<div class="col2"><label for="dmNovoRua">Rua</label>'
        + '<input type="text" id="dmNovoRua" autocomplete="off"></div>'
        + '<div><label for="dmNovoNum">Número</label>'
        + '<input type="text" id="dmNovoNum" autocomplete="off" placeholder="123 ou S/N"></div>'
        + '<div><label for="dmNovoCompl">Complemento</label>'
        + '<input type="text" id="dmNovoCompl" autocomplete="off" placeholder="apto, bloco..."></div>'
        + '<div class="col2"><label for="dmNovoBairro">Bairro</label>'
        + '<input type="text" id="dmNovoBairro" autocomplete="off"></div>'
        + '<div class="col2"><label for="dmNovoCidRes">Cidade</label>'
        + '<input type="text" id="dmNovoCidRes" value="Joinville" autocomplete="off"></div>'
        + '<div><label for="dmNovoUF">UF</label>'
        + '<input type="text" id="dmNovoUF" value="SC" maxlength="2" style="text-transform:uppercase" autocomplete="off"></div>';

    cont.innerHTML =
        '<div class="dm-en-campos">'
      +   '<div class="col2"><label for="dmNovoNome">Nome do paciente *</label>'
      +     '<input type="text" id="dmNovoNome" autocomplete="off" placeholder="Nome completo"'
      +     ' value="' + v('nome') + '"></div>'
      +   '<div><label for="dmNovoMat">Matrícula *</label>'
      +     '<input type="text" id="dmNovoMat" autocomplete="off" placeholder="Matrícula do paciente"'
      +     ' value="' + v('matricula') + '"></div>'

      +   '<div><label for="dmNovoNasc">Data de nascimento</label>'
      +     '<input type="date" id="dmNovoNasc" value="' + v('nascimento') + '"></div>'
      +   '<div class="col2"><label for="dmNovoTel">Telefones *</label>'
      +     '<input type="text" id="dmNovoTel" placeholder="(00) 00000-0000 / (00) 0000-0000"'
      +     ' value="' + v('telefones') + '"></div>'

      +   '<div><label for="dmNovoCidDest">Cidade de destino *</label>'
      +     '<select id="dmNovoCidDest" onchange="dmNovoCidMudou(this.value)">'
      +       dmCidadesDestinoOpcoes(p ? p.cidade : '')
      +     '</select>'
      +     '<div id="dmNovoCidOutroWrap" style="display:none; margin-top:5px;">'
      +       '<input type="text" id="dmNovoCidOutro" placeholder="Digite o nome da cidade" autocomplete="off">'
      +     '</div>'
      +   '</div>'

      // A lista embaixo do campo é SUGESTÃO, não escolha obrigatória — mas o operador achou
      // que era lista fechada e nem tentou digitar. O rótulo e o texto de dentro dizem isso
      // agora: quem chega de última hora pode ir a um local que ninguém cadastrou ainda.
      +   '<div class="dm-en-auto"><label for="dmNovoLocCons">Local da consulta — digite ou escolha</label>'
      +     '<input type="text" id="dmNovoLocCons" autocomplete="off"'
      +       ' placeholder="Digite o nome do local (ou escolha na lista)"'
      +       ' value="' + v('local') + '"'
      +       ' oninput="dmNovoLocalDigitou(this.value)" onfocus="dmNovoLocalDigitou(this.value)"'
      +       ' onblur="dmNovoLocFechar()" onkeydown="dmNovoLocTecla(event)">'
      +     '<div class="dm-en-sug" id="dmNovoLocSug"></div></div>'

      +   '<div><label for="dmNovoHora">Hora do compromisso *</label>'
      +     '<input type="time" id="dmNovoHora" value="' + v('hora') + '"></div>'

      +   '<div><label for="dmNovoObj">Objetivo</label>'
      +     '<select id="dmNovoObj">' + opcoesObjetivo + '</select></div>'

      +   '<div><label for="dmNovoTipoVeic">Veículo solicitado</label>'
      +     '<select id="dmNovoTipoVeic">' + opcoesVeiculo + '</select></div>'

      +   '<div><label for="dmNovoQtd">Pessoas (com acompanhante)</label>'
      +     '<input type="number" id="dmNovoQtd" min="1" value="'
      +     (p ? (parseInt(p.quantidade, 10) || 1) : 1) + '"></div>'

      +   blocoEndereco

      +   '<div class="dm-en-grupo">Embarque e observações</div>'
      +   '<div class="col2"><label for="dmNovoEmb">Local de embarque</label>'
      +     '<select id="dmNovoEmb">' + dmOpcoesEmbarque(p ? (p.enderecoEmbarque || '') : '') + '</select></div>'
      +   '<div><label for="dmNovoTrecho">Trecho</label>'
      +     '<select id="dmNovoTrecho">'
      +       dmNovoOpcoes(['Completo (Ida e Volta)', 'Ida', 'Volta'],
      +                    p ? p.trecho : 'Completo (Ida e Volta)')
      +     '</select></div>'
      +   '<div class="col3"><label for="dmNovoObs">Restrição / observação</label>'
      +     '<input type="text" id="dmNovoObs" autocomplete="off" value="' + v('observacao') + '"'
      +     ' placeholder="Ex: Cadeira de rodas, acamado, etc."></div>'
      + '</div>';

    // A cidade gravada pode não estar na lista (foi digitada em "+ Outra cidade"): neste caso
    // ela entrou como opção própria e já vem marcada, então o campo de digitar fica fechado.
    // Chamar aqui mantém o wrapper coerente com o que o select mostra.
    dmNovoCidMudou(document.getElementById('dmNovoCidDest').value);
  }

  function dmNovoLocalDigitou(valor) {
    const cx = document.getElementById('dmNovoLocSug');
    if (!cx) return;

    const q = (valor || '').trim().toLowerCase();
    const selCid = (document.getElementById('dmNovoCidDest') || {}).value;
    const cidFiltro = (selCid && selCid !== '__outro__') ? selCid.toLowerCase() : '';

    const todos = estadoDm.locaisPadrao || [];
    const perto = [], longe = [];
    todos.forEach(function (x) {
      if (cidFiltro && (x.cidade || '').toLowerCase() === cidFiltro) perto.push(x);
      else longe.push(x);
    });
    const ordenados = cidFiltro ? perto.concat(longe) : todos;

    const achados = (q
      ? ordenados.filter(function (x) { return x.local.toLowerCase().indexOf(q) > -1; })
      : ordenados).slice(0, 8);

    if (achados.length === 0) { dmNovoLocFechar(); return; }

    dmNovoSugIdx = -1;
    cx.innerHTML = achados.map(function (x, i) {
      return '<div class="dm-en-sug-item" data-i="' + i + '"'
           + ' onmousedown="event.preventDefault(); dmNovoLocEscolher(&#39;'
           + dmEsc(x.local).split('&#39;').join('') + '&#39;)">'
           + '<span class="dm-en-sug-nome">' + dmEsc(x.local) + '</span>'
           + (x.cidade ? '<span class="dm-en-sug-cid">' + dmEsc(x.cidade) + '</span>' : '')
           + '</div>';
    }).join('');
    cx.classList.add('on');
  }

  function dmNovoLocEscolher(local) {
    const campo = document.getElementById('dmNovoLocCons');
    if (campo) campo.value = local;
    dmNovoLocFechar();
  }

  function dmNovoLocFechar() {
    const cx = document.getElementById('dmNovoLocSug');
    if (cx) { cx.classList.remove('on'); cx.innerHTML = ''; }
  }

  function dmNovoLocTecla(ev) {
    const cx = document.getElementById('dmNovoLocSug');
    if (!cx || !cx.classList.contains('on')) return;
    const itens = cx.querySelectorAll('.dm-en-sug-item');
    if (itens.length === 0) return;

    if (ev.key === 'Escape') { dmNovoLocFechar(); return; }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const passo = (ev.key === 'ArrowDown') ? 1 : -1;
      dmNovoSugIdx = (dmNovoSugIdx === undefined ? -1 : dmNovoSugIdx) + passo;
      if (dmNovoSugIdx > itens.length - 1) dmNovoSugIdx = 0;
      if (0 > dmNovoSugIdx) dmNovoSugIdx = itens.length - 1;
      itens.forEach(function (el, i) { el.classList.toggle('on', i === dmNovoSugIdx); });
      return;
    }
    if (ev.key === 'Enter' && dmNovoSugIdx > -1) {
      ev.preventDefault();
      const alvo = itens[dmNovoSugIdx].querySelector('.dm-en-sug-nome');
      if (alvo) dmNovoLocEscolher(alvo.textContent);
    }
  }

  function dmSalvarNovoPaciente() {
    const val = function (id) {
      const el = document.getElementById(id);
      return (el && el.value ? el.value : '').trim();
    };
    const edicao = estadoDm.novoEditando;
    const editando = !!edicao;

    const nome = val('dmNovoNome');
    const mat = val('dmNovoMat');
    const tel = val('dmNovoTel');
    const hora = val('dmNovoHora');
    let cid = val('dmNovoCidDest');
    if (cid === '__outro__') cid = val('dmNovoCidOutro');

    // Matrícula obrigatória (16/09): o sistema da prefeitura exige para todo paciente, e sem ela
    // "sem matrícula" deixaria de significar servidor. "-" e "N/A" não valem como matrícula.
    const falta = !nome ? 'Falta o nome do paciente.'
                : dmMarcadorNulo(mat) ? 'Falta a matrícula do paciente.'
                : !tel  ? 'Faltam os telefones.'
                : !cid  ? 'Falta a cidade de destino.'
                : !hora ? 'Falta a hora do compromisso.' : '';
    if (falta) { dmNovoAlerta(falta); return; }

    const btn = document.getElementById('dmNovoSalvarBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Salvando...';
    }

    const bairro = val('dmNovoBairro');
    // Criando, o endereço é MONTADO com os seis pedaços. Editando, ele vem inteiro do campo
    // único — não é repartido e remontado, porque repartir por vírgula seria adivinhação
    // (ver o comentário em dmNovoRenderCorpo).
    const enderecoMontado = editando
      ? val('dmNovoEndCompleto')
      : dmEnderecoMontado(val('dmNovoRua'), val('dmNovoNum'), val('dmNovoCompl'), bairro,
                          val('dmNovoCidRes') || 'Joinville',
                          (val('dmNovoUF') || 'SC').toUpperCase());

    const payload = {
      dataNavegador: estadoDm.data || (document.getElementById('dmData') ? document.getElementById('dmData').value : ''),
      nome: nome,
      matricula: val('dmNovoMat'),
      nascimento: val('dmNovoNasc'),
      telefones: tel,
      cidade: cid,
      local: val('dmNovoLocCons'),
      hora: hora,
      objetivo: val('dmNovoObj') || 'Consulta',
      tipoSolicitado: val('dmNovoTipoVeic') || 'Automóvel',
      quantidade: parseInt(val('dmNovoQtd'), 10) || 1,
      enderecoEmbarque: val('dmNovoEmb'),
      trecho: val('dmNovoTrecho') || 'Completo (Ida e Volta)',
      enderecoResidencia: enderecoMontado,
      // Rua e número vão SEPARADOS também (colunas 16 e 17), porque é assim que o dash manda
      // e a Remoção Interna os lê de lá para montar o endereço dela.
      // ⚠️ Editando, o formulário não tem os pedaços — só o endereço inteiro. Mandar vazio
      // APAGARIA as duas colunas, então elas só viajam na criação; na edição o servidor
      // preserva o que já está gravado.
      rua: editando ? null : val('dmNovoRua'),
      numero: editando ? null : val('dmNovoNum'),
      bairro: bairro,
      observacao: val('dmNovoObs')
    };

    const rotuloBtn = editando ? 'Salvar alterações' : 'Salvar e incluir na fila';
    const chamada = criarChamadaAoServidor(function (dadosNovos) {
        if (btn) { btn.disabled = false; btn.textContent = rotuloBtn; }
        dmFecharModalNovoPaciente();
        dmCarregar(dadosNovos);
        // ⚠️ DESTINO JOINVILLE NÃO APARECE AQUI, e sem aviso o operador acha que sumiu.
        // Quem decide para onde a demanda vai é a `_ehJoinville`, no servidor — a MESMA
        // regra que a importação usa para separar viagem externa de remoção interna. Ela
        // valer também para a demanda digitada à mão é o desejado; só precisa ser dito.
        // 📌 Vale na edição também: trocar o destino para Joinville TIRA a demanda desta
        // fila e a manda para a outra tela — mudança grande demais para acontecer calada.
        if (dmNorm(cid) === 'JOINVILLE') {
          toast('Destino Joinville: esta demanda está na Remoção Interna, não nesta fila.', 'aviso');
          dmAvisarRemocaoInterna();
        } else {
          toast(editando ? 'Demanda atualizada.' : 'Paciente incluído na fila com sucesso.', 'ok');
        }
      }, function (err) {
        if (btn) { btn.disabled = false; btn.textContent = rotuloBtn; }
        dmNovoAlerta('Erro ao salvar: ' + ((err && err.message) ? err.message : err));
      });

    if (editando) chamada.atualizarDemandaManual(edicao.chave, dmDataBR(estadoDm.data), payload);
    else chamada.salvarNovaDemandaFila(payload);
  }

  // Selo de versão (SEMPRE a última linha do script — o Index acusa se faltar)
  window.__VERSOES = window.__VERSOES || {}; window.__VERSOES.demandas = '13/11a';

// ---- Exposição para o HTML e as outras telas (as telas vieram do Apps Script, onde tudo era global; ADR 0016).
Object.assign(window, { iniciarDemandas, dmCarregar, dmAvisarRemocaoInterna, dmTravarBotaoNovo, dmPopularFiltros, dmAlternarCancelados, dmCasaFiltro, dmFiltrados, dmCarroCasa, dmCarrosFiltrados, dmOcupacaoSalvo, dmConfirmadas, dmAlternarCarro, dmRotaSalvoHTML, dmChipSalvoHTML, dmCardSalvoHTML, dmVeiculoLacen, dmLacenMontado, dmChamadoLacenHTML, dmMontarLacen, dmRenderCarros, dmMarcadorNulo, dmChaveP, dmNomeExib, dmNomeHTML, dmMatExib, dmEditarCarro, dmSalvarEdicao, dmConfirmar, dmFecharConfirma, dmAvisoOk, dmAvisoTecla, dmSemEmbarque, dmNomeAviso, dmAvisarSemEmbarque, dmEhServidor, dmIdentServidor, dmSemIdentServidor, dmAvisarSemIdentServidor, dmCamposServidorHTML, dmServidorCampo, dmConfirmaOcupado, dmEstornarCarro, dmEstornarConfirmado, dmTrocarModo, dmPintarBotaoCancel, dmPintarModos, dmPintarResumo, dmRender, dmLinha, dmAbrirDrawer, dmBlocoApagarHTML, dmMarcaCancelado, dmBlocoCancelarHTML, dmCancelarPedido, dmDesfazerCancelamento, dmApagarDemandaManual, dmSalvarRestricao, dmQtdMin, dmQtdDicaBase, dmQtdControleHTML, dmPintarQtd, dmDicaQtd, dmAjustarQtd, dmGravarQtd, dmFecharDrawer, dmSelecionar, dmMarcarTodos, dmLimparSelecao, dmSelecionados, dmNorm, dmMontarEscada, dmVeiculoPara, dmBaseSaida, dmAtualizarExtensao, dmAtualizarBarra, dmAtualizarChkTodos, dmMontarCarro, dmModalCabeca, dmModalPasso, dmFrotaDisponivel, dmModalAba, dmModalRenderFrota, dmEscolherPlaca, dmEncaixeTexto, dmModalPe, dmMontagemFalta, dmHoraOrd, dmMontagemPacientes, dmHoraMinCidade, dmDesembarques, dmSincronizarRoteiro, dmCidadesParaRoteiro, dmAddParada, dmRemoverParada, dmMoverParada, dmRoteiroAuto, dmRtDragStart, dmRtDragOver, dmRtDragLeave, dmRtDrop, dmRtDragEnd, dmMoverParadaPara, dmRenderRoteiro, dmRotaHTML, dmPintarCabecalhoCarro, dmMontagemHora, dmHoraFoco, dmHoraTecla, dmHoraSaiu, dmMontagemAviso, dmMontagemLocal, dmOcupacao, dmMontagemDois, dmAjustarBloqueio, dmEmbarquePaciente, dmTirarPaciente, dmMontagemRecontar, dmEmbarquePadrao, dmOpcoesEmbarque, dmChipPassageiroHTML, dmModalRenderConfirma, dmGravarCarro, dmAlerta, dmAlertaLimpar, dmFecharModal, dmMarcarBandaGrudada, dmPedirAtualizacao, dmQtd, dmHora, dmVazio, dmResumoDia, dmIdadeTexto, dmTurno, dmClasseVeiculo, dmRestricao, dmIniciais, dmCorAvatar, dmTexto, dmDataBR, dmAspas, dmEsc, dmCarroDaChave, dmCidadesDoCarro, dmAbrirEncaixe, dmFecharEncaixe, dmEncaixeAba, dmEncaixeBuscar, dmEncaixeCandidatos, dmEncaixeRender, dmEncaixeSel, dmEncaixeMarcados, dmEncaixePe, dmEncaixeContinuar, dmAcrescentarNaEdicao, dmEnAlerta, dmEnAlertaLimpar, dmEncaixeRenderMao, dmEnLocaisOrdenados, dmEnLocalDigitou, dmEnLocEscolher, dmEnLocFechar, dmEnLocTecla, dmEncaixePeMao, dmEnderecoMontado, dmEncaixeGravarMao, dmAbrirModalNovoPaciente, dmFecharModalNovoPaciente, dmNovoOpcoes, dmNovoAlerta, dmNovoAlertaLimpar, dmCidadesDestinoOpcoes, dmNovoCidMudou, dmNovoRenderCorpo, dmNovoLocalDigitou, dmNovoLocEscolher, dmNovoLocFechar, dmNovoLocTecla, dmSalvarNovoPaciente });
Object.defineProperty(window, 'estadoDm', { configurable: true, get: () => estadoDm });
Object.defineProperty(window, 'DM_COLGROUP', { configurable: true, get: () => DM_COLGROUP });
Object.defineProperty(window, 'DM_AV_CORES', { configurable: true, get: () => DM_AV_CORES });
Object.defineProperty(window, 'dmVerCancelados', { configurable: true, get: () => dmVerCancelados, set: (valor) => { dmVerCancelados = valor; } });
Object.defineProperty(window, 'dmCfmAcao', { configurable: true, get: () => dmCfmAcao, set: (valor) => { dmCfmAcao = valor; } });
Object.defineProperty(window, 'DM_QTD_MAX', { configurable: true, get: () => DM_QTD_MAX });
Object.defineProperty(window, 'dmQtdPend', { configurable: true, get: () => dmQtdPend });
Object.defineProperty(window, 'dmRtIdx', { configurable: true, get: () => dmRtIdx, set: (valor) => { dmRtIdx = valor; } });
Object.defineProperty(window, 'dmHoraDigitos', { configurable: true, get: () => dmHoraDigitos });
Object.defineProperty(window, 'DM_TOPO_STICKY', { configurable: true, get: () => DM_TOPO_STICKY });
Object.defineProperty(window, 'dmAgendado', { configurable: true, get: () => dmAgendado, set: (valor) => { dmAgendado = valor; } });
Object.defineProperty(window, 'dmNovoSugIdx', { configurable: true, get: () => dmNovoSugIdx, set: (valor) => { dmNovoSugIdx = valor; } });
