/**
 * Generate UUIDv7 (timestamp-based, sortable)
 * Inline implementation — zero dependencies.
 */
export function generateUUIDv7(): string {
  const now = Date.now();

  // 48-bit timestamp
  const timeBits = new Uint8Array(6);
  let ts = now;
  for (let i = 5; i >= 0; i--) {
    timeBits[i] = ts & 0xff;
    ts = Math.floor(ts / 256);
  }

  // 10 random bytes
  const rand = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(rand);
  } else {
    for (let i = 0; i < 10; i++) {
      rand[i] = Math.floor(Math.random() * 256);
    }
  }

  // Combine: 6 bytes time + 2 bytes rand_a + 8 bytes rand_b
  const bytes = new Uint8Array(16);
  bytes.set(timeBits, 0);
  bytes.set(rand.slice(0, 2), 6);
  bytes.set(rand.slice(2), 8);

  // Set version (7) and variant (10xx)
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

  // Format as UUID string
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
