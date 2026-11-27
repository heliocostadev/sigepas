---
name: preparar-orientacao
description: Prepara a pauta de uma orientação do Portfólio com o professor e, depois dela, registra a evidência exigida pelo playbook. Use antes e depois de cada orientação (a terceira é em 12/11/2026, e as cinco precisam estar evidenciadas até 30/11/2026) e sempre que o autor falar em "orientação", "pauta" ou "ata".
---

# Preparar a orientação

## A regra do professor

O `Portfolio.md` exige **cinco orientações**, presenciais ou remotas. **Ao menos duas** devem acontecer até
**30/09/2026**, e as demais até **30/11/2026**. Evidenciar cada uma é obrigação do aluno: **e-mail com ata, foto ou
registro equivalente**, entregue ao professor. Sem as cinco evidenciadas, o aluno não se habilita ao Poster + Demo Day.
Antes de usar datas, confira o playbook atualizado (`git fetch` e leitura de `origin/main`).

No computador do autor, as evidências ficam em `TCC/ENTREGAS/PORTFOLIO/orientacoes/`, uma pasta por orientação com a data
no nome (`AAAA-MM-DD_orientacao-N/`).

## Antes: a pauta

Monte uma página curta, em português, com:

1. **O que mudou desde a orientação anterior**, com prova. Mostre os links completos dos PRs, os commits, o endereço
   publicado e a execução do CI. Mostre também a cobertura atual por camada. Use `git log`, o
   `docs/RASTREABILIDADE.md` e a página de onde parei.
2. **O que mostrar funcionando:** o fluxo a demonstrar, com os passos e os dados fictícios prontos. Se o sistema
   estiver publicado, teste o endereço antes. Se não estiver, diga isso com clareza e mostre o que existe (pipeline,
   execução local).
3. **As perguntas para o professor**, objetivas e com a opção que o autor prefere.
   - Exemplo do plano de construção: "A atualização da máquina por comando remoto do Systems Manager atende à
     proibição de deploy por SSH?"
4. **Os riscos** até a próxima orientação e o plano para cada um.
5. **Item do playbook** que cada ponto atende (fluxos, CI/CD, Sonar, observabilidade, Wiki, C4, cobertura).

Mostre a pauta ao autor antes de ele levar. Não invente avanço: o que não está pronto aparece como não pronto.

## Depois: a evidência

1. Pergunte ao autor a data, a hora, o formato (presencial ou remoto) e quem participou.
2. Pergunte também o que o professor disse, o que ficou combinado e os prazos.
3. **Não preencha nada que o autor não disser.**
4. Escreva a ata em `ata.md` na pasta da orientação, com essas respostas e a pauta usada.
5. Prepare o texto do e-mail com a ata para o professor.
6. **Não envie o e-mail.** O autor lê, ajusta e envia ele mesmo.
7. Lembre o autor de guardar na mesma pasta a prova do envio (o e-mail enviado em PDF ou imagem).
8. Se houver foto, lembre o autor de guardar a foto na mesma pasta.
9. Atualize o checklist do professor.
10. Registre a sessão com a skill `registrar-sessao`.

## Regras

- Evidência é verdade: não retroaja datas nem simule orientação que não aconteceu.
- As duas primeiras orientações aconteceram antes de 30/09/2026, mas a evidência delas ainda não está guardada
  (situação em 08/11/2026). Se o autor pedir, ajude a reunir o que existe (e-mails, mensagens, registros da época),
  sem criar documento com data falsa.
- Escreva em registro universitário, sem travessões e sem marca de IA (skill `no-ai-slop`).
