# Git: branches, commits e pull requests

## Branches

- **`main`:** o que está estável e publicado. Ninguém escreve direto.
- **`dev`:** integração. Todo PR aponta para cá.
- **`feat/...`, `fix/...`, `docs/...`, `chore/...`:** uma branch por assunto, curta, saída da `dev`.

É o fluxo que o SIGEPAS usa desde a N1 do PAC VIII e o mesmo descrito pelo colega Bruno.

## Mensagens de commit

O formato é `tipo(escopo): o que mudou`, em português. O CI confere o formato com o
`scripts/conferir-mensagens-de-commit.mjs`.

| Tipo | Quando | Exemplo |
|---|---|---|
| `feat` | Funcionalidade nova | `feat(importacao): linha sem data vai para o relatório com o motivo` |
| `fix` | Correção de defeito | `fix(dominio): hora vazia devolve null em vez de 00:00` |
| `test` | Só testes (o commit do teste vermelho) | `test(importacao): linha sem data deve ser rejeitada` |
| `docs` | Só documentação | `docs(adr): registra a escolha do NestJS` |
| `refactor` | Mudança sem alterar comportamento | `refactor(dominio): reaproveita normalizarTexto no status` |
| `chore` | Manutenção, dependências | `chore: projeto renomeado para SIGEPAS` |
| `ci` | Pipeline | `ci: verificação única para a proteção da main` |

O script também aceita os outros tipos do Conventional Commits, menos usados aqui. São eles: `build` (empacotamento),
`perf` (desempenho), `style` (formatação, sem mudar código) e `revert` (desfazer um commit).

Os commits não levam a linha `Co-Authored-By` (decisão de 16/11/2026). O uso de IA no projeto está descrito
no `README.md` e no `CLAUDE.md` do repositório.

## Pull requests

- O modelo em `.github/pull_request_template.md` pede a regra de negócio, a spec, como foi verificado, a segurança e
  **onde você quer a opinião de quem revisa**. Perguntas na descrição renderam as melhores reviews da N1.
- Correção de defeito apontado por colega cita o link completo da issue e responde a ela com o commit.
- O merge só acontece com o "CI aprovado" verde e pelo menos uma revisão.
- Nada é publicado (PR, comentário, issue) sem que o texto seja lido antes.

## Textos publicados

Regras de escrita para issue, PR, comentário e documento: [`escrita-dos-textos-publicados.md`](escrita-dos-textos-publicados.md).
