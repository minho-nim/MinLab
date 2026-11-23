import {chromium} from 'playwright'
import {createServer} from 'vite'
import {fileURLToPath} from 'node:url'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import {installDemo} from '../tests/fixtures/demo.mjs'
const name=process.argv[2]||'after',folder=process.env.MINFOLDER_CAPTURE_DIR||join(tmpdir(),'minfolder-ui')
await mkdir(folder,{recursive:true})
const server=await createServer({configFile:false,root:fileURLToPath(new URL('../..',import.meta.url)),server:{host:'127.0.0.1',port:0}})
await server.listen()
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']})
const findings=[]
try{
  for(const mode of name==='before'?['web','native']:['native']){
    const page=await browser.newPage({viewport:{width:1400,height:1000}})
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.addInitScript(installDemo,{mode})
    await page.goto(server.resolvedUrls.local[0]+(mode==='web'?'index.html':'desktop/index.html'))
    await page.locator(mode==='web'?'#workspace':'#connect').click()
    await page.waitForFunction(mode=>document.querySelector(mode==='web'?'#inbox':'#files')?.textContent.includes('강남케이블공사_작업절차서'),mode)
    await page.locator(mode==='web'?'#inbox .entry':'#files .file-row').filter({hasText:'강남케이블공사_작업절차서'}).getByRole('button',{name:'분류',exact:true}).click()
    await page.waitForFunction(()=>document.querySelector('#queue select')?.value)
    if(mode==='web'){
      for(const label of ['강남케이블공사','작업자료']){
        const row=page.locator('.map-folder').filter({has:page.getByRole('button',{name:label,exact:true})}).first()
        if(await row.locator('.map-toggle').textContent()==='+')await row.locator('.map-toggle').click()
      }
    }else{
      for(const label of ['계약별공사자료','강남케이블공사','작업자료']){
        const toggle=page.getByRole('button',{name:label+' 펼치기',exact:true})
        if(await toggle.count())await toggle.click()
      }
    }
    await page.evaluate(()=>document.activeElement?.blur());await page.evaluate(()=>window.scrollTo(0,0))
    const label=mode==='web'?'01-original':name==='before'?'02-desktop-before':'03-desktop-after'
    await page.screenshot({path:`${folder}/${label}.png`,fullPage:true})
    await page.screenshot({path:`${folder}/${label}-viewport.png`})
    findings.push({label,errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)})
    await page.close()
  }
}finally{await browser.close();await server.close()}
await writeFile(`${folder}/${name}-checks.json`,JSON.stringify(findings,null,2))
console.log(JSON.stringify(findings))
