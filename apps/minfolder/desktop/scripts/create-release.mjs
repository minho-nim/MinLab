import {readFile,mkdir,copyFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
const [installer,signature,output]=process.argv.slice(2)
if(!installer||!signature||!output)throw Error('설치 파일·서명·출력 폴더를 지정하세요.')
const config=JSON.parse(await readFile(new URL('../../src-tauri/tauri.conf.json',import.meta.url),'utf8'))
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'))
const cargo=await readFile(new URL('../../src-tauri/Cargo.toml',import.meta.url),'utf8')
const cargoVersion=cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
const version=config.version
if(!/^\d+\.\d+\.\d+$/.test(version)||(pkg.version!==version||cargoVersion!==version))throw Error('앱 버전이 일치하지 않아요.')
const bytes=await readFile(installer),sig=(await readFile(signature,'utf8')).trim()
if(bytes[0]!==0x4d||bytes[1]!==0x5a||bytes.length<500000)throw Error('Windows 설치 파일을 확인해 주세요.')
if(!/^[A-Za-z\d+/=\s]+$/.test(sig)||sig.length<100)throw Error('업데이트 서명을 확인해 주세요.')
const comment=Buffer.from(sig,'base64').toString('utf8').split('\n').find(line=>line.startsWith('trusted comment:'))||''
if(!comment.includes(`version:${version}`))throw Error('서명이 앱 버전에 연결되지 않았어요.')
await mkdir(output,{recursive:true})
await copyFile(installer,join(output,'MinFolder-Setup.exe'));await copyFile(signature,join(output,'MinFolder-Setup.exe.sig'))
const manifest={version,notes:'MinFolder Windows · 파일명 추천과 승인 이동',pub_date:new Date().toISOString(),platforms:{'windows-x86_64':{signature:sig,url:`https://github.com/minho-nim/MinLab/releases/download/minfolder-v${version}/MinFolder-Setup.exe`}}}
await writeFile(join(output,'latest.json'),JSON.stringify(manifest,null,2)+'\n')
const hash=createHash('sha256').update(bytes).digest('hex')
await writeFile(join(output,'SHA256SUMS'),hash+'  MinFolder-Setup.exe\n')
console.log(JSON.stringify({version,installerBytes:bytes.length,sha256:hash,output}))
