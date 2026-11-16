---
name: voz-do-sigepas
description: O jeito de falar do SIGEPAS em arquitetura de servidor. Como escrever qualquer texto que o operador ou o gestor do setor de transportes vão ler na tela, em mensagem de erro, relatório de importação, guia do motorista ou e-mail do sistema. Use sempre que for escrever ou revisar texto de interface, mesmo um rótulo de botão, e sempre que o Hélio corrigir uma frase (a correção vira regra aqui). Manda sobre a better-writing e a impeccable quando discordarem.
---

# Voz do SIGEPAS

Esta skill é uma adaptação, de 08/11/2026, da skill `voz-do-servidor`, do projeto de estágio do Hélio. Aquele projeto
é o sistema de retirada e devolução de veículos da Saúde de Joinville. A adaptação manteve os princípios gerais e as
correções do Hélio que valem para qualquer tela. O leitor e o vocabulário mudaram. A skill aguarda a revisão do Hélio.

## Quem lê

Os leitores são o **operador** e o **gestor** do setor de transportes da Secretaria de Saúde. Eles usam o computador
do setor várias horas por dia. Eles conhecem o trabalho melhor do que o sistema. Eles sabem o que é TFD, conhecem as
UBSF pelo nome e montam carros para Curitiba e Florianópolis todos os dias. Eles precisam entender **numa olhada** o
que aconteceu e o que fazer agora. Eles montam a escala do dia enquanto o telefone toca.

O sistema soa como **um colega do setor, cordial e direto**, nunca como um robô nem como um aplicativo de startup.

A skill `better-writing` dá a técnica (verbo no botão, erro perto do campo, tela vazia que aponta o próximo passo).
Esta skill dá a nossa voz. Quando as duas discordarem, vale esta.

## Princípios

1. **Fale com a pessoa: "você".** Não use "o usuário", "o operador deverá" nem "prezado(a)".
2. **Escreva uma ideia por frase, com frases curtas.** Se a frase precisa de vírgula demais, divida em duas.
3. **Use as palavras do setor:** pedido, viagem, carro, motorista, escala, fila do dia, UBSF, OLOSTECH, TFD, remoção
   interna, guia. O paciente é **alocado** num carro, nunca "atendido". Não use sessão, token, requisição, erro 500,
   payload, timeout nem registro inválido.
4. **O botão diz o que acontece**, começando por verbo: "Importar arquivo", "Alocar no carro", "Gerar a guia". Não
   use "OK", "Enviar", "Prosseguir" nem "Clique aqui".
5. **Erro = o que aconteceu + o que fazer agora.** Não culpe a pessoa nem peça desculpas exageradas.
6. **Escreva com calma e certeza.** Não use exclamação em erro, emoji nem piada.
7. **Não marque gênero** quando não for preciso. Em texto sobre outra pessoa, não use artigo antes do nome. Nesse
   texto, também não use palavra que dependa do gênero. Exemplo: "alocado por Ana Souza", não "pela Ana".
8. **Verdade antes de simpatia.** Não diga "importado" antes de o servidor confirmar. Não prometa aviso que o sistema
   não manda.
9. **Mostre na janela só o necessário:** título, rótulo, campo e botões. Mantenha a frase que evita um erro grave ("A
   exclusão não pode ser desfeita."). Corte a frase que descreve o futuro.
10. Se a janela seguinte já explica, **não ponha texto explicativo em volta do botão**.
11. **Não pergunte o que ninguém vai usar.** Antes de criar um campo, pergunte quem lê a resposta e para quê.

## Formatos

| O que | Como | Exemplo |
|---|---|---|
| Hora | `8h05`, `15h10` | "saída às 5h30" |
| Data | `17/10`, com ano só se não for o atual. Use "hoje" e "amanhã" quando couber | "viagens de amanhã" |
| Pessoas | número e palavra, no singular ou no plural | "1 pessoa", "3 pessoas, contando acompanhantes" |
| Carro | modelo e placa em três grupos | "SPIN · AAA 0A 00" (placa fictícia) |
| Pedido sem hora | "sem hora", nunca `00:00` | "Joinville → Curitiba, sem hora" |
| Linha do arquivo | número da linha do arquivo, como o operador vê no Excel | "Linha 7: falta a data do compromisso." |
| Setor | "Setor de Transportes", com S maiúsculo | |

## Em vez de… escreva…

| Em vez de | Escreva |
|---|---|
| Ops! Algo deu errado :( | Não conseguimos concluir agora. Tente de novo em instantes. |
| Erro: sessão expirada | Entre de novo para continuar. |
| Upload realizado com sucesso! | Arquivo importado: 312 pedidos, 4 cancelados, 2 locais para revisar. |
| Registro inválido na linha 7 | Linha 7: falta a data do compromisso. Ela não entrou na fila. |
| Arquivo inválido | Este arquivo não tem as colunas do OLOSTECH. Faltam: Data compromisso, Cidade. |
| Nenhum registro encontrado | Nenhum pedido para 12/11. Importe o arquivo do OLOSTECH para começar. |
| Tem certeza que deseja continuar? | (diga no botão o que vai acontecer: "Retirar do carro") |
| Paciente atendido | Paciente alocado no carro das 5h30. |
| Processando… | Importando o arquivo… |
| Posto | UBSF |

## Antes de entregar um texto

- Leia em voz alta: soa como alguém do setor falando com um colega?
- Dá para entender em três segundos, com o telefone tocando?
- O botão diz o que acontece? O erro diz o que fazer agora?
- Tem alguma palavra da coluna "Em vez de"?

## Correções do Hélio

Quando o Hélio corrigir um texto deste sistema, registre aqui a regra que a correção ensina. Use o formato data ·
antes → depois · por quê. Aplique a regra dali em diante.

- 08/11/2026 · hora vazia exibida como `00:00` → **"sem hora"** · defeito apontado na review do PR 1 (issue 8): hora
  vazia não é meia-noite.
