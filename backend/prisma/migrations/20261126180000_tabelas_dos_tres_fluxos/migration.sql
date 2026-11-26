-- CreateSchema

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('GESTOR', 'OPERADOR');

-- CreateTable
CREATE TABLE "contas" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "hash_da_senha" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "conta_id" INTEGER NOT NULL,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_uso_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "cidade_original" TEXT NOT NULL DEFAULT '',
    "local_original" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "hora" TEXT NOT NULL DEFAULT '',
    "local_destino" TEXT NOT NULL DEFAULT '',
    "tipo_veiculo" TEXT NOT NULL DEFAULT '',
    "restricoes" TEXT NOT NULL DEFAULT '',
    "objetivo" TEXT NOT NULL DEFAULT '',
    "bairro" TEXT NOT NULL DEFAULT '',
    "endereco_residencial" TEXT NOT NULL DEFAULT '',
    "quantidade_pessoas" INTEGER NOT NULL DEFAULT 1,
    "tipo_atendimento" TEXT NOT NULL DEFAULT '',
    "matricula" TEXT NOT NULL DEFAULT '',
    "nome_paciente" TEXT NOT NULL DEFAULT '',
    "trecho" TEXT NOT NULL DEFAULT '',
    "data_nascimento" TEXT NOT NULL DEFAULT '',
    "faixa_etaria" TEXT NOT NULL DEFAULT '',
    "logradouro" TEXT NOT NULL DEFAULT '',
    "numero" TEXT NOT NULL DEFAULT '',
    "telefones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acompanhante" TEXT NOT NULL DEFAULT '',
    "trecho_acompanhante" TEXT NOT NULL DEFAULT '',
    "telefones_acompanhante" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cancelado_na_origem" BOOLEAN NOT NULL DEFAULT false,
    "digitado_a_mao" BOOLEAN NOT NULL DEFAULT false,
    "endereco_embarque" TEXT NOT NULL DEFAULT '',
    "ordem_na_importacao" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancelamentos_na_fila" (
    "chave" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "quem" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "operador" TEXT NOT NULL,
    "cancelado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancelamentos_na_fila_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "viagens" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipo_veiculo" TEXT NOT NULL DEFAULT '',
    "motorista" TEXT NOT NULL DEFAULT '',
    "dois_motoristas" BOOLEAN NOT NULL DEFAULT false,
    "motorista_2" TEXT NOT NULL DEFAULT '',
    "hora_saida" TEXT NOT NULL DEFAULT '',
    "local_embarque" TEXT NOT NULL DEFAULT '',
    "destino" TEXT NOT NULL DEFAULT '',
    "assentos_bloqueados" INTEGER NOT NULL DEFAULT 0,
    "roteiro" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aviso" TEXT NOT NULL DEFAULT '',
    "aviso_registro" TEXT NOT NULL DEFAULT '',
    "aviso_a_enviar" BOOLEAN NOT NULL DEFAULT false,
    "eh_carga_do_lacen" BOOLEAN NOT NULL DEFAULT false,
    "motorista_fixado" TEXT NOT NULL DEFAULT '',
    "motorista_2_fixado" TEXT NOT NULL DEFAULT '',
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passageiros" (
    "id" SERIAL NOT NULL,
    "viagem_id" TEXT NOT NULL,
    "chave_do_pedido" TEXT NOT NULL DEFAULT '',
    "matricula" TEXT NOT NULL DEFAULT '',
    "nome" TEXT NOT NULL DEFAULT '',
    "nascimento" TEXT NOT NULL DEFAULT '',
    "telefones" TEXT NOT NULL DEFAULT '',
    "bairro" TEXT NOT NULL DEFAULT '',
    "endereco_embarque" TEXT NOT NULL DEFAULT '',
    "acompanhante" TEXT NOT NULL DEFAULT '',
    "telefones_acomp" TEXT NOT NULL DEFAULT '',
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "trecho" TEXT NOT NULL DEFAULT '',
    "objetivo" TEXT NOT NULL DEFAULT '',
    "local" TEXT NOT NULL DEFAULT '',
    "observacao" TEXT NOT NULL DEFAULT '',
    "hora" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "tipo_solicitado" TEXT NOT NULL DEFAULT '',
    "endereco_residencia" TEXT NOT NULL DEFAULT '',
    "servidor_nome" TEXT NOT NULL DEFAULT '',
    "servidor_matricula" TEXT NOT NULL DEFAULT '',
    "status_confirmacao" TEXT NOT NULL DEFAULT 'Pendente',
    "hora_ligacao" TEXT NOT NULL DEFAULT '',
    "quem_atendeu" TEXT NOT NULL DEFAULT '',
    "atendente" TEXT NOT NULL DEFAULT '',
    "obs_ligacao" TEXT NOT NULL DEFAULT '',
    "hora_saida_na_ligacao" TEXT NOT NULL DEFAULT '',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passageiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "placa" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL,
    "propriedade" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "motivo" TEXT NOT NULL DEFAULT '',
    "cor_de_fundo" TEXT NOT NULL DEFAULT '',
    "observacao" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("placa")
);

