# 转码后视频上传回 Cloudflare R2（Windows PowerShell）
# 前置：已安装 wrangler 并登录（npx wrangler login），且知道 R2 bucket 名称
# 用法：powershell -File tools\upload-videos.ps1 -Bucket pub-1a72165d30ad42fc81dae51cefb3cdfc
param(
  [Parameter(Mandatory=$true)][string]$Bucket,
  [string]$InDir = "videos-out"
)
$ErrorActionPreference = "Stop"
Get-ChildItem $InDir -Filter *.mp4 | ForEach-Object {
  $key = "MP4/$($_.Name)"
  Write-Host "==> uploading $key"
  & npx wrangler r2 object put "$Bucket/$key" --file $_.FullName --content-type video/mp4
  if ($LASTEXITCODE -ne 0) { Write-Host "    !! FAILED: $($_.Name)" }
}
Write-Host "== done =="
