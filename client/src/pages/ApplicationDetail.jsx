import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getToken } from '../api';
import { useAuth } from '../AuthContext';
import StatusBadge from '../components/StatusBadge';
import Timeline from '../components/Timeline';
import Notice from '../components/Notice';
import { DOC_LABELS, REQUIRED_DOCS, STATUS_LABELS, formatDate } from '../constants';

export default function ApplicationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState('photo');
  const [remarks, setRemarks] = useState('');

  const isOwner = application && String(application.applicant?._id ?? application.applicant) === String(user.id);
  const isAdmin = user.role === 'admin';
  const isVerifier = user.role === 'verifier';
  const isDraft = application?.status === 'DRAFT';

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    try {
      const { application: found } = await api(`/applications/${id}`);
      setApplication(found);
    } catch (err) {
      setError(err.message);
    }
  }

  // Runs any action that returns the updated application.
  async function act(path, { method = 'POST', body, message } = {}) {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const data = await api(path, { method, body });
      if (data.application) setApplication(data.application);
      if (message) setSuccess(message);
    } catch (err) {
      setError(err.missing ? `${err.message} Missing: ${err.missing.map((m) => DOC_LABELS[m]).join(', ')}.` : err.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadDocument(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Choose a file to upload.');

    const body = new FormData();
    body.append('file', file);
    body.append('docType', docType);

    setError('');
    setBusy(true);
    try {
      const data = await api(`/applications/${id}/documents`, { method: 'POST', body, isForm: true });
      setApplication(data.application);
      setSuccess(`${DOC_LABELS[docType]} attached.`);
      fileRef.current.value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openDocument(docId) {
    // Fetch with the token, then hand the blob to a new tab.
    fetch(`/api/applications/${id}/documents/${docId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('That document could not be opened.'))))
      .then((blob) => window.open(URL.createObjectURL(blob), '_blank', 'noopener'))
      .catch((err) => setError(err.message));
  }

  async function deleteDraft() {
    if (!window.confirm('Delete this draft? It cannot be recovered.')) return;
    await api(`/applications/${id}`, { method: 'DELETE' }).catch((err) => setError(err.message));
    navigate('/applications');
  }

  if (error && !application) return <Notice>{error}</Notice>;
  if (!application) return <p>Loading application…</p>;

  const attached = application.documents.map((d) => d.docType);
  const missing = REQUIRED_DOCS.filter((d) => !attached.includes(d));
  const p = application.personal;
  const a = application.contact.address;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="record-ref">{application.applicationNumber}</div>
          <h1>{p.firstName} {p.lastName}</h1>
          <p>
            {application.applicationType === 'fresh' ? 'Fresh passport' : 'Reissue of passport'} ·
            started {formatDate(application.createdAt)}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <Notice>{error}</Notice>
      <Notice tone="success">{success}</Notice>

      <div className="columns">
        <div>
          {application.status === 'APPROVED' && (
            <div className="booklet" style={{ marginBottom: '1.5rem' }}>
              <div className="booklet-label">Passport number</div>
              <div className="booklet-number">{application.passportNumber}</div>
              <div className="booklet-date">Issued {formatDate(application.issuedAt)}</div>
            </div>
          )}

          {application.status === 'REJECTED' && (
            <Notice>Rejected: {application.rejectionReason}</Notice>
          )}

          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-head">
              <h2>Particulars</h2>
              {isOwner && isDraft && (
                <Link className="btn" to={`/applications/${id}/edit`}>Edit</Link>
              )}
            </div>
            <div className="panel-body">
              <dl className="particulars">
                <dt>Date of birth</dt><dd>{formatDate(p.dob)}</dd>
                <dt>Place of birth</dt><dd>{p.placeOfBirth}</dd>
                <dt>Gender</dt><dd style={{ textTransform: 'capitalize' }}>{p.gender}</dd>
                <dt>Marital status</dt><dd style={{ textTransform: 'capitalize' }}>{p.maritalStatus}</dd>
                <dt>Father's name</dt><dd>{application.family?.fatherName || '—'}</dd>
                <dt>Mother's name</dt><dd>{application.family?.motherName || '—'}</dd>
                <dt>Mobile</dt><dd>{application.contact.phone}</dd>
                <dt>Email</dt><dd>{application.contact.email}</dd>
                <dt>Address</dt>
                <dd>
                  {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
                  {a.city}, {a.state} {a.pincode}
                </dd>
              </dl>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Documents</h2>
              {missing.length > 0 && isOwner && (
                <span className="badge badge-amber">
                  {missing.length} still required
                </span>
              )}
            </div>
            <div className="panel-body">
              {application.documents.length === 0 ? (
                <p className="timeline-note">Nothing attached yet.</p>
              ) : (
                application.documents.map((doc) => (
                  <div className="doc-row" key={doc._id}>
                    <span className="doc-kind">{DOC_LABELS[doc.docType]}</span>
                    <span className="doc-name">{doc.originalName}</span>
                    <button type="button" className="btn" onClick={() => openDocument(doc._id)}>
                      Open
                    </button>
                    {isOwner && isDraft && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        disabled={busy}
                        onClick={() => act(`/applications/${id}/documents/${doc._id}`, { method: 'DELETE' })}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))
              )}

              {isOwner && isDraft && (
                <form onSubmit={uploadDocument} style={{ marginTop: '1.25rem' }}>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="docType">Document type</label>
                      <select id="docType" value={docType} onChange={(e) => setDocType(e.target.value)}>
                        {Object.entries(DOC_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="file">File (JPG, PNG or PDF, up to 5 MB)</label>
                      <input id="file" type="file" ref={fileRef} accept=".jpg,.jpeg,.png,.webp,.pdf" />
                    </div>
                  </div>
                  <button className="btn" style={{ marginTop: '0.9rem' }} disabled={busy}>
                    Attach document
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <div className="panel-head"><h2>Progress</h2></div>
            <div className="panel-body">
              <Timeline entries={application.timeline} />
            </div>
          </div>

          {(isOwner && isDraft) && (
            <div className="panel">
              <div className="panel-head"><h2>Submit</h2></div>
              <div className="panel-body">
                <p className="timeline-note" style={{ marginTop: 0 }}>
                  Once submitted, the particulars and documents are locked.
                </p>
                <div className="btn-row">
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => act(`/applications/${id}/submit`, { message: 'Application submitted.' })}
                  >
                    Submit application
                  </button>
                  <button className="btn btn-danger" onClick={deleteDraft}>Delete draft</button>
                </div>
              </div>
            </div>
          )}

          {(isAdmin || isVerifier) && !isDraft && (
            <div className="panel">
              <div className="panel-head"><h2>Officer actions</h2></div>
              <div className="panel-body">
                <p className="timeline-note" style={{ marginTop: 0 }}>
                  Current stage: {STATUS_LABELS[application.status]}
                </p>

                {isAdmin && application.status === 'SUBMITTED' && (
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => act(`/staff/applications/${id}/review`, { message: 'Taken up for review.' })}
                  >
                    Take up for review
                  </button>
                )}

                {isAdmin && application.status === 'UNDER_REVIEW' && (
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() =>
                      act(`/staff/applications/${id}/send-for-verification`, {
                        message: 'Sent for police verification.',
                      })
                    }
                  >
                    Send for police verification
                  </button>
                )}

                {application.status === 'POLICE_VERIFICATION' && (
                  <>
                    <div className="field" style={{ marginBottom: '0.8rem' }}>
                      <label htmlFor="remarks">Verification remarks</label>
                      <textarea
                        id="remarks"
                        rows={3}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>
                    <div className="btn-row">
                      <button
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() =>
                          act(`/staff/applications/${id}/verdict`, {
                            body: { verdict: 'clear', remarks },
                            message: 'Recorded as clear.',
                          })
                        }
                      >
                        Record as clear
                      </button>
                      <button
                        className="btn btn-danger"
                        disabled={busy}
                        onClick={() =>
                          act(`/staff/applications/${id}/verdict`, {
                            body: { verdict: 'adverse', remarks },
                            message: 'Recorded as adverse.',
                          })
                        }
                      >
                        Record as adverse
                      </button>
                    </div>
                  </>
                )}

                {isAdmin && application.status === 'VERIFICATION_PASSED' && (
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => act(`/staff/applications/${id}/approve`, { message: 'Passport issued.' })}
                  >
                    Issue passport
                  </button>
                )}

                {isAdmin && !['APPROVED', 'REJECTED'].includes(application.status) && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--rule)' }}>
                    <div className="field" style={{ marginBottom: '0.6rem' }}>
                      <label htmlFor="reason">Reason for rejection</label>
                      <textarea
                        id="reason"
                        rows={2}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn btn-danger"
                      disabled={busy}
                      onClick={() =>
                        act(`/staff/applications/${id}/reject`, {
                          body: { reason: remarks },
                          message: 'Application rejected.',
                        })
                      }
                    >
                      Reject application
                    </button>
                  </div>
                )}

                {application.policeVerification?.verifiedAt && (
                  <p className="timeline-note" style={{ marginBottom: 0 }}>
                    Verification recorded {formatDate(application.policeVerification.verifiedAt, true)} —{' '}
                    {application.policeVerification.verdict}
                    {application.policeVerification.remarks ? `: ${application.policeVerification.remarks}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
