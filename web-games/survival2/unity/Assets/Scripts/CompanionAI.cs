// 파일명: Assets/Scripts/CompanionAI.cs
using UnityEngine;

public class CompanionAI : MonoBehaviour
{
    public Transform Player;
    public float FollowDistance = 1.25f;
    public float FollowSpeed = 3f;
    public float AttackRange = 2.5f;
    public float AttackInterval = 1.2f;

    private float attackTimer;

    private void Update()
    {
        if (Player == null) return;
        Vector2 delta = Player.position - transform.position;
        if (delta.magnitude > FollowDistance)
            transform.position = Vector2.MoveTowards(transform.position, Player.position, FollowSpeed * Time.deltaTime);
        attackTimer = Mathf.Max(0f, attackTimer - Time.deltaTime);
    }

    public bool CanAttack(Vector2 target)
    {
        return attackTimer <= 0f && Player != null && Vector2.Distance(transform.position, target) <= AttackRange;
    }

    public void ConsumeAttackCooldown() => attackTimer = AttackInterval;
}
