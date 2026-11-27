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
| [`modelo-de-ameaca.md`](modelo-de-ameaca.md) | Primeira versão em 08/11/2026, a revisar pelo autor do projeto antes do fluxo 1 e a cada fluxo |
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
| `X-Forwarded-Proto $scheme` no Nginx informava `http` se o HTTPS terminasse fora do contêiner `web` | Corrigido no PR do deploy: o Nginx repassa o protocolo informado pelo Caddy (`map` em `frontend/nginx.conf`) | Feito, junto com o HTTPS |
| JSON malformado é recusado pelo leitor do corpo antes do log, da métrica e do limite de requisições | O custo de cada pedido tem teto (100 KB no Express e 1 MB no Nginx) | No fluxo 1, antes da rota de envio do arquivo, com teste |
| Dado pessoal no caminho da URL vai para os logs | Nenhuma rota tem dado pessoal no caminho | Regra do fluxo 1: o caminho leva só identificador interno |
| Exceção do Prisma pode trazer os valores dos argumentos na mensagem | Ainda não há rota que use o banco | No fluxo 1: um filtro global de exceção grava só a classe e o código do erro |
| Exceção de versão: `overrides` força a `effect` 3.22.5 no `package.json` da raiz | O Prisma 7.10.1 fixa a `effect` 3.20.0, que tem um ReDoS de severidade alta (GHSA-7589-6fvf-x4pw, corrigido na 3.22.1). A `effect` só existe na linha de comando do Prisma, fora da imagem de produção. O `npm ls` marca a versão como "invalid", por uma limitação dele com `overrides` em workspaces | Remover o `overrides` quando uma versão do Prisma trouxer a `effect` corrigida |
| Caddy roda como root dentro do contêiner, padrão da imagem oficial | Ele é o único serviço exposto à internet, sem painel de administração (`admin off`) e sem volume do sistema | Antes do release: avaliar rodar como usuário comum, com a permissão só de abrir as portas 80 e 443 |
| Estado do Terraform só no computador local | O estado não tem senha, porque as senhas são geradas na própria EC2 | Antes do release: guardar o estado num bucket S3 criptografado |
| `ssm:SendCommand` com `AWS-RunShellScript` equivale a root na máquina | O papel só alcança esta máquina, e só o ambiente `producao` da `main` assume o papel | Antes do release: documento próprio do Systems Manager que aceite só um SHA da `main` |
| O papel de deploy lê a saída de qualquer comando do Systems Manager da conta | A ação não aceita recurso específico. Nenhum comando com segredo passa pelo Run Command | Ressalva aceita. Segredo só pela sessão do Session Manager |
