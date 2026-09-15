// 파일명: tools/runtime/unity/Vibe2AutoPlayerRuntime.cs
// 역할: Unity PlayMode 테스트에서 실제 Input System 이벤트와 checkpoint를 Vibe2 runtime evidence로 기록한다.
// 게임 프로젝트의 테스트 전용 어셈블리에 복사/참조해서 사용한다. Legacy Input만 있는 프로젝트는 실제 입력 증거를 만들지 않고 실패한다.

using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
#endif

namespace Jaewoon.Vibe2.AutoPlayer
{
    [Serializable] public sealed class RuntimeAction { public string id; public string type; public bool dispatched; public bool ok; public string error; }
    [Serializable] public sealed class RuntimeCheckpoint { public string id; public string name; public bool required = true; public bool pass; public string value; }
    [Serializable] public sealed class RuntimeCapabilities { public bool playMode; public bool realInputDriver; }
    [Serializable] public sealed class RuntimeMetrics { public long durationMs; public long timeToFirstActionMs = -1; public int consoleErrorCount; }
    [Serializable] public sealed class RuntimeError { public string type; public string actionId; public string message; }
    [Serializable]
    public sealed class RuntimeEvidence
    {
        public int version = 1;
        public string engine = "unity";
        public string nonce;
        public string authority = "vibe2-unity-playmode-runtime";
        public bool runtimeVerified;
        public RuntimeCapabilities capabilities = new RuntimeCapabilities();
        public string project;
        public List<RuntimeAction> actions = new List<RuntimeAction>();
        public List<RuntimeCheckpoint> checkpoints = new List<RuntimeCheckpoint>();
        public List<RuntimeError> errors = new List<RuntimeError>();
        public RuntimeMetrics metrics = new RuntimeMetrics();
    }

    public sealed class Vibe2AutoPlayerRuntime
    {
        private readonly RuntimeEvidence evidence;
        private readonly DateTime startedUtc;
        private DateTime? firstInputUtc;

        public Vibe2AutoPlayerRuntime()
        {
            startedUtc = DateTime.UtcNow;
            evidence = new RuntimeEvidence
            {
                nonce = Environment.GetEnvironmentVariable("VIBE2_AUTO_PLAYER_NONCE") ?? string.Empty,
                project = Application.productName,
                runtimeVerified = Application.isPlaying,
                capabilities = new RuntimeCapabilities
                {
                    playMode = Application.isPlaying,
#if ENABLE_INPUT_SYSTEM
                    realInputDriver = true
#else
                    realInputDriver = false
#endif
                }
            };
            if (string.IsNullOrWhiteSpace(evidence.nonce))
                throw new InvalidOperationException("VIBE2_AUTO_PLAYER_NONCE missing");
        }

        public void Key(string id, string keyName, bool down)
        {
            var action = new RuntimeAction { id = id, type = "key" };
            try
            {
#if ENABLE_INPUT_SYSTEM
                if (Keyboard.current == null) throw new InvalidOperationException("Unity Input System Keyboard.current unavailable");
                if (!Enum.TryParse<Key>(keyName, true, out var key)) throw new ArgumentException("Unknown Unity Input System key: " + keyName);
                if (firstInputUtc == null) firstInputUtc = DateTime.UtcNow;
                InputSystem.QueueStateEvent(Keyboard.current, down ? new KeyboardState(key) : new KeyboardState());
                InputSystem.Update();
                action.dispatched = true;
                action.ok = true;
#else
                throw new InvalidOperationException("Real input requires Unity Input System; Legacy Input is not marked verified");
#endif
            }
            catch (Exception ex)
            {
                action.error = ex.Message;
                evidence.errors.Add(new RuntimeError { type = "action-error", actionId = id, message = ex.Message });
            }
            evidence.actions.Add(action);
        }

        public void Checkpoint(string id, string name, bool pass, object value = null, bool required = true)
        {
            evidence.checkpoints.Add(new RuntimeCheckpoint { id = id, name = name, required = required, pass = pass, value = value == null ? null : value.ToString() });
            if (required && !pass) evidence.errors.Add(new RuntimeError { type = "checkpoint-failed", actionId = id, message = name });
        }

        public RuntimeEvidence Finish()
        {
            evidence.metrics.durationMs = Math.Max(0, (long)(DateTime.UtcNow - startedUtc).TotalMilliseconds);
            if (firstInputUtc.HasValue) evidence.metrics.timeToFirstActionMs = Math.Max(0, (long)(firstInputUtc.Value - startedUtc).TotalMilliseconds);
            evidence.runtimeVerified = evidence.runtimeVerified && evidence.capabilities.playMode && evidence.capabilities.realInputDriver;
            return evidence;
        }

        public string WriteResult()
        {
            var result = Finish();
            var output = Environment.GetEnvironmentVariable("VIBE2_AUTO_PLAYER_RUNTIME_RESULT");
            if (string.IsNullOrWhiteSpace(output)) throw new InvalidOperationException("VIBE2_AUTO_PLAYER_RUNTIME_RESULT missing");
            Directory.CreateDirectory(Path.GetDirectoryName(output));
            File.WriteAllText(output, JsonUtility.ToJson(result, true));
            return output;
        }
    }
}
