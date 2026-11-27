# Especificação: fluxo 1, do arquivo à fila do dia

- **Pasta:** `specs/001-importacao-fila/`
- **Situação:** proposta em 08/11/2026 e **aprovada em 16/11/2026**. A aprovação inclui os pontos que a
  spec propôs e as regras da triagem da Importação que ainda estavam sem decisão, conforme a recomendação.
- **Fontes:**
  - Triagem das 21 regras da Importação, de 08/11/2026 (pasta TCC, `SIGEPAS/PLANOS_DE_TRABALHO/`). A triagem traz
    as duas decisões tomadas (chave natural e dicionário inicial) e a recomendação para as demais regras.
  - Documentação da aba Importação do sistema atual (pasta TCC, `SIGEPAS/02-DOCUMENTACAO/01_IMPORTACAO.md`): dados,
    casos-limite, histórias US-IMP-01 a 06, requisitos RF-IMP e RNF-IMP.
  - Medição na exportação real de 15/09/2026 (380 linhas). A data veio sempre no formato "12 de set. de 2026", e a
    hora veio sempre em `HH:MM`, sem nenhuma hora vazia. O status veio só como "Ativo" e "Cancelado".
  - Issues 4 a 9 do repositório, abertas pelos colegas na N2 do PAC VIII.
  - ADRs [0007](../../docs/adr/0007-dois-papeis-gestor-e-operador.md),
    [0010](../../docs/adr/0010-chave-natural-do-pedido.md) e
    [0011](../../docs/adr/0011-dicionario-inicial-de-locais.md).

Os códigos `RN-NNN` são as regras numeradas do sistema atual. Entre parênteses, aparece o código da aba
(`RN-IMP-NN`), que os testes já escritos usam.

## 1. Objetivo

O operador baixa do OLOSTECH o arquivo CSV com os pedidos de transporte e envia o arquivo ao SIGEPAS. Em seguida, ele
vê a fila do dia. A fila mostra os pedidos de uma data, com cidade e local padronizados e os cancelados pela UBSF
marcados. O operador também vê as linhas que não entraram, com o motivo. Este fluxo é o começo do fluxo principal do
RFC, que continua no fluxo 2 (do pedido ao carro escalado).

Para o setor, este fluxo difere do sistema atual em três pontos. Nenhuma linha some sem aviso. A importação da tarde
não duplica a da manhã. Uma correção de telefone não devolve à fila o pedido já alocado num carro.

## 2. Histórias de usuário e cenários de aceite

### História 1: entrar no sistema (P1)

Como **operador** do setor, quero entrar com a minha conta, para que só pessoas do setor vejam os pedidos.

- **Por que esta prioridade:** o arquivo traz dados pessoais de saúde. Nada do fluxo existe sem login.
- **Proposta desta spec:** a entrada usa e-mail e senha. O `plan.md` decide o mecanismo (sessão ou token, expiração),
  e uma ADR registra a decisão.
- **Teste independente:** o teste entra com uma conta fictícia de operador e vê a tela de importação. Ele também tenta
  abrir a fila sem login e confere que a tela de entrada aparece.
- **Cenários de aceite:**
  1. **Dado** um operador cadastrado, **quando** informa e-mail e senha corretos, **então** vê a tela "Importar
     arquivo do OLOSTECH".
  2. **Dado** uma pessoa sem login, **quando** abre o endereço da fila do dia, **então** vai para a tela de entrada.
     A API responde 401.
  3. **Dado** um operador, **quando** erra a senha, **então** vê "E-mail ou senha incorretos." sem saber qual dos dois
     errou.

### História 2: enviar o arquivo e ver o resumo (P1)

Como **operador**, quero enviar o arquivo do dia e ver quantos pedidos entraram, para saber que os pedidos estão no
sistema (US-IMP-01).

- **Por que esta prioridade:** esta história é a parte central do fluxo.
- **Teste independente:** o teste envia um CSV fictício com 10 linhas válidas e confere o resumo.
- **Cenários de aceite:**
  1. **Dado** um CSV fictício no formato do OLOSTECH, separado por ponto e vírgula, **quando** importado, **então**
     aparece o resumo. Para importar, o operador escolhe o arquivo no campo "Arquivo do OLOSTECH" e aciona
     "Importar". O resumo mostra pedidos novos, pedidos atualizados, cancelados, linhas rejeitadas e locais para
     revisar.
  2. **Dado** o mesmo arquivo separado por vírgula, **quando** importado, **então** o resultado é o mesmo.
  3. **Dado** um arquivo `.xlsx` ou `.txt`, **quando** enviado, **então** o sistema não grava nada. A tela diz "Envie o
     arquivo .csv baixado do OLOSTECH."
  4. **Dado** um CSV sem as colunas "Data compromisso" e "Cidade", **quando** enviado, **então** o sistema não grava
     nada. A tela lista as colunas que faltam.

### História 3: ver as linhas que não entraram (P1)

Como **operador**, quero ver cada linha que não entrou e o motivo, para corrigir no OLOSTECH ou cadastrar à mão.

- **Por que esta prioridade:** hoje a linha sem data some em silêncio (RN-003). Esse defeito é uma das razões da
  reconstrução.
