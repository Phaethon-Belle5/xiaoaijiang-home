# 壁纸视频批量转码脚本（Windows PowerShell）
# 用途：把 R2 上的大体积壁纸视频压缩为 1080p H.264 背景视频（≤30MB 目标）
# 用法：powershell -File tools\transcode-videos.ps1 [-Crf 28]
param(
  [int]$Crf = 26,
  [string]$InDir = "videos-in",
  [string]$OutDir = "videos-out"
)
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force $OutDir | Out-Null

Get-ChildItem $InDir -Filter *.mp4 | ForEach-Object {
  $in  = $_.FullName
  $out = Join-Path $OutDir $_.Name
  Write-Host "==> $($_.Name) ($([math]::Round($_.Length/1MB,1))MB)"
  # 1080p 上限（不放大）、H.264、crf、去音频、web 友好（h=-2 保证偶数高度）
  & ffmpeg -y -loglevel error -i $in `
    -vf "scale='min(1920,iw)':-2" `
    -c:v libx264 -preset veryfast -crf $Crf -an -movflags +faststart -pix_fmt yuv420p $out
  if (Test-Path $out) {
    $mb = [math]::Round((Get-Item $out).Length/1MB, 1)
    Write-Host "    -> $mb MB"
  } else {
    Write-Host "    !! FAILED"
  }
}
Write-Host "== done =="
