import type { AnalyticsEvent, ClickProperties, EventCaptureModule } from '../types';
import { getElementInfo } from '../utils/dom';
import { debug } from '../utils/logger';

export class ClickCapture implements EventCaptureModule {
  private handler: ((e: MouseEvent) => void) | null = null;
  private emit: (event: AnalyticsEvent) => void;
  private getSessionId: () => string;

  constructor(emit: (event: AnalyticsEvent) => void, getSessionId: () => string) {
    this.emit = emit;
    this.getSessionId = getSessionId;
  }

  start(): void {
    this.handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target || !target.tagName) return;

      const info = getElementInfo(target);
      const properties: ClickProperties = {
        ...info,
        x: e.clientX,
        y: e.clientY,
      };

      const event: AnalyticsEvent = {
        type: 'click',
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        url: window.location.href,
        properties: properties as unknown as Record<string, unknown>,
      };

      debug('Click captured', info.selector);
      this.emit(event);
    };

    document.addEventListener('click', this.handler, { capture: true });
  }

  stop(): void {
    if (this.handler) {
      document.removeEventListener('click', this.handler, { capture: true });
      this.handler = null;
    }
  }
}