- **Teste independente:** o teste importa um CSV com uma linha sem data e confere a linha no relatório.
- **Cenários de aceite:**
  1. **Dado** um CSV em que a linha 7 não tem data do compromisso, **quando** importado, **então** as outras linhas
     entram. O relatório mostra "Linha 7: falta a data do compromisso."
  2. **Dado** uma data "2026-09-12-99" (issue 5), **quando** importada, **então** o sistema rejeita a linha. O
     motivo é "data em formato desconhecido".

### História 4: ver a fila do dia (P1)

Como **operador**, quero ver os pedidos de uma data, ordenados por cidade e hora, para começar a montar os carros.

- **Por que esta prioridade:** esta história é a entrada do fluxo 2.
- **Teste independente:** o teste importa um arquivo com pedidos de três datas e filtra por uma delas.
- **Cenários de aceite:**
  1. **Dado** um arquivo importado com pedidos de 12/11 e 13/11, **quando** o operador escolhe 12/11, **então** vê só
     os pedidos de 12/11. A fila ordena os pedidos por cidade e, dentro de cada cidade, por hora (RN-011, RN-021).
  2. **Dado** um pedido sem hora, **quando** aparece na fila, **então** a fila mostra "sem hora", nunca "00:00"
     (issue 8).
  3. **Dado** um pedido cancelado pela UBSF, **quando** o operador abre a fila, **então** o pedido fica escondido. A
     opção "Mostrar cancelados" revela o pedido marcado como cancelado. A opção só aparece quando há cancelado na data.
  4. **Dado** um pedido com status desconhecido, **quando** aparece na fila, **então** fica visível com o aviso "status
     a conferir". Um exemplo de status desconhecido é "cancelamento negado" (issue 9).

### História 5: importar de novo à tarde sem duplicar (P2)

Como **operador**, quero importar o arquivo das 13h sem duplicar os pedidos da manhã, para acompanhar os pedidos
lançados depois das 6h (RN-020).

- **Por que esta prioridade:** sem esta história, o setor só pode importar uma vez por dia.
- **Teste independente:** o teste importa o mesmo arquivo duas vezes e confere que o número de pedidos não muda.
- **Cenários de aceite:**
  1. **Dado** um arquivo já importado, **quando** é importado de novo sem mudança, **então** o resumo mostra 0 pedidos
     novos. A fila não muda.
  2. **Dado** um pedido já importado, **quando** chega de novo com outro telefone, **então** o sistema atualiza o
     pedido. Ele continua sendo o mesmo pedido (chave natural, ADR 0010).
  3. **Dado** um pedido já importado, **quando** chega com outra hora, **então** entra como pedido novo, porque o
     compromisso mudou. O sistema trata o pedido antigo como ausente (cenário 4).
  4. **Dado** um pedido importado de manhã, com data no período do arquivo da tarde, **quando** não vem nesse
     arquivo, **então** continua gravado. O pedido fica marcado "não veio na última importação", para o operador conferir.
  5. **Dado** dois pedidos idênticos nas oito colunas da chave no mesmo dia, **quando** importados, **então** entram
     como dois pedidos. O contador de ocorrência separa os dois.

### História 6: saber quais locais precisam de revisão (P2)

Como **operador**, quero ver quais pedidos têm cidade ou local que o sistema não reconhece, sem que isso trave a
importação (RN-007, US-IMP-03).

- **Por que esta prioridade:** o dicionário inicial resolve a maioria dos casos. A revisão assistida fica para
  depois.
- **Teste independente:** o teste importa um pedido com um local que não está no dicionário.
- **Cenários de aceite:**
  1. **Dado** "HOSP REGIONAL" em Joinville, **quando** o dicionário tem a grafia oficial desse local, **então** o pedido
     aparece com ela. Neste exemplo, a grafia oficial no dicionário é "HOSPITAL REGIONAL HANS DIETER SCHMIDT".
  2. **Dado** um local que não está no dicionário, **quando** importado, **então** o pedido entra na fila marcado
     "local a revisar". A grafia original fica preservada.
  3. **Dado** um pedido cancelado com local desconhecido, **quando** importado, **então** não conta como local a
     revisar (RN-017).
  4. **Dado** o mesmo nome de hospital em duas cidades, **quando** padronizado, **então** a cidade da linha nunca
     muda. O princípio é o mesmo da correção da issue 7.

## 3. Casos-limite

Os casos foram listados antes de codar. Os casos marcados com "medido" foram conferidos nos dados reais. Os demais
vêm das reviews dos colegas ou da documentação do sistema atual.

