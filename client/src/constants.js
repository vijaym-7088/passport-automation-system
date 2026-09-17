export const STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  POLICE_VERIFICATION: 'With police verification',
  VERIFICATION_PASSED: 'Verification clear',
  VERIFICATION_FAILED: 'Verification adverse',
  APPROVED: 'Passport issued',
  REJECTED: 'Rejected',
};

export const STATUS_TONE = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'info',
  POLICE_VERIFICATION: 'amber',
  VERIFICATION_PASSED: 'good',
  VERIFICATION_FAILED: 'bad',
  APPROVED: 'good',
  REJECTED: 'bad',
};

export const DOC_LABELS = {
  photo: 'Passport photo',
  proof_of_address: 'Proof of address',
  proof_of_dob: 'Proof of date of birth',
  id_proof: 'Identity proof',
  other: 'Other document',
};

export const REQUIRED_DOCS = ['photo', 'proof_of_address', 'proof_of_dob'];

export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}
