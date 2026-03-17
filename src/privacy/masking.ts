/** Sensitive input types that should always be fully masked */
const SENSITIVE_TYPES = new Set(['password', 'email', 'tel', 'credit-card']);

/**
 * Mask input value for privacy.
 * Sensitive fields are fully masked, others show length only.
 */
export function maskValue(value: string, fieldType: string): string {
  if (!value) return '';

  if (SENSITIVE_TYPES.has(fieldType)) {
    return '*'.repeat(value.length);
  }

  // For non-sensitive fields, preserve first char and length
  if (value.length <= 1) return '*';
  return value[0] + '*'.repeat(value.length - 1);
}