| Caso | Comportamento esperado | Origem |
|---|---|---|
| Linha sem data do compromisso | Rejeitada com motivo, demais linhas entram | RN-003 adaptada |
| Data com texto sobrando ("2026-09-12-99") | Rejeitada com motivo | Issue 5 |
| Data nos três formatos (extenso abreviado, ISO, brasileiro) | Mesmo resultado. Nos dados reais, só aparece o extenso abreviado | RN-004, medido |
| Hora vazia | "sem hora", nunca 00:00 | RN-005 adaptada e issue 8. Medido: não ocorreu |
| Hora com texto sobrando | Rejeitada com motivo | Issue 5 |
| Status "Cancelado" com variações de caixa e acento | Cancelado | RN-008 |
| Status desconhecido, vazio, "não cancelado", "cancelamento negado", "pendente" | Desconhecido, visível com aviso, nunca tratado como cancelado | Issues 6 e 9 |
| Colunas em outra ordem | Importa normalmente, porque o sistema acha as colunas pelo nome | RN-009 |
| Coluna obrigatória faltando | Arquivo recusado com a lista do que falta. Nada é gravado | RN-010 substituída |
| Separador vírgula ou ponto e vírgula | Detectado sozinho | RN-002 |
| Campo entre aspas com separador dentro ("Rua X, 10") | Lido como um campo só | Formato CSV |
| Arquivo vazio ou só com cabeçalho | Recusado: "O arquivo não tem pedidos." | |
| Arquivo maior que 5 MB | Recusado antes de ler | Proposta desta spec: cerca de 35 vezes o arquivo real medido (140 KB), RNF-IMP-01 |
| Arquivo de outra data | Importado normalmente, com o aviso de que a fila exibida é a da data escolhida | RN-019 |
| A coluna "Local embarque" traz o endereço de casa, não o embarque | Tratada como endereço residencial | Documentação, seção 3, medido em 313 linhas |
| Mesmo pedido duas vezes no arquivo | Dois pedidos, com contador de ocorrência | ADR 0010 |
| Texto que começa com `=`, `+`, `-` ou `@` | Guardado como texto. Se um dia for exportado, o texto é neutralizado | Modelo de ameaça |
| Duas importações ao mesmo tempo | Cada uma roda numa transação. O resultado final é o mesmo que em sequência | RN-012 adaptada |
| Mesmo hospital em cidades diferentes | Cidade da linha preservada | Issue 7 |

A função `sugerir`, do PR 3, e os testes dela ficam no núcleo de domínio. Entre esses testes estão os da issue 7 e o
de nomes curtos como "UPA". A função e os testes servem de base para a sugestão automática (RN-013), mas **o fluxo 1
não os usa**. No fluxo 1, o local desconhecido só fica marcado para revisão. O `padronizar` do PR 3 chama o `sugerir`
por dentro e devolve uma sugestão. O fluxo 1 ignora essa sugestão e não a grava nem a exibe.

## 4. Requisitos

### 4.1 Funcionais

| Código | O sistema deve | Origem | Triagem |
|---|---|---|---|
| RF-001 | Exigir login para qualquer tela e rota do fluxo e permitir que operador e gestor importem e vejam a fila | RN-018, ADR 0007 | Entra |
| RF-002 | Aceitar só arquivo `.csv` e detectar o separador (vírgula ou ponto e vírgula) | RN-002, RF-IMP-01, RF-IMP-02 | Entra |
| RF-003 | Validar o cabeçalho pelo nome das colunas. Se faltar coluna obrigatória, recusar o arquivo inteiro, com a lista das colunas que faltam | RN-009, RN-010 | RN-009 adaptada, RN-010 não entra |
| RF-004 | Interpretar a data do compromisso nos três formatos. Se a data faltar ou não for reconhecida, rejeitar a linha com o motivo | RN-003, RN-004, RF-IMP-03 | RN-003 adaptada, RN-004 entra |
| RF-005 | Interpretar a hora em `HH:MM` e tratar a hora vazia como "sem hora", nunca como meia-noite | RN-005, issue 8 | Adaptada |
| RF-006 | Interpretar o status pelo cabeçalho como ativo, cancelado ou desconhecido e importar o pedido cancelado com marcação, sem nunca descartá-lo | RN-008, RF-IMP-09, issues 6 e 9 | Entra |
| RF-007 | Padronizar cidade e local pelo dicionário antes de gravar. A grafia da cidade pode ser corrigida, mas nunca trocada por outra cidade | RN-006, RF-IMP-04, issue 7 | Entra |
| RF-008 | Marcar como "local a revisar" o pedido cuja cidade e local não estão no dicionário, sem impedir a importação. Pedido cancelado não conta como local a revisar | RN-007, RN-016, RN-017, RF-IMP-05 | Entra |
| RF-009 | Registrar cada envio como um lote de importação: arquivo, data e hora, quem enviou e as contagens (novos, atualizados, cancelados, rejeitados, locais a revisar, ausentes) | RN-001, RF-IMP-11 | Adaptada |
| RF-010 | Identificar o pedido pela chave natural de oito colunas com contador de ocorrência, de modo que reimportar atualize o pedido e não o duplique | RN-001, RN-020, RF-IMP-17, RF-IMP-19, ADR 0010 | Adaptada, decidida em 08/11/2026 |
| RF-011 | Se o pedido tem data no período do arquivo novo e não veio nele, marcar o pedido como "não veio na última importação", sem apagá-lo | RN-001 adaptada | Proposta desta spec |
| RF-012 | Mostrar as linhas rejeitadas de cada lote, com o número da linha no arquivo e o motivo | RN-003, RF-IMP-16 | Adaptada |
| RF-013 | Mostrar a fila de uma data escolhida, ordenada por cidade e hora, com cancelados escondidos por padrão e a opção de mostrá-los | RN-011, RN-021, RF-IMP-18, RN-025 | Entra |
| RF-014 | Importar arquivo de qualquer data, sem recusa e sem confirmação | RN-019, RF-IMP-14 | Entra |
| RF-015 | Gravar cada importação inteira numa transação: ou entra tudo o que é válido, ou nada | RN-012, RF-IMP-13 | Adaptada |
| RF-016 | Carregar o dicionário inicial de cidades e locais a partir do sistema atual, só com cidade, local e grafia | ADR 0011 | Decidida em 08/11/2026 |
| RF-017 | Guardar o acompanhante como registro próprio ligado ao pedido | Documentação, seção 6 | Entra |

