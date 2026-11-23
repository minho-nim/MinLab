import {isTauri,invoke} from '@tauri-apps/api/core'
import {getVersion} from '@tauri-apps/api/app'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {check} from '@tauri-apps/plugin-updater'
import {relaunch} from '@tauri-apps/plugin-process'
import {createUpdateController} from './updater.js'
const $=id=>document.getElementById(id)
export async function setupWindowShell({isBusy,hasPendingWork=()=>false,onError,onInstallState}) {
  const dialog=$('app-info'),toggle=$('window-version'),auto=$('auto-updates')
  try{auto.checked=localStorage.getItem('minfolder.auto-updates')!=='false'}catch{}
  auto.onchange=()=>{try{localStorage.setItem('minfolder.auto-updates',String(auto.checked))}catch{auto.checked=!auto.checked;$('update-status').textContent='자동 업데이트 설정을 저장하지 못했어요. 다시 시도해 주세요.'}}
  function openInfo(){if(!dialog.open){dialog.showModal();$('close-info').focus()}}
  toggle.onclick=openInfo;$('close-info').onclick=()=>dialog.close()
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()})
  dialog.addEventListener('close',()=>toggle.focus())
  const native=isTauri(),win=native?getCurrentWindow():null
  let maximized=false
  const act=async action=>{
    try{
      if(action==='close'&&isBusy()){onError('파일 작업이 끝난 뒤 창을 닫아 주세요.');return}
      await win[action]()
    }catch(e){onError('창을 조작하지 못했어요. '+e)}
  }
  $('window-close').onclick=()=>act('close');$('window-minimize').onclick=()=>act('minimize');$('window-maximize').onclick=()=>act('toggleMaximize')
  const reflect=async()=>{if(!win)return;maximized=await win.isMaximized();$('window-maximize').setAttribute('aria-label',maximized?'창 크기 복원':'창 최대화')}
  for(const id of ['window-close','window-minimize','window-maximize'])$(id).disabled=!native
  $('update-check').disabled=!native
  if(!native){$('update-status').textContent='Windows 앱에서 업데이트를 확인할 수 있어요.';return {refresh(){}}}
  const version=await getVersion();toggle.textContent='V.'+version;$('app-version').textContent=version
  await reflect();await win.onResized(()=>void reflect().catch(()=>{}))
  const syncActions=s=>{$('update-install').disabled=!['available','ready'].includes(s.kind)||(s.kind==='ready'&&(isBusy()||hasPendingWork()));$('update-safety-hint').textContent=isBusy()?'파일 이동이 끝난 뒤 설치할 수 있어요.':hasPendingWork()?'대기 중인 분류를 처리하거나 제외한 뒤 설치할 수 있어요.':'설치는 직접 시작하며 파일 이동 중에는 적용하지 않아요.'}
  let lastKind='idle'
  const controller=createUpdateController({
    checkForUpdate:()=>check({timeout:15000}),freezeWrites:()=>invoke('prepare_update',{installing:true}),thawWrites:()=>invoke('prepare_update',{installing:false}),
    restart:()=>relaunch(),isBusy:()=>isBusy()||hasPendingWork(),autoDownload:()=>auto.checked,
    onState:s=>{
      if(s.kind!==lastKind)onInstallState(s.kind==='installing')
      const messages={idle:'업데이트를 자동으로 확인합니다.',checking:'새 버전을 확인하고 있어요.',current:'최신 버전이에요.',available:`새 버전 ${s.version}을 받을 수 있어요.`,downloading:`${s.version} 다운로드 중${s.percent===null?'':` · ${s.percent}%`}`,ready:`${s.version} 설치 준비 완료`,installing:'파일 작업을 확인하고 설치를 시작합니다.',error:'업데이트를 확인하지 못했어요.'}
      $('update-status').textContent=s.error||messages[s.kind]
      $('update-check').disabled=['checking','downloading','installing'].includes(s.kind)
      syncActions(s)
      $('update-install').textContent=s.kind==='available'?'다운로드':'설치 후 재시작'
      const progress=$('update-progress');progress.hidden=s.kind!=='downloading';if(s.percent===null)progress.removeAttribute('value');else progress.value=s.percent
      toggle.textContent='V.'+version+(s.kind==='ready'?' · 설치 준비':s.kind==='downloading'?` · ${s.percent??'…'}%`:s.kind==='available'?' · 새 버전':'')
      toggle.dataset.update=s.kind
      // Notify without opening a dialog or interrupting file selection/movement.
      if(s.kind==='ready'&&lastKind!=='ready')toggle.title='새 버전이 준비됐어요. 클릭해서 설치할 수 있어요.'
      lastKind=s.kind
    }
  })
  $('update-check').onclick=()=>controller.check()
  $('update-install').onclick=()=>controller.getState().kind==='available'?controller.download():controller.install()
  dialog.addEventListener('toggle',()=>{if(dialog.open)syncActions(controller.getState())})
  // No file names, paths or contents are sent. Only the public version feed is requested.
  const first=setTimeout(()=>{if(auto.checked)void controller.check()},10000)
  const repeat=setInterval(()=>{if(auto.checked)void controller.check()},4*60*60*1000)
  window.addEventListener('beforeunload',()=>{clearTimeout(first);clearInterval(repeat)},{once:true})
  return {refresh:()=>syncActions(controller.getState())}
}
