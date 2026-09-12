#!/usr/bin/env bash
set -euo pipefail

apk="${1:-}"
out_dir="${2:-qa-artifacts/unity-runtime-smoke}"
[[ -n "$apk" && -s "$apk" ]] || { echo "[JAEWOON_BUILD_ERROR:APK_SMOKE_INPUT_MISSING] APK missing or empty: $apk" >&2; exit 2; }
mkdir -p "$out_dir"

adb start-server >/dev/null 2>&1 || true
if ! timeout 150 adb wait-for-device; then
  echo '[JAEWOON_BUILD_ERROR:ANDROID_ADB_DEVICE_TIMEOUT] adb did not discover the Android runtime within 150 seconds.' >&2
  adb devices -l >&2 || true
  cat /tmp/jaewoon-redroid.log >&2 2>/dev/null || true
  cat /tmp/jaewoon-emulator.log >&2 2>/dev/null || true
  exit 3
fi
if ! timeout 150 bash -c 'until [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d "\r")" == "1" ]]; do sleep 3; done'; then
  echo '[JAEWOON_BUILD_ERROR:ANDROID_RUNTIME_BOOT_TIMEOUT] Android runtime did not finish booting within 150 seconds.' >&2
  adb devices -l >&2 || true
  cat /tmp/jaewoon-redroid.log >&2 2>/dev/null || true
  cat /tmp/jaewoon-emulator.log >&2 2>/dev/null || true
  exit 3
fi

sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
aapt_bin=''
if [[ -n "$sdk_root" && -d "$sdk_root/build-tools" ]]; then
  aapt_bin="$(find "$sdk_root/build-tools" -type f -name aapt 2>/dev/null | sort -V | tail -n 1 || true)"
fi
if [[ -z "$aapt_bin" ]]; then
  aapt_bin="$(command -v aapt 2>/dev/null || true)"
fi
[[ -n "$aapt_bin" && -x "$aapt_bin" ]] || { echo '[JAEWOON_BUILD_ERROR:AAPT_MISSING] aapt not found in Android SDK or PATH.' >&2; exit 4; }
package="$($aapt_bin dump badging "$apk" | sed -n "s/package: name='\([^']*\)'.*/\1/p" | head -n 1)"
[[ -n "$package" ]] || { echo '[JAEWOON_BUILD_ERROR:APK_PACKAGE_UNRESOLVED] Could not resolve APK package id.' >&2; exit 5; }
launch_activity="$($aapt_bin dump badging "$apk" | sed -n "s/launchable-activity: name='\([^']*\)'.*/\1/p" | head -n 1)"
[[ -n "$launch_activity" ]] || { echo "[JAEWOON_BUILD_ERROR:APK_LAUNCH_ACTIVITY_UNRESOLVED] No launcher activity found for $package" >&2; exit 6; }
launch_component="${package}/${launch_activity}"
seed_technical=false
if [[ "$package" == com.jaewoongames.seed* ]]; then seed_technical=true; fi

device_api="$(adb shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r' | head -n 1 || true)"
device_abis="$(adb shell getprop ro.product.cpu.abilist 2>/dev/null | tr -d '\r' | head -n 1 || true)"
printf '%s\n' "$device_api" > "$out_dir/device-api.txt"
printf '%s\n' "$device_abis" > "$out_dir/device-abis.txt"
"$aapt_bin" dump badging "$apk" > "$out_dir/apk-badging.txt" || true
printf '%s\n' "$launch_component" > "$out_dir/launch-component.txt"

runtime_abi_compatible=true
if unzip -Z1 "$apk" 2>/dev/null | grep -q '^lib/arm64-v8a/'; then
  if ! grep -q 'arm64-v8a' <<<"$device_abis"; then
    runtime_abi_compatible=false
  fi
fi
if [[ "$runtime_abi_compatible" != "true" ]]; then
  echo "[JAEWOON_BUILD_ERROR:ANDROID_RUNTIME_ABI_MISMATCH] APK requires arm64-v8a but runtime abilist=$device_abis" >&2
  exit 19
fi

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

