# C4, nível 3: componentes da API

## Visão geral

A API é um único processo NestJS. Cada assunto do setor tem um par controlador e serviço: o controlador recebe a
rota, e o serviço faz a regra e grava no banco. As regras puras, sem banco e sem framework, ficam num módulo separado e
são testadas sozinhas. A guarda de sessão roda antes de toda rota e barra quem não entrou.

## Diagrama

```mermaid
C4Component
    title Diagrama de componentes da API do SIGEPAS

    Container(telas, "Telas no navegador", "React 19, JavaScript", "Chamam a API e escutam o canal de eventos.")
    ContainerDb(banco, "Banco de dados", "PostgreSQL 16", "Tabelas dos três fluxos, contas e sessões.")
    Container(prometheus, "Coletor de métricas", "Prometheus 3.7", "Lê as métricas.")

    Container_Boundary(api, "API (NestJS 12)") {
        Component(guarda, "Guarda de sessão", "NestJS Guard", "Confere o cookie em toda rota, menos nas marcadas como públicas. Barra o operador nas rotas só do gestor.")
        Component(autenticacao, "Autenticação", "Controlador e serviço", "Entrar, sair e dizer quem está na sessão. Senha conferida com scrypt.")
        Component(importacao, "Importação", "Controlador e serviço", "Lê o CSV do OLOSTECH, padroniza os locais e grava os pedidos. Fluxo 1.")
        Component(operacao, "Operação do dia", "Controlador e serviço", "Fila do dia, montagem e edição dos carros, cancelamento, troca e confirmação. Fluxos 2 e 3.")
        Component(escala, "Escala", "Controlador e serviço", "Formação do dia, motoristas nos carros e escala do período. Fluxo 2.")
        Component(cadastros, "Cadastros", "Controlador e serviço", "Motoristas, veículos, locais de embarque, calendário e padronizações.")
        Component(regras, "Regras do setor", "TypeScript puro", "Normalização de texto, chave do pedido, leitura do CSV, datas e horas.")
        Component(eventos, "Tempo real", "Serviço e controlador SSE", "Publica um aviso a cada gravação e mantém o canal aberto com cada tela.")
        Component(prisma, "Acesso ao banco", "Prisma 7, adaptador pg", "Cliente gerado a partir do schema.prisma.")
        Component(metricas, "Métricas", "@prometheus-io/client", "Conta as requisições por rota e código e serve na porta 9464.")
    }

    Rel(telas, guarda, "Envia cada chamada com o cookie da sessão para", "JSON sobre HTTPS")
    Rel(guarda, autenticacao, "Confere a sessão por meio de", "chamada interna")
    Rel(guarda, operacao, "Libera a chamada da Viagens Externas e da Confirmação para", "chamada interna")
    Rel(importacao, regras, "Normaliza locais e calcula a chave do pedido com", "chamada interna")
    Rel(operacao, regras, "Converte datas e horas com", "chamada interna")
    Rel(operacao, eventos, "Avisa que um dia mudou por meio de", "chamada interna")
    Rel(eventos, telas, "Entrega o aviso do dia que mudou para", "Server-Sent Events")
    Rel(importacao, prisma, "Grava pedidos e padronizações por meio de", "chamada interna")
    Rel(operacao, prisma, "Grava viagens e passageiros por meio de", "chamada interna")
    Rel(prisma, banco, "Executa as consultas em", "SQL")
    Rel(prometheus, metricas, "Lê o contador de requisições de", "HTTP 9464")

    UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="1")
```

O diagrama mostra as relações de Importação e Operação, que são o caminho dos três fluxos. Escala e Cadastros seguem
o mesmo desenho: passam pela guarda, usam as regras do setor, gravam pelo Prisma e avisam o Tempo real.

## Legenda

| Forma | Significado |
|---|---|
| Caixa azul-clara | Componente dentro da API |
| Caixa azul | Outro contêiner do SIGEPAS |
| Cilindro | Banco de dados |
| Seta | Uma direção, com a intenção |

Siglas: SSE (Server-Sent Events), CSV (arquivo de valores separados).

## Elementos

| Nome | Tipo | Tecnologia | Responsabilidade | Pasta |
|---|---|---|---|---|
| Guarda de sessão | Componente | NestJS Guard global | Barra rota sem sessão e rota de gestor | `backend/src/autenticacao/` |
| Autenticação | Componente | NestJS, `node:crypto` | `entrar`, `sair`, `eu` | `backend/src/autenticacao/` |
| Importação | Componente | NestJS | CSV do OLOSTECH até a fila | `backend/src/importacao/` |
| Operação do dia | Componente | NestJS | Carros, passageiros e confirmação | `backend/src/operacao/` |
| Escala | Componente | NestJS | Motoristas nos carros | `backend/src/escala/` |
| Cadastros | Componente | NestJS | Motoristas, veículos, locais, calendário | `backend/src/cadastros/` |
| Regras do setor | Componente | TypeScript sem framework | Regras puras, testadas sem banco | `backend/src/regras/` |
| Tempo real | Componente | RxJS e `@Sse` do NestJS | Canal `GET /eventos` | `backend/src/tempo-real/` |
| Acesso ao banco | Componente | Prisma 7 | Cliente do PostgreSQL | `backend/src/banco-de-dados/` |
| Métricas | Componente | `@prometheus-io/client` | `sigepas_requisicoes_http_total` | `backend/src/metricas/` |

## Relações principais

| De | Para | Intenção | Meio |
|---|---|---|---|
| Telas | Guarda de sessão | Envia cada chamada com o cookie | JSON, corpo `{ "argumentos": [...] }` |
| Importação | Regras do setor | Normaliza locais e calcula a chave do pedido | Chamada de função |
| Operação do dia | Tempo real | Avisa que um dia mudou | Chamada de função |
| Tempo real | Telas | Entrega o aviso | Server-Sent Events |
| Acesso ao banco | PostgreSQL | Executa as consultas | SQL |

## Decisões que aparecem neste nível

- **Uma rota por ação.** Cada função do `codigo.gs` virou uma rota `POST /<assunto>/<ação>`, com os mesmos argumentos.
  As telas trazidas não precisaram mudar a forma das chamadas.
- **Trava por dia no banco.** Duas pessoas montando carros no mesmo dia não se atropelam: o serviço pede ao PostgreSQL
  uma trava do dia (`pg_advisory_xact_lock`) dentro da transação. Ela substitui o `LockService` do Apps Script.
- **Regras puras separadas.** O módulo de regras não importa NestJS nem Prisma. Por isso, os testes dele rodam sem
  banco e cobrem os casos-limite medidos nos dados do setor.
- **Proteção contra CSRF pela exigência de JSON.** As rotas que gravam só aceitam `Content-Type: application/json`, que
  um formulário de outro site não consegue enviar sem a permissão do navegador. O cookie também é `SameSite=Strict`.

## Premissas

- Os nomes de componente seguem as pastas do código em 26/11/2026. Se uma pasta mudar de nome, este documento muda
  no mesmo PR.

## Outros níveis

- Nível 1: [contexto](01-contexto.md)
- Nível 2: [contêineres](02-conteineres.md)
- Diagrama de apoio: [implantação na AWS](04-implantacao.md)
