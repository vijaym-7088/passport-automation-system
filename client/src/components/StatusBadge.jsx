import { STATUS_LABELS, STATUS_TONE } from '../constants';

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${STATUS_TONE[status] || 'neutral'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