# Launch the exact APK activity directly. Android monkey can abort on unrelated system-app ANRs
# before injecting any event, which produces false "process exited" failures for the game.
adb logcat -c || true
set +e
timeout 20 adb shell am start -W -n "$launch_component" > "$out_dir/launch.log" 2>&1
launch_status=$?
set -e
launch_command_pass=false
if [[ "$launch_status" -eq 0 ]] && grep -Eq '^Status:[[:space:]]+ok\r?$' "$out_dir/launch.log"; then
  launch_command_pass=true
fi

boot_observed=false
action_observed=false
save_observed=false
metric_observed=false
runtime_ready_timeout=false
gameplay_input_delivered=false
process_observed_after_launch=false
process_exited_before_runtime_ready=false
launch_process_missing=false

if [[ "$seed_technical" == "true" && "$launch_command_pass" == "true" ]]; then
  for attempt in $(seq 1 20); do
    current_pid="$(adb shell pidof "$package" 2>/dev/null | tr -d '\r' | head -n 1 || true)"
    if [[ -n "$current_pid" ]]; then
      process_observed_after_launch=true
    elif [[ "$process_observed_after_launch" == "true" ]]; then
      process_exited_before_runtime_ready=true
      break
    elif [[ "$attempt" -ge 5 ]]; then
      launch_process_missing=true
      break
    fi

    snapshot="$(adb logcat -d 2>/dev/null || true)"
    if grep -q 'JAEWOON_TECH_BOOT' <<<"$snapshot"; then
      boot_observed=true
      break
    fi
    sleep 2
  done
  if [[ "$boot_observed" != "true" ]]; then
    runtime_ready_timeout=true
  fi
elif [[ "$seed_technical" == "true" ]]; then
  runtime_ready_timeout=true
else
  sleep 5
fi

size="$(adb shell wm size 2>/dev/null | tr -d '\r' | tail -n 1 || true)"
if [[ "$size" =~ ([0-9]+)x([0-9]+) ]]; then
  screen_w="${BASH_REMATCH[1]}"
  screen_h="${BASH_REMATCH[2]}"
else
  screen_w=1080
  screen_h=1920
fi
center_x=$((screen_w / 2))
primary_y=$((screen_h * 68 / 100))
secondary_y=$((screen_h * 84 / 100))

if [[ "$boot_observed" == "true" || "$seed_technical" != "true" ]]; then
  gameplay_input_delivered=true
  adb shell input tap "$center_x" "$primary_y" || true
  sleep 1
  adb shell input tap "$center_x" "$secondary_y" || true
  adb shell input swipe "$center_x" $((screen_h * 78 / 100)) "$center_x" $((screen_h * 38 / 100)) 350 || true
  adb shell input tap "$center_x" "$primary_y" || true
  sleep 1
  adb shell input tap "$center_x" "$secondary_y" || true
fi

if [[ "$seed_technical" == "true" && "$gameplay_input_delivered" == "true" ]]; then
  for _ in $(seq 1 15); do
    current_pid="$(adb shell pidof "$package" 2>/dev/null | tr -d '\r' | head -n 1 || true)"
    if [[ -z "$current_pid" ]]; then
      process_exited_before_runtime_ready=true
      break
    fi
    snapshot="$(adb logcat -d 2>/dev/null || true)"
    grep -q 'JAEWOON_TECH_BOOT' <<<"$snapshot" && boot_observed=true || true
    grep -q 'JAEWOON_TECH_ACTION' <<<"$snapshot" && action_observed=true || true
    grep -q 'JAEWOON_TECH_SAVE' <<<"$snapshot" && save_observed=true || true
    grep -q 'JAEWOON_TECH_METRIC' <<<"$snapshot" && metric_observed=true || true
    if [[ "$boot_observed" == "true" && "$action_observed" == "true" && "$save_observed" == "true" && "$metric_observed" == "true" ]]; then
      break
    fi
    sleep 2
  done
else
  [[ "$seed_technical" == "true" ]] || sleep 3
