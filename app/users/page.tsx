'use client';
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Modal from '../../components/Modal';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [talkgroups, setTalkgroups] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // ── Pagination State ───────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // ── Create modal ───────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    talkgroupIds: [] as string[],
    groupIds: [] as string[]
  });
  const [tgSearch, setTgSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  // ── Edit / Revise modal ────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    talkgroupIds: [] as string[],
    groupIds: [] as string[]
  });
  const [editTgSearch, setEditTgSearch] = useState('');
  const [editGroupSearch, setEditGroupSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      const [usersRes, tgRes, groupsRes] = await Promise.all([
        api.get('/users'),
        api.get('/talkgroups'),
        api.get('/groups'),
      ]);
      setUsers(usersRes.data.data || []);
      setTalkgroups(tgRes.data.data || []);
      setGroups(groupsRes.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Reset create modal ─────────────────────────────────
  const resetCreateModal = () => {
    setIsModalOpen(false);
    setFormData({ username: '', password: '', talkgroupIds: [], groupIds: [] });
    setTgSearch('');
    setGroupSearch('');
  };

  // ── Reset edit modal ───────────────────────────────────
  const resetEditModal = () => {
    setIsEditModalOpen(false);
    setEditTarget(null);
    setEditFormData({ username: '', password: '', talkgroupIds: [], groupIds: [] });
    setEditTgSearch('');
    setEditGroupSearch('');
    setIsSubmitting(false);
  };

  // ── Create user ────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        username: formData.username,
        password: formData.password,
        talkgroupIds: formData.talkgroupIds,
      };
      const res = await api.post('/auth/register', payload);
      const newUserId = res.data.data?.id || res.data.id;

      if (formData.groupIds.length > 0 && newUserId) {
        await Promise.all(
          formData.groupIds.map(async (gid) => {
            const group = groups.find((g: any) => g.id === gid);
            const currentMemberIds = (group?.members || []).map((m: any) => m.user?.id).filter(Boolean);
            await api.put(`/groups/${gid}/members`, {
              userIds: [...currentMemberIds, newUserId]
            });
          })
        );
      }

      resetCreateModal();
      fetchAll();
    } catch (e) {
      alert('Failed to create user');
    }
  };

  // ── Open Revise modal ──────────────────────────────────
  const handleRevise = (user: any) => {
    const currentTgIds: string[] = (user.talkgroups || []).map((ut: any) => ut.talkgroupId);
    const currentGroupIds: string[] = (user.groups || []).map((ug: any) => ug.groupId);

    setEditTarget(user);
    setEditFormData({
      username: user.username,
      password: '',
      talkgroupIds: currentTgIds,
      groupIds: currentGroupIds,
    });
    setEditTgSearch('');
    setEditGroupSearch('');
    setIsEditModalOpen(true);
  };

  // ── Submit Revise ──────────────────────────────────────
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setIsSubmitting(true);

    try {
      // Step 1: Update username (dan password jika diisi)
      const userPayload: any = { username: editFormData.username };
      if (editFormData.password.trim()) {
        userPayload.password = editFormData.password;
      }
      await api.put(`/users/${editTarget.id}`, userPayload);

      // Step 2: Sinkronisasi Talkgroups
      // Hitung talkgroup yang ditambah dan yang dihapus
      const oldTgIds: string[] = (editTarget.talkgroups || []).map((ut: any) => ut.talkgroupId);
      const newTgIds = editFormData.talkgroupIds;
      const allAffectedTgIds = [...new Set([...oldTgIds, ...newTgIds])];

      if (allAffectedTgIds.length > 0) {
        for (const tgId of allAffectedTgIds) {
          const res = await api.get(`/talkgroups/${tgId}/users`);
          const currentOperatorIds: string[] = (res.data.data || [])
            .map((u: any) => u.id)
            .filter(Boolean);

          let updatedIds: string[];
          if (newTgIds.includes(tgId)) {
            updatedIds = currentOperatorIds.includes(editTarget.id)
              ? currentOperatorIds
              : [...currentOperatorIds, editTarget.id];
          } else {
            updatedIds = currentOperatorIds.filter((id) => id !== editTarget.id);
          }

          await api.put(`/talkgroups/${tgId}/operators`, { userIds: updatedIds });
        }
      }

      // Step 3: Sinkronisasi Groups
      // Hitung group yang ditambah dan yang dihapus
      const oldGroupIds: string[] = (editTarget.groups || []).map((ug: any) => ug.groupId);
      const newGroupIds = editFormData.groupIds;
      const allAffectedGroupIds = [...new Set([...oldGroupIds, ...newGroupIds])];

      if (allAffectedGroupIds.length > 0) {
        await Promise.all(
          allAffectedGroupIds.map(async (gid) => {
            const group = groups.find((g: any) => g.id === gid);
            const currentMemberIds: string[] = (group?.members || [])
              .map((m: any) => m.user?.id)
              .filter(Boolean);

            let updatedIds: string[];
            if (newGroupIds.includes(gid)) {
              // Tambahkan user ke group ini jika belum ada
              updatedIds = currentMemberIds.includes(editTarget.id)
                ? currentMemberIds
                : [...currentMemberIds, editTarget.id];
            } else {
              // Hapus user dari group ini
              updatedIds = currentMemberIds.filter((id) => id !== editTarget.id);
            }

            await api.put(`/groups/${gid}/members`, { userIds: updatedIds });
          })
        );
      }

      resetEditModal();
      fetchAll();
    } catch (e) {
      alert('Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle Checkboxes (Create) ─────────────────────────
  const toggleTalkgroup = (id: string) => {
    setFormData(prev => ({
      ...prev,
      talkgroupIds: prev.talkgroupIds.includes(id)
        ? prev.talkgroupIds.filter(x => x !== id)
        : [...prev.talkgroupIds, id]
    }));
  };

  const toggleGroup = (id: string) => {
    setFormData(prev => ({
      ...prev,
      groupIds: prev.groupIds.includes(id)
        ? prev.groupIds.filter(x => x !== id)
        : [...prev.groupIds, id]
    }));
  };

  // ── Toggle Checkboxes (Edit) ───────────────────────────
  const toggleEditTalkgroup = (id: string) => {
    setEditFormData(prev => ({
      ...prev,
      talkgroupIds: prev.talkgroupIds.includes(id)
        ? prev.talkgroupIds.filter(x => x !== id)
        : [...prev.talkgroupIds, id]
    }));
  };

  const toggleEditGroup = (id: string) => {
    setEditFormData(prev => ({
      ...prev,
      groupIds: prev.groupIds.includes(id)
        ? prev.groupIds.filter(x => x !== id)
        : [...prev.groupIds, id]
    }));
  };

  // ── Filters (Create) ───────────────────────────────────
  const filteredTgs = tgSearch.length > 0
    ? talkgroups.filter(tg => tg.name.toLowerCase().includes(tgSearch.toLowerCase()))
    : [];

  const filteredGroups = groupSearch.length > 0
    ? groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
    : [];

  // ── Filters (Edit) ─────────────────────────────────────
  const filteredEditTgs = editTgSearch.length > 0
    ? talkgroups.filter(tg => tg.name.toLowerCase().includes(editTgSearch.toLowerCase()))
    : talkgroups; // Edit: tampilkan semua talkgroup (bukan kosong) agar bisa uncheck juga

  const filteredEditGroups = editGroupSearch.length > 0
    ? groups.filter(g => g.name.toLowerCase().includes(editGroupSearch.toLowerCase()))
    : groups; // Edit: tampilkan semua group

  // ── Pagination Logic ───────────────────────────────────
  const totalPages = Math.ceil(users.length / limit);
  const paginatedUsers = users.slice((page - 1) * limit, page * limit);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-100 tracking-wide">USER MANAGEMENT</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm rounded font-medium transition-colors"
        >
          CREATE USER
        </button>
      </div>

      {/* ══ DATA TABLE ════════════════════════════════════ */}
      <div className="overflow-x-auto bg-slate-900 rounded-t border border-slate-700">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-xs uppercase font-medium text-slate-400 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">User ID</th>
              <th className="px-4 py-3 whitespace-nowrap">Username</th>
              <th className="px-4 py-3 whitespace-nowrap">Role</th>
              <th className="px-4 py-3 min-w-[200px]">Assigned Groups</th>
              <th className="px-4 py-3 min-w-[200px]">Assigned Talkgroups</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No users found
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => {
                const assignedGroupIds: string[] = (user.groups || []).map((ug: any) => ug.groupId);
                const assignedGroups = groups.filter(g => assignedGroupIds.includes(g.id));

                const assignedTgIds: string[] = (user.talkgroups || []).map((ut: any) => ut.talkgroupId);
                const assignedTgs = talkgroups.filter(tg => assignedTgIds.includes(tg.id));

                return (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                    {/* User ID */}
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 align-top pt-4">
                      {user.id}
                    </td>

                    {/* Username */}
                    <td className="px-4 py-3 font-medium text-slate-200 align-top pt-4">
                      {user.username}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3 align-top pt-4">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-red-900/50 text-red-400 border border-red-800/50'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Groups */}
                    <td className="px-4 py-3 align-top">
                      {assignedGroups.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 items-center relative">
                          {assignedGroups.slice(0, 3).map((g: any) => (
                            <span key={g.id} className="bg-indigo-900/30 text-indigo-300 border border-indigo-700/50 text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap">
                              {g.name}
                            </span>
                          ))}
                          {assignedGroups.length > 3 && (
                            <div className="relative group cursor-help">
                              <span className="bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap transition-colors">
                                +{assignedGroups.length - 3}
                              </span>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 bg-slate-800 border border-slate-600 shadow-xl shadow-black/50 rounded px-3 py-2 min-w-max">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 border-b border-slate-700 pb-1">Group Lainnya:</p>
                                <div className="flex flex-col gap-1.5">
                                  {assignedGroups.slice(3).map((g: any) => (
                                    <span key={g.id} className="text-xs text-indigo-300 flex items-center gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-indigo-500"></span> {g.name}
                                    </span>
                                  ))}
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-600"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Talkgroups */}
                    <td className="px-4 py-3 align-top">
                      {assignedTgs.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 items-center relative">
                          {assignedTgs.slice(0, 3).map((tg: any) => (
                            <span key={tg.id} className="bg-blue-900/30 text-blue-300 border border-blue-700/50 text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap">
                              {tg.name}
                            </span>
                          ))}
                          {assignedTgs.length > 3 && (
                            <div className="relative group cursor-help">
                              <span className="bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap transition-colors">
                                +{assignedTgs.length - 3}
                              </span>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 bg-slate-800 border border-slate-600 shadow-xl shadow-black/50 rounded px-3 py-2 min-w-max">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 border-b border-slate-700 pb-1">Talkgroup Lainnya:</p>
                                <div className="flex flex-col gap-1.5">
                                  {assignedTgs.slice(3).map((tg: any) => (
                                    <span key={tg.id} className="text-xs text-blue-300 flex items-center gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-blue-500"></span> {tg.name}
                                    </span>
                                  ))}
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-600"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-center align-top pt-3">
                      <button
                        onClick={() => handleRevise(user)}
                        className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 text-xs px-3 py-1.5 rounded transition-colors border border-amber-600/30 hover:border-amber-500/50"
                      >
                        REVISI
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ══ PAGINATION CONTROLS ═══════════════════════════ */}
      <div className="grid grid-cols-3 items-center bg-slate-900 border border-t-0 border-slate-700 rounded-b px-4 py-3">
        {/* Left: Rows per page */}
        <div className="flex items-center space-x-2 text-sm text-slate-400 justify-self-start">
          <span>Show entries:</span>
          <select
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Center: Pagination Navigator */}
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-3 bg-slate-800 border border-slate-700 rounded p-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-slate-300 text-sm rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            >
              &larr; Prev
            </button>
            <div className="px-2 text-sm font-medium text-slate-300 border-x border-slate-700">
              Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages || 1}</span>
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1 text-slate-300 text-sm rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            >
              Next &rarr;
            </button>
          </div>
        </div>

        {/* Right: Empty space */}
        <div className="justify-self-end"></div>
      </div>

      {/* ══ CREATE USER MODAL ═════════════════════════════ */}
      <Modal isOpen={isModalOpen} onClose={resetCreateModal} title="PROVISION NEW OPERATOR">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Username</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Password</label>
            <input
              type="password"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          {/* Assign to Group */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">
              Assign to Group <span className="normal-case text-slate-500">(opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Ketik nama group..."
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:border-indigo-500 text-slate-200"
              value={groupSearch}
              onChange={e => setGroupSearch(e.target.value)}
            />
            {groupSearch.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-1 bg-slate-800/50 rounded border border-slate-800">Ketik untuk mencari group</p>
            ) : filteredGroups.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-1 bg-slate-800/50 rounded border border-slate-800">Group tidak ditemukan</p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded bg-slate-900/50 p-1">
                {filteredGroups.map((g: any) => {
                  const checked = formData.groupIds.includes(g.id);
                  return (
                    <label key={g.id} className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm transition-colors
                      ${checked ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-300 border border-transparent'}`}>
                      <input type="checkbox" className="accent-indigo-500" checked={checked} onChange={() => toggleGroup(g.id)} />
                      {g.name} <span className="text-xs text-slate-500 ml-auto">({g.members?.length ?? 0} members)</span>
                    </label>
                  );
                })}
              </div>
            )}
            {formData.groupIds.length > 0 && (
              <p className="text-xs text-indigo-400 mt-2 font-medium">✓ {formData.groupIds.length} group dipilih</p>
            )}
          </div>

          {/* Assign Talkgroup */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">
              Assign Talkgroup <span className="normal-case text-slate-500">(opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Ketik nama talkgroup..."
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:border-blue-500 text-slate-200"
              value={tgSearch}
              onChange={e => setTgSearch(e.target.value)}
            />
            {tgSearch.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-1 bg-slate-800/50 rounded border border-slate-800">Ketik untuk mencari talkgroup</p>
            ) : filteredTgs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-1 bg-slate-800/50 rounded border border-slate-800">Tidak ditemukan</p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded bg-slate-900/50 p-1">
                {filteredTgs.map((tg: any) => {
                  const checked = formData.talkgroupIds.includes(tg.id);
                  return (
                    <label key={tg.id} className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm transition-colors
                      ${checked ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'hover:bg-slate-800 text-slate-300 border border-transparent'}`}>
                      <input type="checkbox" className="accent-blue-500" checked={checked} onChange={() => toggleTalkgroup(tg.id)} />
                      {tg.name}
                    </label>
                  );
                })}
              </div>
            )}
            {formData.talkgroupIds.length > 0 && (
              <p className="text-xs text-blue-400 mt-2 font-medium">✓ {formData.talkgroupIds.length} talkgroup dipilih</p>
            )}
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
              CREATE USER
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ EDIT / REVISE USER MODAL ══════════════════════ */}
      <Modal isOpen={isEditModalOpen} onClose={resetEditModal} title={`REVISI USER — ${editTarget?.username ?? ''}`}>
        <form onSubmit={handleUpdate} className="space-y-4">

          {/* Username */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Username</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-slate-200"
              value={editFormData.username}
              onChange={e => setEditFormData({ ...editFormData, username: e.target.value })}
              required
            />
          </div>

          {/* Password (opsional) */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">
              Password Baru <span className="normal-case text-slate-500">(kosongkan jika tidak diubah)</span>
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-slate-200 placeholder:text-slate-600"
              value={editFormData.password}
              onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
            />
          </div>

          {/* Edit Group Assignment */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">
              Groups <span className="normal-case text-slate-500">(centang = aktif)</span>
            </label>
            <input
              type="text"
              placeholder="Filter nama group..."
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:border-indigo-500 text-slate-200"
              value={editGroupSearch}
              onChange={e => setEditGroupSearch(e.target.value)}
            />
            {filteredEditGroups.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-1 bg-slate-800/50 rounded border border-slate-800">
                {editGroupSearch ? 'Group tidak ditemukan' : 'Tidak ada group tersedia'}
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded bg-slate-900/50 p-1">
                {filteredEditGroups.map((g: any) => {
                  const checked = editFormData.groupIds.includes(g.id);
                  return (
                    <label key={g.id} className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm transition-colors
                      ${checked ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-300 border border-transparent'}`}>
                      <input type="checkbox" className="accent-indigo-500" checked={checked} onChange={() => toggleEditGroup(g.id)} />
                      {g.name} <span className="text-xs text-slate-500 ml-auto">({g.members?.length ?? 0} members)</span>
                    </label>
                  );
                })}
              </div>
            )}
            {editFormData.groupIds.length > 0 && (
              <p className="text-xs text-indigo-400 mt-2 font-medium">✓ {editFormData.groupIds.length} group dipilih</p>
            )}
          </div>

          {/* Edit Talkgroup Assignment */}
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">
              Talkgroups <span className="normal-case text-slate-500">(centang = aktif)</span>
            </label>
            <input
              type="text"
              placeholder="Filter nama talkgroup..."
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:border-blue-500 text-slate-200"
              value={editTgSearch}
              onChange={e => setEditTgSearch(e.target.value)}
            />
            {filteredEditTgs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-1 bg-slate-800/50 rounded border border-slate-800">
                {editTgSearch ? 'Tidak ditemukan' : 'Tidak ada talkgroup tersedia'}
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded bg-slate-900/50 p-1">
                {filteredEditTgs.map((tg: any) => {
                  const checked = editFormData.talkgroupIds.includes(tg.id);
                  return (
                    <label key={tg.id} className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm transition-colors
                      ${checked ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'hover:bg-slate-800 text-slate-300 border border-transparent'}`}>
                      <input type="checkbox" className="accent-blue-500" checked={checked} onChange={() => toggleEditTalkgroup(tg.id)} />
                      {tg.name}
                    </label>
                  );
                })}
              </div>
            )}
            {editFormData.talkgroupIds.length > 0 && (
              <p className="text-xs text-blue-400 mt-2 font-medium">✓ {editFormData.talkgroupIds.length} talkgroup dipilih</p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={resetEditModal}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded text-sm font-medium transition-colors border border-slate-600"
              disabled={isSubmitting}
            >
              BATAL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded text-sm font-medium transition-colors shadow-lg shadow-amber-900/20"
            >
              {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}