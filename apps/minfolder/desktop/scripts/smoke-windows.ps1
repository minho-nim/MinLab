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
  # Let the WebView install its close-request listener. A fresh CI profile has
  # no connected folder or pending file move, so a normal close must exit.
  Start-Sleep -Seconds 3
  if (-not $process.CloseMainWindow()) { throw 'Windows 창 닫기 요청을 전달하지 못했습니다.' }
  if (-not $process.WaitForExit(15000)) { throw '창 닫기 요청 후 MinFolder 프로세스가 종료되지 않았습니다.' }
  if ($process.ExitCode -ne 0) { throw "MinFolder 비정상 종료: $($process.ExitCode)" }
  Write-Output 'Windows 창 닫기 및 프로세스 정상 종료 확인'
} finally {
  $process.Refresh()
  if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
}
