import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { TeacherDashboardService } from '../services/teacherDashboardService';
import { clearTeacherReportScope, prepareTeacherReportScope, teacherLearner, teacherSnapshot, teacherTask } from 'testUtils/teacherReportFixtures';
import { TEACHER_REPORT_TIMEOUT_MS } from '../hooks/useTeacherReportLoad';
import Reports from './Reports';

jest.mock('./TeacherHubNav',()=>()=>null);
jest.mock('components/digest/WeeklyDigestSchedulerPanel',()=>()=>null);
jest.mock('components/support/EvidencePackPanel',()=>()=>null);
jest.mock('../services/teacherDashboardService',()=>({TeacherDashboardService:{getDashboardSummary:jest.fn()}}));
const load=TeacherDashboardService.getDashboardSummary as jest.Mock;
const mount=()=>render(<MemoryRouter><Reports /></MemoryRouter>);
const ready=()=>screen.findByRole('heading',{name:'Class support snapshot'});
const deferred=<T,>()=>{let resolve!:(value:T)=>void;let reject!:(reason:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
let oldCreate:typeof URL.createObjectURL;let oldRevoke:typeof URL.revokeObjectURL;
beforeEach(()=>{
  jest.useFakeTimers();jest.setSystemTime(new Date('2026-09-13T10:00:00Z'));
  prepareTeacherReportScope();load.mockReset();load.mockResolvedValue(teacherSnapshot());
  oldCreate=URL.createObjectURL;oldRevoke=URL.revokeObjectURL;URL.createObjectURL=jest.fn(()=> 'blob:test');URL.revokeObjectURL=jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>undefined);
  jest.spyOn(window,'print').mockImplementation(()=>undefined);
});
afterEach(()=>{cleanup();clearTeacherReportScope();jest.useRealTimers();jest.restoreAllMocks();URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;});

test('actual teacher route requests the strict owner snapshot and gives meaningful record context',async()=>{
  mount();await ready();expect(load).toHaveBeenCalledWith({reportOwnerId:'teacher-a'});
  expect(screen.getByText(/not teacher assessment or proof of mastery/)).toBeInTheDocument();
  expect(screen.getByText(/does not confirm that an adult/)).toBeInTheDocument();
  expect(screen.getAllByText('No support use returned').length).toBeGreaterThan(0);
  expect(screen.queryByText('Most useful support')).not.toBeInTheDocument();
});
test('returned task table shows missing status separately from not-started and used supports',async()=>{
  load.mockResolvedValue(teacherSnapshot({assignments:[teacherTask({learnerProgress:[teacherLearner({hasRecordedUpdate:false,status:'not_started'}),teacherLearner({childId:'b',childName:'Another learner',status:'not_started',supportUsed:['line_focus']})]})]}));
  mount();await ready();expect(screen.getByText(/1 have no status returned/)).toBeInTheDocument();
  expect(screen.getAllByText(/No status returned/).length).toBeGreaterThan(0);
  expect(screen.getByText(/Not Started \(recorded\)/)).toBeInTheDocument();
  expect(screen.getByText(/Recorded support use: Line Focus/)).toBeInTheDocument();
});
test('successful empty data is not a claim of no school history',async()=>{
  load.mockResolvedValue(teacherSnapshot({assignments:[]}));mount();await ready();
  expect(screen.getByText(/No task records returned for this class and date filter/)).toBeInTheDocument();
  expect(screen.getByText('—')).toBeInTheDocument();
  expect(screen.queryByText(/No assignments have been sent/)).not.toBeInTheDocument();
});
test('successful empty classes is explicit and export stays unavailable',async()=>{
  load.mockResolvedValue(teacherSnapshot({classes:[],students:[],assignments:[]}));mount();await ready();
  expect(screen.getByRole('status')).toHaveTextContent('No classes returned');
  expect(screen.getByRole('button',{name:'Export CSV'})).toBeDisabled();
});
test('failed loading shows a redacted retry state without metrics or exports',async()=>{
  load.mockRejectedValue(new Error('private SQL token'));mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('could not load a complete teacher report');
  expect(screen.queryByText(/private SQL/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Export CSV'})).not.toBeInTheDocument();
  expect(screen.queryByText('0%')).not.toBeInTheDocument();
});
test('retry recovers from unavailable without pretending the failed request was empty',async()=>{
  load.mockRejectedValueOnce(new Error('unavailable'));mount();await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button',{name:'Retry teacher reports'}));await ready();expect(load).toHaveBeenCalledTimes(2);
});
test('refresh hides previous records immediately, and a failed refresh leaves them hidden',async()=>{
  const next=deferred<ReturnType<typeof teacherSnapshot>>();load.mockResolvedValueOnce(teacherSnapshot()).mockReturnValueOnce(next.promise);
  mount();await ready();fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
  expect(screen.queryByRole('heading',{name:'Synthetic learner'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Export CSV'})).not.toBeInTheDocument();
  await act(async()=>next.reject(new Error('offline')));expect(await screen.findByRole('alert')).toBeInTheDocument();
});
test('one load is active at a time even with repeated refresh on an old button reference',async()=>{
  load.mockResolvedValueOnce(teacherSnapshot()).mockReturnValueOnce(new Promise(()=>{}));mount();await ready();
  const button=screen.getByRole('button',{name:'Refresh'});fireEvent.click(button);fireEvent.click(button);
  expect(load).toHaveBeenCalledTimes(2);
});
test('a timed-out response cannot replace a successful retry',async()=>{
  const old=deferred<ReturnType<typeof teacherSnapshot>>();load.mockReturnValueOnce(old.promise).mockResolvedValueOnce(teacherSnapshot());
  mount();await act(async()=>{jest.advanceTimersByTime(TEACHER_REPORT_TIMEOUT_MS+1);});await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button',{name:'Retry teacher reports'}));await ready();
  await act(async()=>old.resolve(teacherSnapshot({assignments:[teacherTask({title:'STALE task'})]})));
  expect(screen.queryByText('STALE task')).not.toBeInTheDocument();
});
test('account switch clears earlier report and ignores a delayed original response',async()=>{
  const old=deferred<ReturnType<typeof teacherSnapshot>>();load.mockReturnValueOnce(old.promise).mockResolvedValueOnce(teacherSnapshot({assignments:[]}));
  mount();act(()=>prepareTeacherReportScope('teacher-b'));await ready();
  expect(load).toHaveBeenLastCalledWith({reportOwnerId:'teacher-b'});
  await act(async()=>old.resolve(teacherSnapshot({assignments:[teacherTask({title:'Private old task'})]})));
  expect(screen.queryByText('Private old task')).not.toBeInTheDocument();
});
test.each(['status','role','authorisation'] as const)('%s invalidation removes all report contents',async kind=>{
  mount();await ready();const profile=useAuthStore.getState().profile!;
  act(()=>useAuthStore.setState({profile:{...profile,...(kind==='status'?{status:'suspended'}:kind==='role'?{role:'parent'}:{is_authorized:false})} as typeof profile}));
  expect(screen.getByRole('status')).toHaveTextContent('authorised teacher session');
  expect(screen.queryByRole('heading',{name:'Class support snapshot'})).not.toBeInTheDocument();
});
test('brief invalid-then-restored authority discards the original request',async()=>{
  const old=deferred<ReturnType<typeof teacherSnapshot>>();load.mockReturnValueOnce(old.promise).mockResolvedValueOnce(teacherSnapshot({assignments:[]}));mount();
  const profile=useAuthStore.getState().profile!;
  act(()=>{useAuthStore.setState({profile:{...profile,is_authorized:false}});useAuthStore.setState({profile});});
  await ready();await act(async()=>old.resolve(teacherSnapshot({assignments:[teacherTask({title:'Expired task'})]})));
  expect(screen.queryByText('Expired task')).not.toBeInTheDocument();expect(load).toHaveBeenCalledTimes(2);
});
test('benign same-account profile refresh retains the current report without a second read',async()=>{
  mount();await ready();act(()=>useAuthStore.setState({profile:{...useAuthStore.getState().profile!,first_name:'Updated'}}));
  expect(load).toHaveBeenCalledTimes(1);expect(screen.getByRole('heading',{name:'Class support snapshot'})).toBeInTheDocument();
});
test('guest reports request only labelled demo data rather than a real account snapshot',async()=>{
  prepareTeacherReportScope('guest-teacher',true);mount();await ready();
  expect(load).toHaveBeenCalledWith({guest:true});expect(screen.getByRole('status')).toHaveTextContent('fictional records');
});
test('wrong-role guests and unsigned accounts cannot load real reports',()=>{
  prepareTeacherReportScope('guest-child',true);useAuthStore.setState({profile:{...useAuthStore.getState().profile!,role:'child'}});
  mount();expect(load).not.toHaveBeenCalled();expect(screen.getByRole('status')).toHaveTextContent('authorised teacher');
});
test('an initially unavailable session can become ready normally',async()=>{
  clearTeacherReportScope();mount();expect(load).not.toHaveBeenCalled();
  act(()=>prepareTeacherReportScope());await ready();expect(load).toHaveBeenCalledTimes(1);
});
test('class switching clears an out-of-scope selected learner',async()=>{
  const data=teacherSnapshot();data.classes.push({...data.classes[0],id:'class-b',className:'Other class'});
  load.mockResolvedValue(data);mount();await ready();
  fireEvent.change(screen.getByRole('combobox',{name:'Select class'}),{target:{value:'class-b'}});
  expect(screen.getByRole('combobox',{name:'Choose learner for support plan'})).toHaveValue('');
  expect(screen.queryByRole('heading',{name:'Synthetic learner'})).not.toBeInTheDocument();
});
test('refresh retains a returned class choice but never a deleted class selection',async()=>{
  const data=teacherSnapshot();data.classes.push({...data.classes[0],id:'class-b',className:'Other class'});
  load.mockResolvedValueOnce(data).mockResolvedValueOnce(teacherSnapshot());mount();await ready();
  fireEvent.change(screen.getByRole('combobox',{name:'Select class'}),{target:{value:'class-b'}});
  fireEvent.click(screen.getByRole('button',{name:'Refresh'}));await ready();
  expect(screen.getByRole('combobox',{name:'Select class'})).toHaveValue('class-a');
});
test('date filter applies to task due/creation dates, not the submission timestamp',async()=>{
  load.mockResolvedValue(teacherSnapshot({assignments:[teacherTask({createdAt:'2026-09-01T00:00:00Z',dueAt:'2026-09-01T12:00:00Z'})]}));
  mount();await ready();expect(screen.getByText(/No task records returned for this class and date filter/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox',{name:'Date range'}),{target:{value:'all'}});
  expect(screen.getByRole('heading',{name:'Read one paragraph'})).toBeInTheDocument();
});
test('CSV export uses the current snapshot and releases its Blob URL',async()=>{
  mount();await ready();fireEvent.click(screen.getByRole('button',{name:'Export CSV'}));
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
});
test('a queued print cannot run after account invalidation',async()=>{
  mount();await ready();fireEvent.click(screen.getByRole('button',{name:'Print'}));
  act(()=>useAuthStore.setState({profile:null}));act(()=>{jest.advanceTimersByTime(1);});expect(window.print).not.toHaveBeenCalled();
});
test('a queued print cannot run after refresh removes its source snapshot',async()=>{
  load.mockResolvedValueOnce(teacherSnapshot()).mockReturnValueOnce(new Promise(()=>{}));mount();await ready();
  fireEvent.click(screen.getByRole('button',{name:'Print'}));fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
  act(()=>{jest.advanceTimersByTime(1);});expect(window.print).not.toHaveBeenCalled();
});
test('unmount cleans up a queued print and delayed data cannot restore a report',async()=>{
  const view=mount();await ready();fireEvent.click(screen.getByRole('button',{name:'Print'}));view.unmount();
  act(()=>{jest.advanceTimersByTime(1);});expect(window.print).not.toHaveBeenCalled();
});
test('a help record stays visible without a sent-alert or received-response claim',async()=>{
  load.mockResolvedValue(teacherSnapshot({assignments:[teacherTask({learnerProgress:[teacherLearner({status:'needs_help'})]})]}));
  mount();await ready();expect(screen.getByText(/Returned help statuses—not a seen receipt/)).toBeInTheDocument();
  expect(screen.queryByText(/alert sent/i)).not.toBeInTheDocument();
});
