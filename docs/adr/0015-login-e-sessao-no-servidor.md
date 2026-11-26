# 0015. Login com sessão no servidor, senha com scrypt e dois papéis

- **Situação:** proposta em 26/11/2026, aguarda a revisão do Hélio. No modo acelerado da entrega de 27/11, o código
  entrou antes da revisão.
- **Redação:** IA (Claude Code), em 26/11/2026, a partir da decisão do Hélio.
- **Fontes:** decisão do Hélio em 26/11/2026 (registro de trabalho, entrada de 26/11): "login simples com sessão no
  servidor (cookie HttpOnly, senha com scrypt do node:crypto, papéis gestor e operador), contas criadas por comando".
  ADR 0007 (dois papéis). OWASP Password Storage Cheat Sheet e OWASP ASVS 4.0.3, capítulos 2 e 3.

## Contexto

O SIGEPAS em Apps Script usa a conta Google da Prefeitura e uma lista de e-mails na aba `bd_operadores`. O SIGEPAS em
arquitetura de servidor não tem essa conta por trás e lida com dado de paciente (LGPD). A entrega é em 27/11/2026, e o
plano completo do login (limite por conta, troca de senha pela tela, papel do banco só para a API) não cabe no prazo.

## Decisão

Sessão guardada no PostgreSQL. O navegador recebe um token aleatório de 32 bytes num cookie `__Host-`, HttpOnly, Secure,
SameSite=Strict e sem Max-Age. O banco guarda só o SHA-256 do token. A sessão vence com 2 horas sem uso ou 12 horas
desde a entrada. A senha fica como hash scrypt (N = 2^17, r = 8, p = 1) do `node:crypto`. Toda escrita exige JSON. As
contas nascem pelo comando `criar-conta` ou, na produção, pelo gestor inicial, que recebe só o hash da senha.

## Alternativas consideradas

- **JWT no navegador:** não dá para encerrar uma sessão roubada antes de vencer. Recusado.
- **Biblioteca de login (Passport, Auth.js):** mais código de terceiros para explicar na prova de autoria e nada que
  esta entrega precise. Recusado.
- **bcrypt ou Argon2:** exigem pacote nativo. O scrypt já vem no Node e está na lista da OWASP.

## Consequências

- Gestor altera cadastros. Operador usa as telas do dia. A regra está na guarda de sessão (`@SoGestor`).
- Ficam para depois da entrega, como melhoria registrada: troca de senha pela tela (ASVS 2.1.5 e 2.1.6), limite de
  tentativas por conta além do limite por IP, papel do PostgreSQL só com leitura e escrita para a API e o registro de
  tratamento dos dados de conta (LGPD). Até lá, a conformidade com o ASVS nível 1 é parcial.
