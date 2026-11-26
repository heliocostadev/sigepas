import { BadRequestException } from '@nestjs/common';

// As telas trazidas do Apps Script chamam cada função do servidor com os mesmos argumentos de antes, em ordem.
// O corpo da requisição é { "argumentos": [...] }. Até 10 argumentos: nenhuma função do sistema tem mais que 8.
export interface CorpoComArgumentos {
  argumentos?: unknown;
}

export function lerArgumentos(corpo: CorpoComArgumentos | undefined): unknown[] {
  const argumentos = corpo?.argumentos ?? [];
  if (!Array.isArray(argumentos) || argumentos.length > 10) {
    throw new BadRequestException('Envie os argumentos numa lista.');
  }
  return argumentos;
}
