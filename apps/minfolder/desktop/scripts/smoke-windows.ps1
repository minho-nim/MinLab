$ErrorActionPreference = 'Stop'
$appPath = (Resolve-Path 'apps/minfolder/src-tauri/target/release/minfolder.exe').Path
$process = Start-Process -FilePath $appPath -PassThru
try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    Start-Sleep -Milliseconds 500
    $process.Refresh()
    if ($process.HasExited) { throw "MinFolder가 창을 열기 전에 종료되었습니다. ExitCode=$($process.ExitCode)" }
    if ($process.MainWindowHandle -ne 0 -and $process.Responding -and $process.MainWindowTitle -like '*MinFolder*') {
      $ready = $true
      break
    }
  }
  if (-not $ready) { throw 'MinFolder 네이티브 창 시작을 확인하지 못했습니다.' }
  Write-Output "Windows 네이티브 창 시작 확인: $($process.MainWindowTitle)"
  # A fresh CI profile has no connected folder and no file move; only this test process is stopped.
} finally {
  $process.Refresh()
  if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
}
