# Como contribuir

Obrigado por revisar. Este documento é curto de propósito.

## Fluxo

1. Saia de `dev`, nunca de `main`:
   ```bash
   git switch dev
   git pull
   git switch -c feat/nome-curto
   ```
2. Faça o trabalho. **Toda regra de negócio nova vem com teste** — inclusive o caso-limite.
3. Antes de abrir o Pull Request:
   ```bash
   npm run verificar
   ```
4. Abra o PR **contra `dev`**, preenchendo o template.

## O que esperamos de uma revisão

Revisão útil aponta alguma coisa. Por exemplo:

- um caso que o teste não cobre;
- uma regra que o código diz de um jeito e o documento diz de outro;
- um nome que vai confundir quem ler daqui a seis meses;
- uma decisão que mereceria ser outra — com o porquê.

"Ok" e "ficou bom" não ajudam ninguém. Se estiver tudo certo mesmo, diga **o que** você
verificou: "conferi os três formatos de data contra a RN-IMP-04 e bate".

## Convenções

- Mensagem de commit: `tipo(escopo): o que mudou` — `feat`, `fix`, `docs`, `test`, `chore`.
- Código e comentários em português. O domínio é português; traduzir só atrapalharia.
- Comentário explica **por quê**, não o quê. O código já diz o quê.
- Regra de negócio referencia o código dela (`RN-IMP-04`), que vive em [`docs/`](docs/).

## Dados

Este repositório é público e **nunca** recebe dado real de paciente: nada de nome, telefone,
endereço, matrícula ou data de nascimento de pessoa de verdade, nem em teste, nem em print, nem
em exemplo de commit. Teste usa dado inventado.
