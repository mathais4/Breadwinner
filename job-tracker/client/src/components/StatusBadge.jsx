import { statusLabel } from '../lib/constants.js';

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{statusLabel(status)}</span>;
}
