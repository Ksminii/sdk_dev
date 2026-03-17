import type { AnalyticsEvent, EventCaptureModule, ScrollProperties } from '../types';
import { debug } from '../utils/logger';

export class ScrollCapture implements EventCaptureModule {
  private handler: (() => void) | null = null;
  private emit: (event: AnalyticsEvent) => void;
  private getSessionId: () => string;
  private lastReportedMilestone = -1;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(emit: (event: AnalyticsEvent) => void, getSessionId: () => string) {
    this.emit = emit;
    this.getSessionId = getSessionId;
  }

  start(): void {
    this.handler = () => {
      // Debounce: emit when scrolling stops (300ms)
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.checkAndEmit();
      }, 300);
    };

    window.addEventListener('scroll', this.handler, { passive: true });

    // Check initial depth after page load
    setTimeout(() => this.checkAndEmit(), 500);
  }

  stop(): void {
    if (this.handler) {
      window.removeEventListener('scroll', this.handler);
      this.handler = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    // Emit final depth
    this.checkAndEmit();
  }

  private checkAndEmit(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );

    if (docHeight <= viewportHeight) return;

    const depth = Math.min(Math.round(((scrollTop + viewportHeight) / docHeight) * 100), 100);
    const milestone = Math.floor(depth / 10) * 10;

    // Emit whenever the current milestone differs from last reported
    if (milestone !== this.lastReportedMilestone && milestone > 0) {
      this.lastReportedMilestone = milestone;
      this.emitScroll(depth);
    }
  }

  private emitScroll(depth: number): void {
    const properties: ScrollProperties = {
      maxDepth: depth,
      direction: 'down',
    };

    const event: AnalyticsEvent = {
      type: 'scroll',
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      url: window.location.href,
      properties: properties as unknown as Record<string, unknown>,
    };

    debug('Scroll depth', depth + '%');
    this.emit(event);
  }
}
