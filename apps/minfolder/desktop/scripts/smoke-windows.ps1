$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class MinFolderWindowTest {
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
}
'@
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
  # Verify the rendered controls, not just an empty native window frame.
  $window = [System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
  $close = $null
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    $condition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, '창 닫기')
    $close = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
    if ($close -and $close.Current.IsEnabled) { break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $close -or -not $close.Current.IsEnabled) { throw '앱의 실제 닫기 버튼을 찾지 못했습니다. 화면 초기화를 확인하세요.' }
  $condition = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, '창 최소화')
  $minimize = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
  if (-not $minimize) { throw '앱의 최소화 버튼을 찾지 못했습니다.' }
  $minimize.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
  $minimized = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if ([MinFolderWindowTest]::IsIconic($process.MainWindowHandle)) { $minimized = $true; break }
    Start-Sleep -Milliseconds 250
  }
  if (-not $minimized) { throw '실제 최소화 버튼을 눌렀지만 창이 내려가지 않았습니다.' }
  [void][MinFolderWindowTest]::ShowWindow($process.MainWindowHandle, 9)
  Start-Sleep -Milliseconds 500
  $close.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
  if (-not $process.WaitForExit(15000)) { throw '창 닫기 요청 후 MinFolder 프로세스가 종료되지 않았습니다.' }
  if ($process.ExitCode -ne 0) { throw "MinFolder 비정상 종료: $($process.ExitCode)" }
  Write-Output 'Windows 창 닫기 및 프로세스 정상 종료 확인'
} finally {
  $process.Refresh()
  if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
}
