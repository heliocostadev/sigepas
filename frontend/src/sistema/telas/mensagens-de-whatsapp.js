// =========================================================================
  // MÓDULO: FORMATADOR DE MENSAGENS PARA O WHATSAPP
  // ATENÇÃO: NUNCA USE OS OPERADORES "MENOR QUE" NESTE ARQUIVO!
  // O parser do Google Apps Script trava ao compilar arquivos com o símbolo "MENOR QUE".
  // Sempre utilize ">" ou ">=" com os operandos invertidos.
  // =========================================================================

  // =========================================================================
  // UTILIDADES COMPARTILHADAS — idade, alertas do CTB e restrição do paciente
  // -------------------------------------------------------------------------
  // MORAVAM na Aba2.html e eram usadas TAMBÉM pela Guia dos Motoristas e por
  // este formatador. Como o JS de todas as abas é concatenado no Index e vive
  // num escopo global só, "funcionava" — mas a Guia quebrava junto se a Aba 2
  // falhasse ao carregar, sem ter nada de errado com ela. Movidas para cá em
  // 05/08/2026 (item 6 do checklist).
  //
  // ⚠️ NÃO devolver para a Aba 2, e NÃO apagar achando que são só do WhatsApp:
  //    quem usa é Aba2.html, GuiaMotoristas.html e este arquivo.
  // ⚠️ Em 01/09/2026 entrou aqui também a formatarCaminhoRoteiroHTML, pelo mesmo motivo.
  // ⚠️ regrasIdade() depende de calcularIdade(). As quatro andam juntas.
  // ⚠️ Comparações no formato invertido (0 > meses, 1 > a) por causa do parser
  //    do Apps Script — ver aviso no topo deste arquivo. NÃO "arrumar".
  // =========================================================================

  // "Joinville › Guaramirim › <b>Blumenau</b>" — o caminho da viagem com a última cidade
  // destacada. Usada pela Guia dos Motoristas no cabeçalho de cada card, e pela Aba 2.
  //
  // ⚠️ MORAVA na Aba2.html e era a ÚLTIMA coisa que prendia a Aba 2 viva: sem esta função,
  // apagar aquela aba faria a Guia parar de desenhar os cards — erro de JavaScript, não
  // detalhe visual. Movida para cá em 01/09/2026, pelo mesmo motivo e para o mesmo lugar
  // que as quatro acima em 05/08.
  // ⚠️ A classe `.cv-rota-destino` que ela escreve vive no EstilosComuns.html.
  // Nome nas mensagens, em maiúsculas. Servidor (nome e matrícula "-") sai "SERVIDOR", como na Guia (passo
  // 4.4, 16/09). guiaNomePax mora na Guia; sem ela (Guia não carregou), fica o nome cru, como antes.
  function wppNomePax(p) {
    const nome = (typeof guiaNomePax === 'function') ? guiaNomePax(p) : (p.nome || '');
    return (nome || '').toString().toUpperCase();
  }

  function formatarCaminhoRoteiroHTML(roteiro) {
    const paradas = Array.isArray(roteiro) ? roteiro.filter(Boolean) : [];
    const todas = ['Joinville'].concat(paradas);
    if (todas.length === 1) return todas[0]; // só origem
    const destino = todas.pop();
    return todas.join(' › ') + ' › <span class="cv-rota-destino">' + destino + '</span>';
  }

  // Sem data de nascimento (LACEN, servidor) ou com data que não é data: `semData` (passo 4.4, 16/09).
  // Antes virava "0 anos" + alerta vermelho de Bebê Conforto — ou "NaN anos". Os zeros ficam para quem
  // ainda não olha `semData` continuar como era; quem mostra idade deve esconder quando `semData`.
  function calcularIdade(nascISO){
    const semData = { anos: 0, meses: 0, anosDecimais: 0, semData: true, texto: 'Idade não informada' };
    if (!nascISO) return semData;
    const n = new Date(nascISO + 'T00:00:00'), hoje = new Date();
    if (isNaN(n.getTime())) return semData;
    let anos = hoje.getFullYear() - n.getFullYear();
    let meses = hoje.getMonth() - n.getMonth();
    if (n.getDate() > hoje.getDate()) meses--;
    if (0 > meses){ anos--; meses += 12; }
    const anosDecimais = anos + meses/12;
    const dataFmt = n.toLocaleDateString('pt-BR');
    return { anos, meses, anosDecimais, texto:`${anos} anos e ${meses} meses (${dataFmt})` };
  }

  function regrasIdade(p){
    const i = calcularIdade(p.nascimento), a = i.anosDecimais, alertas = [];
    if (i.semData) return alertas;   // sem data, nenhum alerta de idade (passo 4.4)
    if (1 > a)        alertas.push({nivel:'perigo', icone:'🍼', label:'Bebê Conforto',       dica:'Até 1 ano OU até 13 kg — voltado para trás.'});
    else if (4 > a)   alertas.push({nivel:'aviso',  icone:'🪑', label:'Cadeirinha',          dica:'1 a 4 anos OU 9 a 18 kg.'});
    else if (7.5 > a) alertas.push({nivel:'aviso',  icone:'🔼', label:'Assento de Elevação', dica:'4 a 7,5 anos OU até 1,45 m (15–36 kg).'});
    else if (10 > a)  alertas.push({nivel:'info',   icone:'🔒', label:'Cinto 3 pontos',      dica:'7,5 a 10 anos OU > 1,45 m — banco traseiro.'});
    if (i.anos > 60){
      const temAcomp = (p.acompanhante && p.acompanhante.trim()) || p.quantidade >= 2;
      alertas.push(temAcomp
        ? {nivel:'info',   icone:'👴', label:'Idoso (acompanhante OK)', dica:'Acima de 60 anos exige acompanhante.'}
        : {nivel:'perigo', icone:'⚠️', label:'IDOSO SEM ACOMPANHANTE',  dica:'Acima de 60 anos: acompanhante obrigatório!'});
    }
    return alertas;
  }

  function nivelMaisAlto(alertas){
    if (alertas.some(a=>a.nivel==='perigo')) return 'perigo';
    if (alertas.some(a=>a.nivel==='aviso'))  return 'aviso';
    return alertas.length ? 'info' : '';
  }

  function temRestricaoReal(obs) {
    if (!obs) return false;
    const txt = obs.trim().toLowerCase();
    return !(txt === '' || txt === 'nenhuma' || txt === 'nenhum' || txt === 'não' || txt === 'nao' || txt === '-' || txt === 'sem' || txt === 'nada');
  }

  function relogioEmoji(hora) {
    const oclock = ['🕛','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚'];
    const half = ['🕧','🕜','🕝','🕞','🕟','🕠','🕡','🕢','🕣','🕤','🕥','🕦'];
    const parts = (hora || '').toString().split(':');
    const h = (parseInt(parts[0], 10) || 0) % 12;
    const min = parseInt(parts[1], 10) || 0;
    // Usamos >= para evitar engatilhar o bug do parser do Google Apps Script
    return (min >= 30 ? half : oclock)[h];
  }

  function tituloMsg(s) {
    return (s || '').toString().trim().toLowerCase().split(' ').map(function (w) {
      return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    }).join(' ');
  }

  // ===================== AVISO URGENTE DO CARRO (29/09/2026) =====================
  // Selo (cabeçalho) e faixa (topo do corpo) do aviso — os MESMOS na Guia dos Motoristas e em
  // Carros Montados, que usam o mesmo card-veiculo. Moram aqui, com as outras funções que as telas
  // dividem; o estilo mora em EstilosComuns (.cv-aviso-*). O texto é digitado pelo operador: sempre
  // escapado.
  // 📌 A marca "não enviado" saiu da tela em 05/10/2026 (pedido do Hélio). A coluna AL continua sendo
  // gravada e limpa como antes (avisoAEnviar / marcarAvisoEnviado); só não aparece mais.
  function cvAvisoEsc(s) {
    return (s == null ? '' : s.toString()).split('&').join('&amp;').split('<').join('&lt;')
      .split('>').join('&gt;').split('"').join('&quot;');
  }
  function cvAvisoSeloHTML(v) {
    if (!v || !(v.aviso || '').toString().trim()) return '';
    return '<div class="cv-topo-item"><span class="cv-aviso-selo" title="' + cvAvisoEsc(v.aviso) + '">'
      + '<i class="ti ti-alert-triangle" aria-hidden="true"></i>AVISO URGENTE</span></div>';
  }
  function cvAvisoFaixaHTML(v) {
    if (!v || !(v.aviso || '').toString().trim()) return '';
    const meta = v.avisoRegistro ? 'Registrado em ' + cvAvisoEsc(v.avisoRegistro) : '';
    return '<div class="cv-aviso-faixa"><i class="ti ti-alert-triangle" aria-hidden="true"></i><div>'
      + '<div class="cv-aviso-tit">AVISO URGENTE</div>'
      + '<div class="cv-aviso-txt">' + cvAvisoEsc(v.aviso) + '</div>'
      + (meta ? '<div class="cv-aviso-meta">' + meta + '</div>' : '')
      + '</div></div>';
  }

  // ===================== CANCELAR PACIENTE (05/10/2026) =====================
  // A janela "Cancelar paciente" é a MESMA em três botões: o Cancelar da ficha e o do card do passageiro, na
  // Guia, e o Cancelar da fila de Montar Carros, em Viagens Externas. Cada tela mostra estes campos na SUA
  // janela: a da Guia mora dentro da aba dela e fica escondida quando o operador está em outra aba.
  // ⚠️ O prefixo separa os ids: as janelas das duas telas ficam na página ao mesmo tempo (o conteúdo continua
  // lá depois de fechada), e id repetido faria uma tela ler o campo da outra.
  const CANCEL_MOTIVOS = ['Paciente cancelou', 'Cancelado pelo setor', 'Outro'];
  function cancelamentoCamposHTML(prefixo, nome, textoExtra) {
    return '<p style="margin:0; font-size:14px; color:#475569;">Cancelar o paciente <b>' + cvAvisoEsc(nome || 'este paciente') + '</b>? '
      + cvAvisoEsc(textoExtra || 'Libera a vaga e cria uma tarefa na Lista de Tarefas.') + '</p>'
      + '<label class="gm-form-lbl" for="' + prefixo + 'Motivo">Motivo</label>'
      + '<select id="' + prefixo + 'Motivo" class="gm-form-sel">'
      +   CANCEL_MOTIVOS.map(function (o) { return '<option>' + o + '</option>'; }).join('')
      + '</select>'
      + '<label class="gm-form-lbl" for="' + prefixo + 'Justif">Justificativa (obrigatória — vai para a Lista de Tarefas / sistema da prefeitura)</label>'
      + '<textarea id="' + prefixo + 'Justif" class="gm-form-txt" placeholder="Descreva o motivo do cancelamento"></textarea>';
  }
  // Lê e confere. Sem justificativa avisa e devolve null: quem chama NÃO fecha a janela.
  function cancelamentoLer(prefixo) {
    const sel = document.getElementById(prefixo + 'Motivo');
    const txt = document.getElementById(prefixo + 'Justif');
    const just = ((txt && txt.value) || '').trim();
    if (!just) {
      toast('Descreva a justificativa do cancelamento.', 'aviso');
      if (txt && txt.focus) txt.focus();
      return null;
    }
    const motivo = (sel && sel.value) || 'Outro';
    return { motivo: motivo, justificativa: just, texto: motivo + ': ' + just };
  }
  // A marca do pedido cancelado na fila: quem cancelou. "posto" é o que veio cancelado do Olostech.
  function cancelamentoMarca(quem) {
    return ({ posto: 'cancelado pelo posto', paciente: 'cancelado pelo paciente', setor: 'cancelado pelo setor',
              outro: 'cancelado · outro motivo' })[quem] || 'cancelado';
  }

  // `paraQuem` (11/11/2026): na viagem com dois motoristas, o nome de quem recebe esta mensagem.
  function gerarMensagemWhatsapp(v, dataOp, paraQuem) {
    const motorista = paraQuem || v.motoristaAtribuido || 'motorista';
    const cidadesRota = ['Joinville'].concat(v.roteiro && v.roteiro.length ? v.roteiro : (v.destino ? [v.destino] : []));
    const rota = cidadesRota.map(tituloMsg).join(' -> ');
    const diaMes = dataOp ? dataOp.split('-').slice(1).reverse().join('/') : '';
    const div = '----------------------------------------';

    let txt = `Olá, ${motorista.toUpperCase()}! Tudo bem?\n`;
    txt += `Segue a programação da sua viagem${diaMes ? ' para o dia ' + diaMes : ''}:\n\n`;
    // AVISO URGENTE do carro (29/09/2026): antes de tudo, para o motorista ler primeiro. Cada linha
    // em negrito separado — no WhatsApp o *negrito* não atravessa quebra de linha.
    const avisoLinhas = (v.aviso || '').toString().split('\n').map(s => s.trim()).filter(Boolean);
    if (avisoLinhas.length) {
      txt += `🚨 *AVISO URGENTE:*\n`;
      avisoLinhas.forEach(s => { txt += `*${s}*\n`; });
      txt += `\n`;
    }
    // Dois motoristas (11/11/2026): os dois nomes, para cada um saber quem dirige em cada trecho.
    if (v.doisMotoristas && v.motorista2) {
      txt += '*MOTORISTAS:* ' + (v.motoristaAtribuido || '').toUpperCase() + ' (ida) e ' + v.motorista2.toUpperCase() + ' (volta)\n';
    }
    txt += `*ROTA:* ${rota}\n`;
    txt += `*SAÍDA:* ${v.horaEmbarque || '--:--'}\n`;
    txt += `*PARTIDA:* ${v.localEmbarque || '—'}\n`;

    const pax = [...v.passageiros].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    pax.forEach(p => {
      // Usa a função calcularIdade de Aba2 (que agora está protegida do bug do parser)
      const idade = calcularIdade(p.nascimento);
      const temAcomp = p.acompanhante && p.acompanhante.trim();
      let embReal = p.enderecoEmbarque;
      if (embReal === "Endereço do paciente") embReal = p.enderecoResidencia || embReal;

      txt += `\n${div}\n\n`;
      txt += `*${p.hora || '--:--'} — ${wppNomePax(p)}*\n`;
      txt += `Local: *${tituloMsg(p.local) || '—'} (${tituloMsg(p.cidade) || '—'})*\n`;
      if (!idade.semData) txt += `Idade: ${idade.anos} anos\n`;
      txt += temAcomp ? `Acompanhante: ${p.acompanhante}\n` : `Sem acompanhante\n`;
      if (embReal) txt += `Embarque: ${embReal}\n`;
      txt += `Telefone: ${formatarTelefonesWpp(p.telefones)}\n`;
      if (temAcomp && p.telefonesAcomp) txt += `Tel. Acompanhante: ${formatarTelefonesWpp(p.telefonesAcomp)}\n`;

      const alertas = regrasIdade(p).filter(a => !/acompanhante OK/i.test(a.label)).map(a => a.label);
      if (temRestricaoReal(p.observacao)) alertas.push(p.observacao);
      if (alertas.length) {
        txt += `\n🚨 *ATENÇÃO:*\n`;
        alertas.forEach(a => { txt += `⚠️ ${a}\n`; });
      }
    });

    return txt;
  }

  // ===== Recado ao paciente pelo WhatsApp (texto do Hélio, 11/11/2026) =====
  // ⚠️ Texto montado com aspas simples, sem crase: há endereços com https no recado, e as duas barras dentro de uma
  // crase derrubam o script no Apps Script (regra 2b do CLAUDE.md).
  // Período da saída: "05:30" -> "da manhã"; 12h às 17h59 "da tarde"; 18h em diante "da noite".
  function wppPeriodoDoDia(hora) {
    const h = parseInt((hora || '').toString().split(':')[0], 10);
    if (isNaN(h)) return '';
    return 12 > h ? 'da manhã' : (18 > h ? 'da tarde' : 'da noite');
  }

  // Embarque na Secretaria da Saúde (regra do setor): antes das 08:00 é na lateral direita do prédio (Rua Coelho Neto,
  // na guarita em frente ao Restaurante Baobá); a partir das 08:00, em frente (Rua Dr. João Colin). Devolve null quando o
  // local não é a Secretaria.
  function wppEmbarqueSecretaria(local, hora) {
    const norm = (local || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    if (norm.indexOf('SECRETARIA') === -1 || norm.indexOf('SAUDE') === -1) return null;
    const p = (hora || '').toString().split(':');
    const minutos = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
    if (8 * 60 > minutos) {
      return { texto: 'Secretaria da Saúde (entrada lateral, endereço fictício de demonstração)',
               mapa: '' };
    }
    return { texto: 'Secretaria da Saúde (em frente ao prédio, endereço fictício de demonstração)',
             mapa: '' };
  }

  function gerarMensagemPacienteWhatsapp(p, v, dataOp) {
    const dataBR = dataOp ? dataOp.split('-').reverse().join('/') : '';
    // Local de embarque do PACIENTE (o do card dele, coluna O), não o do carro. "Endereço do paciente" vira o endereço
    // de casa. Só sem nenhum dos dois cai no embarque do carro.
    let emb = (p.enderecoEmbarque || '').toString().trim();
    if (emb === 'Endereço do paciente') emb = (p.enderecoResidencia || '').toString().trim() || emb;
    if (!emb) emb = (v.localEmbarque || '').toString().trim();
    const hora = (v.horaEmbarque || '').toString().trim();
    const sec = wppEmbarqueSecretaria(emb, hora);
    const cidade = (p.cidade || v.destino || ((v.roteiro && v.roteiro.length) ? v.roteiro[v.roteiro.length - 1] : '') || '—').toString().trim();
    const destino = cidade.toUpperCase() + (p.local ? ' — ' + p.local.toString().trim().toUpperCase() : '');
    const periodo = wppPeriodoDoDia(hora);

    const L = [];
    L.push('*Setor de Transportes - Secretaria da Saúde de Joinville*');
    L.push('');
    L.push('*CONFIRME SUA VIAGEM ATÉ ÀS 5h DA TARDE DE HOJE!*');
    L.push('_Viagens não confirmadas até esse horário serão canceladas automaticamente._');
    L.push('');
    L.push('Como não conseguimos contato por ligação, estamos utilizando este número cadastrado em nosso sistema para comunicar a viagem do(a) paciente:');
    L.push('*' + wppNomePax(p) + '*');
    L.push('');
    L.push('*Data:* ' + dataBR);
    L.push('*Destino:* ' + destino);
    L.push('*Saída do veículo:* ' + (hora || '--:--') + (periodo ? ' ' + periodo : ''));
    L.push('*Local de embarque:* ' + (sec ? sec.texto : (emb || '—')));
    if (sec && sec.mapa) L.push('*Link do Mapa:* ' + sec.mapa);
    L.push('');
    L.push('⚠️ *IMPORTANTE:*');
    L.push('- Esteja no local até 15 minutos antes do horário de embarque;');
    L.push('- O veículo sairá pontualmente do local de embarque;');
    L.push('- Tenha paciência e seja solidário com o próximo. O transporte é coletivo: todos vão juntos e todos retornam juntos, ninguém fica para trás;');
    L.push('- Dependendo do caso, é sempre bom estar preparado para algum imprevisto. Por isso, leve algum lanche e/ou valor para sua alimentação.');
    L.push('');
    L.push('🚫 *ATENÇÃO:*');
    L.push('Este canal do WhatsApp é exclusivo para informar o horário e o local de saída do transporte.');
    L.push('');
    L.push('👉 Não lemos mensagens');
    L.push('👉 Não ouvimos áudio');
    L.push('👉 Não atendemos ligações pelo WhatsApp.');
    L.push('');
    L.push('📞 Todas as dúvidas e informações devem ser feitas por ligações convencionais através dos números:');
    L.push('(00) 0000-0000 ou (00) 0000-0001');
    return L.join('\n');
  }

  // Mensagem de RECUSA de transporte interno (base no texto-modelo da planilha real).
  // l = linha da remoção interna; motivo = "Quem — justificativa". Texto padrão por
  // ora (o usuário vai personalizar depois / tornar configurável).
  function gerarMensagemRecusaInterna(l, motivo) {
    l = l || {};
    var nome = (l.nome || '').toString().trim();
    var dia = (l.data || '').toString().trim();
    var destino = (l.destino || '').toString().trim();
    var txt = '';
    txt += 'Olá' + (nome ? ', ' + nome : '') + '. Aqui é do Setor de Transportes da Secretaria da Saúde de Joinville.\n\n';
    txt += 'Infelizmente não conseguiremos atender a solicitação de transporte';
    if (destino) txt += ' para *' + destino + '*';
    if (dia) txt += ' no dia *' + dia + '*';
    txt += '.\n\n';
    if (motivo) txt += 'Motivo: ' + motivo + '\n\n';
    txt += 'Pedimos desculpas pelo transtorno e permanecemos à disposição para reagendamento.\n';
    txt += 'Dúvidas: (00) 0000-0000 ou (00) 0000-0001.';
    return txt;
  }

  // Confirmação do transporte interno (drawer da Remoção Interna). Texto do Hélio, 11/11/2026: pede resposta até às
  // 17:00 do dia em que a mensagem é enviada; o horário de saída leva "da manhã/da tarde/da noite" (wppPeriodoDoDia).
  function gerarMensagemInternaWhatsapp(l) {
    l = l || {};
    var nome = (l.nome || '').toString().trim();
    var dia = (l.data || '').toString().trim();
    var saida = (l.horaSaida || '').toString().trim();
    var origem = (l.origem || '').toString().trim();
    var destino = (l.destino || '').toString().trim();
    var periodo = wppPeriodoDoDia(saida);
    var h = new Date();
    var hoje = ('0' + h.getDate()).slice(-2) + '/' + ('0' + (h.getMonth() + 1)).slice(-2) + '/' + h.getFullYear();

    var L = [];
    L.push('SETOR DE TRANSPORTES - SECRETARIA DA SAÚDE DE JOINVILLE');
    L.push('');
    L.push('Paciente: ' + (nome || '—'));
    L.push('');
    L.push('INFORMAÇÕES DA VIAGEM');
    L.push('Data: ' + (dia || '—'));
    L.push('Horário de saída do veículo: ' + (saida ? saida + (periodo ? ' ' + periodo : '') : 'a confirmar'));
    L.push('Trajeto: ' + (origem || '—') + ' → ' + (destino || '—'));
    L.push('');
    L.push('CONFIRMAÇÃO DA VIAGEM');
    L.push('1. Responda a esta mensagem para confirmar a viagem.');
    L.push('2. Se você não responder até às 17:00 de hoje ' + hoje + ', a viagem é cancelada automaticamente.');
    L.push('3. Se você não puder ir, avise a equipe com antecedência. Isso libera a vaga para outro paciente.');
    L.push('');
    L.push('ATENÇÃO');
    L.push('- O veículo pode sofrer atrasos.');
    L.push('- Se você tiver dúvidas ou imprevistos, *ligue sem ser pelo whatsapp, ligação somente convencional (00) 0000-0000 ou (00) 0000-0001.*');
    return L.join('\n');
  }

  // Selo de versão (SEMPRE a última linha do script — o Index acusa se faltar = colagem truncada)
  window.__VERSOES = window.__VERSOES || {}; window.__VERSOES.wpp = '11/11c';

// ---- Exposição para o HTML e as outras telas (as telas vieram do Apps Script, onde tudo era global; ADR 0016).
Object.assign(window, { wppNomePax, formatarCaminhoRoteiroHTML, calcularIdade, regrasIdade, nivelMaisAlto, temRestricaoReal, relogioEmoji, tituloMsg, cvAvisoEsc, cvAvisoSeloHTML, cvAvisoFaixaHTML, cancelamentoCamposHTML, cancelamentoLer, cancelamentoMarca, gerarMensagemWhatsapp, wppPeriodoDoDia, wppEmbarqueSecretaria, gerarMensagemPacienteWhatsapp, gerarMensagemRecusaInterna, gerarMensagemInternaWhatsapp });
Object.defineProperty(window, 'CANCEL_MOTIVOS', { configurable: true, get: () => CANCEL_MOTIVOS });
