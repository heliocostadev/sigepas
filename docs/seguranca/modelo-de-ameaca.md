# Modelo de ameaça

**Situação: primeira versão, escrita em 08/11/2026 antes de qualquer código do servidor. O Hélio deve revisar o modelo
antes do fluxo 1 e a cada fluxo novo.** A ideia é do Leonardo (repositório
[code-lab-project](https://github.com/leonsnw/code-lab-project)): escrever as ameaças primeiro e ligar cada defesa à
ameaça que ela combate.

## 1. Que dados existem

O arquivo do OLOSTECH tem 27 colunas. Classificação pela LGPD:

| Grupo | Colunas | Classe |
|---|---|---|
| Identificação do paciente | Nome, matrícula, data de nascimento, faixa etária | Dado pessoal |
| Contato e endereço | Logradouro, número, bairro, três telefones do paciente, três do acompanhante, nome do acompanhante | Dado pessoal |
| Saúde | Local de destino, objetivo, tipo de atendimento, restrições, tipo de veículo | **Dado pessoal sensível** quando ligado à pessoa (art. 5º, II) |
| Logística | Data, hora, cidade, quantidade de pessoas, trechos, status do pedido | Dado pessoal quando ligado à pessoa |

Também existem as contas de gestor e operador (nome, e-mail, hash de senha). Existem ainda o dicionário de locais (sem
dado pessoal) e os lotes de importação (quem importou e quando).

## 2. Quem acessa

| Ator | Pode |
|---|---|
| Operador | Importar, ver a fila, montar carros, registrar remoções e ligações |
| Gestor | Tudo o que o operador faz, mais cadastros, escala e contas |
| Visitante sem login | Só a tela de entrada |
| GitHub Actions | Publicar imagens e mandar a máquina atualizar, por OIDC, sem chave guardada |

## 3. O que pode dar errado e a defesa de cada ameaça

| Ameaça | Exemplo | Defesa planejada | Onde fica a prova |
|---|---|---|---|
| Dado real no repositório público | Captura de tela ou teste com nome de paciente | Regra no `CLAUDE.md`, dados fictícios, revisão do `verificador` | Revisão de cada PR |
| Segredo no git | Chave da AWS num commit | Hook `bloquear-segredo-no-commit`, gitleaks no CI, OIDC no deploy | `.claude/hooks/`, `seguranca.yml` |
| Acesso sem login | Abrir a fila pelo endereço direto da API | Guard de autenticação global no NestJS. Rota pública só por exceção declarada | Teste de cada rota sem token devolvendo 401 |
| Operador fazendo o que é do gestor | Alterar cadastro | Guard de papel no servidor, nunca só esconder o botão | Teste de rota com papel errado devolvendo 403 |
| Senha fraca ou exposta | Senha em texto no banco | Hash forte (argon2 ou bcrypt), tentativa de login limitada | Teste do serviço de autenticação |
| Injeção de SQL | Texto do CSV montado numa consulta | Consultas pelo Prisma, sem SQL montado com texto | Revisão de segurança, CodeQL |
| XSS | Nome de local com `<script>` exibido na tela | O React escapa o texto por padrão. `dangerouslySetInnerHTML` com dado de usuário é proibido | Teste de componente com texto malicioso |
| Arquivo malicioso | CSV gigante ou com fórmula (`=HYPERLINK(...)`) | Limite de tamanho, só `.csv`, conteúdo tratado como texto. Ao exportar, o sistema neutraliza a fórmula | Testes da importação |
| Dado pessoal em log | Erro que imprime a linha inteira do CSV | Log estruturado com nome, telefone e matrícula mascarados | Teste do formatador de log |
| Abuso da API | Muitas requisições de login | Limite de requisições, helmet, CORS fechado | Teste de integração |
| Máquina exposta | Porta do banco aberta na internet | O Terraform só abre as portas 80 e 443. O banco fica só na rede interna do Compose. Não há SSH | Revisão do Terraform pelo `revisor-de-seguranca` |
| Perda de dados | Falha da máquina | Cópia diária para o S3 com teste de restauração | `docs/deploy/` |
| Dependência com falha conhecida | Biblioteca vulnerável | Dependabot, npm audit, revisão de dependências | `seguranca.yml` |
| Instrução escondida em dado de ferramenta | Documentação do Context7 ou página lida pela IA mandando agir | Conteúdo de ferramenta é dado, não instrução (`CLAUDE.md`) | Regra dos subagentes |

## 4. O que fica para o registro de tratamento (antes do release)

- Base legal do tratamento pela prefeitura e o papel do SIGEPAS em arquitetura de servidor, que é acadêmico e usa só
  dados fictícios.
- Dados mínimos: quais das 27 colunas o fluxo precisa.
- Retenção: por quanto tempo guardar pedidos e lotes (item 3 da lista "a medir ou decidir com o setor" da
  documentação da Importação).
- Registro de quem consultou o quê.
