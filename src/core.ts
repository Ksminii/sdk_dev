import { mergeConfig } from './config';
import type {
  AnalyticsEvent,
  EventCaptureModule,
  LandingAnalyticsConfig,
  ResolvedConfig,
} from './types';
import { SessionManager } from './session';
import { EventQueue } from './transport';
import { ClickCapture, PageviewCapture, ScrollCapture, InputCapture } from './events';
import { SessionRecorder } from './recorder';
import { setDebug, debug, warn } from './utils/logger';

export class LandingAnalytics {
  private static instance: LandingAnalytics | null = null;

  private config: ResolvedConfig;
  private sessionManager: SessionManager;
  private queue: EventQueue;
  private modules: EventCaptureModule[] = [];
  private recorder: SessionRecorder | null = null;
  private initialized = false;

  private constructor(config: LandingAnalyticsConfig) {
    this.config = mergeConfig(config);
    setDebug(this.config.debug);

    this.sessionManager = new SessionManager(this.config);
    this.queue = new EventQueue(this.config);
  }

  /** Initialize the SDK (singleton) */
  static init(config: LandingAnalyticsConfig): LandingAnalytics {
    if (LandingAnalytics.instance) {
      warn('Already initialized. Call destroy() first to reinitialize.');
      return LandingAnalytics.instance;
    }

    const instance = new LandingAnalytics(config);
    instance.start();
    LandingAnalytics.instance = instance;
    return instance;
  }

  /** Get current instance */
  static getInstance(): LandingAnalytics | null {
    return LandingAnalytics.instance;
  }

  /** Capture a custom event */
  capture(eventType: string, properties: Record<string, unknown> = {}): void {
    if (!this.initialized) {
      warn('SDK not initialized');
      return;
    }

    const event: AnalyticsEvent = {
      type: 'custom',
      timestamp: Date.now(),
      sessionId: this.sessionManager.getSessionId(),
      url: window.location.href,
      properties: { eventType, ...properties },
    };

    this.queue.enqueue(event);
  }

  /** Destroy the instance and clean up */
  destroy(): void {
    this.modules.forEach((m) => m.stop());
    this.modules = [];
    this.queue.stop();

    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }

    this.initialized = false;
    LandingAnalytics.instance = null;
    debug('SDK destroyed');
  }

  private start(): void {
    // Emit callback for event modules
    const emit = (event: AnalyticsEvent) => this.queue.enqueue(event);
    const getSessionId = () => this.sessionManager.getSessionId();

    // Register event capture modules
    this.modules = [
      new ClickCapture(emit, getSessionId),
      new PageviewCapture(emit, getSessionId),
      new ScrollCapture(emit, getSessionId),
      new InputCapture(emit, getSessionId),
    ];

    // Start all modules
    this.modules.forEach((m) => m.start());
    this.queue.start();

    // Lazy-load session recording if enabled
    if (this.config.sessionRecording) {
      this.recorder = new SessionRecorder(this.config, getSessionId);
      this.recorder.start();
    }

    this.initialized = true;
    debug('SDK initialized', this.config);
  }
}