### 4.2 Não funcionais

| Código | Requisito | Origem |
|---|---|---|
| RNF-001 | Importar um arquivo de 400 pedidos em menos de 5 segundos no servidor de produção | Volume medido em 19/09/2026 (387 pedidos em 140 KB, RNF-IMP-01). O limite de 5 segundos é proposta desta spec. O tempo aceitável nunca foi medido com o setor (item 1 da seção 9.3 da documentação) |
| RNF-002 | Integridade: duas importações simultâneas não corrompem a base | RNF-IMP-02 |
| RNF-003 | Rastreabilidade: cada lote guarda quem importou e quando | RNF-IMP-04 |
| RNF-004 | Privacidade: as rotas exigem login, e os logs não trazem nome, telefone, matrícula nem endereço. O arquivo enviado não é guardado depois de processado | RNF-IMP-05 e LGPD (minimização, art. 6º, III). Não guardar o arquivo é proposta desta spec: o lote guarda só o nome do arquivo e as contagens |
| RNF-005 | Acessibilidade: campo "Arquivo do OLOSTECH", botão "Importar", relatório e fila com nomes acessíveis, navegáveis por teclado, sem violação do axe | WCAG 2.1 |
| RNF-006 | Mudança no formato de origem falha de forma visível, com a lista das colunas que faltam | RNF-IMP-08 |
| RNF-007 | Interface, datas, horas e mensagens em português do Brasil, na voz da skill `voz-do-sigepas` | RNF-IMP-07 |

## 5. Dados

- **Entidades:**
  - **Pedido de transporte:** data do compromisso, cidade, hora (pode ser "sem hora"), local de destino, objetivo e
    status (ativo, cancelado, desconhecido). O pedido também guarda a quantidade de pessoas, os dados do paciente, a
    chave natural e o contador de ocorrência. Ele ainda guarda a marcação de local a revisar e a de ausente na última
    importação.
  - **Acompanhante:** ligado ao pedido.
  - **Lote de importação:** arquivo (nome), data e hora, usuário, contagens, linhas rejeitadas com o motivo.
  - **Cidade, local e grafia de origem:** o dicionário.
  - **Usuário:** nome, e-mail, hash da senha, papel (gestor ou operador).
- **Dados pessoais tratados:** nome, matrícula, data de nascimento, endereço e telefones do paciente e do
  acompanhante. Esses dados ficam ligados a destino e objetivo de saúde (dado sensível, LGPD art. 5º, II). O fluxo 2
  precisa desses dados para montar o carro e avisar o paciente. **Este repositório só usa dados fictícios.** Como o
  fluxo trata dado pessoal e login, a spec e cada PR do fluxo passam pelo `revisor-de-seguranca`.

## 6. Fora do escopo

| Item | Por quê | Quando volta |
|---|---|---|
| Sugestão automática de local por semelhança e Google Maps (RN-013) | Exige integração externa e ajuste fino | Depois de 30/11/2026 |
| Tela de revisão e manutenção do dicionário (RN-014, RN-015, US-IMP-06) | Depende da sugestão. O dicionário inicial vem do sistema atual | Depois de 30/11/2026 |
| Importar arquivo com cabeçalho fora do padrão sem padronizar (RN-010) | Substituída pela recusa com a lista de colunas faltantes | Não volta |
| Trava manual de importação (RN-012 original) | Substituída pela transação do banco | Não volta |
| Registro de quem consultou cada pedido | É desejável pela LGPD, mas não é necessário para demonstrar o fluxo. O lote já guarda quem importou | Registro de tratamento, antes do release |
| Cadastro manual de paciente | Cobre a defasagem do OLOSTECH, mas pertence à montagem do dia | Fluxo 2, se couber |
| Cadastro de contas pela tela | Uma semente cria as contas de demonstração (um gestor, um operador) | Depois de 30/11/2026 |

## 7. Critérios de sucesso mensuráveis

- **CS-001:** o sistema importa um arquivo fictício de 400 pedidos e mostra a fila do dia em menos de 5 segundos. Esse
  limite é proposta desta spec, como no RNF-001.
- **CS-002:** importar o mesmo arquivo duas vezes deixa o número de pedidos igual.
- **CS-003:** toda linha do arquivo termina em exatamente um destes lugares: pedido novo, pedido atualizado ou linha
  rejeitada com motivo. A soma confere com o número de linhas.
- **CS-004:** o teste de ponta a ponta do fluxo passa sem violação do axe.
- **CS-005:** o back-end do fluxo tem cobertura de pelo menos 75%, e cada requisito está ligado a um teste na matriz.

## 8. Suposições

As suposições abaixo são conferidas antes da tarefa do leitor de CSV. A conferência usa o arquivo fictício gerado a
partir do formato real. Quando possível, ela usa também a exportação real, sem copiar dado dela para este repositório.

- O arquivo do OLOSTECH vem em UTF-8. Se vier em outra codificação, o leitor converte o arquivo e a tarefa registra a
  medição.
