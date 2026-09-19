// Real PostgreSQL/RLS in an in-memory PGlite instance. No URLs, live Auth or DB.
// Historical source reproduction and candidate proof are separate report sections.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const sources = {};
const read = name => {
  const text = fs.readFileSync(path.join(root, name), 'utf8');
  sources[name] = createHash('sha256').update(text).digest('hex');
  return text;
};
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const I = { child:id(201), other:id(202), teacher:id(203), otherTeacher:id(204), parent:id(205),
  support:id(206), stranger:id(207), admin:id(208), class:id(209), otherClass:id(210),
  task:id(211), archived:id(212), otherTask:id(213), request:id(214), guardian:id(215), secondTask:id(216) };
const visibility = {academicTasks:true,childName:true,neuroProfile:false,dailyMood:'hidden',worryDiaryText:false,safeguardingAlerts:false,personalNotes:false};
const report = { kind:'school-task-source-rehearsal', sourceCommit:process.env.GITHUB_SHA || null,
  liveDatabaseVerified:false, hostedAuthVerified:false, concurrentSessionsVerified:false,
  candidateDeployed:false, legacyFindings:[], candidateChecks:[], sourceHashes:sources,
  limitations:[
    'Auth claims/sessions and guardian/class approvals are synthetic fixtures, not verified people or actual sign-in/approval UI.',
    'The schema uses selected tracked migrations and fixtures; current deployed policy/function definitions are not certified.',
    'One in-memory PostgreSQL connection proves sequential RLS/function behaviour, not multi-session races or PostgREST.',
    '045 depends on a broad 041 guardian/class draft which must not be blindly applied to production.',
    'Teacher/parent UI and all historical security-definer RPCs are not covered by this task-table-only candidate.'
  ] };
