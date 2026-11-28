import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createLearning,filenameFamily} from '../learning.js'
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}}
test('승인한 파일명 유형만 추천하고 공사명·확장자·중요 숫자는 구분',()=>{
 const l=createLearning({storage:storage(),scope:'A'}),path=['계약','강남','안전']
 l.learn('강남공사_보고서_20261128_v1.pdf',path,'a')
 assert.deepEqual(l.predict('강남공사_보고서_20261129_v2.pdf',[path]).path,path)
 for(const name of ['송도공사_보고서_20261129.pdf','강남공사_보고서_20261129.xlsx','강남공사_보고서_1.pdf'])assert.equal(l.predict(name,[path]),null)
 assert.equal(l.predict('강남공사_보고서_20261129.pdf',[]),null)
 assert.notEqual(filenameFamily('공사1구역_보고서.pdf'),filenameFamily('공사2구역_보고서.pdf'))
})
test('동일 이름의 다른 기준 폴더·저장소로 승인 기록이 섞이지 않음',()=>{
 const s=storage(),a=createLearning({storage:s,scope:'A'}),b=createLearning({storage:s,scope:'B'});a.learn('강남_내역서.pdf',['공사'],'1');assert.equal(b.predict('강남_내역서.pdf',[['공사']]),null)
 assert.ok(createLearning({storage:s,scope:'A'}).predict('강남_내역서.pdf',[['공사']]))
})
test('상충하는 승인·되돌리기·학습 끄기·삭제',()=>{
 const l=createLearning({storage:storage(),scope:'A'}),paths=[['A'],['B']];l.learn('계약공사_보고서.pdf',paths[0],'1');l.learn('계약공사_보고서.pdf',paths[1],'2');assert.equal(l.predict('계약공사_보고서.pdf',paths),null)
 l.forget('2');assert.deepEqual(l.predict('계약공사_보고서.pdf',paths).path,paths[0]);l.setEnabled(false);assert.equal(l.predict('계약공사_보고서.pdf',paths),null);l.learn('다른공사_보고서.pdf',paths[1],'3');assert.equal(l.count,1)
 l.setEnabled(true);l.clear();assert.equal(l.count,0)
})
test('저장 실패·손상 데이터에도 분류 화면을 중단하지 않음',()=>{
 const errors=[],l=createLearning({storage:{getItem(){return '{'},setItem(){throw Error('quota')}},scope:'A',onError:e=>errors.push(e)})
 l.learn('공사보고서.pdf',[],'1');assert.equal(errors.length,1);assert.ok(l.predict('공사보고서.pdf',[[]]));assert.equal(filenameFamily('a.txt'),'')
})
