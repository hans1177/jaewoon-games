using System;
using UnityEngine;
using UnityEngine.Profiling;

public sealed class SeedTechnicalPrototype : MonoBehaviour
{
    private const string GameId = "seed-idle-growth-rpg-crystal-bloom";
    private const string GameName = "Crystal Bloom";
    private const string Mode = "IDLE_RPG";
    private const string Identity = "Crystal Bloom";
    private const string CoreLoop = "Heroes or characters fight automatically and continue generating useful idle or offline progression resources between active sessions. → Claim rewards, upgrade levels or skills, equip gear, and choose which hero or stat path receives the next investment. → Push a harder stage or boss with the improved roster, unlock another growth layer, and return later to collect the next idle reward cycle.";
    private const string SavePrefix = "seed_idle_growth_rpg_crystal_bloom_tech_";

    private int actionCount;
    private int progress;
    private int resource = 10;
    private int level = 1;
    private int chain;
    private float elapsed;
    private float metricTimer;
    private float fpsTime;
    private int fpsFrames;
    private string lastAction = "READY";

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    private static void Bootstrap()
    {
        var root = new GameObject("JAEWOON_DEVELOPMENT_UNITY_TECHNICAL_PROTOTYPE");
        DontDestroyOnLoad(root);
        root.AddComponent<SeedTechnicalPrototype>();
    }

