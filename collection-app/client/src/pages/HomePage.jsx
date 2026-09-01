import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IndianRupee, Users, Plus, Clock, MapPin, Building2, Wifi, WifiOff, RefreshCw, MessageSquare, Sparkles } from 'lucide-react';
import api from '../services/api';
import useCollectionStore from '../store/useCollectionStore';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { sendWhatsAppReceipt } from '../utils/whatsappReceipt';

export default function HomePage() {
  const { stats, records, societyName, city, state, username, fetchStats, fetchRecords } = useCollectionStore();
  const { isOnline, syncing, pendingCount, enqueueOfflineDonation, flushQueue } = useOfflineSync();

  const [form, setForm] = useState({ name: '', door_number: '', phone_number: '', amount: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastSavedRecord, setLastSavedRecord] = useState(null);

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
      setError('Name, door number, and amount are required.');
      return;
    }

    const parsedAmount = parseFloat(form.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        door_number: form.door_number.trim(),
        phone_number: form.phone_number ? form.phone_number.trim() : null,
        amount: parsedAmount,
      };

      if (!isOnline) {
        // Field Resilience: Queue locally in IndexedDB with UUID idempotency key
        const queued = await enqueueOfflineDonation(payload);
        setSuccess(`💾 Saved offline! Will sync automatically when connection restores.`);
        setLastSavedRecord(queued);
      } else {
        const res = await api.post('/api/records', payload);
        setSuccess(`✅ ₹${parsedAmount.toLocaleString('en-IN')} collected from ${form.name.trim()}`);
        setLastSavedRecord(res.data);
      }

      setForm({ name: '', door_number: '', phone_number: '', amount: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add record.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show last 8 records as live feed with defensive array fallback
  const safeRecords = Array.isArray(records) ? records : [];
  const recentRecords = safeRecords.slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Offline Status & Sync Alert Bar */}
      {(!isOnline || pendingCount > 0) && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-in ${
          !isOnline ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            {!isOnline ? <WifiOff size={18} className="text-amber-600 flex-shrink-0" /> : <Wifi size={18} className="text-blue-600 flex-shrink-0" />}
            <span>
              {!isOnline
                ? `You are currently OFFLINE. ${pendingCount} donation(s) queued in local IndexedDB storage.`
                : `${pendingCount} offline donation(s) ready to sync.`}
            </span>
          </div>

          {isOnline && pendingCount > 0 && (
            <button
              onClick={flushQueue}
              disabled={syncing}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}
        </div>
      )}

      {/* Festival Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎉</span>
          <div>
            <h2 className="text-2xl font-bold">Vinayaka Chavithi 2026</h2>
            <div className="flex items-center gap-2 text-orange-100 text-sm font-medium flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 size={14} />
                {societyName || 'GovindaNagar'}
              </span>
              {(city || state) && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {[city, state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/doorstep"
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md border border-amber-400/40 transition-all hover:scale-105"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>⚡ Open 5-Sec Collector</span>
          </Link>

          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm">
            {isOnline ? (
              <>
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                <span>Online • Live Delta Sync</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 bg-amber-300 rounded-full" />
                <span>Offline Mode Active</span>
              </>
            )}
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
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Collection</p>
            <p className="text-2xl font-black text-gray-800">₹{stats.total.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Users className="text-emerald-600" size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Donors</p>
            <p className="text-2xl font-black text-gray-800">{stats.count}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Entry Form */}
        <div className="lg:col-span-2">
          <div className="card space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Plus size={20} className="text-orange-500" />
              Quick Donation Entry
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg space-y-2 font-medium">
                  <div>{success}</div>
                  {lastSavedRecord && (
                    <button
                      type="button"
                      onClick={() =>
                        sendWhatsAppReceipt({
                          phoneNumber: lastSavedRecord.phone_number,
                          donorName: lastSavedRecord.name,
                          doorNumber: lastSavedRecord.door_number,
                          amount: lastSavedRecord.amount,
                          receiptId: lastSavedRecord.id,
                          societyName,
                          city,
                          collectorName: username,
                        })
                      }
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md text-xs font-bold transition-colors"
                    >
                      <MessageSquare size={13} />
                      <span>Send WhatsApp Receipt</span>
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Donor Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input-field text-sm !py-2"
                  placeholder="e.g. Ramesh Kumar"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Door Number
                  </label>
                  <input
                    type="text"
                    name="door_number"
                    value={form.door_number}
                    onChange={handleChange}
                    className="input-field text-sm !py-2"
                    placeholder="e.g. 1-23, 4/56"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    WhatsApp (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={form.phone_number}
                    onChange={handleChange}
                    className="input-field text-sm !py-2"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    className="input-field text-sm !py-2 !pl-8"
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 !py-2.5 !text-sm font-bold mt-2"
              >
                <Plus size={18} />
                {submitting ? 'Saving...' : !isOnline ? 'Save Offline' : 'Add Collection Record'}
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
                Live Feed
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
                    key={record.id || record.idempotency_key}
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

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-orange-600 text-sm">
                          ₹{parseFloat(record.amount).toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(record.created_at || record.queued_at || Date.now()).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          sendWhatsAppReceipt({
                            phoneNumber: record.phone_number,
                            donorName: record.name,
                            doorNumber: record.door_number,
                            amount: record.amount,
                            receiptId: record.id,
                            societyName,
                            city,
                            collectorName: record.collector_name || username,
                          })
                        }
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Send WhatsApp Receipt"
                      >
                        <MessageSquare size={16} />
                      </button>
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
