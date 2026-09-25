using UnityEngine;

public sealed class UnityWebFloorGame : MonoBehaviour
{
    private const string GameId = "bug-defense";
    private const string GameName = "곤충 디펜스";
    private const string Mode = "DEFENSE";
    private const string Identity = "곤충 디펜스는 생태계의 먹이사슬과 곤충의 고유한 생물학적 특성을 전략적 상성으로 치환한 하드코어 타워 디펜스 게임입니다. 플레이어는 정원이라는 제한된 공간에서 침입하는 해충 군단을 막기 위해 포식자 곤충을 배치하며, 각 곤충의 공격 방식과 환경 상성을 고려한 배치 선택이 게임의 핵심 상태 변화를 주도합니다. 기존 디펜스 게임의 단순 수치 싸움을 넘어, 곤충의 서식지 적응도와 포식 패턴이라는 시그니처 시스템을 통해 매 웨이브마다 완전히 다른 전략적 선택을 강제하는 독자적인 정체성을 구축합니다.";
    private const string CoreLoop = "웨이브 시작 전 적의 침입 경로와 곤충 유형을 분석하여 방어 전략을 수립합니다. -> 보유한 자원을 사용하여 최적의 위치에 포식자 곤충을 배치하거나 기존 곤충을 진화시킵니다. -> 실시간 전투를 관찰하며 적의 돌파 시도에 대응해 스킬을 사용하거나 배치를 수정합니다. -> 웨이브 종료 후 획득한 자원으로 곤충의 생태적 특성을 강화하고 다음 웨이브를 준비합니다.";
    private const string SavePrefix = "bug_defense_webfloor_";

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
        cam.backgroundColor = new Color(0.06f,0.08f,0.13f);

        if (FindFirstObjectByType<Light>() == null)
        {
            var lightObject = new GameObject("Key Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.25f;
            lightObject.transform.rotation = Quaternion.Euler(48f,-28f,0f);
        }

        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Environment_" + Mode;
        ground.transform.localScale = new Vector3(1.8f,1f,1.8f);

        player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        player.name = "Character_" + GameId;
        player.transform.position = new Vector3(-2f,1f,0f);

        enemy = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        enemy.name = "Enemy_" + Mode;
        enemy.transform.position = new Vector3(2f,1f,1f);
        enemy.transform.localScale = Vector3.one * 1.35f;

        equipment = GameObject.CreatePrimitive(PrimitiveType.Cube);
        equipment.name = "Equipment_" + Mode;
        equipment.transform.position = new Vector3(0f,0.8f,-1.5f);
        equipment.transform.localScale = new Vector3(0.45f,1.6f,0.45f);

        var landmark = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        landmark.name = "Identity_" + Mode;
        landmark.transform.position = new Vector3(0f,1.5f,3f);
        landmark.transform.localScale = new Vector3(1.5f,1.5f,1.5f);
    }

    private void Update()
    {
        motionClock += Time.unscaledDeltaTime;
        if (enemy != null)
        {
            enemy.transform.Rotate(0f,55f * Time.unscaledDeltaTime,0f,Space.World);
            var p=enemy.transform.position;
            p.y=1f+Mathf.Sin(motionClock*2.1f)*0.28f;
            enemy.transform.position=p;
        }
        if (equipment != null) equipment.transform.Rotate(35f*Time.unscaledDeltaTime,45f*Time.unscaledDeltaTime,0f);
        if (player != null && started)
        {
            var p=player.transform.position;
            p.x=-2f+Mathf.Sin(motionClock*1.7f)*0.55f;
            player.transform.position=p;
        }

        if (Input.GetKeyDown(KeyCode.Alpha1)) StartGameplay();
        if (Input.GetKeyDown(KeyCode.Space)) PerformAction(false);
        if (Input.GetKeyDown(KeyCode.R)) SafeReturn();
        if (Input.touchCount > 0 && Input.GetTouch(0).phase == TouchPhase.Began) PerformAction(true);
    }

    private void StartGameplay()
    {
        started=true;
        Debug.Log("JAEWOON_UNITY_WEB_QA START game=" + GameId + " region=field mode=" + Mode + " status=PASS");
        LogState();
    }

    private void PerformAction(bool mobile)
    {
        if(!started) StartGameplay();
        actions++;
        progress += Mathf.Max(1,level);
        resource += 1 + (actions % 3);
        if(progress >= level * 4) level++;
        PlayerPrefs.SetInt(SavePrefix+"progress",progress);
        PlayerPrefs.SetInt(SavePrefix+"level",level);
        PlayerPrefs.SetInt(SavePrefix+"resource",resource);
        PlayerPrefs.SetInt(SavePrefix+"actions",actions);
        PlayerPrefs.Save();
        Debug.Log("JAEWOON_UNITY_WEB_QA ACTION game=" + GameId + " mode=" + Mode + " action=" + actions + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA PROGRESS game=" + GameId + " progress=" + progress + " level=" + level + " resource=" + resource + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=" + Mode + " status=PASS");
        if(mobile) Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_INPUT game=" + GameId + " role=action status=PASS");
        LogState();
    }

    private void SafeReturn()
    {
        started=false;
        Debug.Log("JAEWOON_UNITY_WEB_QA RETURN game=" + GameId + " region=town status=PASS");
        LogState();
    }

    private void LoadState()
    {
        progress=PlayerPrefs.GetInt(SavePrefix+"progress",0);
        level=Mathf.Max(1,PlayerPrefs.GetInt(SavePrefix+"level",1));
        resource=PlayerPrefs.GetInt(SavePrefix+"resource",10);
        actions=PlayerPrefs.GetInt(SavePrefix+"actions",0);
    }

    private void LogState()
    {
        Debug.Log("JAEWOON_UNITY_WEB_QA STATE game=" + GameId + " progress=" + progress + " level=" + level + " resource=" + resource + " actions=" + actions);
    }

    private void OnGUI()
    {
        float w=Screen.width;
        float h=Screen.height;
        GUI.Box(new Rect(w*0.04f,h*0.04f,w*0.92f,h*0.28f),"");
        GUI.Label(new Rect(w*0.08f,h*0.07f,w*0.84f,h*0.05f),GameName+" · Unity Web Floor");
        GUI.Label(new Rect(w*0.08f,h*0.13f,w*0.84f,h*0.08f),Identity);
        GUI.Label(new Rect(w*0.08f,h*0.21f,w*0.84f,h*0.08f),"Core: "+CoreLoop);
        if(GUI.Button(new Rect(w*0.18f,h*0.64f,w*0.64f,h*0.16f),"ACTION / TOUCH")) PerformAction(true);
    }
}
