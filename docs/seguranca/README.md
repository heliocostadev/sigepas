# Segurança e privacidade

## Normas que valem (playbook do professor, `documentation/normas.md`)

- **LGPD** (Lei 13.709/2018), norma Core. O SIGEPAS trata dado pessoal sensível: dado de saúde ligado a pessoa
  identificada (art. 5º, II).
- **OWASP Top 10**, complementar, como lista de conferência do `revisor-de-seguranca`.
- **WCAG 2.1**, norma Core, conferida nos testes de ponta a ponta com axe.
- **Licenças de terceiros**, norma Core: cada arquivo trazido de fora tem autor e licença em
  [`.claude/skills/README.md`](../../.claude/skills/README.md) ou no `README.md`.

## Documentos

| Documento | Situação |
|---|---|
| [`modelo-de-ameaca.md`](modelo-de-ameaca.md) | Primeira versão em 08/11/2026, a revisar pelo Hélio antes do fluxo 1 e a cada fluxo |
| Registro de tratamento de dados pessoais (base legal, dados mínimos, retenção, quem acessa) | Antes do release |

## Como a segurança é conferida

| Quando | Quem ou o quê |
|---|---|
| A cada commit feito pela IA (Bash ou PowerShell) | Hook `bloquear-segredo-no-commit`, que reconhece padrões conhecidos de chave e de arquivo. O gitleaks no CI cobre o resto |
| Todo PR | gitleaks, CodeQL, revisão de dependências, npm audit |
| PR que toque dado pessoal, login, permissão, configuração ou deploy | `revisor-de-seguranca`, com a skill `security-audit` no modo de orientação. O `/security-review` serve como segunda opinião |
| Antes da orientação 5 e do release | Auditoria completa com a `security-audit` (relatório fora do repositório) e varredura OWASP ZAP no endereço publicado |

## Regra do repositório público

Nenhum dado real de paciente entra em código, teste, captura, log ou mensagem. Achado de segurança não é publicado antes
da correção.

## Ressalvas registradas no esqueleto (17/11/2026)

Pontos de risco baixo apontados pelo `revisor-de-seguranca`, com o momento em que cada um é resolvido.

| Ponto | Situação | Quando resolver |
|---|---|---|
| Imagens Docker e GitHub Actions sem fixação por digest ou por SHA | O Dependabot cobre as imagens e as ações | Antes do release |
| `X-Forwarded-Proto $scheme` no Nginx informa `http` se o HTTPS terminar fora do contêiner `web` | Ainda não há login nem cookie | No deploy, junto com o HTTPS |
| JSON malformado é recusado pelo leitor do corpo antes do log, da métrica e do limite de requisições | O custo de cada pedido tem teto (100 KB no Express e 1 MB no Nginx) | No fluxo 1, antes da rota de envio do arquivo, com teste |
| Dado pessoal no caminho da URL vai para os logs | Nenhuma rota tem dado pessoal no caminho | Regra do fluxo 1: o caminho leva só identificador interno |
| Exceção do Prisma pode trazer os valores dos argumentos na mensagem | Ainda não há rota que use o banco | No fluxo 1: um filtro global de exceção grava só a classe e o código do erro |
