using UnityEngine;

public sealed class JaewoonNativeMotionActor : MonoBehaviour
{
    private const float FootSlideNormalizedMax = 0.035f;
    private Animator animator;
    private Transform leftFoot;
    private Transform rightFoot;
    private Transform spine;
    private Vector3 lastRootPosition;
    private Vector3 lastLeftFoot;
    private Vector3 lastRightFoot;
    private bool footHistoryReady;
    private float fpsEma = 60f;
    private float footSlideMax;
    private float elapsed;
    private float hitKick;
    private int footSlideSamples;
    private int ikSamples;
    private int contactCount;
    private int hitReactionCount;
    private bool reported;

    private void Awake()
    {
        animator = GetComponent<Animator>();
        if (animator == null) { enabled = false; return; }
        if (animator.isHuman)
        {
            leftFoot = animator.GetBoneTransform(HumanBodyBones.LeftFoot);
            rightFoot = animator.GetBoneTransform(HumanBodyBones.RightFoot);
            spine = animator.GetBoneTransform(HumanBodyBones.Spine);
        }
        lastRootPosition = animator.transform.position;
        Debug.Log("JAEWOON_UNITY_NATIVE_MOTION=START actor=" + gameObject.name.Replace(" ", "_") +
                  " human=" + animator.isHuman + " controller=" + (animator.runtimeAnimatorController != null));
    }

    private static Vector3 Horizontal(Vector3 value)
    {
        return new Vector3(value.x, 0f, value.z);
    }

    private void Update()
    {
        if (animator == null) return;
        float dt = Mathf.Min(Time.unscaledDeltaTime, 0.1f);
        elapsed += dt;
        float instantFps = 1f / Mathf.Max(dt, 1f / 240f);
        fpsEma += (instantFps - fpsEma) * Mathf.Clamp01(dt * 3f);
    }

    private void LateUpdate()
    {
        if (animator == null) return;
        SampleFootSliding();
        if (hitKick > 0.001f && spine != null)
        {
            spine.localRotation = spine.localRotation * Quaternion.Euler(-6f * hitKick, 0f, 0f);
            hitKick *= Mathf.Exp(-Time.unscaledDeltaTime * 10f);
        }
        if (!reported && elapsed >= 6f)
        {
            reported = true;
            string reason = MotionFailureReason();
            string fields = " fps=" + fpsEma.ToString("F1") +
                            " human=" + animator.isHuman +
                            " ikSamples=" + ikSamples +
                            " slide=" + footSlideMax.ToString("F4") +
                            " slideSamples=" + footSlideSamples +
                            " contacts=" + contactCount +
                            " hits=" + hitReactionCount;
            Debug.Log("JAEWOON_UNITY_NATIVE_MOTION=" +
                      (string.IsNullOrEmpty(reason) ? "PASS" : "FAIL reason=" + reason) + fields);
        }
    }

    private void SampleFootSliding()
    {
        if (!animator.isHuman || leftFoot == null || rightFoot == null) return;
        float scale = Mathf.Max(0.5f, animator.humanScale);
        Vector3 rootPosition = animator.transform.position;
        float rootDelta = Horizontal(rootPosition - lastRootPosition).magnitude;
        if (footHistoryReady && rootDelta > 0.002f)
        {
            float leftSlide = FootContactSlide(leftFoot, lastLeftFoot, scale);
            float rightSlide = FootContactSlide(rightFoot, lastRightFoot, scale);
            float best = leftSlide < 0f ? rightSlide : rightSlide < 0f ? leftSlide : Mathf.Min(leftSlide, rightSlide);
            if (best >= 0f)
            {
                footSlideSamples++;
                footSlideMax = Mathf.Max(footSlideMax, best);
            }
        }
        lastRootPosition = rootPosition;
        lastLeftFoot = leftFoot.position;
        lastRightFoot = rightFoot.position;
        footHistoryReady = true;
    }

    private static float FootContactSlide(Transform foot, Vector3 previous, float scale)
    {
        Vector3 origin = foot.position + Vector3.up * (0.35f * scale);
        if (!Physics.Raycast(origin, Vector3.down, out RaycastHit hit, 0.8f * scale, ~0, QueryTriggerInteraction.Ignore))
            return -1f;
        float gap = Mathf.Abs(foot.position.y - hit.point.y);
        if (gap > 0.16f * scale) return -1f;
        return Horizontal(foot.position - previous).magnitude / Mathf.Max(1f, scale * 2f);
    }

    private void OnAnimatorIK(int layerIndex)
    {
        if (animator == null || !animator.isHuman) return;
        ApplyFootIk(AvatarIKGoal.LeftFoot, leftFoot);
        ApplyFootIk(AvatarIKGoal.RightFoot, rightFoot);
    }

