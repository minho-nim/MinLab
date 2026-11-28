// Synthetic business folders for comparing the web and desktop layouts. No company files.
export function installDemo(options={}) {
  localStorage.setItem('minfolder.browse-view',JSON.stringify(options.view||'map'))
  const definitions={name:'업무자료',children:[
    {name:'계약별공사자료',children:[
      {name:'강남케이블공사',children:[{name:'견적및계약',children:[]},{name:'작업자료',children:[{name:'작업절차서',children:[]},{name:'작업심의',children:[]},{name:'선번장',children:[]}]},{name:'안전서류',children:[{name:'위험성평가',children:[]}]},{name:'완료및정산',children:[]}]},
      {name:'송도케이블공사',children:[{name:'작업자료',children:[]},{name:'안전서류',children:[]}]},
      {name:'평택설비공사',children:[{name:'견적및계약',children:[]},{name:'작업자료',children:[]}]}
    ]},
    {name:'공무및회계',children:[{name:'매입세금계산서',children:[]},{name:'대금지급',children:[]}]},
    {name:'총괄장',children:[]},
    {name:'강남케이블공사_작업절차서_1123.docx',size:245760},
    {name:'송도케이블공사_위험성평가_1123.xlsx',size:98304},
    {name:options.longName?'평택설비공사_동측_지하공동구_케이블_작업구간_변경에_따른_견적서_최종검토_20261123_수정본.pdf':'평택설비공사_견적서_1123.pdf',size:524288}
  ]}
  if(options.manyFiles)for(let n=1;n<=45;n++)definitions.children.push({name:`추가자료_${String(n).padStart(2,'0')}.pdf`,size:4096})
  const entries=new Map(),children=new Map(),handles=new Map();let next=0
  function make(spec,parent='C:',relative=[]){
    const path=parent+'\\'+spec.name,id='demo-'+(++next),kind=spec.children?'directory':'file'
    const e={id,name:spec.name,path,kind,size:spec.size??0,modified:'1795392000000000000',relative}
    entries.set(id,e)
    const handle={name:e.name,kind,id,queryPermission:async()=> 'granted',requestPermission:async()=> 'granted',isSameEntry:async other=>other?.id===id,
      values:async function*(){for(const child of children.get(id)??[])yield handles.get(child.id)},
      getDirectoryHandle:async name=>find(name,'directory'),getFileHandle:async(name,options)=>{try{return find(name,'file')}catch(e){if(!options?.create)throw e;const created=make({name,size:0},path,[...relative,name]);children.get(id).push(created);return handles.get(created.id)}},
      createWritable:async()=>({write:async payload=>{e.contents=new Uint8Array(await payload.arrayBuffer());e.size=e.contents.length;e.modifiedMS=Date.now()},close:async()=>{},abort:async()=>{}}),
      removeEntry:async name=>{const list=children.get(id),index=list.findIndex(c=>c.name===name);if(index<0)throw new DOMException('Not found','NotFoundError');list.splice(index,1)},
      getFile:async()=>new File([e.contents??new Uint8Array(e.size)],e.name,{lastModified:e.modifiedMS??1795392000000}),
      resolve:async other=>{const target=entries.get(other?.id);if(target?.path.startsWith(e.path+'\\'))return target.relative.slice(e.relative.length);return null}}
    function find(name,kind){const child=(children.get(id)??[]).find(c=>c.name===name&&c.kind===kind);if(!child)throw new DOMException('Not found','NotFoundError');return handles.get(child.id)}
    handles.set(id,handle)
    if(spec.children)children.set(id,spec.children.map(child=>make(child,path,[...relative,child.name])))
    return e
  }
  const root=make(definitions)
  window.showDirectoryPicker=async()=>handles.get(root.id)
  // FileSystemHandle is structured-cloneable in the browser; mimic that for this fixture.
  window.indexedDB.open=()=>{
    const op={};queueMicrotask(()=>{
      op.result={close(){},transaction(){const tx={objectStore(){return {put(){queueMicrotask(()=>tx.oncomplete?.())},get(){const req={};queueMicrotask(()=>{req.result=undefined;req.onsuccess?.()});return req}}}};return tx}}
      op.onsuccess?.()
    });return op
  }
  if(options.mode==='web')return
  const callbacks={},events={};let callback=0
  const moveHistory=[]
  window.demo={entries:[...entries.values()],events,callbacks,calls:[],history:moveHistory}
  window.isTauri=true
  window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'}},transformCallback(fn){callbacks[++callback]=fn;return callback},unregisterCallback(){},invoke:async(cmd,args)=>{
    window.demo.calls.push({cmd,args})
    if(cmd==='plugin:app|version')return '0.4.0'
      if(cmd==='plugin:window|is_maximized')return false
      if(['plugin:window|minimize','plugin:window|toggle_maximize','plugin:window|close','plugin:process|restart','prepare_update'].includes(cmd))return
      if(cmd==='plugin:updater|check')return null
      if(cmd==='plugin:event|listen'){events[args.event]=args.handler;return args.handler}
    if(cmd==='plugin:dialog|open')return args.options.directory?root.path:null
    if(cmd==='plugin:dialog|message')return 'Ok'
    if(cmd==='connect_root')return root
    if(cmd==='list_directory'){
      if(options.delay)await new Promise(r=>setTimeout(r,options.delay))
      if(options.error)throw '공유폴더 접근 권한을 확인해 주세요.'
      return {entries:children.get(args.id)??[],done:true,skipped:0}
    }
    if(cmd==='move_history')return moveHistory.map(r=>({...r}))
    if(cmd==='clear_move_history'){moveHistory.length=0;return}
    if(cmd==='move_file'){
      const file=entries.get(args.sourceId),target=entries.get(args.targetId)
      if(!file||!target)throw '항목 없음'
      const sourcePath=file.path,destinationPath=target.path+'\\'+file.name
      const source=[...children.values()].find(list=>list.some(e=>e.id===file.id));source.splice(source.findIndex(e=>e.id===file.id),1)
      children.get(target.id).push(file);file.path=destinationPath
      const r={id:'move-'+(moveHistory.length+1),undoId:'move-'+(moveHistory.length+1),name:file.name,sourcePath,destinationPath,rootPath:root.path,time:Date.now(),status:'이동 완료',canUndo:true,fileId:file.id}
      moveHistory.unshift(r);return {...r}
    }
    if(cmd==='undo_move'){
      if(window.demo.undoError)throw window.demo.undoError
      const r=moveHistory.find(r=>r.id===args.id);if(!r?.canUndo)throw '되돌릴 수 없음'
      const file=entries.get(r.fileId),source=[...children.values()].find(list=>list.some(e=>e.id===file.id));source.splice(source.findIndex(e=>e.id===file.id),1)
      const parent=[...entries.values()].find(e=>e.path===r.sourcePath.slice(0,r.sourcePath.lastIndexOf('\\')));children.get(parent.id).push(file);file.path=r.sourcePath;r.canUndo=false;r.status='되돌리기 완료'
      return {sourcePath:r.destinationPath,destinationPath:r.sourcePath,name:r.name,status:r.status,undoId:r.id}
    }
    if(cmd==='open_entry')return
    if(cmd==='import_files')return [...entries.values()].filter(e=>args.paths.includes(e.path))
    throw Error('Unsupported demo operation '+cmd)
  }}
}
