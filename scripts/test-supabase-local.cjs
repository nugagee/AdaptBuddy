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
 assert.ok((await profile(actor)).email_verified_at,'Auth confirmation failed to synchronize');
 return actor;
}
(async()=>{
 // Restoring a schema invalidates PostgREST's cache briefly. Wait for a real
 // empty-result query to succeed before creating test accounts.
 const readyUntil=Date.now()+10000;
 while(true){
  const ready=await rest(null,'profiles?select=id&limit=0');
  if(ready.ok)break;
  if(Date.now()>=readyUntil || !['PGRST002','PGRST205'].includes(ready.data?.code))okay(ready);
  await new Promise(r=>setTimeout(r,100));
 }
 let child,adult,stranger,teacher,malicious;
 await test('Real signup, local email confirmation and profile synchronization',async()=>{child=await signup('child','child');assert.equal((await profile(child)).role,'child')});
 if(!child)throw new Error('Cannot continue without local Auth signup');
 await test('Signup metadata cannot create an administrator',async()=>{malicious=await signup('admin-request','admin');assert.equal((await profile(malicious)).role,'parent');assert.equal(okay(await rpc(malicious,'is_admin',{})),false)});
 await test('Teacher signup remains pending and unauthorised',async()=>{teacher=await signup('teacher','teacher');const p=await profile(teacher);assert.equal(p.status,'pending');assert.equal(p.is_authorized,false)});
 adult=await signup('adult','parent');stranger=await signup('stranger','parent');
 await test('Authenticated profile updates cannot change role or verified email',async()=>{
  for(const body of [{role:'admin'},{email:'forged@example.invalid'},{email_verified_at:new Date().toISOString()},{status:'suspended'},{admin_verified_at:new Date().toISOString()}])denied(await rest(child,'profiles?id=eq.'+child.id,'PATCH',body));
 });
 await test('Ordinary profile details remain editable',async()=>assert.equal(okay(await rest(child,'profiles?id=eq.'+child.id,'PATCH',{first_name:'Updated'}))[0].first_name,'Updated'));
 await test('Profile compatibility preserves legacy values without inferring sex',async()=>{
  sql(`update public.profiles set gender='male' where id='${child.id}';`);
  sql(fs.readFileSync(path.join(repo,'supabase/migration-drafts/043_profile_details_compatibility.sql'),'utf8'));
  assert.equal(sql(`select gender, sex is null from public.profiles where id='${child.id}';`),'male|t');
  await new Promise(r=>setTimeout(r,1200));
 });
 await test('Current profile options save and invalid values are rejected',async()=>{
  for(const gender of ['woman','man','non_binary','other','prefer_not_to_say'])
   assert.equal(okay(await rest(child,'profiles?id=eq.'+child.id,'PATCH',{gender,sex:'prefer_not_to_say'}))[0].gender,gender);
  denied(await rest(child,'profiles?id=eq.'+child.id,'PATCH',{gender:'invalid'}));
  denied(await rest(child,'profiles?id=eq.'+child.id,'PATCH',{sex:'invalid'}));
 });
 await test('Full application signup profile payload is accepted',async()=>okay(await rest(child,'profiles?id=eq.'+child.id,'PATCH',{first_name:'Synthetic',last_name:'Child',full_name:'Synthetic Child',child_name:'Synthetic Child',sex:null,gender:null,age:10})));
 await test('Cross-account profile read is isolated',async()=>assert.equal(okay(await rest(stranger,'profiles?id=eq.'+child.id)).length,0));
 await test('Signed-out API cannot read child profile',async()=>{const r=await rest(null,'profiles?id=eq.'+child.id);assert.ok(!r.ok || r.data.length===0)});
 await test('Refresh session remains attached to the same child',async()=>{const s=okay(await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:child.refresh}}));assert.equal(s.user.id,child.id);child.token=s.access_token;child.refresh=s.refresh_token});
 await test('Full access, mood privacy and support drafts apply to live schema structure',async()=>{
  for(const file of ['supabase/migration-drafts/041_safeguarding_access_guardrails.draft.sql','supabase/migrations/040_child_privacy_boundaries.sql','supabase/migration-drafts/042_atomic_support_record.sql'])sql(fs.readFileSync(path.join(repo,file),'utf8'));
  sql("NOTIFY pgrst, 'reload schema';");await new Promise(r=>setTimeout(r,1200));
 });
 let invitation;
 await test('Child request remains pending with no adult access',async()=>{
  invitation=okay(await rpc(child,'record_trusted_adult_request_v1',{p_name:'Synthetic Adult',p_role:'parent',p_email:adult.email,p_phone:'test-only',p_child_id:child.id}));
  if(Array.isArray(invitation))invitation=invitation[0];assert.equal(invitation.status,'pending');assert.equal(invitation.adult_id,null);
  assert.equal(okay(await rest(adult,'child_relationships?child_id=eq.'+child.id)).length,0);
 });
 if(!invitation)throw new Error('Cannot continue without local invitation');
 await test('Unrelated adult cannot accept the invitation',async()=>denied(await rpc(stranger,'accept_trusted_adult_invitation',{p_invitation_id:invitation.id})));
 await test('Matching confirmed adult can accept once',async()=>{okay(await rpc(adult,'accept_trusted_adult_invitation',{p_invitation_id:invitation.id}));denied(await rpc(adult,'accept_trusted_adult_invitation',{p_invitation_id:invitation.id}));assert.equal(okay(await rest(adult,'child_relationships?child_id=eq.'+child.id)).length,1)});
 let journal,mood;
 await test('Private journal remains invisible to accepted and unrelated adults',async()=>{
  journal=okay(await rest(child,'journal_entries','POST',{child_id:child.id,text:'Synthetic private diary',is_shared:false}))[0];
  for(const a of [adult,stranger])assert.equal(okay(await rest(a,'journal_entries?id=eq.'+journal.id)).length,0);
 });
 await test('Mood note is private by default and shared only after child action',async()=>{
  mood=okay(await rest(child,'mood_check_ins','POST',{child_id:child.id,mood:'sad',note:'Synthetic private mood'}))[0];assert.equal(mood.is_shared,false);
  assert.equal(okay(await rest(adult,'mood_check_ins?id=eq.'+mood.id)).length,0);
  okay(await rest(child,'mood_check_ins?id=eq.'+mood.id,'PATCH',{is_shared:true}));
  assert.equal(okay(await rest(adult,'mood_check_ins?id=eq.'+mood.id)).length,1);
  assert.equal(okay(await rest(stranger,'mood_check_ins?id=eq.'+mood.id)).length,0);
 });
 await test('Concurrent support retries produce one complete record set',async()=>{
  const id=randomUUID();const body={p_child_id:child.id,p_request_id:id,p_source:'mood-check-in',p_urgent:true};
  const responses=await Promise.all(Array.from({length:8},()=>rpc(child,'record_child_support_request_v1',body)));const ids=responses.map(okay);assert.equal(new Set(ids).size,1);
  const counts=sql(`select (select count(*) from journal_entries where id='${ids[0]}'),(select count(*) from alerts where journal_entry_id='${ids[0]}'),(select count(*) from child_support_request_receipts where request_id='${id}'),(select count(*) from parent_child_signals where child_id='${child.id}');`);assert.equal(counts,'1|1|1|1');
  denied(await rpc(child,'record_child_support_request_v1',{...body,p_urgent:false}));denied(await rpc(adult,'record_child_support_request_v1',body));denied(await rpc(child,'record_child_support_request_v1',{...body,p_child_id:stranger.id}));
 });
 await test('Insert failure rolls the whole support transaction back',async()=>{
  const count=()=>sql(`select (select count(*) from journal_entries),(select count(*) from alerts),(select count(*) from parent_child_signals),(select count(*) from child_support_request_receipts);`);
  const before=count();sql("create function public.synthetic_fail_alert() returns trigger language plpgsql as $$begin raise exception 'Synthetic rollback test'; end;$$; create trigger synthetic_fail before insert on public.alerts for each row execute function public.synthetic_fail_alert();");
  try{const r=await rpc(child,'record_child_support_request_v1',{p_child_id:child.id,p_request_id:randomUUID(),p_source:'child-dashboard',p_urgent:false});assert.equal(r.ok,false);assert.equal(count(),before)}finally{sql('drop trigger synthetic_fail on public.alerts; drop function public.synthetic_fail_alert();')}
 });
 await test('Revocation immediately removes linked access with existing JWT',async()=>{okay(await rpc(child,'revoke_trusted_adult_for_child',{p_invitation_id:invitation.id}));assert.equal(okay(await rest(adult,'child_relationships?child_id=eq.'+child.id)).length,0);assert.equal(okay(await rest(adult,'mood_check_ins?child_id=eq.'+child.id)).length,0);assert.equal(okay(await rest(adult,'parent_child_signals?child_id=eq.'+child.id)).length,0)});
 await test('Anonymous callers cannot invoke support recording',async()=>denied(await rpc(null,'record_child_support_request_v1',{p_child_id:child.id,p_request_id:randomUUID(),p_source:'child-dashboard',p_urgent:false})));
})().catch(e=>{results.push({name:'Prerequisite',status:'failed',reason:e.message});console.error(e.message)}).finally(()=>{
 fs.writeFileSync(path.join(localDir,'integration-results.json'),JSON.stringify({checkedAt:new Date().toISOString(),schemaSource:'Live public schema only; synthetic local Auth users',results},null,2),{mode:0o600});
 console.log(`${results.filter(r=>r.status==='passed').length} passed; ${results.filter(r=>r.status==='failed').length} failed.`);if(results.some(r=>r.status==='failed'))process.exitCode=1;
});
