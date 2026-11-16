# Skills do SIGEPAS: para que serve cada uma, de onde veio e com que licença

Este índice é de 08/11/2026 e parte de duas fontes:

- o quadro do ambiente de IA aprovado pelo Hélio (pasta `TCC`,
  `SIGEPAS/PLANOS_DE_TRABALHO/2026-11-08_ambiente-ia-skills.md`).
- a avaliação das ferramentas externas (`SIGEPAS/03-REFERENCIAS/AVALIACAO_24_IAS_DO_GITHUB_MAPA_103.md`).

**Regra de idioma:** as skills de terceiros ficam como vieram, em inglês, sem edição. As nossas são em português.
Quando discordarem, vale a ordem de precedência do [`CLAUDE.md`](../../CLAUDE.md): os `CLAUDE.md`, depois as nossas
skills e subagentes, depois as de terceiros.

## As nossas

| Skill | Para quê | Quando |
|---|---|---|
| `registrar-sessao` | Registro de trabalho, página de onde parei e checklist do professor | Ao fechar cada conversa |
| `ensaio-prova-autoria` | Perguntas do guia do professor sobre o próprio código, sem dar a resposta | Antes de cada orientação e na semana de 23/11 |
| `preparar-orientacao` | Pauta antes e evidência depois de cada orientação | Antes e depois de cada orientação |
| `voz-do-sigepas` | Como o sistema fala com o operador e o gestor (adaptada da `voz-do-servidor`, do projeto de estágio do Hélio) | Todo texto de tela |
| `relatorio-abnt` | Relatórios do PAC VIII com formatação acadêmica (regra do report da N1, sem alteração do texto) | Quando houver relatório |

## As de terceiros

Cada pasta leva o `LICENSE` do repositório de origem (e a `impeccable` também o `NOTICE.md`), como as licenças pedem.
A exceção é a `karpathy-guidelines`, porque o repositório de origem não tem o arquivo (ver a tabela). Os arquivos
delas ficam como vieram, sem edição.

