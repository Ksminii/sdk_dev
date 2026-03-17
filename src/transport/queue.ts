import type { AnalyticsEvent, ResolvedConfig, TransportPayload } from '../types';
import { debug } from '../utils/logger';
import { Sender } from './sender';

export class EventQueue {
  private queue: AnalyticsEvent[] = [];
  private config: ResolvedConfig;
  private sender: Sender;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ResolvedConfig) {
    this.config = config;
    this.sender = new Sender(config.apiEndpoint);
  }

  start(): void {
    this.timer = setInterval(() => this.flush(), this.config.flushInterval);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('pagehide', this.handlePageHide);
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('pagehide', this.handlePageHide);
    }
    this.flush();
  }

  enqueue(event: AnalyticsEvent): void {
    // Apply beforeSend hook
    if (this.config.beforeSend) {
      const filtered = this.config.beforeSend(event);
      if (!filtered) {
        debug('Event filtered by beforeSend');
        return;
      }
      event = filtered;
    }

    this.queue.push(event);
    debug('Event queued', event.type, `(${this.queue.length}/${this.config.flushQueueSize})`);

    if (this.queue.length >= this.config.flushQueueSize) {
      this.flush();
    }
  }

  flush(): void {
    if (this.queue.length === 0) return;

    const events = this.queue.splice(0);
    const payload: TransportPayload = {
      apiKey: this.config.apiKey,
      events,
      sentAt: Date.now(),
    };

    debug('Flushing', events.length, 'events');
    this.sender.send(payload);
  }

  /** Get current queue length (for testing) */
  get length(): number {
    return this.queue.length;
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.flushViaBeacon();
    }
  };

  private handlePageHide = (): void => {
    this.flushViaBeacon();
  };

  private flushViaBeacon(): void {
    if (this.queue.length === 0) return;
    const events = this.queue.splice(0);
    const payload: TransportPayload = {
      apiKey: this.config.apiKey,
      events,
      sentAt: Date.now(),
    };
    this.sender.sendBeacon(payload);
  }
}
