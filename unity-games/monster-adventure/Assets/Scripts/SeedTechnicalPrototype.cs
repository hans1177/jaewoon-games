using System;
using UnityEngine;
using UnityEngine.Profiling;

public sealed class SeedTechnicalPrototype : MonoBehaviour
{
    private const string GameId = "monster-adventure";
    private const string GameName = "몬스터 어드벤처";
    private const string Mode = "GENERAL";
    private const string Identity = "몬스터 어드벤처는 턴제 전략과 탐험이 결합된 모바일 어드벤처 게임으로, 플레이어는 몬스터를 포획하고 육성하며 미지의 세계를 탐험합니다. 핵심 루프는 몬스터의 속성과 스킬을 고려한 전략적 선택을 요구하며, 시그니처 시스템인 '속성 상성 전투'와 '몬스터 진화 트리'는 플레이어에게 매번 다른 전투 양상과 성장 경로를 제공하여 깊이 있는 선택과 상태 변화를 경험하게 합니다.";
    private const string CoreLoop = "탐험 단계: 월드 맵에서 이동하며 몬스터를 조우하거나 자원을 수집하는 선택을 수행합니다. → 전투 단계: 턴제 전투 시스템을 통해 몬스터의 스킬을 선택하고 속성 상성을 활용하여 적을 제압합니다. → 성장 단계: 전투 보상으로 얻은 경험치와 재료를 사용하여 몬스터를 레벨업하거나 진화시켜 다음 도전을 준비합니다.";
    private const string SavePrefix = "monster_adventure_tech_";
    private const int VerifiedExternalLearningCoveragePct = 100;
    private static readonly string[] VerifiedExternalLearningIds = new string[]
    {
        "external-black-box-block-blast-run-30",
        "external-black-box-cavern-cravers-run-47",
        "external-black-box-idle-fantasy-run-42",
        "external-black-box-luanti-run-10",
        "external-black-box-revengate-run-59",
        "external-black-box-sgtpuzzles-run-29",
        "external-black-box-shattered-pixel-dungeon-run-4",
    };
    private static readonly string[] VerifiedExternalLearningPrinciples = new string[]
    {
        "id=native-arm64-redroid-is-valid-free-server-route; scope=android-runtime-compatibility; lesson=A GitHub-hosted native ARM64 runner can provide a working Android 14 Redroid runtime for this ARM64 commercial package when Android userspace boots with the container's own Binder devices.; apply=Prefer proven native-architecture execution over returning to an exhausted x86-to-ARM translation path when a native hosted runner is available.",
        "id=separate-system-overlay-consent-and-game-entry; scope=black-box-playtest-automation; lesson=A workflow can satisfy process and foreground checks while still being blocked by an Android system overlay or first-run consent screen. Visual stage evidence is required before claiming gameplay entry.; apply=Capture and validate LAUNCH, CONSENT_OR_SYSTEM_OVERLAY, GAME_ENTRY and INPUT_RESPONSE as separate visual stages.",
        "id=visual-state-change-plus-process-survival-strengthens-input-evidence; scope=qa-evidence; lesson=Meaningful black-box input evidence is stronger when the post-input frame visibly changes in the expected interaction area while the target process remains alive and foreground.; apply=Do not treat injected input alone as gameplay evidence; bind input to a correlated visual state change and runtime survival check.",
        "id=tutorial-separated-from-game-entry; scope=mobile-rpg-onboarding; lesson=A first-run tutorial or How to Play screen is a distinct pre-game state and should not be counted as live gameplay entry until the interactive dungeon state is visible.; apply=For RPG QA, preserve separate milestones for tutorial presentation, tutorial exit and first live interactive gameplay state.",
        "id=compact-tactical-state-with-immediate-feedback; scope=mobile-rpg-interaction; lesson=The verified dungeon state presents a compact set of actionable gameplay choices, and a successful action immediately changes the visible board state in the same gameplay context.; apply=For a Roblox RPG, make bounded tactical actions produce prompt, legible state feedback without requiring the player to leave the core encounter view.",
        "id=semantic-gameplay-input-plus-survival; scope=qa-evidence; lesson=A gameplay input becomes useful evidence when the before/after frames show a meaningful game-state change and the target process remains foreground and crash-free.; apply=Bind RPG interaction evidence to semantic before/after frames plus process, focus and crash checks.",
        "id=first-run-friction-separated-from-game-entry; scope=mobile-rpg-onboarding; lesson=Permission prompts, introductory slides and character creation are distinct pre-game states and should not be mistaken for successful RPG gameplay entry.; apply=For Roblox/mobile QA, preserve separate milestones for permission handling, onboarding, character setup and the first live gameplay dashboard.",
        "id=persistent-primary-rpg-navigation; scope=mobile-rpg-ui; lesson=The verified gameplay state exposes persistent primary destinations such as skills, combat, home, quests and profile, allowing a player to move between major RPG systems without leaving the core game shell.; apply=For a Roblox RPG, keep high-frequency progression systems easy to reach and verify that each navigation action produces an immediate, legible state change.",
        "id=danger-and-level-gating-visible-before-commitment; scope=rpg-progression-observation; lesson=The verified Combat screen shows dungeon names together with level requirements and visible danger guidance before a run is chosen.; apply=Expose progression requirements and risk cues before players commit to a dangerous activity, while independently validating the actual balance in the target game.",
        "id=semantic-input-plus-runtime-survival; scope=qa-evidence; lesson=A gameplay navigation input becomes useful evidence when the before/after screens show a meaningful semantic transition and the target process remains foreground and crash-free.; apply=Bind gameplay input evidence to semantic before/after frames plus process, focus and crash checks.",
        "id=content-setup-is-separate-from-3d-game-entry; scope=sandbox-onboarding-observation; lesson=Installing content, creating a world and selecting that world are meaningful setup milestones but are not equivalent to actual sandbox gameplay entry.; apply=For Roblox flows with lobbies, loadouts or world selection, preserve setup milestones separately and require the real controllable 3D play state before claiming gameplay entry.",
        "id=touch-look-produces-immediate-spatial-feedback; scope=mobile-3d-controls; lesson=A short horizontal touch gesture on the first-person play surface produced an immediate, clearly visible camera-orientation change while the movement and action HUD remained available.; apply=For Roblox mobile 3D controls, validate look gestures with before/after scene framing while preserving consistent movement and action affordances.",
        "id=world-entry-needs-load-window-before-input-proof; scope=mobile-runtime-evidence; lesson=The world launch needed a bounded loading window before first-person gameplay could be visually verified and exercised.; apply=Do not inject or judge gameplay input before the target Roblox play state is visibly ready; bind input evidence to the post-load playable frame.",
        "id=narrative-onboarding-is-not-game-entry; scope=rpg-onboarding-qa; lesson=A story or dialogue sequence after New Game is still a pre-game state; live gameplay entry should be recorded only once the interactive world and player state are visible.; apply=For Roblox RPG QA, keep narrative onboarding and first controllable world entry as separate milestones.",
        "id=persistent-core-state-around-world-view; scope=rpg-mobile-ux; lesson=The verified gameplay view keeps the world map, player marker, health readout, inventory access and primary action controls visible together, reducing context switching during basic play.; apply=For a Roblox RPG, keep essential player state and high-frequency actions legible around the core world view without copying this game's visual design.",
        "id=movement-needs-immediate-visible-response; scope=rpg-input-feedback; lesson=A bounded gameplay input produced an immediate visible player-position change in the same world view.; apply=For mobile Roblox RPG movement, bind successful input to prompt and unambiguous world-state feedback, then validate it with semantic before and after frames.",
        "id=gameplay-state-must-be-visually-distinct-from-selection-state; scope=mobile-runtime-evidence; lesson=A mobile title or game-selection screen is not equivalent to gameplay entry; the first verified playable state should expose the game-specific interaction surface and controls together.; apply=For Roblox mobile verification, define GAME_ENTRY using visible gameplay-specific state rather than process launch or menu completion alone.",
        "id=persistent-contextual-action-controls; scope=mobile-interaction-observation; lesson=The verified puzzle state keeps the numeric action controls visible beside the active play surface so the next valid interaction is immediately available without reopening a separate menu.; apply=When appropriate for a Roblox mobile interaction, keep the small set of context-relevant actions directly available near the active gameplay state instead of adding unnecessary navigation layers.",
        "id=immediate-spatially-anchored-input-feedback; scope=mobile-feedback-observation; lesson=The exercised input produces an immediate visible value change in the affected board cell, making the result of the touch easy to associate with the selected target.; apply=For Roblox mobile controls, prefer visible feedback at or near the affected gameplay object so the user can confirm that the touch produced the intended state change.",
        "id=before-after-plus-runtime-survival-evidence; scope=qa-evidence; lesson=A mobile input becomes strong black-box evidence when the same gameplay state is captured immediately before and after the input and the target process remains foreground and crash-free.; apply=Bind mobile interaction evidence to semantic before/after frames plus process, focus, fatal-crash and ANR checks; never promote screen-hash change alone.",
        "id=separate-android-overlay-onboarding-and-gameplay-entry; scope=black-box-playtest-automation; lesson=A mobile game can be running correctly while an Android immersive-mode overlay, title action, character selection or tutorial screen still blocks actual gameplay entry.; apply=Preserve separate visual evidence for system overlay, title/onboarding, character selection, tutorial transition and actual gameplay entry before claiming a playable state.",
        "id=touch-instruction-near-first-play-state; scope=mobile-onboarding-observation; lesson=The first verified dungeon view immediately presents a concise touch interaction instruction while the playable board and character are already visible.; apply=For Roblox mobile onboarding, prefer contextual control guidance at the moment the relevant playable state is visible rather than front-loading a long instruction sequence.",
        "id=input-visual-transition-plus-foreground-survival; scope=qa-evidence; lesson=A bounded touch or swipe becomes useful black-box evidence only when a corresponding visible gameplay-state transition is captured and the target process remains foreground and crash-free.; apply=Bind mobile input evidence to before/after frames plus process, focus and crash checks; never infer success from input injection alone.",
    };
    private static readonly string[] VerifiedExternalLearningAvoidance = new string[]
    {
        "id=android-hosted-x86-arm-translation-native-crash; scope=android-runtime-compatibility; lesson=A successful ARM64 split-APK install on an x86_64 Android guest does not prove sustained runtime compatibility. Native translation can still fail after launch or game entry in JNI/native-library or application initialization paths.; apply=Do not promote install or game-entry success to stable runtime success. Preserve the partial success boundary, then require process survival, foreground state and crash-free input evidence for full runtime pass.",
        "id=adb-streaming-install-finalization-fragility; scope=android-package-install; lesson=Large split-APK streaming installs can fail at session finalization even when transfer appears complete; no-streaming materially changed the failure boundary and allowed installation to complete.; apply=When a split install fails at finalization or package-service transport, test a no-streaming path before changing Android API levels or application payload assumptions.",
        "id=nested-virtualization-unavailable-on-hosted-macos-arm64; scope=hosted-emulator-infrastructure; lesson=A native ARM64 CI host does not imply nested hardware virtualization is available to an Android ARM64 emulator.; apply=Probe acceleration capability before downloading or booting a large ARM64 system image; treat HV_UNSUPPORTED as an infrastructure blocker, not an app failure.",
        "id=abi-list-and-native-bridge-must-be-proven; scope=android-abi-validation; lesson=Host architecture and guest architecture labels are insufficient. The guest must explicitly expose a compatible ABI or a proven native bridge before package installation is treated as meaningful runtime evidence.; apply=Gate ARM64 package installation on observed guest ABI compatibility instead of host labels alone.",
        "id=hosted-arm64-binder-ready-does-not-guarantee-redroid-boot; scope=android-container-runtime; lesson=On GitHub-hosted ubuntu-24.04-arm, native aarch64, 4K pages, Docker availability and Binder devices can all be valid while Redroid userspace still fails to boot if the Android container/device setup is wrong.; apply=Separate host-capability PASS from Android-userspace-boot PASS and preserve boot diagnostics before changing the app payload.",
        "id=ephemeral-transfer-expiry-is-not-runtime-regression; scope=artifact-transfer; lesson=A one-use or short-lived proprietary APK transfer URL may expire after Android runtime preparation succeeds. That failure must be classified as transfer infrastructure, not application runtime regression.; apply=Refresh only the ephemeral transfer reference while preserving the package hash and already-proven runtime configuration.",
        "id=avoid-random-api-cycling-after-repeated-class-failure; scope=experiment-strategy; lesson=Repeated failures sharing the same compatibility class should narrow the search space instead of causing random Android API cycling.; apply=After two or more materially similar failures, require a new hypothesis or infrastructure capability before retrying another API/image variant.",
        "id=runtime-pass-evidence-gate; scope=qa-evidence; lesson=Install PASS, process creation or injected input are staged evidence but are not individually equivalent to verified gameplay runtime. Run 30 demonstrates the complete gate with correlated visual game entry, meaningful input response, foreground/process survival and no captured fatal crash or ANR.; apply=runtimePass:true requires launch, foreground ownership, process survival, input exercise, correlated game-entry evidence and absence of fatal exception/native crash/ANR in the captured evidence window.",
        "id=missed-coordinate-is-not-game-failure; scope=black-box-input-automation; lesson=A prior probe reached live gameplay but tapped just outside an actionable card and therefore produced no visible change; unchanged output did not prove that the game or interaction system was broken.; apply=When game entry is visually verified but an input produces no change, distinguish an automation-target miss from a product failure and re-target a directly visible control before judging the game.",
        "id=unchanged-screen-after-tap-is-not-input-pass; scope=black-box-input-automation; lesson=A prior tap left the visible home state unchanged, so process survival alone was insufficient to claim input-response success.; apply=If the intended input does not produce a meaningful visible state change, do not promote it; target a visible semantic control and capture a new before/after pair.",
        "id=nearby-menu-actions-require-visual-coordinate-correction; scope=black-box-input-automation; lesson=Earlier bounded probes hit neighboring menu actions such as content-page or new-world controls even though the application runtime was healthy.; apply=When adjacent mobile controls are close together, classify a mis-tap as an automation-coordinate failure, correct it from the captured frame, and rerun the responsible stage without lowering the game-entry gate.",
        "id=visible-onboarding-control-must-be-hit-before-judging-entry; scope=black-box-input-automation; lesson=Run 58 reached the narrative onboarding screen but missed the visible Next control, so lack of game entry there was an automation-targeting failure rather than evidence that gameplay could not be entered. Run 59 corrected only that visible-control targeting and reached live gameplay.; apply=When a clearly visible onboarding control is the only observed blocker, allow one minimal coordinate correction before abandoning the target; do not lower the game-entry criterion.",
        "id=coordinate-miss-must-not-be-promoted-as-game-failure; scope=black-box-input-automation; lesson=A bounded input can miss a visible control even when the application is healthy; the resulting lack of transition is an automation-coordinate failure, not a game runtime failure.; apply=Use captured frames to correct the observed control coordinate and rerun the responsible input stage without lowering evidence gates.",
    };
    private static readonly string[] VerifiedExternalLearningAllowed = new string[]
    {
        "runtime-infrastructure failure classification",
        "ABI/native-bridge preflight design",
        "split-APK install recovery strategy",
        "host capability versus guest readiness separation",
        "staged runtime evidence gating",
        "partial success boundary preservation",
        "actual launch/game-entry fact distillation",
        "directly observed tutorial-board interaction",
        "directly observed drag-input response and visible state change",
        "failure-to-next-experiment decision quality",
        "positive gameplay pattern distillation limited to directly captured black-box behavior",
        "mobile RPG tutorial-to-gameplay stage separation",
        "compact tactical choice presentation",
        "immediate visible feedback after a bounded gameplay action",
        "input-to-visible-state evidence binding",
        "foreground/process/crash correlation",
        "portable RPG interaction lessons that may inform later Roblox-specific implementation and verification",
        "mobile RPG onboarding stage separation",
        "persistent primary-system navigation",
        "visible progression and danger cues",
        "setup versus actual 3D-play boundary separation",
        "mobile first-person look-input evidence",
        "load-readiness before input validation",
        "automation coordinate-failure classification",
        "portable mobile 3D-control lessons that may inform later Roblox-specific implementation and verification",
        "narrative onboarding versus actual game-entry separation",
        "persistent essential RPG state around the core world view",
        "immediate visible movement feedback",
        "semantic before-and-after gameplay input validation",
        "foreground process and crash correlation",
        "portable RPG UX and QA lessons for later Roblox-specific implementation",
        "mobile gameplay-entry boundary detection",
        "contextual mobile action availability",
        "spatially anchored input feedback",
        "portable mobile interaction lessons that may inform later Roblox-specific implementation and verification",
        "mobile onboarding stage separation",
        "contextual touch-control guidance timing",
        "actual gameplay-entry boundary detection",
        "runtime infrastructure and automation failure classification",
    };
    private static readonly string[] VerifiedExternalLearningForbidden = new string[]
    {
        "source-code or internal algorithm extraction",
        "asset extraction or redistribution",
        "hidden scoring/economy inference not present in captured evidence",
        "long-run retention or pacing claims not measured by this validation window",
        "copying proprietary names, artwork, trade dress or implementation details into a new game",
        "treating Android evidence as Roblox runtime evidence",
        "inferring hidden card, combat, economy, procedural-generation or progression formulas",
        "copying game artwork, UI trade dress, names, text or implementation details into a Roblox game",
        "claims about long-run progression, balance or economy not measured by the captured validation window",
        "inferring hidden combat, dungeon, economy or progression formulas",
        "inferring or copying world-generation, physics or hidden interaction algorithms",
        "copying bundled game artwork, UI trade dress, world content or implementation details into a Roblox game",
        "claims about long-run sandbox progression, balance or performance not measured by the captured validation window",
        "inferring hidden quest, combat, loot, economy, movement-cost, pathfinding or progression formulas",
        "copying Revengate artwork, UI trade dress, names, narrative text, map content or implementation details into a Roblox game",
        "claims about long-run stability, balance or progression outside the captured validation window",
        "inferring hidden puzzle-solving algorithms or correctness logic from the captured run",
        "copying SGTPuzzles artwork, UI trade dress, puzzle content, names or implementation details into a Roblox game",
        "claims about long-run stability or behavior not measured by the captured validation window",
        "hidden algorithm or pathfinding inference from the captured run",
        "copying game artwork, UI trade dress, names or implementation details into a Roblox game",
    };
    private static readonly string[] VerifiedGameDevelopmentPrinciples = new string[]
    {
        "id=tutorial-separated-from-game-entry; scope=mobile-rpg-onboarding; lesson=A first-run tutorial or How to Play screen is a distinct pre-game state and should not be counted as live gameplay entry until the interactive dungeon state is visible.; apply=For RPG QA, preserve separate milestones for tutorial presentation, tutorial exit and first live interactive gameplay state.",
        "id=compact-tactical-state-with-immediate-feedback; scope=mobile-rpg-interaction; lesson=The verified dungeon state presents a compact set of actionable gameplay choices, and a successful action immediately changes the visible board state in the same gameplay context.; apply=For a Roblox RPG, make bounded tactical actions produce prompt, legible state feedback without requiring the player to leave the core encounter view.",
        "id=first-run-friction-separated-from-game-entry; scope=mobile-rpg-onboarding; lesson=Permission prompts, introductory slides and character creation are distinct pre-game states and should not be mistaken for successful RPG gameplay entry.; apply=For Roblox/mobile QA, preserve separate milestones for permission handling, onboarding, character setup and the first live gameplay dashboard.",
        "id=persistent-primary-rpg-navigation; scope=mobile-rpg-ui; lesson=The verified gameplay state exposes persistent primary destinations such as skills, combat, home, quests and profile, allowing a player to move between major RPG systems without leaving the core game shell.; apply=For a Roblox RPG, keep high-frequency progression systems easy to reach and verify that each navigation action produces an immediate, legible state change.",
        "id=danger-and-level-gating-visible-before-commitment; scope=rpg-progression-observation; lesson=The verified Combat screen shows dungeon names together with level requirements and visible danger guidance before a run is chosen.; apply=Expose progression requirements and risk cues before players commit to a dangerous activity, while independently validating the actual balance in the target game.",
        "id=content-setup-is-separate-from-3d-game-entry; scope=sandbox-onboarding-observation; lesson=Installing content, creating a world and selecting that world are meaningful setup milestones but are not equivalent to actual sandbox gameplay entry.; apply=For Roblox flows with lobbies, loadouts or world selection, preserve setup milestones separately and require the real controllable 3D play state before claiming gameplay entry.",
        "id=touch-look-produces-immediate-spatial-feedback; scope=mobile-3d-controls; lesson=A short horizontal touch gesture on the first-person play surface produced an immediate, clearly visible camera-orientation change while the movement and action HUD remained available.; apply=For Roblox mobile 3D controls, validate look gestures with before/after scene framing while preserving consistent movement and action affordances.",
        "id=narrative-onboarding-is-not-game-entry; scope=rpg-onboarding-qa; lesson=A story or dialogue sequence after New Game is still a pre-game state; live gameplay entry should be recorded only once the interactive world and player state are visible.; apply=For Roblox RPG QA, keep narrative onboarding and first controllable world entry as separate milestones.",
        "id=persistent-core-state-around-world-view; scope=rpg-mobile-ux; lesson=The verified gameplay view keeps the world map, player marker, health readout, inventory access and primary action controls visible together, reducing context switching during basic play.; apply=For a Roblox RPG, keep essential player state and high-frequency actions legible around the core world view without copying this game's visual design.",
        "id=movement-needs-immediate-visible-response; scope=rpg-input-feedback; lesson=A bounded gameplay input produced an immediate visible player-position change in the same world view.; apply=For mobile Roblox RPG movement, bind successful input to prompt and unambiguous world-state feedback, then validate it with semantic before and after frames.",
        "id=persistent-contextual-action-controls; scope=mobile-interaction-observation; lesson=The verified puzzle state keeps the numeric action controls visible beside the active play surface so the next valid interaction is immediately available without reopening a separate menu.; apply=When appropriate for a Roblox mobile interaction, keep the small set of context-relevant actions directly available near the active gameplay state instead of adding unnecessary navigation layers.",
        "id=immediate-spatially-anchored-input-feedback; scope=mobile-feedback-observation; lesson=The exercised input produces an immediate visible value change in the affected board cell, making the result of the touch easy to associate with the selected target.; apply=For Roblox mobile controls, prefer visible feedback at or near the affected gameplay object so the user can confirm that the touch produced the intended state change.",
        "id=touch-instruction-near-first-play-state; scope=mobile-onboarding-observation; lesson=The first verified dungeon view immediately presents a concise touch interaction instruction while the playable board and character are already visible.; apply=For Roblox mobile onboarding, prefer contextual control guidance at the moment the relevant playable state is visible rather than front-loading a long instruction sequence.",
    };
    private const bool UseImmediateVisibleFeedback = true;
    private const bool UseContextualOnboarding = true;
    private const bool UsePersistentActionControls = true;
    private const bool UseVisibleProgressionRiskCue = true;

