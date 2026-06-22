<#
  test_run.ps1 — quick way to test capcut-autoedit.

  USAGE
    # 1) Smoke test only (no video, no Claude needed) — confirms ffmpeg + render plumbing:
    powershell -ExecutionPolicy Bypass -File .\test_run.ps1

    # 2) Full real edit on YOUR video (needs the `claude` CLI logged in via your Max plan):
    powershell -ExecutionPolicy Bypass -File .\test_run.ps1 -Video "C:\path\to\clip.mp4"

    # 3) Turn extra features on:
    powershell -ExecutionPolicy Bypass -File .\test_run.ps1 -Video "clip.mp4" -Titles -Broll

  Captions + static punch-in zoom are ON by default for the demo. B-roll needs a
  PEXELS_API_KEY in .env (off here unless you pass -Broll).
#>
param(
  [string]$Video = "",
  [switch]$Titles,
  [switch]$Broll,
  [switch]$AnimatedZoom,
  [ValidateSet("light","medium","heavy")][string]$Aggressiveness = "medium",
  [ValidateSet("clean","pop","highlight","oneword")][string]$CaptionStyle = "clean",
  [string]$OutDir = "out"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== 1/3  Plumbing self-test (ffmpeg + render, no video needed) ==" -ForegroundColor Cyan
python autoedit.py --selftest
if (-not $?) { Write-Host "Self-test FAILED — fix this before testing a real video." -ForegroundColor Red; exit 1 }

Write-Host "`n== 2/3  Unit tests ==" -ForegroundColor Cyan
python test_plumbing.py
python test_overlays_proto.py

if (-not $Video) {
  Write-Host "`nNo -Video given, so stopping after the smoke test." -ForegroundColor Yellow
  Write-Host "Run a real edit with:  .\test_run.ps1 -Video `"C:\path\to\clip.mp4`"" -ForegroundColor Yellow
  Write-Host "Or use the interactive web UI:  python app.py   (then open http://127.0.0.1:5000)" -ForegroundColor Yellow
  exit 0
}

if (-not (Test-Path $Video)) { Write-Host "Video not found: $Video" -ForegroundColor Red; exit 1 }

Write-Host "`n== 3/3  Full edit on: $Video ==" -ForegroundColor Cyan
$flags = @(
  $Video,
  "-o", $OutDir,
  "--aggressiveness", $Aggressiveness,
  "--burn-captions",
  "--caption-style", $CaptionStyle,
  "--zoom"
)
if ($AnimatedZoom) { $flags += @("--zoom-mode","animated") }
if ($Titles)       { $flags += "--titles" }
if ($Broll)        { $flags += "--broll" }

Write-Host ("python autoedit.py " + ($flags -join " ")) -ForegroundColor DarkGray
python autoedit.py @flags
if (-not $?) { Write-Host "`nEdit failed — see the error above." -ForegroundColor Red; exit 1 }

Write-Host "`nDone. Outputs in '$OutDir':" -ForegroundColor Green
Get-ChildItem $OutDir -Filter *.mp4 | Select-Object Name, @{N="MB";E={[math]::Round($_.Length/1MB,2)}}
$cap = Join-Path $OutDir "roughcut_captioned.mp4"
$raw = Join-Path $OutDir "roughcut.mp4"
$final = if (Test-Path $cap) { $cap } else { $raw }
Write-Host "Opening $final ..." -ForegroundColor Green
Invoke-Item $final
