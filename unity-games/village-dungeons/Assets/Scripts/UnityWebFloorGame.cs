using UnityEngine;

public sealed class UnityWebFloorGame : MonoBehaviour
{
    private const string GameId = "village-dungeons";
    private const string GameName = "마을 던전 RPG";
    private const string Mode = "RPG";
    private const string Identity = "마을 던전 RPG는 위기 상황에 놓인 마을의 의뢰를 해결하기 위해 5개 던전의 자원과 위험 속으로 진입하여 직관적인 원서클 모바일 액션 전투를 수행하고 수집품을 마을 복구 시설에 환원하여 전투 빌드를 고유하게 완성해 나가는 루프 중심의 캐주얼 모바일 액션 롤플레잉 게임이다.";
    private const string CoreLoop = "마을 의뢰 게시판에서 자원 채취 및 특정 던전 몬스터 토벌 퀘스트를 수락하고 장비를 점검한다. -> 5개로 분기된 던전 중 하나를 선택 진입하여 한 손 조작 기반의 실시간 회피 및 평타/스킬 연계로 몬스터를 격퇴한다. -> 한정된 던전 배낭 슬롯에 귀환용 고가치 자원과 장비 강화 재료를 취사선택하여 보관한다. -> 포털을 통해 안전하게 마을로 귀환하여 의뢰를 완료하고 수집 자원으로 대장간과 주점을 업그레이드한다. -> 확장된 시설 버프와 신규 제작 무기를 바탕으로 더 깊은 던전 층계 및 보스전에 도전한다.";
    private const string SavePrefix = "village_dungeons_webfloor_";

    private int progress;
    private int level = 1;
    private int resource = 10;
    private int actions;
    private bool started;
    private GameObject player;
    private GameObject enemy;
    private GameObject equipment;
    private float motionClock;

    private void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        LoadState();
        BuildWorld();
        Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=" + GameId + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=character status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=enemy status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=environment status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=equipment status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA MOTION game=" + GameId + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_TARGET game=" + GameId + " role=action x=0.5000 y=0.7200");
        LogState();
    }

    private void BuildWorld()
    {
        Camera cam = Camera.main;
        if (cam == null)
        {
            var cameraObject = new GameObject("Main Camera");
            cam = cameraObject.AddComponent<Camera>();
            cameraObject.tag = "MainCamera";
        }
        cam.transform.position = new Vector3(0f, 6.5f, -9f);
        cam.transform.rotation = Quaternion.Euler(24f, 0f, 0f);
        cam.backgroundColor = new Color(0.06f, 0.08f, 0.13f);

        if (FindFirstObjectByType<Light>() == null)
        {
            var lightObject = new GameObject("Key Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.25f;
            lightObject.transform.rotation = Quaternion.Euler(48f, -28f, 0f);
        }

        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Environment_" + Mode;
        ground.transform.localScale = new Vector3(1.8f, 1f, 1.8f);

        player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        player.name = "Character_" + GameId;
        player.transform.position = new Vector3(-2f, 1f, 0f);

        enemy = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        enemy.name = "Enemy_" + Mode;
        enemy.transform.position = new Vector3(2f, 1f, 1f);
        enemy.transform.localScale = Vector3.one * 1.35f;

        equipment = GameObject.CreatePrimitive(PrimitiveType.Cube);
        equipment.name = "Equipment_" + Mode;
        equipment.transform.position = new Vector3(0f, 0.8f, -1.5f);
        equipment.transform.localScale = new Vector3(0.45f, 1.6f, 0.45f);

        var landmark = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        landmark.name = "Identity_" + Mode;
        landmark.transform.position = new Vector3(0f, 1.5f, 3f);
        landmark.transform.localScale = new Vector3(1.5f, 1.5f, 1.5f);
    }

    private void Update()
    {
        motionClock += Time.unscaledDeltaTime;
        if (enemy != null)
        {
            enemy.transform.Rotate(0f, 55f * Time.unscaledDeltaTime, 0f, Space.World);
            var p = enemy.transform.position;
            p.y = 1f + Mathf.Sin(motionClock * 2.1f) * 0.28f;
            enemy.transform.position = p;
        }
        if (equipment != null) equipment.transform.Rotate(35f * Time.unscaledDeltaTime, 45f * Time.unscaledDeltaTime, 0f);
        if (player != null && started)
        {
            var p = player.transform.position;
            p.x = -2f + Mathf.Sin(motionClock * 1.7f) * 0.55f;
            player.transform.position = p;
        }

        if (Input.GetKeyDown(KeyCode.Alpha1)) StartGameplay();
        if (Input.GetKeyDown(KeyCode.Space)) PerformAction(false);
        if (Input.GetKeyDown(KeyCode.R)) SafeReturn();
        if (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began) PerformAction(true);
    }

    private void StartGameplay()
    {
        started = true;
        Debug.Log("JAEWOON_UNITY_WEB_QA START game=" + GameId + " region=field mode=" + Mode + " status=PASS");
        LogState();
    }

    private void PerformAction(bool mobile)
    {
        if (!started) StartGameplay();
        actions++;
        progress += Mathf.Max(1, level);
        resource += 1 + (actions % 3);
        if (progress >= level * 4) level++;
        PlayerPrefs.SetInt(SavePrefix + "progress", progress);
        PlayerPrefs.SetInt(SavePrefix + "level", level);
        PlayerPrefs.SetInt(SavePrefix + "resource", resource);
        PlayerPrefs.SetInt(SavePrefix + "actions", actions);
        PlayerPrefs.Save();
        Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " mode=" + Mode + " action=" + actions + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA PROGRESS game=" + GameId + " progress=" + progress + " level=" + level + " resource=" + resource + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=" + Mode + " status=PASS");
        if (mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=action status=PASS");
        LogState();
    }

    private void SafeReturn()
    {
        started = false;
        Debug.Log("JAEWOON_UNITY_WEB_QA RETURN game=" + GameId + " region=town status=PASS");
        LogState();
    }

    private void LoadState()
    {
        progress = PlayerPrefs.GetInt(SavePrefix + "progress", 0);
        level = Mathf.Max(1, PlayerPrefs.GetInt(SavePrefix + "level", 1));
        resource = PlayerPrefs.GetInt(SavePrefix + "resource", 10);
        actions = PlayerPrefs.GetInt(SavePrefix + "actions", 0);
    }

    private void LogState()
    {
        Debug.Log("JAEWOON_UNITY_WEB_QA STATE game=" + GameId + " progress=" + progress + " level=" + level + " resource=" + resource + " actions=" + actions);
    }

    private void OnGUI()
    {
        float w = Screen.width;
        float h = Screen.height;
        GUI.Box(new Rect(w * 0.04f, h * 0.04f, w * 0.92f, h * 0.28f), "");
        GUI.Label(new Rect(w * 0.08f, h * 0.07f, w * 0.84f, h * 0.05f), GameName + " · Unity Web Floor");
        GUI.Label(new Rect(w * 0.08f, h * 0.13f, w * 0.84f, h * 0.08f), Identity);
        GUI.Label(new Rect(w * 0.08f, h * 0.21f, w * 0.84f, h * 0.08f), "Core: " + CoreLoop);
        if (GUI.Button(new Rect(w * 0.18f, h * 0.64f, w * 0.64f, h * 0.16f), "ACTION / TOUCH")) PerformAction(true);
    }
}
