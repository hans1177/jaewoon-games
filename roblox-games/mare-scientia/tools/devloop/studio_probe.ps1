# 네 컴퓨터(self-hosted runner)에서 Roblox Studio로 Mare Scientia 장소를 열어 화면과 로그를 모은다.
# 1차 버전: Edit 모드로 열고 → 대기 → 전체 화면 스크린샷 + Studio 로그에서 오류 줄 추출.
# 결과: out\screen.png, out\studio-errors.txt, out\summary.json
param([string]$Place = "out\MareScientia.rbxlx", [int]$WaitSeconds = 90)
$ErrorActionPreference = "Continue"
New-Item -ItemType Directory -Force -Path out | Out-Null
$studio = Get-ChildItem "$env:LOCALAPPDATA\Roblox\Versions" -Directory -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  ForEach-Object { Join-Path $_.FullName "RobloxStudioBeta.exe" } |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $studio) { Write-Error "Roblox Studio를 찾지 못했다"; exit 1 }
$start = Get-Date
$full = (Resolve-Path $Place).Path
Write-Host "Studio: $studio"
$proc = Start-Process -FilePath $studio -ArgumentList "-task","EditFile","-localPlaceFile","`"$full`"" -PassThru
Start-Sleep -Seconds $WaitSeconds
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$b = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Left, $b.Top, 0, 0, $bmp.Size)
$bmp.Save((Join-Path (Get-Location) "out\screen.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
$logs = Get-ChildItem "$env:LOCALAPPDATA\Roblox\logs" -Filter *.log -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge $start } | Sort-Object LastWriteTime
$errs = @()
foreach ($l in $logs) {
  $errs += Select-String -Path $l.FullName -Pattern "MareScientia|Error|error|failed|Failed|attempt to" -SimpleMatch:$false |
    ForEach-Object { $_.Line } | Select-Object -First 200
}
$errs | Select-Object -First 300 | Set-Content out\studio-errors.txt -Encoding UTF8
@{ studio = $studio; started = $start; logFiles = $logs.Count; errorLines = $errs.Count; screenshot = (Test-Path out\screen.png) } |
  ConvertTo-Json | Set-Content out\summary.json -Encoding UTF8
Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
Write-Host "완료: 오류 줄 $($errs.Count)개"
