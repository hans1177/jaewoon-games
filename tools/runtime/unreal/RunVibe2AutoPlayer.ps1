# 파일명: tools/runtime/unreal/RunVibe2AutoPlayer.ps1
# 역할: Epic RunUAT/Gauntlet 경로로 Vibe2.AutoPlayer Unreal Automation Test를 실제 Editor 세션에서 실행한다.

$ErrorActionPreference = 'Stop'
function Require-Env([string]$Name) {
    $Value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($Value)) { throw "Missing environment variable: $Name" }
    return $Value
}

$RunUAT = Require-Env 'VIBE2_UNREAL_RUN_UAT'
$Project = Require-Env 'VIBE2_UNREAL_PROJECT'
if (-not (Test-Path -LiteralPath $RunUAT)) { throw "RunUAT not found: $RunUAT" }
if (-not (Test-Path -LiteralPath $Project)) { throw "Unreal project not found: $Project" }

& $RunUAT RunUnreal '-test=UE.EditorAutomation' '-runtest=Vibe2.AutoPlayer' "-project=$Project" '-build=editor'
$ExitCode = $LASTEXITCODE
if ($ExitCode -ne 0) { throw "RunUAT Vibe2.AutoPlayer failed with exit code $ExitCode" }
