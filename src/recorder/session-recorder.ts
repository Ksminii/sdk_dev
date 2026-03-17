import {
  DEFAULT_RECORDING_FLUSH_INTERVAL,
  DEFAULT_RECORDING_FLUSH_SIZE,
} from '../constants';
import type { RecordingPayload, ResolvedConfig } from '../types';
import { debug, warn, error } from '../utils/logger';

/**
 * Session recorder using rrweb (lazy-loaded).
 * Buffers recording events and sends them to a separate endpoint.
 */
export class SessionRecorder {
  private config: ResolvedConfig;
  private getSessionId: () => string;
  private stopFn: (() => void) | null = null;
  private buffer: unknown[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ResolvedConfig, getSessionId: () => string) {
    this.config = config;
    this.getSessionId = getSessionId;
  }

  async start(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rrweb: any;

    // Try window global first (UMD / script tag), then dynamic import (ESM/CJS)
    if (typeof window !== 'undefined' && (window as any).rrweb) {
      rrweb = (window as any).rrweb;
    } else {
      try {
        rrweb = await import(/* webpackIgnore: true */ 'rrweb');
      } catch {
        // import failed
      }
    }

    if (!rrweb || !rrweb.record) {
      warn('rrweb not available. Install rrweb or load it via script tag to enable session recording.');
      return;
    }

    this.stopFn = rrweb.record({
      emit: (event: unknown) => {
        this.buffer.push(event);
        debug('rrweb event buffered', `(${this.buffer.length})`);

        if (this.buffer.length >= DEFAULT_RECORDING_FLUSH_SIZE) {
          this.flush();
        }
      },
    });

    this.timer = setInterval(() => this.flush(), DEFAULT_RECORDING_FLUSH_INTERVAL);

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('pagehide', this.handlePageHide);
    }

    debug('Session recording started');
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

    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }

    debug('Session recording stopped');
  }

  private flush(): void {
    if (this.buffer.length === 0) return;

    const events = this.buffer.splice(0);
    const payload: RecordingPayload = {
      apiKey: this.config.apiKey,
      sessionId: this.getSessionId(),
      events,
      sentAt: Date.now(),
    };

    debug('Flushing', events.length, 'recording events');
    this.send(payload);
  }

  private async send(payload: RecordingPayload): Promise<void> {
    const body = JSON.stringify(payload);

    try {
      await fetch(this.config.recordingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    } catch (err) {
      error('Failed to send recording data', err);
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.flush();
    }
  };

  private handlePageHide = (): void => {
    this.flush();
  };
}
