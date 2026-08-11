import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Eye, X } from 'lucide-react';
import api from '../../services/api';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [detailsModal, setDetailsModal] = useState<any>(null);

  const actionOptions = [
    'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'BOOKING_STATUS_CHANGED',
    'PAYMENT_COMPLETED', 'PAYMENT_FAILED',
    'REFUND_INITIATED', 'REFUND_PROCESSED', 'REFUND_FAILED',
    'MERCHANT_APPROVED', 'MERCHANT_REJECTED',
  ];

  const entityOptions = ['Booking', 'Payment', 'Merchant', 'User', 'Service'];

  useEffect(() => {
    setLoading(true);
    const params: any = { page, limit: 20 };
    if (actionFilter) params.action = actionFilter;
    if (entityFilter) params.entityType = entityFilter;

    api.get('/admin/audit-logs', { params })
      .then(res => {
        setLogs(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, actionFilter, entityFilter]);

  const actionBadgeColor = (action: string) => {
    if (action.includes('REFUND')) return 'bg-purple-100 text-purple-700';
    if (action.includes('PAYMENT')) return 'bg-green-100 text-green-700';
    if (action.includes('CANCEL')) return 'bg-red-100 text-red-700';
    if (action.includes('RESCHEDULE')) return 'bg-amber-100 text-amber-700';
    if (action.includes('STATUS')) return 'bg-blue-100 text-blue-700';
    return 'bg-surface-100 text-surface-700';
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FileText size={24} className="text-primary-600" />
        <h1 className="text-2xl font-bold text-surface-900">Audit Logs</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 mb-6 border border-surface-200 shadow-sm flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Action</label>
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-surface-200 text-xs outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Actions</option>
            {actionOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Entity Type</label>
          <select
            value={entityFilter}
            onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-surface-200 text-xs outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Entities</option>
            {entityOptions.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-surface-200 text-surface-500">
          <p className="text-lg font-medium">No audit logs found.</p>
          <p className="text-sm mt-1">System events will appear here as they occur.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl overflow-hidden border border-surface-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Date/Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Entity ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {logs.map(log => (
                    <tr key={log.log_id} className="hover:bg-surface-50 transition-smooth">
                      <td className="px-4 py-3 text-xs text-surface-600 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-800 font-medium">
                        {log.user_name || `User #${log.user_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-600">{log.entity_type}</td>
                      <td className="px-4 py-3 text-xs text-surface-600 font-mono">#{log.entity_id}</td>
                      <td className="px-4 py-3">
                        {log.details ? (
                          <button
                            onClick={() => setDetailsModal(log)}
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            <Eye size={12} /> View
                          </button>
                        ) : (
                          <span className="text-xs text-surface-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 bg-white rounded-2xl p-4 border border-surface-200">
              <span className="text-xs text-surface-500 font-medium">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total logs)
              </span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                  className="p-2 border border-surface-200 rounded-xl hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-xs font-semibold px-3 py-1 bg-primary-50 text-primary-700 rounded-lg">{page}</span>
                <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}
                  className="p-2 border border-surface-200 rounded-xl hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-4 border-b border-surface-100 pb-3">
              <h3 className="font-bold text-surface-900 text-base">
                Audit Log #{detailsModal.log_id} — {detailsModal.action}
              </h3>
              <button onClick={() => setDetailsModal(null)} className="p-1 text-surface-400 hover:text-surface-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-surface-100">
                <span className="text-surface-500">User:</span>
                <span className="font-medium">{detailsModal.user_name} ({detailsModal.user_email})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-100">
                <span className="text-surface-500">Entity:</span>
                <span className="font-medium">{detailsModal.entity_type} #{detailsModal.entity_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-100">
                <span className="text-surface-500">Timestamp:</span>
                <span className="font-medium">{new Date(detailsModal.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-surface-500 mb-2 uppercase">Details (JSON)</p>
              <pre className="bg-surface-50 rounded-xl p-3 text-xs text-surface-700 overflow-auto max-h-48 border border-surface-200">
                {JSON.stringify(detailsModal.details, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
