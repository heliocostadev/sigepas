# Rodar o projeto na máquina

## Hoje (núcleo de domínio)

O projeto requer Node 20 ou superior.

```bash
npm install
npm run verificar      # tipos, lint e testes
npm run test:cov       # cobertura, com o relatório em coverage/
```

## Depois do esqueleto

Esta página passa a ter, no mesmo PR do esqueleto:

- Os passos exatos para subir API, front-end e banco com Docker Compose.
- A lista de variáveis de ambiente, onde cada uma é lida no código e onde fica guardada em produção.
- Como gerar dados fictícios no formato do OLOSTECH para testar e demonstrar.
- A estrutura de pastas de `backend/` e `frontend/`.

Esses itens respondem às perguntas 4, 5 e 6 do guia da prova de autoria.
