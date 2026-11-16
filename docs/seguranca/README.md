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
