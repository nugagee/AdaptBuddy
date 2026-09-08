const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const sql = fs.readFileSync('supabase/migration-drafts/041_profile_authority_boundary.sql', 'utf8');
const child = '00000000-0000-0000-0000-000000000001';
const teacher = '00000000-0000-0000-0000-000000000002';
const admin = '00000000-0000-0000-0000-000000000003';
let checks = 0;
(async () => {
  const db = await PGlite.create();
  try {
    await db.exec(fs.readFileSync('scripts/fixtures/profile-authority.sql', 'utf8'));
    await db.query(`insert into auth.users values($1,'admin@example.invalid',now(),'{"role":"admin"}')`,[admin]);
    await db.exec(sql);
    const asActor = async (id, statement, role = 'authenticated') => {
      await db.exec('begin');
      try {
        await db.query("select set_config('request.jwt.claims', $1, true)",[JSON.stringify({sub:id,role,session_id:id})]);
        await db.exec(`set local role ${role}`);
        const result = await db.query(statement);
        await db.exec('commit');
        return result.rows;
      } catch (error) { await db.exec('rollback'); throw error; }
    };
    const denied = async (id, statement) => {
      await assert.rejects(asActor(id,statement), e=>e.code==='42501'); checks++;
    };
    assert.equal((await asActor(admin,'select public.is_admin() as allowed'))[0].allowed,false);checks++;
    await db.query(`insert into auth.users values($1,'CHILD@example.invalid',null,'{"role":"child"}'),($2,'teacher@example.invalid',null,'{"role":"teacher"}')`,[child,teacher]);
    assert.equal((await asActor(child,'select email from profiles'))[0].email,'child@example.invalid'); checks++;
    await asActor(child,"update profiles set first_name='Changed' where id=auth.uid()");checks++;
    for (const update of ["role='admin'","role='teacher'","email='victim@example.invalid'","email_verified_at=now()","is_authorized=false","status='pending'","admin_verified_at=now()"])
      await denied(child,`update profiles set ${update} where id=auth.uid()`);
    await denied(child,`insert into profiles(id,email,role) values('${child}','x@example.invalid','admin') on conflict(id) do update set role='admin'`);
    await denied(teacher,"update profiles set is_authorized=true,status='active' where id=auth.uid()");
    await db.query(`update auth.users set email_confirmed_at='2026-09-08T09:00:00Z' where id=$1`,[child]);
    assert.ok((await asActor(child,'select email_verified_at from profiles'))[0].email_verified_at); checks++;
    await db.query(`update auth.users set email='NEW@example.invalid' where id=$1`,[child]);
    assert.equal((await asActor(child,'select email from profiles'))[0].email,'new@example.invalid');checks++;
    const forged='00000000-0000-0000-0000-000000000004';
    await db.query(`insert into auth.users values($1,'forged@example.invalid',null,'{"role":"admin","is_authorized":true,"admin_verified_at":"now"}')`,[forged]);
    assert.equal((await asActor(forged,'select role from profiles'))[0].role,'parent');checks++;
    await asActor(admin,`update profiles set admin_verified_at=now(),admin_verified_by=id,admin_verification_method='service_role_bootstrap' where id='${admin}'`,'service_role');
    assert.equal((await asActor(admin,'select public.is_admin() as allowed'))[0].allowed,true);checks++;
    await asActor(admin,`update profiles set is_authorized=true,status='active' where id='${teacher}'`);checks++;
    await denied(admin,"update profiles set status='pending' where id=auth.uid()");
    await asActor(admin,`update profiles set role='parent' where id='${teacher}'`);checks++;
    await denied(admin,`update profiles set admin_verified_at=now() where id='${teacher}'`);
    await asActor(admin,`update profiles set status='suspended' where id='${admin}'`,'service_role');
    assert.equal((await asActor(admin,'select public.is_admin() as allowed'))[0].allowed,false);checks++;
    // Rehearsal must be rerunnable and must preserve the editable profile data.
    await db.exec(sql);
    assert.equal((await asActor(child,'select first_name from profiles'))[0].first_name,'Changed');checks++;
    console.log(`Profile authority: ${checks} PostgreSQL checks passed (synthetic Auth fixture).`);
  } finally { await db.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
