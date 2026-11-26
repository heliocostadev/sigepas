# 0016. Porte do SIGEPAS em Apps Script: abas viram tabelas, telas mantêm a aparência e o tempo real usa SSE

- **Situação:** proposta em 26/11/2026, aguarda a revisão do Hélio. No modo acelerado da entrega de 27/11, o código
  entrou antes da revisão.
- **Redação:** IA (Claude Code), em 26/11/2026, a partir da decisão do Hélio.
- **Fontes:** decisão do Hélio em 26/11/2026 (registro de trabalho, entrada de 26/11): portar o sistema sem adaptador que
  imite o SpreadsheetApp, com tempo real entre as telas e reaproveitando o HTML, o CSS e o JavaScript das telas.

## Contexto

O setor conhece as telas do SIGEPAS em Apps Script. A entrega de 27/11/2026 pede três fluxos funcionando no endereço
público: importação do arquivo do OLOSTECH, montagem dos carros com a escala e confirmação do paciente. As telas somam
cerca de 13 mil linhas e chamam o servidor por `google.script.run`. As limitações do Apps Script (leitura de faixa,
cópia de aba, trava de script, cache de 6 horas) não valem aqui.

## Decisão

1. **Banco:** cada aba usada pelos três fluxos virou uma tabela do PostgreSQL, com migração versionada pelo Prisma. O
   carro e os passageiros ficaram em tabelas ligadas (`viagens` e `passageiros`), e o pedido ganhou a chave de oito
   colunas (ADR 0010) calculada sobre a cidade e o local como vieram no arquivo.
2. **Servidor:** cada função do `codigo.gs` usada pelas telas virou um método de serviço do NestJS, com rota própria em
   `/api/`. A resposta tem o mesmo formato que a tela já esperava. Uma trava do PostgreSQL por dia
   (`pg_advisory_xact_lock`) substitui o LockService.
3. **Telas:** o HTML das telas fica em `frontend/sistema/index.html`, o CSS em `frontend/public/sistema/telas/` e o
   JavaScript em `frontend/src/sistema/`, como módulos que o Vite empacota numa segunda página. A aparência é a de antes.
   Cada `google.script.run` virou `chamarServidor(...)`, que faz um `fetch` para a rota da API (`servidor.js`). Cada
   módulo põe no `window` as funções que o HTML chama, como no Apps Script. O React fica com a tela de entrada.
4. **Tempo real:** cada gravação manda um evento por Server-Sent Events (`/api/eventos`). As telas abertas recarregam só
   o dia ou o cadastro que mudou. A aba que gravou não recarrega.

## Alternativas consideradas

- **Reescrever as telas em React:** dias de trabalho, e o setor perderia a aparência que conhece. Fica para depois.
- **WebSocket:** a comunicação é só do servidor para a tela. O SSE resolve isso com HTTP comum e reconecta sozinho.
- **Consultar a API de tempos em tempos (polling):** atraso e carga sem necessidade.

## Consequências

- As telas usam `onclick` e `style` escritos no HTML. Por isso, a política de segurança de conteúdo de `/sistema/`
  aceita `'unsafe-inline'`. O resto da política continua fechado (nada de fora do próprio endereço). Converter os
  `onclick` para `addEventListener` é melhoria registrada.
- O JavaScript das telas entra na análise do SonarQube Cloud e na cobertura do Vitest, como o resto do código. Os testes
  das telas rodam no jsdom, com a API falsa respondendo dados fictícios, e incluem seis testes do projeto do estágio
  convertidos para o Vitest. Testar as telas também num navegador de verdade (Playwright) é melhoria registrada.
- A Remoção Interna, a Lista de Tarefas e o Painel da Gestão ficaram fora desta entrega (issues de melhoria). Pedido
  com destino em Joinville continua fora da fila de viagens externas, como no sistema atual.
- Com mais de uma API rodando, o aviso de mudança passaria pelo PostgreSQL (LISTEN/NOTIFY). Hoje a máquina roda uma só.
