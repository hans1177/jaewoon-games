// 파일명: Assets/Scripts/DaySaveSystem.cs
using UnityEngine;

public class DaySaveSystem : MonoBehaviour
{
    public static DaySaveSystem Instance { get; private set; }
    public Survival2State State { get; private set; } = new Survival2State();
    private const string SaveKey = "jaewoon-survival2-v3";
    private int savedDay = 1;

    private void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
        Load();
        savedDay = State.day;
    }

    public void SetState(Survival2State next) => State = next ?? new Survival2State();

    public void OnTimeChanged(int newDay)
    {
        State.day = newDay;
        if (newDay != savedDay)
        {
            Save();
            savedDay = newDay;
        }
    }

    public void Save()
    {
        PlayerPrefs.SetString(SaveKey, JsonUtility.ToJson(State));
        PlayerPrefs.Save();
    }

    public void Load()
    {
        if (!PlayerPrefs.HasKey(SaveKey)) return;
        try { JsonUtility.FromJsonOverwrite(PlayerPrefs.GetString(SaveKey), State); }
        catch { State = new Survival2State(); }
    }
}
