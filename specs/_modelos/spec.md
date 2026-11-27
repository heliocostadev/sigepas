# Especificação: [NOME DO FLUXO]

- **Pasta:** `specs/NNN-nome-do-fluxo/`
- **Situação:** proposta | aprovada em DD/MM/AAAA
- **Fontes:** [documentos do sistema atual, triagens, issues, reuniões com o setor]

## 1. Objetivo

O que o fluxo entrega para quem usa, em duas ou três frases. Por que importa para o setor.

## 2. Histórias de usuário e cenários de aceite

### História 1: [título curto] (prioridade P1)

Como [papel], quero [ação], para [benefício].

- **Por que esta prioridade:** [o valor e por que vem antes]
- **Teste independente:** [como esta história pode ser testada sozinha e o que ela entrega]
- **Cenários de aceite:**
  1. **Dado** [estado inicial], **quando** [ação], **então** [resultado observável].

### História 2: [título curto] (prioridade P2)

[mesma estrutura]

## 3. Casos-limite

Liste os casos-limite **antes** de codar. Se a regra vier do sistema atual, confira os casos nos dados medidos.

- O que acontece quando [condição de borda]?

## 4. Requisitos

### 4.1 Funcionais

| Código | O sistema deve | Origem |
|---|---|---|
| RF-001 | [capacidade específica e testável] | [regra, história, decisão] |

### 4.2 Não funcionais

| Código | Requisito | Origem |
|---|---|---|
| RNF-001 | [desempenho, segurança, acessibilidade, privacidade] | [norma, medição, decisão] |

## 5. Dados

- **Entidades:** [o que representa cada uma e como se relacionam, sem detalhe de implementação]
- **Dados pessoais tratados:** [quais, por quê, quem acessa]. Se houver dado pessoal, o `revisor-de-seguranca`
  revisa a spec.

## 6. Fora do escopo

| Item | Por quê | Quando volta |
|---|---|---|

## 7. Critérios de sucesso mensuráveis

- **CS-001:** [métrica verificável, sem detalhe de tecnologia]

## 8. Suposições

- [o que foi assumido e onde será conferido]

## 9. Matriz requisito → teste

Cada requisito aparece ligado ao teste que o prova. O `verificador` confere esta tabela em todo PR do fluxo.

| Requisito | Teste | Tipo | Estado |
|---|---|---|---|
| RF-001 | `caminho/do/arquivo.test.ts` › "nome do teste" | unitário, integração ou ponta a ponta | a escrever, vermelho, verde |

## 10. Foco da revisão

Os riscos deste fluxo e o teste que prova que cada um está coberto.

| Risco | Teste que prova |
|---|---|
