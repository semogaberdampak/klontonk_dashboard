# Build dashboard (Nuxt 4) DI DALAM Podman, lalu sajikan hasil statisnya dengan nginx.
#   podman compose up -d --build
# Pilih mode lewat argumen BUILD_SCRIPT: "build" (terhubung ke Supabase) atau "build:demo" (data contoh).

# ---- Tahap 1: build ----
FROM public.ecr.aws/docker/library/node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG BUILD_SCRIPT=build
RUN npm run ${BUILD_SCRIPT}

# ---- Tahap 2: sajikan ----
FROM public.ecr.aws/nginx/nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.output/public /usr/share/nginx/html
EXPOSE 80
