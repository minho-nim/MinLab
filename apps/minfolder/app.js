import {key,norm,predict,matchingProjects,openDir,transfer} from './core.js'
const $=s=>document.getElementById(s)
const el=(t,text,cls)=>{const e=document.createElement(t);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e}
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b}
const empty=(container,message)=>container.replaceChildren(el('p',message,'empty'))
const msg=t=>$('alert').textContent=t
const parts=(root,p)=>[root?.name,...p].filter(Boolean).join(' > ')
const busySet=b=>{S.busy=b;for(const id of ['workspace','refresh'])$(id).disabled=b;renderQueue();renderInbox()}
let sequence=0
const S={root:null,scanId:0,scanning:false,entries:new Map(),folders:[],filesByDir:new Map(),mapStatus:null,lookup:new Map(),expanded:new Set(),selected:null,sub:[],inbox:[],queue:[],pins:[],history:[],skip:[],busy:false}
const dragMime='application/x-minfolder-inbox'
let dragItem=null
let dragSerial=0
const localRead=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const localWrite=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
const localKey=()=> 'minfolder.pages.v1:'+S.root?.name
function remember(){localWrite(localKey(),{pins:S.pins,history:S.history,skip:S.skip})}
const protectedNames=new Set(['desktop.ini','thumbs.db','ehthumbs.db','.ds_store','$recycle.bin','system volume information'])
const lower=name=>String(name).normalize('NFKC').toLowerCase().trim()
function isExcluded(name,kind='file'){
  const k=lower(name)
  return protectedNames.has(k)||(kind==='file'&&k.startsWith('~$'))||S.skip.includes(k)
}
let savedHandle=null, connectionEpoch=0
const permission={mode:'readwrite'}
function workspaceDB(){
  return new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(Error('IndexedDB 사용 불가'));return}
    const op=indexedDB.open('minfolder-local',1)
    op.onupgradeneeded=()=>op.result.createObjectStore('settings')
    op.onsuccess=()=>resolve(op.result)
    op.onerror=()=>reject(op.error)
    op.onblocked=()=>reject(Error('다른 탭에서 저장소 사용 중'))
  })
}
async function rememberHandle(handle){
  const db=await workspaceDB()
  try{
    await new Promise((resolve,reject)=>{
      const t=db.transaction('settings','readwrite')
      t.oncomplete=resolve
      t.onerror=()=>reject(t.error)
      t.onabort=()=>reject(t.error)
      t.objectStore('settings').put(handle,'workspace')
    })
  }finally{db.close()}
}
async function readHandle(){
  const db=await workspaceDB()
  try{
    return await new Promise((resolve,reject)=>{
      const q=db.transaction('settings','readonly').objectStore('settings').get('workspace')
      q.onsuccess=()=>resolve(q.result)
      q.onerror=()=>reject(q.error)
    })
  }finally{db.close()}
}
function activate(h){
  S.root=h;S.sub=[];S.inbox=[];S.selected=null;S.queue=[];dragItem=null
  S.expanded=new Set([key([])]);S.folders=[];S.lookup.clear();S.filesByDir.clear();S.mapStatus=null
  const state=localRead(localKey(),{})
  S.pins=Array.isArray(state.pins)?state.pins:[]
  S.history=Array.isArray(state.history)?state.history:[]
  S.skip=Array.isArray(state.skip)?state.skip:[]
  $('exclusions').value=S.skip.join(', ')
  $('workspace-name').textContent=h.name
  $('workspace').textContent='폴더 변경'
  $('restore-workspace').hidden=true
  msg(h.name+' 연결됨 · 상위 폴더부터 불러오는 중')
  render()
  void refresh(true)
}
async function connect(){
  if(!window.showDirectoryPicker){msg('이 브라우저에서는 폴더 연결을 지원하지 않아요. HTTPS의 Edge 또는 Chrome으로 열어 주세요.');return}
  const epoch=++connectionEpoch
  try{
    const h=await showDirectoryPicker({...permission,id:'minfolder-workspace'})
    if(epoch!==connectionEpoch)return
    savedHandle=h;activate(h)
    try{await rememberHandle(h)}catch{if(epoch===connectionEpoch)msg('연결은 됐지만 브라우저가 연결 정보를 저장하지 못했어요. 다음 방문 때 다시 선택해 주세요.')}
  }catch(e){
    if(e.name!=='AbortError')msg('폴더 연결 실패 · 브라우저가 보호하는 위치라면 그 안의 작업용 폴더를 선택하세요. '+e.message)
  }
}
async function restoreWorkspace(){
  const epoch=connectionEpoch
  try{
    const h=await readHandle()
    if(!h||epoch!==connectionEpoch)return
    savedHandle=h
    const status=await h.queryPermission(permission)
    if(epoch!==connectionEpoch)return
    if(status==='granted'){activate(h);return}
    $('workspace-name').textContent=h.name+' · 기억됨'
    $('restore-workspace').hidden=false
    msg('지난번 폴더를 기억하고 있어요. 브라우저 권한이 끝났다면 ‘기억한 폴더 열기’를 눌러 주세요.')
  }catch{}
}
async function requestSaved(){
  if(!savedHandle)return
  const epoch=++connectionEpoch
  try{
    const result=await savedHandle.requestPermission(permission)
    if(epoch!==connectionEpoch)return
    if(result==='granted'){activate(savedHandle);return}
    msg('폴더 권한이 허용되지 않았어요. 다른 폴더를 선택하거나 브라우저에서 권한을 확인해 주세요.')
  }catch(e){msg('기억한 폴더를 열 수 없어요. 폴더를 다시 선택해 주세요. '+e.message)}
}
const PAGE=100, RAW_PAGE=240, INITIAL_BRANCHES=16
const order=(a,b)=>a.localeCompare(b,'ko',{numeric:true})
function cacheNode(path,handle){
  const id=key(path)
  if(!S.entries.has(id))S.entries.set(id,{path,handle,children:[],files:[],iterator:null,done:false,loaded:false,denied:false,excluded:0,task:null,viewPage:0,listPage:0})
  return S.entries.get(id)
}
function syncIndex(){
  const entries=[...S.entries.values()].filter(n=>!n.denied)
  S.folders=entries.map(n=>n.path)
  S.lookup=new Map(S.folders.map(p=>[key(p),p]))
  S.filesByDir=new Map(entries.map(n=>[key(n.path),n.files.map(h=>h.name)]))
  S.inbox=S.entries.get(key(S.sub))?.files??[]
  S.mapStatus={fileCount:entries.reduce((n,x)=>n+x.files.length,0),
    excluded:entries.reduce((n,x)=>n+x.excluded,0),
    unreadable:S.entries.size-entries.length,limited:entries.some(n=>n.loaded&&!n.done)}
}
async function readFolder(path){
  const n=S.entries.get(key(path)), generation=S.scanId
  if(!n||n.done||n.denied)return n
  if(n.task)return n.task
  n.task=(async()=>{
    try{
      n.iterator??=n.handle.values()[Symbol.asyncIterator]()
      let count=0
      for(let raw=0;raw<RAW_PAGE&&count<PAGE;raw++){
        const {value:h,done}=await n.iterator.next()
        if(generation!==S.scanId)return n
        if(done){n.done=true;break}
        if(isExcluded(h.name,h.kind)){n.excluded++;continue}
        if(h.kind==='directory'){
          const next=[...path,h.name]
          cacheNode(next,h);if(!n.children.some(p=>p.at(-1)===h.name))n.children.push(next);count++
        }else if(h.kind==='file'){n.files.push(h);count++}
      }
      n.loaded=true;n.files.sort((a,b)=>order(a.name,b.name))
      n.children.sort((a,b)=>order(a.at(-1),b.at(-1)))
    }catch(e){
      if(generation!==S.scanId)return n
      n.denied=true
      if(!path.length){
        S.mapStatus={error:e.message}
        msg('기준 폴더를 읽지 못했어요. 접근 권한을 확인하거나 다시 연결해 주세요.')
      }else msg(parts(S.root,path)+' · 접근할 수 없어 제외했어요.')
    }finally{
      n.task=null
      if(generation===S.scanId){
        const rootError=!path.length&&n.denied&&S.mapStatus?.error
        syncIndex()
        if(rootError)S.mapStatus.error=rootError
        if(!dragItem)renderTree()
        renderInbox();counts()
      }
    }
    return n
  })()
  return n.task
}
async function loadInbox(){
  const n=S.entries.get(key(S.sub))
  if(n&&!n.loaded)await readFolder(S.sub)
  S.inbox=S.entries.get(key(S.sub))?.files??[]
  renderInbox()
}
async function refresh(){
  if(!S.root)return
  const gen=++S.scanId
  S.entries=new Map()
  S.selected=null;S.sub=[];S.inbox=[]
  S.expanded=new Set([key([])]);S.scanning=true;S.folders=[];S.lookup=new Map();S.filesByDir=new Map()
  const root=cacheNode([],S.root)
  await readFolder([])
  if(gen!==S.scanId)return
  if(!root.denied){
    const pending=root.children.slice(0,INITIAL_BRANCHES)
    // Root is already drawn. Load at most one extra level in small batches.
    for(let i=0;i<pending.length&&gen===S.scanId;i+=3){
      const batch=pending.slice(i,i+3)
      for(const p of batch)S.expanded.add(key(p))
      await Promise.all(batch.map(readFolder))
      await new Promise(resolve=>setTimeout(resolve,0))
    }
  }
  if(gen!==S.scanId)return
  S.scanning=false
  render()
  reroute()
}
function expand(p){
  S.expanded.add(key(p));renderTree()
  const n=S.entries.get(key(p))
  if(n&&!n.loaded)void readFolder(p)
}
async function reveal(p){
  const gen=S.scanId,root=S.root
  for(let i=0;i<=p.length;i++){
    const part=p.slice(0,i)
    if(part.some(n=>isExcluded(n,'directory'))||gen!==S.scanId)return
    try{
      if(!S.entries.has(key(part))){
        const handle=await openDir(root,part)
        if(gen!==S.scanId)return
        cacheNode(part,handle)
        const parent=S.entries.get(key(part.slice(0,-1)))
        if(part.length&&parent&&!parent.children.some(p=>key(p)===key(part)))parent.children.push(part)
      }
    }
    catch{msg('폴더가 없어졌거나 접근할 수 없어요.');return}
    const n=await readFolder(part)
    if(!n||n.denied||gen!==S.scanId)return
    S.expanded.add(key(part))
  }
  select(p)
}
async function loadBranch(path, maxPages=5){
  let n=S.entries.get(key(path))
  for(let i=0;n&&!n.done&&!n.denied&&i<maxPages;i++)n=await readFolder(path)
  return n
}
async function prepareSuggestion(rec){
  const gen=S.scanId
  const text=norm(rec.name)
  const projects=S.folders.find(p=>p.length===1&&norm(p[0])==='계약별공사자료')
  const accounting=S.folders.find(p=>p.length===1&&norm(p[0])==='공무및회계')
  if(accounting&&/하도급승낙|매입세금계산서|대금지급/u.test(text))await loadBranch(accounting)
  if(projects&&!/총괄장|정산현황|취합본/u.test(text)){
    const list=await loadBranch(projects)
    if(gen!==S.scanId)return
    if(list&&!list.done&&!list.denied){
      rec.reason='계약이 많아 추천 범위를 다 확인하지 못했어요. 지도에서 직접 골라 주세요.'
      renderQueue();return
    }
    const hits=matchingProjects(rec.name,S.folders)
    if(hits.length===1){
      const base=await loadBranch(hits[0])
      if(!base?.done&&!base?.denied){rec.reason='해당 계약의 폴더가 많아요. 저장 위치를 직접 골라 주세요.';renderQueue();return}
      if(gen!==S.scanId)return
      const subgroup=/작업절차서|작업심의|선번장/u.test(text)?'작업자료':/위험성평가|산안비/u.test(text)?'안전서류':''
      const branch=base?.children.find(p=>norm(p.at(-1))===subgroup)
      if(branch){const loaded=await loadBranch(branch);if(!loaded?.done&&!loaded?.denied){rec.reason='관련 폴더를 다 확인하지 못했어요. 저장 위치를 직접 골라 주세요.';renderQueue();return}}
    }
  }
  if(gen!==S.scanId||!S.queue.includes(rec)||!rec.auto||rec.failed)return
  const p=suggest(rec);rec.target=p.path;rec.reason=p.reason
  renderQueue()
}
function reroute(){
  for(const q of S.queue){
    if(q.auto&&q.target===null&&!q.failed)void prepareSuggestion(q)
  }
}
function accepts(e){return Array.from(e.dataTransfer?.types||[]).some(t=>t==='Files'||t===dragMime)}
function bindDrop(node,path){
  node.ondragover=e=>{
    if(!accepts(e)||S.busy)return
    e.preventDefault();e.stopPropagation()
    e.dataTransfer.dropEffect=dragItem?'move':'copy'
    node.classList.add('hot')
    if(path)$('target').textContent='저장 위치 · '+parts(S.root,path)
  }
  node.ondragleave=e=>{if(!node.contains(e.relatedTarget))node.classList.remove('hot')}
  node.ondrop=e=>{
    if(!accepts(e)||S.busy)return
    e.preventDefault();e.stopPropagation();node.classList.remove('hot')
    if(e.dataTransfer.getData(dragMime)===String(dragSerial)&&dragItem){
      const item=dragItem;dragItem=null;void queueInternal(item.handle,item.parent,path,item.name)
    }else {
      queueExternal(Array.from(e.dataTransfer.files),path)
    }
  }
}
function renderTree(){
  const ready=!!S.root && !!S.folders.length
  for(const id of ['map-expand','map-collapse','show-files'])$(id).disabled=!ready
  if(!ready){
    const hint=S.mapStatus?.error?'저장 폴더에 접근할 수 없어요. 저장 폴더를 다시 연결해 주세요.':(S.root?'저장 폴더를 읽고 있어요.':'저장 폴더를 연결하면 실제 폴더 구조가 여기에 나타나요.')
    $('map-hint').textContent=hint
    empty($('tree'),hint);$('target').textContent='';renderPins();return
  }
  const q=norm($('search').value)
  const showFiles=$('show-files').checked
  const m=S.mapStatus
  $('map-hint').textContent='폴더 '+(S.folders.length-1)+'개 · 파일 '+m.fileCount+'개'+(m.limited?' · 큰 폴더는 더 보기로 추가 표시':'')+(m.excluded?' · 규칙으로 제외 '+m.excluded+'개':'')+(m.unreadable?' · 접근 불가 제외 '+m.unreadable+'개':'')+(S.scanning?' · 하위 폴더 읽는 중':'')+' · 파일을 폴더 상자에 놓으면 승인 목록으로 보내요.'
  const branches=new Map()
  for(const p of S.folders.slice(1)){
    const parent=key(p.slice(0,-1))
    if(!branches.has(parent))branches.set(parent,[])
    branches.get(parent).push(p)
  }
  const fileMatch=name=>norm(name).includes(q)
  const inSearch=new Set()
  if(q){
    for(const p of S.folders){
      if(p.some(n=>norm(n).includes(q)) || (showFiles&&(S.filesByDir.get(key(p))||[]).some(fileMatch))){
        for(let n=0;n<=p.length;n++)inSearch.add(key(p.slice(0,n)))
      }
    }
    if(norm(S.root.name).includes(q))for(const p of S.folders)inSearch.add(key(p))
  }
  let remaining=420
  function makeNode(p){
    remaining--
    const id=key(p)
    const nodes=(branches.get(id)||[]).filter(child=>!q||inSearch.has(key(child)))
    const matchingFolder=!q||norm(S.root.name).includes(q)||p.some(n=>norm(n).includes(q))
    const files=showFiles?(S.filesByDir.get(id)||[]).filter(name=>matchingFolder||fileMatch(name)):[]
    const record=S.entries.get(id)
    const more=record&&!record.done&&!record.denied
    const hasChildren=!!(nodes.length||files.length||more)
    const opened=!!q||S.expanded.has(id)
    const branch=el('div',null,'map-node')
    const card=el('div',null,'map-folder')
    card.classList.toggle('selected',S.selected!==null&&id===key(S.selected))
    const folder=button(p.at(-1)||S.root.name,()=>select(p))
    folder.className='map-name'
    folder.title=parts(S.root,p)
    card.append(folder)
    if(hasChildren){
      const toggle=button(opened?'−':'+',()=>{
        if(q)$('search').value=''
        if(opened){S.expanded.delete(id);renderTree()}else expand(p)
      })
      toggle.className='map-toggle'
      toggle.setAttribute('aria-label',opened?'하위 항목 접기':'하위 항목 펼치기')
      toggle.setAttribute('aria-expanded',opened)
      card.append(toggle)
    }
    bindDrop(card,p)
    branch.append(card)
    if(opened&&hasChildren){
      const childList=el('div',null,'map-children')
      const items=[...nodes.map(path=>({path})),...files.map(name=>({name}))]
      const offset=(record?.viewPage??0)*PAGE
      for(const item of items.slice(offset,offset+PAGE)){
        if(remaining<=0)break
        if(item.path){childList.append(makeNode(item.path));continue}
        remaining--
        const fileBranch=el('div',null,'map-node')
        const file=button(item.name,()=>queueInternal(null,p,null,item.name))
        file.className='map-file';file.title=parts(S.root,[...p,item.name])+' · 클릭해서 분류'
        bindInternalDrag(file,{name:item.name,parent:p})
        fileBranch.append(file);childList.append(fileBranch)
      }
      if(offset>0){
        const prev=el('div',null,'map-node')
        prev.append(button('이전 100개',()=>{record.viewPage--;renderTree()}));childList.append(prev)
      }
      if(more||items.length>offset+PAGE){
        const b=button(record.task?'읽는 중…':'다음 항목 보기',async()=>{
          if(items.length<=offset+PAGE&&more)await readFolder(p)
          const now=record.children.length+(showFiles?record.files.length:0)
          if(!q&&now>offset+PAGE||q&&items.length>offset+PAGE)record.viewPage++
          renderTree()
        })
        b.disabled=!!record.task
        const next=el('div',null,'map-node');next.append(b);childList.append(next)
      }
      branch.append(childList)
    }
    return branch
  }
  if(q&&!inSearch.size)empty($('tree'),'검색 결과가 없어요.')
  else{
    const board=el('div',null,'map-graph')
    board.append(makeNode([]))
    if(remaining<=0)board.append(el('p','표시할 항목이 많아요. 다른 가지를 접거나 검색해서 범위를 줄여 주세요.','hint'))
    $('tree').replaceChildren(board)
  }
  $('target').textContent=S.selected?'선택한 폴더 · '+parts(S.root,S.selected):''
  renderPins()
}
function select(p){
  S.selected=p
  for(let i=0;i<p.length;i++)S.expanded.add(key(p.slice(0,i)))
  renderTree()
  if(key(p)!==key(S.sub)){S.sub=[...p];S.inbox=[];renderInbox();void loadInbox()}
}
function renderPins(){
  $('pins').replaceChildren()
  for(const p of S.pins.filter(Array.isArray)){
    if(p.some(n=>isExcluded(n,'directory')))continue
    const b=button(p.at(-1)||S.root.name,()=>{$('search').value='';void reveal(p)})
    b.title=parts(S.root,p);$('pins').append(b)
  }
  const selected=S.selected!==null, pinned=selected&&S.pins.some(p=>key(p)===key(S.selected))
  $('pin').disabled=!selected;$('pin').textContent=pinned?'선택 폴더 고정 해제':'선택 폴더 고정'
}
function inboxPage(){
  const listing=S.entries.get(key(S.sub))
  if(!listing||listing.denied)return []
  const start=listing.listPage*PAGE
  return [...listing.children.map(path=>({kind:'directory',path})),...listing.files].slice(start,start+PAGE)
}
function renderInbox(){
  $('in-count').textContent=S.inbox.filter(h=>h.kind==='file').length
  $('in-all').disabled=S.busy||!inboxPage().some(h=>h.kind==='file')||!S.root
  $('in-path').textContent=S.root?parts(S.root,S.sub):''
  $('in-back').hidden=!S.sub.length
  $('in-back').disabled=S.busy
  if(!S.root){empty($('inbox'),'기준 폴더를 연결하면 여기에서 파일을 선택하고 이동할 수 있어요.');return}
  if(!S.entries.get(key(S.sub))?.loaded){empty($('inbox'),'선택한 폴더를 읽는 중이에요.');return}
  const frag=document.createDocumentFragment()
  const listing=S.entries.get(key(S.sub))
  for(const item of inboxPage()){
    const row=el('div',null,'entry')
    if(item.kind==='directory'){
      const b=button('열기',()=>{select(item.path);expand(item.path)})
      b.disabled=S.busy;row.append(el('span',item.path.at(-1)),b)
    }else{
      const path=[...S.sub],b=button('분류',()=>queueInternal(item,path,null));b.disabled=S.busy
      bindInternalDrag(row,{handle:item,parent:path});row.append(el('span',item.name),b)
    }
    frag.append(row)
  }
  if(listing?.listPage>0)frag.append(button('이전 100개',()=>{listing.listPage--;renderInbox()}))
  if(listing&&!listing.denied&&(!listing.done||listing.children.length+listing.files.length>(listing.listPage+1)*PAGE)){
    const more=button('다음 항목 보기',async()=>{
      if(listing.children.length+listing.files.length<=(listing.listPage+1)*PAGE&&!listing.done)await readFolder(listing.path)
      if(listing.children.length+listing.files.length>(listing.listPage+1)*PAGE)listing.listPage++
      renderInbox()
    });more.disabled=S.busy;frag.append(more)
  }
  if(!listing?.files.length&&!listing?.children.length&&listing?.done)frag.append(el('p','이 폴더에는 항목이 없어요.','empty'))
  $('inbox').replaceChildren(frag)
}
function bindInternalDrag(node,item){
  node.draggable=!S.busy
  node.ondragstart=e=>{
    if(S.busy||!S.root){e.preventDefault();return}
    dragItem=item;dragSerial++
    e.dataTransfer.setData(dragMime,String(dragSerial));e.dataTransfer.effectAllowed='move'
  }
  node.ondragend=()=>{dragItem=null;renderTree()}
}
function suggest(rec){
  const p=predict(rec.name,S.folders)
  if(rec.kind==='move'&&p.path&&key(rec.parent)===key(p.path))return {path:null,reason:'이미 추천 위치에 있는 파일이에요. 다른 폴더를 고르면 이동할 수 있어요.'}
  return p
}
function add(rec,path){
  const same=rec.kind==='move'&&path!==null&&key(path)===key(rec.parent)
  const p=path!==null?{path:same?null:path,reason:same?'이미 이 폴더에 있는 파일이에요. 다른 위치를 골라 주세요.':'지도에서 지정한 위치예요.'}:suggest(rec)
  const existing=rec.kind==='move'&&S.queue.find(x=>x.kind==='move'&&x.name===rec.name&&key(x.parent)===key(rec.parent))
  if(existing){
    if(path!==null)Object.assign(existing,{target:p.path,reason:p.reason,auto:false,failed:false,checked:true})
    return
  }
  const candidate={...rec,id:++sequence,target:p.path,reason:p.reason,auto:path===null,checked:true}
  if(candidate.auto){candidate.target=null;candidate.reason='관련 폴더 확인 중…'}
  S.queue.push(candidate)
  if(candidate.auto&&!S.scanning)void prepareSuggestion(candidate)
}
async function queueInternal(handle,parent,path,name){
  if(!S.root||S.busy||isExcluded(handle?.name??name)||parent.some(n=>isExcluded(n,'directory')))return
  try {
    const root=S.root
    if(!handle)handle=await (await openDir(root,parent)).getFileHandle(name)
    const file=await handle.getFile()
    if(root!==S.root||S.busy)return
    add({kind:'move',name:file.name,handle,parent,size:file.size,modified:file.lastModified},path)
    tab(false);renderQueue()
  }catch(e){msg('파일을 읽지 못했어요. '+e.message)}
}
function queueExternal(files,path){
  if(!S.root){msg('먼저 기준 폴더를 연결해 주세요.');return}
  if(S.busy||!files.length)return
  for(const file of files)if(!isExcluded(file.name))add({kind:'copy',name:file.name,file},path)
  tab(false);renderQueue()
  msg('탐색기에서 가져온 파일은 승인 후 복사해요. 원본은 그대로예요.')
}
function ready(){return S.queue.filter(q=>q.checked&&q.target!==null&&S.lookup.has(key(q.target))&&!q.target.some(n=>isExcluded(n,'directory'))&&!isExcluded(q.name))}
function counts(){
  const r=ready(), moves=r.filter(q=>q.kind==='move').length
  $('summary').textContent=r.length ? '승인 대상 '+r.length+'건 · 이동 '+moves+' / 복사 '+(r.length-moves) : '위치가 정해진 항목을 선택하세요.'
  $('approve').disabled=S.busy||!r.length
}
function renderQueue(){
  $('q-count').textContent=S.queue.length
  if(!S.queue.length){empty($('queue'),'아직 분류할 파일이 없어요. 지도 또는 연결한 폴더 목록에서 파일을 골라 주세요.');counts();return}
  const frag=document.createDocumentFragment()
  for(const q of S.queue){
    const row=el('article',null,'qrow'), head=el('div',null,'qhead'), check=el('input')
    check.type='checkbox';check.checked=q.checked;check.disabled=S.busy
    check.setAttribute('aria-label',q.name+' 승인 대상')
    check.onchange=()=>{q.checked=check.checked;counts()}
    const remove=button('제외',()=>{S.queue=S.queue.filter(x=>x.id!==q.id);renderQueue()});remove.disabled=S.busy
    head.append(check,el('b',q.name),el('small',q.kind==='move'?'원본 이동':'원본 유지'),remove)
    const where=el('select');where.setAttribute('aria-label',q.name+' 저장 경로');where.disabled=S.busy
    const prompt=el('option','저장 위치 선택');prompt.value='';where.append(prompt)
    const choices=S.folders.slice(0,200)
    if(q.target!==null&&!choices.some(p=>key(p)===key(q.target)))choices.push(q.target)
    for(const p of choices){
      if(q.kind==='move'&&key(q.parent)===key(p))continue
      const option=el('option',parts(S.root,p));option.value=key(p);where.append(option)
    }
    where.value=q.target!==null?key(q.target):''
    where.onchange=()=>{q.target=S.lookup.get(where.value)??null;q.auto=false;q.failed=false;q.reason='직접 선택한 위치예요.';renderQueue()}
    row.append(head,where,el('small',q.reason,'reason'));frag.append(row)
  }
  $('queue').replaceChildren(frag);counts()
}
function renderHistory(){
  if(!S.history.length){empty($('history'),'아직 저장한 파일이 없어요.');return}
  const frag=document.createDocumentFragment()
  for(const h of S.history){
    const row=el('div',null,'hrow')
    row.append(el('b',h.name),el('small',h.status+' · '+new Date(h.time).toLocaleString('ko-KR')),el('small',parts(S.root,h.path)))
    row.append(button('지도에서 보기',()=>{$('search').value='';void reveal(h.path)}))
    frag.append(row)
  }
  $('history').replaceChildren(frag)
}
function render(){renderTree();renderInbox();renderQueue();renderHistory()}
function tab(history){
  $('queue-view').hidden=history;$('history-view').hidden=!history
  $('tab-queue').setAttribute('aria-pressed',!history);$('tab-history').setAttribute('aria-pressed',history)
  if(history)renderHistory()
}
async function approve(){
  const batch=ready()
  if(!batch.length||S.busy)return
  const moves=batch.filter(q=>q.kind==='move').length
  if(!confirm('표시된 위치에 이동 '+moves+'건, 복사 '+(batch.length-moves)+'건을 진행할까요?\n이동은 저장을 확인한 뒤에만 원본을 삭제합니다.'))return
  busySet(true)
  let ok=0, errors=0, retained=0
  const run=async()=>{
    for(const q of batch){
      try {
        const status=await transfer({entry:q,target:q.target,sourceRoot:S.root,destRoot:S.root})
        if(status.includes('원본'))retained++
        S.history.unshift({name:q.name,path:q.target,status,time:Date.now()})
        S.history=S.history.slice(0,40)
        S.queue=S.queue.filter(x=>x!==q)
        remember();ok++
      }catch(e){q.reason=e.message;q.checked=false;q.failed=true;errors++}
    }
  }
  try{
    if(navigator.locks?.request)await navigator.locks.request('minfolder-write',run);else await run()
    void refresh()
    msg('저장 '+ok+'건 · 처리 안 됨 '+errors+'건'+(retained?' · 원본 유지 '+retained+'건':''))
  }catch(e){msg('작업이 중단됐어요. '+e.message)}
  finally{busySet(false)}
}
$('workspace').onclick=connect
$('restore-workspace').onclick=requestSaved
$('save-exclusions').onclick=()=>{
  if(!S.root||S.busy){msg('먼저 폴더를 연결해 주세요.');return}
  S.skip=[...new Set($('exclusions').value.split(/[,\n]+/).map(lower).filter(Boolean))].slice(0,100)
  S.queue=S.queue.filter(q=>!isExcluded(q.name)&&!(q.parent||[]).some(n=>isExcluded(n,'directory')))
  if(S.sub.some(n=>isExcluded(n,'directory')))S.sub=[]
  remember();renderQueue();void refresh()
  msg('제외 규칙을 저장했어요. 지정한 이름은 지도와 분류 목록에서 제외해요.')
}
$('refresh').onclick=()=>refresh();$('search').oninput=()=>{for(const n of S.entries.values())n.viewPage=0;renderTree()}
$('show-files').onchange=()=>renderTree()
$('map-expand').onclick=()=>expand(S.selected??[])
$('map-collapse').onclick=()=>{S.expanded=new Set(S.folders.filter(p=>p.length<2).map(key));$('search').value='';renderTree()}
$('pin').onclick=()=>{
  if(S.selected===null)return
  const id=key(S.selected)
  S.pins=S.pins.some(p=>key(p)===id)?S.pins.filter(p=>key(p)!==id):[S.selected,...S.pins].slice(0,20)
  remember();renderPins()
}
$('in-back').onclick=()=>{S.sub=S.sub.slice(0,-1);S.inbox=[];renderInbox();void loadInbox()}
$('in-all').onclick=async()=>{
  const path=[...S.sub]
  for(const h of inboxPage())if(h.kind==='file')await queueInternal(h,path,null)
}
$('drop').onclick=()=>$('files').click()
$('files').onchange=e=>{queueExternal(Array.from(e.target.files),null);e.target.value=''}
bindDrop($('drop'),null)
$('approve').onclick=approve
$('tab-queue').onclick=()=>tab(false);$('tab-history').onclick=()=>tab(true)
document.addEventListener('dragover',e=>{if(accepts(e))e.preventDefault()})
document.addEventListener('drop',e=>{if(accepts(e))e.preventDefault()})
render()
void restoreWorkspace()
if(!window.showDirectoryPicker)msg('폴더 연결을 지원하지 않는 환경이에요. HTTPS의 Edge 또는 Chrome에서 열어 주세요.')
