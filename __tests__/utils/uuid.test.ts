import { generateUUIDv7 } from '../../src/utils/uuid';

describe('generateUUIDv7', () => {
  it('should return a valid UUID format', () => {
    const uuid = generateUUIDv7();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(uuid).toMatch(uuidRegex);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateUUIDv7()));
    expect(ids.size).toBe(100);
  });

  it('should embed timestamp in the UUID', () => {
    const before = Date.now();
    const uuid = generateUUIDv7();
    const after = Date.now();

    // Extract timestamp from first 12 hex chars (48 bits)
    const hex = uuid.replace(/-/g, '').slice(0, 12);
    const ts = parseInt(hex, 16);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});
