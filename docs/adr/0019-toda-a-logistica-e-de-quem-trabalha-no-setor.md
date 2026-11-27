# 0019. Toda a logística é de quem trabalha no setor, e só o gestor altera cadastros e configurações

- **Situação:** proposta em 27/11/2026. Substitui em parte a [ADR 0007](0007-dois-papeis-gestor-e-operador.md), na
  divisão do trabalho entre os papéis e na consequência sobre as rotas.
- **Redação:** IA (Claude Code), em 27/11/2026, a partir da decisão de 27/11/2026 e da leitura do código da `main` no
  commit `3dbc261`.
- **Fontes:** decisão de 27/11/2026: "Quem trabalha no setor manipula tudo o que tem no sistema. É premissa que no
  setor de transportes todos estejam hábeis e capazes de fazer a logística dos que solicitam a viagem."
  [ADR 0007](0007-dois-papeis-gestor-e-operador.md) e [ADR 0015](0015-login-e-sessao-no-servidor.md).

## Contexto

A ADR 0007, aceita em 08/11/2026, dividiu o trabalho assim: o operador importa, monta carros e registra remoções e
ligações. O gestor faz o mesmo e também cuida de cadastros, escala e contas. A ADR 0007 previa ainda que cada rota
declarasse o papel exigido, com um teste de resposta 403 para cada rota.

O sistema no ar segue outra divisão. A remoção interna não existe
([ADR 0018](0018-terceiro-fluxo-e-a-confirmacao-do-paciente.md)). A escala aceita os dois papéis. Nenhuma tela cria
contas.

## Decisão

Toda a logística é de todos do setor, operador e gestor: importação, fila do dia, carros, escala, confirmação do
paciente e guias. O gestor tem a mais só a alteração dos cadastros e das configurações. As contas nascem pelo comando
`criar-conta`, fora das telas.

## Alternativas consideradas

- **Escala só para o gestor, como na ADR 0007:** contraria a premissa do setor, em que todos fazem a logística dos
  pedidos de viagem.
- **Um papel só:** a ADR 0007 já recusou essa alternativa. A alteração dos cadastros e das configurações continua
  restrita ao gestor.

## Consequências

- O servidor decide a autorização pela guarda de sessão do NestJS
  (`backend/src/autenticacao/guarda-de-sessao.guard.ts`). Toda rota exige sessão, menos as marcadas com `@Publica`.
- Só as rotas que alteram a tela Configurações declaram papel. São seis rotas com `@SoGestor`, em
  `backend/src/cadastros/cadastros.controller.ts`: `salvar`, `inativar-com-vinculo`, `vincular-carro-ao-motorista`,
  `salvar-calendario`, `salvar-padronizacao` e `excluir-padronizacao`.
- As demais rotas não declaram papel e aceitam o operador e o gestor. A leitura dos cadastros também é livre para quem
  entrou.
- Na revisão de locais da importação, qualquer pessoa do setor grava a decisão sobre um local pendente
  (`POST /api/importacao/salvar-decisoes-de-locais`).
- Um teste confere a resposta 403 para o operador só na rota `/cadastros/salvar`
  (`backend/src/autenticacao/autenticacao.test.ts`). O teste de 403 nas outras cinco rotas com `@SoGestor` fica
  pendente.
- O comando `criar-conta` (`backend/src/comandos/criar-conta.ts`) cria a conta com o papel gestor ou operador. Na
  produção, o gestor inicial nasce na subida da API, a partir do hash da senha (ADR 0015). Nenhuma tela cria ou
  altera contas.
- Esta ADR não muda nenhuma permissão no código. Ela registra a divisão que já está no ar.
