import { EventQueue } from '../../src/transport/queue';
import { mergeConfig } from '../../src/config';
import type { AnalyticsEvent } from '../../src/types';

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

function createEvent(type = 'click'): AnalyticsEvent {
  return {
    type: type as AnalyticsEvent['type'],
    timestamp: Date.now(),
    sessionId: 'test-session',
    url: 'http://localhost',
    properties: {},
  };
}

describe('EventQueue', () => {
  let queue: EventQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    const config = mergeConfig({
      apiEndpoint: 'http://localhost:3000/events',
      apiKey: 'test-key',
      flushQueueSize: 3,
      flushInterval: 10000,
    });
    queue = new EventQueue(config);
  });

  afterEach(() => {
    queue.stop();
  });

  it('should enqueue events', () => {
    queue.enqueue(createEvent());
    expect(queue.length).toBe(1);
  });

  it('should auto-flush when queue reaches max size', () => {
    queue.enqueue(createEvent());
    queue.enqueue(createEvent());
    expect(queue.length).toBe(2);

    queue.enqueue(createEvent()); // triggers flush at size 3
    expect(queue.length).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should send correct payload structure', () => {
    queue.enqueue(createEvent());
    queue.enqueue(createEvent());
    queue.enqueue(createEvent());

    const call = (fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.apiKey).toBe('test-key');
    expect(body.events).toHaveLength(3);
    expect(body.sentAt).toBeGreaterThan(0);
  });

  it('should apply beforeSend filter', () => {
    const config = mergeConfig({
      apiEndpoint: 'http://localhost:3000/events',
      apiKey: 'test-key',
      beforeSend: (event) => (event.type === 'click' ? null : event),
    });
    const filteredQueue = new EventQueue(config);

    filteredQueue.enqueue(createEvent('click'));
    expect(filteredQueue.length).toBe(0);

    filteredQueue.enqueue(createEvent('pageview'));
    expect(filteredQueue.length).toBe(1);

    filteredQueue.stop();
  });

  it('should not call fetch when flushing empty queue', () => {
    queue.flush();
    expect(fetch).not.toHaveBeenCalled();
  });
});
