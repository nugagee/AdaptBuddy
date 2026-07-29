import { getSupabaseClient, isSupabaseConfigured } from 'services/supabase/client';

export interface ChildClassroom {
  id: string;
  className: string;
  schoolName: string;
  subject: string;
  yearGroup: string;
  classCode: string;
  status: 'active' | 'pending' | 'pending_parent' | 'pending_teacher';
  teacherName: string;
  connectedAt: string;
}

interface ClassMembershipRow {
  class_id: string;
  joined_at: string;
  status: string | null;
}

interface TeacherClassRow {
  id: string;
  teacher_id?: string | null;
  class_name: string;
  school_name: string | null;
  subject: string | null;
  year_group: string | null;
  class_code: string | null;
}

interface ClassroomDashboardRow {
  class_id: string;
  class_name: string;
  school_name: string | null;
  subject: string | null;
  year_group: string | null;
  class_code: string | null;
  teacher_name: string | null;
  status: string | null;
  connected_at: string;
}

const mapClassroom = (
  classroom: TeacherClassRow,
  membership?: ClassMembershipRow,
): ChildClassroom => ({
  id: classroom.id,
  className: classroom.class_name,
  schoolName: classroom.school_name ?? '',
  subject: classroom.subject ?? 'General',
  yearGroup: classroom.year_group ?? '',
  classCode: classroom.class_code ?? '',
  status: 'active',
  teacherName: 'Teacher',
  connectedAt: membership?.joined_at ?? new Date().toISOString(),
});

export class ChildClassroomService {
  static async getClassrooms(childId: string): Promise<ChildClassroom[]> {
    if (!isSupabaseConfigured || !childId || childId === 'guest-child') return [];

    const client = getSupabaseClient();

    const { data: dashboardData, error: dashboardError } = await client.rpc('child_classroom_dashboard', {
      p_child_id: childId,
    });

    if (!dashboardError) {
      return ((dashboardData ?? []) as ClassroomDashboardRow[]).map((row) => ({
        id: row.class_id,
        className: row.class_name,
        schoolName: row.school_name ?? '',
        subject: row.subject ?? 'General',
        yearGroup: row.year_group ?? '',
        classCode: row.class_code ?? '',
        status: normalizeClassroomStatus(row.status),
        teacherName: row.teacher_name ?? 'Teacher',
        connectedAt: row.connected_at,
      }));
    }

    const { data: membershipData, error: membershipError } = await client
      .from('class_memberships')
      .select('class_id, joined_at, status')
      .eq('child_id', childId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false });

    if (membershipError) throw membershipError;

    const memberships = (membershipData ?? []) as ClassMembershipRow[];
    const classIds = Array.from(new Set(memberships.map((membership) => membership.class_id)));
    if (classIds.length === 0) return [];

    const { data: classData, error: classError } = await client
      .from('teacher_classes')
      .select('id, class_name, school_name, subject, year_group, class_code')
      .in('id', classIds);

    if (classError) throw classError;

    const membershipByClassId = new Map(
      memberships.map((membership) => [membership.class_id, membership]),
    );

    return ((classData ?? []) as TeacherClassRow[])
      .map((classroom) => mapClassroom(classroom, membershipByClassId.get(classroom.id)))
      .sort((left, right) => new Date(right.connectedAt).getTime() - new Date(left.connectedAt).getTime());
  }
}

const normalizeClassroomStatus = (value: string | null | undefined): ChildClassroom['status'] => {
  if (value === 'active' || value === 'pending' || value === 'pending_parent' || value === 'pending_teacher') {
    return value;
  }
  return 'pending';
};