fi

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
if [[ "$launch_command_pass" == "true" && -n "$pid" && "$fatal" -eq 0 ]]; then runtime_pass=true; fi
seed_signals_pass=true
if [[ "$seed_technical" == "true" ]]; then
  seed_signals_pass=false
  if [[ "$boot_observed" == "true" && "$action_observed" == "true" && "$save_observed" == "true" && "$metric_observed" == "true" ]]; then
    seed_signals_pass=true
  fi
fi

update_pass=false
if [[ "$runtime_pass" == "true" && "$seed_signals_pass" == "true" ]]; then
  set +e
  adb install -r -t "$apk" > "$out_dir/update-install.log" 2>&1
  update_status=$?
  set -e
  if [[ "$update_status" -eq 0 ]] && grep -q 'Success' "$out_dir/update-install.log"; then
    update_pass=true
  fi
fi

python3 - "$out_dir/evidence.json" "$apk" "$package" "$pid" "$runtime_pass" "$fatal" "$update_pass" "$launch_command_pass" "$seed_technical" "$boot_observed" "$action_observed" "$save_observed" "$metric_observed" "$runtime_ready_timeout" "$gameplay_input_delivered" "$launch_activity" "$launch_component" "$process_observed_after_launch" "$process_exited_before_runtime_ready" "$launch_process_missing" "$runtime_abi_compatible" "$device_api" "$device_abis" <<'PY'
import json,sys,datetime,pathlib
(out,apk,package,pid,runtime_pass,fatal,update_pass,launch_command_pass,
 seed_technical,boot_observed,action_observed,save_observed,metric_observed,
 runtime_ready_timeout,gameplay_input_delivered,launch_activity,launch_component,
 process_observed_after_launch,process_exited_before_runtime_ready,launch_process_missing,
 runtime_abi_compatible,device_api,device_abis)=sys.argv[1:]
flag=lambda value:value.lower()=='true'
seed_ok=(not flag(seed_technical)) or all(map(flag,[boot_observed,action_observed,save_observed,metric_observed]))
data={
  'version':5,
  'target':'unity-android',
  'testMethod':'Android black-box APK smoke on an architecture-compatible runtime: fresh install + exact launcher activity + runtime-ready gate + gameplay input + update',
  'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
  'apk':apk,
  'package':package,
  'launchActivity':launch_activity,
  'launchComponent':launch_component,
  'deviceApi':device_api,
  'deviceAbis':device_abis,
  'runtimeAbiCompatible':flag(runtime_abi_compatible),
  'freshInstallPassed':True,
  'launcherCommandPassed':flag(launch_command_pass),
  'runtimeSmokePassed':flag(runtime_pass),
  'updateInstallPassed':flag(update_pass),
  'qaPassEligibleRuntimeEvidence':flag(runtime_pass) and flag(update_pass) and seed_ok and flag(runtime_abi_compatible),
  'processObservedAfterLaunch':flag(process_observed_after_launch),
  'processAliveAfterInput':bool(pid.strip()),
  'processExitedBeforeRuntimeReady':flag(process_exited_before_runtime_ready),
  'launchProcessMissing':flag(launch_process_missing),
  'fatalRuntimeErrorDetected':fatal=='1',
  'runtimeReadyTimeout':flag(runtime_ready_timeout),
  'gameplayInputDelivered':flag(gameplay_input_delivered),
  'developmentSeedRuntime':{
    'required':flag(seed_technical),
    'bootObserved':flag(boot_observed),
    'actionObserved':flag(action_observed),
    'saveObserved':flag(save_observed),
    'metricObserved':flag(metric_observed),
    'pass':seed_ok,
  },
  'playTestEvidence':[
    f'architecture-compatible Android runtime={flag(runtime_abi_compatible)} deviceAbis={device_abis}',
    f'fresh APK install passed package={package}',
    f'exact launcher activity={launch_component}',
    f'launcher command passed={flag(launch_command_pass)}',
    f'process observed after launch={flag(process_observed_after_launch)}',
    f'process exited before runtime ready={flag(process_exited_before_runtime_ready)}',
    f'launch process missing={flag(launch_process_missing)}',
    f'runtime-ready timeout={flag(runtime_ready_timeout)}',
    f'gameplay input delivered={flag(gameplay_input_delivered)}',
    f'development seed runtime signals pass={seed_ok}',
    f'process alive after runtime gate/input={bool(pid.strip())}',
    f'fatal runtime error detected={fatal=="1"}',
    f'same-signed APK update install passed={flag(update_pass)}',
    'activity/package/logcat/screenshot evidence captured even on runtime failure'
  ],
  'artifacts':{
    'installLog':'install.log','updateInstallLog':'update-install.log','launchLog':'launch.log','launchComponent':'launch-component.txt','logcat':'logcat.txt','screenshot':'screenshot.png','activity':'activity.txt','packageDump':'package.txt','apkBadging':'apk-badging.txt','deviceApi':'device-api.txt','deviceAbis':'device-abis.txt'
  }
}
pathlib.Path(out).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
PY

