#!/usr/bin/env bash
# 린터가 실제로 옛 버그(하이픈 find)와 중복 정의를 잡는지 확인한다.
set -euo pipefail
D="$(mktemp -d)"; trap 'rm -rf "$D"' EXIT
mkdir -p "$D/src"
printf 'local a = ("tree-oak"):find("tree-oak")\nlocal function f() end\nlocal function f() end\n' > "$D/src/x.luau"
if python3 "$1" "$D" >/dev/null; then echo "린터 자체 시험 실패: 위반을 못 잡음"; exit 1; fi
printf 'local a = ("tree-oak"):find("tree-oak", 1, true)\n' > "$D/src/x.luau"
python3 "$1" "$D" >/dev/null || { echo "린터 자체 시험 실패: 정상 코드를 위반으로 봄"; exit 1; }
echo "린터 자체 시험 통과"
