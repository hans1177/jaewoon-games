#!/usr/bin/env bash
set -euo pipefail

apk="${1:-}"
out_dir="${2:-qa-artifacts/unity-runtime-smoke}"
[[ -n "$apk" && -s "$apk" ]] || { echo "[JAEWOON_BUILD_ERROR:APK_SMOKE_INPUT_MISSING] APK missing or empty: $apk" >&2; exit 2; }
mkdir -p "$out_dir"

adb start-server >/dev/null 2>&1 || true
if ! timeout 150 adb wait-for-device; then
  echo '[JAEWOON_BUILD_ERROR:ANDROID_ADB_DEVICE_TIMEOUT] adb did not discover the Android emulator within 150 seconds.' >&2
  adb devices -l >&2 || true
  cat /tmp/jaewoon-emulator.log >&2 2>/dev/null || true
  exit 3
fi
if ! timeout 150 bash -c 'until [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d "\r")" == "1" ]]; do sleep 3; done'; then
  echo '[JAEWOON_BUILD_ERROR:ANDROID_EMULATOR_BOOT_TIMEOUT] Android emulator did not finish booting within 150 seconds.' >&2
  adb devices -l >&2 || true
  cat /tmp/jaewoon-emulator.log >&2 2>/dev/null || true
  exit 3
fi

aapt_bin="$(find "${ANDROID_HOME:-$ANDROID_SDK_ROOT}/build-tools" -type f -name aapt 2>/dev/null | sort -V | tail -n 1)"
[[ -n "$aapt_bin" && -x "$aapt_bin" ]] || { echo '[JAEWOON_BUILD_ERROR:AAPT_MISSING] aapt not found.' >&2; exit 4; }
package="$($aapt_bin dump badging "$apk" | sed -n "s/package: name='\([^']*\)'.*/\1/p" | head -n 1)"
[[ -n "$package" ]] || { echo '[JAEWOON_BUILD_ERROR:APK_PACKAGE_UNRESOLVED] Could not resolve APK package id.' >&2; exit 5; }

adb shell getprop ro.build.version.sdk > "$out_dir/device-api.txt" || true
adb shell getprop ro.product.cpu.abilist > "$out_dir/device-abis.txt" || true
"$aapt_bin" dump badging "$apk" > "$out_dir/apk-badging.txt" || true

# Fresh install is the primary gate because that matches the owner-reported Samsung failure.
adb uninstall "$package" >/dev/null 2>&1 || true
set +e
adb install -t "$apk" > "$out_dir/install.log" 2>&1
install_status=$?
set -e
if [[ "$install_status" -ne 0 ]]; then
  cat "$out_dir/install.log" >&2
  echo "[JAEWOON_BUILD_ERROR:APK_FRESH_INSTALL_FAILED] adb install failed for $package with status=$install_status" >&2
  exit 7
fi
if ! grep -q 'Success' "$out_dir/install.log"; then
  cat "$out_dir/install.log" >&2
  echo "[JAEWOON_BUILD_ERROR:APK_INSTALL_NO_SUCCESS] Android package manager did not report Success for $package" >&2
  exit 8
fi

adb shell pm path "$package" > "$out_dir/package-path.txt" 2>&1 || { echo "[JAEWOON_BUILD_ERROR:APK_PACKAGE_NOT_REGISTERED] $package is not registered after install" >&2; exit 9; }

adb logcat -c || true
set +e
adb shell monkey -p "$package" -c android.intent.category.LAUNCHER 1 > "$out_dir/launch.log" 2>&1
launch_status=$?
set -e
sleep 5

# 실제 Android 입력 경로를 거치는 최소 모바일 스모크.
adb shell input tap 540 900 || true
adb shell input swipe 540 1500 540 700 350 || true
adb shell input tap 270 1500 || true
adb shell input tap 810 1500 || true
sleep 3

# 프로세스가 이미 종료됐어도 증거 수집이 끊기지 않게 한다.
pid="$(adb shell pidof "$package" 2>/dev/null | tr -d '\r' | head -n 1 || true)"
adb shell dumpsys activity activities > "$out_dir/activity.txt" 2>&1 || true
adb shell dumpsys package "$package" > "$out_dir/package.txt" 2>&1 || true
adb logcat -d > "$out_dir/logcat.txt" 2>&1 || true
adb exec-out screencap -p > "$out_dir/screenshot.png" 2>/dev/null || true

