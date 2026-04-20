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
    } catch (e) {
      alert('Failed to create Talkgroup');
    }
  };

  // ── ENTERPRISE GRADE: Bulk Sync Assign ──────────────────
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Mengirim seluruh userIds sekaligus untuk menimpa relasi lama (bulk sync)
      // Ini akan menambah user yang di-check dan otomatis menghapus user yang di-uncheck
      await api.put(`/talkgroups/${selectedTg}/operators`, {
        userIds: Array.from(selectedUserIds)
      });
      
      setIsAssignModalOpen(false);
      setSearchQuery('');
      setSelectedUserIds(new Set());
      fetchTalkgroups();
      alert(`Operator(s) successfully synced to Talkgroup`);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to assign operators');
    }
  };

  const openAssignModal = (id: string) => {
    const talkgroup = talkgroups.find(tg => tg.id === id);
    
    // Pre-populate dari user yang sudah terassign
    const existingUserIds = new Set<string>(
      (talkgroup?.users || []).map((u: any) => u.userId)
    );

    setSelectedTg(id);
    setSearchQuery('');
    setSelectedUserIds(existingUserIds);
    setShowDropdown(false);
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
      header: 'Actions', accessor: 'id', render: (id: string) => (
        <button onClick={() => openAssignModal(id)} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors border border-slate-600">
          ASSIGN OPERATOR
        </button>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-100 tracking-wide">TALKGROUP CONFIGURATION</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm rounded font-medium transition-colors shadow-lg shadow-blue-900/20">
          ALLOCATE TALKGROUP
        </button>
      </div>

      <Table columns={columns} data={talkgroups} keyField="id" />

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="ALLOCATE NEW TALKGROUP">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Alias / Name</label>
            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Mumble Channel Path</label>
            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200" value={formData.mumble_channel_name} onChange={e => setFormData({ ...formData, mumble_channel_name: e.target.value })} placeholder="Root/Channel" required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-1">Server Address</label>
            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200" value={formData.mumble_server_address} onChange={e => setFormData({ ...formData, mumble_server_address: e.target.value })} placeholder="mumble.local:64738" required />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded text-sm font-medium mt-4 shadow-lg shadow-blue-900/20 text-white">
            INITIALIZE TALKGROUP
          </button>
        </form>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="ASSIGN OPERATOR TO TALKGROUP">
        <form onSubmit={handleAssign} className="space-y-4">

          {/* Chips selected users */}
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

          {/* Search input */}
          <div className="relative">
            <label className="block text-xs text-slate-400 uppercase mb-1">
              Search Operator{selectedUserIds.size > 0 && <span className="text-blue-400 ml-1">({selectedUserIds.size} selected)</span>}
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

            {/* Dropdown checkbox */}
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

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            {selectedUserIds.size > 0 ? `SYNC ${selectedUserIds.size} OPERATOR(S)` : 'CLEAR ALL OPERATORS'}
          </button>
        </form>
      </Modal>
    </div>
  );
}