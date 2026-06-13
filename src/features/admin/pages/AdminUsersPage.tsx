import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import AdminLayout from 'features/admin/components/AdminLayout';
import UserFormModal, { type UserFormValues } from 'features/admin/components/UserFormModal';
import type { Profile, UserRole } from 'services/supabase/client';
import {
  adminCreateUser,
  adminDeleteUser,
  adminResetUserPassword,
  adminUpdateUser,
  fetchAllUsers,
  type AdminCreateUserPayload,
} from 'services/supabase/adminService';
import { formatUkGender, formatUkSex } from 'constants/signup';
import { useAuth } from 'hooks/useAuth';

const ROLE_BADGE: Record<UserRole, string> = {
  child: 'bg-cyan-500/15 text-cyan-300',
  parent: 'bg-violet-500/15 text-violet-300',
  teacher: 'bg-emerald-500/15 text-emerald-300',
  admin: 'bg-amber-500/15 text-amber-300',
};

const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q) ||
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const openCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    setModalError('');
    setModalOpen(true);
  };

  const openEdit = (profile: Profile) => {
    setModalMode('edit');
    setSelectedUser(profile);
    setModalError('');
    setModalOpen(true);
  };

  const handleCreate = async (payload: AdminCreateUserPayload) => {
    setModalLoading(true);
    setModalError('');
    try {
      await adminCreateUser(payload);
      setModalOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdate = async (values: UserFormValues) => {
    if (!selectedUser) return;
    setModalLoading(true);
    setModalError('');
    try {
      await adminUpdateUser({
        id: selectedUser.id,
        role: values.role,
        firstName: values.firstName,
        lastName: values.lastName,
        sex: values.sex || null,
        gender: values.gender || null,
        age: values.age ? Number(values.age) : null,
        childName: values.childName || null,
        isAuthorized: values.isAuthorized,
        status: values.status,
      });
      setModalOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setModalLoading(false);
    }
  };

  const handleResetPassword = async (password: string) => {
    if (!selectedUser) return;
    setModalLoading(true);
    setModalError('');
    try {
      await adminResetUserPassword(selectedUser.id, password);
      setModalError('');
      alert('Password updated successfully.');
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await adminDeleteUser(userId);
      setDeleteConfirmId(null);
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const toggleAuthorize = async (profile: Profile) => {
    try {
      await adminUpdateUser({
        id: profile.id,
        isAuthorized: profile.is_authorized === false,
        status: profile.is_authorized === false ? 'active' : profile.status,
      });
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update authorization');
    }
  };

  return (
    <AdminLayout title="User management">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-gray-100 outline-none focus:border-indigo-500/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-gray-200"
          >
            <option value="all">All roles</option>
            <option value="child">Child</option>
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create user
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Sex</th>
                <th className="px-4 py-3 font-semibold">Gender</th>
                <th className="px-4 py-3 font-semibold">Age</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Auth</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    Loading users…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b border-white/5 transition hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-100">
                        {profile.full_name || '—'}
                      </p>
                      <p className="text-xs text-gray-500">{profile.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${ROLE_BADGE[profile.role]}`}
                      >
                        {profile.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatUkSex(profile.sex)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {formatUkGender(profile.gender)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{profile.age ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-400">
                      {profile.status ?? 'active'}
                    </td>
                    <td className="px-4 py-3">
                      {profile.is_authorized !== false ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-red-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(profile)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleAuthorize(profile)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-amber-500/10 hover:text-amber-300"
                          title={profile.is_authorized !== false ? 'Revoke access' : 'Authorize'}
                        >
                          <ShieldOff className="h-4 w-4" />
                        </button>
                        {profile.id !== currentUser?.id &&
                          (deleteConfirmId === profile.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleDelete(profile.id)}
                                className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded-lg px-2 py-1 text-xs text-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(profile.id)}
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {filtered.length} of {users.length} users shown · Create admin accounts from the Create
        user dialog (role: admin)
      </p>

      {modalOpen && (
        <UserFormModal
          mode={modalMode}
          user={selectedUser}
          loading={modalLoading}
          error={modalError}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onResetPassword={modalMode === 'edit' ? handleResetPassword : undefined}
        />
      )}
    </AdminLayout>
  );
};

export default AdminUsersPage;
