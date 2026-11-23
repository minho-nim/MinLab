import {test, before, after} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {fileURLToPath} from 'node:url'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
let server,browser,url
before(async()=>{
  server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{host:'127.0.0.1',port:0}})
  await server.listen();url=server.resolvedUrls.local[0]
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']})
})
after(async()=>{await browser?.close();await server?.close()})
async function pageWithBridge(){
  const page=await browser.newPage({viewport:{width:1320,height:950}})
  await page.addInitScript(()=>{
    const dir=(id,name,path)=>({id,name,path,kind:'directory',size:0,modified:'0'})
    const file=(id,name,path)=>({id,name,path,kind:'file',size:2345,modified:'1'})
    const root=dir('root','업무자료','C:\\업무자료')
    const group=dir('group','계약별공사자료',root.path+'\\계약별공사자료')
    const project=dir('project','강남공사',group.path+'\\강남공사')
    const work=dir('work','작업자료',project.path+'\\작업자료')
    const destination=dir('destination','작업절차서',work.path+'\\작업절차서')
    const document=file('document','강남공사_작업절차서.docx',root.path+'\\강남공사_작업절차서.docx')
    const external=file('external','강남공사_작업절차서_외부.docx','C:\\Downloads\\강남공사_작업절차서_외부.docx')
    const lists={root:[group,document],group:[project],project:[work],work:[destination],destination:[]}
    const callbacks={},events={};let next=0
    window.testBridge={calls:[],accept:true,failMove:false,events,emit:(event,payload)=>callbacks[events[event]]({event,payload})}
    window.isTauri=true
    window.__TAURI_INTERNALS__={metadata:{currentWindow:{label:'main'}},transformCallback:fn=>{callbacks[++next]=fn;return next},unregisterCallback:()=>{},invoke:async(cmd,args)=>{
      window.testBridge.calls.push({cmd,args})
      if(cmd==='plugin:event|listen'){events[args.event]=args.handler;return args.handler}
      if(cmd==='plugin:dialog|open')return args.options.directory?root.path:[external.path]
      if(cmd==='plugin:dialog|message')return window.testBridge.accept?'Ok':'Cancel'
      if(cmd==='connect_root')return root
      if(cmd==='list_directory')return {entries:lists[args.id]??[],done:true,skipped:0}
      if(cmd==='import_files')return [external]
      if(cmd==='open_entry')return
      if(cmd==='move_file'){
        if(window.testBridge.failMove)throw '같은 이름의 파일이 있어요.'
        const source=args.sourceId==='external'?external:document
        lists.root=lists.root.filter(e=>e.id!==source.id)
        const target=Object.values(lists).flat().find(e=>e.id===args.targetId)
        const moved={...source,id:source.id+'-moved',path:target.path+'\\'+source.name}
        lists[args.targetId].push(moved)
        return {sourcePath:source.path,destinationPath:moved.path,name:source.name,status:'이동 완료'}
      }
      throw new Error('Unexpected command '+cmd)
    }}
  })
  await page.goto(url);await page.getByRole('button',{name:'폴더 연결',exact:true}).click()
  await page.getByRole('button',{name:'강남공사_작업절차서.docx',exact:false}).waitFor()
  return page
}
async function waitForSuggestion(page){
  await page.getByRole('button',{name:'분류',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('#queue select')?.value==='destination')
}
test('파일 열기는 기본 프로그램 요청으로 전달하고 이동은 승인 이후에만 수행',async()=>{
  const page=await pageWithBridge()
  await page.locator('.file-label').click()
  assert.equal(await page.evaluate(()=>testBridge.calls.filter(c=>c.cmd==='open_entry').length),1)
  await waitForSuggestion(page)
  assert.equal(await page.evaluate(()=>testBridge.calls.filter(c=>c.cmd==='move_file').length),0)
  await page.getByRole('button',{name:'선택 파일 이동 승인',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('이동 완료 1건'))
  assert.equal(await page.locator('#queue .queue-item').count(),0)
  assert.match(await page.locator('#history').textContent(),/강남공사_작업절차서/)
  await page.close()
})
test('승인 취소 및 이동 실패 시 파일을 대기 목록에 유지',async()=>{
  const page=await pageWithBridge();await waitForSuggestion(page)
  await page.evaluate(()=>testBridge.accept=false)
  await page.locator('#approve').click();await page.waitForFunction(()=>!document.querySelector('#approve').disabled)
  assert.equal(await page.evaluate(()=>testBridge.calls.filter(c=>c.cmd==='move_file').length),0)
  await page.evaluate(()=>{testBridge.accept=true;testBridge.failMove=true})
  await page.locator('#approve').click();await page.waitForFunction(()=>document.querySelector('.queue-item.failed'))
  assert.equal(await page.locator('#queue .queue-item').count(),1)
  assert.match(await page.locator('#queue').textContent(),/같은 이름/)
  assert.equal(await page.locator('#approve').isDisabled(),true)
  await page.close()
})
test('내부 드래그는 폴더 지정만 하고 파일 열기·이동을 실행하지 않음',async()=>{
  const page=await pageWithBridge()
  const source=await page.locator('.file-label').boundingBox(),target=await page.locator('[data-folder="group"]').boundingBox()
  await page.mouse.move(source.x+15,source.y+12);await page.mouse.down();await page.mouse.move(target.x+25,target.y+12,{steps:12});await page.mouse.up()
  assert.equal(await page.locator('#queue select').inputValue(),'group')
  assert.equal(await page.evaluate(()=>testBridge.calls.filter(c=>['move_file','open_entry'].includes(c.cmd)).length),0)
  await page.close()
})
test('탐색기 드롭은 실제 경로를 받아 지정한 목적지로 분류',async()=>{
  const page=await pageWithBridge()
  await page.locator('[data-folder="group"]').evaluate(node=>{const r=node.getBoundingClientRect();testBridge.emit('tauri://drag-drop',{paths:['C:\\Downloads\\강남공사_작업절차서_외부.docx'],position:{x:(r.x+10)*devicePixelRatio,y:(r.y+10)*devicePixelRatio}})})
  await page.waitForFunction(()=>document.querySelector('#queue select')?.value==='group')
  assert.match(await page.locator('#queue').textContent(),/외부/)
  assert.equal(await page.evaluate(()=>testBridge.calls.filter(c=>c.cmd==='move_file').length),0)
  await page.screenshot({path:join(tmpdir(),'minfolder-desktop-preview.png'),fullPage:true})
  await page.close()
})
