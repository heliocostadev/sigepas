# Escrita dos textos do projeto

Estas regras valem para todo texto que uma pessoa lê:

- Documentos, specs, ADRs, Wiki e relatórios.
- Issues, descrições de PR, comentários e mensagens de commit.
- Instruções escritas para os subagentes e para as skills nossas.

O professor e os colegas devem perceber que o autor participa do processo. A IA não faz tudo sozinha (pedido de
08/11/2026).

## 1. Português Técnico Simplificado

Regras do padrão ASD-STE100, adaptadas ao português. Elas vêm do gem de POPs do autor e foram adotadas no TCC em
16/11/2026.

| Regra | Como aplicar | Exemplo |
|---|---|---|
| Frase curta | No máximo 20 palavras em procedimentos e 25 em descrições. Se passar, divida em duas frases | |
| Voz ativa | O sujeito faz a ação | "O CI roda os testes", e não "Os testes são rodados pelo CI" |
| Imperativo nos procedimentos | Fale direto com quem executa | "Rode `npm run verificar`" |
| Condição antes do comando | A condição abre a frase | "Se o CI falhar, abra o log" |
| Um passo por frase | Nas listas numeradas, uma instrução por item | |
| Só "deve" e "pode" | "Deve" é obrigação. "Pode" é opção | Nunca "deveria", "poderia" ou "faria" |
| Uma palavra, um significado | Escolha um verbo para cada ação e um termo para cada coisa. Não alterne sinônimos | "Pedido" em todo o texto, e não "pedido", "solicitação" e "demanda" |
| Pontuação simples | Sem ponto e vírgula e sem travessão. Use ponto, vírgula, dois-pontos ou parênteses | |
| Sem enchimento | Corte "basicamente", "então", "de certa forma", "na verdade" | |

**O que nunca muda:** blocos de código, comandos, variáveis, caminhos, mensagens de erro exatas, rótulos exatos da tela
e nomes de produtos. Nomes de teste copiados do código também ficam como estão.

**Frase curta não é frase truncada.** Cada frase tem sujeito, verbo e sentido completo.

### Como cada tipo de texto aplica as regras

| Tipo de texto | Exemplos | Regras |
|---|---|---|
| Procedimento | Como rodar o projeto, deploy, "Para ligar", POP, guias | Todas, com imperativo e um passo por frase |
| Descrição | ADR, spec, modelo de ameaça, glossário, índices | Frase de até 25 palavras, voz ativa, "deve" e "pode", um termo por coisa |
| Texto para colegas e professor | Issue, PR, comentário, relatório | As mesmas regras, junto com o registro universitário (seção 2) |
| Skills de terceiros | `.claude/skills/` de outros autores | Não mudam: ficam como vieram |

## 2. Registro universitário

- Use português correto, sem gírias.
- Use fatos concretos no lugar de adjetivos: datas, números medidos, nomes de arquivo, links completos.
- Use links completos para issue e PR (`https://github.com/heliocostadev/sigepas/issues/8`). Nunca use `#8`.
- Escreva a saudação sem vírgula, como o autor escreve: "Obrigado Vinicius."
- Não reescreva texto aprovado pelo autor. Nele, aponte só os problemas.

## 3. Padrões que denunciam texto gerado

A skill `no-ai-slop` (Peter Yang, MIT) lista os padrões em inglês. A tabela mostra os equivalentes em português.

| Padrão | Exemplo a evitar | Em vez disso |
|---|---|---|
| Contraste encenado | "Não é só um parser, é a base do sistema." | "A importação e a fila usam o parser." |
| Revelação depois de dois-pontos | "O detalhe que faz funcionar: a chave natural." | "A chave natural evita a duplicação." |
| Importância exagerada | "representa um marco", "desempenha um papel fundamental" | Diga o fato. O leitor julga a importância |
| Abertura vazia | "Vale ressaltar que", "É importante destacar que", "Cabe mencionar" | Comece pelo fato |
| Conclusão que repete | "Em suma", "Em resumo", "Dessa forma, conclui-se" | Termine no último ponto concreto |
| Elogio de efeito | "é um achado seu de verdade", "excelente pergunta" | "foi encontrado por você", ou nada |
| Fonte vaga | "especialistas apontam", "estudos mostram" | Nomeie a fonte ou retire a frase |
| Palavras infladas | "robusto", "alavancar", "potencializar", "otimizar" sem número, "solução", "jornada" | A palavra simples e o número |
| Gerúndio que finge explicar | "..., evidenciando o compromisso com a qualidade" | Diga a consequência concreta |
| Negrito espalhado e listas onde caberia uma frase | | Formato a serviço do conteúdo |

## 4. Como conferir

1. Rode `node scripts/conferir-escrita-simplificada.mjs <arquivos>`.
2. Corrija cada frase longa, ponto e vírgula, travessão e verbo proibido que o script apontar.
3. Rode a skill `no-ai-slop` no modo detectar.
4. Compare o resultado com a tabela da seção 3.