| Skill | Autor e origem | Versão copiada | Licença | Para quê no SIGEPAS |
|---|---|---|---|---|
| `karpathy-guidelines` | forrestchang, [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) (antes `forrestchang/andrej-karpathy-skills`) | Cópia do projeto do Douglas, idêntica à versão do repositório em 08/11/2026 | MIT, declarada no `README.md` e no `plugin.json` de origem, que não têm arquivo `LICENSE` | Suposições declaradas, código mínimo, mudança cirúrgica |
| `diagnose-before-fix` | GHDaru, [GHDaru/maestro](https://github.com/GHDaru/maestro) | `d0947636fb950b30973937247e306bcaab6991d7` | MIT | Nenhuma correção sem a causa investigada |
| `verifiable-dod` | GHDaru, [GHDaru/maestro](https://github.com/GHDaru/maestro) | `d0947636fb950b30973937247e306bcaab6991d7` | MIT | Nenhum critério de aceite sem o comando que o prova |
| `test-driven-development` (com `writing-good-tests.md`) | Jesse Vincent, [obra/superpowers](https://github.com/obra/superpowers) | `22f0b463e7a5e579904dd6211a520321035526f7` | MIT | Teste visto falhando antes do código |
| `verification-before-completion` | Jesse Vincent, [obra/superpowers](https://github.com/obra/superpowers) | `22f0b463e7a5e579904dd6211a520321035526f7` | MIT | Nada é "pronto" sem o comando rodado e a saída lida |
| `receiving-code-review` | Jesse Vincent, [obra/superpowers](https://github.com/obra/superpowers) | `22f0b463e7a5e579904dd6211a520321035526f7` | MIT | Responder às reviews dos colegas com conferência técnica |
| `security-audit` | Cloudflare, [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) | `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` | MIT | Método do `revisor-de-seguranca` |
| `no-ai-slop` (sem `agents/openai.yaml`, que é de outra ferramenta) | Peter Yang, [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop) | `000650b156983f5159695b441477f4e63b25dc85` | MIT | Conferir marca de IA em texto publicado |
| `playwright-cli` | Microsoft, [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) | `4bc00fb7fa5b4329f2fb53ac4743a066c2c664e8` | Apache-2.0 | Percorrer os fluxos no navegador, investigar falhas, capturas e vídeos para PR |
| `c4-model` | Cherif Toujeni, [cheriftj/c4-model-skill](https://github.com/cheriftj/c4-model-skill) | Versão 2.0.0 (CHANGELOG), baixada para `TCC/SIGEPAS/03-REFERENCIAS/skills/` | MIT | Diagramas C4 em Mermaid para o RFC e a Wiki |
| `better-accessibility`, `better-colors`, `better-interface`, `better-layout`, `better-typography`, `better-ui`, `better-writing` | Jakub Krehel, [jakubkrehel/skills](https://github.com/jakubkrehel/skills) | `4c66b1fa86e9ab70187b43d7da9b6fdb29f2ef63`, via projeto do Douglas | MIT | Interface sem visual genérico e acessibilidade desde a primeira tela |
| `impeccable` (sem a pasta `scripts/`) | Paul Bakaus, [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | `08d5b470495d242ca0470f4aeae1956c3a074f83`, via projeto do Douglas | Apache-2.0, com `NOTICE.md` | Só revisão de interface |

**O que ficou de fora de propósito:** a pasta `scripts/` da `impeccable` e as demais skills dos mesmos repositórios.
O lançador da pasta `scripts/` baixa e executa um programa. Sem ele, a skill usa o plano B oficial, que lê
`PRODUCT.md` e `DESIGN.md`. A avaliação citada no topo traz o motivo de cada exclusão.

## Auditoria feita antes da cópia

- **Superpowers, no-ai-slop, Maestro, karpathy, Jakub Krehel, c4-model:** contêm só textos `.md`.
- **impeccable:** contém só textos `.md`, sem a pasta `scripts/` (auditada em 17/10/2026 no projeto do Douglas).
- **security-audit:** os dois validadores `.cjs` usam só `fs`, `path` e `util` do Node. Não acessam a rede, não
  executam outros programas e não leem variáveis de ambiente.
- **playwright-cli:** a skill só libera os comandos `playwright-cli` e `npx playwright`. O arquivo principal do
  programa (`playwright-cli.js`) não tem telemetria. Ele consulta o registro do npm para avisar de versão nova
  (`checkForUpdates`, nos comandos `open`, `attach`, `list`, `install` e `install-browser`). A consulta não acontece
  quando a variável `NO_UPDATE_NOTIFIER` ou `CI` está definida. No SIGEPAS, use o programa com `NO_UPDATE_NOTIFIER=1`.
  A auditoria não cobriu as dependências dele (o próprio Playwright). O programa ainda não está instalado. Ele entra
  com o front-end, com versão fixada.
- Nenhum arquivo traz instrução escondida (mandar dados para fora, ignorar instruções anteriores, agir sem avisar).

## Conflitos já conhecidos e como ficam

| Skill de terceiro | O que ela diz | O que vale no SIGEPAS |
|---|---|---|
| `no-ai-slop` | Aceita "um ou dois travessões" em textos longos | Nenhum travessão |
| `no-ai-slop` | Preserva gírias e palavrões do autor | Registro universitário |
| `no-ai-slop` | Modo editar reescreve o rascunho | Em texto aprovado pelo Hélio, só o modo detectar |
| `no-ai-slop` | Lista de palavras proibidas em inglês | Lista em português em `docs/git/escrita-dos-textos-publicados.md` |
| `playwright-cli` | O guia `test-generation.md` grava o teste a partir da tela pronta | O teste de ponta a ponta nasce da spec e roda vermelho. Depois disso, a ferramenta é livre, inclusive o gravador |
| `playwright-cli` | O guia propõe consertar teste quebrado | O agente pode consertar só o localizador. Asserção que falha é defeito até a `diagnose-before-fix` provar o contrário |
| `playwright-cli` | Instalação com `npm install -g @playwright/cli@latest` | Versão fixada como dependência de desenvolvimento do projeto, quando o front-end for criado |
| `security-audit` | Pode gravar o relatório dentro do alvo se o usuário escolher | Sempre fora do repositório, que é público |
| `better-writing`, `impeccable` | Técnica geral de texto de interface | A `voz-do-sigepas` manda sobre as duas |
| `better-*` | Exemplos em Tailwind e outras bibliotecas | Traduzir para o que o front-end do SIGEPAS usar (definido na ADR do front-end) |
| `test-driven-development` | Código escrito antes do teste é descartado | Vale como está. É a regra do TDD que o playbook pede |

## Como atualizar uma skill de terceiro

1. Leia o que mudou no repositório de origem desde o commit da tabela.
2. Repita a auditoria nos arquivos que mudaram.
3. Copie a skill de novo, sem editar.
4. No mesmo PR, atualize o commit nesta tabela.
