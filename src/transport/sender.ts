import type { TransportPayload } from '../types';
import { debug, error } from '../utils/logger';

export class Sender {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  /** Send payload via fetch, fallback to sendBeacon */
  async send(payload: TransportPayload): Promise<boolean> {
    const body = JSON.stringify(payload);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
      debug('Events sent', response.status);
      return response.ok;
    } catch (err) {
      error('Fetch failed, trying sendBeacon', err);
      return this.sendViaBeacon(body);
    }
  }

  /** Use sendBeacon for page unload scenarios */
  sendBeacon(payload: TransportPayload): boolean {
    const body = JSON.stringify(payload);
    return this.sendViaBeacon(body);
  }

  private sendViaBeacon(body: string): boolean {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const success = navigator.sendBeacon(this.endpoint, blob);
      debug('sendBeacon result', success);
      return success;
    }
    error('sendBeacon not available');
    return false;
  }
}
