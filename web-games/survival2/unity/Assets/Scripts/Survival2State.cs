// 파일명: Assets/Scripts/Survival2State.cs
using System;
using UnityEngine;

[Serializable]
public class Survival2State
{
    public int version = 3;
    public string name = "재운";
    public int day = 1;
    public float time = 480f;
    public float hp = 100f;
    public float maxHp = 100f;
    public int wood;
    public int stone;
    public int fiber;
    public int meat;
    public string weapon = "맨손";
    public int weaponBonus;
    public int story;
    public int kills;
    public bool bossAlpha;
    public bool bossGuardian;
    public bool bossCore;
    public string companion = "";
    public int companionHp;
    public int yunaRomance;
    public int seraRomance;
    public int miraRomance;
    public int riaRomance;
}
