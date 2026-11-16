---
name: registrar-sessao
description: Ritual de fechamento de uma conversa de trabalho no TCC do Hélio. Acrescenta a entrada do dia no registro de trabalho, reescreve a página de onde parei quando o próximo passo mudou e atualiza o checklist do professor. Use ao encerrar qualquer conversa que mudou arquivo, tomou decisão ou publicou algo, e sempre que o Hélio disser "fechar", "registrar" ou "encerrar a conversa".
---

# Registrar a sessão

A memória do TCC fica em três arquivos da pasta `TCC`, e não na conversa. A pasta fica na máquina do Hélio, fora
deste repositório. Uma conversa nova começa pela leitura desses arquivos. Se a conversa que termina não atualizar esses
arquivos, o trabalho dela se perde para a próxima.

## Onde ficam

Procure a pasta `TCC` subindo a partir do repositório. Ela é a pasta-mãe de `SIGEPAS/04-SISTEMA`.

| Arquivo | Regra |
|---|---|
| `REGISTRO_DE_TRABALHO/AAAA-MM.md` | **Só se acrescenta.** Nada é apagado nem reescrito. Correção é entrada nova |
| `ONDE_PAREI_E_PROXIMOS_PASSOS.md` | **Reescrita** quando o próximo passo mudou. É a única fonte do próximo passo |
| `SIGEPAS/03-REFERENCIAS/CHECKLIST_PROFESSOR.md` | Atualizado quando um item mudou de estado |

Se a pasta `TCC` não existir (outra pessoa clonou o repositório), registre só no `docs/RASTREABILIDADE.md` e avise.

## Passos, nesta ordem

1. **Levante o que aconteceu** nestas fontes, sem confiar na memória da conversa:
   - `git status`, `git log --oneline` da branch e o diff, para saber o que mudou de fato.
   - Os arquivos fora do repositório que a conversa tocou.
   - As decisões do Hélio, com as palavras dele quando forem curtas.
2. **Escreva a entrada do registro de trabalho** no fim do arquivo do mês corrente, com:
   - O título `## DD/MM/AAAA (dia da semana, período): conversa "nome da conversa", assunto`.
   - O que foi feito, em itens curtos e concretos.
   - Os arquivos tocados, com o caminho.
   - As **decisões do Hélio**, em negrito, com a data.
   - O que ficou pendente e com quem.
3. **Reescreva a página de onde parei** só se o próximo passo mudou.
4. Na reescrita, mantenha as seções "Onde estamos", "Decidido", "Próximo passo" e "O que ler primeiro".
5. Na reescrita, atualize a data no topo.
6. Se algum item mudou de estado, **atualize o checklist do professor** com a prova (commit, link, arquivo).
7. Se a conversa tomou decisão de arquitetura ou fez deploy, confira se o `redator-tecnico` escreveu a ADR e o
   `docs/RASTREABILIDADE.md`.
8. Se faltar algum dos dois, avise o Hélio antes de fechar.
9. **Mostre ao Hélio** o que foi escrito em cada arquivo, em poucas linhas.

## Regras

- **Evidência é verdade:** não retroaja datas nem registre o que não aconteceu. Registre a hora aproximada só se ela
  for conhecida.
- **Não invente:** decisão que o Hélio não tomou não entra como decisão. Ela fica como pendente.
- **Registro universitário:** escreva sem travessões e sem marca de IA (skill `no-ai-slop`, modo detectar).
- **Links completos:** use o link completo para issue e PR (`https://github.com/heliocostadev/sigepas/pull/N`), nunca
  `#N`.
- Commit e push do repositório não fazem parte do registro. Faça commit e push só quando o Hélio pedir.
