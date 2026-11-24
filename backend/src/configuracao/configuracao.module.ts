import { Global, Module } from '@nestjs/common';
import { VARIAVEIS_DE_AMBIENTE, lerVariaveisDeAmbiente } from './variaveis-de-ambiente';

// Disponível para todos os módulos: quem precisa de uma variável de ambiente recebe o objeto já conferido.
@Global()
@Module({
  providers: [{ provide: VARIAVEIS_DE_AMBIENTE, useFactory: () => lerVariaveisDeAmbiente(process.env) }],
  exports: [VARIAVEIS_DE_AMBIENTE],
})
export class ConfiguracaoModule {}
