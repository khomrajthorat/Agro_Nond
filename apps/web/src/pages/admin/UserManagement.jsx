import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  UserCheck,
  UserX,
  Eye,
  ChevronDown,
  Loader,
  Edit2,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';

const roleFilters = [
  { key: 'all', label: 'All Users' },
  { key: 'farmer', label: 'Farmers' },
  { key: 'trader', label: 'Traders' },
  { key: 'weight', label: 'Weight Staff' },
  { key: 'lilav', label: 'Lilav Staff' },
  { key: 'committee', label: 'Market Committee' }
];

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Modal states
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({ phone: '', role: 'farmer', full_name: '', business_name: '', business_address: '', location: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const queryClient = useQueryClient();

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, roleFilter],
    queryFn: () => api.admin.users.list({
      page,
      limit: 20,
      role: roleFilter !== 'all' ? roleFilter : undefined
    }),
    keepPreviousData: true,
  });

  const users = data?.users || [];
  const totalPages = data?.totalPages || 1;
  const totalUsers = data?.total || 0;

  // Mutations
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => api.admin.users.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      setActionMenuOpen(null);
      toast.success('User role updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update user role');
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Create the user (Basic info)
      const res = await api.admin.users.create(data);
      const createdUser = res.user || res; // Handle if response is { user: ... } or just user object
      const userId = createdUser.id || createdUser._id;

      // 2. Update with profile details if needed (Traders/Farmers)
      // We send the extra fields using the update endpoint which we know handles them (e.g. from TraderManagement)
      if (userId) {
        await api.admin.users.update(userId, {
          business_name: data.business_name,
          business_address: data.business_address,
          location: data.location
        });
      }
      return createdUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      setAddUserModalOpen(false);
      setNewUser({ phone: '', role: 'farmer', full_name: '', business_name: '', business_address: '', location: '' });
      toast.success('User created successfully. They can now login with their phone number.');
    },
    onError: (err) => {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => api.admin.users.update(data.id || data._id, {
      full_name: data.full_name,
      phone: data.phone,
      // Allow updating profile fields in edit mode as well
      business_name: data.business_name,
      business_address: data.business_address,
      location: data.location
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      setEditUserModalOpen(false);
      setEditingUser(null);
      toast.success('User updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update user');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => api.admin.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      toast.success('User deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    }
  });

  const handleCreateUser = (e) => {
    e.preventDefault();
    createUserMutation.mutate(newUser);
  };

  const handleUpdateUser = (e) => {
    e.preventDefault();
    if (editingUser) {
      updateUserMutation.mutate(editingUser);
    }
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id || userToDelete._id);
    }
  };

  const handleRoleChange = (userId, newRole) => {
    updateRoleMutation.mutate({ id: userId, role: newRole });
  };

  const openEditModal = (user) => {
    // Map backend fields to form state if needed
    setEditingUser({
      ...user,
      // Ensure specific fields are present if not in user object directly (depends on backend population)
      business_name: user.business_name || '',
      business_address: user.business_address || user.address || '', // Handle legacy address field
      location: user.location || ''
    });
    setEditUserModalOpen(true);
    setActionMenuOpen(null);
  };

  const openDeleteConfirm = (user) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
    setActionMenuOpen(null);
  };

  // Format Date Safely
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading && page === 1) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load users: {error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-emerald-600 font-medium hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-500 mt-1">Manage farmers, traders, and staff members</p>
        </div>
        <button
          onClick={() => setAddUserModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          <span className="text-xl font-bold">+</span>
          <span>Add User</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name on this page..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none w-full lg:w-48 px-4 py-2.5 pr-10 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all bg-white"
            >
              {roleFilters.map(rf => (
                <option key={rf.key} value={rf.key}>{rf.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-sm font-medium text-gray-600 px-6 py-4">User</th>
                <th className="text-left text-sm font-medium text-gray-600 px-6 py-4">Role</th>
                <th className="text-left text-sm font-medium text-gray-600 px-6 py-4">Phone</th>
                <th className="text-left text-sm font-medium text-gray-600 px-6 py-4">Joined</th>
                <th className="text-right text-sm font-medium text-gray-600 px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users
                  .filter(u => u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || true)
                  .map((user) => (
                    <tr key={user.id || user._id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
                            {(user.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{user.full_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.phone}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 relative">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === (user.id || user._id) ? null : (user.id || user._id))}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          </button>

                          {/* Action Dropdown */}
                          {actionMenuOpen === (user.id || user._id) && (
                            <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 overflow-hidden">
                              <button
                                onClick={() => openEditModal(user)}
                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors border-b border-gray-50"
                              >
                                <Edit2 className="w-4 h-4 text-gray-500" />
                                Edit User
                              </button>

                              <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                                Change Role
                              </div>

                              <div className="max-h-48 overflow-y-auto">
                                {roleFilters
                                  .filter(r => r.key !== 'all' && r.key !== user.role)
                                  .map(role => (
                                    <button
                                      key={role.key}
                                      onClick={() => handleRoleChange(user.id || user._id, role.key)}
                                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors capitalize pl-6 border-l-2 border-transparent hover:border-emerald-500 block"
                                    >
                                      To {role.label}
                                    </button>
                                  ))}
                              </div>

                              <div className="border-t border-gray-100"></div>
                              <button
                                onClick={() => openDeleteConfirm(user)}
                                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove User
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500">
            Total {totalUsers} users
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm self-center">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>

      {/* Add User Modal */}
      {addUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Add New User</h2>
              <button onClick={() => setAddUserModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
                  placeholder="e.g. Rahul Kumar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+91</span>
                  <input
                    type="tel"
                    required
                    value={newUser.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setNewUser({ ...newUser, phone: val });
                    }}
                    className="w-full pl-12 pr-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none bg-white"
                >
                  {roleFilters.filter(r => r.key !== 'all').map(r => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}

                </select>
              </div>

              {/* Dynamic Fields based on Role */}
              {newUser.role === 'trader' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <input
                      type="text"
                      value={newUser.business_name}
                      onChange={(e) => setNewUser({ ...newUser, business_name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
                      placeholder="e.g. Laxmi Traders"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Address <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <input
                      type="text"
                      value={newUser.business_address}
                      onChange={(e) => setNewUser({ ...newUser, business_address: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
                      placeholder="e.g. Market Yard, Gate 2"
                    />
                  </div>
                </div>
              )}

              {newUser.role === 'farmer' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Village / Location <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={newUser.location}
                    onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
                    placeholder="e.g. Rampur"
                  />
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isLoading}
                  className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {createUserMutation.isLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )
      }

      {/* Edit User Modal */}
      {
        editUserModalOpen && editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Edit User</h2>
                <button onClick={() => setEditUserModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingUser.full_name}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditUserModalOpen(false)}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateUserMutation.isLoading}
                    className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {updateUserMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        deleteConfirmOpen && userToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <ShieldAlert className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Delete User?</h2>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to delete <strong>{userToDelete.full_name}</strong>? This action cannot be undone.
                </p>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setDeleteConfirmOpen(false)}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={deleteUserMutation.isLoading}
                    className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteUserMutation.isLoading ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )
      }
    </div >
  );
}
