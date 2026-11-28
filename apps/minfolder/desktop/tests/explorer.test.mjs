import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {fileURLToPath} from 'node:url'
import {mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {installDemo} from './fixtures/demo.mjs'
let server,browser,url
before(async()=>{
  server=await createServer({configFile:false,root:fileURLToPath(new URL('../..',import.meta.url)),server:{host:'127.0.0.1',port:0}})
  await server.listen();url=server.resolvedUrls.local[0]
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']})
})
after(async()=>{await browser?.close();await server?.close()})
for(const mode of ['web','native'])test(`${mode}: 열 탐색·초성 검색·경로 복귀·지도 전환`,async()=>{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  try{
    // The published web is static and intentionally forbids connections. Suppress
    // only Vite's development websocket client, preserving the production CSP.
    await page.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}))
    await page.addInitScript(installDemo,{mode,longName:true})
    await page.goto(url+(mode==='web'?'index.html':'desktop/index.html'))
    await page.locator(mode==='web'?'#workspace':'#connect').click()
    await page.locator(mode==='web'?'.map-name':'.folder-name').filter({hasText:'계약별공사자료'}).waitFor()
    await page.locator('#view-columns').click()
    await page.locator('.column-folder').filter({hasText:'계약별공사자료'}).click()
    await page.locator('.column-folder').filter({hasText:'강남케이블공사'}).click()
    await page.locator('.column-folder').filter({hasText:'작업자료'}).waitFor()
    assert.equal(await page.locator('.folder-column').count(),3)
    assert.equal(await page.locator('.folder-crumbs [aria-current]').textContent(),'강남케이블공사')
    const reads=mode==='native'?await page.evaluate(()=>demo.calls.filter(c=>c.cmd==='list_directory').length):0
    await page.locator('#search').fill('ㅈㅇㅈㅊㅅ docx')
    await page.locator('.folder-result').filter({hasText:'작업절차서'}).waitFor()
    assert.equal(await page.locator('.folder-result').count(),1)
    if(mode==='native')assert.equal(await page.evaluate(()=>demo.calls.filter(c=>c.cmd==='list_directory').length),reads,'검색은 새 디스크 읽기를 하지 않음')
    await page.locator('.folder-result').click()
    assert.equal(await page.locator('#search').inputValue(),'')
    assert.equal(await page.locator('.folder-crumbs [aria-current]').textContent(),'업무자료')
    await page.locator('#search').fill('전혀없는이름')
    assert.equal(await page.locator('.folder-result').count(),0)
    assert.match(await page.locator('.folder-search-results').textContent(),/검색 결과가 없어요/)
    await page.locator('#search').fill('')
    const folders=page.locator('.column-folder');await folders.first().focus();await page.keyboard.press('ArrowDown')
    assert.equal(await folders.nth(1).evaluate(n=>n===document.activeElement),true)
    const output=process.env.MINFOLDER_CAPTURE_DIR||join(tmpdir(),'minfolder-ui');await mkdir(output,{recursive:true})
    await page.locator('.column-folder').filter({hasText:'계약별공사자료'}).click()
    await page.locator('.column-folder').filter({hasText:'강남케이블공사'}).click()
    await page.screenshot({path:join(output,`08-${mode}-columns-1366.png`),fullPage:true})
    await page.locator('#view-map').click();assert.equal(await page.locator('#tree').isVisible(),true)
    await page.locator('#search').fill('ㄱㄴ');assert.match(await page.locator('#tree').textContent(),/강남케이블공사/)
    await page.locator('#search').fill('');await page.locator('#view-columns').click()
    assert.equal(await page.locator('.folder-crumbs [aria-current]').textContent(),'강남케이블공사')
    for(const width of [900,400]){
      await page.setViewportSize({width,height:width===900?600:850})
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px 가로 넘침 없음`)
      if(width===900){
        assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),'전체 세로 스크롤 없음')
        assert.ok(await page.locator('#approve').evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight),'승인 버튼이 창 안에 있음')
      }
      await page.screenshot({path:join(output,`08-${mode}-columns-${width}.png`),fullPage:true})
    }
    assert.deepEqual(errors,[])
  }finally{await page.close()}
})
test('열 탐색에서 권한 오류와 다시 읽기 표시',async()=>{
  const page=await browser.newPage()
  try{
    await page.addInitScript(installDemo,{mode:'native',error:true});await page.goto(url+'desktop/index.html');await page.locator('#connect').click()
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('기준 폴더를 읽지 못했어요'))
    await page.locator('#view-columns').click();assert.match(await page.locator('#folder-explorer').textContent(),/접근 권한/)
    assert.equal(await page.getByRole('button',{name:'다시 읽기',exact:true}).count(),2)
  }finally{await page.close()}
})
test('열의 폴더로 드래그해도 승인 전 이동하지 않고 보기 전환 시 대기를 보존',async()=>{
  const page=await browser.newPage({viewport:{width:1366,height:768}})
  try{
    await page.addInitScript(installDemo,{mode:'native'});await page.goto(url+'desktop/index.html');await page.locator('#connect').click()
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('폴더 연결 완료'))
    await page.locator('#view-columns').click()
    const source=await page.locator('#files .file-label').first().boundingBox(),target=await page.locator('.column-folder').filter({hasText:'계약별공사자료'}).boundingBox()
    await page.mouse.move(source.x+40,source.y+12);await page.mouse.down();await page.mouse.move(target.x+40,target.y+12,{steps:8});await page.mouse.up()
    assert.equal(await page.locator('#queue select').count(),1)
    const id=await page.locator('#queue select').inputValue();assert.ok(id)
    await page.locator('#view-map').click();await page.locator('#view-columns').click()
    assert.equal(await page.locator('#queue select').inputValue(),id)
    assert.equal(await page.evaluate(()=>demo.calls.filter(c=>c.cmd==='move_file').length),0)
  }finally{await page.close()}
})
