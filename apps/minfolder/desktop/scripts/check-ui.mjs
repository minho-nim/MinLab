import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {fileURLToPath} from 'node:url'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import {installDemo} from '../tests/fixtures/demo.mjs'
const output=process.env.MINFOLDER_CAPTURE_DIR||join(tmpdir(),'minfolder-ui')
await mkdir(output,{recursive:true})
const server=await createServer({configFile:false,root:fileURLToPath(new URL('../..',import.meta.url)),server:{host:'127.0.0.1',port:0}})
await server.listen()
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']})
const reports=[]
async function make(width,options={}){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await page.addInitScript(installDemo,{mode:'native',...options})
  await page.goto(server.resolvedUrls.local[0]+'desktop/index.html')
  return {page,errors}
}
async function report(page,errors,label){
  const sizes=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth}))
  assert.ok(sizes.page<=sizes.viewport,`${label}: page overflow ${JSON.stringify(sizes)}`)
  assert.deepEqual(errors,[],label+' console errors')
  reports.push({label,...sizes,errors})
}
try{
  for(const width of [320,400,768,1024,1400]){
    const {page,errors}=await make(width,{longName:true})
    assert.equal(await page.locator('#approve').isDisabled(),true)
    await report(page,errors,`${width}-empty`)
    if(width===400)await page.screenshot({path:`${output}/04-mobile-empty.png`,fullPage:true})
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'connect')
    await page.keyboard.press('Enter')
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('폴더 연결 완료'))
    const first=page.locator('#files .file-label').first();await first.focus();await page.keyboard.press('Enter')
    assert.equal(await page.evaluate(()=>demo.calls.filter(c=>c.cmd==='open_entry').length),1)
    await page.locator('#files .file-row').last().getByRole('button',{name:'분류',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('#queue select')?.value)
    await report(page,errors,`${width}-long-filename`)
    const before=await page.evaluate(()=>demo.calls.filter(c=>c.cmd==='list_directory').length)
    await page.locator('#zoom-in').click();assert.equal(await page.locator('#zoom-level').textContent(),'110%')
    const rect=await page.locator('#tree').boundingBox()
    await page.mouse.move(rect.x+rect.width/2,rect.y+80);await page.mouse.wheel(0,-120)
    await page.waitForFunction(()=>document.querySelector('#zoom-level').textContent==='120%')
    assert.equal(await page.evaluate(()=>demo.calls.filter(c=>c.cmd==='list_directory').length),before)
    if(width===400){
      await page.locator('#tree').scrollIntoViewIfNeeded();const r=await page.locator('#tree').boundingBox()
      await page.mouse.move(r.x+180,r.y+80);await page.mouse.down({button:'middle'});await page.mouse.move(r.x+100,r.y+80,{steps:6});await page.mouse.up({button:'middle'})
      assert.ok(await page.locator('#tree').evaluate(n=>n.scrollLeft)>0)
      await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${output}/04-mobile-long-name.png`,fullPage:true})
    }
    await page.close()
  }
  {
    const {page,errors}=await make(1400,{error:true})
    await page.locator('#connect').click();await page.getByText('읽기 실패 · 공유폴더 접근 권한을 확인해 주세요.').waitFor()
    await report(page,errors,'1400-permission-error')
    await page.screenshot({path:`${output}/05-permission-error.png`,fullPage:true});await page.close()
  }
  {
    const {page,errors}=await make(1400,{delay:5000})
    await page.locator('#connect').click();await page.locator('#files p.empty').getByText('읽는 중…',{exact:true}).waitFor()
    await report(page,errors,'1400-loading')
    await page.screenshot({path:`${output}/06-loading.png`,fullPage:true});await page.close()
  }
}finally{await browser.close();await server.close()}
await writeFile(`${output}/responsive-checks.json`,JSON.stringify(reports,null,2))
console.log(JSON.stringify(reports))
