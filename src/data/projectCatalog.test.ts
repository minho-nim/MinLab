import assert from 'node:assert/strict';
import test from 'node:test';
import {catalogProjects,connectCatalogOnce} from './projectCatalog';
import {connectPublishedRecords} from '../utils/publishedRecords';
import published from '../../public/data/github-drafts.json';

const catalog=catalogProjects();
const crossroads=catalog.find(p=>p.id==='proj-crossroads-ai-verdict')!;
function memoryStorage(entries:[string,string][]=[]){
  const values=new Map(entries);
  return {values,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
}
test('v6 returning visitors receive Crossroads without restoring removed older projects',()=>{
  const storage=memoryStorage([['minlab_public_catalog_v6','true']]);
  const original={...catalog[0],name:'직접 바꾼 이름',description:'보존할 설명',workLogs:[{id:'manual',title:'수동 일지',date:'2026-10-29',content:'유지'}]};
  const result=connectCatalogOnce([original],storage,'projects');
  assert.deepEqual(result.map(p=>p.id),[original.id,crossroads.id]);
  assert.deepEqual(result[0],original);
  assert.equal(result.filter(p=>p.id==='proj-1792563333333').length,0);
});
test('the new project receives all currently published logs and prompts without duplicates',()=>{
  const storage=memoryStorage([['minlab_public_catalog_v6','true']]);
  const result=connectPublishedRecords(connectCatalogOnce([],storage,'projects'),storage,'projects');
  const project=result.find(p=>p.id===crossroads.id)!;
  const expectedIds=(kind:string)=>published.drafts.filter(entry=>entry.projectId===crossroads.id&&entry.kind===kind).map(entry=>entry.record.id).sort();
  const logIds=expectedIds('log');
  const promptIds=expectedIds('prompt');
  assert.ok(logIds.length>0);
  assert.ok(promptIds.length>0);
  assert.deepEqual(project.workLogs.map(record=>record.id).sort(),logIds);
  assert.deepEqual((project.promptHistory||[]).map(record=>record.id).sort(),promptIds);
  const reloaded=connectPublishedRecords(connectCatalogOnce(result,storage,'projects'),storage,'projects');
  const reopened=reloaded.find(p=>p.id===crossroads.id)!;
  assert.deepEqual(reopened.workLogs.map(record=>record.id).sort(),logIds);
  assert.deepEqual((reopened.promptHistory||[]).map(record=>record.id).sort(),promptIds);
});
test('deleting Crossroads after its first connection does not recreate it on reload',()=>{
  const storage=memoryStorage([['minlab_public_catalog_v6','true']]);
  connectCatalogOnce([],storage,'projects');
  assert.deepEqual(connectCatalogOnce([],storage,'projects'),[]);
});
test('legacy Crossroads deletion is respected when its published-record ledger proves prior connection',()=>{
  const storage=memoryStorage([['minlab_public_catalog_v6','true'],['minlab_published_records_v1',JSON.stringify({drafts:[{projectId:crossroads.id}]})]]);
  assert.deepEqual(connectCatalogOnce([],storage,'projects'),[]);
});
test('an existing Crossroads entry receives its published URL only where local values are empty',()=>{
  const storage=memoryStorage([['minlab_public_catalog_v6','true']]);
  const original={...crossroads,description:'유지할 설명',liveUrl:'',previewUrl:''};
  const result=connectCatalogOnce([original],storage,'projects');
  assert.equal(result.length,1);
  assert.equal(result[0].description,original.description);
  assert.equal(result[0].liveUrl,'https://minho-nim.github.io/MinLab/apps/crossroads/');
});
test('custom IDs, metadata and records are retained when an existing repository matches',()=>{
  const storage=memoryStorage([['minlab_public_catalog_v6','true']]);
  const original={...crossroads,id:'my-project',name:'나의 게임',description:'사용자 설명',liveUrl:'https://example.com/custom',previewUrl:'https://example.com/preview'};
  const result=connectCatalogOnce([original],storage,'projects');
  assert.deepEqual(result,[original]);
});
test('malformed ledger falls back to v6 history and does not reset existing projects',()=>{
  const storage=memoryStorage([['minlab_public_catalog_v6','true'],['minlab_catalog_seen_project_ids_v1','{broken']]);
  const result=connectCatalogOnce([],storage,'projects');
  assert.deepEqual(result.map(p=>p.id),[crossroads.id]);
});
test('storage write failures still display the new project in memory',()=>{
  const result=connectCatalogOnce([],{getItem:key=>key==='minlab_public_catalog_v6'?'true':null,setItem(){throw new Error('quota');}},'projects');
  assert.equal(result.length,1);
  assert.equal(result[0].id,crossroads.id);
});
