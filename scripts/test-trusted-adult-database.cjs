const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const child='00000000-0000-0000-0000-000000000011';
const adult='00000000-0000-0000-0000-000000000012';
const teacher='00000000-0000-0000-0000-000000000013';
const stranger='00000000-0000-0000-0000-000000000014';
const classroom='00000000-0000-0000-0000-000000000015';
(async()=>{
 const db=await PGlite.create();let checks=0;
 try {
  await db.exec(fs.readFileSync('scripts/fixtures/profile-authority.sql','utf8'));
  await db.exec(fs.readFileSync('scripts/fixtures/trusted-adult-boundary.sql','utf8'));
  const draft=fs.readFileSync('supabase/migration-drafts/041_safeguarding_access_guardrails.draft.sql','utf8');
  await db.exec(draft);
  await db.exec(fs.readFileSync('supabase/migrations/040_child_privacy_boundaries.sql','utf8'));
  const asActor=async(id,statement,role='authenticated')=>{
   await db.exec('begin');
   try {
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,role})]);
    await db.exec(`set local role ${role}`);
    const r=await db.query(statement);await db.exec('commit');return r.rows;
   }catch(e){await db.exec('rollback');throw e;}
  };
  for(const [id,role,email] of [[child,'child','child'],[adult,'parent','adult'],[teacher,'teacher','teacher'],[stranger,'parent','stranger']])
   await db.query(`insert into auth.users values($1,$2,now(),$3)`,[id,`${email}@example.invalid`,JSON.stringify({role})]);
  await asActor(teacher,`update profiles set is_authorized=true,status='active' where id='${teacher}'`,'service_role');
  await db.query('insert into teacher_classes values($1,$2)',[classroom,teacher]);
  const record=async()=> (await asActor(child,`select * from record_trusted_adult_request_v1('Synthetic Adult','parent','adult@example.invalid','test-only','${child}')`))[0];
  let invitation=await record();assert.equal(invitation.status,'pending');assert.equal(invitation.adult_id,null);checks++;
  assert.equal((await asActor(adult,'select * from child_relationships')).length,0);checks++;
  await assert.rejects(asActor(child,"select * from add_trusted_adult_for_child('Test','parent','adult@example.invalid','test')"));checks++;
  await assert.rejects(asActor(adult,"select * from link_child_by_buddy_id('AB-TEST','parent')"));checks++;
  await assert.rejects(asActor(stranger,`select * from accept_trusted_adult_invitation('${invitation.id}')`));checks++;
  await asActor(adult,`select * from accept_trusted_adult_invitation('${invitation.id}')`);
  assert.equal((await asActor(adult,'select * from child_relationships')).length,1);checks++;
  await assert.rejects(record(),/already has a connection/);checks++;
  await assert.rejects(asActor(child,`update trusted_adults set adult_id='${stranger}' where id='${invitation.id}'`));checks++;
  await asActor(child,`insert into mood_check_ins(child_id,mood,note) values('${child}','sad','private synthetic note')`);
  assert.equal((await asActor(adult,'select * from mood_check_ins')).length,0);checks++;
  await asActor(child,`update mood_check_ins set is_shared=true`);
  assert.equal((await asActor(adult,'select * from mood_check_ins')).length,1);checks++;
  assert.equal((await asActor(stranger,'select * from mood_check_ins')).length,0);checks++;
  const approve=`insert into class_join_requests(class_id,child_id,requested_by,status,parent_approved,parent_approved_by,parent_approved_at,teacher_approved,teacher_approved_by,teacher_approved_at,approved_at)
    values('${classroom}','${child}','${teacher}','approved',true,'${adult}',now(),true,'${teacher}',now(),now()) returning id`;
  await assert.rejects(asActor(teacher,approve));checks++;
  await assert.rejects(asActor(teacher,approve,'service_role'),/linked parent/);checks++;
  const authorise=async()=>{
   await asActor(adult,`update trusted_adults set guardian_verified_at=now(),guardian_verified_by='${stranger}',guardian_verification_method='manual_admin' where id='${invitation.id}'`,'service_role');
   await asActor(teacher,approve,'service_role');
   await asActor(teacher,`insert into class_memberships(class_id,child_id,teacher_id,status) values('${classroom}','${child}','${teacher}','active')`,'service_role');
  };
  await authorise();checks++;
  // The legacy adult unlink route must invalidate approvals through the DELETE trigger.
  await asActor(adult,`select * from unlink_child_from_parent('${child}')`);
  assert.equal((await db.query('select status from class_memberships')).rows[0].status,'paused');
  assert.equal((await db.query('select parent_approved from class_join_requests')).rows[0].parent_approved,false);checks++;
  assert.equal((await asActor(adult,'select * from mood_check_ins')).length,0);checks++;
  // Rehearse guardian evidence withdrawal without removing accepted email contact.
  await db.exec('delete from class_join_requests; delete from class_memberships;');
  invitation=await record();await asActor(adult,`select * from accept_trusted_adult_invitation('${invitation.id}')`);await authorise();
  await asActor(adult,`update trusted_adults set guardian_verified_at=null,guardian_verified_by=null,guardian_verification_method=null where id='${invitation.id}'`,'service_role');
  assert.equal((await db.query('select status from class_memberships')).rows[0].status,'paused');checks++;
  await asActor(child,`select revoke_trusted_adult_for_child('${invitation.id}')`);
  assert.equal((await asActor(adult,'select * from child_relationships')).length,0);checks++;
  // Rebuild approval to exercise account suspension and classroom ownership changes.
  for (const change of ['adult-suspension','teacher-suspension','class-owner','contact-email']) {
    await db.exec('delete from class_join_requests; delete from class_memberships; delete from trusted_adults;');
    await asActor(adult,`update profiles set status='active',is_authorized=true where id in ('${adult}','${teacher}')`,'service_role');
    await db.query('update teacher_classes set teacher_id=$1 where id=$2',[teacher,classroom]);
    invitation=await record();await asActor(adult,`select * from accept_trusted_adult_invitation('${invitation.id}')`);await authorise();
    if(change==='adult-suspension')await asActor(adult,`update profiles set status='suspended' where id='${adult}'`,'service_role');
    if(change==='teacher-suspension')await asActor(teacher,`update profiles set status='suspended' where id='${teacher}'`,'service_role');
    if(change==='class-owner')await db.query('update teacher_classes set teacher_id=$1 where id=$2',[stranger,classroom]);
    if(change==='contact-email')await asActor(adult,`update trusted_adults set email='changed@example.invalid' where id='${invitation.id}'`,'service_role');
    assert.equal((await db.query('select status from class_memberships')).rows[0].status,'paused',change);checks++;
  }
  await db.exec(fs.readFileSync('supabase/migration-drafts/042_atomic_support_record.sql','utf8'));
  const requestId='00000000-0000-0000-0000-000000000099';
  const support=`select record_child_support_request_v1('${child}','${requestId}','mood-check-in',true) as id`;
  // Force the last operational insert to fail and confirm the complete transaction rolls back.
  await db.exec(`create function fail_test_alert() returns trigger language plpgsql as $$begin raise exception 'synthetic alert failure'; end;$$;
    create trigger test_failure before insert on alerts for each row execute function fail_test_alert();`);
  await assert.rejects(asActor(child,support),/synthetic alert failure/);
  for(const table of ['journal_entries','parent_child_signals','alerts','child_support_request_receipts'])
    assert.equal((await db.query(`select count(*)::int as n from ${table}`)).rows[0].n,0);
  checks++;
  await db.exec('drop trigger test_failure on alerts');
  const recorded=await asActor(child,support);const retry=await asActor(child,support);
  assert.equal(recorded[0].id,retry[0].id);checks++;
  for(const table of ['journal_entries','parent_child_signals','alerts','child_support_request_receipts'])
    assert.equal((await db.query(`select count(*)::int as n from ${table}`)).rows[0].n,1);
  checks++;
  await assert.rejects(asActor(child,support.replace('true','false')),/different request/);checks++;
  await assert.rejects(asActor(adult,support),/active child/);checks++;
  await assert.rejects(asActor(child,support.replace(child,stranger)),/active child/);checks++;
  await assert.rejects(asActor(child,support.replace('mood-check-in','unknown')),/valid support/);checks++;
  assert.equal((await db.query('select risk_level from alerts')).rows[0].risk_level,'high');checks++;
  await db.exec(draft);checks++;
  console.log(`Trusted-adult SQL: ${checks} checks passed, including full draft application and rerun on synthetic tables.`);
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
