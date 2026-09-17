import { STATUS_LABELS, formatDate } from '../constants';

export default function Timeline({ entries = [] }) {
  if (!entries.length) return <p className="timeline-note">Nothing has happened yet.</p>;

  return (
    <ol className="timeline">
      {entries.map((entry, i) => (
        <li key={`${entry.status}-${entry.at}-${i}`} className={i === entries.length - 1 ? 'is-current' : ''}>
          <div className="timeline-status">{STATUS_LABELS[entry.status] || entry.status}</div>
          {entry.note && <div className="timeline-note">{entry.note}</div>}
          <div className="timeline-when">
            {formatDate(entry.at, true)}
            {entry.byName ? ` · ${entry.byName}` : ''}
          </div>
        </li>
      ))}
    </ol>
  );
}
