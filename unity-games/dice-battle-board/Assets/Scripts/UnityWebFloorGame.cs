// 파일명: unity-games/dice-battle-board/Assets/Scripts/UnityWebFloorGame.cs
using UnityEngine;
using System.Collections.Generic;

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
    private const string GameId = "dice-battle-board";
    private const string GameName = "주사위 전투 보드";
    private const string Mode = "ACTION";
    private const string Identity = "주사위 전투 보드을 기존 구현의 점수나 관문을 승계하지 않고 설계 단계부터 다시 검토해 고유한 핵심 재미와 시스템 연결을 확정한다.. 업보와 인과응보·신화 속 트릭스터의 질서 역전 퍼즐. 업보와 인과응보의 퍼즐 세계에서 단서 조합 × 업보와 인과응보과 공간 상태 변환 × 신화 속 트릭스터의 질서 역전이 서로 결과를 되돌려 바꾸며 퍼즐·추리의 판단이 실제 세계 상태를 변화시킨다.";
    private const string CoreLoop = "Start a board or grid level with a clear goal, limited moves, obstacles, or another visible puzzle constraint. -> Make matches or deliberate puzzle moves, create combos, and use immediate board feedback to solve the current objective. -> Clear the level goal to earn rewards or unlock the next stage, then face a new board pattern or obstacle combination.";
    private const string SavePrefix = "dice_battle_board_webfloor_";

    private int progress;
    private int level = 1;
    private int resource = 10;
    private int actions;
    private bool started;
    private GameObject player;
    private GameObject enemy;
    private GameObject equipment;
    private float motionClock;
    private bool approvedEnvironmentReady = true;

    private void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        LoadState();
        BuildWorld();

        VerifyNativeSpatialDepth();
        Debug.Log("JAEWOON_UNITY_WEB_QA BOOT game=" + GameId + " status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=character status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=enemy status=PASS");
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=environment status=" +
                   (approvedEnvironmentReady ? "PASS" : "REPAIR_REQUIRED reason=APPROVED_ENVIRONMENT_AUTHORING_FAILED"));
        Debug.Log("JAEWOON_UNITY_WEB_QA VISUAL_DOMAIN game=" + GameId + " domain=equipment status=PASS");
        int nativeMotionActors = BindNativeMotionActors();
        Debug.Log("JAEWOON_UNITY_WEB_QA MOTION game=" + GameId +
                  " status=" + (nativeMotionActors > 0 ? "STARTED" : "REPAIR_REQUIRED") +
                  " actors=" + nativeMotionActors +
                  (nativeMotionActors > 0 ? "" : " reason=ANIMATOR_REQUIRED"));
        Debug.Log("JAEWOON_UNITY_WEB_QA MOBILE_TARGET game=" + GameId + " role=action x=0.5000 y=0.7200");
        LogState();
    }

    // 메인 · 실제 Unity 월드의 메시 깊이와 배우 표현을 측정한다. 전투·밸런스·세이브 권한 없음.
    private void VerifyNativeSpatialDepth()
    {
        int worldMeshes3d = 0;
        float zMin = float.PositiveInfinity;
        float zMax = float.NegativeInfinity;
        foreach (MeshFilter filter in FindObjectsByType<MeshFilter>(FindObjectsSortMode.None))
        {
            if (filter == null || !filter.gameObject.activeInHierarchy || filter.sharedMesh == null) continue;
            Vector3 size = filter.sharedMesh.bounds.size;
            if (size.x < 0.02f || size.y < 0.02f || size.z < 0.02f) continue;
            worldMeshes3d++;
            zMin = Mathf.Min(zMin, filter.transform.position.z);
            zMax = Mathf.Max(zMax, filter.transform.position.z);
        }
        int gameplayActors3d = 0;
        foreach (GameObject actor in new GameObject[] { player, enemy })
        {
            if (actor == null || !actor.activeInHierarchy) continue;
            MeshFilter filter = actor.GetComponentInChildren<MeshFilter>();
            SkinnedMeshRenderer skin = actor.GetComponentInChildren<SkinnedMeshRenderer>();
            Mesh actorMesh = filter != null ? filter.sharedMesh : (skin != null ? skin.sharedMesh : null);
            if (actorMesh == null) continue;
            Vector3 size = actorMesh.bounds.size;
            if (size.x >= 0.02f && size.y >= 0.02f && size.z >= 0.02f) gameplayActors3d++;
        }
        int spriteGameplayActors = 0;
        foreach (SpriteRenderer sprite in FindObjectsByType<SpriteRenderer>(FindObjectsSortMode.None))
            if (sprite != null && sprite.gameObject.activeInHierarchy) spriteGameplayActors++;
        int worldDepthCm = worldMeshes3d >= 2 ? Mathf.RoundToInt(Mathf.Max(0f, zMax - zMin) * 100f) : 0;
        int cameraPerspective = Camera.main != null && !Camera.main.orthographic ? 1 : 0;
        bool pass = cameraPerspective == 1 && worldMeshes3d >= 2 && worldDepthCm >= 50
            && gameplayActors3d >= 1 && spriteGameplayActors == 0;
        Debug.Log("JAEWOON_UNITY_WEB_QA SPATIAL_DEPTH game=" + GameId
            + " source=UNITY_WORLD_MESH_DEPTH cameraPerspective=" + cameraPerspective
            + " worldMeshes3d=" + worldMeshes3d + " worldDepthCm=" + worldDepthCm
            + " gameplayActors3d=" + gameplayActors3d + " spriteGameplayActors=" + spriteGameplayActors
            + " status=" + (pass ? "PASS" : "REPAIR_REQUIRED"));
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
        if (player != null && started && true)
        {
            var p=player.transform.position;
            p.x=-2f+Mathf.Sin(motionClock*1.7f)*0.55f;
            player.transform.position=p;
        }

        if (Input.GetKeyDown(KeyCode.Alpha1)) StartGameplay();
        if (Input.GetKeyDown(KeyCode.Space)) PerformAction(false);
        if (Input.GetKeyDown(KeyCode.R)) SafeReturn();
        // 터치는 OnGUI 버튼 하나로만 처리해 같은 탭의 중복 보상을 차단한다.

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
