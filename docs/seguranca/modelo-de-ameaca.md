# Modelo de ameaça

**Situação: primeira versão escrita em 08/11/2026, antes de qualquer código do servidor. Revisado em 27/11/2026 para
descrever o sistema no ar, depois do release v1.0.0.** O modelo deve ser revisado a cada fluxo novo. A ideia é do
Leonardo (repositório [code-lab-project](https://github.com/leonsnw/code-lab-project)): escrever as ameaças primeiro e
ligar cada defesa à ameaça que ela combate.

## 1. Que dados existem

O arquivo do OLOSTECH tem 27 colunas. Classificação pela LGPD:

| Grupo | Colunas | Classe |
|---|---|---|
| Identificação do paciente | Nome, matrícula, data de nascimento, faixa etária | Dado pessoal |
| Contato e endereço | Logradouro, número, bairro, três telefones do paciente, três do acompanhante, nome do acompanhante | Dado pessoal |
| Saúde | Local de destino, objetivo, tipo de atendimento, restrições, tipo de veículo | **Dado pessoal sensível** quando ligado à pessoa (art. 5º, II) |
| Logística | Data, hora, cidade, quantidade de pessoas, trechos, status do pedido | Dado pessoal quando ligado à pessoa |

Também existem as contas de gestor e operador (nome, e-mail, hash de senha). O cadastro de motoristas guarda o nome e o
WhatsApp de cada motorista, que também são dados pessoais. Existem ainda o dicionário de locais (sem dado pessoal) e os
lotes de importação (quem importou e quando).

## 2. Quem acessa

Premissa do setor, registrada em 27/11/2026 (R-0022 em [`RASTREABILIDADE.md`](../RASTREABILIDADE.md)): quem trabalha
no setor de transportes está apto a fazer toda a logística das viagens pedidas. Por isso, o operador e o gestor fazem
toda a logística do dia. No sistema no ar, só as rotas que alteram os cadastros e as configurações exigem o papel de
gestor. Essas rotas levam a marca `@SoGestor` em `backend/src/cadastros/cadastros.controller.ts`.

| Ator | Pode |
|---|---|
| Operador | Toda a logística do dia. Importar o arquivo do OLOSTECH, ver a fila e montar os carros. Montar a escala, marcar a confirmação do paciente e gerar as guias. Na revisão de locais da importação, gravar a decisão sobre um local pendente no dicionário de locais (`POST /api/importacao/salvar-decisoes-de-locais`, sem `@SoGestor`). Pode ler os cadastros e as configurações. A remoção interna fica fora desta entrega e é melhoria futura |
| Gestor | Tudo o que o operador faz. Só o gestor usa as seis rotas com `@SoGestor`, todas na tela Configurações. Elas salvam motoristas, carros e locais de embarque e inativam juntos o carro e o motorista vinculado. Também vinculam o carro ao motorista, salvam o calendário e editam ou excluem uma padronização de locais |
| Conta nova | Não nasce pela tela. O comando `criar-conta` cria a conta no servidor. O gestor inicial nasce na subida da API, a partir do e-mail e do hash da senha guardados nas variáveis de ambiente |
| Visitante sem login | Só a tela de entrada |
| GitHub Actions | Publicar imagens e mandar a máquina atualizar, por OIDC, sem chave guardada |

## 3. O que pode dar errado e a defesa de cada ameaça

A coluna "Defesa" diz o que está no ar em 27/11/2026. O que ainda não existe aparece como pendente.

| Ameaça | Exemplo | Defesa | Onde fica a prova |
|---|---|---|---|
| Dado real no repositório público | Captura de tela ou teste com nome de paciente | Regra no `CLAUDE.md`, dados fictícios, revisão do `verificador` | Revisão de cada PR |
| Segredo no git | Chave da AWS num commit | Hook `bloquear-segredo-no-commit`, gitleaks no CI, OIDC no deploy | `.claude/hooks/`, `seguranca.yml` |
| Acesso sem login | Abrir a fila pelo endereço direto da API | Guarda de sessão global no NestJS (`GuardaDeSessao`). Rota pública só com a marca `@Publica`, usada apenas em entrar, sair e na rota de saúde | Teste em `autenticacao.test.ts`: sem sessão, ou com sessão que não existe no banco, a resposta é 401 |
| Operador fazendo o que é do gestor | Alterar cadastro | A guarda de sessão recusa com 403 o operador nas rotas marcadas com `@SoGestor`. O servidor decide, e a tela não é a única barreira | Teste em `autenticacao.test.ts` na rota `/cadastros/salvar`. As outras cinco rotas com `@SoGestor` ainda não têm teste com o papel errado |
| Requisição forjada de outro site (CSRF) | Formulário de outro site que manda uma escrita com o cookie da sessão | Cookie `__Host-sigepas_sessao` com `HttpOnly`, `Secure` e `SameSite=Strict`. Toda escrita precisa vir em JSON, e o resto recebe 403 | Teste em `autenticacao.test.ts`: escrita enviada como formulário recebe 403 |
| Senha fraca ou exposta | Senha em texto no banco | Hash scrypt do `node:crypto` (N = 2^17, r = 8, p = 1, [ADR 0015](../adr/0015-login-e-sessao-no-servidor.md)). Senha de 12 a 128 caracteres. No máximo 10 tentativas de login por minuto | `backend/src/autenticacao/senha.ts` e os testes da autenticação |
| Injeção de SQL | Texto do CSV montado numa consulta | Consultas pelo Prisma. As duas consultas em SQL escrito à mão usam o modelo com parâmetros do Prisma (`$queryRaw` e `$executeRaw`), sem texto montado | Revisão de segurança, CodeQL |
| XSS | Nome de local com `<script>` exibido na tela | As telas dos três fluxos vieram do SIGEPAS em Apps Script ([ADR 0016](../adr/0016-porte-das-telas-e-tempo-real.md)) e montam o HTML com `innerHTML`. Cada tela passa o dado por uma função de escape própria antes de exibir, por exemplo `escGuia`, `dmEsc`, `escEsc`, `envEsc`, `escAba3`, `escaparHtmlLocais` e `dsEsc`. A tela de entrada, em React, escapa o texto por padrão, e `dangerouslySetInnerHTML` com dado de usuário é proibido | Testes das telas com texto que tem `<`, `>`, `&` e aspas, por exemplo `confirmacao-e-guias-imagem.test.ts` (`escGuia`) e `principal.test.ts` (`dsEsc`) |
| Arquivo malicioso | CSV gigante ou com fórmula (`=HYPERLINK(...)`) | O servidor recusa arquivo com mais de 5000 linhas, e a API aceita corpo de até 100 KB. A extensão `.csv` é conferida só no navegador. O conteúdo é gravado como texto. O sistema não exporta CSV: as guias e a escala saem como imagem PNG | `MAXIMO_DE_LINHAS` em `importacao.service.ts`. Ainda não há teste do limite de linhas |
| Dado pessoal em log | Erro que imprime a linha inteira do CSV | Log com lista de campos permitidos: só o identificador da requisição, o método, o caminho sem a consulta e o status. O IP do cliente fica fora. O log do Nginx também grava o caminho sem a consulta | `backend/src/registro/formatadores-de-log.test.ts` |
| Abuso da API | Muitas requisições de login | Limite de requisições por cliente, helmet, CORS fechado | `backend/src/aplicacao.test.ts` |
| Máquina exposta | Porta do banco aberta na internet | O Terraform só abre as portas 80 e 443. O banco fica só na rede interna do Compose. Não há SSH | Revisão do Terraform pelo `revisor-de-seguranca` |
| Perda de dados | Falha da máquina | Pendente: a cópia diária para o S3 com teste de restauração ainda não existe. Hoje o volume do banco fica só no disco da máquina | [`docs/deploy/`](../deploy/README.md), seção "O que ainda falta" |
| Dependência com falha conhecida | Biblioteca vulnerável | Dependabot, npm audit, revisão de dependências | `seguranca.yml` |
| Instrução escondida em dado de ferramenta | Documentação do Context7 ou página lida pela IA mandando agir | Conteúdo de ferramenta é dado, não instrução (`CLAUDE.md`) | Regra dos subagentes |

## 4. O que fica para o registro de tratamento (pendente depois do release v1.0.0)

- Base legal do tratamento pela prefeitura e o papel do SIGEPAS em arquitetura de servidor, que é acadêmico e usa só
  dados fictícios.
- Dados mínimos: quais das 27 colunas o fluxo precisa.
- Retenção: por quanto tempo guardar pedidos e lotes (item 3 da lista "a medir ou decidir com o setor" da
  documentação da Importação).
- Registro de quem consultou o quê.
