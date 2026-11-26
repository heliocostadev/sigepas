// Ponto de entrada das telas trazidas do SIGEPAS em Apps Script (ADR 0016). A ordem dos imports é a ordem em que o
// Index do Apps Script incluía cada tela: primeiro a ponte com a API e as funções comuns, depois as telas, por fim o
// tempo real.
import html2canvas from 'html2canvas';
import './servidor.js';

// Gera a imagem da escala e da guia do motorista (MIT, github.com/niklasvh/html2canvas). No Apps Script vinha de um
// site de fora; aqui vem no próprio pacote das telas.
window.html2canvas = html2canvas;
import './principal.js';
import './telas/mensagens-de-whatsapp.js';
import './telas/importacao.js';
import './telas/viagens-externas.js';
import './telas/confirmacao-e-guias.js';
import './telas/escala-de-viagens.js';
import './telas/escala-para-enviar.js';
import './telas/configuracoes.js';
import './tempo-real.js';
