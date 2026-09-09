import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, ShieldCheck, User, KeyRound, Eye, EyeOff, CheckCircle2, Building2 } from 'lucide-react';
import useCollectionStore from '../store/useCollectionStore';

export default function UsersPage() {
  const { users, loading, username: currentUsername, societyName, role, fetchUsers, addUser, removeUser } = useCollectionStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isAdmin) {
      setError('Only admins have permission to create collectors.');
      return;
    }

    if (!form.username.trim() || !form.password.trim()) {
      setError('Username and password are required.');
      return;
    }

    if (form.username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (form.password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const newUser = await addUser({
        username: form.username.trim(),
        password: form.password,
      });
      setSuccess(`✅ Collector account "${newUser.username}" created successfully with hashed password!`);
      setForm({ username: '', password: '' });
      setShowAddForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create collector account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      await removeUser(user.id);
      setDeleteTarget(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete collector.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="card !p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
            <Users size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800">Collectors Management</h2>
              <span className="text-xs bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 border border-orange-200">
                <Building2 size={12} />
                {societyName || 'GovindaNagar'} Space
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Only admins can create collectors. Collectors can log in and enter collections for this space.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setError('');
              setSuccess('');
            }}
            className="btn-primary flex items-center justify-center gap-2 text-sm !py-2"
          >
            <UserPlus size={16} />
            {showAddForm ? 'Close Form' : 'Add New Collector'}
          </button>
        )}
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-2 animate-in">
          <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Collector Form */}
      {showAddForm && isAdmin && (
        <div className="card !p-6 border-2 border-orange-200 animate-in">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
            <UserPlus size={18} className="text-orange-500" />
            Create Collector for "{societyName || 'GovindaNagar'}"
          </h3>

          <form onSubmit={handleCreateUser} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Collector Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="e.g. RameshCollector"
                  className="input-field text-sm !py-2"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Password (Auto-Hashed)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min 4 characters"
                    className="input-field text-sm !py-2 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <KeyRound size={14} className="text-orange-400" />
                <span>Bcrypt encrypted (10 rounds). Usernames are scoped to this society (duplicates allowed across societies).</span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary text-sm !py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-sm !py-2 flex items-center gap-1.5"
                >
                  <UserPlus size={16} />
                  {submitting ? 'Creating...' : 'Save Collector'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="card !p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-orange-50/40">
          <span className="text-xs font-semibold uppercase tracking-wider text-orange-800">
            Authorized Users in {societyName || 'GovindaNagar'} ({users.length})
          </span>
          <span className="text-xs text-gray-400">
            Active: <strong className="text-gray-700">{currentUsername}</strong> ({role.toUpperCase()})
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={36} className="mx-auto mb-2 opacity-30" />
            <p>No collectors registered in this space yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => {
              const isCurrentUser = currentUsername?.toLowerCase() === u.username.toLowerCase();
              const isUserAdmin = u.role === 'admin';

              return (
                <div
                  key={u.id}
                  className="p-4 flex items-center justify-between hover:bg-orange-50/20 transition-colors flex-wrap gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                        isUserAdmin ? 'bg-orange-500 text-white' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm">{u.username}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full border border-orange-200">
                            You
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                            isUserAdmin
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {isUserAdmin ? <ShieldCheck size={11} /> : <User size={11} />}
                          {u.role.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">
                        Password: •••••••• (bcrypt) • Joined:{' '}
                        {new Date(u.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isCurrentUser ? (
                      <span className="text-xs text-gray-400 italic">Current Account</span>
                    ) : isAdmin && !isUserAdmin ? (
                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={`Delete ${u.username}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 size={18} />
              Confirm Collector Deletion
            </h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete collector account{' '}
              <strong className="text-gray-800">"{deleteTarget.username}"</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary flex-1 text-sm !py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleteTarget)}
                className="btn-danger flex-1 text-sm !py-2"
              >
                Delete Collector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
