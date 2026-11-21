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
# Roblox 엔진 전용 장면과 카드 UI는 CLI 타입 검사 대상에서 제외한다.
rm -f "$TMP"/Shared/PortScene.luau "$TMP"/Shared/VoyageScene.luau "$TMP"/Shared/FieldScene.luau "$TMP"/Shared/CommonVFX.luau "$TMP"/Shared/CommonMotion.luau "$TMP"/Shared/FieldMotion.luau "$TMP"/Shared/Pose.luau "$TMP"/Shared/Flags.luau "$TMP"/Shared/NavalBattle.luau "$TMP"/Shared/Sfx.luau "$TMP"/Shared/CardGallery.luau "$TMP"/Shared/DeckBuilder.luau "$TMP"/Shared/PortCultures.luau "$TMP"/Shared/CardSymbols.luau "$TMP"/Shared/CardTheme.luau

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

# [전투 화면 회귀] Roblox 전용 3D 장면은 엔진 실행 대신 원본 Luau 문법을 컴파일 검증한다.
# 원래 클라이언트 검사·병합 충돌 검사 유지, 새 우회 실행기 없이 기존 테스트에서 직접 확인.
COMPILE="${LUAU_DIR:+$LUAU_DIR/}luau-compile"
if grep -n '^<<<<<<<\|^>>>>>>>' "$ROOT"/src/StarterPlayer/*.luau "$ROOT"/src/ReplicatedStorage/Shared/*.luau "$ROOT"/src/ServerScriptService/*.luau "$ROOT"/src/ServerScriptService/Services/*.luau; then
  echo "병합 충돌 표식이 남아 있어요"; exit 1
fi
if command -v "$COMPILE" >/dev/null 2>&1 || [ -x "$COMPILE" ]; then
  echo "== 클라이언트·전투 장면 컴파일 검사 =="
  "$COMPILE" --null "$ROOT/src/StarterPlayer/Game.client.luau" >/dev/null
  "$COMPILE" --null "$ROOT/src/ReplicatedStorage/Shared/FieldScene.luau" >/dev/null
  "$COMPILE" --null "$ROOT/src/ReplicatedStorage/Shared/PortScene.luau" >/dev/null
  "$COMPILE" --null "$ROOT/src/ReplicatedStorage/Shared/Pose.luau" >/dev/null
  "$COMPILE" --null "$ROOT/src/ReplicatedStorage/Shared/NavalBattle.luau" >/dev/null
  "$COMPILE" --null "$ROOT/src/ReplicatedStorage/Shared/CardSymbols.luau" >/dev/null
  "$COMPILE" --null "$ROOT/src/ReplicatedStorage/Shared/CardTheme.luau" >/dev/null
fi

echo "== 항해 중 항구 3D 연출 중단 회귀 검사 =="
python3 - "$ROOT/src/ReplicatedStorage/Shared/PortScene.luau" <<'PY'
from pathlib import Path
import sys
source = Path(sys.argv[1]).read_text(encoding="utf-8")
walk = source.index('local walkConn = RunService.PreSimulation:Connect(function(deltaTime)')
ship = source.index('local conn = RunService.Heartbeat:Connect(function()', walk)
walker_block = source[walk:source.index('local now = os.clock()', walk)]
ship_block = source[ship:source.index('local t = os.clock() - t0', ship)]
if 'if not folder.Parent or workspace:GetAttribute("VoyageActive") then return end' not in walker_block:
    raise SystemExit("MARE_PORT_OFFSCREEN_NPC_GUARD_MISSING")
if 'if not folder.Parent then return end' not in ship_block:
    raise SystemExit("MARE_PORT_DESTROYED_VISUAL_GUARD_MISSING")
if 'if workspace:GetAttribute("VoyageActive") then\n\t\t\tif not wasVoyageActive then\n\t\t\t\tsetFoam(0)\n\t\t\t\twasVoyageActive = true\n\t\t\tend\n\t\t\treturn\n\t\tend' not in ship_block:
    raise SystemExit("MARE_PORT_OFFSCREEN_SHIP_WAKE_NOT_STOPPED")
if 'wasVoyageActive = false' not in source:
    raise SystemExit("MARE_PORT_WAKE_MUST_RESET_AFTER_VOYAGE")
if 'folder.Destroying:Connect(function()\n\t\twalkConn:Disconnect()' not in source:
    raise SystemExit("MARE_PORT_NPC_CONNECTION_CLEANUP_MISSING")
if 'folder.Destroying:Connect(function()\n\t\tconn:Disconnect()' not in source:
    raise SystemExit("MARE_PORT_SHIP_CONNECTION_CLEANUP_MISSING")
# [항구 조명] 원래 주야 변화와 창문 조명은 유지하되 파괴/이탈된 조명 참조만 제거한다.
climate = source.index('local climateConn = RunService.Heartbeat:Connect(function()')
window = source[climate:source.index('if snow then', source.index('if rays then rays.Intensity', climate))]
if 'for index = #lights, 1, -1 do' not in window:
    raise SystemExit("MARE_PORT_REMOVED_LIGHT_PRUNE_LOOP_MISSING")
if 'if not entry.light:IsDescendantOf(folder) then\n\t\t\t\ttable.remove(lights, index)' not in window:
    raise SystemExit("MARE_PORT_REMOVED_LIGHT_REFERENCE_NOT_RELEASED")
if 'entry.light.Brightness = entry.brightness * (0.16 + 2.15 * night)' not in window:
    raise SystemExit("MARE_PORT_DAY_NIGHT_LIGHT_CYCLE_CHANGED")
if 'window.Transparency = math.clamp(0.92 - night * 0.78, 0.14, 0.92)' not in window:
    raise SystemExit("MARE_PORT_WINDOW_NIGHT_GLOW_CHANGED")
# [승인된 모델] 원래 Loader에서 실측 3축 크기·NaN·무한값을 감사하고 원본 모델은 교체하지 않는다.
root = Path(sys.argv[1]).parents[3]
loader = (root / "src/ServerScriptService/AssetLoader.server.luau").read_text(encoding="utf-8")
if 'pcall(model.GetBoundingBox, model)' not in loader:
    raise SystemExit("MARE_MODEL_REAL_BOUNDS_AUDIT_MISSING")
if 'bounds.X > 0.0001 and bounds.Y > 0.0001 and bounds.Z > 0.0001' not in loader:
    raise SystemExit("MARE_MODEL_EMPTY_GEOMETRY_CHECK_MISSING")
if 'bounds.X < math.huge and bounds.Y < math.huge and bounds.Z < math.huge' not in loader:
    raise SystemExit("MARE_MODEL_INVALID_GEOMETRY_CHECK_MISSING")
if 'if studioAudit then\n\t\t\t\t\t\tgeometryChecked += 1' not in loader:
    raise SystemExit("MARE_MODEL_AUDIT_MUST_NOT_ALTER_LIVE_GAME")
if 'MareModelGeometryAuditState' not in loader or 'MareModelGeometryAudit' not in loader:
    raise SystemExit("MARE_MODEL_GEOMETRY_AUDIT_RESULT_MISSING")
# [R15 보정] 기존 관절을 중복 생성하지 않으면서 부족한 관절과 180도 뒤집힌 팔을 복구한다.
pose = (root / "src/ReplicatedStorage/Shared/Pose.luau").read_text(encoding="utf-8")
if 'if joints < 15 and humanoid then' not in pose:
    raise SystemExit("MARE_R15_INCOMPLETE_JOINT_REPAIR_REQUIRED")
if 'and not p1:FindFirstChild(link[1]) then' not in pose:
    raise SystemExit("MARE_R15_EXISTING_JOINT_MUST_BE_PRESERVED")
if 'if axis.Magnitude < 1e-4 then\n\t\taxis = Vector3.new(1, 0, 0)' not in pose:
    raise SystemExit("MARE_R15_OPPOSITE_ARM_AXIS_REPAIR_REQUIRED")
if 'if angle < 0.15 then' not in pose:
    raise SystemExit("MARE_R15_NEUTRAL_ARM_POSE_MUST_BE_PRESERVED")
print("MARE_PORT_OFFSCREEN_VISUAL_GATE=PASS")
print("MARE_PORT_LIGHT_LIFECYCLE=PASS")
print("MARE_MODEL_GEOMETRY_AND_R15_REPAIR=PASS")
PY

echo "== 무기 연타·아이콘 스킬·저장 회귀 검사 =="
(cd "$ROOT/../.." && node --test qa/mare-essentia-datastore-name.test.mjs)

echo "== 타입 검사 =="
"$ANALYZE" "$TMP"/Shared/*.luau "$TMP"/Services/*.luau "$TMP/logic.test.luau" "$TMP/knowledge_battle.test.luau" "$TMP/action_combat.test.luau" "$TMP/economy.test.luau" "$TMP/jobskills.test.luau" "$TMP/weapons.test.luau"
echo "OK"

echo "== 로직 테스트 =="
(cd "$TMP" && "$LUAU" logic.test.luau)

echo "== 지식=전투 테스트 =="
(cd "$TMP" && "$LUAU" knowledge_battle.test.luau)

echo "== 액션 전투 테스트 =="
(cd "$TMP" && "$LUAU" action_combat.test.luau)

echo "== 직업별 스킬 테스트 =="
(cd "$TMP" && "$LUAU" jobskills.test.luau)
echo "== 무기 테스트 =="
(cd "$TMP" && "$LUAU" weapons.test.luau)

echo "== 마을 경제 테스트 =="
(cd "$TMP" && "$LUAU" economy.test.luau)

echo "== 문화권 표 검사 =="
{ cat "$ROOT/tests/cultures_stub.luau"; sed "1d" "$ROOT"/src/ReplicatedStorage/Shared/PortCultures.luau; } > "$TMP/Shared/PortCultures.luau"
(cd "$TMP" && "$LUAU" cultures.test.luau)

echo "== 항구 스모크 빌드 =="
SM="$TMP/smoke"; mkdir -p "$SM"
cp "$ROOT"/src/ReplicatedStorage/Shared/{Ports,AssetIds,PortBuildings,Voyage,Ships,ProductionChains}.luau "$SM/"
sed -i -E 's/require\(script\.Parent\.([A-Za-z0-9]+)\)/require(".\/\1")/g' "$SM"/Ports.luau
cp "$ROOT"/tests/mockstate.luau "$ROOT"/tests/smoke_portscene.luau "$SM/"
{ cat "$ROOT/tests/smoke_prelude.luau"; sed 1d "$ROOT"/src/ReplicatedStorage/Shared/PortCultures.luau; } > "$SM/PortCultures.luau"
echo 'return { createR15 = function() return nil end }' > "$SM/Pose.luau"
{ cat "$ROOT/tests/smoke_prelude.luau"; sed -E 's/require\(script\.Parent:WaitForChild\("([A-Za-z0-9]+)"\)\)/require(".\/\1")/g' "$ROOT"/src/ReplicatedStorage/Shared/PortScene.luau; } > "$SM/PortScene.luau"
(cd "$SM" && "$LUAU" smoke_portscene.luau)
