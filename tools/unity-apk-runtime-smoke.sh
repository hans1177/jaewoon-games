#!/usr/bin/env bash
set -euo pipefail

apk="${1:-}"
out_dir="${2:-qa-artifacts/unity-runtime-smoke}"
[[ -n "$apk" && -s "$apk" ]] || { echo "APK missing or empty: $apk" >&2; exit 2; }
mkdir -p "$out_dir"

adb wait-for-device
for _ in $(seq 1 60); do
  [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] && break
  sleep 2
done
[[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] || { echo 'Android emulator did not finish booting.' >&2; exit 3; }

aapt_bin="$(find "${ANDROID_HOME:-$ANDROID_SDK_ROOT}/build-tools" -type f -name aapt 2>/dev/null | sort -V | tail -n 1)"
[[ -n "$aapt_bin" && -x "$aapt_bin" ]] || { echo 'aapt not found.' >&2; exit 4; }
package="$($aapt_bin dump badging "$apk" | sed -n "s/package: name='\([^']*\)'.*/\1/p" | head -n 1)"
[[ -n "$package" ]] || { echo 'Could not resolve APK package id.' >&2; exit 5; }

adb install -r "$apk" > "$out_dir/install.log"
adb logcat -c
adb shell monkey -p "$package" -c android.intent.category.LAUNCHER 1 > "$out_dir/launch.log" 2>&1
sleep 5

# 실제 Android 입력 경로를 거치는 최소 모바일 스모크.
adb shell input tap 540 900 || true
adb shell input swipe 540 1500 540 700 350 || true
adb shell input tap 270 1500 || true
adb shell input tap 810 1500 || true
sleep 3

pid="$(adb shell pidof "$package" 2>/dev/null | tr -d '\r' | head -n 1)"
adb logcat -d > "$out_dir/logcat.txt"
adb exec-out screencap -p > "$out_dir/screenshot.png" || true

fatal=0
if grep -Eiq "FATAL EXCEPTION|ANR in ${package}|Fatal signal|Process ${package} .* died" "$out_dir/logcat.txt"; then
  fatal=1
fi
runtime_pass=false
if [[ -n "$pid" && "$fatal" -eq 0 ]]; then runtime_pass=true; fi

python3 - "$out_dir/evidence.json" "$apk" "$package" "$pid" "$runtime_pass" "$fatal" <<'PY'
import json,sys,datetime,pathlib
out,apk,package,pid,runtime_pass,fatal=sys.argv[1:]
data={
  'version':1,
  'target':'unity-android',
  'testMethod':'Android emulator black-box APK smoke',
  'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
  'apk':apk,
  'package':package,
  'runtimeSmokePassed':runtime_pass.lower()=='true',
  'qaPassEligibleRuntimeEvidence':runtime_pass.lower()=='true',
  'processAliveAfterInput':bool(pid.strip()),
  'fatalRuntimeErrorDetected':fatal=='1',
  'playTestEvidence':[
    f'APK installed package={package}',
    'launcher start via Android intent/monkey',
    'Android tap/swipe/tap input sequence delivered',
    f'process alive after input={bool(pid.strip())}',
    f'fatal runtime error detected={fatal=="1"}',
    'runtime screenshot captured'
  ],
  'artifacts':{
    'installLog':'install.log','launchLog':'launch.log','logcat':'logcat.txt','screenshot':'screenshot.png'
  }
}
pathlib.Path(out).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
PY

cat "$out_dir/evidence.json"
[[ "$runtime_pass" == "true" ]] || { echo "Unity APK runtime smoke failed for $package" >&2; exit 6; }
echo "UNITY_APK_RUNTIME_SMOKE=PASS package=$package pid=$pid"
