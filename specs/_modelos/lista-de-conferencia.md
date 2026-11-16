# Lista de conferência da spec: [NOME DO FLUXO]

Esta lista confere a **qualidade dos requisitos**, não a implementação. Quem revisa a spec marca os itens. `[x]` quer
dizer que o critério foi conferido e está atendido.

## Completude

- [ ] Cada história tem cenário de aceite no formato dado, quando, então.
- [ ] Os casos-limite foram listados e, quando a regra vem do sistema atual, conferidos nos dados medidos.
- [ ] Cada requisito tem origem (regra, história, decisão, norma).
- [ ] O que fica fora do escopo está escrito, com o porquê.

## Clareza

- [ ] Nenhum requisito é vago ("funciona bem", "é rápido"): cada um tem como ser verificado.
- [ ] A spec usa corretamente os termos do setor: UBSF, OLOSTECH, TFD, remoção interna e paciente "alocado".
- [ ] O documento não tem pergunta em aberto.

## Testabilidade

- [ ] Cada requisito tem uma linha na matriz requisito → teste.
- [ ] Cada risco do "Foco da revisão" tem o teste que o prova.
- [ ] Há pelo menos um caminho feliz e um caminho de erro por história.

## Playbook e normas

- [ ] Os dados pessoais estão identificados, com a necessidade de cada um (LGPD).
- [ ] A autorização por papel está definida para cada ação (gestor, operador).
- [ ] Acessibilidade: a spec define os nomes dos campos e dos botões (WCAG 2.1).
- [ ] O fluxo pode ser demonstrado só com dados fictícios.
