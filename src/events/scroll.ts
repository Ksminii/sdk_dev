import type { AnalyticsEvent, EventCaptureModule, ScrollProperties } from '../types';
import { debug } from '../utils/logger';

export class ScrollCapture implements EventCaptureModule {
  private handler: (() => void) | null = null;
  private emit: (event: AnalyticsEvent) => void;
  private getSessionId: () => string;
  private maxDepth = 0;
  private lastReportedMilestone = 0;
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(emit: (event: AnalyticsEvent) => void, getSessionId: () => string) {
    this.emit = emit;
    this.getSessionId = getSessionId;
  }

  start(): void {
    this.handler = () => {
      if (this.throttleTimer) return;
      this.throttleTimer = setTimeout(() => {
        this.throttleTimer = null;
        this.checkDepth();
      }, 300);
    };

    window.addEventListener('scroll', this.handler, { passive: true });

    // Check initial depth after page load
    setTimeout(() => this.checkDepth(), 500);
  }

  stop(): void {
    if (this.handler) {
      window.removeEventListener('scroll', this.handler);
      this.handler = null;
    }
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    // Emit final depth if not yet reported
    if (this.maxDepth > this.lastReportedMilestone) {
      this.emitScroll();
    }
  }

  private checkDepth(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );

    if (docHeight <= viewportHeight) return; // No scrollable content

    const depth = Math.min(Math.round(((scrollTop + viewportHeight) / docHeight) * 100), 100);

    if (depth > this.maxDepth) {
      this.maxDepth = depth;
    }

    // Report at 10% increments for finer tracking
    const milestone = Math.floor(this.maxDepth / 10) * 10;
    if (milestone > this.lastReportedMilestone && milestone > 0) {
      this.lastReportedMilestone = milestone;
      this.emitScroll();
    }
  }

  private emitScroll(): void {
    const properties: ScrollProperties = {
      maxDepth: this.maxDepth,
      direction: 'down',
    };

    const event: AnalyticsEvent = {
      type: 'scroll',
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      url: window.location.href,
      properties: properties as unknown as Record<string, unknown>,
    };

    debug('Scroll depth', this.maxDepth + '%');
    this.emit(event);
  }
}
