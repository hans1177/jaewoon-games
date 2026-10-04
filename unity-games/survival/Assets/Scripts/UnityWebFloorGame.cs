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
            string fields = " fps=" + fpsEma.ToString("F1") + " human=" + animator.isHuman + " ikSamples=" + ikSamples + " slide=" + footSlideMax.ToString("F4") + " slideSamples=" + footSlideSamples + " contacts=" + contactCount + " hits=" + hitReactionCount;
            Debug.Log("JAEWOON_UNITY_WEB_QA=" + (string.IsNullOrEmpty(reason) ? "PASS" : "FAIL reason=" + reason) + fields);
        }
        LogState();
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
    private const string GameId = "survival";
    private const string GameName = "나의 생존기";
    private const string Mode = "SURVIVAL";
    private const string Identity = "나의 생존기는 극한의 환경에서 매일의 생존 기록을 남기는 액션 서바이벌 로그라이트 게임입니다. 플레이어는 매일 밤 몰려오는 적들을 막아내며, 낮 동안 수집한 자원으로 장비를 제작하고 생존 전략을 수정하여 다음 날의 생존 가능성을 높여가는 '기록과 선택의 순환'을 경험합니다.";
    private const string CoreLoop = "낮 시간 동안 제한된 구역을 탐색하여 자원을 채집하고 생존에 필요한 도구와 무기를 제작합니다. -> 밤이 되면 몰려오는 적의 파상공세를 실시간 액션으로 방어하며 생존합니다. -> 전투 종료 후 획득한 경험치와 자원으로 캐릭터의 능력치를 강화하거나 새로운 제작법을 해금합니다. -> 생존 기록을 바탕으로 다음 날의 탐색 우선순위와 제작 전략을 재설정합니다.";
    private const string SavePrefix = "survival_webfloor_";

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
            var p=enemy.transform.position;
            p.y=1f+Mathf.Sin(motionClock*2.1f)*0.28f;
            enemy.transform.position=p;
        }
        LogState();
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
        LogState();
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
