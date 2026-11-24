# Modelos de especificação

Os modelos desta pasta são traduções adaptadas dos modelos do [Spec Kit](https://github.com/github/spec-kit) (GitHub,
licença MIT, pasta `templates/`). A tradução e a adaptação são de 08/11/2026, a partir da `main` lida nessa data
(commit `c43849408ac0de2ca6a52f14eaae71449776057b`). A licença MIT pede que o aviso de copyright acompanhe cópias
substanciais. Por isso, a licença original está ao lado, em [`LICENSE-spec-kit`](LICENSE-spec-kit), e o crédito
também aparece no `README.md` do repositório. O Spec Kit também é a base do Maestro, que o SIGEPAS usa de forma
enxuta.

| Modelo | Origem | O que mudou na adaptação |
|---|---|---|
| [`spec.md`](spec.md) | `spec-template.md` | Tradução para o português, matriz requisito → teste (ideia do Leonardo), seção "Foco da revisão" e seção de dados pessoais. O "Foco da revisão" liga cada risco ao teste que o prova (ideia do Vinícius Zanatta) |
| [`plan.md`](plan.md) | `plan-template.md` | Tradução para o português. A "conferência da constituição" virou conferência com o `CLAUDE.md` e as ADRs |
| [`tasks.md`](tasks.md) | `tasks-template.md` | **Testes obrigatórios e antes do código** (no original são opcionais) e registro do vermelho de cada teste |
| [`lista-de-conferencia.md`](lista-de-conferencia.md) | `checklist-template.md` | Tradução para o português e itens do playbook do professor |

O projeto não trouxe o modelo de "constituição" do Spec Kit, porque o `CLAUDE.md` faz esse papel.

## Como usar

1. Copie a pasta para `specs/NNN-nome-do-fluxo/`.
2. Preencha o `spec.md`.
3. Peça ao Hélio a aprovação do `spec.md`.
4. Só depois da aprovação, escreva o `plan.md` e o `tasks.md`.
5. Acione o `implementador`, que segue o `tasks.md` uma tarefa por vez.
6. Acione o `verificador`, que confere o resultado pela matriz requisito → teste.
