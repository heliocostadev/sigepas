# SIGEPAS

**Sistema de Gestão de Transportes de Pacientes e Servidores**

Reconstrução, em arquitetura de servidor, de um sistema de **agendamento de transporte
sanitário** hoje em produção no setor de transportes de uma secretaria municipal de saúde.

O sistema atual foi construído durante estágio e é usado todos os dias para levar pacientes a
consultas, exames e tratamentos em outras cidades. Ele funciona — e é justamente por funcionar
que serve de especificação: cada regra deste repositório foi validada na operação real antes de
virar código.

> **Contexto acadêmico:** projeto de TCC / PAC Extensionista VIII — Engenharia de Software.
> Este repositório é público e **não contém nenhum dado de paciente**: só regras, testes e
> documentação. Os dados reais vivem em ambiente fechado da instituição e nunca saem de lá.

---

## O problema

O setor recebe todo dia uma lista de solicitações de transporte e precisa transformá-la em
carros: quem vai em qual veículo, com qual motorista, saindo a que horas, com que roteiro.
Hoje isso depende de planilha, digitação repetida e memória das pessoas. Os efeitos são
concretos:

- a mesma cidade aparece escrita de cinco formas diferentes, e o roteiro se perde;
- um pedido cancelado pelo posto não chega a quem já montou o carro, e o motorista sai para
  buscar quem cancelou;
- a escala do dia não sobrevive a nenhuma mudança de última hora.

## O que está sendo construído

Um núcleo de domínio em TypeScript — **regra de negócio pura, sem framework e sem banco** —
que depois receberá uma API e uma interface web.

A ordem é proposital. O valor deste sistema não está na tela nem no banco: está nas regras, que
são muitas, cheias de exceção e aprendidas em operação. Elas vêm primeiro, com teste, e o resto
se apoia nelas.

### Estado atual

| Área | Situação |
|---|---|
| Normalização de texto e chave de destino | ✅ implementado e testado |
| Datas e horas do arquivo de importação | 🔜 em revisão |
| Status do pedido (cancelado pelo posto) | 🔜 em revisão |
| Padronização de cidades e locais | 🔜 em revisão |
| Montagem de carro, lotação e roteiro | ⏳ próximo |
| API (HTTP) e persistência | ⏳ depois do domínio |

## Rodando

Requer Node 20 ou superior.

```bash
npm install
npm run verificar
```

`verificar` roda os três portões que também rodam no CI: tipos, lint e testes.

| Comando | O que faz |
|---|---|
| `npm test` | roda os testes uma vez |
| `npm run test:watch` | roda os testes a cada alteração |
| `npm run test:cov` | cobertura (mínimo de 75% no domínio) |
| `npm run typecheck` | checagem de tipos, sem gerar build |
| `npm run lint` | análise estática |

## Como o repositório funciona

- **`main`** — o que está estável. Ninguém escreve direto aqui.
- **`dev`** — integração. Todo Pull Request aponta para cá.
- **`feat/...`, `fix/...`, `docs/...`** — uma branch por assunto, curta.

Todo Pull Request roda tipos, lint e testes antes de poder ser aceito, e precisa de pelo menos
uma revisão. Detalhes em [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentação

A pasta [`docs/`](docs/) descreve o sistema que está em produção — o que cada tela faz, quais
são as regras de negócio numeradas e, principalmente, **o que não deve ser reproduzido aqui**.
É de lá que sai cada linha de código deste repositório.

- [`docs/abas/01_IMPORTACAO.md`](docs/abas/01_IMPORTACAO.md) — entrada das solicitações do dia.

## Licença

MIT — veja [LICENSE](LICENSE).