    private void ApplyFootIk(AvatarIKGoal goal, Transform foot)
    {
        if (foot == null) return;
        float scale = Mathf.Max(0.5f, animator.humanScale);
        Vector3 origin = foot.position + Vector3.up * (0.45f * scale);
        if (!Physics.Raycast(origin, Vector3.down, out RaycastHit hit, 1.1f * scale, ~0, QueryTriggerInteraction.Ignore))
        {
            animator.SetIKPositionWeight(goal, 0f);
            animator.SetIKRotationWeight(goal, 0f);
            return;
        }
        animator.SetIKPositionWeight(goal, 0.35f);
        animator.SetIKRotationWeight(goal, 0.2f);
        animator.SetIKPosition(goal, hit.point + hit.normal * (0.045f * scale));
        animator.SetIKRotation(goal, Quaternion.FromToRotation(Vector3.up, hit.normal) * foot.rotation);
        ikSamples++;
    }

    public void JaewoonMotionContact() { contactCount++; }
    public void JaewoonMotionHit() { hitReactionCount++; hitKick = 1f; }

    private string MotionFailureReason()
    {
        if (animator == null) return "ANIMATOR_REQUIRED";
        if (!animator.enabled) return "ANIMATOR_DISABLED";
        if (animator.runtimeAnimatorController == null) return "ANIMATOR_CONTROLLER_REQUIRED";
        if (fpsEma < 27f) return "MOBILE_FRAME_FLOOR_30_FAILED";
        if (animator.isHuman)
        {
            if (leftFoot == null || rightFoot == null) return "HUMANOID_FEET_REQUIRED";
            if (ikSamples < 2) return "FOOT_IK_RUNTIME_REQUIRED";
            if (footSlideSamples < 2) return "FOOT_CONTACT_SAMPLE_REQUIRED";
            if (footSlideMax > FootSlideNormalizedMax) return "FOOT_SLIDE_EXCEEDED";
        }
        return "";
    }
}

