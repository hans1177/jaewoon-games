#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "Misc/FileHelper.h"
#include "HAL/PlatformMisc.h"
#include "IAutomationDriverModule.h"
#include "IAutomationDriver.h"
#include "IDriverSequence.h"
#include "InputCoreTypes.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/Pawn.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Dom/JsonObject.h"

static FString VibeEnv(const TCHAR* Name){ return FPlatformMisc::GetEnvironmentVariable(Name); }
static UWorld* VibeWorld(){
    if(!GEngine) return nullptr;
    for(const FWorldContext& C:GEngine->GetWorldContexts()) if(C.World()&&(C.WorldType==EWorldType::PIE||C.WorldType==EWorldType::Game||C.WorldType==EWorldType::GamePreview)) return C.World();
    return nullptr;
}
static APawn* VibePawn(UWorld* W){ APlayerController* P=W?W->GetFirstPlayerController():nullptr; return P?P->GetPawn():nullptr; }
static bool VibeKey(const FString& Raw,FKey& K){
    const FString S=Raw.ToUpper();
    if(S=="W")K=EKeys::W; else if(S=="A")K=EKeys::A; else if(S=="S")K=EKeys::S; else if(S=="D")K=EKeys::D;
    else if(S=="SPACE")K=EKeys::SpaceBar; else if(S=="ENTER")K=EKeys::Enter; else if(S=="ESCAPE")K=EKeys::Escape;
    else if(S=="ARROWUP")K=EKeys::Up; else if(S=="ARROWDOWN")K=EKeys::Down; else if(S=="ARROWLEFT")K=EKeys::Left; else if(S=="ARROWRIGHT")K=EKeys::Right; else return false;
    return true;
}
static TSharedPtr<FJsonObject> VibeAction(const FString& Id,const FString& Type,bool Dispatched,bool Ok){
    auto O=MakeShared<FJsonObject>(); O->SetStringField("id",Id); O->SetStringField("type",Type); O->SetBoolField("dispatched",Dispatched); O->SetBoolField("ok",Ok); return O;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FVibe2AutoPlayerTest,"Vibe2.AutoPlayer",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FVibe2AutoPlayerTest::RunTest(const FString& Parameters){
    const FString ScenarioPath=VibeEnv(TEXT("VIBE2_AUTO_PLAYER_SCENARIO"));
    const FString OutputPath=VibeEnv(TEXT("VIBE2_AUTO_PLAYER_RUNTIME_RESULT"));
    const FString Nonce=VibeEnv(TEXT("VIBE2_AUTO_PLAYER_NONCE"));
    FString Text; TSharedPtr<FJsonObject> Scenario;
    if(ScenarioPath.IsEmpty()||OutputPath.IsEmpty()||Nonce.IsEmpty()||!FFileHelper::LoadFileToString(Text,*ScenarioPath)||!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text),Scenario)){ AddError("Vibe2 scenario/environment invalid"); return false; }

    UWorld* World=VibeWorld(); APawn* Pawn=VibePawn(World); const FVector Start=Pawn?Pawn->GetActorLocation():FVector::ZeroVector; const float StartTime=World?World->GetTimeSeconds():0.f;
    TArray<TSharedPtr<FJsonValue>> OutActions,OutChecks,OutErrors; int32 Inputs=0,Required=0,Passed=0;
    IAutomationDriverModule& Module=IAutomationDriverModule::Get(); Module.Enable(); FAutomationDriverPtr Driver=Module.CreateDriver();
    const TArray<TSharedPtr<FJsonValue>>* Actions=nullptr; Scenario->TryGetArrayField("actions",Actions);
    if(Actions) for(const auto& V:*Actions){
        auto A=V->AsObject(); if(!A)continue; FString Id,Type,Key,Expr; A->TryGetStringField("id",Id);A->TryGetStringField("type",Type);A->TryGetStringField("key",Key);A->TryGetStringField("expression",Expr); Type=Type.ToLower(); if(Id.IsEmpty())Id="action"; bool IsRequired=true; A->TryGetBoolField("required",IsRequired);
        if(Type=="key"){
            FKey K; bool Ok=VibeKey(Key,K); if(Ok){ auto Down=Driver->CreateSequence();Down->Actions().Press(K);Ok=Down->Perform();Driver->Wait(FTimespan::FromMilliseconds(80));auto Up=Driver->CreateSequence();Up->Actions().Release(K);Ok=Up->Perform()&&Ok;Driver->Wait(FTimespan::FromMilliseconds(100)); }
            if(Ok)Inputs++; OutActions.Add(MakeShared<FJsonValueObject>(VibeAction(Id,Type,Ok,Ok))); if(!Ok&&IsRequired)break;
        }else if(Type=="wait"){
            const double Ms=A->HasTypedField<EJson::Number>("ms")?A->GetNumberField("ms"):50.0; const bool Ok=Driver->Wait(FTimespan::FromMilliseconds(FMath::Clamp(Ms,0.0,10000.0))); OutActions.Add(MakeShared<FJsonValueObject>(VibeAction(Id,Type,false,Ok)));
        }else if(Type=="expect"){
            World=VibeWorld();Pawn=VibePawn(World); bool Ok=false; if(Expr=="world-ready")Ok=World!=nullptr;else if(Expr=="player-ready")Ok=Pawn!=nullptr;else if(Expr=="player-moved")Ok=Pawn&&FVector::DistSquared(Start,Pawn->GetActorLocation())>1.f;else if(Expr=="world-time-advanced")Ok=World&&World->GetTimeSeconds()>StartTime;
            auto C=MakeShared<FJsonObject>();C->SetStringField("id",Id);C->SetStringField("name",Id);C->SetBoolField("required",IsRequired);C->SetBoolField("pass",Ok);C->SetStringField("value",Expr);OutChecks.Add(MakeShared<FJsonValueObject>(C));if(IsRequired){Required++;if(Ok)Passed++;}OutActions.Add(MakeShared<FJsonValueObject>(VibeAction(Id,Type,false,Ok)));if(!Ok&&IsRequired)break;
        }
    }
    Module.Disable(); World=VibeWorld(); const bool Verified=Driver.IsValid()&&World&&Inputs>0&&Required>0&&Passed==Required&&OutErrors.Num()==0;
    auto Caps=MakeShared<FJsonObject>();Caps->SetBoolField("automationDriver",true);Caps->SetBoolField("automationFramework",true);Caps->SetBoolField("platformInput",Inputs>0);Caps->SetBoolField("worldObservation",World!=nullptr);
    auto Metrics=MakeShared<FJsonObject>();Metrics->SetNumberField("consoleErrorCount",0);
    auto Result=MakeShared<FJsonObject>();Result->SetNumberField("version",1);Result->SetStringField("engine","unreal");Result->SetStringField("nonce",Nonce);Result->SetStringField("authority","vibe2-unreal-automation-driver-runtime");Result->SetBoolField("runtimeVerified",Verified);Result->SetObjectField("capabilities",Caps);Result->SetStringField("project",VibeEnv(TEXT("VIBE2_UNREAL_PROJECT")));Result->SetArrayField("actions",OutActions);Result->SetArrayField("checkpoints",OutChecks);Result->SetArrayField("errors",OutErrors);Result->SetObjectField("metrics",Metrics);
    FString Json;auto Writer=TJsonWriterFactory<>::Create(&Json);const bool Saved=FJsonSerializer::Serialize(Result.ToSharedRef(),Writer)&&FFileHelper::SaveStringToFile(Json,*OutputPath);if(!Saved||!Verified)AddError("Vibe2 Unreal AUTO PLAYER evidence failed");return Saved&&Verified;
}
#endif
