# Tarefas: [NOME DO FLUXO]

- **Entrada:** [`spec.md`](spec.md) e [`plan.md`](plan.md), aprovados.
- **Regra deste repositório:** os testes são **obrigatórios e vêm antes do código** (TDD em dois ciclos, descrito em
  `docs/testes/estrategia-de-testes.md`). Os testes são opcionais só no modelo original do Spec Kit.

Formato: `[T001] [P?] [História] Descrição, com o caminho do arquivo`. `[P]` marca tarefa que pode rodar em paralelo
(arquivos diferentes, sem dependência).

## Fase 1: preparação

- [ ] T001 [descrição, caminho]

## Fase 2: base comum (bloqueia as histórias)

- [ ] T00N [descrição, caminho]

**Ponto de controle:** a base está pronta, e as histórias podem começar.

## Fase 3: História 1 [título] (P1)

**Objetivo:** [o que a história entrega]
**Teste independente:** [como verificar sozinha]

### Testes primeiro

- [ ] T0NN [História 1] Teste de ponta a ponta do cenário 1, escrito a partir da spec, em `[caminho]`
- [ ] T0NN [História 1] Teste unitário de [regra], em `[caminho]`

### Implementação

- [ ] T0NN [História 1] [descrição, caminho]

**Ponto de controle:** a história 1 funciona e é testável sozinha.

## Registro do vermelho

Esta tabela registra o que cada teste mostrou ao falhar pela primeira vez (ideia do Leonardo). O registro prova que o
teste nasceu antes do código e falhou pelo motivo certo.

| Tarefa | Teste | Falhou com | Commit do vermelho |
|---|---|---|---|
