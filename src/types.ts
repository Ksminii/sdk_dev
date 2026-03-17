/** SDK configuration */
export interface LandingAnalyticsConfig {
  /** API endpoint to send events */
  apiEndpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Flush interval in milliseconds */
  flushInterval?: number;
  /** Max queue size before auto-flush */
  flushQueueSize?: number;
  /** Session idle timeout in milliseconds */
  sessionIdleTimeout?: number;
  /** Session max duration in milliseconds */
  sessionMaxDuration?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Enable session recording (requires rrweb) */
  sessionRecording?: boolean;
  /** Hook to filter/modify events before sending */
  beforeSend?: (event: AnalyticsEvent) => AnalyticsEvent | null;
  /** Endpoint for recording data (defaults to apiEndpoint + '/recordings') */
  recordingEndpoint?: string;
}

/** Internal resolved config (all fields required) */
export interface ResolvedConfig extends Required<Omit<LandingAnalyticsConfig, 'beforeSend' | 'recordingEndpoint'>> {
  beforeSend?: (event: AnalyticsEvent) => AnalyticsEvent | null;
  recordingEndpoint: string;
}

/** Event types captured by the SDK */
export type EventType = 'pageview' | 'click' | 'scroll' | 'input' | 'custom';

/** Base analytics event */
export interface AnalyticsEvent {
  type: EventType;
  timestamp: number;
  sessionId: string;
  url: string;
  properties: Record<string, unknown>;
}

/** Click event properties */
export interface ClickProperties {
  selector: string;
  tagName: string;
  text: string;
  href?: string;
  x: number;
  y: number;
}

/** Scroll event properties */
export interface ScrollProperties {
  maxDepth: number;
  direction: 'down' | 'up';
}

/** Pageview event properties */
export interface PageviewProperties {
  title: string;
  referrer: string;
  path: string;
}

/** Input event properties */
export interface InputProperties {
  selector: string;
  tagName: string;
  fieldType: string;
  value: string; // masked
}

/** Session data stored in sessionStorage */
export interface SessionData {
  id: string;
  startedAt: number;
  lastActivityAt: number;
}

/** Transport payload sent to API */
export interface TransportPayload {
  apiKey: string;
  events: AnalyticsEvent[];
  sentAt: number;
}

/** Payload for session recording events (separate from analytics events) */
export interface RecordingPayload {
  apiKey: string;
  sessionId: string;
  events: unknown[];
  sentAt: number;
}

/** Event capture module interface */
export interface EventCaptureModule {
  start(): void;
  stop(): void;
}
