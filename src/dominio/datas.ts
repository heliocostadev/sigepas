/**
 * Datas e horas vindas do arquivo de solicitações (RN-IMP-04 e RN-IMP-05).
 *
 * O arquivo é exportado por um sistema de terceiros e a mesma data chega em três formatos
 * diferentes, às vezes no mesmo arquivo: "12 de set. de 2026", "2026-09-12" e "12/9/2026".
 * A hora é pior — o posto digita "9", "930", "9:30" ou "10h", e todos significam coisas
 * diferentes para um computador e a mesma coisa para uma pessoa.
 *
 * Decisão de projeto: dentro do sistema, data e hora são SEMPRE um valor único e conhecido.
 * A bagunça morre aqui, na fronteira da importação, e não se espalha para o resto.
 */

const MESES_PT: Readonly<Record<string, number>> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

/** Data no formato usado internamente: `AAAA-MM-DD`. */
export type DataISO = string;

function doisDigitos(n: number): string {
  return n.toString().padStart(2, '0');
}

function montar(dia: number, mes: number, ano: number): DataISO | null {
  if (!Number.isInteger(dia) || !Number.isInteger(mes) || !Number.isInteger(ano)) return null;
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || ano < 1900 || ano > 2200) return null;
  // Rejeita 31/02 e afins: o calendário decide, não a faixa de valores.
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCDate() !== dia || d.getUTCMonth() !== mes - 1) return null;
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

/**
 * Converte qualquer um dos três formatos de entrada para `AAAA-MM-DD`.
 * Devolve `null` quando não reconhece — quem chama decide se rejeita a linha ou avisa.
 */
export function interpretarData(valor: string | null | undefined): DataISO | null {
  const texto = (valor ?? '').toString().trim().toLowerCase();
  if (!texto) return null;

  // "12 de set. de 2026" / "1 de janeiro de 2026"
  if (texto.includes(' de ')) {
    const partes = texto.replace(/\./g, '').split(' de ');
    if (partes.length !== 3) return null;
    const mes = MESES_PT[(partes[1] ?? '').trim().slice(0, 3)];
    if (mes === undefined) return null;
    return montar(Number(partes[0]), mes, Number(partes[2]));
  }

  // Nos formatos numéricos, o texto inteiro precisa casar com o padrão. Dividir pelo
  // separador e usar só as três primeiras partes deixava passar "2026-09-12-99" e
  // "12/09/2026/lixo" como datas válidas (issue 5). Depois da data, só é aceita uma hora.
  const [parteData = '', ...resto] = texto.split(/\s+/);
  if (resto.length > 1 || (resto.length === 1 && !HORA_COLADA.test(resto[0] ?? ''))) return null;

  // "2026-09-12"
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(parteData);
  if (iso) return montar(Number(iso[3]), Number(iso[2]), Number(iso[1]));

  // "12/9/2026" (com ou sem hora depois)
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(parteData);
  if (br) return montar(Number(br[1]), Number(br[2]), Number(br[3]));

  return null;
}

/** Hora que pode vir colada depois da data: "14:30" ou "14:30:00". */
const HORA_COLADA = /^\d{1,2}:\d{2}(:\d{2})?$/;

/** Hora no formato usado internamente: `HH:MM`, 24 horas. */
export type Hora = string;

/**
 * Normaliza a hora digitada pelo posto para `HH:MM`.
 *
 * Vazio devolve `null`, o mesmo valor de "não reconhecido" (issue 8). Antes vazio virava
 * `00:00`, e uma viagem sem horário ficava igual a uma viagem marcada para a meia-noite.
 * Se a tela precisar de um horário padrão, essa decisão fica com quem chama o parser.
 *
 * Formatos aceitos: "9", "09", "930", "1000", "9:30", "10h" e "10h30". Qualquer texto a mais,
 * como em "10h30h" ou "10:30:59", devolve `null` (issue 5).
 */
export function interpretarHora(valor: string | null | undefined): Hora | null {
  const texto = (valor ?? '').toString().trim();
  if (!texto) return null;

  const separada = /^(\d{1,2})[:hH](\d{2})?$/.exec(texto);
  if (separada) {
    // "9:" não é hora; "10h" é.
    if (separada[2] === undefined && texto.includes(':')) return null;
    return validarHora(Number(separada[1]), Number(separada[2] ?? 0));
  }

  if (/^\d+$/.test(texto)) {
    if (texto.length <= 2) return validarHora(Number(texto), 0);
    if (texto.length === 3) return validarHora(Number(texto.slice(0, 1)), Number(texto.slice(1)));
    if (texto.length === 4) return validarHora(Number(texto.slice(0, 2)), Number(texto.slice(2)));
  }

  return null;
}

function validarHora(h: number, m: number): Hora | null {
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${doisDigitos(h)}:${doisDigitos(m)}`;
}