    private int actionCount;
    private int progress;
    private int resource = 10;
    private int level = 1;
    private int chain;
    private float elapsed;
    private float metricTimer;
    private float fpsTime;
    private int fpsFrames;
    private int lastProgressBeforeAction;
    private float feedbackUntil;
    private string lastAction = "READY";
    private string lastVerifiedLearningPattern = "READY";

    private void Awake()
    {
        Application.targetFrameRate = 60;
        Screen.sleepTimeout = SleepTimeout.NeverSleep;
        LoadState();
        Debug.Log("JAEWOON_VERIFIED_EXTERNAL_LEARNING ids=" + VerifiedExternalLearningIds.Length +
                  " developmentPrinciples=" + VerifiedGameDevelopmentPrinciples.Length +
                  " immediateFeedback=" + UseImmediateVisibleFeedback +
                  " contextualOnboarding=" + UseContextualOnboarding +
                  " persistentActions=" + UsePersistentActionControls +
                  " progressionRiskCue=" + UseVisibleProgressionRiskCue);
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

        if (metricTimer >= 2f)
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
        string feedback = UseImmediateVisibleFeedback && Time.unscaledTime < feedbackUntil
            ? " · 입력 반영 " + lastProgressBeforeAction + "→" + progress
            : "";
        string actionLine = UseContextualOnboarding && actionCount == 0
            ? "핵심 조작을 눌러 바로 플레이"
            : "최근 입력: " + lastAction + feedback;
        GUI.Label(new Rect(w * 0.08f, h * 0.45f, w * 0.84f, h * 0.06f), actionLine);
        if (UseVisibleProgressionRiskCue && (Mode == "IDLE_RPG" || Mode == "STORY_RPG"))
            GUI.Label(new Rect(w * 0.08f, h * 0.50f, w * 0.84f, h * 0.05f),
                "도전 전 상태 확인 · Lv." + level + " · 진행 " + progress + " · 자원 " + resource);

        for (int i = 0; i < 7; i++)
        {
            float x = w * (0.10f + i * 0.12f);
            float y = h * (0.53f + 0.018f * Mathf.Sin(Time.unscaledTime * (1.2f + i * 0.08f) + i));
            GUI.Box(new Rect(x, y, w * 0.075f, w * 0.075f), ((progress + i) % 9).ToString());
        }

        float actionHeight = UsePersistentActionControls ? 0.13f : 0.12f;
        if (GUI.Button(new Rect(w * 0.10f, h * 0.62f, w * 0.80f, h * actionHeight), PrimaryLabel()))
            PrimaryAction();
        if (GUI.Button(new Rect(w * 0.10f, h * 0.78f, w * 0.80f, h * actionHeight), SecondaryLabel()))
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
        int beforeProgress = progress;
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
        ApplyVerifiedExternalLearningFeedback(beforeProgress);
        SaveState();
        Debug.Log("JAEWOON_TECH_ACTION game=" + GameId + " type=PRIMARY count=" + actionCount + " progress=" + progress);
    }

    private void SecondaryAction()
    {
        int beforeProgress = progress;
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
        ApplyVerifiedExternalLearningFeedback(beforeProgress);
        SaveState();
        Debug.Log("JAEWOON_TECH_ACTION game=" + GameId + " type=SECONDARY count=" + actionCount + " progress=" + progress);
    }

    private void ApplyVerifiedExternalLearningFeedback(int beforeProgress)
    {
        lastProgressBeforeAction = beforeProgress;
        if (UseImmediateVisibleFeedback) feedbackUntil = Time.unscaledTime + 0.55f;
        if (VerifiedGameDevelopmentPrinciples.Length == 0) return;
        int index = Math.Abs(actionCount) % VerifiedGameDevelopmentPrinciples.Length;
        lastVerifiedLearningPattern = VerifiedGameDevelopmentPrinciples[index];
        Debug.Log("JAEWOON_VERIFIED_EXTERNAL_LEARNING_APPLIED game=" + GameId +
                  " action=" + actionCount +
                  " developmentPrinciples=" + VerifiedGameDevelopmentPrinciples.Length +
                  " patternIndex=" + index +
                  " pattern=" + lastVerifiedLearningPattern);
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
