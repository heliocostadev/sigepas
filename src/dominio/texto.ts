/**
 * Normalização de texto para comparação.
 *
 * Por que isso é domínio, e não utilitário: a comparação de nomes de cidade e de local
 * de atendimento decide se duas grafias são a MESMA coisa. "Hospital Regional",
 * "HOSPITAL REGIONAL " e "Hospital Régional" precisam colidir, senão o sistema passa a
 * tratar o mesmo destino como três destinos diferentes.
 *
 * Regra do sistema em produção (RN-IMP-06): a comparação ignora acento, caixa e espaço
 * repetido — mas o valor ORIGINAL nunca é alterado por esta função. Ela só produz a
 * chave de comparação.
 */

/** Sem acento, em maiúsculas, com espaços colapsados. Nunca devolve `null`. */
export function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? '')
    .toString()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/**
 * Chave composta de um destino: cidade + local.
 *
 * O separador `||` é intencional: ele não aparece em nome de cidade nem de local, então
 * "SAO JOSE" + "CLINICA A" nunca colide com "SAO" + "JOSE CLINICA A".
 */
export function chaveDestino(cidade: string | null | undefined, local: string | null | undefined): string {
  return `${normalizarTexto(cidade)}||${normalizarTexto(local)}`;
}
