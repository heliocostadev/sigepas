# 0007. Dois papéis: gestor e operador

- **Situação:** aceita em 08/11/2026, por decisão do Hélio.
- **Redação:** proposta pela IA em 08/11/2026, a partir do registro de trabalho e dos planos da pasta TCC. O Hélio
  revisa o texto e o ajusta com as palavras dele.
- **Fontes:** registro de trabalho de 08/11/2026.

## Contexto

O guia da prova pergunta onde uma rota é bloqueada para quem não tem permissão. No setor, todos importam o arquivo do
dia (regra RN-018 do sistema atual), mas cadastros e escala são da gestão.

## Decisão

O sistema tem dois papéis. O **operador** importa, monta carros e registra remoções e ligações. O **gestor** faz tudo o
que o operador faz, mais cadastros, escala e contas. O servidor decide a autorização, por um guard do NestJS.

## Alternativas consideradas

- **Um papel só:** não demonstra a autorização, que o guia da prova pergunta.
- **Papéis por unidade ou por motorista:** ficam fora do escopo dos três fluxos.

## Consequências

- Cada rota declara o papel exigido. Cada rota tem um teste que usa o papel errado e espera a resposta 403.
