// 파일명: Assets/Scripts/IsometricCharacterAnimator.cs
// 그래픽: 1번 2DPIXX Warrior 원본 PNG / 128x160 / 4방향 / Idle-Walk-Attack
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

[RequireComponent(typeof(SpriteRenderer))]
public class IsometricCharacterAnimator : MonoBehaviour
{
    [Header("캐릭터")]
    public bool PlayerControlled;
    public float MoveSpeed = 3f;
    public float MoveDeadzone = 0.05f;

    [Header("애니메이션")]
    public float IdleFrameTime = 0.22f;
    public float WalkFrameTime = 0.14f;
    public float AttackFrameTime = 0.10f;

    private static readonly string IdleUrl = "https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_warrior_character_size_128x160_isometric_-_idle.png";
    private static readonly string WalkUrl = "https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_warrior_character_size_128x160_isometric_-_walk.png";
    private static readonly string AttackUrl = "https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_warrior_character_size_128x160_isometric_-_attack.png";

    private readonly Sprite[] idleFrames = new Sprite[16];
    private readonly Sprite[] walkFrames = new Sprite[16];
    private readonly Sprite[] attackFrames = new Sprite[16];
    private SpriteRenderer spriteRenderer;
    private Vector2 lastDirection = Vector2.down;
    private Vector2 movement;
    private float animationClock;
    private float attackClock;
    private bool attacking;
    private bool ready;

    private void Awake()
    {
        spriteRenderer = GetComponent<SpriteRenderer>();
        StartCoroutine(LoadSheets());
    }

    private void Update()
    {
        if (PlayerControlled)
        {
            movement = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            if (movement.sqrMagnitude > 1f) movement.Normalize();
            transform.position += (Vector3)(movement * MoveSpeed * Time.deltaTime);
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0)) TriggerAttack();
        }

        if (movement.sqrMagnitude > MoveDeadzone * MoveDeadzone)
            lastDirection = movement.normalized;

        if (attacking)
        {
            attackClock -= Time.deltaTime;
            if (attackClock <= 0f)
            {
                attacking = false;
                animationClock = 0f;
            }
        }

        Animate();
        movement = Vector2.zero;
    }

    public void SetMovement(Vector2 input)
    {
        movement = input;
        if (input.sqrMagnitude > MoveDeadzone * MoveDeadzone)
            lastDirection = input.normalized;
    }

    public void SetAttacking(bool value)
    {
        if (value) TriggerAttack();
    }

    public void SetHit(bool value)
    {
        if (value) animationClock = 0f;
    }

    public void TriggerAttack()
    {
        if (!ready || attacking) return;
        attacking = true;
        attackClock = AttackFrameTime * 4f;
        animationClock = 0f;
    }

    private void Animate()
    {
        if (!ready) return;
        animationClock += Time.deltaTime;
        int row = DirectionRow(lastDirection);
        int frame;
        Sprite[] frames;

        if (attacking)
        {
            frame = Mathf.Min(3, Mathf.FloorToInt(animationClock / AttackFrameTime));
            frames = attackFrames;
        }
        else if (movement.sqrMagnitude > MoveDeadzone * MoveDeadzone)
        {
            frame = Mathf.FloorToInt(animationClock / WalkFrameTime) % 4;
            frames = walkFrames;
        }
        else
        {
            frame = Mathf.FloorToInt(animationClock / IdleFrameTime) % 4;
            frames = idleFrames;
        }

        spriteRenderer.sprite = frames[row * 4 + frame];
    }

    private static int DirectionRow(Vector2 direction)
    {
        if (Mathf.Abs(direction.x) >= Mathf.Abs(direction.y))
            return direction.x >= 0f ? 1 : 3;
        return direction.y >= 0f ? 0 : 2;
    }

    private IEnumerator LoadSheets()
    {
        yield return StartCoroutine(LoadSheet(IdleUrl, idleFrames));
        yield return StartCoroutine(LoadSheet(WalkUrl, walkFrames));
        yield return StartCoroutine(LoadSheet(AttackUrl, attackFrames));
        ready = idleFrames[0] != null && walkFrames[0] != null && attackFrames[0] != null;
    }

    private IEnumerator LoadSheet(string url, Sprite[] target)
    {
        using (UnityWebRequest request = UnityWebRequestTexture.GetTexture(url))
        {
            yield return request.SendWebRequest();
            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogWarning($"생존2 캐릭터 에셋 로드 실패: {request.error}");
                yield break;
            }

            Texture2D texture = DownloadHandlerTexture.GetContent(request);
            texture.filterMode = FilterMode.Point;
            texture.wrapMode = TextureWrapMode.Clamp;
            for (int row = 0; row < 4; row++)
            {
                for (int col = 0; col < 4; col++)
                {
                    Rect rect = new Rect(col * 128, (3 - row) * 160, 128, 160);
                    target[row * 4 + col] = Sprite.Create(texture, rect, new Vector2(0.5f, 0.08f), 80f);
                }
            }
        }
    }
}
