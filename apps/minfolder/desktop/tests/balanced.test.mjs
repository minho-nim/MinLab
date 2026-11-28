import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {fileURLToPath} from 'node:url'
import {mkdir} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {installDemo} from './fixtures/demo.mjs'
let server,browser,url
before(async()=>{
  server=await createServer({configFile:false,root:fileURLToPath(new URL('../..',import.meta.url)),server:{host:'127.0.0.1',port:0}});await server.listen();url=server.resolvedUrls.local[0]
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']})
})
after(async()=>{await browser?.close();await server?.close()})
async function make(mode){
  const page=await browser.newPage({viewport:{width:1400,height:900}})
  await page.route('**/@vite/client',r=>r.fulfill({contentType:'application/javascript',body:''}))
  await page.addInitScript(installDemo,{mode,view:'columns',manyFiles:true})
  await page.goto(url+(mode==='web'?'index.html':'desktop/index.html'))
  await page.locator(mode==='web'?'#workspace':'#connect').click()
  await page.waitForFunction(selector=>document.querySelector(selector).textContent==='48'+(selector==='#file-count'?'개':''),mode==='web'?'#in-count':'#file-count')
  return page
}
for(const mode of ['web','native'])test(`${mode}: 승인 상태·대상 변경·영역 조절·배치 복원`,async()=>{
  const page=await make(mode),errors=[];page.on('pageerror',e=>errors.push(e.message))
  try{
    await page.locator('.column-folder').filter({hasText:'계약별공사자료'}).click()
    const count=mode==='web'?'#in-count':'#file-count'
    assert.equal(await page.locator(count).textContent(),mode==='web'?'48':'48개','목적지 탐색은 원본 파일 목록을 바꾸지 않음')
    await page.locator('#use-folder').click();await page.waitForFunction(id=>document.querySelector(id).textContent.startsWith('0'),count)
    await page.locator('.folder-crumbs').getByRole('button',{name:'업무자료',exact:true}).click();await page.locator('#use-folder').click()
    await page.waitForFunction(id=>document.querySelector(id).textContent.startsWith('48'),count)
    const rows=mode==='web'?'#inbox .entry':'#files .file-row'
    for(const name of ['강남케이블공사_작업절차서','송도케이블공사_위험성평가','평택설비공사_견적서','추가자료_01'])await page.locator(rows).filter({hasText:name}).getByRole('button',{name:'분류',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('[data-review-filter=ready]')?.textContent.endsWith('3'))
    assert.match(await page.locator('[data-review-filter=need]').textContent(),/1$/)
    await page.locator('[data-review-filter=need]').click();assert.equal(await page.locator('#queue .balance-row').count(),1)
    assert.match(await page.locator('#summary').textContent(),/숨겨진 선택 3건/)
    assert.equal(await page.locator('#queue input[type=checkbox]').isDisabled(),true)
    const value=await page.locator('#queue select option').nth(1).getAttribute('value');await page.locator('#queue select').selectOption(value)
    assert.match(await page.locator('[data-review-filter=ready]').textContent(),/4$/)
    assert.match(await page.locator('#approve').textContent(),/4개 이동/)
    await page.locator('[data-review-filter=all]').click();assert.equal(await page.locator('#queue .balance-row').count(),4)
    await page.locator('.balance-detail-button').first().click();assert.match(await page.locator('.balance-details').textContent(),/원본/)
    await page.locator('.balance-detail-button').first().click()
    await page.locator('#queue input[type=checkbox]').first().uncheck();assert.match(await page.locator('#approve').textContent(),/3개 이동/)
    const workspace=page.locator(mode==='web'?'.board':'main'),panes=page.locator(mode==='web'?'.right':'.work-panels')
    const before=await workspace.evaluate(n=>n.style.getPropertyValue('--explorer-height'))
    await page.locator('#resize-explorer').focus();await page.keyboard.press('ArrowDown');assert.notEqual(await workspace.evaluate(n=>n.style.getPropertyValue('--explorer-height')),before)
    const x=await page.locator('#resize-source').boundingBox();await page.mouse.move(x.x+x.width/2,x.y+20);await page.mouse.down();await page.mouse.move(x.x+60,x.y+20,{steps:6});await page.mouse.up()
    const width=await panes.evaluate(n=>n.style.getPropertyValue('--source-width'));assert.notEqual(width,'38%')
    assert.equal(await page.locator('#queue .balance-row').count(),4)
    if(mode==='native')assert.equal(await page.evaluate(()=>demo.calls.filter(c=>c.cmd==='move_file').length),0)
    const output=process.env.MINFOLDER_CAPTURE_DIR||join(tmpdir(),'minfolder-ui');await mkdir(output,{recursive:true})
    for(const [w,h]of [[1400,900],[900,600],[400,900]]){
      await page.setViewportSize({width:w,height:h})
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
      if(w>=900){assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.body.scrollHeight<=innerHeight&&scrollY===0));assert.ok(await page.locator('#approve').evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight))}
      await page.screenshot({path:join(output,`10-${mode}-balanced-${w}.png`),fullPage:w<900})
    }
    await page.setViewportSize({width:1400,height:900});const height=await workspace.evaluate(n=>n.style.getPropertyValue('--explorer-height'))
    await page.reload();await page.waitForFunction(()=>!!document.querySelector('#resize-source').getAttribute('aria-valuenow'))
    assert.equal(await workspace.evaluate(n=>n.style.getPropertyValue('--explorer-height')),height)
    assert.equal(await panes.evaluate(n=>n.style.getPropertyValue('--source-width')),width)
    assert.deepEqual(errors,[])
  }finally{await page.close()}
})
test('웹 복사에서 기준 폴더 선택과 빈 위치를 혼동하지 않음',async()=>{
  const page=await make('web')
  try{
    await page.locator('#files').setInputFiles({name:'분류미정.txt',mimeType:'text/plain',buffer:Buffer.from('example')})
    const select=page.locator('#queue select');await select.waitFor()
    assert.equal(await select.inputValue(),'');assert.equal(await page.locator('#approve').isDisabled(),true)
    await select.selectOption({label:'업무자료'});assert.equal(await select.inputValue(),'folder:[]')
    assert.match(await page.locator('#approve').textContent(),/1개 복사/)
    await page.locator('.balance-detail-button').click();assert.match(await page.locator('.balance-details').textContent(),/원본 유지/)
    await select.selectOption('');assert.equal(await page.locator('#approve').isDisabled(),true)
    assert.equal(await page.locator('#queue input[type=checkbox]').isDisabled(),true)
  }finally{await page.close()}
})
