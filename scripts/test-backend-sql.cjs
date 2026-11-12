/* In-memory PostgreSQL only. PGLITE_MODULE points to an external temporary install. */
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
(async () => {
 const db=new PGlite();
 try {
  await db.exec(`create role anon nologin; create role authenticated nologin;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema public,auth to anon,authenticated;`);
  await db.exec(await fs.readFile('supabase/migrations/202611120001_portfolio.sql','utf8'));
  const admin='00000000-0000-0000-0000-000000000001',member='00000000-0000-0000-0000-000000000002';
  await db.exec(`insert into auth.users values ('${admin}'),('${member}');insert into public.portfolio_admins values ('${admin}');`);
  const identity=async(role,id='')=>db.exec(`reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false);`);
  const rejected=async(sql,params,pattern)=>{let error;try{await db.query(sql,params);}catch(e){error=e;}assert.ok(error,sql+' must be rejected');assert.match(error.message,pattern);};
  await identity('anon');
  assert.deepEqual((await db.query('select * from portfolio_public')).rows,[]);
  await rejected('select * from portfolio_drafts',[],/permission denied/);
  await rejected("select save_portfolio_draft('[]',0)",[],/permission denied/);
  await identity('authenticated',member);
  assert.deepEqual((await db.query('select * from portfolio_drafts')).rows,[]);
  await rejected("select save_portfolio_draft('[]',0)",[],/admin_required/);
  await rejected(`insert into portfolio_admins values ('${member}')`,[],/permission denied/);
  await identity('authenticated',admin);
  const make=(id,extra={})=>({id,name:id,category:'기획',description:'실제 기록',status:'개발 중',techStack:[],keyFeatures:[],workLogs:[],changelog:[],...extra});
  const payload=[make('visible'),make('hidden',{visible:false}),make('archived',{archived:true})];
  const save='select save_portfolio_draft($1::jsonb,$2,$3) as revision';
  assert.equal((await db.query(save,[JSON.stringify(payload),0,'소개'])).rows[0].revision,1);
  assert.deepEqual((await db.query('select * from portfolio_public')).rows,[],'draft does not publish');
  await rejected(save,[JSON.stringify(payload),0,'stale'],/revision_conflict/);
  await rejected(save,[JSON.stringify([payload[0],payload[0]]),1,'duplicate'],/duplicate_project_id/);
  await rejected(save,[JSON.stringify([{id:'invalid'}]),1,'invalid'],/invalid_project/);
  await rejected('update portfolio_public set content=\'[]\'',[],/permission denied/);
  assert.equal((await db.query('select publish_portfolio_draft(1) as revision')).rows[0].revision,2);
  await rejected('select publish_portfolio_draft(1)',[],/revision_conflict/);
  await db.query(save,[JSON.stringify([make('new')]),2,'새 소개']);
  await db.query('select publish_portfolio_draft(3)');
  const backup=(await db.query("select content from portfolio_backups where source='public'")).rows[0].content;
  assert.deepEqual(backup,[payload[0]],'previous public snapshot retained');
  await identity('anon');
  const published=(await db.query('select content,about from portfolio_public')).rows[0];
  assert.deepEqual(published.content,[make('new')]);assert.equal(published.about,'새 소개');
  await rejected('select * from portfolio_backups',[],/permission denied/);
  console.log('PASS (local PostgreSQL/PGlite + simulated auth.uid): migration, anonymous/member/admin isolation, protected writes, draft/public separation, revision conflicts, validation, hidden filtering, ordered publication, About and previous-public backup. Live Supabase Auth remains untested.');
 } finally {await db.close();}
})().catch(e=>{console.error(e);process.exit(1);});