    private void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        LoadState();
        Debug.Log("JAEWOON_TECH_BOOT game=" + GameId + " mode=" + Mode + " restoredActions=" + actionCount);
    }

    private void Update()
    {
        float dt = Mathf.Min(Time.unscaledDeltaTime, 0.25f);
        elapsed += dt;
        metricTimer += dt;
        fpsTime += dt;
        fpsFrames++;

        if (Mode == "IDLE_RPG" && elapsed >= 1f)
        {
            elapsed -= 1f;
            resource += Mathf.Max(1, level);
            progress += level;
        }

        if (metricTimer >= 5f)
        {
            float fps = fpsTime > 0.001f ? fpsFrames / fpsTime : 0f;
            long memory = Profiler.GetTotalAllocatedMemoryLong();
            Debug.Log("JAEWOON_TECH_METRIC game=" + GameId + " fps=" + fps.ToString("F1") +
                      " memBytes=" + memory + " actions=" + actionCount + " progress=" + progress +
                      " level=" + level + " resource=" + resource);
            metricTimer = 0f;
            fpsTime = 0f;
            fpsFrames = 0;
        }
    }

    private void OnGUI()
    {
        int w = Screen.width;
        int h = Screen.height;
        float scale = Mathf.Max(1f, w / 390f);
        GUI.skin.label.fontSize = Mathf.RoundToInt(17f * scale);
        GUI.skin.button.fontSize = Mathf.RoundToInt(20f * scale);
        GUI.skin.box.fontSize = Mathf.RoundToInt(16f * scale);

        GUI.Box(new Rect(w * 0.04f, h * 0.04f, w * 0.92f, h * 0.88f), "");
        GUI.Label(new Rect(w * 0.08f, h * 0.07f, w * 0.84f, h * 0.06f), GameName + " · Unity Android 기술 프로토타입");
        GUI.Label(new Rect(w * 0.08f, h * 0.14f, w * 0.84f, h * 0.10f), Identity);
        GUI.Label(new Rect(w * 0.08f, h * 0.25f, w * 0.84f, h * 0.10f), "핵심 루프: " + CoreLoop);
        GUI.Label(new Rect(w * 0.08f, h * 0.36f, w * 0.84f, h * 0.08f),
            "MODE " + Mode + "   행동 " + actionCount + "   진행 " + progress + "   자원 " + resource + "   Lv." + level);
        GUI.Label(new Rect(w * 0.08f, h * 0.45f, w * 0.84f, h * 0.06f), "최근 입력: " + lastAction);

        for (int i = 0; i < 7; i++)
        {
            float x = w * (0.10f + i * 0.12f);
            float y = h * (0.53f + 0.018f * Mathf.Sin(Time.unscaledTime * (1.2f + i * 0.08f) + i));
            GUI.Box(new Rect(x, y, w * 0.075f, w * 0.075f), ((progress + i) % 9).ToString());
        }

        if (GUI.Button(new Rect(w * 0.10f, h * 0.62f, w * 0.80f, h * 0.12f), PrimaryLabel()))
            PrimaryAction();
        if (GUI.Button(new Rect(w * 0.10f, h * 0.78f, w * 0.80f, h * 0.12f), SecondaryLabel()))
            SecondaryAction();
    }

    private string PrimaryLabel()
    {
        switch (Mode)
        {
            case "SURVIVAL": return "회피 이동 + 적 처치";
            case "DEFENSE": return "타워 배치 + 웨이브 방어";
            case "PUZZLE": return "색 연결 + 연쇄";
            case "CASUAL": return "세계 조각 연결";
            case "IDLE_RPG": return "성장 업그레이드";
            case "STORY_RPG": return "전투 선택 진행";
            default: return "핵심 행동";
        }
    }

    private string SecondaryLabel()
    {
        switch (Mode)
        {
            case "SURVIVAL": return "보상 선택";
            case "DEFENSE": return "타워 강화";
            case "PUZZLE": return "보드 재배치";
            case "CASUAL": return "보상 수확";
            case "IDLE_RPG": return "보스 도전";
            case "STORY_RPG": return "대화 선택";
            default: return "선택 / 보상";
        }
    }

    private void PrimaryAction()
    {
        actionCount++;
        switch (Mode)
        {
            case "SURVIVAL": progress += 2 + level; resource += 1; lastAction = "DODGE_KILL"; break;
            case "DEFENSE": progress += level; resource = Mathf.Max(0, resource - 1); lastAction = "PLACE_DEFEND"; break;
            case "PUZZLE": chain = (chain % 5) + 1; progress += chain; resource += chain >= 4 ? 2 : 0; lastAction = "CHAIN_" + chain; break;
            case "CASUAL": progress += 2; resource += progress % 6 == 0 ? 3 : 0; lastAction = "WEAVE_NODE"; break;
            case "IDLE_RPG": if (resource >= level * 2) { resource -= level * 2; level++; } progress += level; lastAction = "UPGRADE"; break;
            case "STORY_RPG": progress += level + 1; resource += 1; lastAction = "BATTLE_CHOICE"; break;
            default: progress++; lastAction = "CORE_ACTION"; break;
        }
        SaveState();
        Debug.Log("JAEWOON_TECH_ACTION game=" + GameId + " type=PRIMARY count=" + actionCount + " progress=" + progress);
    }

    private void SecondaryAction()
    {
        actionCount++;
        switch (Mode)
        {
            case "SURVIVAL": level++; resource += 2; lastAction = "REWARD_BUILD"; break;
            case "DEFENSE": if (resource > 0) { resource--; level++; } lastAction = "UPGRADE_TOWER"; break;
            case "PUZZLE": chain = 0; resource = Mathf.Max(0, resource - 1); lastAction = "RESHUFFLE"; break;
            case "CASUAL": resource += Mathf.Max(1, progress / 3); level += progress >= level * 5 ? 1 : 0; lastAction = "HARVEST"; break;
            case "IDLE_RPG": progress += level * 3; resource += level; lastAction = "BOSS"; break;
            case "STORY_RPG": level += progress > level * 3 ? 1 : 0; resource += 2; lastAction = "STORY_CHOICE"; break;
            default: resource++; lastAction = "CHOICE"; break;
        }
        SaveState();
        Debug.Log("JAEWOON_TECH_ACTION game=" + GameId + " type=SECONDARY count=" + actionCount + " progress=" + progress);
    }

    private void SaveState()
    {
        PlayerPrefs.SetInt(SavePrefix + "actions", actionCount);
        PlayerPrefs.SetInt(SavePrefix + "progress", progress);
        PlayerPrefs.SetInt(SavePrefix + "resource", resource);
        PlayerPrefs.SetInt(SavePrefix + "level", level);
        PlayerPrefs.SetInt(SavePrefix + "chain", chain);
        PlayerPrefs.Save();
        Debug.Log("JAEWOON_TECH_SAVE game=" + GameId + " actions=" + actionCount + " progress=" + progress);
    }

    private void LoadState()
    {
        actionCount = PlayerPrefs.GetInt(SavePrefix + "actions", 0);
        progress = PlayerPrefs.GetInt(SavePrefix + "progress", 0);
        resource = PlayerPrefs.GetInt(SavePrefix + "resource", 10);
        level = Mathf.Max(1, PlayerPrefs.GetInt(SavePrefix + "level", 1));
        chain = PlayerPrefs.GetInt(SavePrefix + "chain", 0);
        Debug.Log("JAEWOON_TECH_SAVE_RESTORED game=" + GameId + " actions=" + actionCount + " progress=" + progress);
    }

    private void OnApplicationPause(bool paused)
    {
        if (paused) SaveState();
        Debug.Log("JAEWOON_TECH_PAUSE game=" + GameId + " paused=" + paused);
    }

    private void OnApplicationFocus(bool focused)
    {
        Debug.Log("JAEWOON_TECH_FOCUS game=" + GameId + " focused=" + focused);
    }

    private void OnApplicationQuit() { SaveState(); }
}
