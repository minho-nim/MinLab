import {invoke, isTauri} from '@tauri-apps/api/core'
import {getCurrentWindow} from '@tauri-apps/api/window'
import {open, confirm} from '@tauri-apps/plugin-dialog'
import {key, norm, predict, matchingProjects} from '../core.js'
import {createMapView} from './map-view.js'
import {rememberFocus,restoreFocus} from './focus.js'
import {setupWindowShell} from './window-shell.js'
const $=id=>document.getElementById(id)
const element=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
const button=(text,action,cls)=>{const n=element('button',text,cls);n.type='button';n.onclick=action;return n}
const read=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}}
let shell=null
const state={root:null,nodes:new Map(),selected:null,queue:[],checked:new Set(),busy:false,installing:false,suppressClickUntil:0,history:[],epoch:0,drag:null}
const excluded=new Set(['desktop.ini','thumbs.db','ehthumbs.db','.ds_store','$recycle.bin','system volume information'])
const hidden=e=>excluded.has(e.name.toLowerCase())||e.name.startsWith('~$')
const status=text=>{$('status').textContent=text;$('status').title=text}
const folderNodes=()=>[...state.nodes.values()]
const historyKey=()=>`minfolder.desktop.history:${state.root?.path}`
function saveHistory(){try{localStorage.setItem(historyKey(),JSON.stringify(state.history.slice(0,100)))}catch{status('이동은 완료됐지만 기록을 저장하지 못했어요.')}}
function makeNode(entry,relative){return {...entry,relative,entries:[],opened:false,loaded:false,done:false,loading:null,error:''}}
async function load(node,reset=false){
  if(node.loading)return node.loading
  if(node.done&&!reset)return
  const epoch=state.epoch,retrying=!!node.error
  node.error=''
  node.loading=(async()=>{
    try{
      const page=await invoke('list_directory',{id:node.id,reset:reset||!node.loaded})
      if(epoch!==state.epoch)return
      if(reset){node.priorDirectories=[...new Map([...(node.priorDirectories??[]),...node.entries.filter(e=>e.kind==='directory')].map(e=>[e.id,e])).values()];node.entries=[]}
      for(const entry of page.entries.filter(e=>!hidden(e))){
        if(!node.entries.some(e=>e.id===entry.id))node.entries.push(entry)
        if(entry.kind==='directory'&&!state.nodes.has(entry.id))state.nodes.set(entry.id,makeNode(entry,[...node.relative,entry.name]))
      }
      node.entries.sort((a,b)=>a.kind===b.kind?a.name.localeCompare(b.name,'ko',{numeric:true}):a.kind==='directory'?-1:1)
      if(page.done&&node.priorDirectories){
        const keep=new Set(node.entries.map(e=>e.id))
        for(const old of node.priorDirectories.filter(e=>!keep.has(e.id))){
          const branch=state.nodes.get(old.id)
          if(branch)for(const n of folderNodes())if(branch.relative.every((v,i)=>n.relative[i]===v))state.nodes.delete(n.id)
        }
        node.priorDirectories=null
        for(const rec of state.queue)if(rec.target&&!state.nodes.has(rec.target)){rec.target='';rec.auto=false;rec.reason='폴더 목록이 바뀌었어요. 저장 위치를 다시 골라 주세요.'}
      }
      node.loaded=true;node.done=page.done;node.error=''
      if(retrying)status(node.name+' 목록을 다시 읽었어요.')
      if(page.skipped)status(`읽지 못한 항목 또는 연결 폴더 ${page.skipped}개를 제외했어요.`)
    }catch(e){if(epoch===state.epoch){node.error=String(e);status('폴더를 읽지 못했어요. '+e)}}
    finally{node.loading=null;if(epoch===state.epoch)render()}
  })()
  render()
  return node.loading
}
async function connect(path){
  if(state.busy||state.installing)return
  if(state.queue.length&&!await confirm('분류 대기 목록을 비우고 기준 폴더를 바꿀까요?',{title:'폴더 변경',kind:'warning'}))return
  const root=await invoke('connect_root',{path})
  state.epoch++;mapView.reset();state.root=root;state.nodes.clear();state.queue=[];state.checked.clear()
  const node=makeNode(root,[]);node.opened=true;state.nodes.set(root.id,node);state.selected=root.id
  state.history=read(historyKey(),[]);if(!Array.isArray(state.history))state.history=[]
  try{localStorage.setItem('minfolder.desktop.root',JSON.stringify(path))}catch{}
  $('root-name').textContent=root.name;$('root-name').title=root.path;$('connect').textContent='폴더 변경'
  status('상위 폴더부터 읽고 있어요. 하위 폴더는 필요한 만큼 펼치세요.');render()
  await load(node)
  if(node.error){status('기준 폴더를 읽지 못했어요. '+node.error);return}
  // Only the first page of the first groups: never recursively scan the whole drive.
  const epoch=state.epoch
  for(const entry of node.entries.filter(e=>e.kind==='directory').slice(0,16)){
    if(epoch!==state.epoch)return
    const group=state.nodes.get(entry.id);group.opened=true;await load(group)
  }
  if(epoch===state.epoch)status('폴더 연결 완료 · 탐색기에서 놓거나 선택한 파일은 승인 후 이동해요.')
}
async function chooseRoot(){
  if(state.busy||state.installing)return
  try{const path=await open({directory:true,multiple:false,title:'MinFolder 기준 폴더'});if(path)await connect(path)}catch(e){status('폴더 연결 실패 · '+e)}
}
function select(id){state.selected=id;state.checked.clear();render();void load(state.nodes.get(id))}
function empty(node,text){node.replaceChildren(element('p',text,'empty'))}
const mapView=createMapView({state,load,select,onFileOpen:file=>{if(Date.now()>state.suppressClickUntil)void openEntry(file.id,false)},onFileDrag:startDrag})
function renderTree(){mapView.render()}
function renderFiles(){
  const box=$('files'),node=state.nodes.get(state.selected)
  $('selected-path').textContent=node?.path??'지도에서 폴더를 선택하세요.'
  $('file-count').textContent=node?(node.error?'확인 필요':node.entries.filter(e=>e.kind==='file').length+'개'):''
  $('open-folder').dataset.unavailable=String(!node)
  $('recommend-all').dataset.unavailable=String(!node||!state.checked.size)
  if(!node){empty(box,'폴더를 연결하고 파일을 선택하세요.');return}
  box.replaceChildren()
  if(node.error){empty(box,'파일 목록을 읽지 못했어요. '+node.error);box.append(button('다시 읽기',()=>load(node,true)));return}
  for(const file of node.entries.filter(e=>e.kind==='file')){
    const row=element('div',undefined,'file-row'), check=element('input');check.type='checkbox';check.dataset.focusKey='file-check:'+file.id;check.checked=state.checked.has(file.id);check.setAttribute('aria-label',file.name+' 선택')
    check.onchange=()=>{if(check.checked)state.checked.add(file.id);else state.checked.delete(file.id);$('recommend-all').dataset.unavailable=String(!state.checked.size);applyBusy()}
    const label=element('button',undefined,'file-label');label.type='button';label.dataset.focusKey='file-open:'+file.id;label.title='클릭해서 열기 · 끌어서 이동';label.onclick=()=>{if(Date.now()>state.suppressClickUntil)void openEntry(file.id,false)};label.append(element('div',file.name),element('div',formatSize(file.size),'file-meta'));label.onpointerdown=e=>startDrag(e,file)
    const add=button('분류',()=>addFiles([file]));add.dataset.focusKey='file-sort:'+file.id;row.append(check,label,add);box.append(row)
  }
  if(!box.childNodes.length)box.append(element('p',node.loading?'읽는 중…':'표시할 파일이 없어요.','empty'))
  if(node.loaded&&!node.done){const more=button(node.loading?'읽는 중…':'다음 100개 읽기',()=>load(node));more.dataset.unavailable=String(!!node.loading);box.append(more)}
}
function formatSize(size){return size<1024?size+' B':size<1024**2?(size/1024).toFixed(1)+' KB':(size/1024**2).toFixed(1)+' MB'}
async function complete(node){for(let n=0;node&&!node.done&&n<5;n++)await load(node);return node?.done}
async function suggest(rec){
  const epoch=state.epoch
  const group=folderNodes().find(n=>n.relative.length===1&&norm(n.name)==='계약별공사자료')
  const accounting=folderNodes().find(n=>n.relative.length===1&&norm(n.name)==='공무및회계')
  if(accounting)await complete(accounting)
  if(group){
    if(!await complete(group)){rec.reason='계약 폴더가 많아요. 더 읽거나 직접 위치를 골라 주세요.';renderQueue();return}
    const hits=matchingProjects(rec.file.name,folderNodes().map(n=>n.relative))
    if(hits.length===1){
      const project=folderNodes().find(n=>key(n.relative)===key(hits[0]))
      if(!await complete(project)){rec.reason='해당 계약의 폴더를 다 읽지 못했어요. 직접 골라 주세요.';renderQueue();return}
      const text=norm(rec.file.name)
      const sub=/작업절차서|작업심의|선번장/u.test(text)?'작업자료':/위험성평가|산안비/u.test(text)?'안전서류':''
      const branch=project.entries.map(e=>state.nodes.get(e.id)).find(n=>n&&norm(n.name)===sub)
      if(branch&&!await complete(branch)){rec.reason='하위 폴더를 다 읽지 못했어요. 직접 골라 주세요.';renderQueue();return}
    }
  }
  if(epoch!==state.epoch||!state.queue.includes(rec)||!rec.auto)return
  const prediction=predict(rec.file.name,folderNodes().map(n=>n.relative))
  const target=prediction.path&&folderNodes().find(n=>key(n.relative)===key(prediction.path))
  if(target&&parentPath(rec.file.path)===target.path){rec.reason='이미 추천 위치에 있는 파일이에요.'}
  else{rec.target=target?.id??'';rec.reason=prediction.reason}
  renderQueue()
}
function parentPath(path){return path.slice(0,Math.max(path.lastIndexOf('\\'),path.lastIndexOf('/')))}
function addFiles(files,target=''){
  if(state.busy||state.installing)return
  if(!state.root){status('먼저 기준 폴더를 연결해 주세요.');return}
  for(const file of files.filter(e=>!hidden(e))){
    if(target&&state.nodes.get(target)?.path===parentPath(file.path)){status('이미 이 폴더에 있는 파일이에요. 다른 폴더를 골라 주세요.');continue}
    let rec=state.queue.find(q=>q.file.path===file.path)
    if(rec){rec.file=file;rec.failed=false;rec.checked=true;if(target){rec.target=target;rec.auto=false;rec.reason='직접 지정한 폴더예요.'}else if(!rec.target){rec.auto=true;void suggest(rec)}continue}
    rec={file,target,checked:true,auto:!target,reason:target?'직접 지정한 폴더예요.':'파일명과 관련 폴더 확인 중…'}
    state.queue.push(rec);if(!target)void suggest(rec)
  }
  renderQueue()
}
async function importPaths(paths,target=''){
  if(state.busy||state.installing)return
  if(!state.root){status('먼저 기준 폴더를 연결해 주세요.');return}
  try{const files=await invoke('import_files',{paths});addFiles(files,target)}catch(e){status('파일을 추가하지 못했어요. '+e)}
}
async function chooseFiles(){if(state.busy||state.installing)return;try{const paths=await open({multiple:true,directory:false,title:'이동할 파일 선택'});if(paths)await importPaths(Array.isArray(paths)?paths:[paths])}catch(e){status(String(e))}}
function renderQueue(){
  const queue=$('queue'),focus=rememberFocus(queue);queue.replaceChildren();$('queue-count').textContent=state.queue.length+'건'
  if(!state.queue.length)empty(queue,'분류할 파일을 선택하거나 끌어 놓으세요.')
  const folders=folderNodes().sort((a,b)=>a.path.localeCompare(b.path,'ko',{numeric:true}))
  for(const rec of state.queue){
    const row=element('article',undefined,'queue-item'+(rec.failed?' failed':'')),head=element('div',undefined,'queue-head'),check=element('input');check.type='checkbox';check.dataset.focusKey='queue-check:'+rec.file.id;check.checked=rec.checked;check.setAttribute('aria-label',rec.file.name+' 승인 대상')
    check.onchange=()=>{rec.checked=check.checked;updateSummary()}
    const remove=button('제외',()=>{state.queue=state.queue.filter(r=>r!==rec);renderQueue()})
    head.append(check,element('strong',rec.file.name),remove)
    const select=element('select');select.dataset.focusKey='queue-target:'+rec.file.id;select.setAttribute('aria-label',rec.file.name+' 저장 위치');const placeholder=element('option','저장 위치 선택');placeholder.value='';select.append(placeholder)
    for(const node of folders){if(parentPath(rec.file.path)===node.path)continue;const option=element('option',[state.root.name,...node.relative].join(' > '));option.value=node.id;select.append(option)}
    select.value=rec.target
    select.onchange=()=>{rec.target=select.value;rec.auto=false;rec.reason='직접 선택한 폴더예요.';rec.failed=false;updateSummary()}
    row.append(head,element('p',rec.file.path,'source'),select,element('p',rec.reason,'reason'));queue.append(row)
  }
  updateSummary();applyBusy();restoreFocus(queue,focus)
}
function ready(){return state.queue.filter(r=>r.checked&&r.target&&state.nodes.has(r.target))}
function updateSummary(){$('summary').textContent=`승인 대상 ${ready().length}건 · 전체 ${state.queue.length}건`;$('approve').disabled=state.busy||state.installing||!ready().length}
function renderHistory(){
  const box=$('history');box.replaceChildren()
  if(!state.history.length){empty(box,'아직 이동한 파일이 없어요.');return}
  for(const h of state.history.slice(0,30)){
    const row=element('div',undefined,'history-item');row.append(element('strong',h.name),element('small',h.destinationPath),element('small',h.status+' · '+new Date(h.time).toLocaleString('ko-KR')));box.append(row)
  }
}
function applyBusy(){for(const node of document.querySelectorAll('button,input,select'))if(!node.closest('.desktop-titlebar,#app-info'))node.disabled=state.busy||state.installing||node.dataset.unavailable==='true';updateSummary();shell?.refresh()}
function render(){const focus=rememberFocus();renderTree();renderFiles();renderQueue();renderHistory();applyBusy();restoreFocus(document,focus)}
async function approve(){
  if(state.busy||state.installing)return
  const batch=ready();if(!batch.length)return
  // Lock before the async native confirmation to prevent duplicate batches.
  state.busy=true;applyBusy()
  let ok=0,failed=0
  try{
    if(!await confirm(`${batch.length}개 파일을 표시된 폴더로 이동할까요? 원본 위치에서 파일이 사라집니다.`,{title:'파일 이동 승인',kind:'warning'}))return
    for(const rec of batch){
      try{
        status(`${ok+failed+1}/${batch.length} · ${rec.file.name} 이동 중…`)
        const result=await invoke('move_file',{sourceId:rec.file.id,targetId:rec.target})
        state.history.unshift({...result,time:Date.now()});state.history=state.history.slice(0,100);saveHistory()
        state.queue=state.queue.filter(r=>r!==rec);ok++
        // Update only known source and destination lists; preserve other expanded branches.
        const source=folderNodes().find(n=>n.path===parentPath(rec.file.path)),target=state.nodes.get(rec.target)
        if(source)await load(source,true)
        if(target)await load(target,true)
      }catch(e){rec.reason=String(e);rec.checked=false;rec.failed=true;failed++}
    }
    status(`이동 완료 ${ok}건 · 처리하지 못함 ${failed}건`)
  }catch(e){status('이동 중 오류 · '+e)}
  finally{state.busy=false;render()}
}
function startDrag(event,file){
  if(state.busy||state.installing||event.button!==0)return
  state.drag={file,x:event.clientX,y:event.clientY,active:false}
}
function dropFolder(x,y){return document.elementFromPoint(x,y)?.closest('[data-folder]')}
function clearHot(){document.querySelectorAll('.hot').forEach(n=>n.classList.remove('hot'))}
document.addEventListener('pointermove',event=>{
  const drag=state.drag;if(!drag)return
  if(!event.buttons){state.drag=null;$('drag-label').hidden=true;clearHot();return}
  if(!drag.active&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return
  drag.active=true;window.getSelection()?.removeAllRanges()
  const label=$('drag-label');label.hidden=false;label.textContent=drag.file.name;label.style.left=event.clientX+12+'px';label.style.top=event.clientY+12+'px'
  clearHot();dropFolder(event.clientX,event.clientY)?.classList.add('hot')
})
document.addEventListener('pointerup',event=>{
  const drag=state.drag;state.drag=null;$('drag-label').hidden=true;clearHot()
  if(drag?.active){state.suppressClickUntil=Date.now()+300;const node=dropFolder(event.clientX,event.clientY);if(node)addFiles([drag.file],node.dataset.folder);else status('이동할 폴더 위에 파일을 놓아 주세요.')}
})
window.addEventListener('blur',()=>{state.drag=null;$('drag-label').hidden=true;clearHot()})
async function openEntry(id,directory){if(state.busy||state.installing||!id)return;try{await invoke('open_entry',{id,directory});status(directory?'Windows 탐색기로 폴더를 열었어요.':'기본 프로그램에 파일 열기를 요청했어요.')}catch(e){status(String(e))}}
$('open-folder').onclick=()=>openEntry(state.selected,true)
$('connect').onclick=chooseRoot;$('add-files').onclick=chooseFiles;$('approve').onclick=approve
$('search').oninput=renderTree
$('refresh').onclick=async()=>{if(state.busy||state.installing)return;const node=state.nodes.get(state.selected);if(node)await load(node,true)}
$('recommend-all').onclick=()=>{const node=state.nodes.get(state.selected);if(node)addFiles(node.entries.filter(e=>state.checked.has(e.id)))}
$('clear-history').onclick=()=>{state.history=[];saveHistory();renderHistory()}
render()
if(isTauri()){
  shell=await setupWindowShell({isBusy:()=>state.busy,hasPendingWork:()=>state.queue.length>0,onError:status,onInstallState:value=>{state.installing=value;applyBusy()}})
  let closeConfirmed=false,closePrompt=false
  await getCurrentWindow().onCloseRequested(async event=>{
    if(state.busy&&!state.installing){event.preventDefault();status('파일 이동이 끝난 뒤 앱을 닫아 주세요.');return}
    if(state.queue.length&&!closeConfirmed){
      event.preventDefault();if(closePrompt)return;closePrompt=true
      try{if(await confirm('분류 대기 목록은 종료하면 비워져요. 파일은 현재 위치에 그대로 남습니다. 창을 닫을까요?',{title:'MinFolder 종료',kind:'warning'})){closeConfirmed=true;await getCurrentWindow().close()}}catch(e){status(String(e))}finally{closePrompt=false}
    }
  })
  await getCurrentWindow().onDragDropEvent(({payload})=>{
    if(state.busy||state.installing)return
    if(payload.type==='leave'){clearHot();return}
    if(payload.type!=='over'&&payload.type!=='drop'&&payload.type!=='enter')return
    const x=payload.position.x/window.devicePixelRatio,y=payload.position.y/window.devicePixelRatio
    const folder=dropFolder(x,y),area=document.elementFromPoint(x,y)?.closest('.review-panel')
    clearHot();(folder||area)?.classList.add('hot')
    if(payload.type==='drop'){clearHot();if(folder||area)void importPaths(payload.paths,folder?.dataset.folder??'');else status('폴더 상자 또는 파일 분류 영역에 놓아 주세요.')}
  })
  const saved=read('minfolder.desktop.root',null)
  if(saved)try{await connect(saved)}catch(e){status('기억한 폴더에 접근하지 못했어요. 폴더를 다시 연결해 주세요. '+e)}
}else{shell=await setupWindowShell({isBusy:()=>false,onError:status,onInstallState:()=>{}});status('Windows 앱에서 폴더 연결과 실제 이동을 사용할 수 있어요. 현재 화면은 미리보기예요.');$('connect').disabled=true;$('add-files').disabled=true}
