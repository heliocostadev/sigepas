// Ponto de entrada das telas trazidas do SIGEPAS em Apps Script (ADR 0016). A ordem dos imports é a ordem em que o
// Index do Apps Script incluía cada tela: primeiro a ponte com a API e as funções comuns, depois as telas, por fim o
// tempo real.
import './servidor.js';
import './principal.js';
import './telas/mensagens-de-whatsapp.js';
import './telas/importacao.js';
import './telas/viagens-externas.js';
import './telas/confirmacao-e-guias.js';
import './telas/escala-de-viagens.js';
import './telas/escala-para-enviar.js';
import './telas/configuracoes.js';
import './tempo-real.js';
