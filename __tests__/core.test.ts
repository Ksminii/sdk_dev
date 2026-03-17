import { LandingAnalytics } from '../src/core';

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

describe('LandingAnalytics', () => {
  afterEach(() => {
    const instance = LandingAnalytics.getInstance();
    if (instance) instance.destroy();
  });

  it('should create a singleton instance', () => {
    const instance = LandingAnalytics.init({
      apiEndpoint: 'http://localhost:3000/events',
      apiKey: 'test-key',
    });

    expect(instance).toBeDefined();
    expect(LandingAnalytics.getInstance()).toBe(instance);
  });

  it('should return existing instance on duplicate init', () => {
    const first = LandingAnalytics.init({
      apiEndpoint: 'http://localhost:3000/events',
      apiKey: 'test-key',
    });

    const second = LandingAnalytics.init({
      apiEndpoint: 'http://localhost:3000/events',
      apiKey: 'different-key',
    });

    expect(second).toBe(first);
  });

  it('should destroy cleanly', () => {
    const instance = LandingAnalytics.init({
      apiEndpoint: 'http://localhost:3000/events',
      apiKey: 'test-key',
    });

    instance.destroy();
    expect(LandingAnalytics.getInstance()).toBeNull();
  });

  it('should allow reinitialize after destroy', () => {
    const first = LandingAnalytics.init({
      apiEndpoint: 'http://localhost:3000/events',
      apiKey: 'test-key',
    });
    first.destroy();

    const second = LandingAnalytics.init({
      apiEndpoint: 'http://localhost:3000/events',
      apiKey: 'test-key-2',
    });

    expect(second).toBeDefined();
    expect(second).not.toBe(first);
  });
});