const candidate = read('supabase/migration-drafts/045_school_task_access_boundary.draft.sql');
async function database(broad) {
  const db = await PGlite.create();
  await db.exec(read('scripts/fixtures/profile-authority.sql'));
  await db.exec(read('scripts/fixtures/trusted-adult-boundary.sql'));
  // Use actual 019 school table definitions, not the small support-test stand-ins.
  await db.exec(`drop table public.class_join_requests,public.class_memberships,public.teacher_classes;
    alter table auth.users add column banned_until timestamptz, add column deleted_at timestamptz;
    alter table public.profiles add column neuro_types text[] default '{}', add column age integer;
    create function public.normalize_buddy_id(text) returns text language sql immutable as $$select upper(trim($1))$$;`);
  const migration = read('supabase/migrations/019_teacher_support_center.sql');
  assert.equal(migration.split('create extension if not exists pgcrypto;').length, 2);
  // gen_random_uuid is PostgreSQL core here; no pgcrypto functions are used.
  await db.exec(migration.replace('create extension if not exists pgcrypto;', '-- Core gen_random_uuid; extension install omitted in WASM only.'));
  await db.exec(read('supabase/migrations/020_teacher_parent_approval.sql'));
  await db.exec(read('supabase/migrations/021_fix_teacher_class_policy_recursion.sql'));
  await db.exec(`grant select,insert,update,delete on public.teacher_classes,public.class_join_requests,public.class_memberships,
    public.teacher_assignments,public.assignment_submissions to authenticated;
    grant all on all tables in schema public to service_role;`);
  await db.exec(read('supabase/migrations/023_teacher_assignment_lifecycle.sql'));
  await db.exec(read('supabase/migrations/032_pronunciation_assignments.sql'));
  if (broad) await db.exec(read('supabase/migration-drafts/041_safeguarding_access_guardrails.draft.sql'));
  await db.exec(read('supabase/migration-drafts/041_profile_authority_boundary.sql'));
  await db.exec(read('supabase/migration-drafts/044_scoped_support_connections.sql'));
  if (broad) await db.exec(candidate);
  for (const [name,role] of [['child','child'],['other','child'],['teacher','teacher'],['otherTeacher','teacher'],['parent','parent'],['support','parent'],['stranger','parent'],['admin','parent']]) {
    await db.query(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)`,
      [I[name],`${name.toLowerCase()}@example.invalid`,JSON.stringify({role,first_name:'Synthetic '+name})]);
  }
  await db.query(`update public.profiles set is_authorized=true,status='active' where id in ($1,$2)`,[I.teacher,I.otherTeacher]);
  await db.query(`update public.profiles set role='admin',admin_verified_at=now(),admin_verified_by=id,admin_verification_method='service_role_bootstrap' where id=$1`,[I.admin]);
  await db.query(`insert into public.teacher_classes(id,teacher_id,class_name,class_code) values($1,$2,'Synthetic class','SYN-A'),($3,$4,'Other class','SYN-B')`,[I.class,I.teacher,I.otherClass,I.otherTeacher]);
  // A service-side fixture supplies review evidence; this does not certify the
  // existing guardian verification or approval workflows in the hosted app.
  await db.query(`insert into public.trusted_adults(id,child_id,adult_id,name,role,email,phone,status)
    values($1,$2,$3,'Synthetic guardian','parent','parent@example.invalid','','pending')`,[I.guardian,I.child,broad ? null : I.parent]);
  if (broad) {
    await db.query(`update public.trusted_adults set adult_id=$2,status='connected',accepted_at=now(),accepted_by=$2,
      acceptance_method='account_email',guardian_verified_at=now(),guardian_verified_by=$3,guardian_verification_method='manual_admin' where id=$1`,[I.guardian,I.parent,I.admin]);
  } else await db.query(`update public.trusted_adults set status='connected' where id=$1`,[I.guardian]);
  await db.query(`insert into public.child_relationships(parent_id,child_id,relationship) values($1,$2,'parent')`,[I.parent,I.child]);
  await db.query(`insert into public.class_join_requests(id,class_id,child_id,requested_by,status,parent_approved,parent_approved_by,parent_approved_at,teacher_approved,teacher_approved_by,teacher_approved_at,approved_at,visibility_settings)
    values($1,$2,$3,$4,'approved',true,$5,now(),true,$4,now(),now(),$6)`,[I.request,I.class,I.child,I.teacher,I.parent,visibility]);
  await db.query(`insert into public.class_memberships(class_id,child_id,teacher_id,status,visibility_settings) values($1,$2,$3,'active',$4)`,[I.class,I.child,I.teacher,visibility]);
  await db.query(`insert into public.teacher_assignments(id,class_id,teacher_id,title,assignment_type,support_tools,archived_at)
    values($1,$2,$3,'Read a fictional sentence','reading',array['read_aloud'],null),
      ($4,$2,$3,'Archived task','reading','{}',now()),($5,$6,$7,'Other class task','reading','{}',null),
      ($8,$2,$3,'Second current task','task','{}',null)`,[I.task,I.class,I.teacher,I.archived,I.otherTask,I.otherClass,I.otherTeacher,I.secondTask]);
  await db.exec('begin');
  return db;
}
function actor(db) {
  return async (who,sql,params=[],role='authenticated') => {
    assert.ok(['authenticated','anon','service_role'].includes(role));
    await db.exec('savepoint actor_call');
    try {
      await db.query(`select set_config('request.jwt.claims',$1,true)`,[JSON.stringify({sub:who,role,session_id:who})]);
      await db.exec(`set local role ${role}`);
      const result = await db.query(sql,params);
      await db.exec('reset role');
      await db.query(`select set_config('request.jwt.claims','{}',true)`);
      await db.exec('release savepoint actor_call');
      return result.rows;
    } catch (e) {
      await db.exec('rollback to savepoint actor_call; release savepoint actor_call');
      throw e;
    }
  };
}
async function runCase(db,section,name,fn) {
  await db.exec('savepoint scenario');
  try {
    await fn();
    report[section].push({name,status:section==='legacyFindings'?'reproduced':'passed'});
    console.log(`${section==='legacyFindings'?'REPRODUCED (not safe)':'PASS'} ${name}`);
  } catch (e) {
    report[section].push({name,status:'failed',code:e.code || null,message:String(e.message).slice(0,500)});
    throw e;
  } finally { await db.exec('rollback to savepoint scenario; release savepoint scenario'); }
}
async function legacy() {
  const db=await database(false), as=actor(db);
  try {
    await runCase(db,'legacyFindings','Self-ID-only submission policy permits a child outside the class to insert a task result',async()=>{
      const rows=await as(I.other,`insert into assignment_submissions(assignment_id,child_id,status) values($1,$2,'completed') returning child_id`,[I.task,I.other]);
      assert.equal(rows[0].child_id,I.other);
    });
    await runCase(db,'legacyFindings','Legacy connected contact reads parent task summaries without verified guardian evidence',async()=>{
      const rows=await as(I.parent,'select * from parent_assignment_summaries($1)',[[I.child]]);
      assert.equal(rows.length,2);
    });
    await runCase(db,'legacyFindings','Archived assignment is still directly readable to the child under historical table RLS',async()=>{
      assert.equal((await as(I.child,'select id from teacher_assignments where id=$1',[I.archived])).length,1);
    });
    await runCase(db,'legacyFindings','Suspended teacher can still read owned task rows under historical table RLS',async()=>{
      await db.query(`update profiles set status='suspended' where id=$1`,[I.teacher]);
      assert.equal((await as(I.teacher,'select id from teacher_assignments where id=$1',[I.task])).length,1);
    });
    // Candidate precondition uses its own transaction; run after leaving test txn.
    await db.exec('rollback');
    await assert.rejects(db.exec(candidate), /requires reviewed guardian/);
    await db.exec('rollback');
    report.candidateChecks.push({name:'Refuses installation on narrow support-only schema',status:'passed'});
  } finally { await db.close(); }
}
async function hardened() {
  const db=await database(true),as=actor(db);
  const test=(name,fn)=>runCase(db,'candidateChecks',name,fn);
  const denied=async(who,sql,params=[],role)=>assert.rejects(as(who,sql,params,role),e=>e.code==='42501');
  const submit=(who=I.child,task=I.task,status='completed')=>as(who,
    `insert into assignment_submissions(assignment_id,child_id,status,support_used,submitted_at)
     values($1,$2,$3,array['read_aloud'],case when $3 in ('completed','submitted') then now() else null end)
     on conflict(assignment_id,child_id) do update set status=excluded.status,support_used=excluded.support_used,submitted_at=excluded.submitted_at
     returning assignment_id,child_id,status,support_used,submitted_at`,[task,who,status]);
  const parent=who=>as(who,'select * from parent_assignment_summaries($1)',[[I.child]]);
  try {
    await test('Teacher publishes; approved child records progress; same status and support reach authorised parent and teacher',async()=>{
      const task=id(250);
      await as(I.teacher,`insert into teacher_assignments(id,class_id,teacher_id,title,assignment_type,support_tools) values($1,$2,$3,'Synthetic new task','reading',array['read_aloud'])`,[task,I.class,I.teacher]);
      assert.equal((await as(I.child,'select id from teacher_assignments where id=$1',[task])).length,1);
      const first=(await submit(I.child,task,'in_progress'))[0];assert.equal(first.status,'in_progress');
      const saved=(await submit(I.child,task))[0];assert.equal(saved.status,'completed');
      const seen=(await parent(I.parent)).find(row=>row.assignment_id===task);
      assert.equal(seen.status,'completed');assert.deepEqual(seen.support_used,['read_aloud']);
      assert.equal((await as(I.teacher,'select status from assignment_submissions where assignment_id=$1',[task]))[0].status,'completed');
      assert.ok(!Object.hasOwn(seen,'response_text'));assert.ok(!Object.hasOwn(seen,'audio_url'));
    });
    await test('Help is a task status visible to the authorised adults, not an external notification',async()=>{
      await submit(I.child,I.task,'needs_help');
      assert.equal((await parent(I.parent)).find(row=>row.assignment_id===I.task).status,'needs_help');
      assert.equal((await db.query('select count(*)::int as n from trusted_support_requests')).rows[0].n,0);
    });
    await test('Optional feeling update preserves completion time, status and recorded supports',async()=>{
      const saved=(await submit())[0];
      await as(I.child,`update assignment_submissions set mood_after_task='confident' where assignment_id=$1 and child_id=$2 and status in ('completed','submitted') returning status`,[I.task,I.child]);
      const after=(await as(I.child,'select * from assignment_submissions where assignment_id=$1',[I.task]))[0];
      assert.equal(after.status,saved.status);assert.deepEqual(after.submitted_at,saved.submitted_at);assert.deepEqual(after.support_used,saved.support_used);
      assert.equal((await parent(I.parent)).find(row=>row.assignment_id===I.task).mood_after_task,'confident');
    });
    for (const status of ['not_started','in_progress','needs_help','completed','submitted'])
      await test(`Existing task status ${status} keeps its exact receipt`,async()=>assert.equal((await submit(I.child,I.task,status))[0].status,status));
    await test('Unrelated child cannot insert or read a guessed assignment',async()=>{
      await denied(I.other,`insert into assignment_submissions(assignment_id,child_id) values($1,$2)`,[I.task,I.other]);
      assert.deepEqual(await as(I.other,'select id from teacher_assignments where id=$1',[I.task]),[]);
    });
    await test('Child cannot publish teacher work or forge another child submission',async()=>{
      await denied(I.child,`insert into teacher_assignments(class_id,teacher_id,title) values($1,$2,'forged')`,[I.class,I.child]);
      await denied(I.child,`insert into assignment_submissions(assignment_id,child_id) values($1,$2)`,[I.task,I.other]);
    });
    await test('Other teacher cannot publish into or read another class',async()=>{
      await denied(I.otherTeacher,`insert into teacher_assignments(class_id,teacher_id,title) values($1,$2,'wrong class')`,[I.class,I.otherTeacher]);
      await submit();assert.deepEqual(await as(I.otherTeacher,'select * from assignment_submissions'),[]);
    });
    await test('Teacher and parent cannot rewrite a child result',async()=>{
      await submit();
      for(const who of [I.teacher,I.parent])assert.deepEqual(await as(who,`update assignment_submissions set status='submitted' where assignment_id=$1 returning id`,[I.task]),[]);
    });
    await test('Unrelated parent and unrelated requested child filter return no school records',async()=>{
      assert.deepEqual(await parent(I.stranger),[]);
      assert.deepEqual(await as(I.parent,'select * from parent_assignment_summaries($1)',[[I.other]]),[]);
    });
    await test('New accepted support-only invitation does not grant school-data access',async()=>{
      const invitation=(await as(I.child,`select create_trusted_support_invitation_v1($1,'Synthetic support','parent','support@example.invalid','') as invitation`,[I.child]))[0].invitation;
      assert.match(invitation.id,/^[0-9a-f-]{36}$/);
      await as(I.support,'select * from respond_trusted_support_invitation_v1($1,true,true)',[invitation.id]);
      assert.deepEqual(await parent(I.support),[]);
      assert.equal((await db.query('select count(*)::int as n from child_relationships where parent_id=$1',[I.support])).rows[0].n,0);
    });
    await test('Accepted legacy contact without guardian verification does not gain school summaries',async()=>{
      const invitation=(await as(I.child,`select * from record_trusted_adult_request_v1('Synthetic contact','parent','support@example.invalid','test-only',$1)`,[I.child]))[0];
      await as(I.support,'select * from accept_trusted_adult_invitation($1)',[invitation.id]);
      assert.deepEqual(await parent(I.support),[]);
    });
    await test('Parent cannot bypass the summary with raw assignment or submission reads',async()=>{
      await submit();assert.deepEqual(await as(I.parent,'select * from assignment_submissions'),[]);
      assert.deepEqual(await as(I.parent,'select * from teacher_assignments'),[]);
    });
    await test('Academic-task visibility false blocks the whole child/parent/teacher result path',async()=>{
      await submit();const off={...visibility,academicTasks:false};
      await db.query('update class_join_requests set visibility_settings=$1',[off]);
      await db.query('update class_memberships set visibility_settings=$1',[off]);
      assert.deepEqual(await parent(I.parent),[]);assert.deepEqual(await as(I.teacher,'select * from assignment_submissions'),[]);
      assert.deepEqual(await as(I.child,'select * from assignment_submissions'),[]);
      await denied(I.child,`insert into assignment_submissions(assignment_id,child_id) values($1,$2)`,[I.secondTask,I.child]);
    });
    for(const status of ['paused','removed']) await test(`${status} membership blocks read, old-result update and new completion`,async()=>{
      await submit();await db.query('update class_memberships set status=$1',[status]);
      assert.deepEqual(await parent(I.parent),[]);assert.deepEqual(await as(I.teacher,'select * from assignment_submissions'),[]);
      assert.deepEqual(await as(I.child,`update assignment_submissions set status='submitted' returning id`),[]);
      await denied(I.child,`insert into assignment_submissions(assignment_id,child_id) values($1,$2)`,[I.secondTask,I.child]);
    });
    await test('Pending parent approval with an old active membership does not authorize a result',async()=>{
      await db.query(`update class_join_requests set parent_approved=false,parent_approved_by=null,parent_approved_at=null,status='pending_parent',approved_at=null`);
      assert.deepEqual(await parent(I.parent),[]);await denied(I.child,`insert into assignment_submissions(assignment_id,child_id) values($1,$2)`,[I.task,I.child]);
    });
    await test('Parent unlink revokes school-result access immediately in the next statement',async()=>{
      await submit();await as(I.parent,'select * from unlink_child_from_parent($1)',[I.child]);
      assert.deepEqual(await parent(I.parent),[]);assert.deepEqual(await as(I.teacher,'select * from assignment_submissions'),[]);
    });
    await test('Guardian-verification withdrawal revokes the class path',async()=>{
      await submit();await db.query('update trusted_adults set guardian_verified_at=null,guardian_verified_by=null,guardian_verification_method=null where id=$1',[I.guardian]);
      assert.deepEqual(await parent(I.parent),[]);assert.deepEqual(await as(I.child,'select * from assignment_submissions'),[]);
    });
    for(const who of ['child','parent','teacher','admin']) await test(`Suspended ${who} invalidates school-result authority`,async()=>{
      await submit();await db.query(`update profiles set status='suspended' where id=$1`,[I[who]]);
      assert.deepEqual(await parent(I.parent),[]);assert.deepEqual(await as(I.teacher,'select * from assignment_submissions'),[]);
    });
    for(const change of ["banned_until=now()+interval '1 day'",'deleted_at=now()','email_confirmed_at=null',"email='different@example.invalid'"])
      await test(`Guardian Auth ${change.split('=')[0]} invalidates school summaries`,async()=>{
        await db.query(`update auth.users set ${change} where id=$1`,[I.parent]);assert.deepEqual(await parent(I.parent),[]);
      });
    await test('Revoked parent session denies summary despite a still-active account and link',async()=>{
      await db.query('delete from auth.sessions where user_id=$1',[I.parent]);assert.deepEqual(await parent(I.parent),[]);
    });
    await test('Expired child session cannot submit',async()=>{
      await db.query(`update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1`,[I.child]);
      await denied(I.child,`insert into assignment_submissions(assignment_id,child_id) values($1,$2)`,[I.task,I.child]);
    });
    await test('Class-owner change cannot transfer old child results or leave the old owner authorised',async()=>{
      await submit();await db.query('update teacher_classes set teacher_id=$1 where id=$2',[I.otherTeacher,I.class]);
      assert.deepEqual(await as(I.teacher,'select * from assignment_submissions'),[]);assert.deepEqual(await as(I.otherTeacher,'select * from assignment_submissions'),[]);assert.deepEqual(await parent(I.parent),[]);
    });
    await test('Archiving hides child/parent results and blocks completion without deleting historical rows',async()=>{
      await submit();await as(I.teacher,'update teacher_assignments set archived_at=now() where id=$1',[I.task]);
      assert.deepEqual(await as(I.child,'select * from teacher_assignments where id=$1',[I.task]),[]);
      assert.ok(!(await parent(I.parent)).some(row=>row.assignment_id===I.task));
      assert.deepEqual(await as(I.child,`update assignment_submissions set status='submitted' returning id`),[]);
      await denied(I.child,`insert into assignment_submissions(assignment_id,child_id) values($1,$2)`,[I.archived,I.child]);
      assert.equal((await db.query('select count(*)::int as n from assignment_submissions')).rows[0].n,1);
    });
    await test('Submission cannot be moved to a second valid task',async()=>{
      await submit();await denied(I.child,'update assignment_submissions set assignment_id=$1 where assignment_id=$2',[I.secondTask,I.task]);
    });
    await test('Teacher task identity cannot be rewritten by an authenticated owner',async()=>{
      await denied(I.teacher,'update teacher_assignments set id=$1 where id=$2',[id(290),I.task]);
    });
    await test('Anonymous calls and internal-helper calls are denied',async()=>{
      await denied(null,'select * from parent_assignment_summaries(null)',[],'anon');
      await denied(I.stranger,'select school_task_guardian_valid_v1($1,$2)',[I.child,I.parent]);
    });
    await test('RLS remains enabled and all eight new policies are restrictive',async()=>{
      assert.equal((await db.query(`select count(*)::int as n from pg_policies where policyname like 'school_%_gate' and permissive='RESTRICTIVE'`)).rows[0].n,8);
      assert.equal((await db.query(`select count(*)::int as n from pg_class where relname in ('teacher_assignments','assignment_submissions') and relrowsecurity`)).rows[0].n,2);
    });
    await test('Candidate rerun preserves tasks and the valid summary contract',async()=>{
      await db.exec('rollback');
      await db.exec(candidate);await db.exec('begin; savepoint scenario');
      assert.equal((await db.query('select count(*)::int as n from teacher_assignments')).rows[0].n,4);
      assert.equal((await parent(I.parent)).length,2);
    });
    await db.exec('rollback');
  } finally {await db.close();}
}
(async()=>{
  try {
    await legacy();await hardened();
    report.result='candidate_passed_legacy_source_blocked';
    console.log(`School task candidate: ${report.candidateChecks.length} PostgreSQL checks passed; ${report.legacyFindings.length} historical policy risks reproduced. No live release approval.`);
  } catch(e) {report.result='failed';report.error={code:e.code||null,message:String(e.message).slice(0,1000)};console.error('School task rehearsal failed:',e.message);process.exitCode=1;}
  finally {
    const out=process.env.RUNNER_TEMP ? path.join(process.env.RUNNER_TEMP,'adaptbuddy-task-authority') : path.join(root,'.task-authority-results');
    fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'school-task-authority.json'),JSON.stringify(report,null,2)+'\n');
    if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n### School task SQL candidate\n\nResult: ${report.result}\n\nCandidate checks: ${report.candidateChecks.filter(c=>c.status==='passed').length}; historical policy risks reproduced: ${report.legacyFindings.filter(c=>c.status==='reproduced').length}. This is synthetic PostgreSQL/RLS evidence, not a deployed-policy or full-app sign-off.\n`);
  }
})();
