import { useState, useEffect } from 'react';
import { IndianRupee, Users, Plus, Clock } from 'lucide-react';
import api from '../services/api';
import useCollectionStore from '../store/useCollectionStore';

export default function HomePage() {
  const { stats, records, societyName, fetchStats, fetchRecords } = useCollectionStore();

  const [form, setForm] = useState({ name: '', door_number: '', amount: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, [fetchStats, fetchRecords]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.door_number.trim() || !form.amount) {
      setError('All fields are required.');
      return;
    }

    const parsedAmount = parseFloat(form.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/records', {
        name: form.name.trim(),
        door_number: form.door_number.trim(),
        amount: parsedAmount,
      });
      setSuccess(`✅ ₹${parsedAmount.toLocaleString('en-IN')} collected from ${form.name.trim()}`);
      setForm({ name: '', door_number: '', amount: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show last 8 records as live feed
  const recentRecords = records.slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Festival Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🎉</span>
          <div>
            <h2 className="text-2xl font-bold">Vinayaka Chavithi 2026</h2>
            <p className="text-orange-100 text-sm">
              {societyName || 'GovindaNagar'} Fund Collection
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <IndianRupee className="text-orange-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Collection</p>
            <p className="text-2xl font-bold text-gray-800">₹{stats.total.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Users className="text-emerald-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Donors</p>
            <p className="text-2xl font-bold text-gray-800">{stats.count}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Entry Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
              <Plus size={20} className="text-orange-500" />
              Quick Entry
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-lg">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Member name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Door Number</label>
                <input
                  type="text"
                  name="door_number"
                  value={form.door_number}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g. 1-23, 4/56"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                {submitting ? 'Adding...' : 'Add Collection'}
              </button>
            </form>
          </div>
        </div>

        {/* Live Feed */}
        <div className="lg:col-span-3">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
              <Clock size={20} className="text-orange-500" />
              Recent Collections
              <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-500">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            </h3>

            {recentRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <IndianRupee size={40} className="mx-auto mb-3 opacity-30" />
                <p>No collections yet. Start adding!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-50/50 hover:bg-orange-50 transition-colors border border-orange-100/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 text-sm font-bold">
                        {record.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{record.name}</p>
                        <p className="text-xs text-gray-400">Door: {record.door_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600 text-sm">
                        ₹{parseFloat(record.amount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(record.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
