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

  // "2026-09-12"
  if (texto.includes('-')) {
    const [ano, mes, dia] = texto.split(' ')[0]?.split('-') ?? [];
    return montar(Number(dia), Number(mes), Number(ano));
  }

  // "12/9/2026" (com ou sem hora depois)
  if (texto.includes('/')) {
    const [dia, mes, ano] = texto.split(' ')[0]?.split('/') ?? [];
    return montar(Number(dia), Number(mes), Number(ano));
  }

  return null;
}

/** Hora no formato usado internamente: `HH:MM`, 24 horas. */
export type Hora = string;

/**
 * Normaliza a hora digitada pelo posto para `HH:MM`.
 *
 * Vazio vira `00:00` — é o que o sistema em produção faz hoje: a viagem existe mesmo sem
 * hora definida, e some da lista se for descartada. Ver a pergunta aberta no PR.
 */
export function interpretarHora(valor: string | null | undefined): Hora | null {
  const texto = (valor ?? '').toString().trim();
  if (!texto) return '00:00';

  const comDoisPontos = texto.replace(/[hH]/g, ':');

  if (comDoisPontos.includes(':')) {
    const [h, m] = comDoisPontos.split(':');
    return validarHora(Number(h), Number(m || 0));
  }

  if (/^\d+$/.test(comDoisPontos)) {
    const d = comDoisPontos;
    if (d.length <= 2) return validarHora(Number(d), 0);
    if (d.length === 3) return validarHora(Number(d.slice(0, 1)), Number(d.slice(1)));
    if (d.length === 4) return validarHora(Number(d.slice(0, 2)), Number(d.slice(2)));
  }

  return null;
}

function validarHora(h: number, m: number): Hora | null {
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${doisDigitos(h)}:${doisDigitos(m)}`;
}
