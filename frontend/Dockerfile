# Imagem das telas: o Vite gera os arquivos e o Nginx os serve. Rode a partir da raiz do repositório:
# docker build -f frontend/Dockerfile .

FROM node:24-alpine AS construcao
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace frontend --include-workspace-root=false
COPY frontend frontend
RUN npm run build --workspace frontend

# Imagem oficial do Nginx que roda sem permissão de administrador.
FROM nginxinc/nginx-unprivileged:1.29-alpine AS execucao
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construcao /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
