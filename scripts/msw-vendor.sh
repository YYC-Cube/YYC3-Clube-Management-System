#!/usr/bin/env bash
# 再生 __tests__/vendor/*.cjs：将 msw 拦截链依赖的三个仅 ESM 包转译为 CJS。
# 触发时机：msw / @mswjs/interceptors / rettime / until-async / @open-draft/deferred-promise 任一升版。
# 用法：bash scripts/msw-vendor.sh
set -euo pipefail
cd "$(dirname "$0")/.."

ESBUILD=$(ls -d node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild | head -1)

pnpm exec "$ESBUILD" \
  node_modules/.pnpm/rettime@0.11.11/node_modules/rettime/build/index.mjs \
  --bundle --format=cjs --platform=node --outfile=__tests__/vendor/rettime.cjs

pnpm exec "$ESBUILD" \
  node_modules/.pnpm/until-async@3.0.2/node_modules/until-async/lib/index.js \
  --bundle --format=cjs --platform=node --outfile=__tests__/vendor/until-async.cjs

pnpm exec "$ESBUILD" \
  node_modules/.pnpm/@open-draft+deferred-promise@2.2.0/node_modules/@open-draft/deferred-promise/build/index.js \
  --bundle --format=cjs --platform=node --outfile=__tests__/vendor/deferred-promise.cjs

echo "vendor regenerated. 声明：三文件为真实包的转译产物，勿手改。"