cat "$out_dir/evidence.json"
[[ "$launch_command_pass" == "true" ]] || { cat "$out_dir/launch.log" >&2 || true; echo "[JAEWOON_BUILD_ERROR:APK_LAUNCH_COMMAND_FAILED] exact activity launch failed for $launch_component status=$launch_status" >&2; exit 10; }
if [[ "$launch_process_missing" == "true" ]]; then
  tail -n 250 "$out_dir/logcat.txt" >&2 || true
  echo "[JAEWOON_BUILD_ERROR:APK_LAUNCH_PROCESS_MISSING] $package never created a process after exact activity launch" >&2
  exit 17
fi
if [[ "$process_exited_before_runtime_ready" == "true" ]]; then
  tail -n 250 "$out_dir/logcat.txt" >&2 || true
  echo "[JAEWOON_BUILD_ERROR:APK_PROCESS_EXITED_BEFORE_RUNTIME_READY] $package exited before required runtime evidence completed" >&2
  exit 18
fi
[[ -n "$pid" ]] || { tail -n 250 "$out_dir/logcat.txt" >&2 || true; echo "[JAEWOON_BUILD_ERROR:APK_PROCESS_EXITED] $package is not alive after launch/runtime gate" >&2; exit 11; }
[[ "$fatal" -eq 0 ]] || { tail -n 250 "$out_dir/logcat.txt" >&2 || true; echo "[JAEWOON_BUILD_ERROR:APK_FATAL_RUNTIME_ERROR] fatal runtime error detected for $package" >&2; exit 12; }
[[ "$runtime_pass" == "true" ]] || { echo "[JAEWOON_BUILD_ERROR:APK_RUNTIME_SMOKE_FAILED] Unity APK runtime smoke failed for $package" >&2; exit 13; }
if [[ "$seed_technical" == "true" && "$runtime_ready_timeout" == "true" ]]; then
  grep -E 'JAEWOON_TECH_(BOOT|ACTION|SAVE|METRIC)' "$out_dir/logcat.txt" >&2 || true
  echo "[JAEWOON_BUILD_ERROR:DEVELOPMENT_SEED_BOOT_TIMEOUT] no JAEWOON_TECH_BOOT observed; gameplay input withheld package=$package" >&2
  exit 16
fi
if [[ "$seed_technical" == "true" && "$seed_signals_pass" != "true" ]]; then
  grep -E 'JAEWOON_TECH_(BOOT|ACTION|SAVE|METRIC)' "$out_dir/logcat.txt" >&2 || true
  echo "[JAEWOON_BUILD_ERROR:DEVELOPMENT_SEED_RUNTIME_SIGNALS_MISSING] boot=$boot_observed action=$action_observed save=$save_observed metric=$metric_observed package=$package" >&2
  exit 15
fi
[[ "$update_pass" == "true" ]] || { cat "$out_dir/update-install.log" >&2 || true; echo "[JAEWOON_BUILD_ERROR:APK_UPDATE_INSTALL_FAILED] Same APK could not update installed package $package" >&2; exit 14; }
echo "UNITY_APK_RUNTIME_SMOKE=PASS package=$package pid=$pid fresh_install=true update_install=true seed_signals=$seed_signals_pass runtime_abi_compatible=$runtime_abi_compatible"