// Always own the close request: Tauri's implicit destroy cannot report errors to
// our status area, and repeated close events must not open stacked prompts.
export function createCloseHandler({isBusy,isInstalling,hasPendingWork,confirmClose,destroy,setClosing,onError}){
  let closing=false
  return async event=>{
    event.preventDefault()
    if(closing)return
    if(isBusy()||isInstalling()){
      onError(isInstalling()?'업데이트 설치가 진행 중이에요. 완료될 때까지 기다려 주세요.':'파일 이동이 끝난 뒤 앱을 닫아 주세요.')
      return
    }
    closing=true;setClosing(true)
    try{
      if(hasPendingWork()&&!await confirmClose())return
      // A native drop or operation may have arrived while the prompt was open.
      if(isBusy()||isInstalling()){onError('진행 중인 작업이 끝난 뒤 다시 닫아 주세요.');return}
      await destroy()
    }catch(e){onError('앱을 종료하지 못했어요. 다시 시도해 주세요. '+e)}
    finally{closing=false;setClosing(false)}
  }
}
