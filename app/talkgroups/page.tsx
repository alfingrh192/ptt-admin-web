'use client';
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import Table from '../../components/Table';
import Modal from '../../components/Modal';

export default function TalkgroupsPage() {
  const [talkgroups, setTalkgroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTg, setSelectedTg] = useState<string>('');

  const [formData, setFormData] = useState({ name: '', mumble_channel_name: '', mumble_server_address: '' });

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
    try {
      await api.post('/talkgroups', formData);
      setIsModalOpen(false);
      setFormData({ name: '', mumble_channel_name: '', mumble_server_address: '' });
      fetchTalkgroups();
      notify('success', 'Talkgroup berhasil dibuat.');
    } catch (e) {
      notify('error', 'Failed to create Talkgroup');
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

  const columns = [
    { header: 'TG Name', accessor: 'name' },
    { header: 'Mumble Channel', accessor: 'mumbleChannelName' },
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

      <Table columns={columns} data={talkgroups} keyField="id" />

      {/* ══ CREATE MODAL ══════════════════════════════════ */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="ALLOCATE NEW TALKGROUP">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Alias / Name</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Mumble Channel Path</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
              value={formData.mumble_channel_name}
              onChange={e => setFormData({ ...formData, mumble_channel_name: e.target.value })}
              placeholder="Root/Channel"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Server Address</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
              value={formData.mumble_server_address}
              onChange={e => setFormData({ ...formData, mumble_server_address: e.target.value })}
              placeholder="mumble.local:64738"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded text-sm font-medium mt-4 shadow-lg shadow-blue-900/20 text-white"
          >
            INITIALIZE TALKGROUP
          </button>
        </form>
      </Modal>

      {/* ══ EDIT MODAL ════════════════════════════════════ */}
      <Modal isOpen={isEditModalOpen} onClose={resetEditModal} title={`EDIT TALKGROUP — ${editTarget?.name ?? ''}`}>
        <form onSubmit={handleEdit} className="space-y-4">

          {/* Name — bebas diedit */}
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

          {/* Mumble Channel Name — editable dengan warning */}
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
            {/* Warning — muncul hanya saat channel name diubah */}
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

          {/* Server Address — read-only / locked */}
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

          {/* Buttons */}
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
    </div>
  );
}