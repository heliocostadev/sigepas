# Estratégia de testes

## A exigência

A linha Web Apps pede "cobertura de testes unitários com TDD": **75% no back-end e 25% no front-end**. A cobertura é
conferida na prova de autoria (`directions/portfolio-directions-webapp.md`, linha 18). A avaliação do Demo Day reduz a
nota de "testes rasos, que só perseguem percentual sem exercitar regra de negócio"
(`demoday/Avaliacao_Poster_DemoDay.md`, linha 96). Por isso o percentual é piso, não objetivo: o objetivo é que cada
regra de negócio tenha o teste que a prova.

## TDD em dois ciclos

Freeman e Pryce descrevem o método em *Growing Object-Oriented Software, Guided by Tests* (2009).

1. **Ciclo externo.** Escreva à mão o teste de ponta a ponta a partir do cenário de aceite do `spec.md`. Use os nomes
   de campos e botões que a spec define. O teste roda vermelho, porque a tela ainda não existe.
2. **Ciclo interno.** Escreva os testes unitários e de integração um por vez: vermelho, verde, refatorar. Quando o ciclo
   interno termina, o teste de ponta a ponta fica verde.

Exemplo do fluxo 1:

```ts
test('linha sem data aparece no relatório com o motivo', async ({ page }) => {
  await entrarComoOperador(page);
  await page.getByLabel('Arquivo do OLOSTECH').setInputFiles('fixtures/linha-sem-data.csv');
  await page.getByRole('button', { name: 'Importar' }).click();
  await expect(page.getByRole('row', { name: /Linha 7.*data/ })).toBeVisible();
});
```

Como a spec define "Arquivo do OLOSTECH" e "Importar", a tela só passa se o campo e o botão tiverem esses nomes
acessíveis. Por isso, a WCAG 2.1 é exigida desde o primeiro teste.

**O `playwright-cli` entra depois do vermelho.** Ele serve para descobrir localizadores (o gravador é permitido nessa
etapa) e investigar falhas. Também serve para percorrer o fluxo antes de dizer que está pronto e para gerar capturas
para o PR. O teste que vale é o escrito a partir da spec.

**Prova da ordem:** o commit do teste vermelho vem antes do commit da implementação. O `verificador` confere a ordem no
histórico. Cada fluxo registra no `tasks.md` quais testes falharam antes e por quê (o "Red" documentado, ideia do
Leonardo, repositório [code-lab-project](https://github.com/leonsnw/code-lab-project)).

## Ferramenta por camada

| Camada | Ferramenta | O que prova |
|---|---|---|
| Núcleo de domínio | Vitest | Cada regra de negócio, com caminho feliz, caminho de erro e casos-limite |
| Serviços do NestJS | Vitest, com o plugin SWC | Orquestração das regras, transações |
| Controladores e rotas | Vitest e Supertest | Validação de entrada, códigos de resposta, papel exigido em cada rota |
| Repositórios | Vitest com PostgreSQL de verdade no CI | Consultas, restrições do banco, migrações |
| Componentes React | Vitest e Testing Library | Comportamento visível, nomes acessíveis |
| Fluxos completos | Playwright, com axe para acessibilidade | Os três fluxos de ponta a ponta |

## Cobertura

- O provedor v8 do Vitest mede a cobertura e gera o relatório `lcov` para o SonarCloud.
- O CI falha abaixo de 75% no back-end e 25% no front-end (ideia do Lucas Klemke, repositório
  [crm-advocacia](https://github.com/LucasKlemke/crm-advocacia)). Hoje o piso de 75% já vale para `src/dominio/`.

## Teste de mutação

O StrykerJS altera o código de propósito (troca `>` por `>=`, apaga uma condição) e confere se algum teste falha. Ele
mede se os testes pegam erro de verdade. O StrykerJS roda antes de cada orientação e do release, não em todo PR, porque
é demorado.

## Dados de teste

Os dados de teste são sempre fictícios, no formato real do OLOSTECH (data "12 de set. de 2026", hora `HH:MM`, status
"Ativo" e "Cancelado"). Um gerador de CSV fictício entra com o fluxo 1.
