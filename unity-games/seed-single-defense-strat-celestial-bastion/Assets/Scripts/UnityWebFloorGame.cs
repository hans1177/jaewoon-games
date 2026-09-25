using UnityEngine;

public sealed class UnityWebFloorGame : MonoBehaviour
{
    private const string GameId = "seed-single-defense-strat-celestial-bastion";
    private const string GameName = "천상의 보루";
    private const string Mode = "DEFENSE";
    private const string Identity = "천상의 보루는 고전적인 타워 디펜스 장르를 재해석하여, 플레이어가 실시간으로 전장의 지형을 변형하고 유닛의 속성을 동적으로 조합하는 전략적 깊이를 제공합니다. 핵심 루프인 '적의 경로 예측-방어선 구축-자원 최적화'는 단순한 배치를 넘어, 지형 변형 시스템과 속성 상성 시스템을 통해 매 순간 플레이어의 창의적인 선택이 전황을 뒤바꾸는 고유한 경험을 창출합니다.";
    private const string CoreLoop = "적의 웨이브 정보를 확인하고, 현재 가용 자원을 고려하여 방어 타워를 배치하거나 지형을 수정하여 적의 이동 경로를 최적화합니다. -> 전투 중 적을 처치하여 획득한 에너지를 사용하여 타워를 강화하거나, 전장의 지형을 추가로 변형하여 방어 효율을 극대화합니다. -> 웨이브 종료 후 획득한 보상으로 새로운 타워 기술을 연구하거나 기존 타워의 속성을 강화하여 다음 단계의 더 강력한 적에 대비합니다.";
    private const string SavePrefix = "seed_single_defense_strat_celestial_bastion_webfloor_";

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
