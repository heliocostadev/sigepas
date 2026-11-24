// Teste de guarda da ADR 0005. A injeção de dependência do NestJS depende dos metadados que o compilador gera para
// o construtor. Se eles deixarem de ser gerados, numa atualização do Vitest ou do plugin SWC, este teste falha antes
// de a injeção quebrar.
import 'reflect-metadata';
import { BancoDeDadosService } from './banco-de-dados/banco-de-dados.service';
import { SaudeController } from './saude/saude.controller';

it('o compilador gera os metadados do construtor que a injeção de dependência usa', () => {
  expect(Reflect.getMetadata('design:paramtypes', SaudeController)).toEqual([BancoDeDadosService]);
});
