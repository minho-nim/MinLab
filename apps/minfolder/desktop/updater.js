// The SDK verifies the signed download before resolving download(). Installation is explicit.
export function createUpdateController({checkForUpdate,freezeWrites,thawWrites,restart,isBusy,onState,autoDownload=()=>true}) {
  let update=null,pending=null,state={kind:'idle',version:'',percent:null,bytes:0,error:''}
  const set=patch=>{state={...state,...patch};onState({...state})}
  async function download(){
    if(!update||['downloading','installing'].includes(state.kind))return false
    set({kind:'downloading',bytes:0,percent:null,error:''})
    let total=0,bytes=0,lastProgress=0
    try{
      await update.download(event=>{
        if(event.event==='Started')total=event.data.contentLength||0
        if(event.event==='Progress')bytes+=event.data.chunkLength
        const now=Date.now()
        if(event.event==='Started'||(total&&bytes>=total)||now-lastProgress>=100){set({bytes,percent:total?Math.min(100,Math.round(bytes/total*100)):null});lastProgress=now}
      })
      set({kind:'ready',percent:100});return true
    }catch(error){set({kind:'available',percent:null,error:'다운로드 또는 서명 검증 실패 · '+String(error)});return false}
  }
  async function check(){
    if(pending)return pending
    if(['ready','downloading','installing'].includes(state.kind))return state
    pending=(async()=>{
      set({kind:'checking',error:''})
      try{
        if(update){await update.close();update=null}
        update=await checkForUpdate()
        if(!update){set({kind:'current',version:'',error:''});return}
        set({kind:'available',version:update.version,error:''})
        if(autoDownload())await download()
      }catch(error){set({kind:'error',error:'업데이트 확인 실패 · '+String(error)})}
      finally{pending=null}
    })()
    return pending
  }
  async function install(){
    if(state.kind!=='ready'||!update)return false
    if(isBusy()){set({error:'파일 이동이 끝난 뒤 설치해 주세요.'});return false}
    set({kind:'installing',error:''})
    let frozen=false
    try{
      await freezeWrites();frozen=true
      await update.install()
      await restart();return true
    }catch(error){
      if(frozen)await thawWrites().catch(()=>{})
      set({kind:'ready',error:'업데이트 설치 실패 · '+String(error)});return false
    }
  }
  return {check,download,install,getState:()=>({...state})}
}