public sealed class UnityWebFloorGame : MonoBehaviour
{
    private const string GameId = "monster-adventure";
    private const string GameName = "몬스터 어드벤처";
    private const string Mode = "ACTION";
    private const string Identity = "몬스터 어드벤처는 턴제 전략과 탐험이 결합된 모바일 어드벤처 게임으로, 플레이어는 몬스터를 포획하고 육성하며 미지의 세계를 탐험합니다. 핵심 루프는 몬스터의 속성과 스킬을 고려한 전략적 선택을 요구하며, 시그니처 시스템인 '속성 상성 전투'와 '몬스터 진화 트리'는 플레이어에게 매번 다른 전투 양상과 성장 경로를 제공하여 깊이 있는 선택과 상태 변화를 경험하게 합니다.";
    private const string CoreLoop = "탐험 단계: 월드 맵에서 이동하며 몬스터를 조우하거나 자원을 수집하는 선택을 수행합니다. -> 전투 단계: 턴제 전투 시스템을 통해 몬스터의 스킬을 선택하고 속성 상성을 활용하여 적을 제압합니다. -> 성장 단계: 전투 보상으로 얻은 경험치와 재료를 사용하여 몬스터를 레벨업하거나 진화시켜 다음 도전을 준비합니다.";
    private const string SavePrefix = "monster_adventure_webfloor_";

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
        // 실제 모델 바인딩은 확인하지만, 최종 3D·재질·모바일 품질 판정은 브라우저 QA가 한다.
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=character status=SOURCE_BOUND_RUNTIME_UNVERIFIED");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=enemy status=SOURCE_BOUND_RUNTIME_UNVERIFIED");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=environment status=SOURCE_BOUND_RUNTIME_UNVERIFIED");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=equipment status=SOURCE_BOUND_RUNTIME_UNVERIFIED");
        int nativeMotionActors = BindNativeMotionActors();
        Debug.Log("JAEWOON_UNITY_WEB_QA MOTION game=" + GameId +
                  " status=" + (nativeMotionActors > 0 ? "STARTED" : "REPAIR_REQUIRED") +
                  " actors=" + nativeMotionActors +
                  (nativeMotionActors > 0 ? "" : " reason=ANIMATOR_REQUIRED"));
        Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_TARGET game=" + GameId + " role=action x=0.5000 y=0.7200");
        LogState();
    }

    private int BindNativeMotionActors()
    {
        int count = 0;
        foreach (Animator candidate in FindObjectsByType<Animator>(FindObjectsSortMode.None))
        {
            if (candidate == null) continue;
            if (candidate.GetComponent<JaewoonNativeMotionActor>() == null)
                candidate.gameObject.AddComponent<JaewoonNativeMotionActor>();
            count++;
        }
        return count;
    }

    // 그래픽: 사내 라이브러리에서 임포트한 실제 Unity Mesh 장면 객체를 사용한다.
    // 캐릭터·적·상자·지형이 없으면 기본 구/캡슐로 위장하지 않고 검증 실패로 처리한다.
    private void BuildWorld()
    {
        Camera cam=Camera.main;
        if(cam==null)
        {
            var cameraObject=new GameObject("Main Camera");
            cam=cameraObject.AddComponent<Camera>();
            cameraObject.tag="MainCamera";
        }
        cam.orthographic=false;
        cam.transform.position=new Vector3(0f,6.5f,-9f);
        cam.transform.rotation=Quaternion.Euler(24f,0f,0f);
        cam.backgroundColor=new Color(0.32f,0.48f,0.57f);

        if(FindFirstObjectByType<Light>()==null)
        {
            var lightObject=new GameObject("Key Light");
            var light=lightObject.AddComponent<Light>();
            light.type=LightType.Directional;
            light.intensity=1.25f;
            lightObject.transform.rotation=Quaternion.Euler(48f,-28f,0f);
        }

        string[] required={
            "Environment_ACTION","Trail_ACTION","Character_monster-adventure",
            "Enemy_ACTION","Equipment_ACTION","Identity_ACTION",
            "Starter_LeafTurtle","Starter_WaterOtter","Wild_Bat","Wild_Bird",
            "Elite_RockGator","Elite_StormEagle","Tree_Left_Trunk",
            "Tree_Left_Crown","Tree_Right_Trunk","Tree_Right_Crown",
            "World_Rock","World_Lamp"
        };
        int worldMeshes=0;
        int totalTriangles=0;
        foreach(string assetName in required)
        {
            GameObject model=GameObject.Find(assetName);
            if(model==null)throw new System.InvalidOperationException("UNITY_NATIVE_LIBRARY_MODEL_MISSING:"+assetName);
            MeshFilter filter=model.GetComponent<MeshFilter>();
            MeshRenderer renderer=model.GetComponent<MeshRenderer>();
            if(filter==null||filter.sharedMesh==null||filter.sharedMesh.vertexCount<16
               ||filter.sharedMesh.subMeshCount<1||renderer==null||!renderer.enabled
               ||renderer.sharedMaterials.Length!=filter.sharedMesh.subMeshCount)
                throw new System.InvalidOperationException("UNITY_NATIVE_LIBRARY_MESH_UNBOUND:"+assetName);
            foreach(Material material in renderer.sharedMaterials)
                if(material==null||material.shader==null||!material.shader.isSupported)
                    throw new System.InvalidOperationException("UNITY_NATIVE_LIBRARY_MATERIAL_MISSING:"+assetName);
            int triangles=0;
            for(int part=0;part<filter.sharedMesh.subMeshCount;part++)
                triangles+=(int)filter.sharedMesh.GetIndexCount(part)/3;
            if(triangles<16)throw new System.InvalidOperationException("UNITY_NATIVE_LIBRARY_TRIANGLES_MISSING:"+assetName);
            totalTriangles+=triangles;
            worldMeshes++;
        }
        player=GameObject.Find("Character_"+GameId);
        enemy=GameObject.Find("Enemy_"+Mode);
        equipment=GameObject.Find("Equipment_"+Mode);
        Debug.Log("JAEWOON_UNITY_WEB_QA LIBRARY_ASSETS game="+GameId+
                  " source=CANONICAL_IMPORTED_UNITY_MESH models="+worldMeshes+
                  " triangles="+totalTriangles+" status=BOUND_RUNTIME_VALIDATION_PENDING");
    }

    private void Update()
    {
        motionClock += Time.unscaledDeltaTime;
        if (enemy != null)
        {
            enemy.transform.Rotate(0f,55f * Time.unscaledDeltaTime,0f,Space.World);
            var p=enemy.transform.position;
            p.y=0.10f+Mathf.Sin(motionClock*2.1f)*0.08f;
            enemy.transform.position=p;
        }
        if (equipment != null) equipment.transform.rotation=Quaternion.Euler(0f,16f+Mathf.Sin(motionClock*0.7f)*6f,0f);
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
        // 기본 입력·저장 동작은 장르 구현이나 재미의 통과 증거가 아니다.
        Debug.Log("JAEWOON_UNITY_WEB_QA CORE_FUN game=" + GameId + " mode=" + Mode + " status=REPAIR_REQUIRED reason=BOOTSTRAP_ONLY_GAMEPLAY_NOT_IMPLEMENTED");
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
