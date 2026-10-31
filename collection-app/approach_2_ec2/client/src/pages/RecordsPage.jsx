import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Pencil, Trash2, IndianRupee, Table2, SlidersHorizontal, X, ArrowUpDown, RotateCcw, MessageSquare } from 'lucide-react';
import useCollectionStore from '../store/useCollectionStore';
import EditModal from '../components/EditModal';
import DeleteModal from '../components/DeleteModal';
import { sendWhatsAppReceipt } from '../utils/whatsappReceipt';

const PRESET_AMOUNTS = [
  { label: 'All', min: '', max: '' },
  { label: '₹500+', min: '500', max: '' },
  { label: '₹1,000+', min: '1000', max: '' },
  { label: '₹2,000+', min: '2000', max: '' },
  { label: '₹5,000+', min: '500', max: '' },
];

export default function RecordsPage() {
  const { records, loading, searchQuery, societyName, city, username, setSearchQuery, fetchRecords } = useCollectionStore();

  const [editRecord, setEditRecord] = useState(null);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter & Sort state
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Fetch with full filter criteria
  const loadData = useCallback(() => {
    fetchRecords({
      q: localSearch,
      minAmount: minAmount || undefined,
      maxAmount: maxAmount || undefined,
      sortBy,
      sortOrder,
    });
  }, [fetchRecords, localSearch, minAmount, maxAmount, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, minAmount, maxAmount, sortBy, sortOrder, setSearchQuery, loadData]);

  const handleRecordChanged = useCallback(() => {
    loadData();
  }, [loadData]);

  const handleClearFilters = () => {
    setLocalSearch('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('created_at');
    setSortOrder('DESC');
  };

  const hasActiveFilters = Boolean(localSearch || minAmount || maxAmount || sortBy !== 'created_at' || sortOrder !== 'DESC');

  // Calculate sum of currently displayed records
  const currentViewTotal = useMemo(() => {
    const safeRecords = Array.isArray(records) ? records : [];
    return safeRecords.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
  }, [records]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Top Header & Search Controls */}
      <div className="card !p-4 sm:!p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <Table2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Collection Records</h2>
              <p className="text-xs text-gray-500">Manage and track all member contributions</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-72">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="input-field !py-2 pl-9 pr-8 text-sm"
                placeholder="Search name or door no..."
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                showFilters || hasActiveFilters
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-yellow-300 ml-0.5" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in">
            {/* Amount Presets */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Amount Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'All', min: '', max: '' },
                  { label: '₹1 - ₹500', min: '1', max: '500' },
                  { label: '₹501 - ₹1,000', min: '501', max: '1000' },
                  { label: '₹1,001 - ₹5,000', min: '1001', max: '5000' },
                  { label: '₹5,000+', min: '5000', max: '' },
                ].map((preset) => {
                  const isActive = minAmount === preset.min && maxAmount === preset.max;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMinAmount(preset.min);
                        setMaxAmount(preset.max);
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                        isActive
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Range */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Custom Amount (₹)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="input-field !py-1.5 !px-2.5 text-xs w-full"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="input-field !py-1.5 !px-2.5 text-xs w-full"
                />
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ArrowUpDown size={12} /> Sort By
              </label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [col, dir] = e.target.value.split('-');
                  setSortBy(col);
                  setSortOrder(dir);
                }}
                className="input-field !py-1.5 !px-2.5 text-xs w-full bg-white"
              >
                <option value="created_at-DESC">Newest First</option>
                <option value="created_at-ASC">Oldest First</option>
                <option value="amount-DESC">Amount: High to Low</option>
                <option value="amount-ASC">Amount: Low to High</option>
                <option value="name-ASC">Name (A → Z)</option>
                <option value="door_number-ASC">Door Number (Ascending)</option>
              </select>
            </div>
          </div>
        )}

        {/* Filter Summary & Record Counts */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500 flex-wrap gap-2">
          <div>
            Showing <span className="font-bold text-gray-800">{records.length}</span> records
            {hasActiveFilters && <span className="text-orange-600 font-medium ml-1">(Filtered)</span>}
          </div>
          <div className="font-medium text-gray-700 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100">
            Total in View: <span className="font-bold text-orange-600">₹{currentViewTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <IndianRupee size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No matching records found</p>
            <p className="text-sm mt-1">
              {hasActiveFilters ? 'Try adjusting your search query or filters' : 'Start collecting chandas!'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-3 inline-flex items-center gap-1 text-xs text-orange-600 font-semibold hover:underline"
              >
                <RotateCcw size={12} /> Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-orange-50 border-b border-orange-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-orange-700 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-orange-700 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-orange-700 uppercase tracking-wider">Door No.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-orange-700 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-orange-700 uppercase tracking-wider">Date</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-orange-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record, index) => (
                  <tr key={record.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                          {record.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 text-sm">{record.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.door_number}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-orange-600 text-sm">
                        ₹{parseFloat(record.amount).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(record.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
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
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors"
                          title="Send WhatsApp Receipt"
                        >
                          <MessageSquare size={16} />
                        </button>
                        <button
                          onClick={() => setEditRecord(record)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteRecord(record)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {editRecord && (
        <EditModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSaved={handleRecordChanged}
        />
      )}
      {deleteRecord && (
        <DeleteModal
          record={deleteRecord}
          onClose={() => setDeleteRecord(null)}
          onDeleted={handleRecordChanged}
        />
      )}
    </div>
  );
}

