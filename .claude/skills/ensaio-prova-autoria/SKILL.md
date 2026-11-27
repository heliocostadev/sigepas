---
name: ensaio-prova-autoria
description: Ensaia com o autor a prova de autoria do Portfólio, fazendo as perguntas do guia do professor sobre o próprio código do SIGEPAS, uma por vez, sem dar a resposta, e registrando o que ele ainda não domina. Use quando o autor pedir ensaio, simulado ou treino da prova, antes de cada orientação e na semana de 23/11 a 29/11. Serve como conferência do que já foi construído, nunca para decidir o que construir.
---

# Ensaio da prova de autoria

## O que é a prova

A prova é um encontro individual, até 30/11/2026. Nele, o professor pergunta sobre o projeto, pede para mostrar o
código e pode pedir uma alteração ao vivo. A prova é eliminatória. A segunda tentativa vai até 03/12/2026.

O guia oficial é `documentation/guia-prova-de-autoria.md` do playbook do professor. No computador do autor, o playbook
fica em `TCC/SIGEPAS/03-REFERENCIAS/playbook-professor/`. Antes de ensaiar, confira se o guia mudou: rode `git fetch`
e leia `origin/main`.

**A régua é o playbook, não a prova.** O ensaio confere se o que está sendo construído cobre os pontos básicos. Ele
nunca justifica cortar etapa, teste ou segurança.

## Como conduzir

1. Pergunte qual bloco ensaiar, ou siga a ordem do guia:
   - arquitetura e decisões
   - configuração e ambiente
   - dados
   - autenticação e segurança
   - regras de negócio e fluxo
   - integrações
   - testes e qualidade
   - CI/CD e deploy
   - processo e histórico
   - mudança ao vivo
2. Antes de cada pergunta, leia o código para saber a resposta certa.
3. **Faça uma pergunta por vez**, adaptada ao SIGEPAS real. Exemplos:
   - "Por onde passa o envio do CSV do OLOSTECH, do clique até a tabela no PostgreSQL?"
   - "Onde a rota de importação é bloqueada para quem não está logado? E o que o operador não pode fazer que o gestor
     pode?"
   - "Mostre a última migração do Prisma e explique o que ela faz."
   - "Se a chave natural deixar de usar a matrícula, qual teste falha? Mude e mostre."
   - "Se o deploy de hoje quebrar a fila, como você volta para a versão anterior?"
4. **Não dê a resposta.**
5. Peça que o autor responda navegando no próprio código, sem a busca global da IDE.
6. Depois da resposta, diga o que está certo, o que faltou e onde está no código, com o caminho clicável.
7. Nas perguntas "por quê?" e "e se…?", aprofunde como o professor faz na prova.
8. **Mudança ao vivo:** proponha uma alteração pequena, como um campo novo numa entidade até a tela ou uma validação
   nova.
9. Acompanhe o autor enquanto ele faz a alteração e roda os testes no fim.
10. Não faça a alteração por ele.

## Ao terminar

- Liste as perguntas em que ele foi bem, as que respondeu em parte e as que não soube.
- Para cada lacuna, indique o que estudar e em que arquivo. Se a lacuna revelar código que nem a spec justifica,
  avise o autor. Esse código é um caso para o `verificador`.
- Confira o checklist do guia:
  - O projeto roda a partir do `README.md`.
  - Cada dependência tem explicação.
  - A cobertura é de 75% no back e 25% no front, com o relatório gerado.
- Proponha registrar o resultado com a skill `registrar-sessao`.

Escreva em português, em registro universitário, sem travessões.
