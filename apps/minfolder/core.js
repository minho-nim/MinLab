export const key = p => JSON.stringify(p)
export const bare = s => s.replace(/^\d+[_. -]+/u,'')
export const norm = s => bare(s).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'')
const title = p => norm(p.at(-1) || '')
export function predict(filename, folders) {
  const text = norm(filename.replace(/\.[^.]+$/,''))
  const pick = (p, reason) => ({ path: p, reason })
  const shared = [
    [/총괄장|정산현황|취합본/u,'총괄장',''],
    [/하도급승낙/u,'공무및회계','하도급승낙신청'],
    [/매입세금계산서/u,'공무및회계','매입세금계산서'],
    [/대금지급요청|대금지급/u,'공무및회계','대금지급']
  ]
  for(const [pattern, group, child] of shared){
    if(!pattern.test(text)) continue
    const hits=folders.filter(p=>child ? p.length===2 && norm(p[0])===group && title(p)===child : p.length===1 && title(p)===group)
    if(hits.length===1) return pick(hits[0],'파일명에서 공통 업무를 찾았어요.')
  }
  const uses = [
    [/작업절차서/u,'작업자료','작업절차서'],
    [/작업심의|안전작업심의/u,'작업자료','작업심의'],
    [/선번장/u,'작업자료','선번장'],
    [/포설요청|작업계획/u,'작업자료',''],
    [/완료확인|정산품의|매출품의|매입품의/u,'완료및정산',''],
    [/위험성평가/u,'안전서류','위험성평가'],
    [/산안비|산업안전보건관리비/u,'안전서류','산안비'],
    [/안전서류|안전보건실적/u,'안전서류',''],
    [/견적|계약품의|계약서|하도급/u,'견적및계약','']
  ]
  const projects=folders.filter(p=>p.length===2 && norm(p[0])==='계약별공사자료')
  const hits=projects.filter(p=>{
    const label=title(p)
    const short=label.replace(/(?:케이블공사|공사|팀)$/u,'')
    return (label.length>=3 && text.includes(label)) || (short.length>=3 && text.includes(short))
  })
  // A single document type and project must both agree before a recommendation.
  if(hits.length!==1) return pick(null,hits.length?'계약·팀 후보가 여러 개예요.':'파일명에서 계약·팀을 찾지 못했어요.')
  const types=uses.filter(([re])=>re.test(text))
  if(types.length!==1) return pick(null,types.length?'문서 종류가 여러 개 보여요.':'문서 종류를 찾지 못했어요.')
  const [,group,child]=types[0]
  const project=hits[0], base=key(project)
  const inside=folders.filter(p=>p.length>2 && key(p.slice(0,2))===base)
  const exact=inside.filter(p=>child && title(p)===child && (p.length===3 || norm(p.at(-2))===group))
  if(exact.length===1) return pick(exact[0],'계약·팀과 문서 종류가 일치해요.')
  const broad=inside.filter(p=>p.length===3 && title(p)===group)
  if(broad.length===1) return pick(broad[0],'계약·팀과 상위 문서 폴더를 찾았어요.')
  return pick(null,'이 계약에 맞는 문서 폴더가 없어요.')
}
export async function openDir(root, path) {
  let out=root
  for(const seg of path) out=await out.getDirectoryHandle(seg)
  return out
}
export async function separate(a,b) {
  if(!a || !b) return true
  return (await a.resolve(b))===null && (await b.resolve(a))===null
}
export async function filesEqual(a,b) {
  if(a.size!==b.size) return false
  const step=2**20
  for(let n=0;n<a.size;n+=step){
    const [ab,bb]=await Promise.all([a.slice(n,n+step).arrayBuffer(),b.slice(n,n+step).arrayBuffer()])
    const av=new Uint8Array(ab), bv=new Uint8Array(bb)
    for(let i=0;i<av.length;i++) if(av[i]!==bv[i]) return false
  }
  return true
}
// The browser has no exclusive-create flag for user-selected folders. Check
// before creation, serialize this app's writes, and never remove a failed output blindly.
export async function transfer({entry, target, sourceRoot, destRoot}) {
  if(sourceRoot!==destRoot&&!(await separate(sourceRoot,destRoot))) throw Error('원본과 저장 폴더가 같거나 서로 안에 있어요.')
  const dest=await openDir(destRoot,target)
  let original, src
  if(entry.kind==='move') {
    src=await openDir(sourceRoot,entry.parent)
    if((sourceRoot===destRoot&&key(entry.parent)===key(target)) || await src.isSameEntry?.(dest)) throw Error('이미 이 폴더에 있는 파일이에요.')
    original=await src.getFileHandle(entry.name)
    if(!(await original.isSameEntry(entry.handle))) throw Error('원본 항목이 바뀌었어요. 다시 추가해 주세요.')
  }
  const payload=original?await original.getFile():entry.file
  if(original && (payload.size!==entry.size || payload.lastModified!==entry.modified)) throw Error('원본이 바뀌었어요. 다시 추가해 주세요.')
  let occupied=false
  for(const method of ['getFileHandle','getDirectoryHandle']){
    try { await dest[method](entry.name); occupied=true }
    catch(e){ if(!['NotFoundError','TypeMismatchError'].includes(e.name)) throw e }
  }
  if(occupied) throw Error('같은 이름이 있어요. 원본은 그대로예요.')
  let writer
  try {
    const output=await dest.getFileHandle(entry.name,{create:true})
    const empty=await output.getFile()
    if(empty.size!==0) throw Error('저장 위치에 같은 이름의 파일이 생겼어요.')
    writer=await output.createWritable()
    await writer.write(payload)
    await writer.close()
    writer=null
    const saved=await output.getFile()
    if(!(await filesEqual(payload,saved))) throw Error('저장한 내용이 일치하지 않아요.')
    if(!original) return '복사 완료'
    const latestHandle=await src.getFileHandle(entry.name)
    const latest=await latestHandle.getFile()
    if(!(await original.isSameEntry(latestHandle)) || latest.lastModified!==payload.lastModified || !(await filesEqual(latest,saved))){
      return '복사 완료 · 원본 변경으로 삭제 안 함'
    }
    try { await src.removeEntry(entry.name); return '이동 완료' }
    catch { return '복사 완료 · 원본 삭제 실패' }
  } catch(e){
    if(writer) try{await writer.abort()}catch{}
    throw Error('저장 중 중단됐어요. 저장 폴더를 확인해 주세요. '+e.message)
  }
}
