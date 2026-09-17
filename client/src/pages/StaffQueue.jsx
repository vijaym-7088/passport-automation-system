import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import StatusBadge from '../components/StatusBadge';
import Notice from '../components/Notice';
import { STATUS_LABELS, formatDate } from '../constants';

const FILTERABLE = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'POLICE_VERIFICATION',
  'VERIFICATION_PASSED',
  'VERIFICATION_FAILED',
  'APPROVED',
  'REJECTED',
];

export default function StaffQueue() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, byStatus: {} });
  const [status, setStatus] = useState(user.role === 'verifier' ? 'POLICE_VERIFICATION' : '');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (query.trim()) params.set('q', query.trim());
      const [list, counts] = await Promise.all([
        api(`/staff/applications?${params}`),
        api('/staff/stats'),
      ]);
      setApplications(list.applications);
      setStats(counts);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0); // debounce the search box
    return () => clearTimeout(t);
  }, [load, query]);

  const headline = user.role === 'verifier' ? 'Verification queue' : 'Application queue';

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{headline}</h1>
          <p>
            {user.role === 'verifier'
              ? 'Files waiting on a police verification report.'
              : 'Every application that has left draft, newest activity first.'}
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-body">
          <div className="stat-row">
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total on file</div>
            </div>
            {['SUBMITTED', 'POLICE_VERIFICATION', 'APPROVED', 'REJECTED'].map((key) => (
              <div key={key}>
                <div className="stat-value">{stats.byStatus?.[key] || 0}</div>
                <div className="stat-label">{STATUS_LABELS[key]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Notice>{error}</Notice>

      <div className="panel">
        <div className="panel-head">
          <div className="filter-bar">
            <input
              placeholder="Search name, reference or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ minWidth: '16rem' }}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All stages</option>
              {FILTERABLE.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn" onClick={load}>Refresh</button>
        </div>

        {loading ? (
          <div className="empty">Loading the queue…</div>
        ) : applications.length === 0 ? (
          <div className="empty">
            <h3>Nothing here</h3>
            <p>No application matches this stage or search.</p>
          </div>
        ) : (
          <ul className="record-list">
            {applications.map((app) => (
              <li key={app._id}>
                <Link className="record" to={`/applications/${app._id}`}>
                  <div>
                    <div className="record-ref">{app.applicationNumber}</div>
                    <div className="record-name">
                      {app.personal.firstName} {app.personal.lastName}
                    </div>
                    <div className="record-meta">
                      {app.contact.email} · last activity {formatDate(app.updatedAt, true)}
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
