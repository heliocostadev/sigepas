// Ponte entre as telas trazidas do Apps Script e a API do SIGEPAS em arquitetura de servidor (ADR 0016).
// Cada google.script.run.funcao(...) das telas virou chamarServidor('funcao', [...], aoSucesso, aoFalhar).
// A tabela abaixo diz para qual rota da API cada função foi. Os argumentos seguem na mesma ordem de antes.
(function () {
  'use strict';

  var ROTAS = {
    // Importar CSV (fluxo 1)
    processarCSVUpload: '/api/importacao/importar-arquivo',
    getLocaisPendentes: '/api/importacao/locais-pendentes',
    getSugestoesLocais: '/api/importacao/sugestoes-de-locais',
    getPadroesLocais: '/api/importacao/locais-padronizados',
    salvarDecisoesLocais: '/api/importacao/salvar-decisoes-de-locais',
    // Viagens Externas e Confirmação e Guias (fluxos 1, 2 e 3)
    getDadosOperacao: '/api/operacao/dados-do-dia',
    getDadosOperacaoSeMudou: '/api/operacao/dados-do-dia',
    salvarViagensAlocadas: '/api/operacao/montar-carros',
    atualizarCarroAlocado: '/api/operacao/editar-carro',
    estornarViagemAlocada: '/api/operacao/desfazer-carro',
    cancelarPedidoFila: '/api/operacao/cancelar-pedido',
    desfazerCancelamentoFila: '/api/operacao/desfazer-cancelamento',
    excluirDemandaManual: '/api/operacao/excluir-pedido-digitado',
    salvarEdicaoPaciente: '/api/operacao/editar-pedido',
    salvarNovaDemandaFila: '/api/operacao/incluir-pedido-digitado',
    atualizarDemandaManual: '/api/operacao/atualizar-pedido-digitado',
    salvarConfirmacao: '/api/operacao/confirmar-passageiro',
    moverPacienteAlocado: '/api/operacao/mover-passageiro',
    trocarPacienteAlocado: '/api/operacao/trocar-passageiros',
    marcarAvisoEnviado: '/api/operacao/marcar-aviso-enviado',
    // Escala de Viagens e Escala para Enviar (fluxo 2)
    getDadosParaEscala: '/api/escala/dados-para-formacao',
    salvarNovaArquitetura: '/api/escala/salvar-escala-do-dia',
    salvarViagensDaFormacao: '/api/escala/atribuir-motoristas',
    getEscalaPeriodo: '/api/escala/escala-do-periodo',
    // Configurações
    getConfigData: '/api/cadastros/dados',
    salvarConfig: '/api/cadastros/salvar',
    inativarComVinculo: '/api/cadastros/inativar-com-vinculo',
    vincularVeiculoMotorista: '/api/cadastros/vincular-carro-ao-motorista',
    salvarCalendario: '/api/cadastros/salvar-calendario',
    getPadronizacaoLocais: '/api/cadastros/padronizacoes',
    salvarPadronizacaoLocal: '/api/cadastros/salvar-padronizacao',
    excluirPadronizacaoLocal: '/api/cadastros/excluir-padronizacao'
  };

  // Funções do Apps Script que esta entrega não trouxe. A tela recebe uma mensagem clara em vez de quebrar.
  var FORA_DESTA_ENTREGA = {
    previewCalendario: 'A importação do calendário pelo site da Prefeitura ainda não existe nesta versão. Cadastre os dias pelo botão de novo dia.',
    importarCalendario: 'A importação do calendário pelo site da Prefeitura ainda não existe nesta versão. Cadastre os dias pelo botão de novo dia.'
  };

  // Identifica esta aba do navegador. A API devolve o identificador em cada aviso de mudança, e a aba que gravou não
  // recarrega o que ela mesma acabou de desenhar (tempo-real.js).
  var ID_DA_TELA = window.crypto.randomUUID
    ? window.crypto.randomUUID()
    : Array.from(window.crypto.getRandomValues(new Uint32Array(4))).join('-');
  window.ID_DA_TELA = ID_DA_TELA;

  function erroComMensagem(texto) {
    var erro = new Error(texto);
    erro.toString = function () { return texto; };
    return erro;
  }

  function lerMensagem(corpo, status) {
    if (corpo && corpo.message) return Array.isArray(corpo.message) ? corpo.message.join(' ') : String(corpo.message);
    if (status === 429) return 'Muitas requisições em pouco tempo. Espere um minuto e tente de novo.';
    return 'O servidor não respondeu como esperado (código ' + status + ').';
  }

  // Promessa com a resposta da API. Sessão vencida leva à tela de entrada.
  function pedirAoServidor(rota, argumentos) {
    return fetch(rota, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Id-Da-Tela': ID_DA_TELA },
      body: JSON.stringify({ argumentos: argumentos || [] })
    }).then(function (resposta) {
      return resposta.text().then(function (texto) {
        var corpo = null;
        try { corpo = texto ? JSON.parse(texto) : null; } catch { corpo = texto; }
        if (resposta.status === 401) {
          window.location.href = '/?sessao=terminou';
          throw erroComMensagem('Sua sessão terminou. Entre de novo.');
        }
        if (!resposta.ok) throw erroComMensagem(lerMensagem(corpo, resposta.status));
        return corpo;
      });
    }, function () {
      throw erroComMensagem('Sem conexão com o servidor. Confira a internet e tente de novo.');
    });
  }

  window.chamarServidor = function (nome, argumentos, aoSucesso, aoFalhar, objetoDoUsuario) {
    var falhar = function (erro) {
      if (typeof aoFalhar === 'function') aoFalhar(erro, objetoDoUsuario);
      else if (typeof toast === 'function') toast(erro.message, 'erro');
    };
    if (FORA_DESTA_ENTREGA[nome]) {
      setTimeout(function () { falhar(erroComMensagem(FORA_DESTA_ENTREGA[nome])); }, 0);
      return;
    }
    var rota = ROTAS[nome];
    if (!rota) {
      setTimeout(function () { falhar(erroComMensagem('Função sem rota na API: ' + nome + '.')); }, 0);
      return;
    }
    pedirAoServidor(rota, argumentos).then(function (resultado) {
      if (typeof aoSucesso === 'function') aoSucesso(resultado, objetoDoUsuario);
    }, falhar);
  };

  // Para o caso em que a tela monta a chamada antes e escolhe a função depois:
  // var chamada = criarChamadaAoServidor(aoSucesso, aoFalhar); chamada.salvarNovaDemandaFila(dados);
  window.criarChamadaAoServidor = function (aoSucesso, aoFalhar) {
    return new Proxy({}, {
      get: function (_alvo, nome) {
        return function () {
          window.chamarServidor(String(nome), Array.prototype.slice.call(arguments), aoSucesso, aoFalhar);
        };
      }
    });
  };

  window.pedirAoServidor = pedirAoServidor;
})();
