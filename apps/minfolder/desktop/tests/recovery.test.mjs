import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {fileURLToPath} from 'node:url'
import {mkdir} from 'node:fs/promises'
import {join} from 'node:path'
import {installDemo} from './fixtures/demo.mjs'
let server,browser,url
before(async()=>{
 server=await createServer({configFile:false,root:fileURLToPath(new URL('../..',import.meta.url)),server:{host:'127.0.0.1',port:0}});await server.listen();url=server.resolvedUrls.local[0]
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']})
})
after(async()=>{await browser?.close();await server?.close()})
async function make(mode){
 const page=await browser.newPage({viewport:{width:1400,height:900}});await page.route('**/@vite/client',r=>r.fulfill({contentType:'application/javascript',body:''}));await page.addInitScript(installDemo,{mode,view:'columns'});page.on('dialog',d=>d.accept());await page.goto(url+(mode==='web'?'index.html':'desktop/index.html'));await page.locator(mode==='web'?'#workspace':'#connect').click();return page
}
for(const mode of ['native','web'])test(`${mode}: 승인·이동 기록·되돌리기·추천 기록 삭제`,async()=>{
 const page=await make(mode),errors=[];page.on('pageerror',e=>errors.push(e.message))
 try{
  const rows=page.locator(mode==='web'?'#inbox .entry':'#files .file-row');await rows.filter({hasText:'평택설비공사_견적서'}).getByRole('button',{name:'분류',exact:true}).click()
  await page.waitForFunction(()=>!document.querySelector('#approve').disabled);await page.locator('#approve').click()
  await page.waitForFunction(()=>document.querySelector('#queue').textContent.includes('파일')||!document.querySelector('#queue').textContent.trim())
  if(mode==='native')await page.locator('.history-section summary').click();else await page.locator('#tab-history').click()
  const undo=page.getByRole('button',{name:'원래 위치로 되돌리기'});await undo.waitFor()
  await page.waitForFunction(selector=>document.querySelector(selector).textContent.startsWith('2'),mode==='web'?'#in-count':'#file-count')
  if(process.env.MINFOLDER_CAPTURE_DIR){await mkdir(process.env.MINFOLDER_CAPTURE_DIR,{recursive:true});for(const width of [1400,400]){await page.setViewportSize({width,height:900});await page.screenshot({path:join(process.env.MINFOLDER_CAPTURE_DIR,`${mode}-history-${width}.png`),fullPage:width<900})}await page.setViewportSize({width:1400,height:900})}
  await undo.click()
  await page.waitForFunction(()=>document.querySelector('#history').textContent.includes('되돌리기 완료'))
  assert.equal(await page.getByRole('button',{name:'원래 위치로 되돌리기'}).count(),0)
  await page.waitForFunction(selector=>document.querySelector(selector).textContent.includes('평택설비공사_견적서'),mode==='web'?'#inbox':'#files')
  if(mode==='native')await page.locator('#window-version').click();else await page.locator('#settings-open').click()
  assert.match(await page.locator('#learn-count').textContent(),/0건/)
  await page.locator('#learn-approvals').uncheck();assert.equal(await page.locator('#learn-approvals').isChecked(),false)
  await page.locator('#clear-learning').click()
  for(const width of [1400,400]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
  assert.deepEqual(errors,[])
 }finally{await page.close()}
})
test('native: 되돌리기 실패를 표시하고 원본·기록을 유지한 채 재시도',async()=>{
 const page=await make('native')
 try{
  await page.locator('#files .file-row').filter({hasText:'평택설비공사_견적서'}).getByRole('button',{name:'분류',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#approve').disabled);await page.locator('#approve').click();await page.locator('.history-section summary').click()
  await page.evaluate(()=>demo.undoError='공유폴더 연결이 끊겼어요.');await page.getByRole('button',{name:'원래 위치로 되돌리기'}).click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('되돌리지 못했어요'))
  assert.equal(await page.getByRole('button',{name:'원래 위치로 되돌리기'}).isEnabled(),true)
  await page.evaluate(()=>demo.undoError=null);await page.getByRole('button',{name:'원래 위치로 되돌리기'}).click();await page.waitForFunction(()=>document.querySelector('#history').textContent.includes('되돌리기 완료'))
 }finally{await page.close()}
})
test('native: 직접 승인한 미분류 이름을 다음 파일 추천에 사용',async()=>{
 const page=await make('native')
 try{
  await page.evaluate(()=>demoFiles.addRootFile('추가자료_보고서.pdf'));await page.locator('#refresh').click()
  await page.locator('#files .file-row').filter({hasText:'추가자료_보고서'}).getByRole('button',{name:'분류',exact:true}).click()
  await page.locator('#queue select').selectOption({label:'총괄장'});await page.locator('#approve').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('이동 완료 1건'))
  await page.evaluate(()=>demoFiles.addRootFile('추가자료_보고서.pdf'));await page.locator('#refresh').click()
  await page.locator('#files .file-row').filter({hasText:'추가자료_보고서'}).getByRole('button',{name:'분류',exact:true}).click()
  await page.waitForFunction(()=>!document.querySelector('#approve').disabled)
  const label=await page.locator('#queue select option:checked').textContent();assert.equal(label,'총괄장')
  await page.locator('.balance-detail-button').click();assert.match(await page.locator('.balance-details').textContent(),/승인한 같은 파일명 유형/)
 }finally{await page.close()}
})
test('web: 원래 위치의 새 파일을 덮어쓰지 않고 되돌리기 중단',async()=>{
 const page=await make('web')
 try{
  await page.locator('#inbox .entry').filter({hasText:'평택설비공사_견적서'}).getByRole('button',{name:'분류',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#approve').disabled);await page.locator('#approve').click();await page.waitForFunction(()=>document.querySelector('#in-count').textContent==='2');await page.locator('#tab-history').click()
  await page.evaluate(()=>demoFiles.addRootFile('평택설비공사_견적서_1123.pdf'));await page.getByRole('button',{name:'원래 위치로 되돌리기'}).click();await page.waitForFunction(()=>document.querySelector('#alert').textContent.includes('되돌리지 못했어요'))
  assert.match(await page.locator('#alert').textContent(),/같은 이름/);assert.equal(await page.getByRole('button',{name:'원래 위치로 되돌리기'}).isEnabled(),true)
 }finally{await page.close()}
})
