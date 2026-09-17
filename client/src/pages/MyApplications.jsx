import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import Notice from '../components/Notice';
import { formatDate } from '../constants';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/applications')
      .then((data) => setApplications(data.applications))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My applications</h1>
          <p>Every application you have started, with where it currently sits.</p>
        </div>
        <Link className="btn btn-primary" to="/applications/new">Start a new application</Link>
      </div>

      <Notice>{error}</Notice>

      <div className="panel">
        {loading ? (
          <div className="empty">Loading your applications…</div>
        ) : applications.length === 0 ? (
          <div className="empty">
            <h3>No applications yet</h3>
            <p>Start one and it will appear here with a reference number you can track.</p>
            <Link className="btn btn-primary" to="/applications/new">Start a new application</Link>
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
                      {app.applicationType === 'fresh' ? 'Fresh passport' : 'Reissue'} · started{' '}
                      {formatDate(app.createdAt)}
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