- Os nomes das 27 colunas são os listados na documentação da aba Importação, seção 3.
- As colunas obrigatórias são as oito da chave natural mais o status.

## 9. Matriz requisito → teste

Os testes já escritos estão nas branches dos PRs 1 a 3 (ainda não integrados à `dev`). O nome do arquivo e do teste é
o que está no código em 08/11/2026.

| Requisito | Teste | Tipo | Estado |
|---|---|---|---|
| RF-001 | Rota da fila sem login devolve 401, e rota com papel errado devolve 403 | Integração (Supertest) | A escrever |
| RF-001 | Cenários 1 a 3 da História 1 | Ponta a ponta | A escrever |
| RF-002 | Separador vírgula e ponto e vírgula dão o mesmo resultado, e arquivo não `.csv` é recusado | Unitário e integração | A escrever |
| RF-003 | `statusPedido.test.ts` › `acharColunaStatus` › "sobrevive à mudança de ordem das colunas do arquivo de origem" e "devolve -1 quando a coluna não existe" | Unitário | Verde (PR 2) |
| RF-003 | Cabeçalho sem coluna obrigatória recusa o arquivo inteiro e lista as que faltam | Unitário | A escrever |
| RF-004 | `datas.test.ts` › "interpretarData — os três formatos que chegam no arquivo" e "interpretarData — o que não é data" | Unitário | Verde (PR 1) |
| RF-004 | Linha sem data vai para o relatório com o motivo | Unitário e ponta a ponta | A escrever |
| RF-005 | `datas.test.ts` › `interpretarHora` › "vazio devolve null e não se confunde com meia-noite (issue 8)" e "meia-noite informada continua sendo meia-noite" | Unitário | Verde (PR 1) |
| RF-005 | Fila mostra "sem hora" | Componente | A escrever |
| RF-006 | `statusPedido.test.ts` › `interpretarStatus` e `foiCanceladoPeloPosto` › "só o cancelamento responde verdadeiro" | Unitário | Verde (PR 2) |
| RF-007 | `locais.test.ts` › "padronizar — grafia já decidida" | Unitário | Verde (PR 3) |
| RF-007 | Mesmo local em duas cidades: `padronizar` usa a entrada do dicionário da cidade da linha e nunca troca por outra cidade | Unitário | A escrever |
| RF-008 | `locais.test.ts` › "padronizar — grafia nova" › "o destino original é preservado — a viagem entra mesmo sem revisão (RN-IMP-07)" | Unitário | Verde (PR 3) |
| RF-008 | Pedido cancelado não conta como local a revisar | Unitário | A escrever |
| RF-009 | Lote registra usuário e contagens | Integração (PostgreSQL) | A escrever |
| RF-010 | Reimportar o mesmo arquivo não cria pedido. Telefone diferente atualiza, hora diferente cria outro pedido e idênticos ganham contador | Unitário e integração | A escrever |
| RF-011 | Pedido ausente no arquivo novo, com data no período, fica marcado e não é apagado | Integração | A escrever |
| RF-012 | Relatório traz o número da linha e o motivo | Unitário e ponta a ponta | A escrever |
| RF-013 | Fila filtra por data, ordena por cidade e hora, esconde cancelados | Integração e componente | A escrever |
| RF-014 | Arquivo de outra data é importado sem recusa | Integração | A escrever |
| RF-015 | Erro no meio da gravação não deixa nada gravado | Integração (PostgreSQL) | A escrever |
| RF-016 | Semente carrega o dicionário e não contém dado pessoal | Integração | A escrever |
| RF-017 | Acompanhante gravado e ligado ao pedido | Integração | A escrever |
| RNF-001 | Importação de 400 pedidos fictícios abaixo de 5 segundos | Integração | A escrever |
| RNF-002 | Duas importações simultâneas do mesmo arquivo terminam com o mesmo resultado de uma só | Integração (PostgreSQL) | A escrever |
| RNF-003 | O lote guarda o usuário que importou e a data e hora (mesmo teste do RF-009) | Integração | A escrever |
| RNF-004 | Formatador de log mascara nome, telefone e matrícula. O arquivo enviado não fica gravado depois do processamento | Unitário e integração | A escrever |
| RNF-005 | Fluxo completo sem violação do axe | Ponta a ponta | A escrever |
| RNF-006 | Arquivo com coluna obrigatória faltando é recusado com a lista das colunas (mesmo teste do RF-003) | Unitário e ponta a ponta | A escrever |
| RNF-007 | Mensagens do relatório e da fila em português, com "sem hora" e "Linha N: motivo" | Componente | A escrever |

## 10. Foco da revisão

| Risco | Teste que prova |
|---|---|
| A importação da tarde duplica os pedidos da manhã | RF-010: reimportar o mesmo arquivo não cria pedido |
| Correção de telefone retira o paciente do carro | RF-010: telefone diferente atualiza o mesmo pedido |
| Linha some sem aviso | CS-003: a soma de novos, atualizados e rejeitados confere com as linhas do arquivo |
| Cancelado tratado como ativo, ou "cancelamento negado" tratado como cancelado | RF-006: testes do `interpretarStatus` (issues 6 e 9) |
| Hora vazia vira meia-noite e o carro sai na hora errada | RF-005: teste da issue 8 e o componente com "sem hora" |
| Padronização troca a cidade da linha por outra | RF-007: mesmo local em duas cidades, cidade preservada |
| Importação pela metade deixa a base inconsistente | RF-015: erro no meio não grava nada |
| Dado pessoal em log ou acessível sem login | RF-001 e RNF-004 |
| Ponto de embarque trocado pelo endereço de casa | Leitor de CSV trata a coluna "Local embarque" como endereço residencial (teste a escrever junto do RF-002) |

