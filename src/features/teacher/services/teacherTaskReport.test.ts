import { buildTeacherTaskCsv, escapeTeacherCsv, mostRecordedSupport, recordedSupports, taskRecordTotals, taskStatusLabel } from './teacherTaskReport';
import { teacherLearner, teacherTask } from 'testUtils/teacherReportFixtures';

test('counts returned statuses, not legacy counters or suggestions', () => {
  const totals = taskRecordTotals([teacherTask({ learnerProgress: [teacherLearner(), teacherLearner({childId:'b', status:'needs_help'}), teacherLearner({childId:'c', hasRecordedUpdate:false, status:'not_started'})] })]);
  expect(totals).toEqual({ visiblePairs:3, recorded:2, unreturned:1, completed:1, needsHelp:1, inProgress:0, completionRate:33 });
});
test('an empty denominator has no invented zero-percent assessment', () => {
  expect(taskRecordTotals([]).completionRate).toBeNull();
  expect(taskRecordTotals([teacherTask({learnerProgress:[]})]).visiblePairs).toBe(0);
});
test('unreturned is different from a returned not-started record', () => {
  expect(taskStatusLabel(teacherLearner({hasRecordedUpdate:false,status:'not_started'}))).toBe('No status returned');
  expect(taskStatusLabel(teacherLearner({status:'not_started'}))).toBe('Not Started (recorded)');
});
test('completed and submitted both count as recorded statuses without a mastery claim', () => {
  const totals=taskRecordTotals([teacherTask({learnerProgress:[teacherLearner(),teacherLearner({childId:'b',status:'submitted'})]})]);
  expect(totals.completed).toBe(2); expect(totals.completionRate).toBe(100);
});
test('suggested read aloud is never substituted for missing recorded use', () => {
  expect(mostRecordedSupport([teacherTask()])).toBe('No support use returned');
  expect(mostRecordedSupport([teacherTask()], 'child-a')).toBe('No support use returned');
});
test('recorded support is deduplicated per record and scoped to the learner', () => {
  const tasks=[teacherTask({learnerProgress:[teacherLearner({supportUsed:['line_focus','line_focus']}),teacherLearner({childId:'b',supportUsed:['read_aloud']})]})];
  expect(recordedSupports(tasks[0].learnerProgress[0])).toEqual(['line_focus']);
  expect(mostRecordedSupport(tasks,'b')).toBe('Read Aloud');
});
test('no-return records cannot supply use or optional feeling evidence', () => {
  const row=teacherLearner({hasRecordedUpdate:false,supportUsed:['invented'],moodAfterTask:'happy'});
  expect(recordedSupports(row)).toEqual([]);
  const csv=buildTeacherTaskCsv('class','all','now',[teacherTask({learnerProgress:[row]})]);
  expect(csv).not.toContain('invented'); expect(csv).not.toContain('happy'); expect(csv).toContain('No status returned');
});
test('CSV separates suggestions and recorded use and never invents a learner or update timestamp', () => {
  const csv=buildTeacherTaskCsv('class','all','loaded',[teacherTask({learnerProgress:[]})]);
  expect(csv).toContain('"Suggested tools","Recorded support use"');
  expect(csv).toContain('No eligible learner rows returned'); expect(csv).toContain('Not applicable');
  expect(csv).not.toContain('not_started'); expect(csv).not.toContain('2026-09-13T08:00:00Z');
});
test('CSV retains bounded snapshot semantics and optional demo label', () => {
  const csv=buildTeacherTaskCsv('class','all','loaded',[teacherTask()],true);
  expect(csv).toContain('DEMO'); expect(csv).toContain('not teacher assessment or proof of mastery');
  expect(csv).toContain('not complete school history'); expect(csv).toContain('does not confirm');
});
test.each(['=1+1','+SUM(A1)','-2+3','@SUM(A1)','  =1','\t=1','\r=1','\n@a'])('CSV neutralises formula-leading text: %s', value => {
  expect(escapeTeacherCsv(value).startsWith('"\'')).toBe(true);
});
test('CSV quotes commas, newlines and quotes and leaves ordinary text intact', () => {
  expect(escapeTeacherCsv('A, "quoted" item')).toBe('"A, ""quoted"" item"');
  expect(escapeTeacherCsv('two\nlines')).toBe('"two\nlines"'); expect(escapeTeacherCsv(null)).toBe('""');
});
