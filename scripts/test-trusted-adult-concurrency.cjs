// Multi-session PostgreSQL regression checks. Only the named disposable local stack is allowed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {randomUUID} = require('node:crypto');
const dir = process.env.ADAPT_BUDDY_LOCAL_REHEARSAL;
assert.ok(dir, 'Set ADAPT_BUDDY_LOCAL_REHEARSAL');
assert.match(fs.readFileSync(path.join(dir, 'supabase/config.toml'), 'utf8'), /^project_id = "adaptbuddy-local-rehearsal"$/m);
assert.match(process.env.DOCKER_HOST || '', /^unix:\/\/.*\/adaptbuddy-rehearsal\/docker\.sock$/);
const dockerArgs = ['exec', '-i', 'supabase_db_adaptbuddy-local-rehearsal', 'psql', '-X', '-q', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
function sql(query) {
  return new Promise((resolve, reject) => {
    const p = spawn('docker', dockerArgs, {env: process.env});
    let out = '', err = '';
    p.stdout.on('data', b => out += b); p.stderr.on('data', b => err += b);
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err.trim())));
    p.stdin.end("set statement_timeout='12s';\n" + query);
  });
}
class HeldSession {
  constructor() {
    this.p = spawn('docker', dockerArgs, {env: process.env});
    this.buffer = ''; this.error = ''; this.waiter = null;
    this.p.stdout.on('data', b => {this.buffer += b; this.check();});
    this.p.stderr.on('data', b => this.error += b);
    this.p.on('error', e => this.waiter?.reject(e));
    this.p.on('close', code => {if(this.waiter) this.waiter.reject(new Error(this.error || `Session exited ${code}`));});
  }
  check() {
    if (this.waiter && this.buffer.includes(this.waiter.marker)) {
      const w = this.waiter; this.waiter = null;
      const result = this.buffer.slice(0, this.buffer.indexOf(w.marker)); this.buffer = '';
      w.resolve(result.trim());
    }
  }
  command(query) {
    assert.equal(this.waiter, null);
    return new Promise((resolve, reject) => {
      const marker = 'done_' + randomUUID(); this.waiter = {marker, resolve, reject};
      this.p.stdin.write(query + '\nselect ' + quote(marker) + ';\n');
    });
  }
  close() {this.p.stdin.end();}
}
const actorSQL = (id, statement, app) => `begin; set local statement_timeout='10s'; set local application_name=${quote(app)}; select set_config('request.jwt.claims',${quote(JSON.stringify({sub:id,role:'authenticated'}))},true); set local role authenticated; ${statement}; commit;`;
async function eventually(probe, label) {
  const end = Date.now() + 5000;
  while(Date.now() < end) {if(await probe()) return; await new Promise(r => setTimeout(r,50));}
  throw new Error('Did not observe '+label);
}
async function fixture() {
  const child = randomUUID(), adult = randomUUID(), invitation = randomUUID();
  const email = `concurrency-${adult}@example.invalid`;
  await sql(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
    ('${child}','concurrency-${child}@example.invalid',now(),'{"role":"child"}'),
    ('${adult}',${quote(email)},now(),'{"role":"parent"}');
    insert into trusted_adults(id,child_id,name,role,email,phone) values('${invitation}','${child}','Synthetic Adult','parent',${quote(email)},'local-only');
    insert into mood_check_ins(child_id,mood,note,is_shared) values('${child}','sad','Synthetic shared note',true);`);
  return {child, adult, invitation};
}
const results = [];
async function test(name, work) {
  try {await work(); results.push({name,status:'passed'}); console.log('PASS '+name);}
  catch(e) {results.push({name,status:'failed',reason:e.message}); console.log('FAIL '+name+': '+e.message);}
}
async function assertNoAccess(f) {
  assert.equal(await sql(`select count(*) from trusted_adults where id='${f.invitation}' and status in ('active','connected');`), '0');
  assert.equal(await sql(`select count(*) from child_relationships where child_id='${f.child}' and parent_id='${f.adult}';`), '0');
  const out = await sql(actorSQL(f.adult, `select count(*) from mood_check_ins where child_id='${f.child}'`, 'check_'+randomUUID()));
  assert.equal(out.split('\n').at(-1), '0', 'Existing authenticated session still reads shared mood');
}
(async()=>{
  await test('Legitimate confirmed parent accepts once and retains contact access',async()=>{
    const f=await fixture();
    await sql(actorSQL(f.adult,`select id from accept_trusted_adult_invitation('${f.invitation}')`,'control_'+randomUUID()));
    assert.equal(await sql(`select status, guardian_verified_at is null from trusted_adults where id='${f.invitation}';`),'connected|t');
    await assert.rejects(sql(actorSQL(f.adult,`select accept_trusted_adult_invitation('${f.invitation}')`,'retry_'+randomUUID())),/no longer pending/);
  });
  for(const change of ['parent-suspension','parent-email','parent-confirmation','child-suspension']) {
    await test('Acceptance cannot restore access during '+change,async()=>{
      const f=await fixture(), holder=new HeldSession(), appA='accept_'+randomUUID(), appB='change_'+randomUUID();
      let acceptance, mutation;
      try {
        await holder.command(`begin; set local statement_timeout='10s'; select id from trusted_adults where id='${f.invitation}' for update;`);
        acceptance=sql(actorSQL(f.adult,`select id from accept_trusted_adult_invitation('${f.invitation}')`,appA)).then(value=>({ok:true,value}),error=>({ok:false,error:error.message}));
        await eventually(async()=> (await sql(`select count(*) from pg_stat_activity where application_name=${quote(appA)} and wait_event_type='Lock';`))==='1','acceptance blocked on held invitation');
        const q=change==='parent-suspension'?`update profiles set status='suspended' where id='${f.adult}'`:
          change==='parent-email'?`update auth.users set email='changed-${f.adult}@example.invalid' where id='${f.adult}'`:
          change==='parent-confirmation'?`update auth.users set email_confirmed_at=null where id='${f.adult}'`:
          `update profiles set status='suspended' where id='${f.child}'`;
        let settled=false;
        mutation=sql(`set application_name=${quote(appB)}; ${q};`).then(value=>{settled=true;return {ok:true,value}},error=>{settled=true;return {ok:false,error:error.message}});
        await eventually(async()=>settled || (await sql(`select count(*) from pg_stat_activity where application_name=${quote(appB)} and wait_event_type='Lock';`))==='1','mutation completed or waiting for acceptance locks');
        await holder.command('commit;');
        const [a,b]=await Promise.all([acceptance,mutation]);
        assert.equal(b.ok,true,b.error);
        assert.equal(a.ok,true,a.error); // Already-started acceptance can finish; invalidation must then win.
        await assertNoAccess(f);
      } finally {
        try{await holder.command('rollback;')}catch{}
        holder.close();
        if(acceptance)await acceptance;if(mutation)await mutation;
      }
    });
  }
  await test('Suspended child cannot gain a newly accepted contact',async()=>{
    const f=await fixture();await sql(`update profiles set status='suspended' where id='${f.child}';`);
    await assert.rejects(sql(actorSQL(f.adult,`select accept_trusted_adult_invitation('${f.invitation}')`,'suspended_child_'+randomUUID())),/active.*child|child.*active/i);
    await assertNoAccess(f);
  });
  await test('Child suspension revokes existing accepted contact access',async()=>{
    const f=await fixture();await sql(actorSQL(f.adult,`select accept_trusted_adult_invitation('${f.invitation}')`,'accept_control_'+randomUUID()));
    await sql(`update profiles set status='suspended' where id='${f.child}';`);await assertNoAccess(f);
  });
  await test('Removing confirmed-email evidence revokes existing accepted contact access',async()=>{
    const f=await fixture();await sql(actorSQL(f.adult,`select accept_trusted_adult_invitation('${f.invitation}')`,'accept_control_'+randomUUID()));
    await sql(`update auth.users set email_confirmed_at=null where id='${f.adult}';`);await assertNoAccess(f);
  });
})().catch(e=>{results.push({name:'Prerequisite',status:'failed',reason:e.message});console.error(e.message);}).finally(()=>{
 fs.writeFileSync(path.join(dir,'concurrency-results.json'),JSON.stringify({checkedAt:new Date().toISOString(),results},null,2),{mode:0o600});
 console.log(`${results.filter(r=>r.status==='passed').length} passed; ${results.filter(r=>r.status==='failed').length} failed.`);
 if(results.some(r=>r.status==='failed'))process.exitCode=1;
});
