# Build dashboard (Flutter web, MVVM) DI DALAM Podman, lalu sajikan hasil statisnya dengan nginx.
#   podman compose up -d --build
# Argumen build (lihat compose.yaml):
#   DEMO_MODE=true            -> data contoh tanpa Supabase dan tanpa login
#   SUPABASE_URL / SUPABASE_KEY -> opsional, menimpa project Supabase bawaan (kunci PUBLISHABLE saja)

# ---- Tahap 1: build ----
FROM ghcr.io/cirruslabs/flutter:stable AS build
WORKDIR /app

COPY pubspec.yaml ./
RUN flutter pub get

COPY . .
ARG DEMO_MODE=false
ARG SUPABASE_URL=
ARG SUPABASE_KEY=
# Nilai kosong -> memakai bawaan di lib/core/config.dart.
RUN flutter pub get \
 && flutter build web --release --no-wasm-dry-run \
      --dart-define=DEMO_MODE=${DEMO_MODE} \
      $( [ -n "${SUPABASE_URL}" ] && echo --dart-define=SUPABASE_URL=${SUPABASE_URL} ) \
      $( [ -n "${SUPABASE_KEY}" ] && echo --dart-define=SUPABASE_KEY=${SUPABASE_KEY} )

# ---- Tahap 2: sajikan ----
FROM public.ecr.aws/nginx/nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build/web /usr/share/nginx/html
EXPOSE 80
