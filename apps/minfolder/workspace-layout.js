// Presentation preferences only. No file names or filesystem operations here.
export function setupWorkspaceLayout({workspace,panes,horizontal,vertical,storageKey='minfolder.balanced-layout.v1',fixedHeight=112}){
  let settings={height:220,width:38},drag=null
  try{const saved=JSON.parse(localStorage.getItem(storageKey));if(Number.isFinite(saved?.height))settings.height=saved.height;if(Number.isFinite(saved?.width))settings.width=saved.width}catch{}
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))
  function apply(){
    const available=Math.max(350,workspace.clientHeight-fixedHeight)
    settings.height=clamp(settings.height,190,Math.max(190,available-240));settings.width=clamp(settings.width,30,58)
    workspace.style.setProperty('--explorer-height',settings.height+'px');panes.style.setProperty('--source-width',settings.width+'%')
    horizontal.setAttribute('aria-valuenow',String(Math.round(settings.height)));horizontal.setAttribute('aria-valuemax',String(Math.round(Math.max(190,available-240))))
    vertical.setAttribute('aria-valuenow',String(Math.round(settings.width)))
  }
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(settings))}catch{}}
  function finish(e){if(!drag)return;if(drag.handle.hasPointerCapture?.(drag.id))drag.handle.releasePointerCapture(drag.id);drag=null;save()}
  for(const [handle,orientation,min,max]of [[horizontal,'horizontal',190,1000],[vertical,'vertical',30,58]]){
    handle.setAttribute('role','separator');handle.setAttribute('aria-orientation',orientation);handle.setAttribute('aria-valuemin',String(min));handle.setAttribute('aria-valuemax',String(max))
    handle.onpointerdown=e=>{if(e.button!==0||handle.disabled)return;e.preventDefault();drag={handle,id:e.pointerId,x:e.clientX,y:e.clientY,height:settings.height,width:settings.width};handle.setPointerCapture(e.pointerId)}
    handle.onpointermove=e=>{if(!drag||drag.handle!==handle||drag.id!==e.pointerId)return;if(orientation==='horizontal')settings.height=drag.height+e.clientY-drag.y;else settings.width=drag.width+(e.clientX-drag.x)/Math.max(1,panes.clientWidth)*100;apply()}
    handle.onpointerup=finish;handle.onpointercancel=finish;handle.onlostpointercapture=()=>{drag=null}
    handle.onkeydown=e=>{const keys=orientation==='horizontal'?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight'];if(!keys.includes(e.key))return;e.preventDefault();const sign=e.key===keys[1]?1:-1;if(orientation==='horizontal')settings.height+=sign*12;else settings.width+=sign*2;apply();save()}
  }
  const observer=new ResizeObserver(()=>apply());observer.observe(workspace)
  window.addEventListener('beforeunload',()=>{observer.disconnect();save()},{once:true});apply()
  return {refresh:apply}
}
