import type { AnalyticsEvent, EventCaptureModule, PageviewProperties } from '../types';
import { debug } from '../utils/logger';

export class PageviewCapture implements EventCaptureModule {
  private emit: (event: AnalyticsEvent) => void;
  private getSessionId: () => string;

  constructor(emit: (event: AnalyticsEvent) => void, getSessionId: () => string) {
    this.emit = emit;
    this.getSessionId = getSessionId;
  }

  start(): void {
    this.capturePageview();
  }

  stop(): void {
    // No listeners to clean up
  }

  private capturePageview(): void {
    const properties: PageviewProperties = {
      title: document.title,
      referrer: document.referrer,
      path: window.location.pathname,
    };

    const event: AnalyticsEvent = {
      type: 'pageview',
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      url: window.location.href,
      properties: properties as unknown as Record<string, unknown>,
    };

    debug('Pageview captured', properties.path);
    this.emit(event);
  }
}