fatal=0
if grep -Eiq "FATAL EXCEPTION|ANR in ${package}|Fatal signal|Process ${package} .* died" "$out_dir/logcat.txt"; then
  fatal=1
fi
runtime_pass=false
if [[ "$launch_status" -eq 0 && -n "$pid" && "$fatal" -eq 0 ]]; then runtime_pass=true; fi

# Verify the same signed APK can also update the installed copy.
update_pass=false
if [[ "$runtime_pass" == "true" ]]; then
  set +e
  adb install -r -t "$apk" > "$out_dir/update-install.log" 2>&1
  update_status=$?
  set -e
  if [[ "$update_status" -eq 0 ]] && grep -q 'Success' "$out_dir/update-install.log"; then
    update_pass=true
  fi
fi

python3 - "$out_dir/evidence.json" "$apk" "$package" "$pid" "$runtime_pass" "$fatal" "$update_pass" "$launch_status" <<'PY'
import json,sys,datetime,pathlib
out,apk,package,pid,runtime_pass,fatal,update_pass,launch_status=sys.argv[1:]
data={
  'version':3,
  'target':'unity-android',
  'testMethod':'Android emulator black-box APK smoke: fresh install + launch + input + update',
  'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
  'apk':apk,
  'package':package,
  'freshInstallPassed':True,
  'launcherCommandPassed':launch_status=='0',
  'runtimeSmokePassed':runtime_pass.lower()=='true',
  'updateInstallPassed':update_pass.lower()=='true',
  'qaPassEligibleRuntimeEvidence':runtime_pass.lower()=='true' and update_pass.lower()=='true',
  'processAliveAfterInput':bool(pid.strip()),
  'fatalRuntimeErrorDetected':fatal=='1',
  'playTestEvidence':[
    f'fresh APK install passed package={package}',
    f'launcher command passed={launch_status=="0"}',
    'Android tap/swipe/tap input sequence delivered',
    f'process alive after input={bool(pid.strip())}',
    f'fatal runtime error detected={fatal=="1"}',
    f'same-signed APK update install passed={update_pass.lower()=="true"}',
    'activity/package/logcat/screenshot evidence captured even on runtime failure'
  ],
  'artifacts':{
    'installLog':'install.log','updateInstallLog':'update-install.log','launchLog':'launch.log','logcat':'logcat.txt','screenshot':'screenshot.png','activity':'activity.txt','packageDump':'package.txt','apkBadging':'apk-badging.txt','deviceApi':'device-api.txt','deviceAbis':'device-abis.txt'
  }
}
pathlib.Path(out).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
PY

cat "$out_dir/evidence.json"
[[ "$launch_status" -eq 0 ]] || { cat "$out_dir/launch.log" >&2 || true; echo "[JAEWOON_BUILD_ERROR:APK_LAUNCH_COMMAND_FAILED] launcher command failed for $package status=$launch_status" >&2; exit 10; }
[[ -n "$pid" ]] || { tail -n 250 "$out_dir/logcat.txt" >&2 || true; echo "[JAEWOON_BUILD_ERROR:APK_PROCESS_EXITED] $package is not alive after launch/input" >&2; exit 11; }
[[ "$fatal" -eq 0 ]] || { tail -n 250 "$out_dir/logcat.txt" >&2 || true; echo "[JAEWOON_BUILD_ERROR:APK_FATAL_RUNTIME_ERROR] fatal runtime error detected for $package" >&2; exit 12; }
[[ "$runtime_pass" == "true" ]] || { echo "[JAEWOON_BUILD_ERROR:APK_RUNTIME_SMOKE_FAILED] Unity APK runtime smoke failed for $package" >&2; exit 13; }
[[ "$update_pass" == "true" ]] || { cat "$out_dir/update-install.log" >&2 || true; echo "[JAEWOON_BUILD_ERROR:APK_UPDATE_INSTALL_FAILED] Same APK could not update installed package $package" >&2; exit 14; }
echo "UNITY_APK_RUNTIME_SMOKE=PASS package=$package pid=$pid fresh_install=true update_install=true"
