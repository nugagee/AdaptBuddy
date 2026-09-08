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
 // Schema reload after a synthetic reset is asynchronous; wait using read-only requests.
 for(let attempt=0;attempt<30;attempt++){ const ready=await api('/rest/v1/'); if(ready.ok)break; if(attempt===29)throw new Error('Local REST schema cache did not become ready'); await new Promise(r=>setTimeout(r,200)); }
 let child,a,b,stranger,teacher,unverified;
 await test('Real Auth signup confirms a child with canonical identity',async()=>{child=await signup('support-child','child');assert.equal((await profile(child)).role,'child')});
 if(!child)throw new Error('Child signup failed');
 a=await signup('support-a','parent');b=await signup('support-b','parent');stranger=await signup('support-stranger','parent');teacher=await signup('support-teacher','teacher');
 await test('Admin metadata and self-promotion cannot gain credential-reset authority',async()=>{
  unverified=await signup('support-fake-admin','admin');assert.equal((await profile(unverified)).role,'parent');
  denied(await rest(unverified,'profiles?id=eq.'+unverified.id,'PATCH',{role:'admin'}));
  denied(await rpc(unverified,'admin_reset_user_password',{p_user_id:child.id,p_new_password:'Local-test-only-Aa9!'}));
  assert.equal(okay(await rpc(unverified,'is_admin',{})),false);
 });
 await test('Unverified historical admin loses privilege; verified admin can create ordinary users',async()=>{
  sql(`update profiles set role='admin' where id='${unverified.id}';`);
  assert.equal(okay(await rpc(unverified,'is_admin',{})),false);
  denied(await rpc(unverified,'admin_reset_user_password',{p_user_id:child.id,p_new_password:'Local-test-only-Aa9!'}));
  sql(`update profiles set admin_verified_at=now(),admin_verified_by=id,admin_verification_method='service_role_bootstrap' where id='${unverified.id}';`);
  assert.equal(okay(await rpc(unverified,'is_admin',{})),true);
  const created=okay(await rpc(unverified,'admin_create_user',{p_email:'synthetic-created-'+randomUUID()+'@example.invalid',p_password:randomUUID()+'-Aa9!',p_role:'child',p_first_name:'Synthetic',p_last_name:'Created'}));
  assert.equal(sql(`select role::text from profiles where id='${created.id}';`),'child');
  const browserEmail='synthetic-browser-'+randomUUID()+'@example.invalid',browserPassword=randomUUID()+'-Aa9!';
  const browserCreated=okay(await rpc(unverified,'admin_create_user',{p_email:browserEmail,p_password:browserPassword,p_role:'parent',p_first_name:'Synthetic',p_last_name:'Browser',p_sex:'female',p_gender:'woman',p_age:35,p_child_name:null}));
  assert.equal(sql(`select role::text,sex,gender from profiles where id='${browserCreated.id}';`),'parent|female|woman');
  const createdSession=okay(await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email:browserEmail,password:browserPassword}}));
  assert.equal(createdSession.user.id,browserCreated.id);
  okay(await rest(unverified,'profiles?id=eq.'+browserCreated.id,'PATCH',{role:'teacher'}));
  assert.equal(sql(`select role::text from profiles where id='${browserCreated.id}';`),'teacher');
  denied(await rest(unverified,'profiles?id=eq.'+browserCreated.id,'PATCH',{admin_verified_at:new Date().toISOString(),admin_verified_by:unverified.id,admin_verification_method:'service_role_bootstrap'}));
 });
 await test('Revoking the verified administrator session removes its credential-reset authority immediately',async()=>{
  const claims=JSON.parse(Buffer.from(unverified.token.split('.')[1],'base64url').toString());
  assert.ok(claims.session_id);
  sql(`delete from auth.sessions where id='${claims.session_id}';`);
  assert.equal(okay(await rpc(unverified,'is_admin',{})),false);
  denied(await rpc(unverified,'admin_reset_user_password',{p_user_id:child.id,p_new_password:'Local-test-only-Aa9!'}));
 });
 const invite=async(actor,email)=>okay(await rpc(actor,'create_trusted_support_invitation_v1',{p_child_id:actor.id,p_name:'Synthetic Adult',p_role:'parent',p_email:email,p_phone:''}));
 const accept=(actor,id,yes=true,adult=true)=>rpc(actor,'respond_trusted_support_invitation_v1',{p_invitation_id:id,p_accept:yes,p_is_adult:adult});
 const contacts=async actor=>okay(await rpc(actor,'list_trusted_support_contacts_v1',{}));
 const requests=async actor=>okay(await rpc(actor,'list_trusted_support_requests_v1',{}));
 let ca,cb;
 await test('Invitation starts pending and appears only to the child and invited confirmed parent',async()=>{
  ca=await invite(child,a.email);assert.equal(ca.status,'pending');assert.equal(ca.adult_id,null);
  assert.equal((await contacts(a)).length,1);assert.equal((await contacts(b)).length,0);
  assert.equal((await contacts(child)).length,1);assert.equal((await invite(child,a.email)).id,ca.id);
  denied(await accept(b,ca.id));denied(await accept(a,ca.id,true,false));
 });
 if(!ca)throw new Error('Invitation prerequisite failed');
 await test('Chosen adult accepts once without gaining family/class or private-data access',async()=>{
  okay(await accept(a,ca.id));denied(await accept(a,ca.id));
  assert.equal((await contacts(a))[0].status,'connected');
  assert.equal(sql(`select (select count(*) from trusted_adults where child_id='${child.id}'),(select count(*) from child_relationships where child_id='${child.id}');`),'0|0');
  assert.equal(okay(await rest(a,'profiles?id=eq.'+child.id)).length,0);
  const entry=okay(await rest(child,'journal_entries','POST',{child_id:child.id,text:'Synthetic private journal',is_shared:false}))[0];
  assert.equal(okay(await rest(a,'journal_entries?id=eq.'+entry.id)).length,0);
 });
 cb=await invite(child,b.email);okay(await accept(b,cb.id));
 let record;
 const body={p_child_id:child.id,p_request_id:randomUUID(),p_source:'mood-check-in',p_urgent:true,p_contact_id:ca.id};
 await test('Addressed support record is visible only to its child and selected adult',async()=>{
  record=okay(await rpc(child,'record_trusted_support_request_v1',body));
  assert.equal((await requests(child)).length,1);assert.equal((await requests(a)).length,1);
  assert.equal((await requests(b)).length,0);assert.equal((await requests(stranger)).length,0);
  denied(await rpc(teacher,'list_trusted_support_requests_v1',{}));
  denied(await rpc(unverified,'list_trusted_support_requests_v1',{}));
  assert.equal(sql(`select (select count(*) from alerts where child_id='${child.id}'),(select count(*) from parent_child_signals where child_id='${child.id}');`),'0|0');
 });
 await test('Private support records stay invisible to every adult',async()=>{
  okay(await rpc(child,'record_trusted_support_request_v1',{...body,p_request_id:randomUUID(),p_contact_id:null}));
  assert.equal((await requests(child)).length,2);assert.equal((await requests(a)).length,1);assert.equal((await requests(b)).length,0);
 });
 await test('Concurrent exact retries create one record and changed recipient/source/urgency reject',async()=>{
  const ids=await Promise.all(Array.from({length:8},()=>rpc(child,'record_trusted_support_request_v1',body)));assert.ok(ids.every(r=>okay(r)===record));
  for(const changed of [{p_contact_id:cb.id},{p_contact_id:null},{p_urgent:false},{p_source:'buddy-conversation'}])denied(await rpc(child,'record_trusted_support_request_v1',{...body,...changed}));
  assert.equal(sql(`select count(*) from trusted_support_requests where child_id='${child.id}' and request_id='${body.p_request_id}';`),'1');
 });
 await test('Other accounts and direct table writes cannot change ownership, recipients or consent',async()=>{
  for(const actor of [a,b,stranger,unverified])denied(await rpc(actor,'record_trusted_support_request_v1',{...body,p_request_id:randomUUID()}));
  denied(await rpc(child,'record_trusted_support_request_v1',{...body,p_child_id:b.id,p_request_id:randomUUID()}));
  for(const actor of [child,a,unverified]) for(const table of ['trusted_support_contacts','trusted_support_requests']){
   denied(await rest(actor,table));denied(await rest(actor,table,'POST',{}));denied(await rest(actor,table+'?id=eq.'+ca.id,'PATCH',{status:'connected'}));
  }
 });
 await test('Only the selected adult can mark a record as seen; child receives that receipt',async()=>{
  denied(await rpc(b,'acknowledge_trusted_support_request_v1',{p_request_id:record}));
  denied(await rpc(child,'acknowledge_trusted_support_request_v1',{p_request_id:record}));
  okay(await rpc(a,'acknowledge_trusted_support_request_v1',{p_request_id:record}));
  assert.ok((await requests(child)).find(r=>r.id===record).seen_at);
 });
 await test('Child revocation immediately removes adult reads and future writes',async()=>{
  okay(await rpc(child,'revoke_trusted_support_contact_v1',{p_contact_id:ca.id}));
  assert.equal((await requests(a)).length,0);
  denied(await rpc(child,'record_trusted_support_request_v1',{...body,p_request_id:randomUUID()}));
  denied(await rpc(a,'acknowledge_trusted_support_request_v1',{p_request_id:record}));
  assert.equal((await requests(child)).length,2);
 });
 await test('Re-invitation creates a new consent lifecycle and never restores old records',async()=>{
  const next=await invite(child,a.email);assert.notEqual(next.id,ca.id);okay(await accept(a,next.id));
  assert.equal((await requests(a)).length,0);
 });
 await test('Recipient can decline and end their own support connection',async()=>{
  const next=await invite(child,stranger.email);okay(await accept(stranger,next.id,false));
  assert.equal((await contacts(stranger)).length,0);denied(await accept(stranger,next.id));
  okay(await rpc(b,'revoke_trusted_support_contact_v1',{p_contact_id:cb.id}));assert.equal((await contacts(b)).length,0);
 });
 await test('Expired invitations cannot be accepted',async()=>{
  const next=await invite(child,b.email);sql(`update trusted_support_contacts set expires_at=now()-interval '1 second' where id='${next.id}';`);
  denied(await accept(b,next.id));assert.equal((await contacts(b)).length,0);
 });
 await test('Suspension and canonical email changes permanently revoke acceptance',async()=>{
  const next=await invite(child,b.email);okay(await accept(b,next.id));
  sql(`update profiles set status='suspended' where id='${b.id}';`);
  denied(await rpc(b,'list_trusted_support_contacts_v1',{}));
  sql(`update profiles set status='active' where id='${b.id}';`);assert.equal((await contacts(b)).length,0);
  const next2=await invite(child,b.email);okay(await accept(b,next2.id));
  sql(`update auth.users set email='changed-${randomUUID()}@example.invalid' where id='${b.id}'; update auth.users set email='${b.email}' where id='${b.id}';`);
  assert.equal((await contacts(b)).length,0);
 });
 await test('Closed invitation history cannot hide an active connection or its revoke control',async()=>{
  const next=await invite(child,b.email);okay(await accept(b,next.id));
  sql(`update trusted_support_contacts set created_at=now()-interval '10 days' where id='${next.id}';
   insert into trusted_support_contacts(child_id,name,role,email,status,created_at)
    select '${child.id}','Synthetic history','parent','history-'||n||'-${randomUUID()}@example.invalid','declined',now()-interval '2 days' from generate_series(1,110) n;`);
  const visible=await contacts(child);assert.ok(visible.length<=100);
  assert.ok(visible.some(c=>c.id===next.id&&c.status==='connected'));
  okay(await rpc(child,'revoke_trusted_support_contact_v1',{p_contact_id:next.id}));
  assert.equal((await contacts(b)).length,0);
 });
 await test('Pending invitation flood cannot hide adult accepted connections; adult acceptance limit is enforced',async()=>{
  const target=await signup('support-cap','parent');
  sql(`do $$declare c uuid; begin for n in 1..160 loop
   c:=gen_random_uuid();
   insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(c,'synthetic-cap-'||c||'@example.invalid',now(),'{}'::jsonb||jsonb_build_object('role','child'));
   insert into trusted_support_contacts(child_id,adult_id,name,role,email,status,accepted_at,accepted_by,acceptance_method,adult_attested_at,created_at)
   values(c,case when n<=50 then '${target.id}'::uuid else null end,'Synthetic','parent','${target.email}',case when n<=50 then 'connected' else 'pending' end,
    case when n<=50 then now()-interval '2 days' else null end,case when n<=50 then '${target.id}'::uuid else null end,
    case when n<=50 then 'account_email' else null end,case when n<=50 then now()-interval '2 days' else null end,
    case when n<=50 then now()-interval '2 days' else now() end);
   end loop;end$$;`);
  const visible=await contacts(target);assert.equal(visible.filter(c=>c.status==='connected').length,50);assert.equal(visible.length,100);
  const pending=visible.find(c=>c.status==='pending');denied(await accept(target,pending.id));
  okay(await rpc(target,'revoke_trusted_support_contact_v1',{p_contact_id:visible.find(c=>c.status==='connected').id}));
  okay(await accept(target,pending.id));
 });
 await test('Anonymous callers cannot list or record support data',async()=>{
  denied(await rpc(null,'list_trusted_support_contacts_v1',{}));denied(await rpc(null,'list_trusted_support_requests_v1',{}));
  denied(await rpc(null,'record_trusted_support_request_v1',{...body,p_request_id:randomUUID()}));
 });
 await test('Deleting an acknowledged recipient preserves private records without broken foreign-key checks',async()=>{
  const recipient=await signup('support-delete','parent');
  // Use a separate synthetic child because the flood fixture intentionally exceeds daily invitation limits.
  const owner=await signup('support-delete-child','child');
  const connection=await invite(owner,recipient.email);okay(await accept(recipient,connection.id));
  const shared=okay(await rpc(owner,'record_trusted_support_request_v1',{p_child_id:owner.id,p_request_id:randomUUID(),p_source:'mood-check-in',p_contact_id:connection.id}));
  okay(await rpc(owner,'record_trusted_support_request_v1',{p_child_id:owner.id,p_request_id:randomUUID(),p_source:'mood-check-in',p_contact_id:null}));
  okay(await rpc(recipient,'acknowledge_trusted_support_request_v1',{p_request_id:shared}));
  sql(`delete from auth.users where id='${recipient.id}';`);
  const remaining=await requests(owner);assert.equal(remaining.length,1);assert.equal(remaining[0].contact_id,null);
 });
 await test('Repeating the scoped migration preserves live consent and record state',async()=>{
  const before=sql('select (select count(*) from trusted_support_contacts),(select count(*) from trusted_support_requests);');
  sql(fs.readFileSync(path.join(repo,'supabase/migration-drafts/044_scoped_support_connections.sql'),'utf8'));
  assert.equal(sql('select (select count(*) from trusted_support_contacts),(select count(*) from trusted_support_requests);'),before);
 });
})().catch(e=>{results.push({name:'Prerequisite',status:'failed',reason:e.message});console.error(e.message)}).finally(()=>{
 fs.writeFileSync(path.join(localDir,'support-connections-results.json'),JSON.stringify({checkedAt:new Date().toISOString(),results},null,2),{mode:0o600});
 console.log(`${results.filter(r=>r.status==='passed').length} passed; ${results.filter(r=>r.status==='failed').length} failed.`);if(results.some(r=>r.status==='failed'))process.exitCode=1;
});
