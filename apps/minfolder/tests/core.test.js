import {test} from 'node:test'
import assert from 'node:assert/strict'
import {predict, filesEqual, separate, transfer} from '../core.js'
const p=['01_계약별 공사자료','02_캠퍼스 운영팀']
const leaf=[...p,'03_작업자료','01_작업절차서']
test('계약과 종류 모두 일치할 때만 제안',()=>{
  assert.deepEqual(predict('캠퍼스 운영_작업절차서.docx',[p,leaf]).path,leaf)
  assert.equal(predict('분당_작업절차서.docx',[p,leaf]).path,null)
  assert.equal(predict('캠퍼스 운영_작업절차서_작업심의.docx',[p,leaf]).path,null)
})
test('정산현황 취합은 공통 총괄장',()=>{
  assert.deepEqual(predict('정산현황_취합.xlsx',[['03_총괄장'],p,leaf]).path,['03_총괄장'])
})
test('파일 비교는 내용까지 확인',async()=>{
  assert.equal(await filesEqual(new Blob(['abc']),new Blob(['abd'])),false)
  assert.equal(await filesEqual(new Blob(['abc']),new Blob(['abc'])),true)
  assert.equal(await filesEqual(new Blob([]),new Blob([])),true)
})
test('동일·중첩 폴더 거절',async()=>{
  assert.equal(await separate({resolve:async()=>[]},{}),false)
  assert.equal(await separate({resolve:async()=>null},{resolve:async()=>['child']}),false)
})
test('대상에 이름이 있으면 쓰기나 삭제에 들어가지 않음',async()=>{
  const dest={getFileHandle:async()=>({}),getDirectoryHandle:async()=>{throw new DOMException('','NotFoundError')}}
  await assert.rejects(transfer({entry:{name:'x.txt',kind:'copy',file:new File(['x'],'x.txt')},target:[],sourceRoot:null,destRoot:dest}),/같은 이름/)
})
const missing=()=>new DOMException('missing','NotFoundError')
function storage(label, seed={}) {
 const contents=new Map()
 const dir={kind:'directory',name:label,deleted:0,failWrite:false,failDelete:false,
  async resolve(other){return other===this?[]:null},
  async getDirectoryHandle(){throw missing()},
  async getFileHandle(name,opt={}){
   if(!contents.has(name)){
    if(!opt.create)throw missing()
    insert(name,'',1)
   }
   return contents.get(name)
  },
  async removeEntry(name){if(this.failDelete)throw Error('denied');this.deleted++;contents.delete(name)}
 }
 function insert(name,data,modified=42){
  let file=new File([data],name,{lastModified:modified})
  const h={name,kind:'file',async isSameEntry(other){return other===h},async getFile(){return file},
   async createWritable(){let buffer;return {
    async write(input){if(dir.failWrite)throw Error('disk full');buffer=input},
    async close(){file=new File([buffer],name,{lastModified:99})},async abort(){}
   }}
  }
  contents.set(name,h)
  return h
 }
 for(const [name,data] of Object.entries(seed))insert(name,data)
 return dir
}
test('내용 검증 후 원본을 지워 이동',async()=>{
 const sourceRoot=storage('분류대기',{'a.txt':'actual bytes'})
 const destRoot=storage('업무폴더')
 const handle=await sourceRoot.getFileHandle('a.txt')
 const file=await handle.getFile()
 const entry={kind:'move',parent:[],name:file.name,handle,size:file.size,modified:file.lastModified}
 assert.equal(await transfer({entry,target:[],sourceRoot,destRoot}),'이동 완료')
 assert.equal(sourceRoot.deleted,1)
 assert.equal(await (await (await destRoot.getFileHandle('a.txt')).getFile()).text(),'actual bytes')
})
test('쓰기 실패 시 원본 삭제 금지',async()=>{
 const sourceRoot=storage('분류대기',{'a.txt':'safe'})
 const destRoot=storage('업무폴더');destRoot.failWrite=true
 const handle=await sourceRoot.getFileHandle('a.txt'),file=await handle.getFile()
 await assert.rejects(transfer({entry:{kind:'move',parent:[],name:file.name,handle,size:file.size,modified:file.lastModified},target:[],sourceRoot,destRoot}),/중단/)
 assert.equal(sourceRoot.deleted,0)
 assert.equal(await (await handle.getFile()).text(),'safe')
})
test('외부 파일은 원본 삭제를 호출하지 않음',async()=>{
 const sourceRoot=storage('분류대기',{'a.txt':'keep'})
 const destRoot=storage('업무폴더')
 const file=new File(['external'],'a.txt')
 assert.equal(await transfer({entry:{kind:'copy',file,name:file.name},target:[],sourceRoot,destRoot}),'복사 완료')
 assert.equal(sourceRoot.deleted,0)
 assert.equal(await (await (await destRoot.getFileHandle('a.txt')).getFile()).text(),'external')
})
test('원본 삭제에 실패하면 복사됨을 명시',async()=>{
 const sourceRoot=storage('분류대기',{'a.txt':'safe'})
 sourceRoot.failDelete=true
 const destRoot=storage('업무폴더')
 const handle=await sourceRoot.getFileHandle('a.txt'),file=await handle.getFile()
 assert.match(await transfer({entry:{kind:'move',parent:[],name:file.name,handle,size:file.size,modified:file.lastModified},target:[],sourceRoot,destRoot}),/삭제 실패/)
 assert.equal(await (await handle.getFile()).text(),'safe')
})
