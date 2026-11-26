# Imagem da API. Rode a partir da raiz do repositório: docker build -f backend/Dockerfile .
# O contexto é a raiz porque o projeto usa workspaces do npm, com um package-lock.json só.

FROM node:26-alpine AS construcao
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
# --ignore-scripts: nenhum pacote roda script próprio durante a instalação (regra docker:S6505 do SonarQube Cloud).
RUN npm ci --workspace backend --include-workspace-root=false --ignore-scripts
COPY backend backend
RUN npm run prisma:gerar --workspace backend && npm run build --workspace backend

# Imagem que aplica as migrações do banco antes da API subir (serviço migracao do Compose de produção). Ela tem a linha
# de comando do Prisma e o schema-engine, que a imagem da API não leva. Publicada com a tag <sha>-migracao.
FROM construcao AS migracao
WORKDIR /app/backend
USER node
CMD ["/app/node_modules/.bin/prisma", "migrate", "deploy"]

FROM node:26-alpine AS execucao
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
# Só as dependências de produção. O lockfile marca a linha de comando do Prisma e o TypeScript como "devOptional"
# (de desenvolvimento e opcionais ao mesmo tempo). O npm só deixa esses pacotes de fora quando as duas categorias
# são omitidas, por isso o comando usa --omit=dev e --omit=optional.
RUN npm ci --workspace backend --include-workspace-root=false --omit=dev --omit=optional --ignore-scripts \
    && npm cache clean --force
COPY --from=construcao /app/backend/dist backend/dist
# A aplicação não roda como administrador do contêiner.
USER node
# 3000: API pública, atrás do Nginx. 9464: métricas, só na rede interna do Docker Compose.
EXPOSE 3000 9464
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/saude || exit 1
CMD ["node", "backend/dist/main.js"]
