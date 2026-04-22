'use client';
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';

export default function TalkgroupsPage() {
  const [talkgroups, setTalkgroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTg, setSelectedTg] = useState<string>('');

  const [formData, setFormData] = useState({ name: '', mumble_server_address: '', server_port: '64738' });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Edit Modal State ────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    mumble_channel_name: '',
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [channelNameChanged, setChannelNameChanged] = useState(false);

  // ── Delete Modal State ──────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Pagination State ────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchTalkgroups = async () => {
    try {
      const res = await api.get('/talkgroups');
      setTalkgroups(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };

  useEffect(() => {
    fetchTalkgroups();
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setIsCreating(true);
    try {
      await api.post('/talkgroups', formData);
      setIsModalOpen(false);
      setFormData({ name: '', mumble_server_address: '', server_port: '64738' });
      fetchTalkgroups();
    } catch (e: any) {
      const status = e.response?.status;
      const msg = e.response?.data?.message || '';

      // 409 = sudah terbuat di attempt sebelumnya (ICE timeout race)
      if (status === 409) {
        setIsModalOpen(false);
        setFormData({ name: '', mumble_server_address: '', server_port: '64738' });
        fetchTalkgroups();
        return;
      }

      alert(msg || 'Failed to create Talkgroup');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Open Edit Modal ─────────────────────────────────────
  const openEditModal = (talkgroup: any) => {
    setEditTarget(talkgroup);
    setEditFormData({
      name: talkgroup.name,
      mumble_channel_name: talkgroup.mumbleChannelName || talkgroup.mumble_channel_name || '',
    });
    setChannelNameChanged(false);
    setIsEditModalOpen(true);
  };

  const resetEditModal = () => {
    setIsEditModalOpen(false);
    setEditTarget(null);
    setEditFormData({ name: '', mumble_channel_name: '' });
    setChannelNameChanged(false);
    setIsEditSubmitting(false);
  };

  // ── Submit Edit ─────────────────────────────────────────
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setIsEditSubmitting(true);
    try {
      await api.put(`/talkgroups/${editTarget.id}`, {
        name: editFormData.name,
        mumble_channel_name: editFormData.mumble_channel_name,
      });
      resetEditModal();
      await fetchTalkgroups();
      notify('success', 'Talkgroup berhasil diupdate.');
    } catch (e: any) {
      notify('error', e.response?.data?.message || 'Failed to update talkgroup');
      setIsEditSubmitting(false);
    }
  };

  // ── Delete Talkgroup ────────────────────────────────────
  const openDeleteModal = (talkgroup: any) => {
    setDeleteTarget(talkgroup);
    setIsDeleteModalOpen(true);
  };

  const resetDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
    setIsDeleting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/talkgroups/${deleteTarget.id}`);
      resetDeleteModal();
      const remainingCount = talkgroups.length - 1;
      const newTotalPages = Math.ceil(remainingCount / limit);
      if (page > newTotalPages && newTotalPages > 0) setPage(newTotalPages);
      await fetchTalkgroups();
      notify('success', `Talkgroup "${deleteTarget.name}" berhasil dihapus.`);
    } catch (e: any) {
      notify('error', e.response?.data?.message || 'Failed to delete talkgroup');
      resetDeleteModal();
    }
  };

  // ── Assign Operators ────────────────────────────────────
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const syncedCount = selectedUserIds.size;
    try {
      await api.put(`/talkgroups/${selectedTg}/operators`, {
        userIds: Array.from(selectedUserIds)
      });
      setIsAssignModalOpen(false);
      setSearchQuery('');
      setSelectedUserIds(new Set());
      await fetchTalkgroups();
      notify('success', `${syncedCount} operator(s) synced successfully.`);
    } catch (e: any) {
      setAssignError(e.response?.data?.message || 'Failed to assign operators');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignModal = (id: string) => {
    const talkgroup = talkgroups.find(tg => tg.id === id);
    const existingUserIds = new Set<string>(
      (talkgroup?.users || []).map((u: any) => u.userId)
    );
    setSelectedTg(id);
    setSearchQuery('');
    setSelectedUserIds(existingUserIds);
    setShowDropdown(false);
    setAssignError(null);
    setIsAssignModalOpen(true);
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Pagination Logic ───────────────────────────────────
  const totalPages = Math.ceil(talkgroups.length / limit);
  const paginatedTalkgroups = talkgroups.slice((page - 1) * limit, page * limit);

  const columns = [
    { header: 'TG Name', accessor: 'name' },
    { header: 'Mumble Server', accessor: 'mumbleServerAddress' },
    {
      header: 'Assigned',
      accessor: 'id',
      render: (val: any, row: any) => {
        const count = row.users?.length ?? 0;
        return (
          <span className="bg-slate-800 border border-slate-600 text-blue-400 px-2 py-1 rounded text-xs font-bold">
            {count} Operator
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (id: string, row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="text-xs bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 px-2 py-1 rounded transition-colors border border-amber-600/30 hover:border-amber-500/50"
          >
            EDIT
          </button>
          <button
            onClick={() => openAssignModal(id)}
            className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors border border-slate-600"
          >
            ASSIGN OPERATOR
          </button>
          <button
            onClick={() => openDeleteModal(row)}
            className="text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 px-2 py-1 rounded transition-colors border border-red-600/30 hover:border-red-500/50"
          >
            HAPUS
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-100 tracking-wide">TALKGROUP CONFIGURATION</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm rounded font-medium transition-colors shadow-lg shadow-blue-900/20"
        >
          ALLOCATE TALKGROUP
        </button>
      </div>

      {notification && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${
          notification.type === 'error'
            ? 'bg-red-950/50 border-red-900 text-red-400'
            : 'bg-green-950/50 border-green-900 text-green-400'
        }`}>
          {notification.type === 'error' ? '⚠' : '✓'} {notification.message}
        </div>
      )}

      <div>
        <Table columns={columns} data={paginatedTalkgroups} keyField="id" />

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
      </div>

      {/* ══ CREATE MODAL ══════════════════════════════════ */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="ALLOCATE NEW TALKGROUP">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Talkgroup Name</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          {/* BOX 2: Split Server IP & Port */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 uppercase mb-1">Server IP / Host</label>
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
                value={formData.mumble_server_address}
                onChange={e => setFormData({ ...formData, mumble_server_address: e.target.value })}
                placeholder="127.0.0.1"
                required
              />
            </div>
            <div className="w-1/3">
              <label className="block text-xs text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                Port
                <span className="text-[9px] bg-slate-800 border border-slate-700 px-1 rounded text-slate-500">FIXED</span>
              </label>
              <input
                type="text"
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded px-3 py-2 text-sm text-slate-500 cursor-not-allowed select-none font-mono"
                value={formData.server_port}
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className={`w-full py-2 rounded text-sm font-medium mt-2 transition-colors
              ${isCreating ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {isCreating ? 'INITIALIZING...' : 'INITIALIZE TALKGROUP'}
          </button>
        </form>
      </Modal>

      {/* ══ EDIT MODAL ════════════════════════════════════ */}
      <Modal isOpen={isEditModalOpen} onClose={resetEditModal} title={`EDIT TALKGROUP — ${editTarget?.name ?? ''}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Alias / Name</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500 text-slate-200"
              value={editFormData.name}
              onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Mumble Channel Path</label>
            <input
              type="text"
              className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm focus:outline-none text-slate-200 transition-colors ${
                channelNameChanged
                  ? 'border-amber-500/70 focus:border-amber-400'
                  : 'border-slate-700 focus:border-amber-500'
              }`}
              value={editFormData.mumble_channel_name}
              onChange={e => {
                setEditFormData({ ...editFormData, mumble_channel_name: e.target.value });
                setChannelNameChanged(
                  e.target.value !== (editTarget?.mumbleChannelName || editTarget?.mumble_channel_name || '')
                );
              }}
              required
            />
            {channelNameChanged && (
              <div className="mt-2 px-3 py-2 bg-amber-950/40 border border-amber-700/50 rounded text-xs text-amber-400 flex gap-2">
                <span className="shrink-0">⚠</span>
                <span>
                  Mengubah channel path hanya mengupdate database.
                  Rename di Mumble server akan diimplementasi di Fase 2.
                  Pastikan tidak ada sesi aktif sebelum menyimpan.
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1 flex items-center gap-1.5">
              Server Address
              <span className="normal-case text-slate-600 font-normal text-[10px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                🔒 LOCKED
              </span>
            </label>
            <input
              type="text"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded px-3 py-2 text-sm text-slate-500 cursor-not-allowed select-none"
              value={editTarget?.mumbleServerAddress || editTarget?.mumble_server_address || ''}
              readOnly
              tabIndex={-1}
            />
            <p className="text-[11px] text-slate-600 mt-1">
              Server address tidak dapat diubah. Gunakan delete → provision baru untuk migrasi server.
            </p>
          </div>
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={resetEditModal}
              disabled={isEditSubmitting}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded text-sm font-medium transition-colors border border-slate-600"
            >
              BATAL
            </button>
            <button
              type="submit"
              disabled={isEditSubmitting}
              className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded text-sm font-medium transition-colors shadow-lg shadow-amber-900/20"
            >
              {isEditSubmitting ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ ASSIGN OPERATOR MODAL ═════════════════════════ */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="ASSIGN OPERATOR TO TALKGROUP">
        <form onSubmit={handleAssign} className="space-y-4">
          {selectedUserIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900 border border-slate-700 rounded min-h-[44px]">
              {users
                .filter(u => selectedUserIds.has(u.id))
                .map(u => (
                  <span key={u.id} className="flex items-center gap-1 bg-blue-900/30 border border-blue-700/50 text-blue-300 text-[11px] px-2 py-1 rounded-full">
                    {u.username}
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(selectedUserIds);
                        next.delete(u.id);
                        setSelectedUserIds(next);
                      }}
                      className="hover:text-white hover:bg-blue-500/20 rounded-full w-4 h-4 flex items-center justify-center ml-1 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          )}

          <div className="relative">
            <label className="block text-xs text-slate-400 uppercase mb-1">
              Search Operator
              {selectedUserIds.size > 0 && (
                <span className="text-blue-400 ml-1">({selectedUserIds.size} selected)</span>
              )}
            </label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Type username to search..."
            />
            {showDropdown && searchQuery && (
              <ul className="absolute z-50 w-full bg-slate-800 border border-slate-600 mt-1 max-h-48 overflow-y-auto rounded shadow-xl">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => {
                    const isChecked = selectedUserIds.has(user.id);
                    return (
                      <li
                        key={user.id}
                        onClick={() => {
                          const next = new Set(selectedUserIds);
                          isChecked ? next.delete(user.id) : next.add(user.id);
                          setSelectedUserIds(next);
                        }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors
                          ${isChecked ? 'bg-blue-600/20 text-blue-300' : 'text-slate-300 hover:bg-slate-700'}`}
                      >
                        <input type="checkbox" readOnly checked={isChecked} className="accent-blue-500 pointer-events-none" />
                        <span>{user.username}</span>
                        <span className="text-xs text-slate-500 ml-auto">({user.role})</span>
                      </li>
                    );
                  })
                ) : (
                  <li className="px-3 py-2 text-sm text-slate-500 italic">No username found</li>
                )}
              </ul>
            )}
          </div>

          {assignError && (
            <div className="px-3 py-2 bg-red-950/50 border border-red-900 text-red-400 rounded text-xs">
              ⚠ {assignError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'SYNCING...' : selectedUserIds.size > 0 ? `SYNC ${selectedUserIds.size} OPERATOR(S)` : 'CLEAR ALL OPERATORS'}
          </button>
        </form>
      </Modal>

      {/* ══ DELETE CONFIRMATION MODAL ═════════════════════ */}
      <Modal isOpen={isDeleteModalOpen} onClose={resetDeleteModal} title="KONFIRMASI HAPUS TALKGROUP">
        <div className="space-y-4">
          {/* Warning banner */}
          <div className="flex gap-3 px-3 py-3 bg-red-950/40 border border-red-800/50 rounded">
            <span className="text-red-400 text-lg shrink-0">⚠</span>
            <div className="text-sm text-red-300 leading-relaxed">
              Tindakan ini <span className="font-semibold text-red-200">tidak dapat dibatalkan</span>.
              Channel Murmur akan dihapus dari server dan semua assignment operator akan terputus.
            </div>
          </div>

          {/* Target info */}
          <div className="bg-slate-900 border border-slate-700 rounded px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Talkgroup Name</span>
              <span className="text-slate-100 font-semibold">{deleteTarget?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Mumble Channel</span>
              <span className="font-mono text-xs text-slate-300">{deleteTarget?.mumbleChannelName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Assigned Operators</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                (deleteTarget?.users?.length ?? 0) > 0
                  ? 'bg-amber-900/40 text-amber-400 border border-amber-800/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {deleteTarget?.users?.length ?? 0} operator
              </span>
            </div>
          </div>

          {/* Extra warning jika masih ada operator assigned */}
          {(deleteTarget?.users?.length ?? 0) > 0 && (
            <div className="px-3 py-2 bg-amber-950/30 border border-amber-800/40 rounded text-xs text-amber-400 flex gap-2">
              <span className="shrink-0">ℹ</span>
              <span>Talkgroup ini masih memiliki {deleteTarget.users.length} operator yang akan kehilangan akses channel ini.</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={resetDeleteModal}
              disabled={isDeleting}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded text-sm font-medium transition-colors border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              BATAL
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded text-sm font-medium transition-colors shadow-lg shadow-red-900/30"
            >
              {isDeleting ? 'MENGHAPUS...' : 'YA, HAPUS TALKGROUP'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}