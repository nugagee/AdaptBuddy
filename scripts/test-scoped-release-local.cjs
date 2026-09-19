// Disposable local-only integration rehearsal. No hosted connections or external mail.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {randomUUID} = require('node:crypto');
const path = require('node:path');
const localDir = process.env.ADAPT_BUDDY_LOCAL_REHEARSAL;
assert.ok(localDir, 'Set ADAPT_BUDDY_LOCAL_REHEARSAL to the disposable local project directory');
assert.match(fs.readFileSync(path.join(localDir,'supabase/config.toml'),'utf8'), /^project_id = "adaptbuddy-local-rehearsal"$/m);
const status = JSON.parse(fs.readFileSync(path.join(localDir,'status.json'),'utf8'));
assert.equal(status.API_URL, 'http://127.0.0.1:54321');
assert.equal(status.MAILPIT_URL, 'http://127.0.0.1:54324');
const repo=path.resolve(__dirname,'..');
const dbName='supabase_db_adaptbuddy-local-rehearsal';
assert.match(process.env.DOCKER_HOST || '', /^unix:\/\/.*\/adaptbuddy-rehearsal\/docker\.sock$/);
const env=process.env;
const sql=(q)=>execFileSync('docker',['exec','-i',dbName,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:q,env,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const results=[];
const test=async(name,fn)=>{try{await fn(); results.push({name,status:'passed'});console.log('PASS '+name)}catch(e){results.push({name,status:'failed',reason:e.message});console.log('FAIL '+name+': '+e.message)}};
async function api(route,{token= status.ANON_KEY,method='GET',body}={}){
 const r=await fetch(status.API_URL+route,{method,headers:{apikey:status.ANON_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}
 return {ok:r.ok,status:r.status,data};
}
function okay(r){assert.equal(r.ok,true,JSON.stringify(r.data));return r.data}
function denied(r){assert.equal(r.ok,false,'Request unexpectedly succeeded');assert.ok(r.status>=400&&r.status<500,'Unexpected server failure '+JSON.stringify(r.data));}
const rest=(actor,resource,method='GET',body)=>api('/rest/v1/'+resource,{token:actor?.token,method,body});
const rpc=(actor,name,body)=>rest(actor,'rpc/'+name,'POST',body);
const profile=async(actor)=>okay(await rest(actor,'profiles?id=eq.'+actor.id))[0];
async function signup(label,role){
 const email=`rehearsal-${label}-${randomUUID()}@example.invalid`,password=randomUUID()+'-aA9!';
 const user=okay(await api('/auth/v1/signup',{method:'POST',body:{email,password,data:{role,first_name:'Synthetic',last_name:label}}}));
 assert.ok(user.id);assert.ok(!user.access_token,'Confirmation must be required');
 const before=sql(`select email_verified_at is null from profiles where id='${user.id}';`);assert.equal(before,'t');
 let message;
 for(let i=0;i<30;i++){
  const messages=await (await fetch(status.MAILPIT_URL+'/api/v1/messages')).json();
  const m=messages.messages?.find(m=>m.To?.some(t=>t.Address===email));
  if(m){message=await (await fetch(status.MAILPIT_URL+'/api/v1/message/'+m.ID)).json();break}
  await new Promise(r=>setTimeout(r,100));
 }
 assert.ok(message,'Local confirmation mail was not captured');
 const link=(message.HTML||message.Text).match(/https?:[^\s"<>]+\/auth\/v1\/verify[^\s"<>]*/)?.[0];
 assert.ok(link,'Confirmation link missing');
 const url=new URL(link.replaceAll('&amp;','&'));assert.equal(url.origin,status.API_URL);
 const session=okay(await api('/auth/v1/verify',{method:'POST',body:{token_hash:url.searchParams.get('token'),type:'signup'}}));
 assert.ok(session.access_token);
 const actor={id:user.id,email,password,token:session.access_token,refresh:session.refresh_token};
 assert.equal(session.user.id,user.id,'Confirmation session must belong to the new account');
 return actor;
}
(async()=>{
 const readyUntil=Date.now()+10000;
 while(true){
  const ready=await rest(null,'profiles?select=id&limit=0');
  if(ready.ok)break;
  if(Date.now()>=readyUntil || !['PGRST002','PGRST205'].includes(ready.data?.code))okay(ready);
  await new Promise(r=>setTimeout(r,100));
 }
 let child,adult,stranger;
 await test('Local child signup and real email confirmation',async()=>{child=await signup('scoped-child','child');assert.equal((await profile(child)).role,'child')});
 if(!child)throw new Error('Local child signup failed');
 adult=await signup('scoped-adult','parent');stranger=await signup('scoped-stranger','parent');
 // Synthetic example of the pre-existing live relationship structure.
 sql(`insert into public.trusted_adults (child_id,adult_id,name,role,email,phone,status) values ('${child.id}','${adult.id}','Synthetic Adult','parent','${adult.email}','','connected'); update profiles set gender='male' where id='${child.id}';`);
 const legacyMood=okay(await rest(child,'mood_check_ins','POST',{child_id:child.id,mood:'sad',note:'Synthetic legacy private mood'}))[0];
 await test('Only the scoped transaction applies and preserves existing values',async()=>{
  sql(fs.readFileSync(path.join(repo,'supabase/release-scripts/20260908_scoped_live_release.sql'),'utf8'));
  assert.equal(sql(`select gender, sex is null from profiles where id='${child.id}';`),'male|t');
  assert.equal(sql(`select note, is_shared from mood_check_ins where id='${legacyMood.id}';`),'Synthetic legacy private mood|f');
  assert.equal(sql("select to_regprocedure('public.record_child_support_request_v1(uuid,uuid,text,boolean)') is null, to_regprocedure('public.record_trusted_adult_request_v1(text,text,text,text,uuid)') is null;"),'t|t');
 });
 await new Promise(r=>setTimeout(r,1200));
 await test('All current profile options save and invalid values are rejected',async()=>{
  for(const gender of ['woman','man','non_binary','other','prefer_not_to_say'])
   assert.equal(okay(await rest(child,'profiles?id=eq.'+child.id,'PATCH',{gender,sex:'prefer_not_to_say'}))[0].gender,gender);
  denied(await rest(child,'profiles?id=eq.'+child.id,'PATCH',{gender:'invalid'}));
  denied(await rest(child,'profiles?id=eq.'+child.id,'PATCH',{sex:'invalid'}));
 });
 await test('Complete signup profile and settings payloads remain editable',async()=>{
  okay(await rest(child,'profiles?id=eq.'+child.id,'PATCH',{first_name:'Synthetic',last_name:'Child',full_name:'Synthetic Child',child_name:'Synthetic Child',sex:'intersex',gender:'non_binary',age:10}));
  okay(await rest(child,'profiles?id=eq.'+child.id,'PATCH',{bio:'Synthetic settings',neuro_types:['adhd'],onboarding_completed:true}));
 });
 await test('New confirmed signups work after the scoped migration',async()=>{
  const actor=await signup('scoped-after','child');
  okay(await rest(actor,'profiles?id=eq.'+actor.id,'PATCH',{sex:'prefer_not_to_say',gender:'other',age:10}));
 });
 await test('Password sign-in returns the correct account',async()=>{
  const s=okay(await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email:child.email,password:child.password}}));assert.equal(s.user.id,child.id);
 });
 await test('Refresh session remains attached to the same child',async()=>{
  const s=okay(await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:child.refresh}}));assert.equal(s.user.id,child.id);child.token=s.access_token;
 });
 await test('Private diary and derived analysis remain invisible to linked and unrelated adults',async()=>{
  const entry=okay(await rest(child,'journal_entries','POST',{child_id:child.id,text:'Synthetic private diary',ai_analysis:{parentInsight:'Synthetic private derived words'},risk_level:'high',is_shared:false}))[0];
  assert.equal(okay(await rest(child,'journal_entries?id=eq.'+entry.id)).length,1);
  for(const actor of [adult,stranger])assert.equal(okay(await rest(actor,'journal_entries?id=eq.'+entry.id)).length,0);
 });
 await test('Existing and new mood notes are private, including AI responses',async()=>{
  const mood=okay(await rest(child,'mood_check_ins','POST',{child_id:child.id,mood:'sad',note:'Synthetic private mood',ai_response:'Synthetic private response'}))[0];assert.equal(mood.is_shared,false);
  for(const actor of [adult,stranger]) for(const id of [legacyMood.id,mood.id])
   assert.equal(okay(await rest(actor,'mood_check_ins?id=eq.'+id)).length,0);
  assert.equal(okay(await rest(child,'mood_check_ins?id=eq.'+mood.id))[0].note,'Synthetic private mood');
 });
 await test('Private saves do not produce shared alerts or adult signals',async()=>{
  assert.equal(sql(`select (select count(*) from alerts where child_id='${child.id}'),(select count(*) from parent_child_signals where child_id='${child.id}');`),'0|0');
 });
 await test('Anonymous callers cannot read private entries',async()=>{
  for(const resource of ['journal_entries','mood_check_ins']){const response=await rest(null,resource+'?child_id=eq.'+child.id);assert.ok(!response.ok || response.data.length===0)}
 });
 await test('Repeating the transaction preserves all rows and privacy',async()=>{
  const snapshot=()=>sql("select (select md5(string_agg(to_jsonb(p)::text,',' order by id)) from profiles p),(select md5(string_agg(to_jsonb(m)::text,',' order by id)) from mood_check_ins m);");
  const before=snapshot();sql(fs.readFileSync(path.join(repo,'supabase/release-scripts/20260908_scoped_live_release.sql'),'utf8'));assert.equal(snapshot(),before);
 });
})().catch(e=>{results.push({name:'Prerequisite',status:'failed',reason:e.message});console.error(e.message)}).finally(()=>{
 fs.writeFileSync(path.join(localDir,'scoped-release-results.json'),JSON.stringify({checkedAt:new Date().toISOString(),schemaSource:'Live public schema with only 040/043; synthetic local Auth users',results},null,2),{mode:0o600});
 console.log(`${results.filter(r=>r.status==='passed').length} passed; ${results.filter(r=>r.status==='failed').length} failed.`);if(results.some(r=>r.status==='failed'))process.exitCode=1;
});
