import {key,norm,predict,openDir,separate,transfer} from './core.js'
const $=s=>document.getElementById(s)
const el=(t,text,cls)=>{const e=document.createElement(t);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e}
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b}
const empty=(container,message)=>container.replaceChildren(el('p',message,'empty'))
const msg=t=>$('alert').textContent=t
const parts=(root,p)=>[root?.name,...p].filter(Boolean).join(' > ')
const busySet=b=>{S.busy=b;for(const id of ['src','dst','refresh'])$(id).disabled=b;renderQueue();renderInbox()}
let sequence=0
const S={src:null,dst:null,folders:[],lookup:new Map(),expanded:new Set(),selected:null,sub:[],inbox:[],queue:[],pins:[],history:[],busy:false}
const dragMime='application/x-minfolder-inbox'
let dragItem=null
let dragSerial=0
const localRead=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}
const localWrite=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
const localKey=()=> 'minfolder.pages.v1:'+S.dst?.name
function remember(){localWrite(localKey(),{pins:S.pins,history:S.history})}
async function connect(which){
  if(!window.showDirectoryPicker){msg('이 브라우저에서는 폴더 연결을 지원하지 않아요. HTTPS의 Edge 또는 Chrome으로 열어 주세요.');return}
  try{
    const h=await showDirectoryPicker({mode:'readwrite',id:which==='src'?'minfolder-source':'minfolder-target'})
    if(!(await separate(h,S[which==='src'?'dst':'src']))){msg('원본과 저장 폴더는 서로 다른 별도 폴더로 선택해 주세요.');return}
    S[which]=h
    if(which==='src'){S.sub=[];S.queue=S.queue.filter(q=>q.kind!=='move')}
    else {
      S.selected=null
      S.expanded=new Set([key([])])
      S.queue.forEach(q=>q.target=null)
      const state=localRead(localKey(),{})
      S.pins=Array.isArray(state.pins)?state.pins:[]
      S.history=Array.isArray(state.history)?state.history:[]
    }
    $(which+'-name').textContent=h.name
    await refresh()
    msg(h.name+' 연결 완료')
  }catch(e){if(e.name!=='AbortError') msg('폴더 연결 실패 · '+e.message)}
}
async function scan(root){
  const found=[[]], pending=[[root,[]]]
  let limited=false
  while(pending.length){
    const [h,path]=pending.shift()
    if(path.length>=12){limited=true;continue}
    let entries
    try { entries=[];for await(const v of h.values())if(v.kind==='directory')entries.push(v) }
    catch(e){if(!path.length)throw e;continue}
    entries.sort((a,b)=>a.name.localeCompare(b.name,'ko',{numeric:true}))
    for(const entry of entries){
      if(found.length>=3000){limited=true;return {found,limited}}
      const sub=[...path,entry.name]
      found.push(sub);pending.push([entry,sub])
    }
  }
  return {found,limited}
}
async function refresh(){
  try {
    if(S.dst){
      const snapshot=await scan(S.dst)
      S.folders=snapshot.found
      S.lookup=new Map(S.folders.map(p=>[key(p),p]))
      if(snapshot.limited)msg('큰 폴더 구조는 3,000개 또는 깊이 12까지 표시돼요.')
      S.queue.forEach(q=>{if(q.target&&!S.lookup.has(key(q.target)))q.target=null})
    }
    if(S.src){
      S.inbox=[]
      try {
        const current=await openDir(S.src,S.sub)
        for await(const h of current.values())S.inbox.push(h)
        S.inbox.sort((a,b)=>a.kind===b.kind?a.name.localeCompare(b.name,'ko',{numeric:true}):a.kind==='directory'?-1:1)
      }catch(e){msg('원본 폴더를 읽지 못했어요. '+e.message)}
    }
  }catch(e){msg('폴더 목록을 읽지 못했어요. '+e.message)}
  render()
}
function accepts(e){return Array.from(e.dataTransfer?.types||[]).some(t=>t==='Files'||t===dragMime)}
function bindDrop(node,path){
  node.ondragover=e=>{
    if(!accepts(e)||S.busy)return
    e.preventDefault();e.stopPropagation()
    e.dataTransfer.dropEffect=dragItem?'move':'copy'
    node.classList.add('hot')
    if(path)$('target').textContent='저장 위치 · '+parts(S.dst,path)
  }
  node.ondragleave=e=>{if(!node.contains(e.relatedTarget))node.classList.remove('hot')}
  node.ondrop=e=>{
    if(!accepts(e)||S.busy)return
    e.preventDefault();e.stopPropagation();node.classList.remove('hot')
    if(e.dataTransfer.getData(dragMime)===String(dragSerial)&&dragItem){
      const item=dragItem;dragItem=null;void queueInternal(item.handle,item.parent,path)
    }else {
      queueExternal(Array.from(e.dataTransfer.files),path)
    }
  }
}
function renderTree(){
  if(!S.dst){empty($('tree'),'저장 폴더를 연결하면 실제 폴더 구조가 여기에 나타나요.');renderPins();return}
  const q=norm($('search').value)
  const visible=S.folders.filter(p=>q ? p.some(s=>norm(s).includes(q)) : p.every((_,i)=>S.expanded.has(key(p.slice(0,i)))))
  visible.sort((a,b)=>{
    for(let i=0;i<Math.min(a.length,b.length);i++){
      const cmp=a[i].localeCompare(b[i],'ko',{numeric:true})
      if(cmp)return cmp
    }
    return a.length-b.length
  })
  const parents=new Set(S.folders.slice(1).map(p=>key(p.slice(0,-1))))
  const frag=document.createDocumentFragment()
  for(const p of visible){
    const id=key(p), row=el('div',null,'tree-row depth-'+Math.min(p.length,10))
    const toggle=button(parents.has(id)?(S.expanded.has(id)?'−':'+'):'·',()=>{
      if(S.expanded.has(id))S.expanded.delete(id);else S.expanded.add(id);renderTree()
    })
    toggle.className='toggle';toggle.disabled=!parents.has(id);toggle.setAttribute('aria-label','하위 폴더 펼치기/접기')
    const folder=button(p.at(-1)||S.dst.name,()=>select(p))
    folder.className='node';folder.title=parts(S.dst,p)
    row.classList.toggle('selected',S.selected!==null&&id===key(S.selected))
    row.append(toggle,folder);bindDrop(row,p);frag.append(row)
  }
  if(!visible.length)empty($('tree'),'검색 결과가 없어요.')
  else $('tree').replaceChildren(frag)
  $('target').textContent=S.selected?'선택한 폴더 · '+parts(S.dst,S.selected):''
  renderPins()
}
function select(p){
  S.selected=p
  for(let i=0;i<p.length;i++)S.expanded.add(key(p.slice(0,i)))
  renderTree()
}
function renderPins(){
  $('pins').replaceChildren()
  for(const p of S.pins.filter(Array.isArray)){
    if(!S.lookup.has(key(p)))continue
    const b=button(p.at(-1)||S.dst.name,()=>{$('search').value='';select(p)})
    b.title=parts(S.dst,p);$('pins').append(b)
  }
  const selected=S.selected!==null, pinned=selected&&S.pins.some(p=>key(p)===key(S.selected))
  $('pin').disabled=!selected;$('pin').textContent=pinned?'선택 폴더 고정 해제':'선택 폴더 고정'
}
function renderInbox(){
  $('in-count').textContent=S.inbox.filter(h=>h.kind==='file').length
  $('in-all').disabled=S.busy||!S.inbox.some(h=>h.kind==='file')||!S.dst
  $('in-path').textContent=S.src?parts(S.src,S.sub):''
  $('in-back').hidden=!S.sub.length
  $('in-back').disabled=S.busy
  if(!S.src){empty($('inbox'),'분류대기 폴더를 연결하면 여기에서 파일을 선택하고 이동할 수 있어요.');return}
  if(!S.inbox.length){empty($('inbox'),'이 폴더에는 항목이 없어요.');return}
  const frag=document.createDocumentFragment()
  for(const h of S.inbox){
    const row=el('div',null,'entry');const name=el('span',h.name);const path=[...S.sub]
    if(h.kind==='directory'){
      const b=button('열기',()=>{S.sub=[...path,h.name];void refresh()});b.disabled=S.busy;row.append(name,b)
    }else{
      const b=button('분류',()=>queueInternal(h,path,null));b.disabled=S.busy||!S.dst
      row.draggable=!S.busy&&!!S.dst
      row.ondragstart=e=>{
        if(S.busy||!S.dst){e.preventDefault();return}
        dragItem={handle:h,parent:path};dragSerial++
        e.dataTransfer.setData(dragMime,String(dragSerial));e.dataTransfer.effectAllowed='move'
      }
      row.ondragend=()=>{dragItem=null}
      row.append(name,b)
    }
    frag.append(row)
  }
  $('inbox').replaceChildren(frag)
}
function add(rec, path){
  const p=path!==null?{path,reason:'지도에서 지정한 위치예요.'}:predict(rec.name,S.folders)
  if(rec.kind==='move'&&S.queue.some(x=>x.kind==='move'&&x.name===rec.name&&key(x.parent)===key(rec.parent)))return
  S.queue.push({...rec,id:++sequence,target:p.path,reason:p.reason,checked:true})
}
async function queueInternal(handle,parent,path){
  if(!S.src||!S.dst||S.busy)return
  try {
    const source=S.src, dest=S.dst
    const file=await handle.getFile()
    if(source!==S.src||dest!==S.dst||S.busy)return
    add({kind:'move',name:file.name,handle,parent,size:file.size,modified:file.lastModified},path)
    tab(false);renderQueue()
  }catch(e){msg('파일을 읽지 못했어요. '+e.message)}
}
function queueExternal(files,path){
  if(!S.dst){msg('먼저 저장 폴더를 연결해 주세요.');return}
  if(S.busy||!files.length)return
  for(const file of files)add({kind:'copy',name:file.name,file},path)
  tab(false);renderQueue()
  msg('탐색기에서 가져온 파일은 승인 후 복사해요. 원본은 그대로예요.')
}
function ready(){return S.queue.filter(q=>q.checked&&q.target!==null&&S.lookup.has(key(q.target)))}
function counts(){
  const r=ready(), moves=r.filter(q=>q.kind==='move').length
  $('summary').textContent=r.length ? '승인 대상 '+r.length+'건 · 이동 '+moves+' / 복사 '+(r.length-moves) : '위치가 정해진 항목을 선택하세요.'
  $('approve').disabled=S.busy||!r.length
}
function renderQueue(){
  $('q-count').textContent=S.queue.length
  if(!S.queue.length){empty($('queue'),'아직 분류할 파일이 없어요. 먼저 파일을 놓거나 분류대기 파일을 골라 주세요.');counts();return}
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
    for(const p of S.folders){
      const option=el('option',parts(S.dst,p));option.value=key(p);where.append(option)
    }
    where.value=q.target!==null?key(q.target):''
    where.onchange=()=>{q.target=S.lookup.get(where.value)??null;q.reason='직접 선택한 위치예요.';renderQueue()}
    row.append(head,where,el('small',q.reason,'reason'));frag.append(row)
  }
  $('queue').replaceChildren(frag);counts()
}
function renderHistory(){
  if(!S.history.length){empty($('history'),'아직 저장한 파일이 없어요.');return}
  const frag=document.createDocumentFragment()
  for(const h of S.history){
    const row=el('div',null,'hrow')
    row.append(el('b',h.name),el('small',h.status+' · '+new Date(h.time).toLocaleString('ko-KR')),el('small',parts(S.dst,h.path)))
    if(S.lookup.has(key(h.path)))row.append(button('지도에서 보기',()=>{$('search').value='';select(h.path)}))
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
        const status=await transfer({entry:q,target:q.target,sourceRoot:S.src,destRoot:S.dst})
        if(status.includes('원본'))retained++
        S.history.unshift({name:q.name,path:q.target,status,time:Date.now()})
        S.history=S.history.slice(0,40)
        S.queue=S.queue.filter(x=>x!==q)
        remember();ok++
      }catch(e){q.reason=e.message;q.checked=false;errors++}
    }
  }
  try{
    if(navigator.locks?.request)await navigator.locks.request('minfolder-write',run);else await run()
    await refresh()
    msg('저장 '+ok+'건 · 처리 안 됨 '+errors+'건'+(retained?' · 원본 유지 '+retained+'건':''))
  }catch(e){msg('작업이 중단됐어요. '+e.message)}
  finally{busySet(false)}
}
$('src').onclick=()=>connect('src');$('dst').onclick=()=>connect('dst')
$('refresh').onclick=()=>refresh();$('search').oninput=()=>renderTree()
$('pin').onclick=()=>{
  if(S.selected===null)return
  const id=key(S.selected)
  S.pins=S.pins.some(p=>key(p)===id)?S.pins.filter(p=>key(p)!==id):[S.selected,...S.pins].slice(0,20)
  remember();renderPins()
}
$('in-back').onclick=()=>{S.sub=S.sub.slice(0,-1);void refresh()}
$('in-all').onclick=async()=>{
  const path=[...S.sub]
  for(const h of [...S.inbox])if(h.kind==='file')await queueInternal(h,path,null)
}
$('drop').onclick=()=>$('files').click()
$('files').onchange=e=>{queueExternal(Array.from(e.target.files),null);e.target.value=''}
bindDrop($('drop'),null)
$('approve').onclick=approve
$('tab-queue').onclick=()=>tab(false);$('tab-history').onclick=()=>tab(true)
document.addEventListener('dragover',e=>{if(accepts(e))e.preventDefault()})
document.addEventListener('drop',e=>{if(accepts(e))e.preventDefault()})
render()
if(!window.showDirectoryPicker)msg('폴더 연결을 지원하지 않는 환경이에요. HTTPS의 Edge 또는 Chrome에서 열어 주세요.')
