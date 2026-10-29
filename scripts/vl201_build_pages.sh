#!/usr/bin/env bash
# ============================================================================
# vl201_build_pages.sh — Pages-экспорт VetLearn AI (Task 201)
#
# Реконструкция пайплайна Task 158 (scripts/vl158_build_pages.sh жил в
# песочнице и был потерян при реснапе — урок Task 198: рецепт сборки
# принадлежит репозиторию). Рецепт по ворклогу Task 158:
#   копия исходников → output:'export' + basePath:/vetlearn-web +
#   флаг офлайн-моста NEXT_PUBLIC_OFFLINE_API_BRIDGE=1 → выпилить
#   api/middleware/proxy/sw (на Pages мертвы; SW-регистрация выключена
#   в копии — консоль чистая) → манифест под basePath →
#   _not-found.html → 404.html → .nojekyll.
#
# Использование:  bash scripts/vl201_build_pages.sh [выходной-каталог]
#   (по умолчанию /tmp/vl-pages/out). Каталог = готовый корень gh-pages.
# ============================================================================
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-/tmp/vl-pages/out}"
WORK="$(dirname "$OUT")/src"

echo "== VetLearn Pages export: источник $SRC"
rm -rf "$(dirname "$OUT")"; mkdir -p "$(dirname "$OUT")"

# 1) копия исходников (без git-хвостов)
cp -r "$SRC" "$WORK"
rm -rf "$WORK/.git" "$WORK/node_modules" "$WORK/.next" "$WORK/dev.log" "$WORK/server.log"

# 2) серверные куски на Pages мертвы — выпиливаем из КОПИИ
rm -rf "$WORK/src/app/api" "$WORK/src/proxy.ts" "$WORK/public/sw.js"

# 3) SW-регистрация выключается в копии (консоль чистая, sw.js нет)
python3 - "$WORK/src/app/layout.tsx" << 'PYEOF'
import sys, re
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
s = s.replace('import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";\n', '')
s = re.sub(r'[ \t]*<ServiceWorkerRegistration />\n', '', s)
open(p, 'w', encoding='utf-8').write(s)
print('  layout.tsx: SW-регистрация снята')
PYEOF

# 4) манифест под basePath (до сборки — public/ копируется в экспорт как есть)
python3 - "$WORK/public/manifest.json" << 'PYEOF'
import sys, json
p = sys.argv[1]
m = json.load(open(p, encoding='utf-8'))
for k in ('start_url', 'scope'):
    if k in m and not m[k].startswith('/vetlearn-web'):
        m[k] = '/vetlearn-web' + (m[k] if m[k] != '/' else '/')
for ic in m.get('icons', []):
    if ic.get('src', '').startswith('/'):
        ic['src'] = '/vetlearn-web' + ic['src']
json.dump(m, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('  manifest.json: basePath применён')
PYEOF

# 5) экспорт-конфиг поверх standalone (headers/CSPO — серверные вещи,
#    в статике бессмысленны; images.unoptimized обязателен для export)
cat > "$WORK/next.config.ts" << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/vetlearn-web",
  images: { unoptimized: true },
  turbopack: { root: __dirname },
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,
};

export default nextConfig;
EOF

# 6) сборка (флаг моста — единственная разница серверной и Pages-версий);
#    build-скрипт пакета — standalone-пайплайн с cp в .next/standalone,
#    для export он не нужен и падает: в копии подменяем на чистый next build
cd "$WORK"
python3 - << 'PYEOF'
import json
p = 'package.json'
d = json.load(open(p, encoding='utf-8'))
d['scripts']['build'] = 'next build'
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('  package.json: build -> next build (export-режим)')
PYEOF
NEXT_PUBLIC_OFFLINE_API_BRIDGE=1 bun install --frozen-lockfile --silent
NEXT_PUBLIC_OFFLINE_API_BRIDGE=1 bun run build

# 7) экспорт → корень Pages + традиционные фиксы
mkdir -p "$OUT"
cp -r "$WORK/out/." "$OUT/"
cp "$WORK/public/terms.html" "$OUT/terms.html" 2>/dev/null || true
[ -f "$OUT/_not-found.html" ] && cp "$OUT/_not-found.html" "$OUT/404.html"
touch "$OUT/.nojekyll"

echo "== готово: $OUT"
ls "$OUT" | head -20
