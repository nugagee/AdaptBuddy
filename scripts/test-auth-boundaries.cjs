// Runtime auth and privacy regression probes. No network or live data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { create } = require('zustand');

const root = process.cwd();
function loadTs(relativePath, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relativePath), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  const storage = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  vm.runInNewContext(code, {
    exports, console: { ...console, error() {}, warn() {} }, localStorage, window: { localStorage, setTimeout },
    setTimeout, clearTimeout,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: relativePath });
  return exports;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};
const session = id => ({ user: {id}, access_token: `test-${id}` });
function fixture({initial=Promise.resolve(null), signIn=async()=>({data:{session:session('A'),user:{id:'A'}},error:null})}={}) {
  let callback; let signOuts=0; let childResets=0; let adultClears=0; const pending = new Map();
  const client={ auth: {
    getSession: async()=>({data:{session:await initial}}),
    onAuthStateChange: cb=>{callback=cb;return {data:{subscription:{unsubscribe(){}}}};},
    signInWithPassword: signIn,
    signOut: async()=>{signOuts++;callback?.('SIGNED_OUT',null);return {error:null};},
  }};
  const {useAuthStore:store}=loadTs('src/store/authStore.ts', {
    zustand:{create},
    'services/supabase/client':{getProfile:id=>{const p=deferred();pending.set(id,p);return p.promise;},getSupabaseClient:()=>client,isSupabaseConfigured:true},
    'features/child/store/childSessionStore':{useChildSessionStore:{getState:()=>({resetSession(){childResets++;}})}},
    'features/child/store/trustedAdultStore':{useTrustedAdultStore:{getState:()=>({clearTrustedAdults(){adultClears++;}})}},
    'services/supabase/authService':{},
    'services/supabase/sessionUtils':{toAuthSessionState:s=>({token:s.access_token})},
  });
  const cleanup=store.getState().initialize();
  return {
    store,
    cleanup,
    event: (type, id) => callback(type, id ? session(id) : null),
    resolve: (id, profile = { id, role: 'child' }) => pending.get(id).resolve(profile),
    reject: (id, error = new Error('Synthetic profile failure')) => pending.get(id).reject(error),
    signOuts: () => signOuts,
    cacheClears: () => [childResets, adultClears],
  };
}
(async()=>{
  let checks=0;
  // A profile lookup that finishes after logout must never restore that account.
  for(const end of ['event','action','guest','cleanup']) {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();
    if(end==='event')f.event('SIGNED_OUT');
    if(end==='action')await f.store.getState().signOut();
    if(end==='guest')assert.equal(await f.store.getState().setGuestMode(),true);
    if(end==='cleanup')f.cleanup();
    f.resolve('A');await tick();assert.equal(f.store.getState().user,null);
    assert.equal(f.store.getState().isGuest,end==='guest');f.cleanup();checks++;
  }
  for(const stale of [{id:'A',role:'child'},null]) {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();f.event('SIGNED_IN','B');await tick();
    f.resolve('B');await tick();f.resolve('A',stale);await tick();
    assert.equal(f.store.getState().user.id,'B');assert.equal(f.signOuts(),0);f.cleanup();checks++;
  }
  {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();f.resolve('A');await tick();
    const refresh=f.store.getState().refreshProfile();f.event('SIGNED_OUT');f.resolve('A');await refresh;
    assert.equal(f.store.getState().profile,null);f.cleanup();checks++;
  }
  {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();f.resolve('A');await tick();
    const staleRefresh=f.store.getState().refreshProfile();await tick();
    f.event('SIGNED_IN','B');await tick();f.resolve('B');await tick();
    f.reject('A');
    assert.equal(await staleRefresh,null);
    assert.equal(f.store.getState().profile.id,'B');f.cleanup();checks++;
  }
  {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();f.resolve('A');await tick();
    f.event('TOKEN_REFRESHED','A');await tick();
    assert.equal(f.store.getState().user.id,'A');
    assert.equal(f.store.getState().profile.id,'A');
    f.resolve('A');await tick();
    assert.equal(f.store.getState().user.id,'A');f.cleanup();checks++;
  }
  {
    const initial=deferred();const f=fixture({initial:initial.promise});
    f.event('SIGNED_IN','B');await tick();f.resolve('B');await tick();initial.resolve(session('A'));await tick();
    assert.equal(f.store.getState().user.id,'B');f.cleanup();checks++;
  }
  {
    const signedIn=deferred();const f=fixture({signIn:()=>signedIn.promise});await tick();
    const attempt=f.store.getState().signIn('test@example.invalid','synthetic-only');
    const rejected=assert.rejects(attempt,/cancelled/);await f.store.getState().signOut();
    signedIn.resolve({data:{session:session('A'),user:{id:'A'}},error:null});await rejected;
    assert.equal(f.store.getState().user,null);f.cleanup();checks++;
  }
  {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();f.resolve('A',null);await tick();
    assert.equal(f.store.getState().user,null);assert.equal(f.signOuts(),1);f.cleanup();checks++;
  }
  const calls=[];
  const enabledCapabilities={'constants/releaseCapabilities':{TRUSTED_ADULT_INVITATIONS_ENABLED:true,SUPPORT_RECORDING_ENABLED:true}};
  const service=loadTs('src/services/supabase/autismProfileService.ts',{...enabledCapabilities,'./client':{isSupabaseConfigured:true,getSupabaseClient:()=>({
    auth:{getUser:async()=>({data:{user:{id:'child'}},error:null})},
    rpc:async(name)=>{calls.push(name);return {data:null,error:{code:'PGRST202'}};},
  })}});
  await assert.rejects(service.saveTrustedAdultForChild('child',{name:'Test',role:'parent',email:'test@example.invalid',phone:'test'}),/unavailable/);
  assert.deepEqual(calls,['create_trusted_support_invitation_v1']);checks++;
  // A private note and its derived analysis must cause only the private journal write.
  const writes=[];
  const journal=loadTs('src/services/supabase/autismProfileService.ts',{...enabledCapabilities,'./client':{isSupabaseConfigured:true,getSupabaseClient:()=>({
    from:table=>({insert:row=>{writes.push({table,row});return {select:()=>({single:async()=>({data:{id:'entry'},error:null})})};}}),
  })}});
  await journal.saveJournalEntry({childId:'child',emotion:'sad',text:'private words',analysis:{parentInsight:'derived private words',riskLevel:'high'}});
  assert.equal(writes.length,1);assert.equal(writes[0].table,'journal_entries');assert.equal(writes[0].row.is_shared,false);checks++;
  const updates=[];
  const signup=loadTs('src/services/supabase/authService.ts',{
    '@supabase/supabase-js':{AuthError:Error},'constants/routes':{ROUTES:{}},'./sessionUtils':{},
    './client':{getSupabaseClient:()=>({from:()=>({update:row=>{updates.push(row);return {eq:()=>({select:()=>({single:async()=>({data:{id:'child'},error:null})})})};}})})},
  });
  await signup.upsertUserProfile({id:'child',email:'fake@example.invalid',role:'admin',firstName:'Child',lastName:'Test',emailVerified:true});
  for(const field of ['id','email','role','email_verified_at','neuro_types','onboarding_completed'])assert.equal(field in updates[0],false);
  checks++;
  const {ParentDashboardService:dashboard}=loadTs('src/features/parent/services/parentDashboardService.ts',{
    'services/supabase/client':{isSupabaseConfigured:true},
  });
  dashboard.getChildren=async()=>[{childId:'child',childName:'Synthetic Child',neurotypes:[],totalEntries:0,entriesLast7Days:0,totalAlerts:0,highAlerts:0,trustedAdultsCount:0}];
  for(const method of ['getRecentEntriesForChildren','getAlertsForChildren','getMessagesForChildren','getMeetingsForChildren',
    'getGoalsForChildren','getResourcesForChildren','getSignalsForChildren','getParentFeedbackThemes','getTeacherClassRequestsForChildren','getAssignmentSummariesForChildren'])
    dashboard[method]=async()=>[];
  dashboard.getTrustedAdultsForChildren=async()=>{throw {code:'42703',message:'accepted_at missing'};};
  const summary=await dashboard.getDashboardSummary();
  assert.equal(summary.children.length,1);assert.equal(summary.trustedAdultsUnavailable,true);assert.equal(summary.trustedAdults.length,0);checks++;
  const supportCalls=[];
  const supportService=loadTs('src/services/supabase/autismProfileService.ts',{...enabledCapabilities,'./client':{isSupabaseConfigured:true,getSupabaseClient:()=>({
    auth:{getUser:async()=>({data:{user:{id:'child'}},error:null})},
    rpc:async(name,args)=>{supportCalls.push({name,args});return {data:'entry',error:null};},
  })}});
  await supportService.requestTrustedAdultSupport('child','mood-check-in',true,'same-request-id');
  assert.equal(supportCalls.length,1);assert.equal(supportCalls[0].name,'record_trusted_support_request_v1');
  assert.equal(supportCalls[0].args.p_child_id,'child');assert.equal(supportCalls[0].args.p_request_id,'same-request-id');checks++;
  // The enabled candidate still supports a code-level emergency disable before backend access.
  const releaseCapabilities=loadTs('src/constants/releaseCapabilities.ts',{});
  assert.equal(releaseCapabilities.TRUSTED_ADULT_INVITATIONS_ENABLED,true);
  assert.equal(releaseCapabilities.SUPPORT_RECORDING_ENABLED,true);
  let backendAccesses=0;
  const disabled=loadTs('src/services/supabase/autismProfileService.ts',{
    'constants/releaseCapabilities':{...releaseCapabilities,TRUSTED_ADULT_INVITATIONS_ENABLED:false,SUPPORT_RECORDING_ENABLED:false},
    './client':{isSupabaseConfigured:true,getSupabaseClient:()=>{backendAccesses++;throw new Error('Unexpected backend access');}},
  });
  for(const id of ['child','another-child']){
    await assert.rejects(disabled.saveTrustedAdultForChild(id,{name:'Test',role:'parent',email:'test@example.invalid',phone:''}),/unavailable/);
    await assert.rejects(disabled.requestTrustedAdultSupport(id,'mood-check-in',true,'test-request'),/unavailable/);
  }
  await assert.rejects(disabled.fetchTrustedAdultsForChild('child'),/unavailable/);
  await assert.rejects(disabled.saveJournalEntry({childId:'child',emotion:'sad',text:'private',isShared:true}),/Sharing journal entries is unavailable/);
  assert.equal(backendAccesses,0);checks++;
  const moodWrites=[];
  const moodService=loadTs('src/services/supabase/autismProfileService.ts',{
    'constants/releaseCapabilities':{...releaseCapabilities,TRUSTED_ADULT_INVITATIONS_ENABLED:false,SUPPORT_RECORDING_ENABLED:false},
    './client':{isSupabaseConfigured:true,getSupabaseClient:()=>({from:table=>({insert:async row=>{moodWrites.push({table,row});return {error:null};}})})},
  });
  await moodService.saveMoodCheckIn('child','sad',' private mood ','private response');
  assert.equal(moodWrites.length,1);assert.equal(moodWrites[0].table,'mood_check_ins');
  assert.equal(moodWrites[0].row.is_shared,false);assert.equal(moodWrites[0].row.note,'private mood');checks++;
  // A refocus/token refresh for the same account must recheck the profile without
  // dropping authenticated routes and destroying an unsaved assignment draft.
  for (const event of ['SIGNED_IN', 'TOKEN_REFRESHED']) {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();
    f.resolve('A',{id:'A',role:'teacher',status:'active',is_authorized:true});await tick();
    const cacheClears=f.cacheClears();
    const states=[];const unsubscribe=f.store.subscribe(state=>states.push(state));
    f.event(event,'A');await tick();
    assert.equal(f.store.getState().user?.id,'A',`${event} must preserve the verified account while rechecking`);
    assert.equal(f.store.getState().loading,false);
    f.resolve('A',{id:'A',role:'teacher',status:'active',is_authorized:true});await tick();
    assert.ok(states.every(state=>state.user?.id==='A' && state.profile?.id==='A' && !state.loading));
    assert.deepEqual(f.cacheClears(),cacheClears);
    unsubscribe();f.cleanup();checks++;
  }
  // Failed or mismatched background verification must still close the session.
  for (const profile of [null,{id:'B',role:'teacher'}]) {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();f.resolve('A');await tick();
    f.event('TOKEN_REFRESHED','A');await tick();f.resolve('A',profile);await tick();
    assert.equal(f.store.getState().user,null);assert.equal(f.store.getState().profile,null);
    assert.equal(f.signOuts(),1);f.cleanup();checks++;
  }
  // A pending refresh must never restore the account after logout or guest entry.
  for (const end of ['event','action','guest','cleanup']) {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();f.resolve('A');await tick();
    f.event('TOKEN_REFRESHED','A');await tick();
    if(end==='event')f.event('SIGNED_OUT');
    if(end==='action')await f.store.getState().signOut();
    if(end==='guest')await f.store.getState().setGuestMode();
    if(end==='cleanup')f.cleanup();
    const stateAtEnd=f.store.getState();
    f.resolve('A');await tick();
    if(end==='cleanup')assert.equal(f.store.getState(),stateAtEnd);
    else assert.equal(f.store.getState().user,null);
    assert.equal(f.store.getState().isGuest,end==='guest');f.cleanup();checks++;
  }
  // Revalidation still applies changed roles/status; it cannot retain old access.
  for (const profile of [{id:'A',role:'child',status:'active',is_authorized:true},{id:'A',role:'teacher',status:'suspended',is_authorized:false}]) {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();
    f.resolve('A',{id:'A',role:'teacher',status:'active',is_authorized:true});await tick();
    const cacheClears=f.cacheClears();
    f.event('SIGNED_IN','A');await tick();f.resolve('A',profile);await tick();
    assert.equal(f.store.getState().profile.role,profile.role);
    assert.equal(f.store.getState().profile.status,profile.status);
    assert.equal(f.store.getState().profile.is_authorized,profile.is_authorized);
    assert.deepEqual(f.cacheClears(),cacheClears.map(count=>count+1));f.cleanup();checks++;
  }
  {
    const f=fixture();await tick();f.event('SIGNED_IN','A');await tick();f.resolve('A');await tick();
    f.event('TOKEN_REFRESHED','A');await tick();f.event('SIGNED_IN','B');await tick();
    assert.equal(f.store.getState().user,null);
    f.resolve('B');await tick();f.resolve('A');await tick();
    assert.equal(f.store.getState().user.id,'B');assert.equal(f.store.getState().profile.id,'B');
    assert.equal(f.signOuts(),0);f.cleanup();checks++;
  }
  console.log(`Auth and privacy boundaries: ${checks} runtime checks passed.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
