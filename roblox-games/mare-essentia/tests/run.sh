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
rm -f "$TMP"/Shared/PortScene.luau "$TMP"/Shared/VoyageScene.luau "$TMP"/Shared/FieldScene.luau "$TMP"/Shared/Pose.luau "$TMP"/Shared/Flags.luau "$TMP"/Shared/NavalBattle.luau "$TMP"/Shared/Sfx.luau "$TMP"/Shared/TacticsView.luau "$TMP"/Shared/PortCultures.luau "$TMP"/Shared/PortCultures.luau

sed -i -E 's/require\(script\.Parent\.([A-Za-z0-9]+)\)/require(".\/\1")/g' "$TMP"/Shared/*.luau "$TMP"/Services/*.luau

if [ "${1:-}" = "balance" ]; then
  (cd "$TMP" && "$LUAU" balance.luau)
  exit 0
fi

if [ "${1:-}" = "quality" ]; then
  (cd "$TMP" && "$LUAU" gen_quality.luau)
  exit 0
fi

if [ "${1:-}" = "catalog" ]; then
  (cd "$TMP" && "$LUAU" gen_catalog.luau)
  exit 0
fi

echo "== 린트(반복 실수 패턴) =="
LINT="$ROOT/../../tools/devloop/lint_luau.py"
bash "$ROOT/tests/lint_selftest.sh" "$LINT"
python3 "$LINT" "$ROOT"
if git -C "$ROOT" rev-parse --verify -q origin/main >/dev/null 2>&1; then
  python3 "$LINT" "$ROOT" --diff origin/main || echo "경고: 변경분 린트 위반(기본 도형·디버그 출력 추가) — 검토 필요"
fi

echo "== 에셋 등록 검사 =="
python3 "$ROOT/tools/devloop/asset_check.py" "$ROOT"

# 클라이언트가 실제로 컴파일되는지(지역 변수 200개 한도·병합 충돌 표식 포함) 확인한다
COMPILE="${LUAU_DIR:+$LUAU_DIR/}luau-compile"
if grep -n '^<<<<<<<\|^>>>>>>>' "$ROOT"/src/StarterPlayer/*.luau "$ROOT"/src/ReplicatedStorage/Shared/*.luau "$ROOT"/src/ServerScriptService/*.luau "$ROOT"/src/ServerScriptService/Services/*.luau; then
  echo "병합 충돌 표식이 남아 있어요"; exit 1
fi
if command -v "$COMPILE" >/dev/null 2>&1 || [ -x "$COMPILE" ]; then
  echo "== 클라이언트 컴파일 검사 =="
  "$COMPILE" --null "$ROOT/src/StarterPlayer/Game.client.luau" >/dev/null
fi

echo "== 타입 검사 =="
"$ANALYZE" "$TMP"/Shared/*.luau "$TMP"/Services/*.luau "$TMP/logic.test.luau" "$TMP/tactics.test.luau"
echo "OK"

echo "== 로직 테스트 =="
(cd "$TMP" && "$LUAU" logic.test.luau)

echo "== 지상 전술 테스트 =="
(cd "$TMP" && "$LUAU" tactics.test.luau)

echo "== 문화권 표 검사 =="
{ cat "$ROOT/tests/cultures_stub.luau"; sed "1d" "$ROOT"/src/ReplicatedStorage/Shared/PortCultures.luau; } > "$TMP/Shared/PortCultures.luau"
(cd "$TMP" && "$LUAU" cultures.test.luau)

echo "== 항구 스모크 빌드 =="
SM="$TMP/smoke"; mkdir -p "$SM"
cp "$ROOT"/src/ReplicatedStorage/Shared/{Ports,AssetIds,PortBuildings}.luau "$SM/"
sed -i -E 's/require\(script\.Parent\.([A-Za-z0-9]+)\)/require(".\/\1")/g' "$SM"/Ports.luau
cp "$ROOT"/tests/mockstate.luau "$ROOT"/tests/smoke_portscene.luau "$SM/"
{ cat "$ROOT/tests/smoke_prelude.luau"; sed 1d "$ROOT"/src/ReplicatedStorage/Shared/PortCultures.luau; } > "$SM/PortCultures.luau"
echo 'return { createR15 = function() return nil end }' > "$SM/Pose.luau"
{ cat "$ROOT/tests/smoke_prelude.luau"; sed -E 's/require\(script\.Parent:WaitForChild\("([A-Za-z0-9]+)"\)\)/require(".\/\1")/g' "$ROOT"/src/ReplicatedStorage/Shared/PortScene.luau; } > "$SM/PortScene.luau"
(cd "$SM" && "$LUAU" smoke_portscene.luau)