## 11. Situação na entrega de 27/11/2026

Esta seção foi acrescentada em 27/11/2026. As seções 1 a 10 continuam como foram aprovadas em 16/11/2026. A seção
compara a spec com o código publicado em 27/11/2026.

Para a entrega, o fluxo 1 foi portado do SIGEPAS em Apps Script, na versão 18 (entradas R-0019 e R-0021 de
[`RASTREABILIDADE.md`](../../docs/RASTREABILIDADE.md)). O porte não usou o núcleo de `src/dominio/`. As regras que rodam
no ar estão em `backend/src/regras/regras-do-setor.ts`. A importação está no método `ImportacaoService.importar`, em
`backend/src/importacao/importacao.service.ts`. Nenhum arquivo de `backend/src` nem de `frontend/src` importa
`src/dominio/`. Por isso, o sistema no ar difere da spec nos pontos da tabela 11.1. A correção desses pontos fica para
depois da entrega, sem data marcada.

### 11.1 Pontos em que o sistema no ar difere da spec

| Ponto da spec | O que o sistema no ar faz | Prova no código |
|---|---|---|
| Fontes e seção 9: regras no núcleo `src/dominio`, com os códigos `RN-IMP-NN` | As regras que rodam ficam em `backend/src/regras/regras-do-setor.ts`. Nenhuma função cita o código `RN-IMP-NN`. A maior parte cita no comentário a função do SIGEPAS em Apps Script de onde veio, como `_normalizarHora` e `_chaveDemanda`. As funções `dataParaISO`, `isoParaBR`, `escolherSeparador`, `roteiroDoTexto` e `completarComZeroAEsquerda` não citam nenhuma | Comentários de `regras-do-setor.ts`. Nenhum `import` de `src/dominio` em `backend/src` ou `frontend/src` |
| RF-004, RF-012, CS-003 e História 3, cenário 1: a linha sem data vai para o relatório, com o motivo | A linha sem data, ou com data não reconhecida, fica fora da importação. Não existe relatório de linhas rejeitadas nem contagem delas. O total do resumo conta só as linhas que entraram | `ImportacaoService.importar`: `if (!data) return;`. A interface `ResultadoDaImportacao` não tem campo de linhas rejeitadas |
| História 3, cenário 2, e caso-limite da data com texto sobrando: a linha é rejeitada | A data com texto sobrando é aceita. "2026-09-12-99" e "12/09/2026/lixo" viram 2026-09-12 | Função `dataParaISO`: as expressões da data ISO e da data brasileira não exigem o fim do texto |
| RF-005, História 4, cenário 2, e caso-limite da hora vazia: "sem hora", nunca 00:00 | A hora vazia é gravada como 00:00 | Função `normalizarHora`: `if (!hora) return '00:00';`. O teste "normaliza a hora %s para %s", de `regras-do-setor.test.ts`, espera esse resultado |
| Caso-limite da hora com texto sobrando: a linha é rejeitada | A hora com texto sobrando é aceita. "10h30h" e "10:30:59" viram 10:30. Uma hora fora da faixa, como "24:00", é gravada como veio | Função `normalizarHora` |
| RF-006, História 4, cenário 4, e caso-limite do status: ativo, cancelado ou desconhecido | O pedido tem só dois estados: cancelado ou não cancelado. É cancelado todo status que, sem acento e em maiúsculas, contém a palavra CANCELADO. Assim, "Não cancelado" entra como cancelado. "Cancelamento negado", "Cancelada", "Cancelamento" e o status vazio entram como não cancelados. Não existe o estado desconhecido nem o aviso "status a conferir" | `ImportacaoService.importar`: `normalizarTexto(...).includes('CANCELADO')`. O modelo `Pedido`, em `backend/prisma/schema.prisma`, guarda só o campo booleano `canceladoNaOrigem` |
| RF-011 e História 5, cenários 3 e 4: o pedido ausente continua gravado, com marcação | O pedido do OLOSTECH que não veio no arquivo novo é apagado, se a data dele aparece em alguma linha desse arquivo. O pedido digitado à mão continua gravado | `ImportacaoService.importar`: `transacao.pedido.deleteMany(...)`, com o filtro `digitadoAMao: false` |
| RF-003, RNF-006, História 2, cenário 4, e casos-limite das colunas: colunas achadas pelo nome, e arquivo recusado se faltar coluna | As colunas são lidas pela posição. Só a coluna do status é achada pelo nome. O cabeçalho só é conferido nas colunas Cidade e Local. Com o cabeçalho fora do padrão, o arquivo é importado sem padronizar os locais e com um aviso. O arquivo nunca é recusado por falta de coluna | Constante `COLUNA` e variável `cabecalhoNoPadrao`, em `importacao.service.ts`. O teste "cabeçalho fora do padrão importa sem padronizar e avisa", de `backend/src/fluxo-1-importacao.test.ts`, confere esse comportamento |
| RF-009, RNF-003 e cenário 1 das Histórias 2 e 5: lote com o nome do arquivo e as contagens. As contagens são novos, atualizados, rejeitados, locais a revisar e ausentes | O lote guarda a data e a hora, quem importou, as linhas que entraram e as datas do arquivo. Ele também guarda os cancelados e os locais corrigidos pelo dicionário. Ele não guarda o nome do arquivo nem as demais contagens. O resumo mostra o total de linhas, os cancelados, os locais corrigidos e a lista de locais para revisar. Ele não separa pedidos novos de pedidos atualizados | Modelo `Importacao`, em `schema.prisma`. A gravação usa `upsert`, que não informa se criou ou atualizou o pedido |
| Caso-limite do arquivo maior que 5 MB | Não existe o limite de 5 MB. A API recusa com o código 413 o corpo da requisição acima de 100 KiB (102.400 bytes). Esse é o limite padrão do leitor de JSON do Express, e `backend/src/main.ts` não o altera. Abaixo desse tamanho, a importação recusa o arquivo com mais de 5000 linhas. A exportação real medida em 19/09/2026 tem 140 KB, acima do limite de 100 KiB | Constante `MAXIMO_DE_LINHAS`, em `importacao.service.ts`. O limite de 100 KiB foi conferido em 27/11/2026 com um teste temporário no Supertest. O teste não ficou no repositório. Um corpo de 101 mil caracteres passou, e um de 110 mil voltou com 413 |
| RF-017 e seção 5: acompanhante como registro próprio, e marcações de local a revisar e de ausente guardadas no pedido | O acompanhante fica em três campos do próprio pedido: nome, trecho e telefones. O pedido não guarda a marcação de local a revisar nem a de ausente. Os locais a revisar são calculados na hora, pelo dicionário | Modelo `Pedido`: campos `acompanhante`, `trechoAcompanhante` e `telefonesAcompanhante`. Método `ImportacaoService.locaisPendentes` |
| RF-016: dicionário inicial carregado do sistema atual por uma semente | Não existe semente. Quando a variável `SEMEAR_DADOS_FICTICIOS` vale `sim`, a API grava quatro locais fictícios ao subir | `PADRONIZACOES_FICTICIAS`, em `backend/src/inicializacao/dados-ficticios.ts`, gravadas por `PrepararDadosIniciaisService` |
| Seção 6, cadastro de contas: uma semente cria um gestor e um operador de demonstração | O gestor inicial vem das variáveis `EMAIL_DO_GESTOR_INICIAL` e `HASH_DA_SENHA_DO_GESTOR_INICIAL`. As demais contas nascem pelo comando `criar-conta`, fora da tela | `backend/src/configuracao/variaveis-de-ambiente.ts` e `backend/src/comandos/criar-conta.ts` |
| História 4: a fila mostra os pedidos da data | Os pedidos com destino em Joinville e os pedidos de servidor que não pedem motorista são gravados, mas não aparecem na fila. Eles pertencem à remoção interna, que ficou fora desta entrega e é melhoria futura | Função `ehDemandaInterna`, em `regras-do-setor.ts`, usada em `backend/src/operacao/operacao.service.ts`. O teste "monta a fila do dia sem os pedidos de Joinville e com o cancelado marcado" confere esse comportamento |
| Mensagens e rótulos dos cenários | Os textos no ar são outros. Para a senha errada, a mensagem é `E-mail ou senha não conferem.`, sem dizer qual dos dois errou. A aba se chama "Importar CSV". O campo tem o nome acessível "Arquivo CSV do OLOSTECH", e o botão se chama "Processar arquivo". Para o arquivo vazio ou só com cabeçalho, a mensagem é `O arquivo CSV parece estar vazio ou inválido.` O arquivo arrastado para a área da tela que não termina em `.csv` é recusado com a mensagem `Envie um arquivo .csv`. Essa recusa acontece só no navegador. O arquivo escolhido pelo campo não tem a extensão conferida. O atributo `accept=".csv"` só filtra a janela de escolha | `backend/src/autenticacao/autenticacao.controller.ts`, `frontend/sistema/index.html`, `ImportacaoService.importar` e `frontend/src/sistema/telas/importacao.js` |

