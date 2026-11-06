#!/usr/bin/env bash
# 로직 테스트 실행기. Luau CLI(luau, luau-analyze)가 PATH에 있거나 LUAU_DIR로 지정되어야 한다.
# Roblox 전용 require(script.Parent.X)를 문자열 require로 바꾼 사본에서 실행한다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LUAU_DIR="${LUAU_DIR:-}"
LUAU="${LUAU_DIR:+$LUAU_DIR/}luau"
ANALYZE="${LUAU_DIR:+$LUAU_DIR/}luau-analyze"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/Shared" "$TMP/Services"
cp "$ROOT"/src/ReplicatedStorage/Shared/*.luau "$TMP/Shared/"
cp "$ROOT"/src/ServerScriptService/Services/*.luau "$TMP/Services/"
cp "$ROOT"/tests/*.luau "$TMP/"
# Roblox 엔진 전용(3D 장면)은 CLI 로 분석·실행할 수 없어 제외한다
rm -f "$TMP"/Shared/PortScene.luau "$TMP"/Shared/VoyageScene.luau "$TMP"/Shared/FieldScene.luau "$TMP"/Shared/Pose.luau "$TMP"/Shared/NavalBattle.luau

sed -i -E 's/require\(script\.Parent\.([A-Za-z0-9]+)\)/require(".\/\1")/g' "$TMP"/Shared/*.luau "$TMP"/Services/*.luau

if [ "${1:-}" = "balance" ]; then
  (cd "$TMP" && "$LUAU" balance.luau)
  exit 0
fi

if [ "${1:-}" = "catalog" ]; then
  (cd "$TMP" && "$LUAU" gen_catalog.luau)
  exit 0
fi

echo "== 타입 검사 =="
"$ANALYZE" "$TMP"/Shared/*.luau "$TMP"/Services/*.luau "$TMP/logic.test.luau"
echo "OK"

echo "== 로직 테스트 =="
(cd "$TMP" && "$LUAU" logic.test.luau)
