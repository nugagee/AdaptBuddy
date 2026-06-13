import {
  getSupabaseClient,
  normalizeProfile,
  type Profile,
  type UserGender,
  type UserSex,
  type UserRole,
  type UserStatus,
} from './client';

export interface AdminAnalytics {
  total_users: number;
  by_role: Record<string, number>;
  by_sex: Record<string, number>;
  by_gender: Record<string, number>;
  by_status: Record<string, number>;
  authorized: number;
  unauthorized: number;
  onboarding_complete: number;
  avg_age: number | null;
  recent_signups_7d: number;
  recent_signups_30d: number;
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  sex?: UserSex | null;
  gender?: UserGender | null;
  age?: number | null;
  childName?: string | null;
}

export interface AdminUpdateUserPayload {
  id: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  sex?: UserSex | null;
  gender?: UserGender | null;
  age?: number | null;
  childName?: string | null;
  isAuthorized?: boolean;
  status?: UserStatus;
  onboardingCompleted?: boolean;
}

const EMPTY_ANALYTICS: AdminAnalytics = {
  total_users: 0,
  by_role: { child: 0, parent: 0, teacher: 0, admin: 0 },
  by_sex: {
    male: 0,
    female: 0,
    intersex: 0,
    prefer_not_to_say: 0,
    unspecified: 0,
  },
  by_gender: {
    woman: 0,
    man: 0,
    non_binary: 0,
    other: 0,
    prefer_not_to_say: 0,
    unspecified: 0,
  },
  by_status: { active: 0, suspended: 0, pending: 0 },
  authorized: 0,
  unauthorized: 0,
  onboarding_complete: 0,
  avg_age: null,
  recent_signups_7d: 0,
  recent_signups_30d: 0,
};

function normalizeAnalytics(raw: Partial<AdminAnalytics> | null | undefined): AdminAnalytics {
  if (!raw) {
    return {
      ...EMPTY_ANALYTICS,
      by_role: { ...EMPTY_ANALYTICS.by_role },
      by_sex: { ...EMPTY_ANALYTICS.by_sex },
      by_gender: { ...EMPTY_ANALYTICS.by_gender },
      by_status: { ...EMPTY_ANALYTICS.by_status },
    };
  }

  const legacyGender = raw.by_gender as Record<string, number> | undefined;
  const bySex = { ...EMPTY_ANALYTICS.by_sex, ...raw.by_sex };

  // Pre-007 RPC returned sex counts inside by_gender (male/female/intersex)
  if (!raw.by_sex && legacyGender) {
    for (const key of ['male', 'female', 'intersex', 'prefer_not_to_say'] as const) {
      if (legacyGender[key]) bySex[key] = (bySex[key] ?? 0) + legacyGender[key];
    }
    if (legacyGender.unspecified) {
      bySex.unspecified = (bySex.unspecified ?? 0) + legacyGender.unspecified;
    }
  }

  const byGender = { ...EMPTY_ANALYTICS.by_gender, ...raw.by_gender };

  // Map legacy gender keys from pre-007 analytics
  if (legacyGender?.male) byGender.man = (byGender.man ?? 0) + legacyGender.male;
  if (legacyGender?.female) byGender.woman = (byGender.woman ?? 0) + legacyGender.female;
  if (legacyGender?.non_binary) {
    byGender.non_binary = (byGender.non_binary ?? 0) + legacyGender.non_binary;
  }
  if (legacyGender?.other) byGender.other = (byGender.other ?? 0) + legacyGender.other;

  return {
    ...EMPTY_ANALYTICS,
    ...raw,
    by_role: { ...EMPTY_ANALYTICS.by_role, ...raw.by_role },
    by_sex: bySex,
    by_gender: byGender,
    by_status: { ...EMPTY_ANALYTICS.by_status, ...raw.by_status },
  };
}

export async function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  const { data, error } = await getSupabaseClient().rpc('admin_get_analytics');
  if (error) throw error;
  return normalizeAnalytics(data as Partial<AdminAnalytics> | null);
}

export async function fetchAllUsers(): Promise<Profile[]> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Profile[]).map(normalizeProfile);
}

