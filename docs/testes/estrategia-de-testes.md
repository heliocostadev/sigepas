# Estratégia de testes

## A exigência

A linha Web Apps pede "cobertura de testes unitários com TDD": **75% no back-end e 25% no front-end**. A cobertura é
conferida na prova de autoria (`directions/portfolio-directions-webapp.md`, linha 18). A avaliação do Demo Day reduz a
nota de "testes rasos, que só perseguem percentual sem exercitar regra de negócio"
(`demoday/Avaliacao_Poster_DemoDay.md`, linha 96). Por isso o percentual é piso, não objetivo: o objetivo é que cada
regra de negócio tenha o teste que a prova.

## O que existe e o que está planejado

Situação conferida no código em 27/11/2026.

| Item | Situação |
|---|---|
| Testes com Vitest no núcleo `src/dominio`, no back-end e no front-end | Em uso |
| Cobertura com piso de 75% no back-end e 25% no front-end, conferida no CI | Em uso |
| Testes de integração do back-end com PostgreSQL de verdade no CI | Em uso |
| Testes de ponta a ponta com Playwright | Planejado, ainda não existe nenhum |
| Conferência de acessibilidade com axe nos testes | Planejado, ainda não existe nenhuma |
| Teste de mutação com StrykerJS | Planejado, ainda não está configurado |
| Registro do vermelho de cada teste no `tasks.md` | Planejado, nenhum fluxo tem `tasks.md` |

Nenhum `package.json` do projeto (raiz, `backend/` e `frontend/`) traz Playwright, axe ou StrykerJS. O
`playwright-cli` existe só como skill em `.claude/skills/`.

## TDD em dois ciclos

Freeman e Pryce descrevem o método em *Growing Object-Oriented Software, Guided by Tests* (2009).

1. **Ciclo externo.** Escreva à mão o teste de ponta a ponta a partir do cenário de aceite do `spec.md`. Use os nomes
   de campos e botões que a spec define. O teste roda vermelho, porque a tela ainda não existe.
2. **Ciclo interno.** Escreva os testes unitários e de integração um por vez: vermelho, verde, refatorar. Quando o ciclo
   interno termina, o teste de ponta a ponta fica verde.

O ciclo externo ainda não foi aplicado, porque não existe teste de ponta a ponta. Hoje os fluxos são conferidos pelos
testes de rota com banco e pelos testes das telas no jsdom.

Exemplo planejado para o fluxo 1:

```ts
test('linha sem data aparece no relatório com o motivo', async ({ page }) => {
  await entrarComoOperador(page);
  await page.getByLabel('Arquivo do OLOSTECH').setInputFiles('fixtures/linha-sem-data.csv');
  await page.getByRole('button', { name: 'Importar' }).click();
  await expect(page.getByRole('row', { name: /Linha 7.*data/ })).toBeVisible();
});
```

Como a spec define "Arquivo do OLOSTECH" e "Importar", a tela só passa se o campo e o botão tiverem esses nomes
acessíveis. Por isso, a WCAG 2.1 é exigida desde o primeiro teste. A tela no ar usa outros nomes: o campo se chama
"Arquivo CSV do OLOSTECH", e o botão, "Processar arquivo". O relatório de linhas sem data também não existe. Escrito
hoje, esse teste fica vermelho. A seção 11 da [spec do fluxo 1](../../specs/001-importacao-fila/spec.md) lista essas
diferenças.

**O `playwright-cli` entra depois do vermelho.** Ele serve para descobrir localizadores (o gravador é permitido nessa
etapa) e investigar falhas. Também serve para percorrer o fluxo antes de dizer que está pronto e para gerar capturas
para o PR. O teste que vale é o escrito a partir da spec.