-- CreateTable
CREATE TABLE "motoristas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "vinculo" TEXT NOT NULL,
    "placa_vinculada" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "motivo" TEXT NOT NULL DEFAULT '',
    "observacao" TEXT NOT NULL DEFAULT '',
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locais_de_embarque" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "motivo" TEXT NOT NULL DEFAULT '',
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "locais_de_embarque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dias_nao_uteis" (
    "data" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "bloco" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "dias_nao_uteis_pkey" PRIMARY KEY ("data")
);

-- CreateTable
CREATE TABLE "escala_do_dia" (
    "id" SERIAL NOT NULL,
    "data" TEXT NOT NULL,
    "motorista" TEXT NOT NULL,
    "vinculo" TEXT NOT NULL DEFAULT '',
    "condicao" TEXT NOT NULL DEFAULT 'Disponível',
    "motivo_ausencia" TEXT NOT NULL DEFAULT '',
    "posicao" INTEGER NOT NULL DEFAULT 999,
    "observacao" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "escala_do_dia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frota_do_dia" (
    "id" SERIAL NOT NULL,
    "data" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "propriedade" TEXT NOT NULL DEFAULT '',
    "condicao" TEXT NOT NULL DEFAULT 'Disponível',
    "motivo" TEXT NOT NULL DEFAULT '',
    "observacao" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "frota_do_dia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "padronizacoes_de_locais" (
    "chave" TEXT NOT NULL,
    "cidade_original" TEXT NOT NULL,
    "local_original" TEXT NOT NULL,
    "cidade_padrao" TEXT NOT NULL,
    "local_padrao" TEXT NOT NULL,
    "decidido_por" TEXT NOT NULL DEFAULT '',
    "decidido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "padronizacoes_de_locais_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "importacoes" (
    "id" SERIAL NOT NULL,
    "feita_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operador" TEXT NOT NULL,
    "linhas" INTEGER NOT NULL,
    "canceladas" INTEGER NOT NULL,
    "corrigidas" INTEGER NOT NULL,
    "datas" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "importacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contas_email_key" ON "contas"("email");

-- CreateIndex
CREATE INDEX "sessoes_conta_id_idx" ON "sessoes"("conta_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_chave_key" ON "pedidos"("chave");

-- CreateIndex
CREATE INDEX "pedidos_data_idx" ON "pedidos"("data");

-- CreateIndex
CREATE INDEX "cancelamentos_na_fila_data_idx" ON "cancelamentos_na_fila"("data");

-- CreateIndex
CREATE INDEX "viagens_data_idx" ON "viagens"("data");

-- CreateIndex
CREATE INDEX "passageiros_viagem_id_idx" ON "passageiros"("viagem_id");

-- CreateIndex
CREATE INDEX "passageiros_chave_do_pedido_idx" ON "passageiros"("chave_do_pedido");

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_nome_key" ON "motoristas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "locais_de_embarque_nome_key" ON "locais_de_embarque"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "escala_do_dia_data_motorista_key" ON "escala_do_dia"("data", "motorista");

-- CreateIndex
CREATE UNIQUE INDEX "frota_do_dia_data_placa_key" ON "frota_do_dia"("data", "placa");

-- AddForeignKey
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passageiros" ADD CONSTRAINT "passageiros_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