export async function adminCreateUser(payload: AdminCreateUserPayload): Promise<Profile> {
  const { data, error } = await getSupabaseClient().rpc('admin_create_user', {
    p_email: payload.email.trim(),
    p_password: payload.password,
    p_role: payload.role,
    p_first_name: payload.firstName.trim(),
    p_last_name: payload.lastName.trim(),
    p_sex: payload.sex ?? null,
    p_gender: payload.gender ?? null,
    p_age: payload.age ?? null,
    p_child_name: payload.childName?.trim() || null,
  });

  if (error) throw error;

  const createdId = (data as { id?: string })?.id;
  if (!createdId) throw new Error('User created but no ID returned.');

  const { data: profile, error: profileError } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', createdId)
    .single();

  if (profileError) throw profileError;
  return normalizeProfile(profile as Profile);
}

export async function adminUpdateUser(payload: AdminUpdateUserPayload): Promise<Profile> {
  const updates: Record<string, unknown> = {};

  if (payload.role !== undefined) updates.role = payload.role;
  if (payload.firstName !== undefined) updates.first_name = payload.firstName.trim();
  if (payload.lastName !== undefined) updates.last_name = payload.lastName.trim();
  if (payload.sex !== undefined) updates.sex = payload.sex;
  if (payload.gender !== undefined) updates.gender = payload.gender;
  if (payload.age !== undefined) updates.age = payload.age;
  if (payload.childName !== undefined) updates.child_name = payload.childName?.trim() || null;
  if (payload.isAuthorized !== undefined) updates.is_authorized = payload.isAuthorized;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.onboardingCompleted !== undefined) {
    updates.onboarding_completed = payload.onboardingCompleted;
  }

  if (payload.firstName !== undefined || payload.lastName !== undefined) {
    const first = payload.firstName?.trim() ?? '';
    const last = payload.lastName?.trim() ?? '';
    if (first || last) updates.full_name = `${first} ${last}`.trim();
  }

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update(updates)
    .eq('id', payload.id)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeProfile(data as Profile);
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_delete_user', {
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function adminResetUserPassword(userId: string, newPassword: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_reset_user_password', {
    p_user_id: userId,
    p_new_password: newPassword,
  });
  if (error) throw error;
}

/** Client-side analytics fallback when RPC not migrated yet */
export async function computeAnalyticsFromProfiles(users: Profile[]): Promise<AdminAnalytics> {
  const analytics = {
    ...EMPTY_ANALYTICS,
    by_role: { ...EMPTY_ANALYTICS.by_role },
    by_sex: { ...EMPTY_ANALYTICS.by_sex },
    by_gender: { ...EMPTY_ANALYTICS.by_gender },
    by_status: { ...EMPTY_ANALYTICS.by_status },
  };
  analytics.total_users = users.length;

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  let ageSum = 0;
  let ageCount = 0;

  for (const user of users) {
    const role = user.role as keyof typeof analytics.by_role;
    if (role in analytics.by_role) analytics.by_role[role] += 1;

    const sexKey = user.sex ?? 'unspecified';
    if (sexKey in analytics.by_sex) analytics.by_sex[sexKey] += 1;

    const genderKey = user.gender ?? 'unspecified';
    if (genderKey in analytics.by_gender) analytics.by_gender[genderKey] += 1;

    const statusKey = user.status ?? 'active';
    if (statusKey in analytics.by_status) analytics.by_status[statusKey] += 1;

    if (user.is_authorized !== false) analytics.authorized += 1;
    else analytics.unauthorized += 1;

    if (user.onboarding_completed) analytics.onboarding_complete += 1;

    if (user.age != null) {
      ageSum += user.age;
      ageCount += 1;
    }

    const created = new Date(user.created_at).getTime();
    if (now - created <= sevenDays) analytics.recent_signups_7d += 1;
    if (now - created <= thirtyDays) analytics.recent_signups_30d += 1;
  }

  analytics.avg_age = ageCount > 0 ? Math.round((ageSum / ageCount) * 10) / 10 : null;
  return analytics;
}

export async function fetchAdminAnalyticsSafe(): Promise<AdminAnalytics> {
  try {
    return await fetchAdminAnalytics();
  } catch {
    const users = await fetchAllUsers();
    return computeAnalyticsFromProfiles(users);
  }
}
