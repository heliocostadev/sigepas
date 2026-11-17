// Configuração da linha de comando do Prisma 7. O endereço do banco vem da variável de ambiente
// DATABASE_URL, que nunca é gravada no repositório (ver docs/app/README.md).
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env['DATABASE_URL'] ?? '' },
});
