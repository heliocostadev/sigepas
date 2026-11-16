# 0012. Método de trabalho com IA: Maestro enxuto

- **Situação:** aceita em 08/11/2026, por decisão do Hélio.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC. O Hélio
  revisa o texto e o ajusta com as palavras dele.
- **Fontes:** quadro do ambiente de IA (08/11/2026, seções 0 a 9) e avaliação das ferramentas externas (08/11/2026),
  ambos na pasta TCC.

## Contexto

O playbook permite assistentes de IA, mas o uso "não dispensa o domínio do resultado" (`Portfolio.md`). A linha Web
Apps penaliza *vibecoding*. O Maestro (GHDaru, MIT) completo traz 13 subagentes, 12 comandos e 9 portões. Esse
conjunto pesa demais para um prazo de três semanas.

## Decisão

- **Maestro enxuto:** spec antes do código, quem escreve não confere, ADR imutável, registro que só cresce.
- **Cinco subagentes** em `.claude/agents/`, em português: `implementador`, `verificador`, `revisor-de-seguranca`,
  `redator-tecnico` e `explicador`.
- **Skills, subagentes e hooks dentro do repositório**, versionados, com autor e licença de cada skill de terceiro.
- **Idioma:** as skills de terceiros ficam como vieram. As nossas skills e tudo o que uma pessoa lê ficam em
  português.
- **Ordem de precedência:** os `CLAUDE.md`, depois as nossas skills e subagentes, depois as de terceiros.
- **Ferramentas externas:** o Hélio as aprovou depois da avaliação de 24 IAs do GitHub e de três repositórios
  indicados por ele. São elas: três skills do Superpowers, Context7, os modelos do Spec Kit, `security-audit`
  (Cloudflare), `no-ai-slop` e `playwright-cli` (Microsoft).

## Alternativas consideradas

- **Maestro completo:** tem problemas de peso e de idioma, e acrescenta mais uma coisa a explicar na prova.
- **"Enxuto mínimo" com dois subagentes:** proposto e descartado pelo Hélio, porque tirava o revisor de segurança e
  baixava a régua.
- **Plugins inteiros (Superpowers, BMAD Method):** trazem um segundo método ao lado do Maestro.
- **Outros agentes de programação, geradores de aplicação e "empresas de agentes" autônomas:** o Hélio descartou
  essas ferramentas depois da avaliação. Elas repetem o Claude Code, geram a aplicação sem planejamento ou tiram o Hélio do processo.

## Consequências

- Cada tarefa termina com o `verificador` e o `explicador`.
- O teste de ponta a ponta nasce da spec e roda vermelho. Depois disso, o uso do `playwright-cli` é livre, inclusive o
  do gravador.
