# Como contribuir

Obrigado por revisar. Este documento é curto de propósito.

## Fluxo

1. Saia de `dev`, nunca de `main`:
   ```bash
   git switch dev
   git pull
   git switch -c feat/nome-curto
   ```
2. Faça o trabalho. **Toda regra de negócio nova vem com teste**, inclusive o caso-limite.
3. Antes de abrir o Pull Request:
   ```bash
   npm run verificar
   ```
4. Abra o PR **contra `dev`**, preenchendo o template.
5. O merge exige a verificação "CI aprovado" verde. A proteção da `main` e da `dev` não exige revisão aprovada.

## O que esperamos de uma revisão

Revisão útil aponta alguma coisa. Por exemplo:

- um caso que o teste não cobre;
- uma regra que o código diz de um jeito e o documento diz de outro;
- um nome que vai confundir quem ler daqui a seis meses;
- uma decisão que mereceria ser outra, com o porquê.

"Ok" e "ficou bom" não ajudam ninguém. Se estiver tudo certo mesmo, diga **o que** você
verificou: "conferi os três formatos de data contra a RN-IMP-04 e bate".

## Convenções

- Mensagem de commit: `tipo(escopo): o que mudou`, com os tipos `feat`, `fix`, `docs`, `test`, `chore`. A lista
  completa, conferida no CI, está em [`docs/git/README.md`](docs/git/README.md).
- Código e comentários em português. O domínio é português; traduzir só atrapalharia.
- Comentário explica **por quê**, não o quê. O código já diz o quê.
- Regra de negócio cita de onde veio. No núcleo de domínio anterior (`src/dominio`), ela cita o código `RN-IMP` do
  [`spec.md` do fluxo 1](specs/001-importacao-fila/spec.md). No back-end, as rotas usadas pelas telas e a
  maioria das funções de `backend/src/regras/regras-do-setor.ts` citam a função do SIGEPAS em Apps Script que
  reproduzem.

## Dados

Este repositório é público e **nunca** recebe dado real de paciente: nada de nome, telefone,
endereço, matrícula ou data de nascimento de pessoa de verdade, nem em teste, nem em print, nem
em exemplo de commit. Teste usa dado inventado.
