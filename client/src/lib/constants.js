export const APP_NAME = 'Breadwinner';
export const COHORT = 'Class of 2027';

export const STATUSES = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];
export const statusLabel = (v) => STATUSES.find((s) => s.value === v)?.label ?? v;

// Suggestions for the datalists (free text is still allowed).
export const SOURCES = ['DCU Job Fair', 'LinkedIn', 'IrishJobs.ie', 'Indeed', 'GradIreland', 'Company website', 'Referral', 'Recruiter', 'Other'];
export const LOCATIONS = ['Dublin', 'Cork', 'Galway', 'Limerick', 'Remote (Ireland)', 'Hybrid', 'Remote'];

export const SORT_OPTIONS = [
  ['created_at', 'Date added'], ['updated_at', 'Last updated'], ['deadline_date', 'Closing date'],
  ['applied_date', 'Date applied'], ['follow_up_date', 'Follow-up date'], ['interview_date', 'Interview date'], ['company', 'Company A-Z'],
];

export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' }) : '';

// ISO string -> value for <input type="datetime-local"> (in the user's local time)
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const firstName = (user) => (user?.display_name || '').trim().split(/\s+/)[0] || '';

// Quick-add suggestions for an empty tracker. Just names to start from; check each company's own site for what is open.
export const TARGET_COMPANIES = ['Stripe', 'Intercom', 'Workhuman', 'Fidelity Investments', 'Accenture', 'Deloitte', 'AIB', 'Bank of Ireland', 'Version 1', 'Mastercard', 'Workday', 'Salesforce'];
