using UnrealBuildTool;

public class Vibe2AutoPlayerRuntime : ModuleRules
{
    public Vibe2AutoPlayerRuntime(ReadOnlyTargetRules Target) : base(Target)
    {
        PrivateDependencyModuleNames.AddRange(new[] {
            "Core", "CoreUObject", "Engine", "InputCore", "Json", "AutomationDriver"
        });
    }
}
