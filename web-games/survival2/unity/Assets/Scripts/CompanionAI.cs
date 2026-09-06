// 파일명: Assets/Scripts/CompanionAI.cs
// 동료: 여성 파티원 추적 / 전투 거리 유지 / 아이소메트릭 애니메이션 연동
using UnityEngine;

[RequireComponent(typeof(IsometricCharacterAnimator))]
public class CompanionAI : MonoBehaviour
{
    public Transform Player;
    public float FollowDistance = 1.25f;
    public float FollowSpeed = 3f;
    public float AttackRange = 2.5f;
    public float AttackInterval = 1.2f;

    private float attackTimer;
    private IsometricCharacterAnimator characterAnimator;

    private void Awake()
    {
        characterAnimator = GetComponent<IsometricCharacterAnimator>();
    }

    private void Update()
    {
        if (Player == null) return;

        Vector2 before = transform.position;
        Vector2 delta = (Vector2)Player.position - before;
        Vector2 movement = Vector2.zero;

        if (delta.magnitude > FollowDistance)
        {
            Vector2 next = Vector2.MoveTowards(before, Player.position, FollowSpeed * Time.deltaTime);
            transform.position = next;
            movement = (next - before) / Mathf.Max(Time.deltaTime, 0.0001f);
            if (movement.sqrMagnitude > 1f) movement.Normalize();
        }

        characterAnimator.SetMovement(movement);
        attackTimer = Mathf.Max(0f, attackTimer - Time.deltaTime);
    }

    public bool CanAttack(Vector2 target)
    {
        return attackTimer <= 0f && Player != null && Vector2.Distance(transform.position, target) <= AttackRange;
    }

    public void ConsumeAttackCooldown() => attackTimer = AttackInterval;
}
