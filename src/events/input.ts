import type { AnalyticsEvent, EventCaptureModule, InputProperties } from '../types';
import { getSelector } from '../utils/dom';
import { maskValue } from '../privacy/masking';
import { debug } from '../utils/logger';

export class InputCapture implements EventCaptureModule {
  private handler: ((e: Event) => void) | null = null;
  private emit: (event: AnalyticsEvent) => void;
  private getSessionId: () => string;

  constructor(emit: (event: AnalyticsEvent) => void, getSessionId: () => string) {
    this.emit = emit;
    this.getSessionId = getSessionId;
  }

  start(): void {
    this.handler = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!target || !target.tagName) return;

      const tag = target.tagName.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return;

      const fieldType = (target as HTMLInputElement).type || tag;
      const properties: InputProperties = {
        selector: getSelector(target),
        tagName: tag,
        fieldType,
        value: maskValue(target.value, fieldType),
      };

      const event: AnalyticsEvent = {
        type: 'input',
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        url: window.location.href,
        properties: properties as unknown as Record<string, unknown>,
      };

      debug('Input captured', properties.selector);
      this.emit(event);
    };

    document.addEventListener('change', this.handler, { capture: true });
  }

  stop(): void {
    if (this.handler) {
      document.removeEventListener('change', this.handler, { capture: true });
      this.handler = null;
    }
  }
}