### 11.2 O que o sistema no ar faz além da spec

A seção 6 deixou fora do fluxo 1 alguns itens que o porte trouxe do SIGEPAS em Apps Script:

- A sugestão de local parecido, só entre os locais da mesma cidade, pelo dicionário e sem Google Maps (método
  `ImportacaoService.sugestoes`).
- A revisão dos locais novos logo depois da importação, que grava as decisões no dicionário (método
  `ImportacaoService.salvarDecisoes`). A tela Configurações também mantém a padronização de locais.
- O pedido digitado à mão e o cancelamento de um pedido na fila, com justificativa. O teste "inclui, edita e apaga um
  pedido digitado à mão" confere o primeiro. O teste "cancela um pedido na fila, recusa sem justificativa e desfaz o
  cancelamento" confere o segundo. Os dois ficam em `backend/src/fluxo-1-importacao.test.ts`.

Toda a logística do fluxo 1 é feita por todos do setor, operador e gestor, como pede o RF-001. Só os cadastros e as
configurações exigem o papel de gestor. Essas rotas levam a marca `@SoGestor`, em
`backend/src/cadastros/cadastros.controller.ts`.

### 11.3 Defeitos já registrados como issues

As issues abaixo foram abertas pelos colegas na N2 do PAC VIII. Elas foram fechadas com a correção no núcleo
`src/dominio` (PRs 1 e 2, entrada R-0001 de `RASTREABILIDADE.md`). O back-end no ar não usa esse núcleo e repete
três desses defeitos.

