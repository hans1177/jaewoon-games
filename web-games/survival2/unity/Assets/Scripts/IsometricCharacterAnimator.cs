// 파일명: Assets/Scripts/IsometricCharacterAnimator.cs
using UnityEngine;

public class IsometricCharacterAnimator : MonoBehaviour
{
    public Animator Animator;
    public Transform Visual;
    public float MoveDeadzone = 0.05f;

    private Vector2 lastDirection = Vector2.down;

    public void SetMovement(Vector2 input)
    {
        if (input.sqrMagnitude > MoveDeadzone * MoveDeadzone)
            lastDirection = input.normalized;

        Animator.SetFloat("MoveX", lastDirection.x);
        Animator.SetFloat("MoveY", lastDirection.y);
        Animator.SetFloat("Speed", input.magnitude);
    }

    public void SetAttacking(bool value) => Animator.SetBool("Attack", value);
    public void SetHit(bool value) => Animator.SetTrigger("Hit");
}
