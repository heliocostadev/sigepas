import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { VARIAVEIS_DE_AMBIENTE, type VariaveisDeAmbiente } from '../configuracao/variaveis-de-ambiente';
import { PrismaClient } from '../gerado/prisma/client';

// Único ponto de acesso ao PostgreSQL. O Prisma 7 conversa com o banco pelo adaptador do driver "pg".
@Injectable()
export class BancoDeDadosService implements OnModuleDestroy {
  readonly cliente: PrismaClient;

  constructor(@Inject(VARIAVEIS_DE_AMBIENTE) variaveis: VariaveisDeAmbiente) {
    this.cliente = new PrismaClient({ adapter: new PrismaPg({ connectionString: variaveis.enderecoDoBanco }) });
  }

  async estaDisponivel(): Promise<boolean> {
    try {
      await this.cliente.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.cliente.$disconnect();
  }
}
