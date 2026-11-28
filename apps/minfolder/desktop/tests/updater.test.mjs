import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createUpdateController} from '../updater.js'
function fixture(options={}) {
  const calls=[],states=[]
  const update={version:'0.2.0',download:async notify=>{calls.push('download');notify({event:'Started',data:{contentLength:100}});notify({event:'Progress',data:{chunkLength:100}});if(options.signatureFailure)throw Error('signature mismatch')},install:async()=>{calls.push('install');if(options.installFailure)throw Error('installer refused')},close:async()=>{}}
  const controller=createUpdateController({checkForUpdate:async()=>{calls.push('check');if(options.checkFailure)throw Error('offline');return options.noUpdate?null:update},freezeWrites:async()=>{calls.push('freeze');await options.waitForFreeze},thawWrites:async()=>{calls.push('thaw')},restart:async()=>{calls.push('restart')},isBusy:()=>!!options.busy,autoDownload:()=>options.auto!==false,onState:s=>states.push(s)})
  return {controller,calls,states,options}
}
test('자동 확인·다운로드만으로 설치하거나 재시작하지 않음',async()=>{
  const f=fixture();await f.controller.check();assert.equal(f.controller.getState().kind,'ready');assert.deepEqual(f.calls,['check','download'])
  await f.controller.install();assert.deepEqual(f.calls,['check','download','freeze','install','restart'])
})
test('자동 다운로드를 끄면 사용자가 다운로드를 시작',async()=>{
  const f=fixture({auto:false});await f.controller.check();assert.equal(f.controller.getState().kind,'available');assert.deepEqual(f.calls,['check'])
  assert.equal(await f.controller.install(),false);await f.controller.download();assert.equal(f.controller.getState().percent,100)
})
test('서명 검증 실패는 설치 준비 상태가 되지 않음',async()=>{
  const f=fixture({signatureFailure:true});await f.controller.check();assert.equal(f.controller.getState().kind,'available');assert.match(f.controller.getState().error,/서명 검증 실패/)
  assert.equal(await f.controller.install(),false);assert.equal(f.calls.includes('install'),false)
})
test('파일 이동 중에는 준비된 업데이트도 설치하지 않음',async()=>{
  const f=fixture({busy:true});await f.controller.check();assert.equal(await f.controller.install(),false);assert.equal(f.calls.includes('freeze'),false);assert.equal(f.controller.getState().kind,'ready')
})
test('기존 파일 작업 잠금이 해제된 뒤에만 설치',async()=>{
  let release;const waitForFreeze=new Promise(resolve=>{release=resolve});const f=fixture({waitForFreeze});await f.controller.check()
  const pending=f.controller.install();await Promise.resolve();assert.equal(f.calls.includes('install'),false);release();await pending
  assert.deepEqual(f.calls.slice(-3),['freeze','install','restart'])
})
test('설치 실패 시 파일 작업 잠금을 풀고 다시 시도할 수 있음',async()=>{
  const f=fixture({installFailure:true});await f.controller.check();assert.equal(await f.controller.install(),false);assert.equal(f.calls.at(-1),'thaw');assert.equal(f.controller.getState().kind,'ready');assert.match(f.controller.getState().error,/설치 실패/)
})
test('네트워크 오류를 최신 버전으로 표시하지 않음',async()=>{
  const f=fixture({checkFailure:true});await f.controller.check();assert.equal(f.controller.getState().kind,'error');assert.match(f.controller.getState().error,/offline/)
})
test('새 버전이 없으면 다운로드·설치를 수행하지 않음',async()=>{
  const f=fixture({noUpdate:true});await f.controller.check();assert.equal(f.controller.getState().kind,'current');assert.deepEqual(f.calls,['check'])
})