| Issue | Como o defeito aparece no sistema no ar |
|---|---|
| [Issue 5](https://github.com/heliocostadev/sigepas/issues/5) | A data e a hora com texto sobrando são aceitas |
| [Issue 6](https://github.com/heliocostadev/sigepas/issues/6) | "Não cancelado" entra como cancelado. Não existe o estado desconhecido nem o aviso "status a conferir". Por isso, o status não reconhecido, como "Cancelamento negado", entra como não cancelado |
| [Issue 8](https://github.com/heliocostadev/sigepas/issues/8) | A hora vazia é gravada como 00:00 |

A [issue 9](https://github.com/heliocostadev/sigepas/issues/9) não se repete. Ela tratou de "Cancelamento negado" e
"Cancelamento pendente" classificados como cancelados. No sistema no ar, esses textos não contêm a palavra CANCELADO
e entram como não cancelados. A [issue 7](https://github.com/heliocostadev/sigepas/issues/7) também não se repete,
porque `ImportacaoService.sugestoes` só compara locais da mesma cidade. A
[issue 4](https://github.com/heliocostadev/sigepas/issues/4) tratou de código repetido, sem efeito no comportamento.
Os demais pontos da tabela 11.1 não têm issue. A correção de todos fica para depois da entrega.

### 11.4 Testes que provam o sistema no ar

As linhas aprovadas da matriz da seção 9 não foram alteradas. Os testes de `src/dominio` citados nela provam o núcleo
anterior, que o back-end não usa. A tabela abaixo aponta os testes que exercitam o
código publicado. Alguns deles confirmam um comportamento diferente do requisito, como mostra a tabela 11.1.

| Requisito | Teste do sistema no ar | Tipo |
|---|---|---|
| RF-001 | `backend/src/autenticacao/autenticacao.test.ts` › "protege as rotas: sem sessão responde 401, com sessão diz quem é" e "só o gestor altera cadastros" | Integração (Supertest e PostgreSQL) |
| RF-002 | `backend/src/regras/regras-do-setor.test.ts` › "lê CSV com aspas, aspas dobradas, quebra de linha no campo e BOM" | Unitário |
| RF-002 | `frontend/src/sistema/teste/importacao.test.ts` › "arrastar um arquivo que não é CSV é recusado; arrastar o CSV escolhe o arquivo" | Tela (jsdom) |
| RF-002 | `backend/src/fluxo-1-importacao.test.ts` › "recusa arquivo vazio ou só com cabeçalho" | Integração (Supertest e PostgreSQL) |
| RF-003 | `fluxo-1-importacao.test.ts` › "cabeçalho fora do padrão importa sem padronizar e avisa" | Integração |
| RF-004 | `regras-do-setor.test.ts` › "lê a data %s como %s" | Unitário |
| RF-005 | `regras-do-setor.test.ts` › "normaliza a hora %s para %s" | Unitário |
| RF-006 | `fluxo-1-importacao.test.ts` › "importa o arquivo, conta os cancelados e lista os locais desconhecidos" | Integração |
| RF-007 | `fluxo-1-importacao.test.ts` › "sugere o local já padronizado da mesma cidade e grava a decisão no dicionário" e "a próxima importação já sai padronizada" | Integração |
| RF-008 | `importacao.test.ts` › "processa o arquivo, mostra o resumo e abre a padronização dos locais novos" | Tela (jsdom) |
| RF-010 | `fluxo-1-importacao.test.ts` › "reimportar o mesmo arquivo não duplica pedidos" e `regras-do-setor.test.ts` › "dá a mesma chave ao mesmo compromisso e outra ao gêmeo" | Integração e unitário |
| RF-013 | `fluxo-1-importacao.test.ts` › "monta a fila do dia sem os pedidos de Joinville e com o cancelado marcado" | Integração |
| RF-013 | `frontend/src/sistema/teste/viagens-externas-fila.test.ts` › "abre o dia e desenha a fila por cidade e horário, sem o pedido cancelado" | Tela (jsdom) |
| RF-013 | `viagens-externas-fila.test.ts` › "sem nenhum cancelado no dia, o botão some e o filtro desliga sozinho" | Tela (jsdom) |
| RNF-004 | `backend/src/registro/formatadores-de-log.test.ts` › "não grava nenhum cabeçalho nem o endereço do cliente, que é dado pessoal pela LGPD" | Unitário |

Os requisitos RF-009, RF-011, RF-012, RF-014, RF-015, RF-016, RF-017, RNF-001, RNF-002, RNF-003, RNF-005, RNF-006 e
RNF-007 não têm teste no sistema no ar. Os testes de integração rodam com o PostgreSQL de teste do CI. Sem a variável
`DATABASE_URL_DE_TESTE`, eles são pulados.
