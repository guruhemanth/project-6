import { useState, useEffect, useCallback } from 'react';
import { History, ArrowRight, Plus, Pencil, Trash2, Search, X, RotateCcw, Filter, ArrowUpDown } from 'lucide-react';
import useCollectionStore from '../store/useCollectionStore';

const actionConfig = {
  INSERT: {
    label: 'Created',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: Plus,
  },
  UPDATE: {
    label: 'Updated',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    icon: Pencil,
  },
  DELETE: {
    label: 'Deleted',
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500',
    icon: Trash2,
  },
};

/**
 * Extracts changed fields between old and new JSONB data objects.
 * Skips auto-updated fields like updated_at.
 */
function getDiff(oldData, newData) {
  if (!oldData || !newData) return [];
  const changes = [];
  const skipFields = ['updated_at'];

  for (const key of Object.keys(newData)) {
    if (skipFields.includes(key)) continue;
    if (String(oldData[key]) !== String(newData[key])) {
      changes.push({ field: key, from: oldData[key], to: newData[key] });
    }
  }
  return changes;
}

export default function HistoryPage() {
  const { history, loading, fetchHistory } = useCollectionStore();

  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('DESC');

  const loadHistory = useCallback(() => {
    fetchHistory({
      q: search,
      action: selectedAction,
      sortOrder,
    });
  }, [fetchHistory, search, selectedAction, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedAction, sortOrder, loadHistory]);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedAction('ALL');
    setSortOrder('DESC');
  };

  const hasActiveFilters = Boolean(search || selectedAction !== 'ALL' || sortOrder !== 'DESC');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Search & Filter Header Card */}
      <div className="card !p-4 sm:!p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Audit History</h2>
              <p className="text-xs text-gray-500">Automated transaction logs & change tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !py-2 pl-9 pr-8 text-sm"
                placeholder="Search history by name..."
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort Direction Toggle */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="input-field !py-2 !px-2.5 text-xs bg-white w-auto"
            >
              <option value="DESC">Newest First</option>
              <option value="ASC">Oldest First</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Reset filters"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Action Type Filter Pills */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> Action:
            </span>
            {[
              { id: 'ALL', label: 'All Actions' },
              { id: 'INSERT', label: 'Created', color: 'hover:border-emerald-400 active-emerald' },
              { id: 'UPDATE', label: 'Updated', color: 'hover:border-blue-400 active-blue' },
              { id: 'DELETE', label: 'Deleted', color: 'hover:border-red-400 active-red' },
            ].map((action) => {
              const isActive = selectedAction === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setSelectedAction(action.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                    isActive
                      ? action.id === 'INSERT'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : action.id === 'UPDATE'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : action.id === 'DELETE'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {action.label}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-gray-500">
            Showing <span className="font-bold text-gray-800">{history.length}</span> log entries
            {hasActiveFilters && <span className="text-orange-600 font-medium ml-1">(Filtered)</span>}
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 text-gray-400 card">
          <History size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No audit entries found</p>
          <p className="text-sm mt-1">
            {hasActiveFilters ? 'Try clearing your search or selecting a different action' : 'Changes will appear here automatically'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-3 inline-flex items-center gap-1 text-xs text-orange-600 font-semibold hover:underline"
            >
              <RotateCcw size={12} /> Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {history.map((log) => {
              const config = actionConfig[log.action_type] || actionConfig.INSERT;
              const Icon = config.icon;
              const data = log.new_data || log.old_data;
              const diff = log.action_type === 'UPDATE' ? getDiff(log.old_data, log.new_data) : [];

              return (
                <div key={log.id} className="relative flex gap-4 pl-2 animate-in">
                  {/* Timeline dot */}
                  <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.color} border shadow-sm`}>
                    <Icon size={16} />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 card !p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${config.color}`}>
                          {config.label}
                        </span>
                        {data && (
                          <span className="text-sm font-medium text-gray-800">
                            {data.name}
                            <span className="text-gray-400 font-normal"> (Door: {data.door_number})</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap font-mono">
                        {new Date(log.performed_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* INSERT details */}
                    {log.action_type === 'INSERT' && log.new_data && (
                      <div className="text-sm text-gray-600 bg-emerald-50/70 rounded-lg p-3 border border-emerald-100 flex items-center justify-between">
                        <span>Contribution Added</span>
                        <span className="font-bold text-emerald-700 text-base">₹{parseFloat(log.new_data.amount).toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {/* UPDATE diff */}
                    {log.action_type === 'UPDATE' && diff.length > 0 && (
                      <div className="space-y-1.5">
                        {diff.map((change) => (
                          <div key={change.field} className="flex items-center gap-2 text-sm bg-blue-50/70 rounded-lg p-2.5 border border-blue-100 flex-wrap">
                            <span className="font-medium text-gray-600 capitalize min-w-[80px]">{change.field}:</span>
                            <span className="text-red-500 line-through font-mono">
                              {change.field === 'amount' ? `₹${parseFloat(change.from).toLocaleString('en-IN')}` : String(change.from)}
                            </span>
                            <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="text-emerald-600 font-semibold font-mono">
                              {change.field === 'amount' ? `₹${parseFloat(change.to).toLocaleString('en-IN')}` : String(change.to)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* DELETE details */}
                    {log.action_type === 'DELETE' && log.old_data && (
                      <div className="text-sm text-gray-600 bg-red-50/70 rounded-lg p-3 border border-red-100 flex items-center justify-between">
                        <span>Removed Record ({log.old_data.name}, Door: {log.old_data.door_number})</span>
                        <span className="font-bold text-red-600 text-base">₹{parseFloat(log.old_data.amount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

