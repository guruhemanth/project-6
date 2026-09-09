import { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function DeleteModal({ record, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/api/records/${record.id}`);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle size={20} />
            Confirm Delete
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <p className="text-gray-600 mb-4">Are you sure you want to delete this collection entry?</p>

          <div className="bg-red-50 rounded-lg p-4 mb-4 border border-red-100">
            <div className="space-y-1 text-sm">
              <p><span className="font-medium text-gray-700">Name:</span> {record.name}</p>
              <p><span className="font-medium text-gray-700">Door:</span> {record.door_number}</p>
              <p><span className="font-medium text-gray-700">Amount:</span> ₹{parseFloat(record.amount).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-4">This action will be logged in the audit history.</p>

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger flex-1 flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
