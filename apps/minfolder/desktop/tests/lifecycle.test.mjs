import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createCloseHandler} from '../lifecycle.js'
function fixture(){
  const state={busy:false,installing:false,pending:false,accepted:true,fail:false,destroyed:0,closing:false,prompts:0,errors:[]}
  const handler=createCloseHandler({isBusy:()=>state.busy,isInstalling:()=>state.installing,hasPendingWork:()=>state.pending,
    confirmClose:async()=>{state.prompts++;return state.accepted},destroy:async()=>{if(state.fail)throw Error('denied');state.destroyed++},setClosing:v=>state.closing=v,onError:e=>state.errors.push(e)})
  const event={prevented:0,preventDefault(){this.prevented++}}
  return {state,handler,event}
}
test('빈 앱은 닫기 요청 한 번으로 종료',async()=>{const f=fixture();await f.handler(f.event);assert.equal(f.event.prevented,1);assert.equal(f.state.destroyed,1);assert.equal(f.state.prompts,0)})
test('대기 분류 종료 취소·재시도와 승인',async()=>{const f=fixture();f.state.pending=true;f.state.accepted=false;await f.handler(f.event);assert.equal(f.state.destroyed,0);assert.equal(f.state.closing,false);f.state.accepted=true;await f.handler(f.event);assert.equal(f.state.destroyed,1)})
test('이동 중과 업데이트 설치 중에는 프로세스를 닫지 않음',async()=>{for(const key of ['busy','installing']){const f=fixture();f.state[key]=true;await f.handler(f.event);assert.equal(f.state.destroyed,0);assert.equal(f.state.errors.length,1)}})
test('종료 권한 오류를 표시하고 다시 닫을 수 있음',async()=>{const f=fixture();f.state.fail=true;await f.handler(f.event);assert.match(f.state.errors[0],/denied/);assert.equal(f.state.closing,false);f.state.fail=false;await f.handler(f.event);assert.equal(f.state.destroyed,1)})
test('닫기를 연속 눌러도 확인창은 하나만 표시',async()=>{
  let resolve,prompts=0,destroyed=0,closing=false
  const h=createCloseHandler({isBusy:()=>false,isInstalling:()=>false,hasPendingWork:()=>true,confirmClose:()=>{prompts++;return new Promise(r=>resolve=r)},destroy:async()=>destroyed++,setClosing:v=>closing=v,onError:()=>{}})
  const e={preventDefault(){}};const pending=h(e);assert.equal(closing,true);await h(e);assert.equal(prompts,1);resolve(true);await pending;assert.equal(destroyed,1)
})
test('실제 앱 권한이 Tauri close listener의 destroy 명령을 허용',async()=>{
  const config=JSON.parse(await readFile(new URL('../../src-tauri/capabilities/default.json',import.meta.url)))
  assert.ok(config.windows.includes('main'));assert.ok(config.permissions.includes('core:window:allow-destroy'))
})
