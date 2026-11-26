import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Publica } from '../autenticacao/decoradores';
import { BancoDeDadosService } from '../banco-de-dados/banco-de-dados.service';

// Usado pelo monitor de disponibilidade e pelo deploy: 200 quando a API e o banco respondem, 503 quando o banco não
// responde. A resposta não traz versão, endereço nem detalhe interno.
@Publica()
@Controller('saude')
export class SaudeController {
  constructor(private readonly banco: BancoDeDadosService) {}

  @Get()
  async informarSaude(): Promise<{ situacao: string; banco: string }> {
    if (!(await this.banco.estaDisponivel())) {
      throw new ServiceUnavailableException({ situacao: 'degradado', banco: 'indisponivel' });
    }
    return { situacao: 'ok', banco: 'disponivel' };
  }
}