**Prova da ordem:** o commit do teste vermelho vem antes do commit da implementação. O `verificador` confere a ordem no
histórico. O registro no `tasks.md` de quais testes falharam antes e por quê (o "Red" documentado, ideia do
Leonardo, repositório [code-lab-project](https://github.com/leonsnw/code-lab-project)) está planejado. Nenhum fluxo tem
`tasks.md` ainda. No porte dos três fluxos para a entrega de 27/11/2026, o teste e a implementação entraram no mesmo
commit (entrada R-0019 de [`RASTREABILIDADE.md`](../RASTREABILIDADE.md)).

## Ferramenta por camada

| Camada | Ferramenta | O que prova | Situação |
|---|---|---|---|
| Núcleo de domínio (`src/dominio`) | Vitest | Cada regra de negócio, com caminho feliz, caminho de erro e casos-limite | Em uso. O back-end no ar não usa esse núcleo |
| Regras do setor (`backend/src/regras`) | Vitest | As regras que o back-end no ar usa: texto, data, hora, chave do pedido, leitura do CSV | Em uso |
| Serviços do NestJS | Vitest, com o plugin SWC | Orquestração das regras, transações | Em uso, pelos testes de rota com banco |
| Rotas com banco | Vitest, Supertest e PostgreSQL de verdade no CI | Validação de entrada, códigos de resposta, sessão, gravação no banco | Em uso. O papel de gestor é conferido com resposta 403 só na rota `/cadastros/salvar` |
| Tela de entrada em React | Vitest e Testing Library | Comportamento visível, nomes acessíveis | Em uso em `frontend/src/PaginaInicial.test.tsx` |
| Telas dos fluxos, trazidas do SIGEPAS em Apps Script | Vitest com jsdom | O que cada tela mostra e quais rotas ela chama | Em uso em `frontend/src/sistema/teste/` |
| Fluxos completos | Playwright, com axe para acessibilidade | Os três fluxos de ponta a ponta | Planejado. Ainda não existe nenhum teste |

Os testes de integração do back-end usam a variável `DATABASE_URL_DE_TESTE`. Sem ela, eles são pulados. O CI sobe um
PostgreSQL 16 e aplica as migrações antes dos testes (`.github/workflows/ci.yml`).

## Cobertura

- O provedor v8 do Vitest mede a cobertura e gera o relatório `lcov` para o SonarQube Cloud.
- Os pisos estão configurados em três arquivos. O `vitest.config.ts` da raiz exige 75% em `src/dominio/`. O
  `backend/vitest.config.mts` exige 75% em `backend/src/`. O `frontend/vite.config.ts` exige 25% em `frontend/src/`.
- O CI roda os três `test:cov` e reprova abaixo do piso (ideia do Lucas Klemke, repositório
  [crm-advocacia](https://github.com/LucasKlemke/crm-advocacia)). O back-end roda com o PostgreSQL de teste.
- O job do SonarQube Cloud lê os três relatórios. Ele roda só em PR e na `main`, quando a variável `SONAR_HABILITADO`
  vale `true`.

## Teste de mutação

O StrykerJS altera o código de propósito (troca `>` por `>=`, apaga uma condição) e confere se algum teste falha. Ele
mede se os testes pegam erro de verdade. O StrykerJS ainda não está configurado no projeto e é melhoria futura. O plano
é rodar antes do release, e não em todo PR, porque é demorado.

## Dados de teste

Os dados de teste são sempre fictícios, no formato de colunas do OLOSTECH. O script `scripts/gerar-csv-ficticio.mjs`
gera o arquivo de exemplo `docs/exemplos/olostech-ficticio.csv`. O back-end usa o arquivo
`backend/src/teste/olostech-ficticio-de-teste.csv`. Os dois arquivos trazem a data no formato `DD/MM/AAAA` e o status
"Ativo" ou "Cancelado". O formato real da data é conferido em dois testes unitários. O teste do núcleo anterior,
`src/dominio/datas.test.ts`, usa "12 de set. de 2026". O teste de `dataParaISO`, em
`backend/src/regras/regras-do-setor.test.ts`, usa "27 de nov. de 2026".
