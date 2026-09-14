import { readTeacherReportTaskSource } from './teacherReportTaskSource';
import { TeacherDashboardService } from './teacherDashboardService';

const T='10000000-0000-4000-8000-000000000001'; const C='20000000-0000-4000-8000-000000000001';
const A='30000000-0000-4000-8000-000000000001'; const K='40000000-0000-4000-8000-000000000001'; const OTHER='90000000-0000-4000-8000-000000000001';
let mockConfigured=true; let mockActor: any; let mockAuth: any; let mockResults: Record<string, any>;
const mockCalls: Array<{table:string;method:string;args:unknown[]}> = [];
const mockFrom = (table:string) => {
  const q:any={ then:(resolve:any,reject:any)=>Promise.resolve(mockResults[table] ?? {data:[],count:0,error:null}).then(resolve,reject) };
  for(const method of ['select','eq','in','is','order','limit']) q[method]=(...args:unknown[])=>{mockCalls.push({table,method,args});return q;};
  q.maybeSingle=()=>Promise.resolve({data:mockActor,error:null}); return q;
};
const mockClient = { auth:{getUser:jest.fn()}, from:jest.fn(mockFrom) };
jest.mock('services/supabase/client',()=>({ get isSupabaseConfigured(){ return mockConfigured; },getSupabaseClient:()=>mockClient }));
const result=(data:unknown[])=>({data,count:data.length,error:null});
beforeEach(()=>{
  mockConfigured=true;mockCalls.length=0;mockClient.from.mockImplementation(mockFrom);mockClient.auth.getUser.mockImplementation(()=>Promise.resolve(mockAuth));
  mockAuth={data:{user:{id:T,email_confirmed_at:'2026-09-01T00:00:00Z'}},error:null};
  mockActor={id:T,role:'teacher',status:'active',is_authorized:true};
  mockResults={
    teacher_classes:result([{id:C,teacher_id:T,class_name:'Test class',class_code:'TEST',school_name:null,subject:null,year_group:null,created_at:'2026-09-01T00:00:00Z'}]),
    class_memberships:result([{id:'50000000-0000-4000-8000-000000000001',class_id:C,child_id:K,teacher_id:T,status:'active',visibility_settings:{academicTasks:true,childName:true},joined_at:'2026-09-01T00:00:00Z'}]),
    teacher_assignments:result([{id:A,class_id:C,teacher_id:T,title:'Test task',description:null,assignment_type:'reading',support_tools:['read_aloud'],due_at:null,created_at:'2026-09-01T00:00:00Z',updated_at:null,archived_at:null}]),
    assignment_submissions:result([{assignment_id:A,child_id:K,status:'needs_help',support_used:[],mood_after_task:null,submitted_at:null,updated_at:'2026-09-13T09:00:00Z'}]),
    profiles:result([{id:K,full_name:'Synthetic child',first_name:'Test',child_name:null,buddy_id:null,neuro_types:[],age:null}]),
  };
});
test('reads confirmed teacher-owned task source using only narrow columns and explicit scopes',async()=>{
  const data=await readTeacherReportTaskSource(T); expect(data.submissions[0].status).toBe('needs_help');
  expect(mockCalls).toEqual(expect.arrayContaining([
    {table:'teacher_classes',method:'eq',args:['teacher_id',T]},
    {table:'class_memberships',method:'eq',args:['status','active']},
    {table:'teacher_assignments',method:'is',args:['archived_at',null]},
    {table:'assignment_submissions',method:'in',args:['assignment_id',[A]]},
    {table:'assignment_submissions',method:'in',args:['child_id',[K]]},
  ]));
  const tables=mockClient.from.mock.calls.map(c=>c[0]);expect(tables).not.toContain('journal_entries');expect(tables).not.toContain('support_contacts');
});
test('only an explicit guest request invokes the existing fictional summary',async()=>{
  const data=await TeacherDashboardService.getDashboardSummary({guest:true});
  expect(data.classes[0].id).toBe('guest-class');expect(mockClient.from).not.toHaveBeenCalled();
});
test('the actual dashboard report path uses the strict source and preserves no-row evidence',async()=>{
  mockResults.assignment_submissions=result([]);
  const data=await TeacherDashboardService.getDashboardSummary({reportOwnerId:T});
  expect(data.assignments[0].learnerProgress[0]).toEqual(expect.objectContaining({hasRecordedUpdate:false,supportUsed:[]}));
  expect(mockClient.auth.getUser).toHaveBeenCalledTimes(1);
});
test('actual service maps returned status and excludes hidden task feelings',async()=>{
  mockResults.assignment_submissions.data[0].mood_after_task='hard';
  const data=await TeacherDashboardService.getDashboardSummary({reportOwnerId:T});
  expect(data.assignments[0].learnerProgress[0]).toEqual(expect.objectContaining({hasRecordedUpdate:true,status:'needs_help',supportUsed:[]}));
  expect(data.assignments[0].learnerProgress[0].moodAfterTask).toBeUndefined();
});
test('missing configuration never supplies demo data to the real Reports caller',async()=>{
  mockConfigured=false;await expect(TeacherDashboardService.getDashboardSummary({reportOwnerId:T})).rejects.toThrow('unavailable');
  expect(mockClient.from).not.toHaveBeenCalled();
});
test.each(['guest-teacher','', 'not-a-uuid'])('rejects invalid real identity %s',async value=>{await expect(readTeacherReportTaskSource(value)).rejects.toThrow();expect(mockClient.from).not.toHaveBeenCalled();});
test.each(['wrong-user','unconfirmed','auth-error'])('rejects %s before class reads',async kind=>{
  if(kind==='wrong-user')mockAuth.data.user.id=OTHER;
  if(kind==='unconfirmed')mockAuth.data.user.email_confirmed_at=null;
  if(kind==='auth-error')mockAuth.error={message:'private backend error'};
  await expect(readTeacherReportTaskSource(T)).rejects.toThrow('unavailable');expect(mockClient.from).not.toHaveBeenCalled();
});
test.each([{role:'parent'},{status:'suspended'},{is_authorized:false},{id:OTHER}])('rejects non-authoritative profile %j',async patch=>{
  Object.assign(mockActor,patch);await expect(readTeacherReportTaskSource(T)).rejects.toThrow();
  expect(mockClient.from).toHaveBeenCalledTimes(1);
});
test('allows an active administrator only for their own classes',async()=>{mockActor.role='admin';await readTeacherReportTaskSource(T);expect(mockCalls).toContainEqual({table:'teacher_classes',method:'eq',args:['teacher_id',T]});});
test('verified empty class list avoids unnecessary school reads',async()=>{
  mockResults.teacher_classes=result([]);const data=await readTeacherReportTaskSource(T);expect(data.classes).toEqual([]);
  expect(mockClient.from.mock.calls.map(c=>c[0])).toEqual(['profiles','teacher_classes']);
});
test.each(['teacher_classes','class_memberships','teacher_assignments','assignment_submissions'])('%s null data is unavailable, not empty',async table=>{mockResults[table]={data:null,count:0,error:null};await expect(readTeacherReportTaskSource(T)).rejects.toThrow();});
test.each(['teacher_classes','class_memberships','teacher_assignments','assignment_submissions'])('%s truncated data cannot masquerade as complete',async table=>{mockResults[table].count=2;await expect(readTeacherReportTaskSource(T)).rejects.toThrow();});
test.each(['teacher_classes','class_memberships','teacher_assignments','assignment_submissions'])('%s duplicates are rejected rather than silently collapsed',async table=>{mockResults[table]=result([...mockResults[table].data,...mockResults[table].data]);await expect(readTeacherReportTaskSource(T)).rejects.toThrow();});
test.each([
  ['teacher_classes','teacher_id',OTHER],['class_memberships','class_id',OTHER],['class_memberships','status','paused'],
  ['teacher_assignments','class_id',OTHER],['teacher_assignments','teacher_id',OTHER],['teacher_assignments','archived_at','2026-09-12T00:00:00Z'],
  ['teacher_assignments','assignment_type','invented'],['assignment_submissions','child_id',OTHER],['assignment_submissions','status','invented'],
  ['assignment_submissions','support_used','read_aloud'],['assignment_submissions','updated_at','yesterday'],
] as const)('rejects %s %s=%s',async(table,field,value)=>{mockResults[table].data[0][field]=value;await expect(readTeacherReportTaskSource(T)).rejects.toThrow();});
test('missing archive column fails without falling back to potentially archived tasks',async()=>{
  mockResults.teacher_assignments={data:null,count:null,error:{message:'archived_at does not exist'}};
  await expect(readTeacherReportTaskSource(T)).rejects.toThrow('unavailable');
  expect(mockClient.from.mock.calls.filter(c=>c[0]==='teacher_assignments')).toHaveLength(1);
});
test('support-only/academically hidden memberships never trigger a submission read',async()=>{
  mockResults.class_memberships.data[0].visibility_settings.academicTasks=false;
  const data=await readTeacherReportTaskSource(T);expect(data.submissions).toEqual([]);expect(mockClient.from.mock.calls.map(c=>c[0])).not.toContain('assignment_submissions');
});
test('membership in another class is not sufficient for a returned task-child pair',async()=>{
  const c2={...mockResults.teacher_classes.data[0],id:OTHER};mockResults.teacher_classes=result([...mockResults.teacher_classes.data,c2]);
  mockResults.class_memberships.data[0].class_id=OTHER;
  await expect(readTeacherReportTaskSource(T)).rejects.toThrow('unavailable');
});
test('count metadata must be present to call the snapshot complete',async()=>{mockResults.teacher_classes.count=null;await expect(readTeacherReportTaskSource(T)).rejects.toThrow();});
